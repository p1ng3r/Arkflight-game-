import test from "node:test";
import assert from "node:assert/strict";
import { combatMotionEvents, createMotionTracker, effectiveMotion, cardCooldown } from "../src/ui/card-combat-motion-state.js";

function fixture() {
  return { id: "encounter", revision: 0, round: 1, phase: "planning", turnOrder: ["a", "b"], turnIndex: 0, pendingAttack: null, log: [], ships: Object.fromEntries(["a", "b"].map(id => [id, {
    resources: { hull: { value: 100, max: 100 }, strain: { value: 3, max: 12 } },
    cardPlay: { rp: 3, tokenId: `token-${id}`, motion: { q: 0, r: 0, heading: 0 } },
    cardDecks: { runtime: { readyRound: {}, spentSignatures: [], orderQueue: { ap: { remaining: 4 }, plans: [], orders: [] } } }
  }])) };
}
const next = state => ({ ...structuredClone(state), revision: state.revision + 1 });

test("first snapshot, duplicate hooks, and stale updates never replay effects", () => {
  const tracker = createMotionTracker(), state = fixture(), changed = next(state);
  changed.ships.a.resources.hull.value = 90;
  assert.deepEqual(tracker.observe(state), []);
  assert.equal(tracker.observe(changed).filter(e => e.kind === "resource").length, 1);
  assert.deepEqual(tracker.observe(changed), []);
  assert.deepEqual(tracker.observe(state), []);
  const later = next(changed); later.ships.a.resources.hull.value = 85;
  assert.equal(tracker.observe(later).find(e => e.kind === "resource").delta, -5);
});
test("reconnects and different encounters establish a fresh baseline", () => {
  const tracker = createMotionTracker(), state = fixture(); tracker.observe(state);
  const gap = next(state); gap.revision = 9; gap.ships.a.resources.hull.value = 50;
  assert.deepEqual(tracker.observe(gap), []);
  const live = next(gap); live.ships.a.resources.hull.value = 45;
  assert.equal(tracker.observe(live).find(e => e.kind === "resource").delta, -5);
  live.id = "another"; live.revision = 0;
  assert.deepEqual(tracker.observe(live), []);
  tracker.reset(); assert.deepEqual(tracker.observe(next(live)), []);
});
test("plan lock animates only newly committed orders and the spent AP pool", () => {
  const before = fixture(), after = next(before), q = after.ships.a.cardDecks.runtime.orderQueue;
  q.plans.push({ id: "plan-1" }); q.orders.push({ id: "order-1", abilityId: "vent-strain" }); q.ap.remaining = 3;
  const events = combatMotionEvents(before, after);
  assert.deepEqual(events.map(e => e.kind), ["lock", "pool"]);
  assert.equal(events[0].orders[0].id, "order-1"); assert.equal(events[1].pool, "ap"); assert.equal(events[1].delta, -1);
  const added = next(after), aq = added.ships.a.cardDecks.runtime.orderQueue;
  aq.plans.push({ id: "plan-2" }); aq.orders.push({ id: "order-2" });
  assert.deepEqual(combatMotionEvents(after, added).find(e => e.kind === "lock").orders.map(o => o.id), ["order-2"]);
});
test("RP spending and actual resource changes stay distinct from AP", () => {
  const before = fixture(), after = next(before);
  after.ships.b.cardPlay.rp = 2; after.ships.b.resources.hull.value = 88; after.ships.b.resources.strain.value = 5;
  const events = combatMotionEvents(before, after);
  assert.deepEqual(events.find(e => e.kind === "pool"), { kind: "pool", shipId: "b", pool: "rp", delta: -1 });
  assert.deepEqual(events.filter(e => e.kind === "resource").map(e => [e.resource, e.delta]), [["hull", -12], ["strain", 2]]);
});
test("one confirmed split volley creates one fire event containing all assigned targets", () => {
  const before = fixture(), after = next(before);
  after.log.push({ shipId: "a", label: "Split Broadside", result: { die: 14, total: 25 }, targets: [{ targetId: "b", weaponKeys: ["port-1"] }, { targetId: "c", weaponKeys: ["port-2"] }] });
  after.pendingAttack = { attackerId: "a", targetId: "b", total: 25 };
  const events = combatMotionEvents(before, after);
  assert.equal(events.filter(e => e.kind === "fire").length, 1); assert.equal(events.find(e => e.kind === "fire").targets.length, 2);
  const response = next(after); response.pendingAttack.targetId = "c";
  response.log.push({ shipId: "b", label: "No reaction", result: { degree: 1, attackerId: "a" } });
  const following = combatMotionEvents(after, response);
  assert.equal(following.filter(e => e.kind === "fire").length, 0);
  assert.equal(following.find(e => e.kind === "incoming").shipId, "c");
});
test("the capped combat log does not replay the previous 99 attacks", () => {
  const before = fixture(); before.log = Array.from({ length: 100 }, (_, i) => ({ label: `roll-${i}` }));
  const after = next(before); after.log = [...after.log.slice(1), { shipId: "a", label: "Fire Battery", result: { die: 12 }, targets: [{ targetId: "b" }] }];
  assert.equal(combatMotionEvents(before, after).filter(e => e.kind === "fire").length, 1);
});
test("reaction reveal uses its own degree rather than the incoming attack's degree", () => {
  const before = fixture(), after = next(before);
  after.log.push({ shipId: "b", label: "brace-impact", result: { degree: 2, die: 20, reaction: { degree: 0, die: 4, total: 12 } } });
  assert.equal(combatMotionEvents(before, after).find(e => e.kind === "outcome").result.degree, 0);
});
test("Flux used in round one returns at the start of round three and shows round-based progress", () => {
  const before = fixture(), card = { id: "flux", cooldownRounds: 2 };
  before.ships.a.cardDecks.runtime.readyRound.flux = 3;
  const second = next(before); second.round = 2;
  assert.equal(combatMotionEvents(before, second).filter(e => e.kind === "ready").length, 0);
  assert.equal(cardCooldown(second.ships.a, card, 2).progress, 50);
  const third = next(second); third.round = 3;
  assert.equal(combatMotionEvents(second, third).find(e => e.kind === "ready").cardId, "flux");
  assert.deepEqual(cardCooldown(third.ships.a, card, 3), { remaining: 0, readyRound: 3, progress: 100, spent: false });
});
test("Signature effects run once and the card remains spent", () => {
  const before = fixture(), after = next(before); after.ships.a.cardDecks.runtime.spentSignatures.push("drive-the-crew");
  assert.equal(combatMotionEvents(before, after).find(e => e.kind === "signature").cardId, "drive-the-crew");
  assert.equal(combatMotionEvents(after, next(after)).filter(e => e.kind === "signature").length, 0);
  assert.equal(cardCooldown(after.ships.a, { id: "drive-the-crew" }, 1).spent, true);
});
test("engine trails follow actual translation, not a facing-only change", () => {
  const before = fixture(), turn = next(before); turn.ships.a.cardPlay.motion.heading = 1;
  assert.equal(combatMotionEvents(before, turn).filter(e => e.kind === "move").length, 0);
  const move = next(turn); move.ships.a.cardPlay.motion.q = 1;
  assert.equal(combatMotionEvents(turn, move).find(e => e.kind === "move").shipId, "a");
});
test("completion does not animate resource resets and observers never mutate snapshots", () => {
  const before = fixture(), after = next(before), original = structuredClone(before);
  after.phase = "complete"; after.ships.a.resources.hull.value = 1;
  assert.deepEqual(combatMotionEvents(before, after), []); assert.deepEqual(before, original);
  const tracker = createMotionTracker(); tracker.observe(before); before.ships.a.resources.hull.value = 75;
  const changed = next(original); changed.ships.a.resources.hull.value = 95;
  assert.equal(tracker.observe(changed).find(e => e.kind === "resource").delta, -5);
});
test("OS reduced motion overrides Full and Subtle; unknown preferences fail closed", () => {
  assert.equal(effectiveMotion("full"), "full"); assert.equal(effectiveMotion("subtle"), "subtle");
  for (const preference of ["full", "subtle", "off", "unknown"]) assert.equal(effectiveMotion(preference, true), "off");
  assert.equal(effectiveMotion("unknown"), "off");
});

globalThis.Hooks = { once() {}, on() {} };
const { tokenScreenPoint, lastCombatOutcome } = await import("../src/ui/card-combat-motion.js");
test("canvas effects follow the transformed native token center and reject other scenes", () => {
  const state = fixture(); state.canvas = { sceneId: "scene" };
  globalThis.canvas = { ready: true, scene: { id: "scene" }, stage: { worldTransform: { a: 2, b: 0, c: 0, d: 2, tx: 50, ty: 20 } }, tokens: { get: () => ({ center: { x: 100, y: 70 }, w: 80, document: { rotation: 60 } }) }, app: { renderer: { screen: { width: 1000, height: 800 } }, canvas: { getBoundingClientRect: () => ({ left: 5, top: 10, width: 500, height: 400 }) } } };
  assert.deepEqual(tokenScreenPoint(state, "a"), { x: 130, y: 90, size: 80, rotation: 60 });
  state.canvas.sceneId = "different"; assert.equal(tokenScreenPoint(state, "a"), null);
});
test("static outcome text preserves the reaction's unique kicker with animation disabled", () => {
  const state = fixture(); state.log = [{ round: 2, shipId: "b", label: "brace-impact", result: { degree: 2, die: 20, reaction: { degree: -1, die: 1, total: 8 } } }];
  const result = lastCombatOutcome(state, "b");
  assert.equal(result.label, "Critical failure"); assert.equal(result.die, 1); assert.ok(result.text); assert.equal(result.round, 2);
});
