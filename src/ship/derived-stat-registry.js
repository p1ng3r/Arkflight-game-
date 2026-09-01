export const DERIVED_STAT_KINDS = Object.freeze({
  NUMBER: "number",
  STRUCTURED: "structured"
});

export const DERIVED_STAT_PRESENTATION = Object.freeze({
  PRIMARY: "primary",
  OPERATIONAL: "operational",
  TECHNICAL: "technical",
  HIDDEN: "hidden"
});

function stat(path, { label, category, presentation = DERIVED_STAT_PRESENTATION.TECHNICAL, defaultValue = 0, kind = DERIVED_STAT_KINDS.NUMBER, effectTarget = true, min = null } = {}) {
  return Object.freeze({ path, label: label ?? path, category: category ?? "general", presentation, defaultValue, kind, effectTarget, min });
}

export const DERIVED_STAT_REGISTRY = Object.freeze({
  armorClass: stat("armorClass", { label: "Armor Class", category: "defense", presentation: "primary" }),
  hardness: stat("hardness", { label: "Hardness", category: "defense", presentation: "operational", min: 0 }),
  hullIntegrity: stat("hullIntegrity", { label: "Hull Integrity", category: "survival", presentation: "primary", min: 0 }),
  lifeveilCapacity: stat("lifeveilCapacity", { label: "Lifeveil Capacity", category: "lifeveil", presentation: "primary", min: 0 }),
  strainCapacity: stat("strainCapacity", { label: "Strain Capacity", category: "arkengine", presentation: "primary", min: 0 }),
  cargoCapacity: stat("cargoCapacity", { label: "Cargo Capacity", category: "logistics", presentation: "primary", min: 0 }),
  detection: stat("detection", { label: "Detection", category: "battlewatch", presentation: "primary" }),
  combatSpeed: stat("combatSpeed", { label: "Combat Speed", category: "mobility", presentation: "primary", min: 0 }),
  maneuverability: stat("maneuverability", { label: "Maneuverability", category: "mobility", presentation: "primary" }),
  weaponAttackBonus: stat("weaponAttackBonus", { label: "Weapon Attack Bonus", category: "weapons", presentation: "operational" }),
  defensiveCheckBonus: stat("defensiveCheckBonus", { label: "Defensive Check Bonus", category: "defense", presentation: "operational" }),
  repairCheckBonus: stat("repairCheckBonus", { label: "Repair Check Bonus", category: "repair", presentation: "operational" }),
  repairTimePercent: stat("repairTimePercent", { label: "Repair Time Modifier %", category: "repair", presentation: "technical" }),
  repairSupplyPercent: stat("repairSupplyPercent", { label: "Repair Supply Modifier %", category: "repair", presentation: "technical" }),
  supplyUsePercent: stat("supplyUsePercent", { label: "Supply Use Modifier %", category: "logistics", presentation: "technical" }),
  roomCapacity: stat("roomCapacity", { label: "Room Capacity", category: "fittings", presentation: "operational", min: 0 }),
  shipModCapacity: stat("shipModCapacity", { label: "Ship Mod Capacity", category: "fittings", presentation: "operational", min: 0 }),
  arkengineModCapacity: stat("arkengineModCapacity", { label: "Arkengine Mod Capacity", category: "arkengine", presentation: "operational", min: 0 }),
  crewTacticCapacity: stat("crewTacticCapacity", { label: "Crew Tactic Capacity", category: "crew", presentation: "operational", min: 0 }),
  actionBonus: stat("actionBonus", { label: "Combat Action Bonus", category: "combat", presentation: "technical" }),
  reactionBonus: stat("reactionBonus", { label: "Combat Reaction Bonus", category: "combat", presentation: "technical" }),
  allStationBonus: stat("allStationBonus", { label: "All Station Bonus", category: "stations", presentation: "technical" }),
  arkcraftUpgradeChoices: stat("arkcraftUpgradeChoices", { label: "Arkcraft Upgrade Choices", category: "progression", presentation: "hidden", min: 0 }),
  legendaryArkcraftUpgradeChoices: stat("legendaryArkcraftUpgradeChoices", { label: "Legendary Arkcraft Upgrade Choices", category: "progression", presentation: "hidden", min: 0 }),
  mythicCapabilityCount: stat("mythicCapabilityCount", { label: "Mythic Capability Count", category: "progression", presentation: "hidden", min: 0 }),
  supplyCapacity: stat("supplyCapacity", { label: "Supply Capacity", category: "logistics", presentation: "operational", min: 0 }),
  moraleCapacity: stat("moraleCapacity", { label: "Morale Capacity", category: "crew", presentation: "operational", min: 0 }),
  arkengineFuelSlots: stat("arkengineFuelSlots", { label: "Arkengine Fuel Slots", category: "arkengine", presentation: "technical", min: 0 }),
  hardBurnStrainCost: stat("hardBurnStrainCost", { label: "Hard Burn Strain Cost", category: "arkengine", presentation: "technical", min: 0 }),
  voyageSpeedTravelHexDays: stat("voyageSpeedTravelHexDays", { label: "Voyage Travel Time", category: "mobility", presentation: "technical", min: 0 }),

  "crew.minimum": stat("crew.minimum", { label: "Minimum Operating Crew", category: "crew", presentation: "operational", min: 0 }),
  "crew.recommended": stat("crew.recommended", { label: "Recommended Crew", category: "crew", presentation: "operational", min: 0 }),
  "crew.maximum": stat("crew.maximum", { label: "Maximum Persons Aboard", category: "crew", presentation: "operational", min: 0 }),

  crew: stat("crew", { label: "Crew Limits", category: "crew", presentation: "operational", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({ minimum: 0, recommended: 0, maximum: 0 }), effectTarget: false }),
  weaponMounts: stat("weaponMounts", { label: "Weapon Mounts", category: "weapons", presentation: "operational", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({}), effectTarget: false }),
  physicalResistances: stat("physicalResistances", { label: "Legacy Physical Resistances", category: "defense", presentation: "hidden", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({ bludgeoning: 0, piercing: 0, slashing: 0 }), effectTarget: false }),
  resistances: stat("resistances", { label: "Resistances", category: "defense", presentation: "operational", kind: DERIVED_STAT_KINDS.STRUCTURED, defaultValue: Object.freeze({ values: Object.freeze({}), conditional: Object.freeze([]) }), effectTarget: false })
});

export const DERIVED_STAT_PATHS = Object.freeze(Object.keys(DERIVED_STAT_REGISTRY));
export const EFFECT_TARGET_PATHS = Object.freeze(DERIVED_STAT_PATHS.filter((path) => DERIVED_STAT_REGISTRY[path].effectTarget));

export function derivedStatDefinition(path) { return DERIVED_STAT_REGISTRY[path] ?? null; }
export function isCanonicalDerivedStat(path) { return Boolean(derivedStatDefinition(path)); }
export function isCanonicalEffectTarget(path) { return Boolean(derivedStatDefinition(path)?.effectTarget); }
export function assertCanonicalEffectTarget(path) {
  if (!isCanonicalEffectTarget(path)) throw new Error(`Unknown Arkflight derived-stat effect target: ${path}`);
  return path;
}

function getPath(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) { const keys = path.split("."); const last = keys.pop(); let cursor = object; for (const key of keys) cursor = cursor[key] ??= {}; cursor[last] = value; }

export function createDefaultDerivedStats() {
  const result = {};
  for (const definition of Object.values(DERIVED_STAT_REGISTRY)) {
    if (definition.path.includes(".")) continue;
    result[definition.path] = structuredClone(definition.defaultValue);
  }
  return result;
}

export function normalizeDerivedStats(stats = {}) {
  const result = structuredClone(stats);
  for (const definition of Object.values(DERIVED_STAT_REGISTRY)) {
    if (definition.kind !== DERIVED_STAT_KINDS.NUMBER || definition.min == null) continue;
    const value = Number(getPath(result, definition.path));
    if (Number.isFinite(value) && value < definition.min) setPath(result, definition.path, definition.min);
  }
  return result;
}

export function derivedStatsByPresentation(presentation) {
  return Object.freeze(Object.values(DERIVED_STAT_REGISTRY).filter((definition) => definition.presentation === presentation));
}

export function deriveResistanceProfile(basePhysical = {}, components = []) {
  const values = {};
  for (const [type, rawValue] of Object.entries(basePhysical ?? {})) {
    const value = Math.max(0, Math.trunc(Number(rawValue) || 0));
    if (value > 0) values[type] = Math.max(values[type] ?? 0, value);
  }
  const conditional = [];
  for (const component of components ?? []) {
    for (const resistance of component?.data?.resistances ?? []) {
      const type = resistance?.type;
      const value = Math.max(0, Math.trunc(Number(resistance?.value) || 0));
      if (!type || value <= 0) continue;
      if (resistance.condition) conditional.push(Object.freeze({ type, value, condition: String(resistance.condition), sourceId: component.id ?? null }));
      else values[type] = Math.max(values[type] ?? 0, value);
    }
  }
  return Object.freeze({ values: Object.freeze({ ...values }), conditional: Object.freeze(conditional) });
}

export function validateComponentEffectTargets(component) {
  const invalidTargets = [];
  for (const effect of component?.effects ?? []) {
    if (effect?.target == null) continue;
    if (!isCanonicalEffectTarget(effect.target)) invalidTargets.push(effect.target);
  }
  return Object.freeze({ ok: invalidTargets.length === 0, invalidTargets: Object.freeze(invalidTargets) });
}
