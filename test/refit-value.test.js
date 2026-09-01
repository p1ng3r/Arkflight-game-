import test from "node:test";
import assert from "node:assert/strict";

import {
  AETHER_SCRAP_GP_VALUE,
  REFIT_VALUE_RATES,
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
