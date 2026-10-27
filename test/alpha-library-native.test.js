import test from "node:test";
import assert from "node:assert/strict";
import { alphaWorld, installAlphaHooks } from "./helpers/alpha-world.js";
installAlphaHooks();
await import("../src/foundry/alpha-combat-api.js");
const { alphaSuggestedStep } = await import("../src/alpha/combat.js");
const M = "arkflight-game";
const command = (api, type, extra = {}) => { const s = api.state(); return api.request({ type, encounterId: s?.id, revision: s?.revision, ...extra }); };
const edit = (api, actorId, type, extra = {}) => api.request({ type, actorId, libraryRevision: api.library.view(actorId).revision, ...extra });
async function fixture() {
  const world = alphaWorld(), api = world.initialize(), s = await command(api, "start"), actorId = s.ships["alpha-0"].actorId;
  await command(api, "end"); return { world, api, actorId, actor: game.actors.get(actorId) };
}
function playerRelay(api, input) {
  return new Promise(resolve => Hooks.callAll("createChatMessage", { author: { id: "player" }, flags: { [M]: { alphaCommand: { requestId: "library-probe", command: input } } }, update: async changes => resolve(changes[`flags.${M}.alphaResult`]) }, {}, "player"));
}
test("Actor-held libraries survive new battles and launch the selected named deck without mutating permanent cards", async () => {
  const { api, actorId, actor } = await fixture();
  let view = api.library.view(actorId); assert.equal(view.initialized, true); assert.equal(view.loadouts.length, 3); assert.ok(!view.learned.includes("chainshot"));
  await edit(api, actorId, "library-grant", { cardId: "chainshot" });
  view = api.library.view(actorId); const cards = [...view.loadouts[1].cards]; cards[cards.indexOf("patch")] = "chainshot";
  await edit(api, actorId, "library-save", { loadoutId: "deck-2", name: "Rigging hunter", cards });
  await edit(api, actorId, "library-select", { loadoutId: "deck-2" });
  const stored = JSON.stringify(actor.flags[M].alphaLibrary);
  actor.flags = JSON.parse(JSON.stringify(actor.flags)); // Document serialization/reload, not a second library grant.
  let s = await command(api, "start", { useSavedShips: true });
  assert.equal(s.ships["alpha-0"].loadoutId, "deck-2"); assert.deepEqual(Object.values(s.ships["alpha-0"].instances).sort(), [...cards].sort());
  let guard = 0;
  while (!s.complete && s.round === 1 && guard++ < 90) { const step = alphaSuggestedStep(s); s = await command(api, step.command.type, step.command); }
  assert.ok(guard < 90); assert.equal(JSON.stringify(actor.flags[M].alphaLibrary), stored);
  await command(api, "end"); s = await command(api, "start", { useSavedShips: true }); assert.equal(s.ships["alpha-0"].loadoutId, "deck-2");
  assert.equal(JSON.stringify(actor.flags[M].alphaLibrary), stored);
});
test("all library mutations are locked during ship combat, boarding and pending movement; inspection remains available", async () => {
  const { world, api, actorId, actor } = await fixture();
  const s = await command(api, "start", { useSavedShips: true }), stored = structuredClone(actor.flags[M].alphaLibrary);
  for (const type of ["library-save", "library-select", "library-grant", "library-remove", "library-refit", "library-initialize"]) await assert.rejects(() => edit(api, actorId, type, { cardId: "chainshot" }), /locked/);
  const boarding = structuredClone(s); boarding.phase = "boarding"; world.values.set("alphaCombat", boarding);
  await assert.rejects(() => edit(api, actorId, "library-grant", { cardId: "chainshot" }), /boarding/);
  await command(api, "end"); world.values.set("alphaMovementJournal", { before: s, next: s });
  await assert.rejects(() => edit(api, actorId, "library-grant", { cardId: "chainshot" }), /saved movement/);
  assert.ok(api.library.view(actorId).locked); assert.deepEqual(actor.flags[M].alphaLibrary, stored);
});
test("owners see only learned catalog entries, can save/select decks, and cannot grant cards or refit through the GM relay", async () => {
  const { api, actorId, actor } = await fixture(); actor.ownership.player = 3;
  const player = game.users.get("player"), view = api.library.view(actorId, player);
  assert.ok(!view.catalog.some(c => c.id === "chainshot")); assert.ok(api.library.view(actorId).catalog.some(c => c.id === "chainshot"));
  for (const type of ["library-grant", "library-remove", "library-refit", "library-initialize"]) {
    const result = await playerRelay(api, { type, actorId, libraryRevision: view.revision, cardId: "chainshot" }); assert.equal(result.ok, false); assert.match(result.error, /Only the GM/);
  }
  let result = await playerRelay(api, { type: "library-save", actorId, libraryRevision: view.revision, loadoutId: "deck-2", name: "Crew choice", cards: view.loadouts[1].cards }); assert.equal(result.ok, true);
  result = await playerRelay(api, { type: "library-select", actorId, libraryRevision: api.library.view(actorId).revision, loadoutId: "deck-2" }); assert.equal(result.ok, true);
  assert.equal(api.library.view(actorId).activeLoadoutId, "deck-2");
  const before = structuredClone(actor.flags[M].alphaLibrary); game.user = player;
  assert.deepEqual(api.library.ships().map(s => s.id), [actorId]); assert.ok(!Object.hasOwn(api.cards, "chainshot"));
  await actor.update({ [`flags.${M}.alphaLibrary.learned`]: ["chainshot"] }); assert.deepEqual(actor.flags[M].alphaLibrary, before);
  game.user = game.users.get("gm"); actor.ownership.player = 0;
  result = await playerRelay(api, { type: "library-select", actorId, libraryRevision: before.revision, loadoutId: "deck-1" }); assert.equal(result.ok, false); assert.match(result.error, /do not own/);
  assert.throws(() => api.library.view(actorId, player), /do not own/);
});
test("card removal preserves invalid decks, hides the removed technique from players and prevents launch", async () => {
  const { api, actorId, actor } = await fixture(); actor.ownership.player = 3;
  const cards = structuredClone(api.library.view(actorId).loadouts.map(d => d.cards));
  await edit(api, actorId, "library-remove", { cardId: "patch" });
  const view = api.library.view(actorId, game.users.get("player")); assert.deepEqual(view.loadouts.map(d => d.cards), cards); assert.ok(!view.catalog.some(c => c.id === "patch")); assert.ok(view.loadouts.every(d => d.issues.length));
  const before = api.state(); await assert.rejects(() => command(api, "start", { useSavedShips: true }), /Selected loadout.*invalid/); assert.deepEqual(api.state(), before);
  await edit(api, actorId, "library-grant", { cardId: "patch" }); assert.equal(api.library.view(actorId).loadouts[0].issues.length, 0);
});
test("stale concurrent saves and storage failures cannot silently overwrite a library", async () => {
  const { world, api, actorId, actor } = await fixture(), view = api.library.view(actorId);
  const input = { type: "library-save", actorId, libraryRevision: view.revision, loadoutId: "deck-1", name: "Saved once", cards: view.loadouts[0].cards };
  const results = await Promise.allSettled([api.request(input), api.request(input)]); assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(api.library.view(actorId).revision, view.revision + 1);
  const stored = structuredClone(actor.flags[M].alphaLibrary); world.faults.failActor = true;
  await assert.rejects(() => edit(api, actorId, "library-grant", { cardId: "chainshot" }), /Actor storage rejected/); assert.deepEqual(actor.flags[M].alphaLibrary, stored);
  await edit(api, actorId, "library-grant", { cardId: "chainshot" }); assert.ok(api.library.view(actorId).learned.includes("chainshot"));
});
test("adopting an older test ship preserves its selected deck; legacy campaign Actors are never adopted", async () => {
  const { api, actorId, actor } = await fixture(); const cards = Object.values(api.state().ships["alpha-0"].instances); delete actor.flags[M].alphaLibrary;
  assert.equal(api.library.view(actorId).initialized, false); assert.equal(actor.flags[M].alphaLibrary, undefined);
  await api.request({ type: "library-initialize", actorId, libraryRevision: 0 }); assert.deepEqual(api.library.view(actorId).loadouts[0].cards, cards);
  await assert.rejects(() => api.request({ type: "library-initialize", actorId, libraryRevision: 0 }), /changed/);
  const campaign = { id: "campaign", type: "vehicle", flags: { [M]: { ship: { untouched: true } } } }; game.actors.contents.push(campaign); const before = structuredClone(campaign);
  await assert.rejects(() => api.request({ type: "library-initialize", actorId: campaign.id, libraryRevision: 0 }), /Campaign migration/); assert.deepEqual(campaign, before);
});
test("refit capacity losses persist as visible errors and saved-ship launch preserves the chosen profile", async () => {
  const { api, actorId } = await fixture();
  for (const cardId of ["ram", "ahead", "chainshot", "harmonic"]) await edit(api, actorId, "library-grant", { cardId });
  await edit(api, actorId, "library-refit", { config: { hullId: "cutter", level: 20 } });
  const cards = [...api.library.view(actorId).loadouts[0].cards, "ram", "ahead", "chainshot", "harmonic"];
  await edit(api, actorId, "library-save", { loadoutId: "deck-1", name: "Full complement", cards });
  await edit(api, actorId, "library-refit", { config: { hullId: "cutter", level: 1 } });
  let view = api.library.view(actorId); assert.equal(view.loadouts[0].cards.length, 19); assert.ok(view.loadouts[0].issues.some(i => i.code === "capacity"));
  await assert.rejects(() => command(api, "start", { useSavedShips: true }), /at most 15/);
  await edit(api, actorId, "library-save", { loadoutId: "deck-1", name: "Light complement", cards: cards.slice(0, 15) });
  const s = await command(api, "start", { useSavedShips: true }); assert.equal(s.ships["alpha-0"].profile.id, "cutter"); assert.equal(s.ships["alpha-0"].profile.level, 1);
});

test("library UI preserves a stale draft, hides unlearned cards from players, and keeps the catalog out of player Builder", async () => {
  class Base { constructor(options) { this.options = options; } async _prepareContext() { return {}; } async render() { return this; } }
  globalThis.innerWidth = 1366; globalThis.innerHeight = 768;
  const world = alphaWorld({ applicationAPI: { ApplicationV2: Base, HandlebarsApplicationMixin: x => x } });
  const { AlphaShipLibraryWindow } = await import("../src/ui/alpha-ship-library-ui.js");
  const { AlphaCombatWindow } = await import("../src/ui/alpha-combat-ui.js");
  const api = world.initialize(); let s = await command(api, "start"); const actorId = s.ships["alpha-0"].actorId, actor = game.actors.get(actorId);
  actor.ownership.player = 3; await command(api, "end");
  const window = new AlphaShipLibraryWindow(); window.actorId = actorId;
  let context = await window._prepareContext({}); assert.equal(context.catalog.length, 21); assert.equal(context.loadouts.length, 3);
  window.draft.name = "Unsent crew draft"; window.dirty = true;
  await edit(api, actorId, "library-grant", { cardId: "chainshot" });
  context = await window._prepareContext({}); assert.equal(context.stale, true); assert.equal(context.draft.name, "Unsent crew draft"); assert.equal(context.editable, false);
  await window.act("save"); assert.match(window.error, /library changed/); assert.equal(api.library.view(actorId).loadouts[0].name, "Standard");
  window.resetDraft(); game.user = game.users.get("player"); context = await window._prepareContext({});
  assert.ok(context.catalog.every(c => context.view.learned.includes(c.id))); assert.equal(context.canGrant, false); assert.ok(Object.hasOwn(api.cards, "chainshot")); assert.ok(!Object.hasOwn(api.cards, "ram"), "API extensions preserve the dynamic learned-card filter");
  const combat = new AlphaCombatWindow(); const combatContext = await combat._prepareContext({}); assert.equal(combatContext.showBuild, false); assert.ok(!combatContext.tabs.some(t => t.id === "build"));
  actor.ownership.player = 0; context = await window._prepareContext({}); assert.deepEqual(context.ships, []); assert.equal(context.view, undefined);
});
