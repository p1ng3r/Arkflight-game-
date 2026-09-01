import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_MODS } from "../src/content/ship-mods.js";
import {
  SHIP_MOD_RARITIES,
  SHIP_MOD_RARITY_RULES,
  shipModAvailableAtLevel,
  validateShipModProgression
} from "../src/ship/ship-mod-rarity.js";

test("ship mod rarity ladder and level gates are locked", () => {
  assert.deepEqual(SHIP_MOD_RARITIES, ["standard", "rare", "epic", "legendary", "mythic"]);
  assert.equal(SHIP_MOD_RARITY_RULES.standard.minShipLevel, 1);
  assert.equal(SHIP_MOD_RARITY_RULES.rare.minShipLevel, 3);
  assert.equal(SHIP_MOD_RARITY_RULES.epic.minShipLevel, 7);
  assert.equal(SHIP_MOD_RARITY_RULES.legendary.minShipLevel, 12);
  assert.equal(SHIP_MOD_RARITY_RULES.mythic.minShipLevel, 17);
});

test("every current ship mod has a valid rarity and real mechanical purpose", () => {
  for (const mod of Object.values(SHIP_MODS)) {
    const result = validateShipModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});

test("rarity level gates are enforced", () => {
  const rare = { data: { rarity: "rare", minShipLevel: 3 } };
  assert.equal(shipModAvailableAtLevel(rare, 2), false);
  assert.equal(shipModAvailableAtLevel(rare, 3), true);

  const mythic = { data: { rarity: "mythic", minShipLevel: 17 } };
  assert.equal(shipModAvailableAtLevel(mythic, 16), false);
  assert.equal(shipModAvailableAtLevel(mythic, 17), true);
});

test("detection-family mods are differentiated by capability identity", () => {
  assert.ok(SHIP_MODS["lookout-spire"].capabilities.includes("battlewatch-immediate-threat-spotting"));
  assert.ok(SHIP_MODS["detection-spire"].capabilities.includes("navigator-anomaly-detection"));
  assert.ok(SHIP_MODS["void-scout-observation-spire"].capabilities.includes("long-range-route-scouting"));
  assert.ok(SHIP_MODS["longwatch-lookout-platform"].capabilities.includes("sustained-watch"));
});
