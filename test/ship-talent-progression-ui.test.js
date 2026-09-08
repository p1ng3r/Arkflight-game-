import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SHIP_TALENTS } from "../src/content/ship-talents.js";
import { SHIP_TALENT_PROGRESSION } from "../src/content/ship-talent-progression.js";
import { canAccessTalent, progressionView, validateProgression } from "../src/ship/progression.js";

function ship(level, talentIds = []) {
  return { progression: { level, xp: 0, talentIds, arkcraftUpgrades: {} } };
}

test("every live ship talent has authored per-level progression metadata", () => {
  const missing = Object.keys(SHIP_TALENTS).filter((id) => !SHIP_TALENT_PROGRESSION[id]);
  assert.deepEqual(missing, []);
});

test("level 1 offers whole-ship Voyage and Battle training", () => {
  const view = progressionView(ship(1));
  const voyage = view.talents.find((talent) => talent.id === "voyage-trained");
  const battle = view.talents.find((talent) => talent.id === "battle-trained");
  assert.equal(voyage.requiredLevel, 1);
  assert.equal(battle.requiredLevel, 1);
  assert.equal(voyage.canPurchase, true);
  assert.equal(battle.canPurchase, true);
  assert.equal(voyage.cost, 1);
  assert.equal(battle.cost, 1);
});

test("individual talent levels are stricter than broad tier access", () => {
  const greaterFrame = SHIP_TALENTS["greater-frame"];
  const improvedDrive = SHIP_TALENTS["improved-drive"];
  const mythicBroadside = SHIP_TALENTS["mythic-broadside"];
  assert.equal(canAccessTalent(3, greaterFrame), false);
  assert.equal(canAccessTalent(4, greaterFrame), true);
  assert.equal(canAccessTalent(5, improvedDrive), false);
  assert.equal(canAccessTalent(6, improvedDrive), true);
  assert.equal(canAccessTalent(19, mythicBroadside), false);
  assert.equal(canAccessTalent(20, mythicBroadside), true);
});

test("upgrade talents expose prerequisite and upgrade-path lock reasons", () => {
  const locked = progressionView(ship(4));
  const greaterFrame = locked.talents.find((talent) => talent.id === "greater-frame");
  assert.equal(greaterFrame.requiredLevel, 4);
  assert.equal(greaterFrame.locked, true);
  assert.equal(greaterFrame.upgradeOfName, "Toughness");
  assert.deepEqual(greaterFrame.upgradePathNames, ["Toughness", "Greater Frame"]);
  assert.match(greaterFrame.lockReasons.map((reason) => reason.label).join(" "), /REQUIRES Toughness/i);

  const unlocked = progressionView(ship(4, ["toughness"]));
  const available = unlocked.talents.find((talent) => talent.id === "greater-frame");
  assert.equal(available.locked, false);
  assert.equal(available.canPurchase, true);
});

test("validation rejects owned talents that skip required levels or prerequisites", () => {
  const tooEarly = validateProgression(ship(3, ["toughness", "greater-frame"]));
  assert.equal(tooEarly.ok, false);
  assert.match(tooEarly.errors.join(" "), /Greater Frame is not available until level 4/);

  const missingPrerequisite = validateProgression(ship(4, ["greater-frame"]));
  assert.equal(missingPrerequisite.ok, false);
  assert.match(missingPrerequisite.errors.join(" "), /Greater Frame requires Toughness/);
});

test("specialist Arkcraft and later upgrade chains have authored requirements", () => {
  assert.equal(SHIP_TALENT_PROGRESSION["advanced-battlewatch-arkcraft"].minLevel, 9);
  assert.equal(SHIP_TALENT_PROGRESSION["legendary-drive"].minLevel, 11);
  assert.deepEqual(SHIP_TALENT_PROGRESSION["legendary-drive"].prerequisites, ["improved-drive"]);
  assert.equal(SHIP_TALENT_PROGRESSION["ship-will-not-die"].minLevel, 17);
  assert.deepEqual(SHIP_TALENT_PROGRESSION["ship-will-not-die"].prerequisites, ["iron-legend"]);
});

test("progression view reports milestone and TP lock reasons", () => {
  const view = progressionView(ship(1, ["voyage-trained", "battle-trained"]));
  assert.deepEqual(view.nextMilestone, { level: 5, label: "Ship Calling" });
  const toughness = view.talents.find((talent) => talent.id === "toughness");
  assert.equal(toughness.canPurchase, false);
  assert.match(toughness.lockReasons.map((reason) => reason.label).join(" "), /REQUIRES 1 TP/);
});

test("Foundry progression enhancer renders levels prerequisites upgrade paths and lock reasons", async () => {
  const ui = await readFile(new URL("../src/ui/ship-progression-eligibility-ui.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles/ship-progression-eligibility.css", import.meta.url), "utf8");
  assert.match(ui, /arkflight-talent-level-group/);
  assert.match(ui, /arkflight-talent-progression-meta/);
  assert.match(ui, /arkflight-talent-lock-reasons/);
  assert.match(ui, /NEXT MILESTONE/);
  assert.match(ui, /UPGRADES/);
  assert.match(css, /arkflight-talent-level-cards/);
  assert.doesNotMatch(css, /data-purchase-eligible="false"\]\{display:none/);
});
