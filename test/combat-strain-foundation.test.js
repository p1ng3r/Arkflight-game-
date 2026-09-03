import test from "node:test";
import assert from "node:assert/strict";

import {
  beginCombatantTurn,
  createCombatantState,
  fireWeapon,
  headingStepDistance,
  hullCombatProfile,
  normalizeHexHeading,
  persistentStrainPatch,
  purchaseManeuver,
  purchaseMovement,
  recordFacingChange,
  recordMovement,
  weaponReloadRemaining,
  workTheGuns
} from "../src/combat/index.js";

function ship(hullId = "brigantine", strain = 0, strainMax = 10) {
  return {
    hull: { chassisId: hullId },
    resources: { strain: { value: strain, max: strainMax } },
    weapons: [{ id: "test-cannon", arc: "port", mountIndex: 0 }],
    progression: { level: 1, talentIds: [], arkcraftUpgrades: {} }
  };
}

const catalogs = {
  weapons: {
    "test-cannon": {
      id: "test-cannon",
      name: "Test Cannon",
      data: { combat: { fireAP: 2, reloadRounds: 1 } }
    }
  }
};

const derived = {
  stats: {
    combatSpeed: 5,
    maneuverability: 2,
    actionBonus: 0,
    reactionBonus: 0,
    strainCapacity: 10
  }
};

test("hulls determine shared AP and RP budgets", () => {
  assert.deepEqual(hullCombatProfile(ship("void-skiff")), { ap: 2, rp: 1 });
  assert.deepEqual(hullCombatProfile(ship("brigantine")), { ap: 4, rp: 1 });
  assert.deepEqual(hullCombatProfile(ship("galleon")), { ap: 5, rp: 1 });
  assert.deepEqual(hullCombatProfile(ship("arkcruiser")), { ap: 6, rp: 2 });
  assert.deepEqual(hullCombatProfile(ship("leviathan-class-platform")), { ap: 8, rp: 2 });
});

test("combatant state starts with hull AP RP and effective mobility", () => {
  const state = createCombatantState(ship("brigantine", 3, 10), { derived, catalogs, rotation: 121 });
  assert.deepEqual(state.economy.ap, { value: 4, max: 4 });
  assert.deepEqual(state.economy.rp, { value: 1, max: 1 });
  assert.equal(state.mobility.speed, 5);
  assert.equal(state.mobility.maneuverability, 2);
  assert.equal(state.mobility.heading, 120);
  assert.deepEqual(state.strain, { value: 3, max: 10 });
});

test("Move spends 1 AP and buys one Combat Speed allowance", () => {
  let state = createCombatantState(ship(), { derived, catalogs });
  state = purchaseMovement(state);
  assert.equal(state.economy.ap.value, 3);
  assert.deepEqual(state.mobility.movement, { purchases: 1, allowance: 5, used: 0 });
  state = recordMovement(state, 3);
  assert.equal(state.mobility.movement.used, 3);
  assert.throws(() => recordMovement(state, 3), /Movement exceeds allowance/);
  state = purchaseMovement(state);
  assert.deepEqual(state.mobility.movement, { purchases: 2, allowance: 10, used: 3 });
});

test("Maneuver spends 1 AP and buys Maneuverability facing steps", () => {
  let state = createCombatantState(ship(), { derived, catalogs });
  state = purchaseManeuver(state);
  assert.equal(state.economy.ap.value, 3);
  assert.deepEqual(state.mobility.maneuver, { purchases: 1, allowance: 2, used: 0 });
  state = recordFacingChange(state, 1, 60);
  assert.equal(state.mobility.heading, 60);
  assert.equal(state.mobility.maneuver.used, 1);
  state = recordFacingChange(state, 1, 120);
  assert.equal(state.mobility.maneuver.used, 2);
  assert.throws(() => recordFacingChange(state, 1, 180), /Facing change exceeds Maneuver allowance/);
});

test("hex headings snap to six directions and measure shortest facing change", () => {
  assert.equal(normalizeHexHeading(359), 0);
  assert.equal(normalizeHexHeading(61), 60);
  assert.equal(normalizeHexHeading(181), 180);
  assert.equal(headingStepDistance(0, 300), 1);
  assert.equal(headingStepDistance(60, 240), 3);
});

test("weapon fire spends weapon AP and creates a separate reload clock", () => {
  let state = createCombatantState(ship(), { derived, catalogs });
  const weaponKey = Object.keys(state.weapons)[0];
  state = fireWeapon(state, weaponKey, 1);
  assert.equal(state.economy.ap.value, 2);
  assert.equal(state.weapons[weaponKey].lastFiredRound, 1);
  assert.equal(state.weapons[weaponKey].readyRound, 3);
  assert.equal(weaponReloadRemaining(state.weapons[weaponKey], 2), 1);
  assert.equal(weaponReloadRemaining(state.weapons[weaponKey], 3), 0);
  assert.throws(() => fireWeapon(state, weaponKey, 2), /still reloading/);
});

test("Work the Guns spends 1 AP to shorten reload by one round", () => {
  let state = createCombatantState(ship(), { derived, catalogs });
  const weaponKey = Object.keys(state.weapons)[0];
  state = fireWeapon(state, weaponKey, 1);
  state = workTheGuns(state, weaponKey, 1);
  assert.equal(state.economy.ap.value, 1);
  assert.equal(state.weapons[weaponKey].readyRound, 2);
  assert.equal(weaponReloadRemaining(state.weapons[weaponKey], 2), 0);
});

test("native turn refresh refills AP RP and clears movement purchases", () => {
  let state = createCombatantState(ship(), { derived, catalogs });
  state = purchaseMovement(state);
  state = purchaseManeuver(state);
  state = recordMovement(state, 4);
  state = recordFacingChange(state, 1, 60);
  state = beginCombatantTurn(state, 2);
  assert.deepEqual(state.economy.ap, { value: 4, max: 4 });
  assert.deepEqual(state.economy.rp, { value: 1, max: 1 });
  assert.deepEqual(state.mobility.movement, { purchases: 0, allowance: 0, used: 0 });
  assert.deepEqual(state.mobility.maneuver, { purchases: 0, allowance: 0, used: 0 });
  assert.equal(state.mobility.heading, 60);
});

test("combat Strain can still be written back to the persistent ship", () => {
  const original = ship("brigantine", 2, 10);
  const state = createCombatantState(original, { derived, catalogs });
  const patched = persistentStrainPatch(original, { ...state, strain: { value: 4, max: 10 } });
  assert.equal(patched.resources.strain.value, 4);
  assert.equal(patched.hull.chassisId, "brigantine");
});
