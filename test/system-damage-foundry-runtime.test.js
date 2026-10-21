import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { createCombatantState } from "../src/combat/combatant-state.js";
import { resolveSystemDamageSaves, applyActorSystemDamage } from "../src/foundry/system-damage-runtime.js";
import { damageSystemIntegrity, activeSystemFaults } from "../src/ship/system-damage.js";
import { executeFoundryShipAbility } from "../src/foundry/ship-ability-runtime.js";

function setPath(object, path, value) {
  const keys = path.split("."), last = keys.pop();
  for (const key of keys) object = object[key] ??= {};
  if (last.startsWith("-=")) delete object[last.slice(2)]; else object[last] = structuredClone(value);
}
function world(dice) {
  const rolls = [], messages = [], writes = [], hooks = [];
  const ship = createShip({ identity: { name: "Mock brigantine" }, hull: { chassisId: "brigantine" }, arkengine: { chassisId: "tidewake-arkengine" }, progression: { level: 8 }, resources: { hull: { value: 110, max: 200 }, supplies: { value: 10, max: 100 }, lifeveil: { value: 82, max: 100 }, morale: { value: 76, max: 100 } } });
  const actor = { id: "ship-actor", uuid: "Actor.ship-actor", name: "Mock brigantine", flags: { "arkflight-game": { ship } }, async update(patch) { for (const [key, value] of Object.entries(patch)) setPath(this, key, value); writes.push({ document: "actor", patch }); } };
  const state = createCombatantState(ship, { derived: deriveShip(ship, SHIP_CATALOGS), catalogs: SHIP_CATALOGS });
  const combatant = { id: "ship", documentName: "Combatant", name: actor.name, actor, flags: { "arkflight-game": { combatState: state } }, async update(patch) { for (const [key, value] of Object.entries(patch)) setPath(this, key, value); writes.push({ document: "combatant", patch }); } };
  const combatants = [combatant]; combatants.get = id => combatants.find(c => c.id === id);
  const base = { state: c => c.flags["arkflight-game"].combatState, findCombatant: a => a === actor ? combatant : null, targets: () => [] };
  globalThis.game = { user: { id: "gm", isGM: true }, combat: { id: "test-combat", round: 1, combatants }, arkflight: { combat: base } };
  globalThis.Hooks = { once() {}, on() {}, callAll: (...args) => hooks.push(args) };
  globalThis.ui = { notifications: { info() {} } };
  globalThis.foundry = { utils: { escapeHTML: value => String(value) } };
  globalThis.ChatMessage = { getSpeaker: () => ({ actor: actor.id }) };
  globalThis.Roll = class {
    constructor(formula, data = {}) { this.formula = formula; this.data = data; }
    async evaluate() {
      const result = dice.shift(); assert.ok(result !== undefined, `Unexpected roll ${this.formula}`);
      rolls.push(this.formula);
      this.dice = [{ total: result, results: [{ result, active: true }] }];
      this.total = result + Number(this.data.bonus ?? this.data.attackBonus ?? 0);
      return this;
    }
    async toMessage(message) { messages.push(message); }
  };
  return { actor, combatant, base, rolls, messages, writes, hooks };
}

test("Foundry automatically rolls the ship save and d12, rerolls duplicates, and persists once-per-round", async () => {
  const w = world([1,4,1,4,6]);
  const first = await applyActorSystemDamage(w.actor, "hull", 16);
  assert.equal(first.ship.resources.hull.value, 94);
  assert.equal(activeSystemFaults(first.ship)[0].name, "Jolted Gun Mounts");
  assert.deepEqual(w.rolls, ["1d20 + @bonus", "1d12"]);
  assert.equal(w.messages.length, 2);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.morale.value, 76);
  await applyActorSystemDamage(w.actor, "hull", 1);
  assert.equal(w.rolls.length, 2);
  game.combat.round = 2;
  await applyActorSystemDamage(w.actor, "hull", 1);
  assert.equal(activeSystemFaults(w.actor.flags["arkflight-game"].ship).length, 2);
  assert.equal(w.rolls.length, 5);
});

test("simultaneous GM damage entries serialize and do not lose damage or duplicate round saves", async () => {
  const w = world([20]);
  await Promise.all([applyActorSystemDamage(w.actor, "drive", 55), applyActorSystemDamage(w.actor, "drive", 5)]);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.drive.value, 40);
  assert.equal(w.rolls.length, 1);
});

test("cost-only changes and unchanged rounds never request a roll", async () => {
  const w = world([]), before = w.actor.flags["arkflight-game"].ship;
  const after = damageSystemIntegrity(before, "lifeveil", 40);
  const result = await resolveSystemDamageSaves(before, after);
  assert.equal(result.reports.length, 0);
  assert.equal(result.ship.resources.lifeveil.value, 42);
  assert.deepEqual(w.rolls, []);
  await assert.rejects(() => applyActorSystemDamage(w.actor, "hull", -1), /positive finite/);
  assert.equal(w.writes.length, 0);
});

test("Hull and Lifeveil damage in one round resolve independently without cascading resource losses", async () => {
  const w = world([1,4,1,3]), before = w.actor.flags["arkflight-game"].ship;
  const after = damageSystemIntegrity(damageSystemIntegrity(before, "hull", 16), "lifeveil", 40);
  const result = await resolveSystemDamageSaves(before, after, { systems: ["hull", "lifeveil"] });
  assert.equal(result.reports.length, 2);
  assert.equal(activeSystemFaults(result.ship).length, 2);
  assert.equal(result.ship.resources.hull.value, 94);
  assert.equal(result.ship.resources.lifeveil.value, 42);
  assert.equal(result.ship.resources.morale.value, 76);
});

test("Foundry Patch mounts rolls activation once and restores weapon attacks without healing Hull", async () => {
  const w = world([1,4,12]);
  await applyActorSystemDamage(w.actor, "hull", 16);
  const before = deriveShip(w.actor.flags["arkflight-game"].ship, SHIP_CATALOGS).stats.weaponAttackBonus;
  const result = await executeFoundryShipAbility(w.base, w.combatant, "engineer-emergency-repair", { selection: "fault:hull:jolted-gun-mounts" });
  assert.equal(activeSystemFaults(result.ship).length, 0);
  assert.equal(result.ship.resources.hull.value, 94);
  assert.equal(result.ship.resources.supplies.value, 8);
  assert.equal(deriveShip(result.ship, SHIP_CATALOGS).stats.weaponAttackBonus, before + 1);
  assert.equal(w.rolls.length, 3);
  assert.match(w.messages.at(-1).flavor, /Cleared Jolted Gun Mounts/);
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "engineer-emergency-repair", { selection: "fault:hull:jolted-gun-mounts" }), /once-per-battle/);
});

test("chat damage application and Undo restore the fault, save mark, and combat stats together", async () => {
  const w = world([1,4]);
  const { applyShipDamageMessage, undoShipDamageMessage } = await import("../src/foundry/native-station-combat-effects.js");
  const message = { id: "shot1", flags: { "arkflight-game": { shipDamage: { combatId: "test-combat", targetId: "ship", hullDamage: 16, degree: 1 } } } };
  const bonus = deriveShip(w.actor.flags["arkflight-game"].ship, SHIP_CATALOGS).stats.weaponAttackBonus;
  await applyShipDamageMessage(message);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.hull.value, 94);
  assert.equal(activeSystemFaults(w.actor.flags["arkflight-game"].ship).length, 1);
  assert.equal(deriveShip(w.actor.flags["arkflight-game"].ship, SHIP_CATALOGS).stats.weaponAttackBonus, bonus - 1);
  await assert.rejects(() => applyShipDamageMessage(message), /already been applied/);
  await undoShipDamageMessage(message);
  const restored = w.actor.flags["arkflight-game"].ship;
  assert.equal(restored.resources.hull.value, 110);
  assert.equal(activeSystemFaults(restored).length, 0);
  assert.deepEqual(restored.systemDamage.checks, {});
  assert.equal(deriveShip(restored, SHIP_CATALOGS).stats.weaponAttackBonus, bonus);
  assert.equal(w.actor.flags["arkflight-game"].chatDamageApplications.shot1, undefined);
});

test("GM damage entry rejects players without changing resources or rolling dice", async () => {
  const w = world([]); game.user.isGM = false;
  assert.throws(() => applyActorSystemDamage(w.actor, "hull", 16), /Only the GM/);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.hull.value, 110);
  assert.deepEqual(w.rolls, []);
});

test("a real salvo damage transaction applies the same Hull save and persists its fault", async () => {
  const w = world([12,20,1,4]);
  const { fireSalvoAtTarget } = await import("../src/foundry/combat-salvo-runtime.js");
  const attackerShip = structuredClone(w.actor.flags["arkflight-game"].ship);
  attackerShip.resources.hull.value = 200;
  attackerShip.weapons = [0,1].map(index => ({ id: "deck-ballista", instanceId: `gun-${index}`, mount: "port", mountIndex: index }));
  attackerShip.crew.stations.battlewatch = "officer";
  const attackerDerived = deriveShip(attackerShip, SHIP_CATALOGS);
  const attacker = { id: "attacker", documentName: "Combatant", actor: { flags: { "arkflight-game": { ship: attackerShip } } }, flags: { "arkflight-game": { combatState: createCombatantState(attackerShip, { derived: attackerDerived, catalogs: SHIP_CATALOGS }) } }, async update(patch) { for (const [key, value] of Object.entries(patch)) setPath(this, key, value); } };
  const ac = deriveShip(w.actor.flags["arkflight-game"].ship, SHIP_CATALOGS).stats.armorClass;
  game.actors = { get: () => ({ system: { perception: { mod: ac - 11 - attackerDerived.stats.weaponAttackBonus } } }) };
  const base = { ...w.base, targetingSolution(key) { return { weapon: SHIP_CATALOGS.weapons["deck-ballista"], weaponState: attacker.flags["arkflight-game"].combatState.weapons[key], range: { legal: true, label: "Close" }, arc: { legal: true }, distanceHexes: 2 }; } };
  const result = await fireSalvoAtTarget(base, ["gun-0", "gun-1"], w.combatant, attacker);
  assert.equal(result.degree, 1);
  const ship = w.actor.flags["arkflight-game"].ship;
  assert.ok(ship.resources.hull.value <= 100);
  assert.equal(activeSystemFaults(ship)[0].name, "Jolted Gun Mounts");
  assert.equal(ship.systemDamage.checks["combat:test-combat:1"].length, 1);
  assert.equal(w.rolls.length, 4);
});
