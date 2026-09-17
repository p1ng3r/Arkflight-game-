import test from "node:test";
import assert from "node:assert/strict";

import {
  addFlexibleExpeditionEquipment,
  expeditionHasCapability,
  expeditionHasEquipment,
  expeditionHasSpecialist,
  expeditionRequirementStatus,
  normalizeExpedition
} from "../src/expedition/expedition-rules.js";

test("light Expedition state tracks specialists equipment supplies and faction context", () => {
  const expedition = normalizeExpedition({
    active: true,
    name: "Levstone Ruins",
    specialistIds: ["old-star-cartographer", "hull-patcher"],
    equipment: ["Survey Crystals", { name: "Portable Forge", virtual: false }],
    suppliesCommitted: 4,
    faction: "Great House Orison",
    capabilities: ["we-brought-one"]
  });
  assert.equal(expedition.active, true);
  assert.equal(expedition.suppliesCommitted, 4);
  assert.equal(expeditionHasSpecialist(expedition, "old-star-cartographer"), true);
  assert.equal(expeditionHasEquipment(expedition, "survey crystals"), true);
  assert.equal(expeditionHasCapability(expedition, "we-brought-one"), true);
});

test("Expedition requirements are queryable by authored Events", () => {
  const expedition = normalizeExpedition({
    active: true,
    specialistIds: ["old-star-cartographer"],
    equipment: ["Survey Crystals"],
    capabilities: ["survey-doctrine"]
  });
  assert.equal(expeditionRequirementStatus(expedition, { specialistId: "old-star-cartographer", equipment: "Survey Crystals" }).ok, true);
  assert.deepEqual(expeditionRequirementStatus(expedition, { specialistId: "shipboard-surgeon" }).missing, ["specialist"]);
});

test("We Brought One satisfies one missing equipment requirement only once", () => {
  const expedition = normalizeExpedition({ active: true, capabilities: ["we-brought-one"], equipment: [] });
  const first = addFlexibleExpeditionEquipment(expedition, "Portable Aether Drill");
  assert.equal(first.ok, true);
  assert.equal(first.expedition.flexibleEquipmentUsed, true);
  assert.equal(expeditionHasEquipment(first.expedition, "Portable Aether Drill"), true);
  assert.equal(first.expedition.equipment[0].virtual, true);
  assert.equal(addFlexibleExpeditionEquipment(first.expedition, "Climbing Rig").reason, "already-used");
});
