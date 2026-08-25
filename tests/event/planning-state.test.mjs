import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlanningState,
  startPlanning,
  planningSecondsRemaining,
  assignActor,
  selectAction,
  selectSkill,
  selectRiskTier,
  moveOrder,
  planningReady,
  lockPlanning,
  restartEvent
} from "../../src/event/planning-state.js";
import { STATIONS } from "../../src/event/event-schema.js";

function completeStation(state, station) {
  let next = assignActor(state, station, `${station}-actor`);
  next = selectAction(next, station, `${station}.action`);
  next = selectSkill(next, station, `${station}.skill`);
  return next;
}

test("planning starts at three minutes and does not auto-lock at zero", () => {
  const opening = createPlanningState({ eventId: "event", roundId: "round", now: 1000 });
  const planning = startPlanning(opening, 2000);
  assert.equal(planning.phase, "planning");
  assert.equal(planningSecondsRemaining(planning, 2000), 180);
  assert.equal(planningSecondsRemaining(planning, 182000), 0);
  assert.equal(planning.phase, "planning");
});

test("actor, action, and skill are required while Risk Bid remains optional", () => {
  let state = startPlanning(createPlanningState({ eventId: "event", roundId: "round" }));
  for (const station of STATIONS) state = completeStation(state, station);
  assert.equal(planningReady(state), true);
  const locked = lockPlanning(state);
  assert.equal(locked.phase, "locked");
});

test("an unassigned station prevents plan lock", () => {
  let state = startPlanning(createPlanningState({ eventId: "event", roundId: "round" }));
  for (const station of STATIONS) {
    state = selectAction(state, station, `${station}.action`);
    state = selectSkill(state, station, `${station}.skill`);
  }
  assert.equal(planningReady(state), false);
  assert.throws(() => lockPlanning(state), /assigned PF2e character/);
});

test("choosing a new action clears skill and Risk Bid", () => {
  let state = startPlanning(createPlanningState({ eventId: "event", roundId: "round" }));
  state = selectAction(state, "captain", "captain.first");
  state = selectSkill(state, "captain", "captain.skill");
  state = selectRiskTier(state, "captain", 5);
  state = selectAction(state, "captain", "captain.second");
  assert.equal(state.selections.captain.skillId, null);
  assert.equal(state.selections.captain.riskTier, null);
});

test("crew can reorder stations collaboratively during planning", () => {
  let state = startPlanning(createPlanningState({ eventId: "event", roundId: "round" }));
  state = moveOrder(state, "navigator", "earlier");
  assert.deepEqual(state.order.slice(0, 3), ["captain", "navigator", "engineer"]);
});

test("locked plans reject further planning changes", () => {
  let state = startPlanning(createPlanningState({ eventId: "event", roundId: "round" }));
  for (const station of STATIONS) state = completeStation(state, station);
  state = lockPlanning(state);
  assert.throws(() => selectAction(state, "captain", "new"), /only change during planning/);
  assert.throws(() => assignActor(state, "captain", "other"), /before the plan is locked/);
});

test("restart returns to opening and preserves station assignments", () => {
  let state = createPlanningState({ eventId: "event", roundId: "round" });
  state = assignActor(state, "captain", "captain-actor");
  state = startPlanning(state);
  state = restartEvent(state, { roundId: "round-one", preserveAssignments: true });
  assert.equal(state.phase, "opening");
  assert.equal(state.roundIndex, 0);
  assert.equal(state.roundId, "round-one");
  assert.equal(state.assignments.captain.actorId, "captain-actor");
  assert.equal(state.selections.captain.actionId, null);
});
