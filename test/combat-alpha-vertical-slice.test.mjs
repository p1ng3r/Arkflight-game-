import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import {
  applyHardnessToDamage,
  beginCombatantTurn,
  combatVictoryState,
  fireWeapon,
  purchaseManeuver,
  purchaseMovement,
  recordFacingChange,
  recordMovement,
  shipCombatOutcome,
  weaponReloadRemaining,
  weaponTargetingSolution,
  reloadWeapon
} from "../src/combat/index.js";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { applyShipSystemDegradation, shipConditionProfile } from "../src/ship/ship-conditions.js";

function installedWeapon(state, mount) {
  const row = Object.values(state.weapons ?? {}).find((weapon) => weapon.mount === mount);
  assert.ok(row, `expected an installed ${mount} weapon`);
  return row;
}

function commissionedShip(build) {
  const ship = structuredClone(build.ship);
  ship.resources.hull.value = ship.resources.hull.max;
  ship.resources.lifeveil.value = ship.resources.lifeveil.max;
  return ship;
}

test("Combat Alpha vertical slice uses real builds from movement through victory", () => {
  const rum = deriveBuild("rum-stock-l5");
  const iron = deriveBuild("iron-stock-l5");
  assert.equal(rum.validation.ok, true);
  assert.equal(iron.validation.ok, true);
  assert.equal(rum.profile.chassis, "brigantine");
  assert.equal(iron.profile.chassis, "frigate");
  const rumShip = commissionedShip(rum);
  const ironShip = commissionedShip(iron);
  assert.equal(shipCombatOutcome(rumShip).status, "active");
  assert.equal(shipCombatOutcome(ironShip).status, "active");

  // Start a real combat turn, buy movement, move, then buy a maneuver and turn.
  let state = beginCombatantTurn(rum.combatState, 1);
  const apAtStart = state.economy.ap.value;
  state = purchaseMovement(state);
  state = recordMovement(state, 1);
  assert.equal(state.mobility.movement.used, 1);
  state = purchaseManeuver(state);
  state = recordFacingChange(state, 1, 60);
  assert.equal(state.mobility.heading, 60);
  assert.equal(state.economy.ap.value, apAtStart - 2);

  // Use the actual installed port gun and its authored range/arc.
  const portGun = installedWeapon(state, "port");
  const weapon = SHIP_CATALOGS.weapons[portGun.id];
  assert.ok(weapon);
  const range = weapon.data.combat.rangeHexes;
  const distance = Math.max(Number(range.min ?? 0), Number(range.optimalMin ?? 0));
  const legal = weaponTargetingSolution({
    weapon,
    weaponState: portGun,
    heading: state.mobility.heading,
    distanceHexes: distance,
    bearing: 330
  });
  const illegalArc = weaponTargetingSolution({
    weapon,
    weaponState: portGun,
    heading: state.mobility.heading,
    distanceHexes: distance,
    bearing: 150
  });
  assert.equal(legal.legal, true);
  assert.equal(illegalArc.range.legal, true);
  assert.equal(illegalArc.arc.legal, false);
  assert.equal(illegalArc.legal, false);

  // Fire while the turn is still in progress. The same gun cannot fire again
  // until its reload state is satisfied.
  const beforeFireAP = state.economy.ap.value;
  state = fireWeapon(state, portGun.key, 1);
  assert.equal(portGun.fireAP, 1);
  assert.equal(state.economy.ap.value, beforeFireAP - 1);
  assert.ok(weaponReloadRemaining(state.weapons[portGun.key], 1) > 0);
  assert.throws(() => fireWeapon(state, portGun.key, 1), /still reloading/);

  // A later turn refreshes AP but keeps reload history; the common Reload action advances it.
  state = beginCombatantTurn(state, 2);
  const reloadBeforeWork = weaponReloadRemaining(state.weapons[portGun.key], 2);
  if (reloadBeforeWork > 0) {
    state = reloadWeapon(state, portGun.key, 2);
    assert.ok(weaponReloadRemaining(state.weapons[portGun.key], 2) < reloadBeforeWork);
  }

  // Resolve real Hardness against incoming damage. Ship Conditions are a
  // separate persistent layer: even an Unresponsive Drive does not
  // automatically remove a vessel from combat.
  const incoming = iron.derived.stats.hardness + 7;
  const hardened = applyHardnessToDamage(incoming, iron.derived.stats.hardness);
  assert.equal(hardened.hullDamage, 7);

  let targetShip = structuredClone(ironShip);
  targetShip.resources.hull.value = Math.max(1, targetShip.resources.hull.value - hardened.hullDamage);
  for (let i = 0; i < 3; i += 1) {
    targetShip = applyShipSystemDegradation(targetShip, "drive").ship;
  }
  assert.equal(shipConditionProfile(targetShip, "drive").id, "unresponsive");
  assert.equal(shipCombatOutcome(targetShip).status, "active");

  const stillContested = combatVictoryState([
    { id: "rum-runner", ship: rumShip },
    { id: "iron-spear", ship: targetShip }
  ]);
  assert.equal(stillContested.ended, false);

  const wreckedIron = structuredClone(targetShip);
  wreckedIron.resources.hull.value = 0;
  assert.equal(shipCombatOutcome(wreckedIron).status, "wrecked");

  const victory = combatVictoryState([
    { id: "rum-runner", ship: rumShip },
    { id: "iron-spear", ship: wreckedIron }
  ]);
  assert.equal(victory.ended, true);
  assert.equal(victory.winnerId, "rum-runner");
});