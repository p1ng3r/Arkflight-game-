export const DERIVED_STAT_KINDS = Object.freeze({
  NUMBER: "number",
  STRUCTURED: "structured"
});

function stat(path, { label, category, defaultValue = 0, kind = DERIVED_STAT_KINDS.NUMBER, effectTarget = true } = {}) {
  return Object.freeze({ path, label: label ?? path, category: category ?? "general", defaultValue, kind, effectTarget });
}

export const DERIVED_STAT_REGISTRY = Object.freeze({
  armorClass: stat("armorClass", { label: "Armor Class", category: "defense" }),
  hardness: stat("hardness", { label: "Hardness", category: "defense" }),
  hullIntegrity: stat("hullIntegrity", { label: "Hull Integrity", category: "survival" }),
  lifeveilCapacity: stat("lifeveilCapacity", { label: "Lifeveil Capacity", category: "lifeveil" }),
  strainCapacity: stat("strainCapacity", { label: "Strain Capacity", category: "arkengine" }),
  cargoCapacity: stat("cargoCapacity", { label: "Cargo Capacity", category: "logistics" }),
  detection: stat("detection", { label: "Detection", category: "battlewatch" }),
  combatSpeed: stat("combatSpeed", { label: "Combat Speed", category: "mobility" }),
  maneuverability: stat("maneuverability", { label: "Maneuverability", category: "mobility" }),
  weaponAttackBonus: stat("weaponAttackBonus", { label: "Weapon Attack Bonus", category: "weapons" }),
  defensiveCheckBonus: stat("defensiveCheckBonus", { label: "Defensive Check Bonus", category: "defense" }),
  repairCheckBonus: stat("repairCheckBonus", { label: "Repair Check Bonus", category: "repair" }),
  repairTimePercent: stat("repairTimePercent", { label: "Repair Time Modifier %", category: "repair" }),
  repairSupplyPercent: stat("repairSupplyPercent", { label: "Repair Supply Modifier %", category: "repair" }),
  supplyUsePercent: stat("supplyUsePercent", { label: "Supply Use Modifier %", category: "logistics" }),
  roomCapacity: stat("roomCapacity", { label: "Room Capacity", category: "fittings" }),
  shipModCapacity: stat("shipModCapacity", { label: "Ship Mod Capacity", category: "fittings" }),
  arkengineModCapacity: stat("arkengineModCapacity", { label: "Arkengine Mod Capacity", category: "arkengine" }),
  crewTacticCapacity: stat("crewTacticCapacity", { label: "Crew Tactic Capacity", category: "crew" }),
  actionBonus: stat("actionBonus", { label: "Combat Action Bonus", category: "combat" }),
  reactionBonus: stat("reactionBonus", { label: "Combat Reaction Bonus", category: "combat" }),
  allStationBonus: stat("allStationBonus", { label: "All Station Bonus", category: "stations" }),
  arkcraftUpgradeChoices: stat("arkcraftUpgradeChoices", { label: "Arkcraft Upgrade Choices", category: "progression" }),
  legendaryArkcraftUpgradeChoices: stat("legendaryArkcraftUpgradeChoices", { label: "Legendary Arkcraft Upgrade Choices", category: "progression" }),
  mythicCapabilityCount: stat("mythicCapabilityCount", { label: "Mythic Capability Count", category: "progression" }),
  supplyCapacity: stat("supplyCapacity", { label: "Supply Capacity", category: "logistics" }),
  moraleCapacity: stat("moraleCapacity", { label: "Morale Capacity", category: "crew" }),
  arkengineFuelSlots: stat("arkengineFuelSlots", { label: "Arkengine Fuel Slots", category: "arkengine" }),
  hardBurnStrainCost: stat("hardBurnStrainCost", { label: "Hard Burn Strain Cost", category: "arkengine" }),
  voyageSpeedTravelHexDays: stat("voyageSpeedTravelHexDays", { label: "Voyage Travel Time", category: "mobility" }),

  "crew.minimum": stat("crew.minimum", { label: "Minimum Operating Crew", category: "crew" }),
  "crew.recommended": stat("crew.recommended", { label: "Recommended Crew", category: "crew" }),
  "crew.maximum": stat("crew.maximum", { label: "Maximum Persons Aboard", category: "crew" }),

  crew: stat("crew", { label: "Crew Limits", category: "crew", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({ minimum: 0, recommended: 0, maximum: 0 }), effectTarget: false }),
  weaponMounts: stat("weaponMounts", { label: "Weapon Mounts", category: "weapons", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({}), effectTarget: false }),
  physicalResistances: stat("physicalResistances", { label: "Physical Resistances", category: "defense", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({ bludgeoning: 0, piercing: 0, slashing: 0 }), effectTarget: false })
});

export const DERIVED_STAT_PATHS = Object.freeze(Object.keys(DERIVED_STAT_REGISTRY));
export const EFFECT_TARGET_PATHS = Object.freeze(DERIVED_STAT_PATHS.filter((path) => DERIVED_STAT_REGISTRY[path].effectTarget));

export function derivedStatDefinition(path) {
  return DERIVED_STAT_REGISTRY[path] ?? null;
}

export function isCanonicalDerivedStat(path) {
  return Boolean(derivedStatDefinition(path));
}

export function isCanonicalEffectTarget(path) {
  return Boolean(derivedStatDefinition(path)?.effectTarget);
}

export function assertCanonicalEffectTarget(path) {
  if (!isCanonicalEffectTarget(path)) {
    throw new Error(`Unknown Arkflight derived-stat effect target: ${path}`);
  }
  return path;
}

export function createDefaultDerivedStats() {
  const result = {};
  for (const definition of Object.values(DERIVED_STAT_REGISTRY)) {
    if (definition.path.includes(".")) continue;
    result[definition.path] = structuredClone(definition.defaultValue);
  }
  return result;
}

export function validateComponentEffectTargets(component) {
  const invalidTargets = [];
  for (const effect of component?.effects ?? []) {
    if (effect?.target == null) continue;
    if (!isCanonicalEffectTarget(effect.target)) invalidTargets.push(effect.target);
  }
  return Object.freeze({
    ok: invalidTargets.length === 0,
    invalidTargets: Object.freeze(invalidTargets)
  });
}
