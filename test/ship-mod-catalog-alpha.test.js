import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_MODS } from "../src/content/ship-mod-catalog.js";
import {
  SHIP_MOD_RARITIES,
  shipModAlphaTarget,
  validateShipModProgression
} from "../src/ship/ship-mod-rarity.js";

test("all five Ship Mod rarity bands meet Alpha density targets", () => {
  const counts = Object.fromEntries(SHIP_MOD_RARITIES.map((rarity) => [
    rarity,
    Object.values(SHIP_MODS).filter((mod) => mod.data.rarity === rarity).length
  ]));

  for (const rarity of SHIP_MOD_RARITIES) {
    const target = shipModAlphaTarget(rarity);
    assert.ok(counts[rarity] >= target.min, `${rarity}: ${counts[rarity]} below ${target.min}`);
    assert.ok(counts[rarity] <= target.max, `${rarity}: ${counts[rarity]} above ${target.max}`);
  }

  assert.deepEqual(counts, {
    standard: 22,
    rare: 20,
    epic: 18,
    legendary: 15,
    mythic: 8
  });
});

test("entire Alpha Ship Mod catalog passes shared progression validation", () => {
  for (const mod of Object.values(SHIP_MODS)) {
    const result = validateShipModProgression(mod);
    assert.equal(result.ok, true, `${mod.id}: ${result.errors.join(", ")}`);
  }
});

test("Alpha Ship Mod catalog has no duplicate component ids", () => {
  const ids = Object.values(SHIP_MODS).map((mod) => mod.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every Mythic core-rule exception is explicitly bounded", () => {
  for (const mod of Object.values(SHIP_MODS).filter((entry) => entry.data.rarity === "mythic")) {
    const exception = mod.data.coreRuleException;
    if (!exception) continue;
    assert.ok(exception.limit || exception.cost || exception.trigger || exception.usage, `${mod.id} has an unbounded exception`);
  }
});
