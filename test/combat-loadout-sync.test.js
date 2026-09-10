import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { createCombatantState } from "../src/combat/combatant-state.js";
import { reconcileCombatantState } from "../src/combat/combatant-loadout-sync.js";

function rumRunner(overrides = {}) {
  return createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] },
    progression: { level: 1, xp: 0, talentIds: [], arkcraftUpgrades: {} },
    ...overrides
  });
}

function reconcile(ship, current) {
  return reconcileCombatantState(ship, current, {
    derived: deriveShip(ship, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS,
    rotation: 0
  });
}

test("installed Shipwright weapons hydrate an already-created combat state", () => {
  const emptyShip = rumRunner();
  const current = createCombatantState(emptyShip, {
    derived: deriveShip(emptyShip, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS
  });
  assert.deepEqual(Object.keys(current.weapons), []);

  const installedShip = rumRunner({
    weapons: [{
      id: "light-broadside-cannon",
      instanceId: "rum-runner-port-1",
      mount: "port",
      arc: "port",
      mountIndex: 0,
      upgrades: { potency: 0, impact: 0, properties: [] }
    }]
  });

  const synced = reconcile(installedShip, current);
  assert.deepEqual(Object.keys(synced.weapons), ["rum-runner-port-1"]);
  assert.equal(synced.weapons["rum-runner-port-1"].id, "light-broadside-cannon");
  assert.equal(synced.weapons["rum-runner-port-1"].mount, "port");
  assert.equal(synced.economy.ap.max, 4);
});

test("loadout sync preserves reload runtime while refreshing authored install data", () => {
  const ship = rumRunner({
    weapons: [{
      id: "light-broadside-cannon",
      instanceId: "rum-runner-port-1",
      mount: "port",
      arc: "port",
      mountIndex: 0,
      upgrades: { potency: 0, impact: 0, properties: [] }
    }]
  });
  const base = createCombatantState(ship, {
    derived: deriveShip(ship, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS
  });
  const current = {
    ...base,
    weapons: {
      ...base.weapons,
      "rum-runner-port-1": {
        ...base.weapons["rum-runner-port-1"],
        readyRound: 6,
        lastFiredRound: 3
      }
    }
  };

  const upgradedShip = rumRunner({
    weapons: [{
      id: "light-broadside-cannon",
      instanceId: "rum-runner-port-1",
      mount: "port",
      arc: "port",
      mountIndex: 0,
      upgrades: { potency: 1, impact: 0, properties: [] }
    }]
  });
  const synced = reconcile(upgradedShip, current);
  const weapon = synced.weapons["rum-runner-port-1"];
  assert.equal(weapon.readyRound, 6);
  assert.equal(weapon.lastFiredRound, 3);
  assert.equal(weapon.upgrades.potency, 1);
});

test("stale combat states repair zero AP and remove weapons no longer installed", () => {
  const shipWithWeapon = rumRunner({
    weapons: [{
      id: "light-broadside-cannon",
      instanceId: "rum-runner-port-1",
      mount: "port",
      arc: "port",
      mountIndex: 0
    }]
  });
  const old = createCombatantState(shipWithWeapon, {
    derived: deriveShip(shipWithWeapon, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS
  });
  const stale = {
    ...old,
    version: 1,
    economy: { ap: { value: 0, max: 0 }, rp: { value: 0, max: 0 } }
  };

  const synced = reconcile(rumRunner(), stale);
  assert.equal(synced.economy.ap.value, 4);
  assert.equal(synced.economy.ap.max, 4);
  assert.deepEqual(Object.keys(synced.weapons), []);
});

test("combat state refuses to invent mobility when authoritative derived stats are missing", () => {
  assert.throws(
    () => createCombatantState(rumRunner(), { catalogs: SHIP_CATALOGS }),
    /requires authoritative derived ship stats/
  );
});

test("current-schema reconciliation refreshes build facts while preserving transient combat progress", () => {
  const ship = rumRunner();
  const baseDerived = deriveShip(ship, SHIP_CATALOGS);
  const base = createCombatantState(ship, { derived: baseDerived, catalogs: SHIP_CATALOGS });
  const current = {
    ...base,
    turnKey: "round:3",
    economy: {
      ap: { value: 2, max: 4 },
      rp: { value: 0, max: 1 }
    },
    mobility: {
      ...base.mobility,
      heading: 60,
      movement: { purchases: 1, allowance: base.mobility.speed, used: 1 },
      maneuver: { purchases: 1, allowance: base.mobility.maneuverability, used: 1 }
    },
    strain: { value: 2, max: base.strain.max },
    log: [{ round: 2, kind: "test-history" }]
  };
  const upgradedDerived = {
    ...baseDerived,
    stats: {
      ...baseDerived.stats,
      actionBonus: 2,
      reactionBonus: 1,
      combatSpeed: 7,
      maneuverability: 5,
      strainCapacity: 9
    }
  };

  const synced = reconcileCombatantState(ship, current, {
    derived: upgradedDerived,
    catalogs: SHIP_CATALOGS,
    rotation: 0
  });

  assert.deepEqual(synced.economy.ap, { value: 4, max: 6 });
  assert.deepEqual(synced.economy.rp, { value: 1, max: 2 });
  assert.equal(synced.mobility.speed, 7);
  assert.equal(synced.mobility.maneuverability, 5);
  assert.equal(synced.mobility.heading, 60);
  assert.deepEqual(synced.mobility.movement, current.mobility.movement);
  assert.deepEqual(synced.mobility.maneuver, current.mobility.maneuver);
  assert.deepEqual(synced.strain, { value: 2, max: 9 });
  assert.deepEqual(synced.log, current.log);
});

test("combat weapon hydration prefers explicit mount over legacy arc", () => {
  const ship = rumRunner({
    weapons: [{
      id: "light-broadside-cannon",
      instanceId: "mount-authority",
      mount: "starboard",
      arc: "port",
      mountIndex: 0
    }]
  });
  const state = createCombatantState(ship, {
    derived: deriveShip(ship, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS
  });
  assert.equal(state.weapons["mount-authority"].mount, "starboard");
});
