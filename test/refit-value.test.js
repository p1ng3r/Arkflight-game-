import test from "node:test";
import assert from "node:assert/strict";

import {
  AETHER_SCRAP_GP_VALUE,
  REFIT_VALUE_RATES,
  arkflightLevelToPf2eLevel,
  arkflightLevelValueGp,
  componentEconomyQuote
} from "../src/ship/refit-value.js";

function component(fullValueGp) {
  return { id: "test-mod", name: "Test Mod", data: { refit: { fullValueGp } } };
}

test("Aether Scrap uses the locked 10 gp conversion and refit percentages", () => {
  const quote = componentEconomyQuote(component(200));
  assert.equal(quote.ok, true);
  assert.equal(AETHER_SCRAP_GP_VALUE, 10);
  assert.equal(REFIT_VALUE_RATES.fabrication, 0.50);
  assert.equal(REFIT_VALUE_RATES.installation, 0.20);
  assert.equal(REFIT_VALUE_RATES.breakdown, 0.25);
  assert.equal(REFIT_VALUE_RATES.resale, 0.50);

  assert.equal(quote.fabrication.gpValue, 100);
  assert.equal(quote.fabrication.aetherScrap, 10);

  assert.equal(quote.installation.crew.gpValue, 40);
  assert.equal(quote.installation.crew.aetherScrap, 4);
  assert.equal(quote.installation.dock.gpValue, 30);
  assert.equal(quote.installation.dock.aetherScrap, 3);
  assert.equal(quote.installation.shipyard.gpValue, 20);
  assert.equal(quote.installation.shipyard.aetherScrap, 2);

  assert.equal(quote.breakdown.gpValue, 50);
  assert.equal(quote.breakdown.aetherScrap, 5);
  assert.equal(quote.resale.gpValue, 100);
});

test("Aether Scrap rounds fractional material costs up to whole scrap", () => {
  const quote = componentEconomyQuote(component(250));
  assert.equal(quote.fabrication.aetherScrap, 13);
  assert.equal(quote.installation.crew.aetherScrap, 5);
  assert.equal(quote.installation.dock.aetherScrap, 4);
  assert.equal(quote.installation.shipyard.aetherScrap, 3);
  assert.equal(quote.breakdown.aetherScrap, 7);
  assert.equal(quote.resale.gpValue, 125);
});

test("Arkflight level 1 prices as PF2e level 6 and advances one-for-one", () => {
  assert.equal(arkflightLevelToPf2eLevel(1), 6);
  assert.equal(arkflightLevelToPf2eLevel(7), 12);
  assert.equal(arkflightLevelValueGp(1), 225);
  assert.equal(arkflightLevelValueGp(7), 1820);
});

test("rarity level gates provide automatic mod values when no authored price exists", () => {
  const standard = componentEconomyQuote({ id: "standard", data: { rarity: "standard", minShipLevel: 1, refit: {} } });
  assert.equal(standard.arkflightLevel, 1);
  assert.equal(standard.pf2eLevel, 6);
  assert.equal(standard.fullValueGp, 225);
  assert.equal(standard.fabrication.aetherScrap, 12);
  assert.equal(standard.installation.crew.aetherScrap, 5);

  const rare = componentEconomyQuote({ id: "rare", data: { rarity: "rare", minShipLevel: 3, refit: {} } });
  assert.equal(rare.arkflightLevel, 3);
  assert.equal(rare.pf2eLevel, 8);
  assert.equal(rare.fullValueGp, 460);
  assert.equal(rare.resale.gpValue, 230);
});

test("high Arkflight levels continue the economy beyond PF2e level 20", () => {
  const mythic = componentEconomyQuote({ id: "mythic", data: { rarity: "mythic", minShipLevel: 17, refit: {} } });
  assert.equal(mythic.arkflightLevel, 17);
  assert.equal(mythic.pf2eLevel, 22);
  assert.equal(mythic.fullValueGp, 140000);
  assert.equal(mythic.breakdown.aetherScrap, 3500);
});
