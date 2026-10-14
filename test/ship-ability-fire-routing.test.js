import test from "node:test";
import assert from "node:assert/strict";

test("the Foundry fire wrappers preserve the automatic-resolution flag without queuing twice", async () => {
  const ready = [];
  globalThis.Hooks = { once(event, callback) { if (event === "ready") ready.push(callback); }, on() {} };
  const actor = { flags: { "arkflight-game": { ship: { progression: { level: 1 } } } }, testUserPermission: () => false };
  const attacker = { id: "attacker", actor }, target = { id: "target", actor };
  let requests = 0;
  const base = {
    findCombatant: ref => ref === "target" || ref === target ? target : attacker,
    state: () => ({}),
    stationAction(id, options, reference) {
      requests++;
      if (requests > 1) throw new Error("Fire was queued twice; resolvedByStation was lost.");
      assert.equal(id, "battlewatch-fire-weapon");
      return game.arkflight.combat.fireAtTarget(options.weaponKey, options.targetId, reference, { resolvedByStation: true });
    }
  };
  globalThis.game = { user: { id: "player", isGM: false }, users: { get: () => null }, actors: { contents: [] }, arkflight: { combat: base }, socket: { on() {} }, combat: { combatant: attacker } };
  await import("../src/foundry/native-station-combat-effects.js");
  await import("../src/foundry/combat-flow-usability.js");
  for (const callback of ready) callback();
  await assert.rejects(() => game.arkflight.combat.fireAtTarget("weapon", "target", attacker), /own the firing ship/);
  assert.equal(requests, 1);
});
