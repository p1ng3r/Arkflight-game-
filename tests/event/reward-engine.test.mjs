import test from "node:test";
import assert from "node:assert/strict";

import { CREW_EDGE_HAND_MAX, CREW_EDGE_CARDS } from "../../src/content/crew-edge-cards.js";
import { GLASSBACK_CINDERWAKE } from "../../src/content/events/glassback-cinderwake.js";
import {
  applyRewardPackageToState,
  applyRoundRewardPackageToState,
  resolveEventEnding,
  rewardPackage
} from "../../src/event/reward-engine.js";

function sentences(text) {
  return String(text).split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
}

test("Crew Edge catalog uses explicit trigger windows", () => {
  const cards = Object.values(CREW_EDGE_CARDS);
  assert.ok(cards.length >= 10);
  for (const card of cards) {
    assert.ok(card.trigger.length > 10, `${card.id} needs an explicit trigger`);
    assert.ok(card.effect.length > 5, `${card.id} needs an explicit effect`);
  }
});

test("shared Crew Edge hand caps at three and reports overflow", () => {
  const rewards = rewardPackage({ edgeCards: ["clear-opening", "hold-together"] });
  const state = { crewEdgeHand: ["ride-the-momentum", "change-of-course"] };
  const next = applyRewardPackageToState(state, rewards);
  assert.equal(next.crewEdgeHand.length, CREW_EDGE_HAND_MAX);
  assert.deepEqual(next.eventRewards.awardedEdgeCards, ["clear-opening"]);
  assert.deepEqual(next.eventRewards.overflowEdgeCards, ["hold-together"]);
});

test("round rewards can award an Edge card immediately", () => {
  const rewards = rewardPackage({ edgeCards: ["hold-together"] });
  const next = applyRoundRewardPackageToState({ crewEdgeHand: [] }, rewards, { roundId: "r1", bandId: "mixed-success" });
  assert.deepEqual(next.crewEdgeHand, ["hold-together"]);
  assert.equal(next.roundRewards.bandId, "mixed-success");
});

test("Glassback has a 3-6 sentence ending for every final band", () => {
  for (const band of ["extraordinary", "strong-success", "mixed-success", "failure", "disaster"]) {
    const ending = resolveEventEnding(GLASSBACK_CINDERWAKE, band);
    assert.ok(sentences(ending.vignette) >= 3 && sentences(ending.vignette) <= 6, `${band} ending must be 3-6 sentences`);
  }
});

test("Glassback mixed rounds award tactical Crew Edge rewards", () => {
  const mixed = GLASSBACK_CINDERWAKE.rounds.map((round) => round.outcomes["mixed-success"]?.rewards?.edgeCards ?? []);
  assert.deepEqual(mixed, [["hold-together"], ["ride-the-momentum"], ["clear-opening"]]);
});

test("Glassback final outcomes can author gold and salvage", () => {
  const extraordinary = resolveEventEnding(GLASSBACK_CINDERWAKE, "extraordinary");
  const mixed = resolveEventEnding(GLASSBACK_CINDERWAKE, "mixed-success");
  assert.equal(extraordinary.rewards.gold, 25);
  assert.ok(extraordinary.rewards.salvage.length > 0);
  assert.equal(mixed.rewards.gold, 15);
  assert.ok(mixed.rewards.salvage.length > 0);
});
