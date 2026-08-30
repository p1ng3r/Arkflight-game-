import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlanningState,
  startPlanning,
  planningSecondsRemaining,
  assignActor,
  selectMastery,
  selectAction,
  selectSkill,
  selectRiskTier,
  moveOrder,
  planningReady,
  lockPlanning,
  restartEvent
} from "../../src/event/planning-state.js";
import { STATIONS } from "../../src/event/event-schema.js";

function readyEventSetup(state) {
  let next = state;
  for (const station of STATIONS) {
    next = assignActor(next, station, `${station}-actor`);
    next = selectMastery(next, station, `${station}.mastery`);
  }
  return next;
}

function planningState(options = {}) {
  const opening = readyEventSetup(createPlanningState({ eventId: "event", roundId: "round", ...options }));
  return startPlanning(opening, options.planningNow ?? Date.now());
}

function completeStation(state, station) {
  let next = selectAction(state, station, `${station}.action`);
  next = selectSkill(next, station, `${station}.skill`);
  return next;
}

test("planning starts at three minutes and does not auto-lock at zero", () => {
  const opening = readyEventSetup(createPlanningState({ eventId: "event", roundId: "round", now: 1000 }));
  const planning = startPlanning(opening, 2000);
  assert.equal(planning.phase, "planning");
  assert.equal(planningSecondsRemaining(planning, 2000), 180);
  assert.equal(planningSecondsRemaining(planning, 182000), 0);
  assert.equal(planning.phase, "planning");
});

test("actor, action, and skill are required while Risk Bid remains optional", () => {
  let state = planningState();
  for (const station of STATIONS) state = completeStation(state, station);
  assert.equal(planningReady(state), true);
  const locked = lockPlanning(state);
  assert.equal(locked.phase, "locked");
});

test("an unassigned station prevents Round 1 planning from starting", () => {
  let state = createPlanningState({ eventId: "event", roundId: "round" });
  for (const station of STATIONS) {
    if (station === "veilwarden") continue;
    state = assignActor(state, station, `${station}-actor`);
    state = selectMastery(state, station, `${station}.mastery`);
  }
  assert.throws(() => startPlanning(state), /Assign a different PF2e officer/);
});

test("choosing a new action clears skill and Risk Bid", () => {
  let state = planningState();
  state = selectAction(state, "captain", "captain.first");
  state = selectSkill(state, "captain", "captain.skill");
  state = selectRiskTier(state, "captain", 5);
  state = selectAction(state, "captain", "captain.second");
  assert.equal(state.selections.captain.skillId, null);
  assert.equal(state.selections.captain.riskTier, null);
});

test("crew can reorder stations collaboratively during planning", () => {
  let state = planningState();
  state = moveOrder(state, "navigator", "earlier");
  assert.deepEqual(state.order.slice(0, 3), ["captain", "navigator", "engineer"]);
});

test("locked plans reject further planning changes", () => {
  let state = planningState();
  for (const station of STATIONS) state = completeStation(state, station);
  state = lockPlanning(state);
  assert.throws(() => selectAction(state, "captain", "new"), /only change during planning/);
  assert.throws(() => assignActor(state, "captain", "other"), /locked for the Event/);
});

test("restart returns to opening and preserves station assignments", () => {
  let state = readyEventSetup(createPlanningState({ eventId: "event", roundId: "round" }));
  state = startPlanning(state);
  state = restartEvent(state, { roundId: "round-one", preserveAssignments: true });
  assert.equal(state.phase, "opening");
  assert.equal(state.roundIndex, 0);
  assert.equal(state.roundId, "round-one");
  assert.equal(state.assignments.captain.actorId, "captain-actor");
  assert.equal(state.masterySelections.captain, "captain.mastery");
  assert.equal(state.selections.captain.actionId, null);
});
