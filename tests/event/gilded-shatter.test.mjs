import test from "node:test";
import assert from "node:assert/strict";

import { validateEventDefinition } from "../../src/event/validate-event.js";
import { RISK_BENEFIT_BY_ID } from "../../src/content/risk-benefits.js";
import { ARKFLIGHT_EVENTS } from "../../src/content/events/index.js";
import { GILDED_SHATTER, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS } from "../../src/content/events/gilded-shatter.js";

function sentenceCount(value) {
  return String(value ?? "").split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}

test("Gilded Shatter is registered as Event Manager event #2", () => {
  assert.equal(ARKFLIGHT_EVENTS["gilded-shatter"], GILDED_SHATTER);
  assert.equal(Object.keys(ARKFLIGHT_EVENTS).length, 2);
});

test("Gilded Shatter satisfies the authored Event Manager contract", () => {
  const result = validateEventDefinition(GILDED_SHATTER, { riskBenefits: RISK_BENEFIT_BY_ID });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(GILDED_SHATTER.rounds.length, 7);
  assert.ok(sentenceCount(GILDED_SHATTER.openingVignette) >= 4);
  assert.ok(sentenceCount(GILDED_SHATTER.openingVignette) <= 6);

  for (const round of GILDED_SHATTER.rounds) {
    assert.ok(sentenceCount(round.openingVignette) <= 4, `${round.id} opening is too long`);
    for (const actions of Object.values(round.stationActions)) {
      assert.equal(actions.length, 3);
      for (const action of actions) {
        assert.ok(action.description.length > 20);
        for (const skill of action.skills) assert.equal(skill.dc, 22);
        const heroic = action.skills.flatMap((skill) => skill.riskBids ?? []);
        if (heroic.length) assert.deepEqual(heroic.map((bid) => bid.tier), [2, 5, 8]);
      }
    }
  }
});

test("Round 6 authors the greed choice and Round 7 consequences", () => {
  const captain = GILDED_SHATTER.rounds[5].stationActions.captain;
  const retreat = captain.find((action) => action.id.endsWith("call-the-retreat"));
  const oneMore = captain.find((action) => action.id.endsWith("take-one-more-haul"));
  const stripBare = captain.find((action) => action.id.endsWith("strip-it-bare"));
  assert.ok(retreat && oneMore && stripBare);
  assert.equal(retreat.skills[0].riskBids.length, 0);
  for (const action of [oneMore, stripBare]) {
    const bids = action.skills[0].riskBids;
    assert.deepEqual(bids.map((bid) => bid.parameters.nextRoundDcAll), [1, 2, 3]);
    assert.deepEqual(bids.map((bid) => bid.parameters.commitStrain), [1, 2, 3]);
    assert.ok(bids.every((bid) => bid.parameters.nextRoundHazard === "salvage-overload"));
  }
  assert.equal(GILDED_SHATTER.rounds[6].title, "Break from the Dark Star");
});

test("Gilded Shatter rewards use authored Arkflight salvage and real PF2e rune UUIDs", () => {
  assert.equal(GILDED_SHATTER_BLUEPRINT_TABLE.length, 5);
  assert.equal(GILDED_SHATTER_DEEP_SALVAGE_OPTIONS.length, 3);
  const rewards = GILDED_SHATTER.endings.success.rewards;
  assert.deepEqual(rewards.pf2eItems.map((entry) => entry.uuid), [
    "Compendium.pf2e.equipment-srd.Item.roeYtwlIe65BPMJ1",
    "Compendium.pf2e.equipment-srd.Item.JQdwHECogcTzdd8R",
    "Compendium.pf2e.equipment-srd.Item.qlunQzfnzPQpMG6U"
  ]);
  assert.equal(rewards.shipComponents.length, 1);
  assert.equal(rewards.boons.length, 1);
});

test("Gilded Shatter ending vignettes stay within the 10-sentence closing limit", () => {
  for (const ending of Object.values(GILDED_SHATTER.endings)) {
    assert.ok(sentenceCount(ending.vignette) >= 3);
    assert.ok(sentenceCount(ending.vignette) <= 10, `${ending.id} ending is too long`);
  }
});
