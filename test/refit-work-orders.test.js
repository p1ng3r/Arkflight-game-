import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { grantComponent, grantSalvageParts, salvageParts, unlockBlueprint, componentQuantity } from "../src/ship/refit-state.js";
import { createRefitDraft } from "../src/ship/refit-draft.js";
import { REFIT_JOB_STATES, REFIT_METHODS } from "../src/ship/refit-rules.js";
import { queueInstallDraft, queueBuildJob, queueRemoveJob, queueRepairJob, startRefitJob, completeRefitJob, recordCrewInstallComplication, recordCrewInstallFailure } from "../src/ship/refit-work-orders.js";

const ids = (() => { let n = 0; return () => `job-${++n}`; })();

test("Begin Refit reserves Parts and physical fittings without installing them", () => {
  let ship = createShip();
  ship = grantComponent(ship, "shipMod", "reinforced-structural-ribbing", 1);
  ship = grantSalvageParts(ship, 5);
  const draft = createRefitDraft({ assignments: [{ family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [0] }] });
  const result = queueInstallDraft(ship, draft, SHIP_CATALOGS, { idFactory: ids, createdAt: "2026-08-31T12:00:00Z" });
  assert.equal(result.ok, true);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].status, REFIT_JOB_STATES.PLANNED);
  assert.equal(result.jobs[0].reservation.componentHeld, true);
  assert.equal(componentQuantity(result.ship, "shipMod", "reinforced-structural-ribbing"), 0);
  assert.equal(salvageParts(result.ship), 4);
  assert.deepEqual(result.ship.shipMods, []);
});

test("one physical Ship Mod can reserve exactly one installation", () => {
  let ship = grantComponent(createShip(), "shipMod", "reinforced-structural-ribbing", 1);
  ship = grantSalvageParts(ship, 10);
  const first = createRefitDraft({ assignments: [{ family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [0] }] });
  const queued = queueInstallDraft(ship, first, SHIP_CATALOGS, { idFactory: ids });
  assert.equal(queued.ok, true);
  assert.equal(componentQuantity(queued.ship, "shipMod", "reinforced-structural-ribbing"), 0);

  const second = createRefitDraft({ assignments: [{ family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [1] }] });
  const rejected = queueInstallDraft(queued.ship, second, SHIP_CATALOGS, { idFactory: ids });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "component-not-available");
  assert.equal(rejected.jobs.length, 0);
});

test("one physical Arkengine Mod can reserve exactly one installation", () => {
  let ship = grantComponent(createShip(), "arkengineMod", "pressure-lattice-tuning", 1);
  ship = grantSalvageParts(ship, 10);
  const first = createRefitDraft({ assignments: [{ family: "arkengineMod", componentId: "pressure-lattice-tuning", socketIndices: [0] }] });
  const queued = queueInstallDraft(ship, first, SHIP_CATALOGS, { idFactory: ids });
  assert.equal(queued.ok, true);
  assert.equal(componentQuantity(queued.ship, "arkengineMod", "pressure-lattice-tuning"), 0);

  const second = createRefitDraft({ assignments: [{ family: "arkengineMod", componentId: "pressure-lattice-tuning", socketIndices: [1] }] });
  const rejected = queueInstallDraft(queued.ship, second, SHIP_CATALOGS, { idFactory: ids });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "component-not-available");
  assert.equal(rejected.jobs.length, 0);
});

test("install completion is the boundary that makes a fitting mechanically installed", () => {
  let ship = grantSalvageParts(grantComponent(createShip(), "arkengineMod", "pressure-lattice-tuning", 1), 3);
  const draft = createRefitDraft({ assignments: [{ family: "arkengineMod", componentId: "pressure-lattice-tuning", socketIndices: [0] }] });
  const queued = queueInstallDraft(ship, draft, SHIP_CATALOGS, { idFactory: ids });
  const started = startRefitJob(queued.ship, queued.jobs[0].id, { startedAt: "2026-08-31T13:00:00Z" });
  assert.equal(started.job.status, REFIT_JOB_STATES.WORKING);
  const completed = completeRefitJob(started.ship, started.job.id, SHIP_CATALOGS, { completedAt: "2026-08-31T17:00:00Z" });
  assert.equal(completed.ok, true);
  assert.equal(completed.job.status, REFIT_JOB_STATES.COMPLETE);
  assert.deepEqual(completed.ship.arkengine.modIds, ["pressure-lattice-tuning"]);
});

test("failed engineering install spends install Parts but preserves fitting", () => {
  let ship = grantComponent(createShip(), "shipMod", "reinforced-structural-ribbing", 1);
  ship = grantSalvageParts(ship, 5);
  const assignment = { family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [0] };
  const result = recordCrewInstallFailure(ship, assignment, SHIP_CATALOGS, {
    workerActorUuid: "Actor.engineer",
    outcome: "failure",
    elapsedHours: 4,
    idFactory: ids,
    createdAt: "2026-08-31T14:00:00Z"
  });
  assert.equal(result.ok, true);
  assert.equal(result.job.status, REFIT_JOB_STATES.COMPLETE);
  assert.equal(result.job.result.outcome, "failure");
  assert.equal(result.job.result.elapsedHours, 4);
  assert.equal(result.job.reservation.partsSpent, 1);
  assert.equal(componentQuantity(result.ship, "shipMod", "reinforced-structural-ribbing"), 1);
  assert.equal(salvageParts(result.ship), 4);
  assert.deepEqual(result.ship.shipMods, []);
});

test("critical engineering failure spends install Parts, preserves fitting, and records complication", () => {
  let ship = grantComponent(createShip(), "shipMod", "reinforced-structural-ribbing", 1);
  ship = grantSalvageParts(ship, 5);
  const assignment = { family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [0] };
  const result = recordCrewInstallComplication(ship, assignment, SHIP_CATALOGS, {
    workerActorUuid: "Actor.engineer",
    elapsedHours: 4,
    idFactory: ids,
    createdAt: "2026-08-31T14:00:00Z"
  });
  assert.equal(result.ok, true);
  assert.equal(result.job.status, REFIT_JOB_STATES.COMPLICATION);
  assert.equal(result.job.result.outcome, "criticalFailure");
  assert.equal(result.job.result.workerActorUuid, "Actor.engineer");
  assert.equal(result.job.result.elapsedHours, 4);
  assert.equal(result.job.reservation.partsSpent, 1);
  assert.equal(result.job.reservation.componentHeld, false);
  assert.equal(componentQuantity(result.ship, "shipMod", "reinforced-structural-ribbing"), 1);
  assert.equal(salvageParts(result.ship), 4);
  assert.deepEqual(result.ship.shipMods, []);
});

test("build work orders reserve Parts and only create a component on completion", () => {
  let ship = unlockBlueprint(createShip(), "shipMod", "expanded-cargo-lattice");
  ship = grantSalvageParts(ship, 10);
  const queued = queueBuildJob(ship, "shipMod", "expanded-cargo-lattice", SHIP_CATALOGS, { idFactory: ids });
  assert.equal(queued.ok, true);
  assert.equal(componentQuantity(queued.ship, "shipMod", "expanded-cargo-lattice"), 0);
  assert.ok(salvageParts(queued.ship) < 10);
  const completed = completeRefitJob(queued.ship, queued.job.id, SHIP_CATALOGS);
  assert.equal(componentQuantity(completed.ship, "shipMod", "expanded-cargo-lattice"), 1);
});

test("remove work orders keep hardware installed until completion then return it to inventory", () => {
  const ship = createShip({ shipMods: ["reinforced-ram-prow"] });
  const queued = queueRemoveJob(ship, "shipMod", "reinforced-ram-prow", SHIP_CATALOGS, { idFactory: ids });
  assert.equal(queued.ok, true);
  assert.deepEqual(queued.ship.shipMods, ["reinforced-ram-prow"]);
  const completed = completeRefitJob(queued.ship, queued.job.id, SHIP_CATALOGS);
  assert.deepEqual(completed.ship.shipMods, []);
  assert.equal(componentQuantity(completed.ship, "shipMod", "reinforced-ram-prow"), 1);
});

test("repair uses the same persistent work order lifecycle", () => {
  const ship = grantSalvageParts(createShip(), 3);
  const queued = queueRepairJob(ship, { componentFamily: "ship", componentId: "hull", partsCost: 2, durationHours: 8, craftingDC: 18, idFactory: ids });
  assert.equal(queued.ok, true);
  assert.equal(salvageParts(queued.ship), 1);
  assert.equal(queued.job.type, "repair");
  const completed = completeRefitJob(queued.ship, queued.job.id, SHIP_CATALOGS, { result: { outcome: "success", note: "Hull repair resolved externally." } });
  assert.equal(completed.job.status, REFIT_JOB_STATES.COMPLETE);
  assert.equal(completed.job.result.outcome, "success");
});

test("shipyard jobs record labor gold but use the same work-order engine", () => {
  let ship = unlockBlueprint(createShip(), "arkengineMod", "stormwake-injector");
  ship = grantSalvageParts(ship, 20);
  const queued = queueBuildJob(ship, "arkengineMod", "stormwake-injector", SHIP_CATALOGS, { method: REFIT_METHODS.SHIPYARD, idFactory: ids });
  assert.equal(queued.ok, true);
  assert.equal(queued.job.method, REFIT_METHODS.SHIPYARD);
  assert.ok(queued.job.goldCost > 0);
});
