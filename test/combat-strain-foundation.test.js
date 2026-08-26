import test from "node:test";
import assert from "node:assert/strict";

import {
  COMBAT_ACTIONS,
  canonicalCombatStation,
  combatActionsForStation,
  createCombatState,
  executeCombatAction,
  hullCombatProfile,
  persistentStrainPatch,
  resetCombatRound
} from "../src/combat/index.js";

function ship(hullId = "brigantine", strain = 0, strainMax = 10) {
  return {
    hull: { chassisId: hullId },
    resources: { strain: { value: strain, max: strainMax } }
  };
}

test("larger hull combat profiles receive larger shared Action budgets", () => {
  assert.equal(hullCombatProfile(ship("void-skiff")).actions, 2);
  assert.equal(hullCombatProfile(ship("brigantine")).actions, 4);
  assert.equal(hullCombatProfile(ship("galleon")).actions, 5);
  assert.equal(hullCombatProfile(ship("arkcruiser")).actions, 6);
  assert.equal(hullCombatProfile(ship("leviathan-class-platform")).actions, 8);
});

test("legacy Watchmaster maps to Battlewatch during migration", () => {
  assert.equal(canonicalCombatStation("watchmaster"), "battlewatch");
  const actions = combatActionsForStation("watchmaster");
  assert.ok(actions.some((action) => action.id === "ready-broadside"));
  assert.ok(actions.some((action) => action.id === "fire-weapon"));
});

test("combat starts with hull-derived Actions and Reactions", () => {
  const state = createCombatState(ship("brigantine", 3, 10));
  assert.deepEqual(state.economy.actions, { value: 4, max: 4 });
  assert.deepEqual(state.economy.reactions, { value: 1, max: 1 });
  assert.deepEqual(state.strain, { value: 3, max: 10 });
});

test("normal Actions spend Actions and cannot overspend", () => {
  let state = createCombatState(ship("void-skiff"));
  state = executeCombatAction(state, "adjust-facing");
  assert.equal(state.economy.actions.value, 1);
  state = executeCombatAction(state, "adjust-facing");
  assert.equal(state.economy.actions.value, 0);
  assert.throws(() => executeCombatAction(state, "adjust-facing"), /Not enough actions/);
});

test("Reactions use the separate reaction track", () => {
  let state = createCombatState(ship("brigantine"));
  state = executeCombatAction(state, "brace-for-impact");
  assert.equal(state.economy.reactions.value, 0);
  assert.equal(state.economy.actions.value, 4);
  assert.throws(() => executeCombatAction(state, "brace-for-impact"), /Not enough reactions/);
});

test("Strain actions increase persistent combat Strain and identify the pushed area", () => {
  let state = createCombatState(ship("brigantine", 4, 10));
  state = executeCombatAction(state, "hard-turn");
  assert.equal(state.strain.value, 5);
  assert.equal(state.pushedAreas.at(-1), "rigging");
  assert.equal(state.facing, "aft");
});

test("Overcharge spends an Action, gains Strain, then adds a temporary Action", () => {
  let state = createCombatState(ship("brigantine", 0, 10));
  state = executeCombatAction(state, "overcharge-arkengine");
  assert.equal(state.strain.value, 1);
  assert.equal(state.economy.actions.value, 4);
  assert.equal(state.economy.actions.max, 5);
  assert.equal(state.economy.baseline.actions, 4);
  assert.equal(state.pushedAreas.at(-1), "arkengine");

  state = resetCombatRound(state);
  assert.equal(state.economy.actions.value, 4);
  assert.equal(state.economy.actions.max, 4);
});

test("round reset refills the established combat economy", () => {
  let state = createCombatState(ship("brigantine"));
  state = executeCombatAction(state, "adjust-facing");
  state = executeCombatAction(state, "brace-for-impact");
  state = resetCombatRound(state);
  assert.equal(state.round, 2);
  assert.equal(state.economy.actions.value, state.economy.actions.max);
  assert.equal(state.economy.reactions.value, state.economy.reactions.max);
  assert.deepEqual(state.pushedAreas, []);
});

test("combat Strain can be written back without copying combat state into the ship", () => {
  const original = ship("brigantine", 2, 10);
  let state = createCombatState(original);
  state = executeCombatAction(state, "drive-the-crew");
  const patched = persistentStrainPatch(original, state);
  assert.equal(patched.resources.strain.value, 3);
  assert.equal(patched.hull.chassisId, "brigantine");
  assert.equal(patched.combat, undefined);
});

test("salvaged tactical action names survive under the new five-station model", () => {
  for (const id of ["adjust-facing", "evasive-maneuver", "ready-broadside", "aim-weapon", "call-target"]) {
    assert.ok(COMBAT_ACTIONS[id], `missing ${id}`);
  }
  assert.equal(COMBAT_ACTIONS["ready-broadside"].station, "battlewatch");
  assert.equal(COMBAT_ACTIONS["adjust-facing"].station, "navigator");
});
