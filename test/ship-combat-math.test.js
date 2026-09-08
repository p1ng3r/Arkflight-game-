import test from "node:test";
import assert from "node:assert/strict";

import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { shipDefenseProgressionBonus } from "../src/ship/progression.js";
import { validateShip } from "../src/ship/validate-ship.js";
import { HULL_BASE_HARDNESS } from "../src/content/hulls.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { WEAPON_ARC_TEMPLATES, WEAPON_MOUNTS } from "../src/combat/combat-schema.js";
import {
  applyHardnessToDamage,
  normalizeWeaponUpgrades,
  shipWeaponAttackBonus,
  weaponDamageProfile
} from "../src/combat/weapon-combat.js";

function vessel(hullId, engineId, level, overrides = {}) {
  return createShip({
    hull: { chassisId: hullId, patternId: "standard" },
    arkengine: { chassisId: engineId, patternId: "standard", modIds: [] },
    progression: { level, xp: 0, talentIds: [], arkcraftUpgrades: {} },
    ...overrides
  });
}

test("ship defense progression uses PF2e-style proficiency steps", () => {
  assert.equal(shipDefenseProgressionBonus(1), 0);
  assert.equal(shipDefenseProgressionBonus(6), 0);
  assert.equal(shipDefenseProgressionBonus(7), 2);
  assert.equal(shipDefenseProgressionBonus(13), 4);
  assert.equal(shipDefenseProgressionBonus(19), 6);
  assert.equal(shipDefenseProgressionBonus(20), 6);
});

test("Rum Runner galleon chassis derives level-scaled AC while Hardness stays chassis-based", () => {
  const level1 = deriveShip(vessel("galleon", "furnaceheart-drive", 1), SHIP_CATALOGS);
  const level6 = deriveShip(vessel("galleon", "furnaceheart-drive", 6), SHIP_CATALOGS);
  assert.equal(level1.stats.armorClass, 16);
  assert.equal(level6.stats.armorClass, 21);
  assert.equal(level1.stats.hardness, 6);
  assert.equal(level6.stats.hardness, 6);
  assert.equal(level1.stats.hullIntegrity, 260);
  assert.equal(level6.stats.hullIntegrity, 260);
});

test("high-level AC keeps hull chassis identity", () => {
  const frigate = deriveShip(vessel("frigate", "iron-choir-engine", 15), SHIP_CATALOGS);
  const galleon = deriveShip(vessel("galleon", "furnaceheart-drive", 15), SHIP_CATALOGS);
  assert.equal(frigate.stats.armorClass, 37);
  assert.equal(galleon.stats.armorClass, 34);
});

test("all hulls carry the approved chassis Hardness values", () => {
  assert.deepEqual(HULL_BASE_HARDNESS, {
    "void-skiff": 2,
    sloop: 3,
    cutter: 4,
    brigantine: 4,
    frigate: 5,
    galleon: 6,
    hammerhead: 7,
    arkcruiser: 7,
    "dread-caravel": 8,
    "cathedral-ship": 7,
    "leviathan-class-platform": 10
  });
  for (const [id, hardness] of Object.entries(HULL_BASE_HARDNESS)) {
    assert.equal(SHIP_CATALOGS.hulls[id].data.baseStats.hardness, hardness, `${id} Hardness`);
  }
});

test("legacy hull physical resistance no longer double-dips with Hardness", () => {
  const plain = deriveShip(vessel("galleon", "furnaceheart-drive", 6), SHIP_CATALOGS);
  assert.deepEqual(plain.stats.physicalResistances, { bludgeoning: 4, piercing: 3, slashing: 3 });
  assert.deepEqual(plain.stats.resistances.values, {});

  const fireproof = deriveShip(vessel("galleon", "furnaceheart-drive", 6, { shipMods: ["firebreak-plating"] }), SHIP_CATALOGS);
  assert.equal(fireproof.stats.resistances.values.fire, 5);
  assert.equal(fireproof.stats.resistances.values.bludgeoning, undefined);
});

test("weapon attack combines Battlewatch Perception ship targeting and Potency", () => {
  const install = { upgrades: { potency: 1, impact: 0, properties: [] } };
  assert.equal(shipWeaponAttackBonus({
    battlewatchPerception: 14,
    shipWeaponAttackBonus: 1,
    install
  }), 16);
});

test("Impact adds weapon dice without multiplying the whole damage pool", () => {
  const weapon = SHIP_CATALOGS.weapons["swivel-cannon"];
  assert.equal(weapon.data.damageProfile.dice, "3d8");
  assert.equal(weaponDamageProfile(weapon, { upgrades: { impact: 2 } }).dice, "5d8");
  assert.equal(weaponDamageProfile(weapon, { upgrades: { impact: 3 } }).dice, "6d8");
});

test("weapon upgrade normalization clamps ranks and deduplicates properties", () => {
  assert.deepEqual(normalizeWeaponUpgrades({ upgrades: {
    potency: 9,
    impact: -2,
    properties: ["wardbreaker", "wardbreaker", " stormbound ", ""]
  } }), {
    potency: 3,
    impact: 0,
    properties: ["wardbreaker", "stormbound"]
  });
});

test("Hardness reduces structural damage once", () => {
  assert.deepEqual(applyHardnessToDamage(27, 8), {
    incoming: 27,
    hardness: 8,
    absorbed: 8,
    hullDamage: 19
  });
  assert.equal(applyHardnessToDamage(4, 8).hullDamage, 0);
});

test("core weapon catalog contains twelve distinct combat-ready weapons", () => {
  assert.equal(Object.keys(SHIP_CATALOGS.weapons).length, 12);
  for (const weapon of Object.values(SHIP_CATALOGS.weapons)) {
    const combat = weapon.data.combat;
    assert.ok(["small", "medium", "large"].includes(weapon.data.size), `${weapon.name} size`);
    assert.ok(weapon.data.allowedMounts.length > 0, `${weapon.name} mounts`);
    for (const mount of weapon.data.allowedMounts) assert.ok(WEAPON_MOUNTS.includes(mount), `${weapon.name} mount ${mount}`);
    assert.ok(WEAPON_ARC_TEMPLATES.includes(combat.arcTemplate), `${weapon.name} arc ${combat.arcTemplate}`);
    assert.ok(Number.isInteger(combat.fireAP) && combat.fireAP >= 1, `${weapon.name} fire AP`);
    assert.ok(Number.isInteger(combat.reloadRounds) && combat.reloadRounds >= 0, `${weapon.name} reload`);
    assert.ok(combat.rangeHexes.min >= 1, `${weapon.name} minimum range`);
    assert.ok(combat.rangeHexes.optimalMin >= combat.rangeHexes.min, `${weapon.name} optimal minimum`);
    assert.ok(combat.rangeHexes.optimalMax >= combat.rangeHexes.optimalMin, `${weapon.name} optimal maximum`);
    assert.ok(combat.rangeHexes.max >= combat.rangeHexes.optimalMax, `${weapon.name} maximum range`);
  }
});

test("ship validation rejects out-of-range weapon upgrade ranks", () => {
  const ship = vessel("galleon", "furnaceheart-drive", 6, {
    weapons: [{
      id: "swivel-cannon",
      arc: "fore",
      mountIndex: 0,
      upgrades: { potency: 4, impact: 0, properties: [] }
    }]
  });
  const result = validateShip(ship, SHIP_CATALOGS);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /potency upgrade must be an integer from 0 to 3/);
});
