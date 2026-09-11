import test from "node:test";
import assert from "node:assert/strict";

import {
  COMBAT_ACTIONS,
  COMBAT_ACTION_TIMING,
  COMBAT_STATIONS,
  getCoreCombatActionDefinitionsForStation
} from "../src/combat/index.js";

test("every Arkflight combat station has four core Actions and one core Reaction", () => {
  assert.equal(Object.keys(COMBAT_ACTIONS).length, 26);

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
    } else if (entry.rules?.costSource) {
      assert.equal(entry.id, "battlewatch-fire-weapon");
      assert.equal(entry.rules.costSource, "weapon.fireAP");
    } else if (entry.id === "battlewatch-reload-weapon") {
      assert.equal(entry.cost.ap, 0, "Work the Guns costs 0 AP");
      assert.equal(entry.rules.oncePerRound, true, "Work the Guns is once per round");
      assert.equal(entry.rules.maxReloadRemaining, 2, "Work the Guns requires Reload 2 or less");
      assert.equal(entry.rules.strain, 1, "Work the Guns gains 1 Strain");
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
