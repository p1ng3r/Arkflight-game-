import test from "node:test";
import assert from "node:assert/strict";

import { validateEventDefinition } from "../../src/event/validate-event.js";
import { RISK_BENEFIT_BY_ID } from "../../src/content/risk-benefits.js";
import { ARKFLIGHT_EVENTS } from "../../src/content/events/index.js";
import {
  GILDED_SHATTER,
  GILDED_SHATTER_HAZARDS,
  GILDED_SHATTER_BLUEPRINT_TABLE,
  GILDED_SHATTER_DEEP_SALVAGE_OPTIONS
} from "../../src/content/events/gilded-shatter.js";

function sentenceCount(value) {
  return String(value ?? "").split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}

test("Gilded Shatter remains registered as Event Manager event #2", () => {
  assert.equal(ARKFLIGHT_EVENTS["gilded-shatter"], GILDED_SHATTER);
  assert.equal(Object.keys(ARKFLIGHT_EVENTS).length, 2);
});

test("Gilded Shatter uses the opening art throughout Leg 1 and the final art for every ending", () => {
  const opening = "assets/art/events/gilded-shatter/scenes/01-boarding/opening-gilded-shatter.webp";
  const final = "assets/art/events/gilded-shatter/scenes/01-boarding/Final-gilded-shatter.webp";
  assert.equal(GILDED_SHATTER.image, opening);
  for (const round of GILDED_SHATTER.rounds) assert.equal(round.image, opening);
  for (const ending of Object.values(GILDED_SHATTER.endings)) assert.equal(ending.image, final);
});

test("Gilded Shatter Leg 1 is exactly the three-round boarding event", () => {
  const result = validateEventDefinition(GILDED_SHATTER, { riskBenefits: RISK_BENEFIT_BY_ID });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(GILDED_SHATTER.title, "The Gilded Shatter — Board the Wreck");
  assert.equal(GILDED_SHATTER.rounds.length, 3);
  assert.deepEqual(GILDED_SHATTER.rounds.map((round) => round.title), [
    "Close on the Wreck",
    "Competing Vectors",
    "Loaded Boarding Lines"
  ]);
  assert.deepEqual(GILDED_SHATTER.startingState.hazards, ["gravity-shear"]);
  assert.ok(GILDED_SHATTER_HAZARDS["gravity-shear"]);
  assert.match(GILDED_SHATTER.goal, /physically aboard/i);
});

test("all five stations act every boarding round with level-6 DCs and authored Heroic tiers", () => {
  assert.ok(sentenceCount(GILDED_SHATTER.openingVignette) >= 3);
  assert.ok(sentenceCount(GILDED_SHATTER.openingVignette) <= 6);

  for (const round of GILDED_SHATTER.rounds) {
    assert.ok(sentenceCount(round.openingVignette) >= 3, `${round.id} opening is too short`);
    assert.ok(sentenceCount(round.openingVignette) <= 6, `${round.id} opening is too long`);
    assert.equal(round.narrativeHooks.hazardId, "gravity-shear");
    for (const station of ["captain", "engineer", "navigator", "battlewatch", "veilwarden"]) {
      const actions = round.stationActions[station];
      assert.equal(actions.length, 3, `${round.id} ${station} action count`);
      for (const action of actions) {
        assert.ok(action.description.length > 20);
        for (const skill of action.skills) assert.equal(skill.dc, 22);
        const heroic = action.skills.flatMap((skill) => skill.riskBids ?? []);
        if (heroic.length) assert.deepEqual(heroic.map((bid) => bid.tier), [2, 5, 8]);
      }
    }
  }
});

test("Round 3 Battlewatch owns grapnels, crossing security, and debris control", () => {
  const ids = GILDED_SHATTER.rounds[2].stationActions.battlewatch.map((action) => action.id);
  assert.ok(ids.some((id) => id.endsWith("throw-the-grapnels")));
  assert.ok(ids.some((id) => id.endsWith("secure-the-crossing")));
  assert.ok(ids.some((id) => id.endsWith("cut-down-falling-debris")));
});

test("every final result boards the PCs and successful boarding grants exploration advantages instead of treasure", () => {
  for (const ending of Object.values(GILDED_SHATTER.endings)) {
    assert.match(ending.label, /Boarding Established/);
    assert.match(ending.vignette, /exploration/i);
    assert.equal(ending.rewards.gold, 0);
    assert.equal(ending.rewards.aetherScrap, 0);
    assert.equal(ending.rewards.pf2eItems.length, 0);
    assert.equal(ending.rewards.salvage.length, 0);
    assert.equal(ending.rewards.shipComponents.length, 0);
  }

  assert.deepEqual(GILDED_SHATTER.endings.extraordinary.rewards.boons.map((entry) => entry.id), [
    "gilded-shatter-secured-return-corridor",
    "gilded-shatter-weather-deck-shortcut"
  ]);
  assert.deepEqual(GILDED_SHATTER.endings.success.rewards.boons.map((entry) => entry.id), [
    "gilded-shatter-secured-return-corridor"
  ]);
  assert.equal(GILDED_SHATTER.endings.costly.rewards.boons.length, 0);
  assert.equal(GILDED_SHATTER.endings.disaster.rewards.boons.length, 0);
});

test("future Salvage and Escape reward tables are retained but are not awarded by Leg 1", () => {
  assert.equal(GILDED_SHATTER_BLUEPRINT_TABLE.length, 5);
  assert.equal(GILDED_SHATTER_DEEP_SALVAGE_OPTIONS.length, 3);
  for (const ending of Object.values(GILDED_SHATTER.endings)) {
    assert.equal(ending.rewards.shipComponents.length, 0);
  }
});

test("Gilded Shatter boarding endings stay within the closing vignette limit", () => {
  for (const ending of Object.values(GILDED_SHATTER.endings)) {
    assert.ok(sentenceCount(ending.vignette) >= 3);
    assert.ok(sentenceCount(ending.vignette) <= 10, `${ending.id} ending is too long`);
  }
});
