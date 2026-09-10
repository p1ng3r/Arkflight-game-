import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip, normalizeShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { quickInstallWeapon } from "../src/ship/weapon-loadout.js";
import { validateShip } from "../src/ship/validate-ship.js";
import { createCombatantState } from "../src/combat/combatant-state.js";

function brigantine({ level = 5, specializationId = null } = {}) {
  return createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] },
    progression: { level, specializationId, talentIds: [], arkcraftUpgrades: {} }
  });
}

test("ship normalization persists the level-5 specialization authority", () => {
  const ship = normalizeShip(brigantine({ specializationId: "battle-ship" }));
  assert.equal(ship.progression.specializationId, "battle-ship");
});

test("Battle Ship Warship Conversion upgrades every derived mount one size without adding mounts", () => {
  const ordinary = deriveShip(brigantine(), SHIP_CATALOGS);
  const battleShip = deriveShip(brigantine({ specializationId: "battle-ship" }), SHIP_CATALOGS);

  assert.deepEqual(
    Object.fromEntries(Object.entries(battleShip.stats.weaponMounts).map(([arc, mount]) => [arc, mount.count])),
    Object.fromEntries(Object.entries(ordinary.stats.weaponMounts).map(([arc, mount]) => [arc, mount.count]))
  );

  for (const [arc, mount] of Object.entries(ordinary.stats.weaponMounts)) {
    const expected = mount.maxSize === "small" ? "medium" : "large";
    assert.equal(battleShip.stats.weaponMounts[arc].maxSize, expected);
  }
  assert.equal(battleShip.stats.armorClass, ordinary.stats.armorClass + 1);
  assert.ok(battleShip.capabilities.includes("warship-conversion"));
  assert.ok(battleShip.capabilities.includes("battle-stations"));
});

test("Battle Ship medium broadside flows from Shipwright mount selection through combat hydration", () => {
  const ordinary = quickInstallWeapon(brigantine(), SHIP_CATALOGS, "broadside-cannon-battery", { instanceIdFactory: () => "ordinary-medium" });
  assert.equal(ordinary.ok, false);
  assert.equal(ordinary.reason, "no-compatible-mount");

  const installed = quickInstallWeapon(
    brigantine({ specializationId: "battle-ship" }),
    SHIP_CATALOGS,
    "broadside-cannon-battery",
    { instanceIdFactory: () => "battle-medium" }
  );
  assert.equal(installed.ok, true);
  assert.equal(installed.slot.facing, "port");
  assert.equal(installed.slot.maxSize, "medium");

  const validation = validateShip(installed.ship, SHIP_CATALOGS);
  assert.equal(validation.ok, true, validation.errors.join("; "));

  const combatState = createCombatantState(installed.ship, {
    derived: validation.derived,
    catalogs: SHIP_CATALOGS,
    rotation: 0
  });
  assert.ok(combatState.weapons["battle-medium"]);
  assert.equal(combatState.weapons["battle-medium"].id, "broadside-cannon-battery");
  assert.equal(combatState.weapons["battle-medium"].mount, "port");
});
