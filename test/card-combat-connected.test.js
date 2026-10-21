import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { PLAYTEST_COMBAT_CARDS as CARDS } from "../src/content/combat-cards-playtest.js";
import { validateCardCatalog, cardAvailability } from "../src/cards/card-library.js";
import { getOrderQueue } from "../src/cards/committed-orders.js";
import { CARD_SKILLS, createPlaytestSession, batteryOptions } from "../src/cards/card-playtest-session.js";
import { dispatchPlaytestCommand } from "../src/cards/playtest-commands.js";

function entries() {
  const build = deriveBuild("rum-stock-l5");
  return ["a", "b"].map(id => {
    const ship = structuredClone(build.ship);
    ship.resources.hull = { value: 100, max: 100 };
    ship.resources.supplies = { value: 10, max: 100 };
    ship.resources.morale = { value: 60, max: 100 };
    ship.resources.strain = { value: 8, max: 12 };
    ship.resources.lifeveil = { value: 60, max: 100 };
    ship.crew.stations = Object.fromEntries(Object.keys(CARD_SKILLS).map(station => [station, `${id}-${station}`]));
    return { id, name: id, team: id.toUpperCase(), ship, stats: structuredClone(build.derived.stats), weapons: [0, 1].map(i => ({ key: `gun-${i}`, name: "Test cannon", mount: "fore", dice: "1d6", minRange: 1, maxRange: 10, reloadRounds: 1, potency: 0 })) };
  });
}
function initial() { return createPlaytestSession(entries(), { id: "playtest", rng: () => 0.7 }); }
function adapters(die = 10) {
  const formulas = [];
  return { user: { id: "gm", isGM: true }, ownsOperator: (user, id) => user.id === id, isEligibleOperator: (id, _station, ship) => Object.values(ship.crew.stations).includes(id), rank: () => 2, formulas,
    async roll(formula) { formulas.push(formula); return formula === "1d20" ? die : 4; }
  };
}
function cmd(session, shipId, type, extra = {}) { return { type, shipId, sessionId: session.id, revision: session.revision, ...extra }; }
function request(session, shipId, extra = {}) { const q = getOrderQueue(session.ships[shipId]); return { round: q.round, revision: q.revision, ...extra }; }
async function lock(session, shipId, orders, a) { return dispatchPlaytestCommand(session, cmd(session, shipId, "lock", { request: request(session, shipId, { orders }) }), a); }
function cardOrder(id, shipId = "a") { const card = CARDS.find(card => card.id === id); return { kind: "card", abilityId: id, station: card.stations[0], operatorId: `${shipId}-${card.stations[0]}` }; }
function basic(id, station = "battlewatch", shipId = "a") { return { kind: "basic", abilityId: id, station, operatorId: `${shipId}-${station}` }; }
function equipFixtureCard(session, id, shipId = "a") {
  const ship = session.ships[shipId], card = CARDS.find(c => c.id === id), deck = card.deck;
  if (!ship.cardDecks.library[deck].includes(id)) ship.cardDecks.library[deck].push(id);
  if (!ship.cardDecks.hands[deck].includes(id)) {
    const replace = ship.cardDecks.hands[deck].findIndex(other => CARDS.find(c => c.id === other).type === card.type);
    ship.cardDecks.hands[deck][replace] = id;
  }
}
async function executing(orders, a = adapters()) {
  let state = initial();
  for (const order of orders) if (order.kind === "card") equipFixtureCard(state, order.abilityId);
  state = await lock(state, "a", orders, a);
  return lock(state, "b", [], a);
}

test("the first batch has executable 10 General / 5 Flux / 1 Signature AP and 3/2/1 RP definitions", () => {
  validateCardCatalog(CARDS);
  for (const [deck, expected] of [["ap", [10, 5, 1]], ["rp", [3, 2, 1]]]) assert.deepEqual(["general", "flux", "signature"].map(type => CARDS.filter(c => c.deck === deck && c.type === type).length), expected);
  const state = initial();
  assert.equal(state.ships.a.cardDecks.hands.ap.length, 12);
  assert.equal(state.ships.a.cardDecks.hands.rp.length, 6);
  assert.equal(state.ships.a.cardPlay.motion.speed, 5);
  assert.equal(state.ships.a.resources.hull.value, 100);
});

test("starting another encounter preserves the permanent card library and hand", () => {
  const original = initial(), imported = entries();
  imported[0].ship.cardDecks = structuredClone(original.ships.a.cardDecks);
  const state = createPlaytestSession(imported, { id: "second", rng: () => 0.1 });
  assert.deepEqual(state.ships.a.cardDecks.library, original.ships.a.cardDecks.library);
  assert.deepEqual(state.ships.a.cardDecks.hands, original.ships.a.cardDecks.hands);
  assert.equal(state.ships.a.cardDecks.runtime.combatId, "second");
});

test("disabled ships cannot enter, move or fire; recovery remains possible", async () => {
  const imported = entries(); imported[0].ship.resources.hull.value = 0;
  assert.throws(() => createPlaytestSession(imported, { id: "disabled" }), /above zero/);
  const a = adapters(); let state = await executing([basic("fire-battery"), basic("damage-control", "engineer")], a);
  state.ships.a.resources.hull.value = 0;
  await assert.rejects(() => dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "forward" }), a), /Restore Hull/);
  const orders = getOrderQueue(state.ships.a).orders;
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "resolve", { request: request(state, "a", { orderId: orders[0].id, selection: { skill: "crafting" } }) }), a);
  assert.equal(getOrderQueue(state.ships.a).orders[0].status, "skipped");
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "resolve", { request: request(state, "a", { orderId: orders[1].id, selection: { skill: "crafting" } }) }), a);
  assert.ok(state.ships.a.resources.hull.value > 0);
});

test("each AP card executes all four authored degrees through lock, initiative and controller resolution", async () => {
  for (const card of CARDS.filter(card => card.deck === "ap")) for (const [die, degree] of [[20, 2], [10, 1], [3, 0], [1, -1]]) {
    const a = adapters(die);
    let state = await executing([cardOrder(card.id)], a);
    const choice = card.id === "issue-order" ? "engineer" : card.id === "redistribute-power" ? "weapons" : card.id === "work-the-guns" ? "gun-0" : undefined;
    if (card.id === "work-the-guns") state.ships.a.cardPlay.weapons[0].readyRound = 3;
    const selection = { skill: CARD_SKILLS[card.stations[0]][0], ...(choice ? { choice } : {}) };
    const order = getOrderQueue(state.ships.a).orders[0];
    state = await dispatchPlaytestCommand(state, cmd(state, "a", "resolve", { request: request(state, "a", { orderId: order.id, selection }) }), a);
    assert.equal(getOrderQueue(state.ships.a).orders[0].status, "resolved", card.id);
    assert.equal(state.log.at(-1).result.degree, degree, `${card.id} with d20=${die}`);
    assert.equal(cardAvailability(state.ships.a, CARDS, card.id).ok, false);
    assert.equal(getOrderQueue(state.ships.a).ap.remaining, card.type === "signature" ? 6 : 3);
  }
});

test("one firing attack roll creates a response window and applies battery damage once", async () => {
  const a = adapters();
  let state = await executing([basic("fire-battery")], a);
  assert.equal(batteryOptions(state, "a", "b", "fore").length, 2);
  a.formulas.length = 0;
  const order = getOrderQueue(state.ships.a).orders[0];
  const fireCommand = cmd(state, "a", "resolve", { request: request(state, "a", { orderId: order.id, selection: { targetId: "b", batteryId: "fore", skill: "crafting" } }) });
  state = await dispatchPlaytestCommand(state, fireCommand, a);
  assert.equal(a.formulas.filter(f => f === "1d20").length, 1);
  assert.equal(state.pendingAttack.damage, 6); // 4 full + half the other 4.
  assert.equal(state.ships.b.resources.hull.value, 100);
  assert.equal(getOrderQueue(state.ships.a).ap.remaining, 3);
  await assert.rejects(() => dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "forward" }), a), /defending crew/);
  state = await dispatchPlaytestCommand(state, cmd(state, "b", "respond", { response: {} }), a);
  assert.equal(state.pendingAttack, null);
  assert.equal(state.ships.b.resources.hull.value, 98); // 6 minus stock Hardness 4.
  await assert.rejects(() => dispatchPlaytestCommand(state, fireCommand, a), /Encounter changed/);
});

test("all six reaction cards resolve four degrees, consume shared RP and retain category recovery", async () => {
  for (const reaction of CARDS.filter(c => c.deck === "rp")) for (const [reactionDie, degree] of [[20, 2], [10, 1], [3, 0], [1, -1]]) {
    const a = adapters(); let state = await executing([basic("fire-battery")], a);
    state.ships.b.resources.hull.value = 70;
    const order = getOrderQueue(state.ships.a).orders[0];
    state = await dispatchPlaytestCommand(state, cmd(state, "a", "resolve", { request: request(state, "a", { orderId: order.id, selection: { targetId: "b", batteryId: "fore", skill: "crafting" } }) }), a);
    state = await dispatchPlaytestCommand(state, cmd(state, "b", "respond", { response: { cardId: reaction.id, station: "veilwarden", skill: "arcana" } }), { ...a, roll: async formula => formula === "1d20" ? reactionDie : 4 });
    assert.equal(state.ships.b.cardPlay.rp, 0, reaction.id);
    assert.equal(state.pendingAttack, null);
    assert.equal(cardAvailability(state.ships.b, CARDS, reaction.id).ok, false);
    assert.equal(state.log.at(-1).result.reaction.degree, degree, reaction.id);
    for (const resource of Object.values(state.ships.b.resources)) assert.ok(Number.isFinite(resource.value) && resource.value >= 0);
  }
});

test("Captain and operator ownership is checked through the connected dispatcher", async () => {
  const a = adapters(); let state = initial();
  equipFixtureCard(state, "vent-strain");
  a.user = { id: "a-engineer", isGM: false };
  await assert.rejects(() => lock(state, "a", [cardOrder("vent-strain")], a), /Captain/);
  a.user.id = "a-captain";
  state = await lock(state, "a", [cardOrder("vent-strain")], a);
  a.user = { id: "gm", isGM: true }; state = await lock(state, "b", [], a);
  const command = () => cmd(state, "a", "resolve", { request: request(state, "a", { orderId: getOrderQueue(state.ships.a).orders[0].id, selection: { skill: "crafting" } }) });
  a.user = { id: "a-captain", isGM: false };
  await assert.rejects(() => dispatchPlaytestCommand(state, command(), a), /assigned operator/);
  a.user.id = "a-engineer";
  state = await dispatchPlaytestCommand(state, command(), a);
  assert.ok(state.ships.a.resources.strain.value < 8);
});

test("free movement, purchased movement cap and separate-cell turns are enforced on the board", async () => {
  const a = adapters(); let state = await executing([basic("full-thrust", "navigator"), basic("hard-turn", "navigator")], a);
  for (const order of getOrderQueue(state.ships.a).orders) state = await dispatchPlaytestCommand(state, cmd(state, "a", "resolve", { request: request(state, "a", { orderId: order.id, selection: { skill: "survival" } }) }), a);
  assert.equal(state.ships.a.cardPlay.motion.extra, 2);
  assert.equal(state.ships.a.cardPlay.motion.bonusTurns, 1);
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "left" }), a);
  await assert.rejects(() => dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "right" }), a), /another hex/);
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "forward" }), a);
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "left" }), a);
  assert.equal(state.ships.a.cardPlay.motion.turns, 2);
  a.user = { id: "a-captain", isGM: false };
  await assert.rejects(() => dispatchPlaytestCommand(state, cmd(state, "a", "helm", { direction: "forward" }), a), /Navigator/);
});

test("a whole round returns to Captain planning and rerolls initiative only after new plans lock", async () => {
  const a = adapters(); let state = await executing([], a);
  state = await dispatchPlaytestCommand(state, cmd(state, "a", "advance"), a);
  state = await dispatchPlaytestCommand(state, cmd(state, "b", "advance"), a);
  assert.equal(state.phase, "planning"); assert.equal(state.round, 2);
  const rolled = a.formulas.length;
  state = await lock(state, "a", [], a); assert.equal(a.formulas.length, rolled);
  state = await lock(state, "b", [], a); assert.equal(a.formulas.length, rolled + 2);
  assert.equal(state.phase, "execution");
  assert.equal(getOrderQueue(state.ships.a).ap.remaining, 4);
});

test("Foundry entry points and functional template are registered in the module", async () => {
  const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url)));
  assert.ok(manifest.esmodules.includes("src/foundry/card-combat-playtest-api.js"));
  assert.ok(manifest.esmodules.includes("src/ui/card-combat-playtest-ui.js"));
  const template = (await Promise.all(["card-combat-playtest.hbs", "card-combat-canvas-hud.hbs"].map(file => readFile(new URL(`../templates/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const command of ["start", "lock", "resolve", "respond", "helm", "advance"]) assert.ok(template.includes(`data-card-command="${command}"`));
});

test("GM relay authenticates the server-originating user instead of a claimed payload identity", async () => {
  globalThis.Hooks = { once() {}, on() {} };
  const { authenticateCardRequest } = await import("../src/foundry/card-combat-playtest-api.js");
  const users = new Map([["player", { id: "player", active: true }], ["gm", { id: "gm", active: true, isGM: true }]]);
  assert.equal(authenticateCardRequest({ author: { id: "player" }, flags: { userId: "gm" } }, "player", users).id, "player");
  assert.equal(authenticateCardRequest({ author: { id: "gm" } }, "player", users), null);
});

test("registered Foundry API saves first libraries, persists playable commands, and preserves live resources", async () => {
  const callbacks = new Map(), worlds = entries(), actorWrites = [];
  globalThis.Hooks = { once(event, fn) { const list = callbacks.get(event) ?? []; list.push(fn); callbacks.set(event, list); }, on() {}, callAll() {} };
  const actors = worlds.map(entry => ({ id: entry.id, name: entry.name, flags: { "arkflight-game": { ship: structuredClone(entry.ship) } }, async update(patch) {
    this.flags["arkflight-game"].ship.cardDecks = structuredClone(patch["flags.arkflight-game.ship.cardDecks"]); actorWrites.push(this.id);
  } }));
  const index = new Map(actors.map(actor => [actor.id, actor]));
  let saved = {}, id = 0;
  const gm = { id: "gm", isGM: true, active: true };
  globalThis.game = { user: gm, users: { [Symbol.iterator]: function* () { yield gm; }, get: id => id === "gm" ? gm : null }, actors: { contents: actors, get: id => index.get(id) }, settings: { register() {}, get: () => saved, async set(_module, _key, value) { saved = structuredClone(value); } }, arkflight: {} };
  globalThis.foundry = { utils: { randomID: () => `id-${++id}` } };
  globalThis.Roll = class { constructor(formula) { this.formula = formula; } async evaluate() { this.total = this.formula === "1d20" ? 10 : 4; return this; } };
  await import("../src/foundry/card-combat-playtest-api.js?foundry-integration");
  for (const fn of callbacks.get("init")) fn();
  for (const fn of callbacks.get("ready")) fn();
  const api = game.arkflight.cardCombat;
  await api.request({ type: "start", entries: [{ id: "a", team: "A" }, { id: "b", team: "B" }] });
  const originalHand = structuredClone(actors[0].flags["arkflight-game"].ship.cardDecks.hands);
  let state = api.state();
  assert.equal(state.phase, "planning");
  assert.deepEqual(actorWrites, ["a", "b"]);
  await api.request(cmd(state, "a", "lock", { request: request(state, "a", { orders: [basic("full-thrust", "navigator")] }) }));
  state = api.state();
  await api.request(cmd(state, "b", "lock", { request: request(state, "b", { orders: [] }) }));
  state = api.state();
  const shipId = state.turnOrder[0];
  assert.equal(shipId, "a");
  await api.request(cmd(state, "a", "resolve", { request: request(state, "a", { orderId: getOrderQueue(state.ships.a).orders[0].id, selection: { skill: "survival" } }) }));
  state = api.state();
  assert.equal(state.ships.a.cardPlay.motion.extra, 2);
  assert.deepEqual(actors[0].flags["arkflight-game"].ship.resources, worlds[0].ship.resources);
  await api.request(cmd(state, "a", "end"));
  await api.request({ type: "start", entries: [{ id: "a", team: "A" }, { id: "b", team: "B" }] });
  assert.deepEqual(actorWrites, ["a", "b"]);
  assert.deepEqual(api.state().ships.a.cardDecks.hands, originalHand);
});
