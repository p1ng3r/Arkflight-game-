import test from "node:test";
import assert from "node:assert/strict";
import { executeFoundryShipAbility } from "../src/foundry/ship-ability-runtime.js";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { normalizeAbilityLoadouts } from "../src/ship/ability-loadouts.js";

function world(dice) {
  const build = deriveBuild("rum-stock-l5");
  const ship = structuredClone(build.ship);
  ship.resources.morale.value = 40;
  ship.resources.lifeveil.value = 40;
  ship.resources.supplies.value = 10;
  ship.abilities = normalizeAbilityLoadouts(ship);
  const messages = [], writes = [], usedDice = [];
  const actor = { name: "Test ship", flags: { "arkflight-game": { ship } }, async update(patch, options) {
    this.flags["arkflight-game"].ship = patch["flags.arkflight-game.ship"];
    writes.push({ document: "actor", options });
  } };
  const combatant = { id: "ship", name: "Test ship", actor, flags: { "arkflight-game": { combatState: structuredClone(build.combatState) } }, async update(patch) {
    this.flags["arkflight-game"].combatState = patch["flags.arkflight-game.combatState"];
    writes.push({ document: "combatant" });
  } };
  const base = { state: c => c.flags["arkflight-game"].combatState, targets: () => [] };
  globalThis.game = { combat: { round: 1 }, arkflight: {} };
  globalThis.Hooks = { callAll() {} };
  globalThis.foundry = { utils: { escapeHTML: s => String(s) } };
  globalThis.ChatMessage = { getSpeaker: () => ({ actor: "ship" }) };
  globalThis.Roll = class {
    constructor(formula, data = {}) { this.formula = formula; this.data = data; }
    async evaluate() {
      const results = dice.shift();
      assert.ok(results, `unexpected extra roll: ${this.formula}`);
      usedDice.push(this.formula);
      const total = results.reduce((a, b) => a + b, 0);
      this.dice = [{ total, results: results.map(result => ({ result, active: true })) }];
      this.total = total + Number(this.data.bonus ?? 0);
      return this;
    }
    async toMessage(message) { messages.push(message); }
  };
  return { base, combatant, actor, writes, messages, usedDice };
}

test("Foundry ability runtime separates outcome and strength rolls and persists both documents", async () => {
  const w = world([[20], [7]]);
  const result = await executeFoundryShipAbility(w.base, w.combatant, "captain-rally-crew");
  assert.equal(result.degree, 2);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.morale.value, 54);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.supplies.value, 9);
  assert.equal(w.base.state(w.combatant).economy.ap.value, 3);
  assert.deepEqual(w.usedDice, ["1d20 + @bonus", "1d8"]);
  assert.equal(w.messages.length, 2);
  assert.match(w.messages[0].flavor, /Critical Success/);
  assert.deepEqual(w.writes.map(x => x.document), ["actor", "combatant"]);
  assert.equal(w.writes[0].options.arkflightAbilityTransaction, true);
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "captain-rally-crew"), /once-per-round/);
  assert.equal(w.messages.length, 2);
});

test("invalid ability choices do not roll dice, pay AP or write documents", async () => {
  const w = world([]);
  const before = structuredClone(w.base.state(w.combatant));
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "captain-acquire-target", { selection: "missing" }));
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "captain-coordinate-assault", { selection: "missing" }), /legal target/);
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "engineer-emergency-repair", { selection: "arkengine" }), /legal repair system/);
  await assert.rejects(() => executeFoundryShipAbility(w.base, w.combatant, "battlewatch-ready-broadside", { selection: "fore" }), /legal facing/);
  assert.deepEqual(w.base.state(w.combatant), before);
  assert.equal(w.writes.length, 0);
  assert.equal(w.usedDice.length, 0);
});

test("shared Emergency Repair rolls its two d10s only when restoring Lifeveil", async () => {
  const w = world([[10], [3, 8]]);
  const result = await executeFoundryShipAbility(w.base, w.combatant, "engineer-emergency-repair", { selection: "lifeveil" });
  assert.equal(result.degree, 1);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.lifeveil.value, 56);
  assert.equal(w.actor.flags["arkflight-game"].ship.resources.supplies.value, 8);
  assert.deepEqual(w.usedDice, ["1d20 + @bonus", "2d10"]);
  const condition = world([[10]]);
  await executeFoundryShipAbility(condition.base, condition.combatant, "engineer-emergency-repair", { selection: "hull" });
  assert.deepEqual(condition.usedDice, ["1d20 + @bonus"]);
});
