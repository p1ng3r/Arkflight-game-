import test from "node:test";
import assert from "node:assert/strict";

import {
  COMBAT_ACTIONS,
  COMBAT_ACTION_TIMING,
  COMBAT_STATIONS,
  getCoreCombatActionDefinitionsForStation
} from "../src/combat/index.js";

test("every Arkflight combat station has four core Actions and one core Reaction", () => {
  assert.equal(Object.keys(COMBAT_ACTIONS).length, 32);

  for (const station of COMBAT_STATIONS) {
    const entries = getCoreCombatActionDefinitionsForStation(station);
    const actions = entries.filter((entry) => entry.timing === COMBAT_ACTION_TIMING.ACTION);
    const reactions = entries.filter((entry) => entry.timing === COMBAT_ACTION_TIMING.REACTION);

    assert.equal(entries.length, 5, `${station} has five core combat choices`);
    assert.equal(actions.length, 4, `${station} has four Actions`);
    assert.equal(reactions.length, 1, `${station} has one Reaction`);
  }
});

test("core combat Actions consume shared AP and Reactions consume shared RP", () => {
  for (const entry of Object.values(COMBAT_ACTIONS)) {
    assert.ok(entry.id.startsWith(`${entry.station}-`), `${entry.id} is namespaced to ${entry.station}`);
    assert.ok(entry.name.length > 0, `${entry.id} has a name`);
    assert.ok(entry.description.length > 0, `${entry.id} has a description`);
    assert.ok(entry.category, `${entry.id} has a category`);
    assert.ok(entry.rules?.resolver, `${entry.id} declares a resolver contract`);

    if (entry.timing === COMBAT_ACTION_TIMING.REACTION) {
      assert.equal(entry.cost.ap, 0, `${entry.id} does not spend AP`);
      assert.ok(entry.cost.rp >= 1, `${entry.id} spends RP`);
    } else if (entry.id === "battlewatch-reload-weapon") {
      assert.equal(entry.cost.ap, 0, "Work the Guns costs 0 AP");
      assert.equal(entry.rules.oncePerRound, true, "Work the Guns is once per round");
      assert.equal(entry.rules.maxReloadRemaining, 2, "Work the Guns requires Reload 2 or less");
      assert.equal(entry.rules.strain, 1, "Work the Guns gains 1 Strain");
    } else if (entry.rules?.oncePerBattle && entry.rules?.requiresCapability) {
      assert.equal(entry.cost.ap, 0, `${entry.id} is an activated progression ability, not a normal AP action`);
    } else if (entry.id === "captain-board-ship") {
      assert.equal(entry.cost.ap, 0, "Board Ship is a 0 AP PF2e handoff once Moored");
    } else {
      assert.ok(entry.cost.ap >= 1, `${entry.id} spends AP`);
      assert.equal(entry.cost.rp, 0, `${entry.id} does not spend RP`);
    }
  }
});

test("the five core station menus remain distinct and complete", () => {
  const expected = {
    captain: ["Issue Order", "Rally Crew", "Drive the Crew", "Coordinate Assault", "Brace for Impact"],
    engineer: ["Vent Strain", "Overcharge Arkengine", "Emergency Repair", "Redistribute Power", "Emergency Bypass"],
    navigator: ["Push Ahead", "Extra Maneuver", "Hard Turn", "Set Attack Vector", "Evasive Maneuver"],
    battlewatch: ["Acquire Target", "Fire Weapon", "Work the Guns", "Ready Broadside", "Spoil Their Aim"],
    veilwarden: ["Reinforce Lifeveil", "Mend Lifeveil", "Focus Ward", "Purge Interference", "Emergency Ward"]
  };

  for (const station of COMBAT_STATIONS) {
    assert.deepEqual(
      getCoreCombatActionDefinitionsForStation(station).map((entry) => entry.name),
      expected[station],
      `${station} core menu`
    );
  }
});

test("station roles use different tactical levers instead of five copies of attack bonus", () => {
  assert.equal(COMBAT_ACTIONS["captain-coordinate-assault"].rules.effect, "hardness-reduction");
  assert.equal(COMBAT_ACTIONS["navigator-set-attack-vector"].rules.effect, "arc-tolerance");
  assert.equal(COMBAT_ACTIONS["battlewatch-acquire-target"].rules.effect, "attack-bonus");
  assert.equal(COMBAT_ACTIONS["engineer-redistribute-power"].rules.effect, "power-routing");
  assert.equal(COMBAT_ACTIONS["veilwarden-focus-ward"].rules.effect, "focused-ward-mitigation");
});


test("Reload is a common 1 AP action separate from Battlewatch Work the Guns", () => {
  const reload = COMBAT_ACTIONS["common-reload-weapon"];
  const work = COMBAT_ACTIONS["battlewatch-reload-weapon"];
  assert.equal(reload.station, "common");
  assert.equal(reload.name, "Reload");
  assert.equal(reload.cost.ap, 1);
  assert.equal(reload.rules.resolver, "reloadWeapon");
  assert.equal(work.station, "battlewatch");
  assert.equal(work.name, "Work the Guns");
  assert.equal(work.cost.ap, 0);
  assert.equal(work.rules.oncePerRound, true);
  assert.equal(work.rules.maxReloadRemaining, 2);
});


test("Fire Weapon has a fixed 1 AP cost independent of weapon definition", () => {
  const fire = COMBAT_ACTIONS["battlewatch-fire-weapon"];
  assert.equal(fire.cost.ap, 1);
  assert.equal(fire.rules.costSource, undefined);
});


test("Mythic Navigator abilities are progression actions, not extra core menu entries", () => {
  const burn = COMBAT_ACTIONS["navigator-impossible-burn"];
  const turn = COMBAT_ACTIONS["navigator-turn-between-heartbeats"];
  assert.equal(burn.rules.requiresCapability, "impossible-burn");
  assert.equal(burn.rules.oncePerBattle, true);
  assert.equal(burn.rules.strain, 2);
  assert.equal(turn.rules.requiresCapability, "turn-between-heartbeats");
  assert.equal(turn.rules.oncePerBattle, true);
  assert.equal(getCoreCombatActionDefinitionsForStation("navigator").length, 5);
});


test("ship engagement actions use the locked Ram Grapple Break and Board costs", () => {
  const ram = COMBAT_ACTIONS["navigator-ram-ship"];
  const grapple = COMBAT_ACTIONS["navigator-grapple-ship"];
  const escape = COMBAT_ACTIONS["navigator-break-grapple"];
  const board = COMBAT_ACTIONS["captain-board-ship"];

  assert.equal(ram.cost.ap, 2);
  assert.equal(ram.rules.resolver, "ramShip");
  assert.equal(ram.rules.requiresMovementThisTurn, true);
  assert.equal(grapple.cost.ap, 1);
  assert.equal(grapple.rules.resolver, "grappleShip");
  assert.equal(escape.cost.ap, 1);
  assert.equal(escape.rules.resolver, "breakGrapple");
  assert.equal(board.cost.ap, 0);
  assert.equal(board.station, "captain");
  assert.equal(board.rules.resolver, "boardShip");
});
