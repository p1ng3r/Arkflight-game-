import test from "node:test";
import assert from "node:assert/strict";

import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { createRefitJob, REFIT_JOB_STATES, REFIT_JOB_TYPES, REFIT_METHODS } from "../src/ship/refit-rules.js";
import { advanceRefitWorkOrders } from "../src/ship/refit-time.js";
import { findAvailableRefitSocketAssignment } from "../src/ship/refit-sockets.js";
import { resolveCrewWorkConcurrency, startRefitJob } from "../src/ship/refit-work-orders.js";

function repairJob(id, method, status, remainingHours) {
  return createRefitJob({
    id,
    type: REFIT_JOB_TYPES.REPAIR,
    method,
    status,
    durationHours: remainingHours,
    remainingHours
  });
}

test("crew refit advances only one working job while shipyard work remains concurrent", () => {
  const ship = createShip({ refit: { workOrders: [
    repairJob("crew-a", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 5),
    repairJob("crew-b", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 5),
    repairJob("yard-a", REFIT_METHODS.SHIPYARD, REFIT_JOB_STATES.WORKING, 5),
    repairJob("yard-b", REFIT_METHODS.SHIPYARD, REFIT_JOB_STATES.WORKING, 5)
  ] } });

  const result = advanceRefitWorkOrders(ship, 1, {});
  assert.equal(result.ok, true);
  const jobs = Object.fromEntries(result.ship.refit.workOrders.map((job) => [job.id, job]));
  assert.equal(jobs["crew-a"].remainingHours, 4);
  assert.equal(jobs["crew-b"].remainingHours, 5);
  assert.equal(jobs["yard-a"].remainingHours, 4);
  assert.equal(jobs["yard-b"].remainingHours, 4);
});

test("crew completion returns unused hours for a prompted continuation", () => {
  const ship = createShip({ refit: { workOrders: [
    repairJob("crew-a", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 2),
    repairJob("crew-b", REFIT_METHODS.CREW, REFIT_JOB_STATES.PLANNED, 4)
  ] } });

  const result = advanceRefitWorkOrders(ship, 8, {});
  assert.equal(result.ok, true);
  assert.equal(result.crewCompleted, true);
  assert.equal(result.crewUnusedHours, 6);
  const jobs = Object.fromEntries(result.ship.refit.workOrders.map((job) => [job.id, job]));
  assert.equal(jobs["crew-a"].status, REFIT_JOB_STATES.COMPLETE);
  assert.equal(jobs["crew-b"].status, REFIT_JOB_STATES.PLANNED);
  assert.equal(jobs["crew-b"].remainingHours, 4);
});

test("starting a second crew job is blocked but shipyard jobs may start concurrently", () => {
  const ship = createShip({ refit: { workOrders: [
    repairJob("crew-a", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 5),
    repairJob("crew-b", REFIT_METHODS.CREW, REFIT_JOB_STATES.PLANNED, 5),
    repairJob("yard-a", REFIT_METHODS.SHIPYARD, REFIT_JOB_STATES.PLANNED, 5)
  ] } });

  const crew = startRefitJob(ship, "crew-b");
  assert.equal(crew.ok, false);
  assert.equal(crew.reason, "crew-work-already-active");

  const yard = startRefitJob(ship, "yard-a");
  assert.equal(yard.ok, true);
  assert.equal(yard.job.status, REFIT_JOB_STATES.WORKING);
});

test("legacy multiple crew jobs can be repaired by choosing the one that stays active", () => {
  const ship = createShip({ refit: { workOrders: [
    repairJob("crew-a", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 3),
    repairJob("crew-b", REFIT_METHODS.CREW, REFIT_JOB_STATES.WORKING, 2),
    repairJob("yard-a", REFIT_METHODS.SHIPYARD, REFIT_JOB_STATES.WORKING, 7)
  ] } });

  const result = resolveCrewWorkConcurrency(ship, "crew-b");
  assert.equal(result.ok, true);
  const jobs = Object.fromEntries(result.ship.refit.workOrders.map((job) => [job.id, job]));
  assert.equal(jobs["crew-b"].status, REFIT_JOB_STATES.WORKING);
  assert.equal(jobs["crew-a"].status, REFIT_JOB_STATES.PLANNED);
  assert.equal(jobs["crew-a"].remainingHours, 3);
  assert.equal(jobs["yard-a"].status, REFIT_JOB_STATES.WORKING);
});

test("queued installs can be reassigned to the next free socket after an earlier install completes", () => {
  const ship = createShip({ shipMods: ["reinforced-structural-ribbing"] });
  const assignment = findAvailableRefitSocketAssignment(ship, SHIP_CATALOGS, {
    family: "shipMod",
    componentId: "reinforced-structural-ribbing"
  });
  assert.equal(assignment.ok, true);
  assert.deepEqual([...assignment.socketIndices], [1]);
});
