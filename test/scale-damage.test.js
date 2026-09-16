import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIP_DAMAGE_CHARACTER_HP_RATIO,
  shipDamageToCharacterHp,
  characterDamageToShipHull
} from "../src/combat/scale-damage.js";

test("Arkflight cross-scale damage uses the 10:1 rule", () => {
  assert.equal(SHIP_DAMAGE_CHARACTER_HP_RATIO, 10);
  assert.equal(shipDamageToCharacterHp(17), 170);
  assert.equal(shipDamageToCharacterHp(0), 0);
  assert.equal(characterDamageToShipHull(99, { structural: true }), 9);
  assert.equal(characterDamageToShipHull(100, { structural: true }), 10);
  assert.equal(characterDamageToShipHull(100, { structural: false }), 0);
});
