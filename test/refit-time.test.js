import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { componentQuantity, grantSalvageParts, unlockBlueprint } from "../src/ship/refit-state.js";
import { queueBuildJob, startRefitJob } from "../src/ship/refit-work-orders.js";
import { advanceRefitWorkOrders } from "../src/ship/refit-time.js";

const ids = (() => { let n = 0; return () => `time-job-${++n}`; })();

function queuedBuild(componentId = "expanded-cargo-lattice") {
  let ship = unlockBlueprint(createShip(), "shipMod", componentId);
  ship = grantSalvageParts(ship, 50);
  return queueBuildJob(ship, "shipMod", componentId, SHIP_CATALOGS, { idFactory: ids });
}

test("planned jobs do not advance just because world time passes", () => {
  const queued = queuedBuild();
  const before = queued.job.remainingHours;
  const advanced = advanceRefitWorkOrders(queued.ship, 4, SHIP_CATALOGS);
  assert.equal(advanced.ok, true);
  assert.equal(advanced.progressed.length, 0);
  assert.equal(advanced.ship.refit.workOrders[0].remainingHours, before);
  assert.equal(componentQuantity(advanced.ship, "shipMod", "expanded-cargo-lattice"), 0);
});

test("working jobs lose elapsed hours without completing early", () => {
  const queued = queuedBuild();
  const started = startRefitJob(queued.ship, queued.job.id);
  const step = Math.max(1, Math.floor(started.job.durationHours / 2));
  const advanced = advanceRefitWorkOrders(started.ship, step, SHIP_CATALOGS);
  const job = advanced.ship.refit.workOrders.find((entry) => entry.id === started.job.id);
  assert.equal(advanced.ok, true);
  assert.equal(job.status, "working");
  assert.equal(job.remainingHours, started.job.durationHours - step);
  assert.equal(componentQuantity(advanced.ship, "shipMod", "expanded-cargo-lattice"), 0);
});

test("a job reaching zero completes through the canonical boundary", () => {
  const queued = queuedBuild();
  const started = startRefitJob(queued.ship, queued.job.id);
  const advanced = advanceRefitWorkOrders(started.ship, started.job.durationHours, SHIP_CATALOGS);
  const job = advanced.ship.refit.workOrders.find((entry) => entry.id === started.job.id);
  assert.equal(advanced.ok, true);
  assert.equal(advanced.completed.length, 1);
  assert.equal(job.status, "complete");
  assert.equal(job.remainingHours, 0);
  assert.equal(componentQuantity(advanced.ship, "shipMod", "expanded-cargo-lattice"), 1);
});

test("multiple working jobs progress concurrently by the same elapsed time", () => {
  let ship = createShip();
  ship = unlockBlueprint(ship, "shipMod", "expanded-cargo-lattice");
  ship = unlockBlueprint(ship, "shipMod", "detection-spire");
  ship = grantSalvageParts(ship, 100);

  const first = queueBuildJob(ship, "shipMod", "expanded-cargo-lattice", SHIP_CATALOGS, { idFactory: ids });
  const second = queueBuildJob(first.ship, "shipMod", "detection-spire", SHIP_CATALOGS, { idFactory: ids });
  const startedFirst = startRefitJob(second.ship, first.job.id);
  const startedSecond = startRefitJob(startedFirst.ship, second.job.id);
  const advanced = advanceRefitWorkOrders(startedSecond.ship, 2, SHIP_CATALOGS);

  const a = advanced.ship.refit.workOrders.find((entry) => entry.id === first.job.id);
  const b = advanced.ship.refit.workOrders.find((entry) => entry.id === second.job.id);
  assert.equal(a.remainingHours, Math.max(0, first.job.durationHours - 2));
  assert.equal(b.remainingHours, Math.max(0, second.job.durationHours - 2));
});

test("Part 9 Foundry layer is loaded and listens to world time", () => {
  const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
  const source = fs.readFileSync(new URL("../src/foundry/refit-time.js", import.meta.url), "utf8");
  assert.ok(moduleJson.esmodules.includes("src/foundry/refit-time.js"));
  assert.match(source, /Hooks\.on\("updateWorldTime"/);
  assert.match(source, /advanceWorkTime/);
  assert.match(source, /advanceRefitWorkOrders/);
});
