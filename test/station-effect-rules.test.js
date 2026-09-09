import test from "node:test";
import assert from "node:assert/strict";

import {
  COMBAT_ACTIONS,
  activeStationEffects,
  consumeStationEffects,
  executeStationStateAction,
  stationEffectProfile
} from "../src/combat/index.js";

function minimalState() {
  return Object.freeze({
    economy: Object.freeze({
      ap: Object.freeze({ value: 6, max: 6 }),
      rp: Object.freeze({ value: 2, max: 2 })
    }),
    strain: Object.freeze({ value: 0, max: 12 }),
    mobility: Object.freeze({
      heading: 0,
      speed: 4,
      maneuverability: 2,
      movement: Object.freeze({ purchases: 0, allowance: 0, used: 0 }),
      maneuver: Object.freeze({ purchases: 0, allowance: 0, used: 0 })
    }),
    weapons: Object.freeze({}),
    log: Object.freeze([])
  });
}

test("Station Bonus stays bounded across ship levels", () => {
  assert.equal(stationEffectProfile(1).bonus, 1);
  assert.equal(stationEffectProfile(5).bonus, 1);
  assert.equal(stationEffectProfile(10).bonus, 2);
  assert.equal(stationEffectProfile(19).bonus, 2);
  assert.equal(stationEffectProfile(20).bonus, 3);
});

test("level 5 Coordinate Assault carries two native combat charges", () => {
  const action = COMBAT_ACTIONS["captain-coordinate-assault"];
  const first = executeStationStateAction(minimalState(), action, {
    round: 1,
    selection: "enemy-combatant",
    shipLevel: 5
  });
  const [effect] = activeStationEffects(first, { station: "captain" });
  assert.equal(effect.actionId, action.id);
  assert.equal(effect.selection, "enemy-combatant");
  assert.equal(effect.charges, 2);

  const second = consumeStationEffects(first, [effect.id]);
  assert.equal(activeStationEffects(second, { station: "captain" })[0].charges, 1);
  const third = consumeStationEffects(second, [effect.id]);
  assert.equal(activeStationEffects(third, { station: "captain" }).length, 0);
});

test("core ship-combat action text no longer depends on authored Voyage Events", () => {
  for (const action of Object.values(COMBAT_ACTIONS)) {
    assert.doesNotMatch(action.description, /authored|voyage event|authored objective/i, action.id);
    assert.ok(action.summary?.length > 0, `${action.id} has a compact combat summary`);
  }
});
