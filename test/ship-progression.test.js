import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { talentPointsForLevel, validateProgression } from "../src/ship/progression.js";
import { addShipExperience, resetShipLevel, setShipExperience, shipExperienceView, SHIP_XP_PER_LEVEL } from "../src/ship/ship-xp.js";
import { validateShip } from "../src/ship/validate-ship.js";
import { hullCombatProfile } from "../src/combat/combat-schema.js";
import { getMasteryTechnique } from "../src/content/base-mastery.js";
import { SHIP_CATALOGS } from "../src/content/index.js";

function sloop(overrides = {}) {
  return createShip({
    hull: { chassisId: "sloop", patternId: "standard" },
    arkengine: { chassisId: "lanterncoil-arkengine", patternId: "standard", modIds: [] },
    ...overrides
  });
}

test("level 1 and every odd ship level grant 2 TP while even levels grant 1", () => {
  assert.equal(talentPointsForLevel(1), 2);
  assert.equal(talentPointsForLevel(2), 3);
  assert.equal(talentPointsForLevel(3), 5);
  assert.equal(talentPointsForLevel(5), 8);
  assert.equal(talentPointsForLevel(10), 15);
  assert.equal(talentPointsForLevel(15), 23);
  assert.equal(talentPointsForLevel(20), 30);
});

test("ship XP uses a flat 1000 XP per level", () => {
  const ship = sloop({ progression: { level: 8, xp: 375, talentIds: [], arkcraftUpgrades: {} } });
  const view = shipExperienceView(ship);
  assert.equal(SHIP_XP_PER_LEVEL, 1000);
  assert.equal(view.level, 8);
  assert.equal(view.xp, 375);
  assert.equal(view.max, 1000);
  assert.equal(view.nextLevel, 9);
  assert.equal(view.percent, 37.5);
});

test("ship XP levels at 1000 and carries overflow toward the next level", () => {
  const ship = sloop({ progression: { level: 8, xp: 900, talentIds: [], arkcraftUpgrades: {} } });
  const advanced = addShipExperience(ship, 250);
  assert.equal(advanced.progression.level, 9);
  assert.equal(advanced.progression.xp, 150);
});

test("setting more than one level of XP can advance multiple ship levels", () => {
  const ship = sloop({ progression: { level: 8, xp: 0, talentIds: [], arkcraftUpgrades: {} } });
  const advanced = setShipExperience(ship, 2450);
  assert.equal(advanced.progression.level, 10);
  assert.equal(advanced.progression.xp, 450);
});

test("ship XP stops advancing past level 20", () => {
  const ship = sloop({ progression: { level: 19, xp: 950, talentIds: [], arkcraftUpgrades: {} } });
  const advanced = addShipExperience(ship, 500);
  const view = shipExperienceView(advanced);
  assert.equal(view.level, 20);
  assert.equal(view.nextLevel, null);
  assert.equal(view.atMaximum, true);
});

test("GM reset lowers ship level and clears current XP", () => {
  const ship = sloop({ progression: { level: 9, xp: 640, talentIds: ["toughness", "engineers-vessel"], arkcraftUpgrades: {} } });
  const result = resetShipLevel(ship, 5);
  assert.equal(result.previousLevel, 9);
  assert.equal(result.level, 5);
  assert.equal(result.ship.progression.level, 5);
  assert.equal(result.ship.progression.xp, 0);
  assert.deepEqual(result.ship.progression.talentIds, ["toughness", "engineers-vessel"]);
  assert.equal(validateProgression(result.ship).ok, true);
});

test("GM can reset a ship all the way to level 1", () => {
  const ship = sloop({ progression: { level: 9, xp: 640, talentIds: ["toughness", "engineers-vessel", "responsive-rigging"], arkcraftUpgrades: {} } });
  const result = resetShipLevel(ship, 1);
  assert.equal(result.level, 1);
  assert.equal(result.ship.progression.level, 1);
  assert.equal(result.ship.progression.xp, 0);
  assert.equal(validateProgression(result.ship).ok, true);
  assert.ok(result.ship.progression.talentIds.length <= 2);
});

test("GM reset refunds talents from tiers no longer unlocked", () => {
  const ship = sloop({ progression: { level: 8, xp: 200, talentIds: ["toughness", "responsive-rigging", "expanded-tactical-doctrine"], arkcraftUpgrades: {} } });
  const result = resetShipLevel(ship, 5);
  assert.deepEqual(result.ship.progression.talentIds, ["toughness"]);
  assert.deepEqual([...result.refundedTalentIds].sort(), ["expanded-tactical-doctrine", "responsive-rigging"].sort());
  assert.equal(validateProgression(result.ship).ok, true);
});

test("GM reset refunds newest legal talents until the lower TP budget is legal", () => {
  const ship = sloop({ progression: { level: 5, xp: 500, talentIds: ["toughness", "engineers-vessel", "voyage-trained", "battle-trained"], arkcraftUpgrades: {} } });
  const result = resetShipLevel(ship, 2);
  assert.equal(result.ship.progression.level, 2);
  assert.equal(result.ship.progression.xp, 0);
  assert.deepEqual(result.ship.progression.talentIds, ["toughness", "engineers-vessel"]);
  assert.deepEqual(result.refundedTalentIds, ["battle-trained", "voyage-trained"]);
  assert.equal(validateProgression(result.ship).ok, true);
});

test("Foundation toughness scales from base Hull percentage", () => {
  const ship = sloop({ progression: { level: 2, talentIds: ["toughness"], arkcraftUpgrades: {} } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  assert.equal(SHIP_CATALOGS.hulls.sloop.data.baseStats.hullIntegrity, 90);
  assert.equal(derived.stats.hullIntegrity, 99);
});

test("station and Voyage bonuses stack", () => {
  const ship = sloop({ progression: { level: 5, talentIds: ["engineers-vessel", "voyage-trained"], arkcraftUpgrades: {} } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  assert.equal(derived.stats.stationBonuses.engineer, 1);
  assert.equal(derived.stats.pillarBonuses.voyage, 1);
});

test("Specialist mechanics are locked before level 6", () => {
  const ship = sloop({ progression: { level: 5, talentIds: ["responsive-rigging"], arkcraftUpgrades: {} } });
  const check = validateProgression(ship);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /Specialist/);
});

test("Maneuverability is the single handling stat", () => {
  const ship = sloop({ progression: { level: 6, talentIds: ["responsive-rigging"], arkcraftUpgrades: {} } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  assert.equal(derived.stats.maneuverability, 4);
  assert.equal("facingAllowance" in derived.stats, false);
});

test("Legendary Action and Reaction talents affect combat profile", () => {
  const ship = sloop({ progression: { level: 15, talentIds: ["expanded-action-economy", "expanded-reaction-economy"], arkcraftUpgrades: {} } });
  const profile = hullCombatProfile(ship);
  assert.equal(profile.actions, 4);
  assert.equal(profile.reactions, 2);
});

test("progression budget rejects overspending", () => {
  const ship = sloop({ progression: { level: 1, talentIds: ["voyage-trained", "battle-trained"], arkcraftUpgrades: {} } });
  const check = validateProgression(ship);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /spends 4 TP/);
});

test("Specialist Arkcraft talent adds a selectable technique", () => {
  const ship = sloop({ progression: { level: 6, talentIds: ["advanced-captain-arkcraft"], arkcraftUpgrades: {} } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  assert.ok(derived.stationCapabilities.captain.masteries.includes("captain-command-the-moment"));
  assert.equal(getMasteryTechnique("captain", "captain-command-the-moment")?.name, "Command the Moment");
});

test("typed progression mod slot supports matching overflow", () => {
  const ship = sloop({
    progression: { level: 6, talentIds: ["expanded-structural-bay"], arkcraftUpgrades: {} },
    shipMods: ["reinforced-bulkhead-network", "deep-void-reinforcement", "arc-conduit-stabilizers"]
  });
  const check = validateShip(ship, SHIP_CATALOGS);
  assert.equal(check.ok, true, check.errors.join(" "));
});

test("typed progression mod slot rejects nonmatching overflow", () => {
  const ship = sloop({
    progression: { level: 6, talentIds: ["expanded-structural-bay"], arkcraftUpgrades: {} },
    shipMods: ["deep-void-reinforcement", "arc-conduit-stabilizers", "occult-signal-refractors"]
  });
  const check = validateShip(ship, SHIP_CATALOGS);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /typed Ship Mod slots/);
});