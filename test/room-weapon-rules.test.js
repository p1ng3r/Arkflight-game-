import test from "node:test";
import assert from "node:assert/strict";

import { ROOMS } from "../src/content/rooms.js";
import { WEAPONS } from "../src/content/weapons.js";
import {
  roomGameplayPurposes,
  validateRoomPurpose,
  validateWeaponDefinition,
  weaponCanOperate,
  weaponCrewPenalty,
  weaponInventoryCargo,
  weaponPhysicalState
} from "../src/ship/room-weapon-rules.js";

test("every current Room has at least one explicit gameplay purpose", () => {
  for (const room of Object.values(ROOMS)) {
    const result = validateRoomPurpose(room);
    assert.equal(result.ok, true, `${room.id}: ${result.reason ?? "missing purpose"}`);
    assert.ok(roomGameplayPurposes(room).length > 0, room.id);
  }
});

test("every current weapon carries complete gameplay metadata", () => {
  for (const weapon of Object.values(WEAPONS)) {
    const result = validateWeaponDefinition(weapon);
    assert.equal(result.ok, true, `${weapon.id} missing: ${result.missing.join(", ")}`);
    assert.ok(weapon.data.crewRequired >= 1, weapon.id);
    assert.ok(weapon.data.reload.actions >= 1, weapon.id);
    assert.ok(weapon.data.arcs.length >= 1, weapon.id);
    assert.ok(weapon.data.damageProfile.dice, weapon.id);
    assert.ok(weapon.data.systemThreat, weapon.id);
    assert.ok(weapon.data.cargo > 0, weapon.id);
  }
});

test("short-handed weapon operation is -1 per missing required crew", () => {
  assert.equal(weaponCrewPenalty(3, 3), 0);
  assert.equal(weaponCrewPenalty(3, 2), -1);
  assert.equal(weaponCrewPenalty(3, 1), -2);
  assert.equal(weaponCrewPenalty(3, 0), -3);
});

test("a weapon with at least one operator may fire short-handed", () => {
  assert.equal(weaponCanOperate(3, 3), true);
  assert.equal(weaponCanOperate(3, 1), true);
  assert.equal(weaponCanOperate(3, 0), false);
});

test("uninstalled weapons consume Cargo and installed weapons consume mount capacity instead", () => {
  const weapon = WEAPONS["swivel-cannon"];
  assert.equal(weaponInventoryCargo(weapon, 2), 4);

  const inventory = weaponPhysicalState({ installed: false });
  assert.equal(inventory.occupiesCargo, true);
  assert.equal(inventory.occupiesMount, false);

  const installed = weaponPhysicalState({ installed: true });
  assert.equal(installed.occupiesCargo, false);
  assert.equal(installed.occupiesMount, true);
});

test("destroyed weapons are explicitly lost rather than silently returned to inventory", () => {
  const destroyed = weaponPhysicalState({ installed: true, destroyed: true });
  assert.equal(destroyed.id, "destroyed");
  assert.equal(destroyed.recoverable, false);
  assert.equal(destroyed.occupiesCargo, false);
  assert.equal(destroyed.occupiesMount, false);
});
