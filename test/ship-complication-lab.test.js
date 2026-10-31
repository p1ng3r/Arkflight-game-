import test from "node:test";
import assert from "node:assert/strict";

const hooks = new Map();
globalThis.Hooks = { once(name, fn) { const entries = hooks.get(name) ?? []; entries.push(fn); hooks.set(name, entries); } };
const { createComplicationLabAPI } = await import("../src/foundry/ship-complication-lab.js");
function fixture() {
  let stored = null, serial = 0, writes = 0, gm = true, fail = false;
  const deps = { load: () => structuredClone(stored), save: async value => { if (fail) { fail = false; throw Error("storage rejected"); } stored = structuredClone(value); writes++; }, isGM: () => gm, randomID: () => `id${++serial}`, seed: () => 123 };
  return { api: createComplicationLabAPI(deps), reopen: () => createComplicationLabAPI(deps), setGM: value => { gm = value; }, failSave: () => { fail = true; }, writes: () => writes };
}
function command(api, type, extra = {}) { const state = api.state(); return api.request({ type, encounterId: state?.id, revision: state?.revision, ...extra }); }

test("lab persists a separate sample encounter, survives reopen and rejects stale/double commands", async () => {
  const { api, reopen } = fixture();
  await api.request({ type: "reset" });
  const before = api.state(), input = { type: "resolve", scenario: "captain", degree: -1, encounterId: before.id, revision: before.revision };
  const result = await Promise.allSettled([api.request(input), api.request(input)]);
  assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(api.state().history.length, 1);
  assert.deepEqual(reopen().state(), api.state());
  assert.equal(api.state().ships[0].name, "Sample Brigantine");
});
test("ordinary failures do not write storage, spend AP, draw, or require a DM consequence", async () => {
  const f = fixture(); await f.api.request({ type: "reset" });
  const before = f.api.state(), writes = f.writes();
  const result = await command(f.api, "resolve", { scenario: "captain", degree: 0 });
  assert.equal(result.receipt.drawn, false); assert.deepEqual(f.api.state(), before); assert.equal(f.writes(), writes);
});
test("save failure leaves the same seeded draw pending and the command queue recovers", async () => {
  const f = fixture(); await f.api.request({ type: "reset" });
  const before = f.api.state(); f.failSave();
  await assert.rejects(() => command(f.api, "resolve", { scenario: "impact", degree: -1 }), /storage rejected/);
  assert.deepEqual(f.api.state(), before);
  const result = await command(f.api, "resolve", { scenario: "impact", degree: -1 });
  assert.equal(result.receipt.cardId, before.drawPile.at(-1));
});
test("lab authorization rejects non-GMs before any persistence", async () => {
  const f = fixture(); f.setGM(false);
  assert.throws(() => f.api.state(), /Only the GM/);
  await assert.rejects(() => f.api.request({ type: "reset" }), /Only the GM/);
  assert.equal(f.writes(), 0);
});
test("Foundry registration uses a client-local setting and does not register live campaign hooks", () => {
  let registered;
  globalThis.game = { settings: { register(module, key, options) { registered = { module, key, ...options }; } } };
  for (const fn of hooks.get("init") ?? []) fn();
  assert.equal(registered.scope, "client"); assert.equal(registered.key, "shipComplicationLab");
  assert.deepEqual([...hooks.keys()].sort(), ["init", "ready"]);
});
