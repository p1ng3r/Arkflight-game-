import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { componentQuantity, grantComponent, grantSalvageParts, unlockBlueprint } from "../src/ship/refit-state.js";
import { completeRefitJob, queueBuildJob, queueInstallDraft, queueRemoveJob, startRefitJob } from "../src/ship/refit-work-orders.js";
import { findAvailableRefitSocketAssignment } from "../src/ship/refit-sockets.js";

const nextId = (() => { let value = 0; return () => `weapon-job-${++value}`; })();

function commissionedSkiff(overrides = {}) {
  return createShip({ hull: { chassisId: "void-skiff", patternId: "standard" }, arkengine: { chassisId: "spark-core", patternId: "standard", modIds: [] }, ...overrides });
}

test("weapon blueprints fabricate a physical gun before timed installation", () => {
  let ship = unlockBlueprint(commissionedSkiff(), "weapon", "deck-ballista");
  ship = grantSalvageParts(ship, 1000);
  const build = queueBuildJob(ship, "weapon", "deck-ballista", SHIP_CATALOGS, { idFactory: nextId });
  assert.equal(build.ok, true);
  assert.equal(componentQuantity(build.ship, "weapon", "deck-ballista"), 0);
  const built = completeRefitJob(startRefitJob(build.ship, build.job.id).ship, build.job.id, SHIP_CATALOGS);
  assert.equal(componentQuantity(built.ship, "weapon", "deck-ballista"), 1);

  const assignment = findAvailableRefitSocketAssignment(built.ship, SHIP_CATALOGS, { family: "weapon", componentId: "deck-ballista" });
  assert.deepEqual(assignment.socketIndices, [0]);
  const install = queueInstallDraft(built.ship, { assignments: [{ family: "weapon", componentId: "deck-ballista", socketIndices: [0] }] }, SHIP_CATALOGS, { idFactory: nextId });
  assert.equal(install.ok, true);
  assert.equal(componentQuantity(install.ship, "weapon", "deck-ballista"), 0);
  assert.deepEqual(install.ship.weapons, []);
  const installed = completeRefitJob(startRefitJob(install.ship, install.jobs[0].id).ship, install.jobs[0].id, SHIP_CATALOGS);
  assert.equal(installed.ok, true);
  assert.equal(installed.ship.weapons[0].id, "deck-ballista");
  assert.equal(installed.ship.weapons[0].mount, "fore");
  assert.equal(installed.ship.weapons[0].mountIndex, 0);
});

test("weapon installation enforces hull mount facing and size", () => {
  let ship = grantComponent(commissionedSkiff(), "weapon", "swivel-cannon", 1);
  ship = grantSalvageParts(ship, 1000);
  const assignment = findAvailableRefitSocketAssignment(ship, SHIP_CATALOGS, { family: "weapon", componentId: "swivel-cannon" });
  assert.equal(assignment.ok, false);
  assert.equal(assignment.reason, "no-legal-socket");
});

test("completed weapon removal targets the mounted instance and returns it to inventory", () => {
  const ship = commissionedSkiff({ weapons: [{ id: "deck-ballista", instanceId: "refit-source-1", mount: "fore", arc: "fore", mountIndex: 0 }] });
  const queued = queueRemoveJob(ship, "weapon", "deck-ballista", SHIP_CATALOGS, { socketIndices: [0], sourceInstallJobId: "source-1", idFactory: nextId });
  assert.equal(queued.ok, true);
  const removed = completeRefitJob(queued.ship, queued.job.id, SHIP_CATALOGS);
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.ship.weapons, []);
  assert.equal(componentQuantity(removed.ship, "weapon", "deck-ballista"), 1);
});
