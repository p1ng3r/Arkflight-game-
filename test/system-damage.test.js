import test from "node:test";
import assert from "node:assert/strict";
import { createShip, normalizeShip } from "../src/ship/ship-schema.js";
import { deriveShip, syncResourceMaxima } from "../src/ship/derive-ship.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { SYSTEM_KEYS, activeSystemFaults, systemIntegrity, systemSaveEligible, systemSaveProfile, resolveSystemSave, repairSystemFault, systemOperationBlock, damageSystemIntegrity } from "../src/ship/system-damage.js";
import { SYSTEM_FAULT_TABLES, SYSTEM_FAULTS, faultDescription } from "../src/content/system-faults.js";
import { abilityRollModifiers, resolveShipAbility, abilityAvailability } from "../src/combat/ship-ability-rules.js";
import { createCombatantState } from "../src/combat/combatant-state.js";
import { shipDamageDefensePlan } from "../src/combat/ability-effect-plans.js";
import { applyShipEffects } from "../src/ship/ship-effects.js";
import { generateEnemyShipPreview } from "../src/generator/enemy-ship-generator.js";
import { validRepairTarget } from "../src/ship/repair-rules.js";

function vessel() {
  return createShip({ hull: { chassisId: "brigantine" }, arkengine: { chassisId: "tidewake-arkengine" }, progression: { level: 8 }, resources: { hull: { value: 94, max: 200 }, supplies: { value: 10, max: 100 } } });
}
const profile = system => ({ system, modifier: 6, dc: 16 });
const fail = (ship, system = "hull", roll = 4, roundKey = "combat:mock:1") => resolveSystemSave(ship, system, { roundKey, die: 8, faultRolls: [roll], profile: profile(system) });

test("all five systems use exact six-band boundaries, including fractional Hull", () => {
  for (const system of SYSTEM_KEYS) for (const [value, band] of [[100,0],[99.99,1],[75,1],[74.99,2],[50,2],[49.99,3],[25,3],[24.99,4],[10,4],[9.99,5],[0,5]]) {
    const ship = { resources: { [system]: { value, max: 100 } } };
    assert.equal(systemIntegrity(ship, system).band, band, `${system}:${value}`);
  }
  assert.equal(systemIntegrity({ resources: { hull: { value: 19, max: 200 } } }, "hull").label, "Wrecked");
  const ship = normalizeShip({ resources: { drive: { value: 9.9, max: 100 } } });
  assert.equal(ship.resources.drive.value, 9.9);
});

test("migration adds intact new systems without healing existing resources or losing faults", () => {
  const ship = vessel();
  delete ship.resources.drive; delete ship.resources.arkengine;
  ship.systemDamage.faults = ["hull:jolted-gun-mounts"];
  const migrated = normalizeShip(ship);
  assert.equal(migrated.resources.drive.value, 100);
  assert.equal(migrated.resources.arkengine.value, 100);
  assert.equal(migrated.resources.hull.value, 94);
  assert.equal(migrated.resources.morale.value, 60);
  assert.equal(activeSystemFaults(migrated).length, 1);
  migrated.resources.drive.value = 35;
  assert.equal(syncResourceMaxima(migrated, deriveShip(migrated, SHIP_CATALOGS)).resources.drive.value, 35);
});

test("damage at 50% saves once per affected system per round; no damage means no save", () => {
  const before = vessel(); before.resources.hull.value = 110;
  const after = damageSystemIntegrity(before, "hull", 10);
  assert.equal(systemSaveEligible(before, after, "hull", "r1"), true);
  assert.equal(systemSaveEligible(after, after, "hull", "r1"), false);
  const saved = fail(after, "hull", 4, "r1").ship;
  const hit = damageSystemIntegrity(saved, "hull", 10);
  assert.equal(systemSaveEligible(saved, hit, "hull", "r1"), false);
  assert.equal(systemSaveEligible(saved, hit, "hull", "r2"), true);
  assert.equal(systemSaveEligible(hit, hit, "hull", "r2"), false);
  const healthier = structuredClone(after); healthier.resources.hull.value = 101;
  assert.equal(systemSaveEligible(before, healthier, "hull", "r1"), false);
  const damagedDrive = damageSystemIntegrity(saved, "drive", 55);
  assert.equal(systemSaveEligible(saved, damagedDrive, "drive", "r1"), true);
});

test("the mock's d12 four adds Jolted Gun Mounts, duplicates reroll, and saturated tables stop adding", () => {
  const ship = vessel(), result = fail(ship);
  assert.equal(result.fault.name, "Jolted Gun Mounts");
  assert.equal(result.total, 14);
  assert.equal(ship.systemDamage.faults.length, 0);
  const rerolled = resolveSystemSave(result.ship, "hull", { roundKey: "r2", die: 1, faultRolls: [4,4,6], profile: profile("hull") });
  assert.equal(rerolled.fault.roll, 6);
  assert.equal(activeSystemFaults(rerolled.ship).length, 2);
  assert.throws(() => fail(result.ship, "hull", 4, "r2"), /reroll duplicates/);
  const saturated = vessel(); saturated.systemDamage.faults = SYSTEM_FAULT_TABLES.hull.map(f => f.id);
  assert.equal(fail(saturated).fault, null);
  assert.equal(fail(saturated).ship.systemDamage.faults.length, 12);
  assert.equal(resolveSystemSave(result.ship, "hull", { roundKey: "combat:mock:1", die: 1, profile: profile("hull") }).skipped, true);
});

test("natural 20 holds even with severe penalties; natural 1 fails even with huge bonuses", () => {
  const ship = vessel();
  assert.equal(resolveSystemSave(ship, "hull", { roundKey: "r", die: 20, profile: { system: "hull", modifier: -40, dc: 20 } }).success, true);
  assert.equal(resolveSystemSave(ship, "hull", { roundKey: "r", die: 1, faultRolls: [1], profile: { system: "hull", modifier: 40, dc: 10 } }).success, false);
});

test("Hull, Arkengine, level and canonical upgrade effects contribute to ship-owned saves", () => {
  const ship = vessel(), base = systemSaveProfile(ship, "arkengine", { catalogs: SHIP_CATALOGS, derived: deriveShip(ship, SHIP_CATALOGS) });
  assert.equal(base.bonus, 2); assert.equal(base.dc, 16);
  assert.ok(base.components.hull > 0); assert.ok(base.components.arkengine > 1);
  const catalogs = { ...SHIP_CATALOGS, shipMods: { ...SHIP_CATALOGS.shipMods, "save-test": { id: "save-test", effects: [{ target: "systemSaveBonuses.arkengine", mode: "add", value: 2 }] } } };
  ship.shipMods.push("save-test");
  assert.equal(systemSaveProfile(ship, "arkengine", { catalogs, derived: deriveShip(ship, catalogs) }).modifier, base.modifier + 2);
  ship.systemDamage.faults.push("arkengine:cracked-conduit");
  assert.equal(systemSaveProfile(ship, "arkengine", { catalogs, derived: deriveShip(ship, catalogs) }).modifier, base.modifier + 1);
});

test("all 60 named faults have a working derived stat, reload, station-check or save effect", () => {
  assert.equal(Object.keys(SYSTEM_FAULTS).length, 60);
  for (const system of SYSTEM_KEYS) assert.deepEqual(SYSTEM_FAULT_TABLES[system].map(f => f.roll), Array.from({ length: 12 }, (_, i) => i + 1));
  const ship = vessel(), baseline = deriveShip(ship, SHIP_CATALOGS).stats;
  for (const f of Object.values(SYSTEM_FAULTS)) {
    const damaged = structuredClone(ship); damaged.systemDamage.faults = [f.id];
    const stats = deriveShip(damaged, SHIP_CATALOGS).stats;
    assert.ok(faultDescription(f).length > 0);
    for (const [key, value] of Object.entries(f.effects)) {
      if (key.endsWith("Save")) {
        const system = key.slice(0, -4);
        const base = systemSaveProfile(ship, system, { catalogs: SHIP_CATALOGS });
        assert.equal(systemSaveProfile(damaged, system, { catalogs: SHIP_CATALOGS }).modifier, base.modifier + value, f.id);
      } else if (["captain", "engineer", "navigator", "battlewatch", "veilwarden"].includes(key)) {
        assert.equal(stats.stationBonuses[key], baseline.stationBonuses[key] + value, f.id);
        assert.equal(abilityRollModifiers({}, key, 8, { ship: damaged }).modifier, 2 + value + (f.effects.allStationBonus ?? 0), f.id);
      } else assert.equal(stats[key], Number(baseline[key] ?? 0) + value, `${f.id}:${key}`);
    }
  }
});

test("Patch mounts costs one AP/two Supplies, consumes Signature and clears only the chosen fault", () => {
  const ship = fail(vessel()).ship;
  ship.systemDamage.faults.push("drive:torn-sails");
  const derived = deriveShip(ship, SHIP_CATALOGS), state = createCombatantState(ship, { derived, catalogs: SHIP_CATALOGS });
  const result = resolveShipAbility({ ship, state, id: "engineer-emergency-repair", degree: 1, selection: "fault:hull:jolted-gun-mounts", round: 1 });
  assert.equal(result.state.economy.ap.value, state.economy.ap.value - 1);
  assert.equal(result.ship.resources.supplies.value, 8);
  assert.equal(result.ship.resources.hull.value, 94);
  assert.deepEqual(result.ship.systemDamage.faults, ["drive:torn-sails"]);
  assert.equal(deriveShip(result.ship, SHIP_CATALOGS).stats.weaponAttackBonus, derived.stats.weaponAttackBonus + 1);
  assert.equal(abilityAvailability(result.ship, result.state, "engineer-emergency-repair", 2).reason, "once-per-battle");
  assert.throws(() => repairSystemFault(result.ship, "hull:jolted-gun-mounts"), /active ship fault/);
});

test("explicit effect damage is distinguished from Strain, recovery and a negative modifier", () => {
  const ship = vessel();
  const result = applyShipEffects(ship, [{ kind: "damage-system", system: "drive", value: 55 }, { kind: "damage-lifeveil", value: 60 }, { kind: "change-morale", value: -20 }, { kind: "add-condition", condition: { id: "test", system: "hull" } }]);
  assert.deepEqual(result.damageSystems, ["drive", "lifeveil", "morale"]);
  assert.equal(result.ship.resources.drive.value, 45);
  assert.deepEqual(applyShipEffects(ship, [{ kind: "degrade-system", system: "lifeveil" }, { kind: "change-morale", value: 5 }]).damageSystems, []);
});

test("bottom bands disable normal operations and keep emergency recovery available", () => {
  const ship = vessel(); ship.resources.hull.value = 19;
  assert.equal(systemOperationBlock(ship, "fire"), "hull-wrecked");
  assert.equal(systemOperationBlock(ship, "move"), "hull-wrecked");
  assert.equal(systemOperationBlock(ship, "engineer-emergency-repair"), null);
  ship.resources.hull.value = 20; ship.resources.drive.value = 9;
  assert.equal(systemOperationBlock(ship, "move"), "drive-disabled");
  assert.equal(systemOperationBlock(ship, "fire"), null);
  ship.resources.drive.value = 10; ship.resources.arkengine.value = 9;
  assert.equal(systemOperationBlock(ship, "move"), "arkengine-disabled");
  ship.resources.morale.value = 9;
  assert.equal(systemOperationBlock(ship, { id: "captain-issue-order", station: "captain" }), "morale-broken");
  assert.equal(systemOperationBlock(ship, "captain-rally-crew"), null);
  const ward = { stationRuntime: { effects: [{ id: "ward", actionId: "veilwarden-reinforce-lifeveil", wardAllDamage: true, mitigation: 9 }] } };
  ship.resources.lifeveil.value = 9;
  assert.equal(shipDamageDefensePlan(ward, 8, { weapon: { data: {} } }, { flags: { "arkflight-game": { ship } } }).wardMitigation, 0);
  ship.resources.lifeveil.value = 10;
  assert.equal(shipDamageDefensePlan(ward, 8, { weapon: { data: {} } }, { flags: { "arkflight-game": { ship } } }).wardMitigation, 9);
});

test("fresh normal generation is Ready across levels and qualities; morale retains authored quality", () => {
  for (const difficulty of ["poor", "standard", "elite"]) for (let level = 1; level <= 20; level++) {
    const { ship } = generateEnemyShipPreview({ level, archetypeId: "raider", difficulty, seed: `ready-${difficulty}-${level}` });
    assert.ok(ship.resources.hull.max > 0);
    assert.equal(ship.resources.hull.value, ship.resources.hull.max);
    for (const key of ["drive", "arkengine", "lifeveil"]) assert.equal(ship.resources[key].value, 100);
    assert.equal(ship.resources.strain.value, 0);
    assert.equal(activeSystemFaults(ship).length, 0);
    assert.equal(ship.resources.morale.value, difficulty === "poor" ? 40 : difficulty === "elite" ? 100 : 60);
  }
});

test("Shipwright recognizes integrity repairs and each named system fault", () => {
  for (const key of ["hull", "drive", "arkengine", "lifeveil"]) assert.equal(validRepairTarget("resource", key), true);
  for (const id of Object.keys(SYSTEM_FAULTS)) assert.equal(validRepairTarget("fault", id), true);
  assert.equal(validRepairTarget("fault", "made-up"), false);
});
