import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_COMPLICATION_CARDS as cards, COMPLICATION_SCENARIOS as scenarios } from "../src/content/ship-complications.js";
import { degreeOfSuccess } from "../src/combat/check-resolution.js";
import { validateComplicationCatalog, createComplicationEncounter, resolveShipComplication, chooseShipComplication, complicationChoiceOptions, activeShipComplications, complicationCheckModifier, consumeShipComplications, advanceComplicationRound, endComplicationEncounter, claimComplicationOpportunity } from "../src/combat/ship-complications.js";

function ship(id = "crew", team = "crew") {
  return { id, name: id, team, ap: 4, resources: { hull: { value: 120, max: 120 }, morale: { value: 100, max: 100 }, lifeveil: { value: 100, max: 100 }, strain: { value: 0, max: 10 }, supplies: { value: 10, max: 10 } }, batteries: [{ id: "port" }, { id: "starboard" }] };
}
function fixture() { return createComplicationEncounter({ id: "encounter", ships: [ship(), ship("enemy", "enemy")], seed: 123 }); }
function forceCard(before, cardId) {
  const state = structuredClone(before);
  state.drawPile = state.drawPile.filter(id => id !== cardId);
  state.discardPile = state.discardPile.filter(id => id !== cardId);
  state.drawPile.push(cardId);
  return state;
}
function draw(state, cardId, scenario = "captain", more = {}) {
  return resolveShipComplication(forceCard(state, cardId), { eventId: `event-${state.sequence}`, shipId: "crew", scenario, degree: -1, source: scenario === "impact" ? "collision" : "card", batteryId: "port", ...more });
}
function resolveChoices(state, optionId = "alternative") {
  for (const choice of state.choices.filter(c => c.status === "pending")) state = chooseShipComplication(state, { choiceId: choice.id, shipId: choice.shipId, optionId });
  return state;
}

test("catalog has 24 distinct cards, all 144 authored entries, bounded effects and contact fallbacks", () => {
  assert.equal(validateComplicationCatalog(), true);
  assert.equal(cards.reduce((n, c) => n + Object.keys(c.entries).length, 0), 144);
  assert.ok(Object.isFrozen(cards[0].entries.captain.effect.options[0]));
  const broken = structuredClone(cards); delete broken[0].entries.navigator;
  assert.throws(() => validateComplicationCatalog(broken), /six scenarios/);
  const invalid = structuredClone(cards); invalid[0].entries.captain.effect.options[0].effect.track = "made-up";
  assert.throws(() => validateComplicationCatalog(invalid), /resource/);
});
test("normal failure, success and critical success never draw or mutate the input", () => {
  const state = fixture(), original = structuredClone(state);
  for (const degree of [0, 1, 2]) {
    const result = resolveShipComplication(state, { shipId: "crew", eventId: "check", scenario: "captain", degree });
    assert.equal(result.receipt.drawn, false); assert.deepEqual(result.state, state);
  }
  assert.deepEqual(state, original);
  assert.throws(() => resolveShipComplication(state, { shipId: "crew", eventId: "check", scenario: "captain", degree: "critical-failure" }), /final degree/);
});
test("uses final PF2e degree rather than treating every natural 1 as a fumble", () => {
  const state = fixture(), ordinaryFailure = degreeOfSuccess(25, 1, 20);
  assert.equal(ordinaryFailure, 0);
  assert.equal(resolveShipComplication(state, { shipId: "crew", eventId: "natural-one", scenario: "captain", degree: ordinaryFailure }).receipt.drawn, false);
  const criticalFailure = degreeOfSuccess(9, 5, 20);
  assert.equal(resolveShipComplication(state, { shipId: "crew", eventId: "bad-check", scenario: "captain", degree: criticalFailure }).receipt.drawn, true);
});
test("a critical failure applies only its own station entry and preserves all unrelated ship resources", () => {
  const initial = fixture(), saved = structuredClone(initial);
  const { state, receipt } = draw(initial, "strained-reserves", "captain");
  assert.equal(state.ships[0].resources.morale.value, 95);
  for (const key of ["hull", "lifeveil", "strain", "supplies"]) assert.deepEqual(state.ships[0].resources[key], saved.ships[0].resources[key]);
  assert.deepEqual(state.ships[1], saved.ships[1]);
  assert.deepEqual(initial, saved); assert.equal(receipt.scenario, "captain");
});
test("same activation is idempotent across two critically failing station contributions", () => {
  const first = draw(fixture(), "strained-reserves", "captain", { eventId: "coordinated-activation" });
  const second = resolveShipComplication(first.state, { shipId: "crew", eventId: "coordinated-activation", scenario: "engineer", degree: -1 });
  assert.equal(second.duplicate, true); assert.deepEqual(second.state, first.state);
  assert.equal(second.receipt.scenario, "captain");
});
test("each ship in the same collision can draw exactly once", () => {
  const first = draw(fixture(), "strained-reserves", "impact", { eventId: "impact-pair", opponentId: "enemy", alongside: true });
  const second = resolveShipComplication(first.state, { eventId: "impact-pair", shipId: "enemy", scenario: "impact", source: "collision", degree: -1, opponentId: "crew", alongside: true });
  assert.equal(second.state.history.length, 2); assert.equal(second.state.drawPile.length, 22);
  const third = resolveShipComplication(second.state, { eventId: "impact-pair", shipId: "enemy", scenario: "impact", source: "collision", degree: -1 });
  assert.equal(third.duplicate, true); assert.equal(third.state.drawPile.length, 22);
});
test("resource choices charge exactly once and never also apply the alternative penalty", () => {
  const initial = draw(fixture(), "caught-out", "captain").state;
  assert.equal(initial.ships[0].resources.morale.value, 100);
  const choiceId = initial.choices[0].id;
  const resolved = chooseShipComplication(initial, { shipId: "crew", choiceId, optionId: "resource" });
  assert.equal(resolved.ships[0].resources.morale.value, 95); assert.equal(resolved.effects.length, 0);
  assert.deepEqual(chooseShipComplication(resolved, { shipId: "crew", choiceId, optionId: "resource" }), resolved);
  assert.throws(() => chooseShipComplication(resolved, { shipId: "crew", choiceId, optionId: "alternative" }), /already resolved/);
});
test("unaffordable resource costs cannot become a free choice at empty Morale, full Strain or fatal Hull", () => {
  for (const [scenario, track, value] of [["captain", "morale", 0], ["engineer", "strain", 10], ["battlewatch", "hull", 2]]) {
    const input = fixture(); input.ships[0].resources[track].value = value;
    const state = draw(input, "caught-out", scenario).state, choiceId = state.choices[0].id;
    assert.equal(complicationChoiceOptions(state, choiceId).find(o => o.id === "resource").available, false);
    assert.throws(() => chooseShipComplication(state, { choiceId, shipId: "crew", optionId: "resource" }), /cannot be paid/);
    assert.equal(resolveChoices(state).choices[0].status, "resolved");
  }
});
test("pending choices survive JSON reload and must resolve before another draw or round", () => {
  const state = JSON.parse(JSON.stringify(draw(fixture(), "caught-out", "engineer").state));
  assert.throws(() => advanceComplicationRound(state), /pending choices/);
  assert.throws(() => draw(state, "strained-reserves", "engineer"), /pending complication/);
  assert.equal(resolveChoices(state).effects[0].stat, "engineer");
});
test("all 144 outcomes resolve and both branches of every choice work", () => {
  for (const card of cards) for (const scenario of Object.keys(scenarios)) {
    const result = draw(fixture(), card.id, scenario, { opponentId: "enemy", alongside: true });
    assert.equal(result.receipt.cardId, card.id); assert.equal(result.receipt.scenario, scenario);
    assert.equal(result.state.history.length, 1);
    for (const optionId of ["resource", "alternative"]) {
      const state = resolveChoices(result.state, optionId);
      assert.equal(state.choices.some(c => c.status === "pending"), false);
      assert.equal(state.discardPile.length, 1);
      assert.ok(state.ships.every(s => Object.values(s.resources).every(t => t.value >= 0 && t.value <= t.max)));
    }
  }
});
test("station resource losses follow the station, including proportional percentage tracks", () => {
  const input = fixture(); input.ships[0].resources.lifeveil = { value: 200, max: 200 };
  const veil = draw(input, "strained-reserves", "veilwarden").state;
  assert.equal(veil.ships[0].resources.lifeveil.value, 190);
  for (const [scenario, track] of [["captain", "morale"], ["engineer", "strain"], ["navigator", "supplies"]]) {
    const state = draw(fixture(), "strained-reserves", scenario).state;
    assert.equal(state.history[0].resourceChanges[0].track, track);
  }
});
test("contact-only results have a legal fallback and battery results work on an unarmed ship", () => {
  const contact = draw(fixture(), "caught-out", "impact");
  assert.equal(contact.receipt.fallback, true); assert.equal(contact.state.effects[0].stat, "structure");
  const input = fixture(); input.ships[0].batteries = [];
  const unarmed = resolveChoices(draw(input, "caught-out", "battlewatch").state);
  assert.equal(unarmed.effects[0].stat, "battlewatch"); assert.equal(unarmed.effects[0].batteryId, undefined);
});
test("next-round movement effects activate once, last through next round, then expire", () => {
  let state = draw(fixture(), "caught-out", "navigator").state;
  assert.equal(activeShipComplications(state, "crew").length, 0);
  state = advanceComplicationRound(state);
  assert.equal(activeShipComplications(state, "crew")[0].rule, "max-turns");
  state = advanceComplicationRound(state); assert.equal(state.effects.length, 0);
});
test("resource losses persist after round cleanup and encounter end", () => {
  let state = draw(fixture(), "strained-reserves", "captain").state;
  state = advanceComplicationRound(advanceComplicationRound(state));
  state = endComplicationEncounter(state);
  assert.equal(state.ships[0].resources.morale.value, 95);
  assert.throws(() => draw(state, "strained-reserves", "captain"), /ended/);
});
test("repeated identical temporary effects refresh instead of stacking and check consumption is scoped", () => {
  let state = draw(fixture(), "loose-fittings", "battlewatch").state;
  state = draw(state, "slipping-grip", "battlewatch").state;
  assert.equal(state.effects.length, 1);
  assert.equal(complicationCheckModifier(state, "crew", "battery-attack", { batteryId: "port" }).amount, -1);
  assert.equal(complicationCheckModifier(state, "crew", "battery-attack", { batteryId: "starboard" }).amount, 0);
  assert.throws(() => consumeShipComplications(state, { shipId: "enemy", effectIds: [state.effects[0].id] }), /this ship/);
  const matching = complicationCheckModifier(state, "crew", "battery-attack", { batteryId: "port" });
  state = consumeShipComplications(state, { shipId: "crew", effectIds: matching.effectIds });
  assert.equal(state.effects.length, 0);
});
test("complication penalties use the greatest applicable penalty, including Coordinated checks", () => {
  let state = resolveChoices(draw(fixture(), "caught-out", "captain").state);
  state = draw(state, "chain-reaction", "captain").state;
  const result = complicationCheckModifier(state, "crew", "captain", { coordinated: true });
  assert.equal(result.amount, -1); assert.equal(result.effectIds.length, 2);
});
test("paid enemy opportunities charge once, reject allies/empty AP, and never grant an attack", () => {
  const result = draw(fixture(), "exposed-flank", "engineer"), id = result.state.effects[0].id;
  assert.throws(() => claimComplicationOpportunity(result.state, { effectId: id, opponentId: "crew" }), /cannot exploit/);
  const empty = structuredClone(result.state); empty.ships[1].ap = 0;
  assert.throws(() => claimComplicationOpportunity(empty, { effectId: id, opponentId: "enemy" }), /available AP/);
  const claimed = claimComplicationOpportunity(result.state, { effectId: id, opponentId: "enemy" });
  assert.equal(claimed.ships[1].ap, 3); assert.equal(claimed.effects[0].claimedBy, "enemy");
  assert.deepEqual(claimComplicationOpportunity(claimed, { effectId: id, opponentId: "enemy" }), claimed);
  assert.equal(claimed.ships[0].resources.hull.value, 120);
  assert.equal(claimed.effects[0].rule, "dr-gap");
});
test("same seed and serialized continuation produce the same draws, including a discard reshuffle", () => {
  let a = fixture(), b = fixture(), event = 0;
  const seen = new Set();
  while (event < 49) {
    const input = { eventId: `draw-${event}`, shipId: "crew", scenario: "captain", degree: -1 };
    const ra = resolveShipComplication(a, input), rb = resolveShipComplication(b, input);
    if (event < 24) seen.add(ra.receipt.cardId);
    assert.equal(ra.receipt.cardId, rb.receipt.cardId);
    a = resolveChoices(ra.state); b = JSON.parse(JSON.stringify(resolveChoices(rb.state)));
    assert.deepEqual(a, b); assert.equal(a.drawPile.length + a.discardPile.length, 24);
    event++;
  }
  assert.equal(seen.size, 24);
});
test("invalid sources, unknown ships, corrupt deck zones and recursive complication sources reject atomically", () => {
  const state = fixture(), original = structuredClone(state), base = { eventId: "invalid", shipId: "crew", scenario: "captain", degree: -1 };
  for (const input of [{ ...base, source: "complication" }, { ...base, source: "collision" }, { ...base, source: "attack" }, { ...base, shipId: "missing" }]) assert.throws(() => resolveShipComplication(state, input));
  const corrupted = structuredClone(state); corrupted.drawPile[0] = corrupted.drawPile[1];
  assert.throws(() => resolveShipComplication(corrupted, base), /incomplete or duplicated/);
  assert.deepEqual(state, original);
});
