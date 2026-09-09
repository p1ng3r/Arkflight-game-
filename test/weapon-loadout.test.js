import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { findAvailableWeaponMount, quickInstallWeapon, weaponMountSlots } from "../src/ship/weapon-loadout.js";
import { validateShip } from "../src/ship/validate-ship.js";

function vessel(hullId, engineId, level = 1, overrides = {}) {
  return createShip({
    hull: { chassisId: hullId, patternId: "standard" },
    arkengine: { chassisId: engineId, patternId: "standard", modIds: [] },
    progression: { level, xp: 0, talentIds: [], arkcraftUpgrades: {} },
    ...overrides
  });
}

function ids(...values) {
  let index = 0;
  return () => values[index++] ?? `weapon-${index}`;
}

test("Deck Ballista quick-loads into the first legal Sloop mount", () => {
  const ship = vessel("sloop", "lanterncoil-arkengine", 1);
  const result = quickInstallWeapon(ship, SHIP_CATALOGS, "deck-ballista", { instanceIdFactory: ids("ballista-a") });

  assert.equal(result.ok, true);
  assert.equal(result.install.id, "deck-ballista");
  assert.equal(result.install.instanceId, "ballista-a");
  assert.equal(result.install.mount, "fore");
  assert.equal(result.install.arc, "fore");
  assert.equal(result.install.mountIndex, 0);
  assert.equal(result.install.firingArc, "wide");
  assert.deepEqual(result.install.upgrades, { potency: 0, impact: 0, properties: [] });
  assert.equal(result.ship.weapons.length, 1);
  assert.equal(validateShip(result.ship, SHIP_CATALOGS).ok, true);
});

test("repeated quick-loads choose the next legal free mount", () => {
  const base = vessel("sloop", "lanterncoil-arkengine", 1);
  const first = quickInstallWeapon(base, SHIP_CATALOGS, "deck-ballista", { instanceIdFactory: ids("ballista-a") });
  const second = quickInstallWeapon(first.ship, SHIP_CATALOGS, "deck-ballista", { instanceIdFactory: ids("ballista-b") });
  const third = quickInstallWeapon(second.ship, SHIP_CATALOGS, "deck-ballista", { instanceIdFactory: ids("ballista-c") });

  assert.equal(second.ok, true);
  assert.equal(second.install.mount, "port");
  assert.equal(third.ok, true);
  assert.equal(third.install.mount, "starboard");
  assert.equal(weaponMountSlots(third.ship, SHIP_CATALOGS).filter((slot) => slot.occupied).length, 3);
});

test("Brigantines accept light broadside cannons but require an upgraded mount for a medium battery", () => {
  const ship = vessel("brigantine", "tidewake-arkengine", 1);
  const light = findAvailableWeaponMount(ship, SHIP_CATALOGS, "light-broadside-cannon");
  const battery = findAvailableWeaponMount(ship, SHIP_CATALOGS, "broadside-cannon-battery");

  assert.equal(light.ok, true);
  assert.equal(light.slot.facing, "port");
  assert.equal(light.slot.maxSize, "small");
  assert.equal(battery.ok, false);
  assert.equal(battery.reason, "no-compatible-mount");
  assert.equal(battery.weaponSize, "medium");
});

test("Heavy Bombard cannot fit a Sloop's small-only mounts", () => {
  const ship = vessel("sloop", "lanterncoil-arkengine", 3);
  const result = findAvailableWeaponMount(ship, SHIP_CATALOGS, "heavy-bombard");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no-compatible-mount");
  assert.equal(result.weaponSize, "large");
});

test("Heavy Bombard fits the Hammerhead fore large mount", () => {
  const ship = vessel("hammerhead", "voidbreaker-arkengine", 3);
  const result = quickInstallWeapon(ship, SHIP_CATALOGS, "heavy-bombard", { instanceIdFactory: ids("bombard-a") });
  assert.equal(result.ok, true);
  assert.equal(result.install.mount, "fore");
  assert.equal(result.install.mountIndex, 0);
  assert.equal(result.install.firingArc, "wide");
  assert.equal(validateShip(result.ship, SHIP_CATALOGS).ok, true);
});

test("rare weapons respect their minimum ship-level gate", () => {
  const ship = vessel("hammerhead", "voidbreaker-arkengine", 2);
  const result = findAvailableWeaponMount(ship, SHIP_CATALOGS, "stormglass-lance");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "ship-level-too-low");
  assert.equal(result.shipLevel, 2);
  assert.equal(result.minShipLevel, 3);
});

test("unknown weapon IDs are rejected instead of being installed", () => {
  const ship = vessel("sloop", "lanterncoil-arkengine", 1);
  const result = quickInstallWeapon(ship, SHIP_CATALOGS, "not-a-real-gun", { instanceIdFactory: ids("never") });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown-weapon");
  assert.equal(result.ship.weapons.length, 0);
});
