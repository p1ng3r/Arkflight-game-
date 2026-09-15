import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { GILDED_SHATTER_WEATHER_DECK_GUIDE } from "../../src/content/adventures/gilded-shatter-weather-deck.js";

const manifest = JSON.parse(fs.readFileSync(new URL("../../module.json", import.meta.url), "utf8"));
const foundrySource = fs.readFileSync(new URL("../../src/foundry/gilded-shatter-gm-guide.js", import.meta.url), "utf8");

test("Gilded Shatter weather deck guide ships five GM journals and two macros", () => {
  assert.equal(GILDED_SHATTER_WEATHER_DECK_GUIDE.level, 6);
  assert.equal(GILDED_SHATTER_WEATHER_DECK_GUIDE.baseDC, 22);
  assert.equal(GILDED_SHATTER_WEATHER_DECK_GUIDE.journals.length, 5);
  assert.equal(GILDED_SHATTER_WEATHER_DECK_GUIDE.macros.length, 2);
});

test("weather deck guide contains boarding-result placement, handouts, investigation, pulse hazard, and descent", () => {
  const text = JSON.stringify(GILDED_SHATTER_WEATHER_DECK_GUIDE);
  for (const phrase of [
    "Boarding Result",
    "Player Handout",
    "Three Truths",
    "Dark Star Transmutation Pulse",
    "DC 22 Fortitude",
    "Disrupt a Vein",
    "Going Below"
  ]) assert.match(text, new RegExp(phrase));
  assert.ok(GILDED_SHATTER_WEATHER_DECK_GUIDE.journals.flatMap((entry) => entry.pages).some((page) => page.playerFacing));
});

test("Dark Star Pulse macro tracks scene pulses and rolls selected Fortitude saves without auto-applying damage", () => {
  const pulse = GILDED_SHATTER_WEATHER_DECK_GUIDE.macros.find((macro) => macro.id === "gilded-shatter-dark-star-pulse");
  assert.ok(pulse);
  assert.match(pulse.command, /getFlag\(MODULE_ID, FLAG\)/);
  assert.match(pulse.command, /setFlag\(MODULE_ID, FLAG, count\)/);
  assert.match(pulse.command, /getStatistic\?\.\("fortitude"\)/);
  assert.match(pulse.command, /DC = 22/);
  assert.doesNotMatch(pulse.command, /applyDamage|actor\.update|createEmbeddedDocuments/);
});

test("Foundry loads and syncs dedicated Gilded Shatter GM Journal and Macro compendiums", () => {
  assert.ok(manifest.esmodules.includes("src/foundry/gilded-shatter-gm-guide.js"));
  assert.match(foundrySource, /Arkflight — Gilded Shatter GM Guide/);
  assert.match(foundrySource, /Arkflight — Gilded Shatter GM Macros/);
  assert.match(foundrySource, /documentName === "JournalEntry"/);
  assert.match(foundrySource, /documentName === "Macro"/);
  assert.match(foundrySource, /game\.arkflight\.gildedShatterGuide/);
});
