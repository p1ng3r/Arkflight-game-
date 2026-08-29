import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { talentPointsForLevel, validateProgression } from "../src/ship/progression.js";
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

test("talent point milestones grant bonus TP at 5/10/15/20", () => {
  assert.equal(talentPointsForLevel(1), 1);
  assert.equal(talentPointsForLevel(5), 6);
  assert.equal(talentPointsForLevel(10), 12);
  assert.equal(talentPointsForLevel(15), 18);
  assert.equal(talentPointsForLevel(20), 24);
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
  const ship = sloop({ progression: { level: 1, talentIds: ["voyage-trained"], arkcraftUpgrades: {} } });
  const check = validateProgression(ship);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /spends 2 TP/);
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
