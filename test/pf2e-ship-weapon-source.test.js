import test from "node:test";
import assert from "node:assert/strict";

import { WEAPONS } from "../src/content/index.js";
import {
  PF2E_SHIP_WEAPON_SCHEMA_VERSION,
  parsePf2eWeaponDamage,
  pf2eShipWeaponDocumentBase
} from "../src/foundry/pf2e-ship-weapon-source.js";

test("Arkflight ship weapons are emitted as PF2e Weapon Items", () => {
  const deckBallista = WEAPONS["deck-ballista"];
  const source = pf2eShipWeaponDocumentBase(deckBallista, { descriptionHtml: "<p>Deck Ballista</p>" });

  assert.equal(PF2E_SHIP_WEAPON_SCHEMA_VERSION, 2);
  assert.equal(source.type, "weapon");
  assert.equal(source.name, "Deck Ballista");
  assert.equal(source.system.category, "martial");
  assert.equal(source.system.level.value, 1);
  assert.equal(source.system.traits.rarity, "common");
  assert.deepEqual(source.system.damage, {
    dice: 2,
    die: "d10",
    damageType: "piercing",
    modifier: 0,
    persistent: null
  });
  assert.deepEqual(source.system.runes, { potency: 0, property: [], striking: 0 });
  assert.equal(source.system.range, null);
  assert.equal(source.system.reload.value, null);
  assert.equal(source.system.usage.value, "held-in-two-hands");
});

test("Rare Arkflight ship weapons map to PF2e rare Item rarity without moving Arkflight combat rules into PF2e fields", () => {
  const stormglassLance = WEAPONS["stormglass-lance"];
  const source = pf2eShipWeaponDocumentBase(stormglassLance);

  assert.equal(source.type, "weapon");
  assert.equal(source.system.level.value, 3);
  assert.equal(source.system.traits.rarity, "rare");
  assert.deepEqual(source.system.damage, {
    dice: 4,
    die: "d10",
    damageType: "electricity",
    modifier: 0,
    persistent: null
  });
  assert.equal(source.system.range, null);
  assert.equal(source.system.reload.value, null);
  assert.equal(source.system.bonus.value, 0);
});

test("all sixteen current ship weapons have PF2e-compatible base damage dice", () => {
  assert.equal(Object.keys(WEAPONS).length, 16);
  for (const weapon of Object.values(WEAPONS)) {
    const damage = parsePf2eWeaponDamage(weapon.data.damageProfile);
    assert.ok(Number.isInteger(damage.dice) && damage.dice > 0, weapon.name);
    assert.match(damage.die, /^d(?:4|6|8|10|12)$/);
    assert.ok(damage.damageType, weapon.name);
  }
});

test("invalid ship weapon damage formulas fail loudly instead of creating malformed PF2e Items", () => {
  assert.throws(
    () => parsePf2eWeaponDamage({ dice: "3d7", type: "piercing" }),
    /not PF2e-compatible/
  );
});
