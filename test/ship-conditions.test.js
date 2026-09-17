import test from "node:test";
import assert from "node:assert/strict";

import { createShip, normalizeShip } from "../src/ship/ship-schema.js";
import {
  applyShipSystemDegradation,
  driveConditionPenalties,
  effectiveHullHardness,
  lifeveilCondition,
  moraleCondition,
  shipConditionProfile,
  weaponConditionModifiers,
  worsenShipCondition,
  wouldWorsenToFinalStage
} from "../src/ship/ship-conditions.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { createCombatantState } from "../src/combat/combatant-state.js";

test("Hull conditions reduce Hardness to 100/75/50/0 percent rounded down", () => {
  for (const [condition, expected] of [["sound", 4], ["battered", 3], ["breached", 2], ["shattered", 0]]) {
    const ship = createShip({ shipConditions: { hull: condition } });
    assert.equal(effectiveHullHardness(4, ship), expected, condition);
  }
  const batteredThree = createShip({ shipConditions: { hull: "battered" } });
  assert.equal(effectiveHullHardness(3, batteredThree), 2);
});

test("Drive conditions use the locked Speed and Maneuverability penalties", () => {
  const expected = {
    responsive: [0, 0],
    sluggish: [1, 0],
    faltering: [2, 1],
    unresponsive: [3, 2]
  };
  for (const [condition, [speedPenalty, maneuverPenalty]] of Object.entries(expected)) {
    const ship = createShip({ shipConditions: { drive: condition } });
    assert.deepEqual(driveConditionPenalties(ship), { speedPenalty, maneuverPenalty });
  }
});

test("Weapons conditions use matching attack and Reload penalties", () => {
  const expected = {
    ready: [0, 0],
    fouled: [1, 1],
    malfunctioning: [2, 2],
    "barely-operable": [3, 3]
  };
  for (const [condition, [attackPenalty, reloadPenalty]] of Object.entries(expected)) {
    const ship = createShip({ shipConditions: { weapons: condition } });
    assert.deepEqual(weaponConditionModifiers(ship), { attackPenalty, reloadPenalty });
  }
});

test("derived Brigantine stats reflect Hull Drive and Weapons conditions", () => {
  const base = createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] }
  });
  const damaged = createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] },
    shipConditions: { hull: "battered", drive: "faltering", weapons: "malfunctioning" }
  });
  const normal = deriveShip(base, SHIP_CATALOGS).stats;
  const altered = deriveShip(damaged, SHIP_CATALOGS).stats;
  assert.equal(altered.hardness, Math.floor(normal.hardness * 0.75));
  assert.equal(altered.combatSpeed, Math.max(0, normal.combatSpeed - 2));
  assert.equal(altered.maneuverability, Math.max(0, normal.maneuverability - 1));
  assert.equal(altered.weaponAttackBonus, normal.weaponAttackBonus - 2);
});

test("Lifeveil and Morale conditions derive directly from percentage", () => {
  assert.equal(lifeveilCondition(80).id, "stable");
  assert.equal(lifeveilCondition(75).id, "degraded");
  assert.equal(lifeveilCondition(50).id, "critical");
  assert.equal(lifeveilCondition(0).id, "collapsed");
  assert.equal(moraleCondition(100).id, "inspired");
  assert.equal(moraleCondition(80).id, "confident");
  assert.equal(moraleCondition(60).id, "steady");
  assert.equal(moraleCondition(40).id, "shaken");
  assert.equal(moraleCondition(20).id, "faltering");
  assert.equal(moraleCondition(0).id, "broken");
});

test("system degradation worsens fixed conditions and reduces percentage resources", () => {
  let ship = createShip();
  ship = applyShipSystemDegradation(ship, "hull").ship;
  ship = applyShipSystemDegradation(ship, "drive").ship;
  ship = applyShipSystemDegradation(ship, "weapons").ship;
  ship = applyShipSystemDegradation(ship, "lifeveil").ship;
  ship = applyShipSystemDegradation(ship, "morale").ship;
  assert.equal(shipConditionProfile(ship, "hull").id, "battered");
  assert.equal(shipConditionProfile(ship, "drive").id, "sluggish");
  assert.equal(shipConditionProfile(ship, "weapons").id, "fouled");
  assert.equal(ship.resources.lifeveil.value, 75);
  assert.equal(ship.resources.morale.value, 40);
});

test("legacy Arkengine and Rigging damage migrate into the worst Drive condition", () => {
  const ship = normalizeShip({
    systems: { arkengine: "damaged", rigging: "disabled", weapons: "damaged" },
    resources: { lifeveil: { value: 50, max: 50 }, morale: { value: 3, max: 5 } }
  });
  assert.equal(shipConditionProfile(ship, "drive").id, "unresponsive");
  assert.equal(shipConditionProfile(ship, "weapons").id, "malfunctioning");
  assert.deepEqual(ship.resources.lifeveil, { value: 100, max: 100 });
  assert.deepEqual(ship.resources.morale, { value: 60, max: 100 });
});

test("conditions stop worsening at their worst named stage", () => {
  const ship = createShip({ shipConditions: { drive: "unresponsive" } });
  const result = worsenShipCondition(ship, "drive");
  assert.equal(result.condition.id, "unresponsive");
  assert.equal(result.changed, false);
});


test("final-stage guard detects only the step into the worst named condition", () => {
  const hullBreached = createShip({ shipConditions: { hull: "breached" } });
  const driveFaltering = createShip({ shipConditions: { drive: "faltering" } });
  const weaponsFouled = createShip({ shipConditions: { weapons: "fouled" } });

  assert.equal(wouldWorsenToFinalStage(hullBreached, "hull"), true);
  assert.equal(wouldWorsenToFinalStage(driveFaltering, "drive"), true);
  assert.equal(wouldWorsenToFinalStage(weaponsFouled, "weapons"), false);
  assert.equal(wouldWorsenToFinalStage(createShip(), "lifeveil"), false);
});
