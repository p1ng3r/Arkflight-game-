import test from "node:test";
import assert from "node:assert/strict";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { CARD_SKILLS, createPlaytestSession, weaponHexInArc, weaponCoverage, batteryOptions, planBatteryFire } from "../src/cards/card-playtest-session.js";
import { getOrderQueue } from "../src/cards/committed-orders.js";
import { dispatchPlaytestCommand } from "../src/cards/playtest-commands.js";
import { fireControlModel } from "../src/ui/card-combat-fire-ui.js";
import { weaponArcCheck } from "../src/combat/weapon-targeting.js";

function initial() {
  const build = deriveBuild("rum-stock-l5");
  const entries = ["a", "b", "c", "friend"].map(id => {
    const ship = structuredClone(build.ship);
    ship.resources.hull = { value: 100, max: 100 };
    ship.crew.stations = Object.fromEntries(Object.keys(CARD_SKILLS).map(station => [station, `${id}-${station}`]));
    const weapons = [0, 1, 2].map(i => ({ key: `gun-${i}`, name: "Broadside cannon", mount: "starboard", arcTemplate: "broadside", dice: "1d8", minRange: 1, maxRange: 5, reloadRounds: 2, potency: 0 }));
    return { id, name: id, team: id === "a" || id === "friend" ? "A" : "B", ship, stats: { ...build.derived.stats, armorClass: 10, hardness: 0 }, weapons };
  });
  const state = createPlaytestSession(entries, { id: "fire-patterns", rng: () => .7 });
  Object.assign(state.ships.a.cardPlay.motion, { q: 0, r: 0, heading: 0 });
  Object.assign(state.ships.b.cardPlay.motion, { q: 2, r: -1 }); // due east
  Object.assign(state.ships.c.cardPlay.motion, { q: 2, r: 0 });  // southeast, inside side cone
  Object.assign(state.ships.friend.cardPlay.motion, { q: 1, r: 0 });
  return state;
}
function adapters() {
  const formulas = [];
  return { user: { id: "gm", isGM: true }, ownsOperator: (user, id) => user.id === id, isEligibleOperator: () => true, rank: () => 2, formulas,
    async roll(formula) { formulas.push(formula); return formula === "1d20" ? 5 : 8; }
  };
}
function command(state, shipId, type, extra = {}) { return { type, shipId, sessionId: state.id, revision: state.revision, ...extra }; }
function request(state, extra) { const q = getOrderQueue(state.ships.a); return { round: q.round, revision: q.revision, ...extra }; }
async function executing(a = adapters()) {
  let state = initial();
  for (const id of Object.keys(state.ships)) {
    const q = getOrderQueue(state.ships[id]);
    state = await dispatchPlaytestCommand(state, command(state, id, "lock", { request: { round: q.round, revision: q.revision, orders: id === "a" ? [{ kind: "basic", abilityId: "fire-battery", station: "battlewatch", operatorId: "a-battlewatch" }] : [] } }), a);
  }
  assert.equal(state.turnOrder[0], "a");
  return state;
}
function fire(state, a, selection) {
  return dispatchPlaytestCommand(state, command(state, "a", "resolve", { request: request(state, { orderId: getOrderQueue(state.ships.a).orders[0].id, selection: { skill: "crafting", ...selection } }) }), a);
}
const split = { batteryId: "starboard", assignments: [{ weaponKey: "gun-0", targetId: "b" }, { weaponKey: "gun-1", targetId: "c" }] };

test("the four aiming patterns have distinct widths and inclusive rotated boundaries", () => {
  for (const [arcTemplate, degrees] of [["line", 60], ["broadside", 90], ["wide", 180], ["turret", 360]]) {
    const center = 150;
    assert.equal(weaponArcCheck({ heading: 60, mount: "starboard", arcTemplate, bearing: center }).halfWidth, degrees / 2);
    assert.equal(weaponArcCheck({ heading: 60, mount: "starboard", arcTemplate, bearing: center + degrees / 2 }).legal, true);
    if (degrees < 360) assert.equal(weaponArcCheck({ heading: 60, mount: "starboard", arcTemplate, bearing: center + degrees / 2 + .01 }).legal, false);
  }
});

test("mixed weapons on one mount retain individual arcs; a deck mount is not automatically a turret", () => {
  const state = initial(), weapons = state.ships.a.cardPlay.weapons;
  for (const w of weapons) Object.assign(w, { mount: "fore" });
  weapons[0].arcTemplate = "line"; weapons[1].arcTemplate = "wide"; weapons[2].arcTemplate = "turret";
  assert.deepEqual(batteryOptions(state, "a", "b", "fore").map(w => w.key), ["gun-1", "gun-2"]);
  const destination = { q: 0, r: 2 };
  assert.equal(weaponHexInArc(state, "a", destination, { mount: "deck", arcTemplate: "wide" }), false);
  assert.equal(weaponHexInArc(state, "a", destination, { mount: "deck", arcTemplate: "turret" }), true);
  state.ships.a.cardPlay.effects.push({ kind: "arc", amount: 60, uses: null });
  assert.equal(batteryOptions(state, "a", "b", "fore").length, 3);
});

test("individual overlays and legal shots agree for every pattern, heading and hex orientation", () => {
  for (const pointy of [false, true]) for (const arcTemplate of ["line", "broadside", "wide", "turret"]) for (let heading = 0; heading < 6; heading++) {
    const state = initial();
    state.canvas = { basis: pointy ? { q: { x: Math.sqrt(3), y: 0 }, r: { x: Math.sqrt(3)/2, y: 1.5 } } : { q: { x: 1.5, y: Math.sqrt(3)/2 }, r: { x: 0, y: Math.sqrt(3) } }, headings: [0, 60, 120, 180, 240, 300] };
    state.ships.a.cardPlay.motion.heading = heading;
    state.ships.a.cardPlay.weapons = [{ key: "gun", mount: "port", arcTemplate, minRange: 2, maxRange: 4, readyRound: 1 }];
    const covered = new Set(weaponCoverage(state, "a", "gun").map(c => `${c.q},${c.r}`));
    for (let q = -5; q <= 5; q++) for (let r = -5; r <= 5; r++) {
      Object.assign(state.ships.b.cardPlay.motion, { q, r });
      assert.equal(covered.has(`${q},${r}`), batteryOptions(state, "a", "b", "port").length > 0);
    }
  }
});

test("split volleys use one attack roll and divide the concentrated damage pool without duplication", async () => {
  const a = adapters(); let state = await executing(a); a.formulas.length = 0;
  state = await fire(state, a, split);
  assert.equal(a.formulas.filter(f => f === "1d20").length, 1);
  assert.equal(a.formulas.filter(f => f === "1d8").length, 2);
  assert.equal(state.pendingAttack.targetId, "b"); assert.equal(state.pendingAttack.damage, 8);
  assert.equal(state.queuedAttacks[0].targetId, "c"); assert.equal(state.queuedAttacks[0].damage, 4);
  assert.equal(state.pendingAttack.total, state.queuedAttacks[0].total);
  assert.deepEqual(state.ships.a.cardPlay.weapons.map(w => w.readyRound), [3, 3, 1]);
  assert.equal(getOrderQueue(state.ships.a).ap.remaining, 3);
  let concentrated = await executing(adapters());
  concentrated = await fire(concentrated, adapters(), { batteryId: "starboard", targetId: "b", weaponKeys: ["gun-0", "gun-1"] });
  assert.equal(concentrated.pendingAttack.damage, state.pendingAttack.damage + state.queuedAttacks[0].damage);
});

test("each split target gets its own authorized response and play stays paused until both finish", async () => {
  const a = adapters(); let state = await fire(await executing(a), a, split);
  const otherCrew = { ...a, user: { id: "c-captain", isGM: false } };
  await assert.rejects(dispatchPlaytestCommand(state, command(state, "c", "respond", { response: {} }), otherCrew), /defending crew/);
  state = await dispatchPlaytestCommand(state, command(state, "b", "respond", { response: { cardId: "brace-impact", station: "captain", skill: "diplomacy" } }), a);
  assert.equal(state.pendingAttack.targetId, "c"); assert.equal(state.ships.b.cardPlay.rp, 0); assert.equal(state.ships.c.cardPlay.rp, 1);
  assert.equal(state.ships.c.resources.hull.value, 100);
  await assert.rejects(dispatchPlaytestCommand(state, command(state, "a", "advance"), a), /defending crew/);
  state = await dispatchPlaytestCommand(state, command(state, "c", "respond", { response: {} }), otherCrew);
  assert.equal(state.pendingAttack, null); assert.deepEqual(state.queuedAttacks, []);
  assert.equal(state.ships.c.resources.hull.value, 96);
  assert.equal(state.ships.friend.resources.hull.value, 100);
});

test("duplicate, friendly, out-of-arc, reloading and non-broadside assignments are rejected atomically", async () => {
  const a = adapters(), original = await executing(a);
  const invalid = [
    { ...split, assignments: [split.assignments[0], split.assignments[0]] },
    { ...split, assignments: [{ weaponKey: "gun-0", targetId: "friend" }] },
    { ...split, assignments: [] },
    { ...split, targetId: "b" },
    { ...split, weaponKeys: ["gun-0"] },
    { ...split, assignments: [{ weaponKey: "missing", targetId: "b" }] },
    { ...split, assignments: [{ weaponKey: "gun-0", targetId: "b", damage: 1000 }] },
    { ...split, assignments: Array.from({ length: 25 }, () => split.assignments[0]) }
  ];
  for (const selection of invalid) { const snapshot = structuredClone(original); await assert.rejects(fire(original, a, selection)); assert.deepEqual(original, snapshot); }
  for (const mutate of [s => s.ships.a.cardPlay.weapons[0].arcTemplate = "wide", s => s.ships.a.cardPlay.weapons[0].readyRound = 3, s => s.ships.b.cardPlay.motion = { q: -3, r: 0 }, s => s.ships.b.cardPlay.motion = { q: 20, r: 0 }]) {
    const state = structuredClone(original); mutate(state); const snapshot = structuredClone(state);
    await assert.rejects(fire(state, a, { ...split, assignments: [split.assignments[0]] }), /ready broadside/); assert.deepEqual(state, snapshot);
  }
  assert.equal(a.formulas.filter(f => f === "1d8").length, 0);
});

test("damage boosts and penalties apply once to the volley, and Hardness is applied per defending ship", async () => {
  for (const bonus of [4, -10, -50]) {
    const a = adapters(); let state = await executing(a);
    state.ships.a.cardPlay.effects.push({ kind: "damage", amount: bonus, uses: 2, expiresTurn: 99 });
    state = await fire(state, a, split);
    assert.equal(state.pendingAttack.damage + state.queuedAttacks[0].damage, Math.max(0, 12 + bonus));
    assert.equal(state.ships.a.cardPlay.effects.find(e => e.kind === "damage").uses, 1);
  }
  const a = adapters(); let state = await executing(a); state.ships.b.cardPlay.stats.hardness = 3; state.ships.c.cardPlay.stats.hardness = 3;
  state = await fire(state, a, split);
  state = await dispatchPlaytestCommand(state, command(state, "b", "respond", { response: {} }), a);
  state = await dispatchPlaytestCommand(state, command(state, "c", "respond", { response: {} }), a);
  assert.equal(state.ships.b.resources.hull.value, 95); assert.equal(state.ships.c.resources.hull.value, 99);
});

test("critical hits and misses resolve independently against each target's AC", async () => {
  const a = adapters(); let state = await executing(a); state.ships.b.cardPlay.stats.armorClass = 1; state.ships.c.cardPlay.stats.armorClass = 99;
  state = await fire(state, a, split);
  state = await dispatchPlaytestCommand(state, command(state, "b", "respond", { response: {} }), a);
  state = await dispatchPlaytestCommand(state, command(state, "c", "respond", { response: {} }), a);
  assert.equal(state.ships.b.resources.hull.value, 84); assert.equal(state.ships.c.resources.hull.value, 100);
});

test("swivels stay single target, mixed concentrated batteries filter guns individually, and hold-fire guns stay ready", async () => {
  const a = adapters(); let state = await executing(a);
  state.ships.a.cardPlay.weapons[0].arcTemplate = "wide";
  assert.throws(() => planBatteryFire(state, "a", { ...split, assignments: [split.assignments[0]] }), /ready broadside/);
  state = await fire(state, a, { batteryId: "starboard", targetId: "b", weaponKeys: ["gun-0"] });
  assert.equal(state.pendingAttack.targetId, "b"); assert.equal(state.queuedAttacks.length, 0);
  assert.deepEqual(state.ships.a.cardPlay.weapons.map(w => w.readyRound), [3, 1, 1]);
});

test("HUD fire choices show legal targets per gun and never offer splitting a swivel-only side", () => {
  const state = initial(); let model = fireControlModel(state, "a", "starboard", "b");
  assert.equal(model.canSplit, true); assert.deepEqual(model.weapons[0].legalTargets.map(t => t.id), ["b", "c"]);
  state.ships.a.cardPlay.weapons[0].readyRound = 3;
  model = fireControlModel(state, "a", "starboard", "b"); assert.deepEqual(model.weapons[0].legalTargets, []);
  for (const w of state.ships.a.cardPlay.weapons) w.arcTemplate = "wide";
  assert.equal(fireControlModel(state, "a", "starboard", "b").canSplit, false);
});

test("Foundry encounter entries retain the weapon catalog's firing patterns", async () => {
  globalThis.Hooks = { once() {}, on() {} };
  const { weaponEntries } = await import("../src/foundry/card-combat-playtest-api.js");
  const weapons = weaponEntries({ weapons: ["deck-culverin", "light-swivel-cannon", "light-broadside-cannon"].map((id, i) => ({ id, instanceId: `catalog-${i}`, mount: i === 2 ? "port" : "fore" })) });
  assert.deepEqual(weapons.map(w => w.arcTemplate), ["line", "wide", "broadside"]);
});

test("ending during a split volley clears all remaining responses", async () => {
  const a = adapters(); let state = await fire(await executing(a), a, split);
  state = await dispatchPlaytestCommand(state, command(state, "a", "end"), a);
  assert.equal(state.phase, "complete"); assert.equal(state.pendingAttack, null); assert.deepEqual(state.queuedAttacks, []);
});
