import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { PLAYTEST_COMBAT_CARDS as CARDS } from "../src/content/combat-cards-playtest.js";
import { cardArt, resourceMeters, STATION_PRESENTATION } from "../src/ui/card-combat-presentation.js";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { CARD_SKILLS, createPlaytestSession } from "../src/cards/card-playtest-session.js";
import { dispatchPlaytestCommand } from "../src/cards/playtest-commands.js";
import { getOrderQueue } from "../src/cards/committed-orders.js";

globalThis.Hooks = { once() {}, on() {} };
class Base { constructor(options) { this.options = options; } async _prepareContext() { return {}; } }
globalThis.foundry = { applications: { api: { ApplicationV2: Base, HandlebarsApplicationMixin: x => x } } };
const { ArkflightCardCombatWindow } = await import("../src/ui/card-combat-playtest-ui.js");
function fixture() {
  const build = deriveBuild("rum-stock-l5");
  return createPlaytestSession(["a", "b"].map(id => {
    const ship = structuredClone(build.ship);
    ship.crew.stations = Object.fromEntries(Object.keys(CARD_SKILLS).map(station => [station, `${id}-${station}`]));
    return { id, name: id, team: id, ship, stats: build.derived.stats, weapons: [{ key: "gun", name: "Cannon", mount: "fore", dice: "1d6", minRange: 1, maxRange: 10, reloadRounds: 1, potency: 0 }] };
  }), { id: "presentation", rng: () => 0.7 });
}
function install(state) {
  globalThis.game = { user: { isGM: true }, actors: { contents: [], get: id => ({ name: id }) }, arkflight: { cardCombat: { state: () => structuredClone(state), ownsOperator: () => true } } };
}

test("every executable card and station has local artwork", async () => {
  for (const card of [...CARDS, ...STATION_PRESENTATION]) {
    const art = card.art ?? cardArt(card);
    assert.ok(art, card.id);
    await access(new URL(`../${art.replace("modules/arkflight-game/", "")}`, import.meta.url));
  }
  await access(new URL("../assets/ui/card-combat/command-banner.webp", import.meta.url));
});
test("resource bars handle bounds and show high Strain as the warning direction", () => {
  const meters = resourceMeters({ hull: { value: 120, max: 100 }, lifeveil: { value: 40, max: 100 }, strain: { value: 9, max: 12 }, morale: { value: -2, max: 100 }, supplies: { value: 0, max: 0 } });
  assert.deepEqual(meters.map(m => m.percent), [100, 40, 75, 0, 0]);
  assert.deepEqual(meters.map(m => m.warning), [false, true, true, true, true]);
});
test("command board context preserves the full hand while exposing station filters and the real AP budget", async () => {
  const state = fixture(); install(state);
  const board = new ArkflightCardCombatWindow(), context = await board._prepareContext({});
  assert.equal(context.cards.length, 12);
  assert.equal(context.stations.reduce((sum, station) => sum + station.count, 0), 12);
  assert.ok(context.cards.every(card => card.art && card.filter && card.enabled));
  assert.equal(context.budget, getOrderQueue(state.ships.a).ap.remaining);
  assert.equal(context.phaseLabel, "Plan together");
  assert.equal(context.pendingCount, 0);
});
test("a committed plan displays a waiting state without allowing another initial plan", async () => {
  let state = fixture();
  const q = getOrderQueue(state.ships.a);
  state = await dispatchPlaytestCommand(state, { type: "lock", sessionId: state.id, revision: state.revision, shipId: "a", request: { round: q.round, revision: q.revision, orders: [] } }, { user: { isGM: true, id: "gm" }, ownsOperator: () => true, isEligibleOperator: () => true, roll: async () => 10, rank: () => 1 });
  install(state);
  const board = new ArkflightCardCombatWindow(), context = await board._prepareContext({});
  assert.equal(context.phaseLabel, "Plan locked");
  assert.equal(context.canPlan, false);
  assert.equal(context.budget, 0);
  assert.ok(context.cards.every(card => !card.enabled));
});
