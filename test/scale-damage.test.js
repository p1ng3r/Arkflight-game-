import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIP_DAMAGE_CHARACTER_HP_RATIO,
  MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY,
  shipDamageToCharacterHp,
  characterDamageToShipHull,
  massiveDurability,
  applyShipDamageToMassive,
  applyCharacterDamageToMassive,
  massiveCharacterHpEquivalent
} from "../src/combat/scale-damage.js";

test("Arkflight cross-scale damage uses the 10:1 rule", () => {
  assert.equal(SHIP_DAMAGE_CHARACTER_HP_RATIO, 10);
  assert.equal(shipDamageToCharacterHp(17), 170);
  assert.equal(shipDamageToCharacterHp(0), 0);
  assert.equal(characterDamageToShipHull(99, { structural: true }), 9);
  assert.equal(characterDamageToShipHull(100, { structural: true }), 10);
  assert.equal(characterDamageToShipHull(100, { structural: false }), 0);
});

test("Massive creatures take Ship Damage directly and accumulate character damage", () => {
  assert.equal(MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY, 10);
  const start = massiveDurability({ max: 26, value: 26 });
  const pcHit = applyCharacterDamageToMassive(start, 17);
  assert.equal(pcHit.integrityDamage, 1);
  assert.deepEqual(pcHit.state, { max: 26, value: 25, buffer: 7 });
  assert.equal(massiveCharacterHpEquivalent(pcHit.state), 243);

  const cannon = applyShipDamageToMassive(pcHit.state, 14);
  assert.equal(cannon.integrityDamage, 14);
  assert.deepEqual(cannon.state, { max: 26, value: 11, buffer: 7 });
  assert.equal(massiveCharacterHpEquivalent(cannon.state), 103);
});
