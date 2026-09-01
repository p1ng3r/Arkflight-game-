export const SHIP_MOD_RARITIES = Object.freeze([
  "standard",
  "rare",
  "epic",
  "legendary",
  "mythic"
]);

export const SHIP_MOD_RARITY_RULES = Object.freeze({
  standard: Object.freeze({ rank: 0, label: "Standard", minShipLevel: 1, alphaTarget: Object.freeze({ min: 22, max: 26 }), acquisition: "ordinary" }),
  rare: Object.freeze({ rank: 1, label: "Rare", minShipLevel: 3, alphaTarget: Object.freeze({ min: 20, max: 22 }), acquisition: "restricted" }),
  epic: Object.freeze({ rank: 2, label: "Epic", minShipLevel: 7, alphaTarget: Object.freeze({ min: 18, max: 20 }), acquisition: "exceptional" }),
  legendary: Object.freeze({ rank: 3, label: "Legendary", minShipLevel: 12, alphaTarget: Object.freeze({ min: 15, max: 16 }), acquisition: "legendary-source" }),
  mythic: Object.freeze({ rank: 4, label: "Mythic", minShipLevel: 17, alphaTarget: Object.freeze({ min: 8, max: 9 }), acquisition: "unique-campaign-reward" })
});

export const SHIP_MOD_ACQUISITION_RULES = Object.freeze({
  standard: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  rare: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  epic: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  legendary: Object.freeze({ ordinaryPurchaseAllowed: false, exceptionalSourceRequired: true }),
  mythic: Object.freeze({ ordinaryPurchaseAllowed: false, exceptionalSourceRequired: true })
});

export const SHIP_MOD_EFFECT_FAMILIES = Object.freeze([
  "hull",
  "arkengine",
  "rigging",
  "lifeveil",
  "morale-command",
  "armor-class",
  "resistance",
  "maneuverability",
  "speed",
  "cargo",
  "detection",
  "crew-support",
  "recovery-repair",
  "combat",
  "voyage-event",
  "logistics",
  "cross-system"
]);

export const SHIP_MOD_SYNERGY_RULES = Object.freeze({
  normalRequiredMods: 2,
  epicPlusSetBonusRequiredMods: 3,
  threeModSetBonusMinRarity: "epic"
});

export const SHIP_RESISTANCE_TYPES = Object.freeze([
  "acid",
  "cold",
  "electricity",
  "fire",
  "force",
  "mental",
  "poison",
  "sonic",
  "physical",
  "bludgeoning",
  "piercing",
  "slashing",
  "void"
]);

export function shipModRarityRule(rarity = "standard") {
  return SHIP_MOD_RARITY_RULES[rarity] ?? SHIP_MOD_RARITY_RULES.standard;
}

export function shipModAvailableAtLevel(mod, shipLevel) {
  const level = Math.max(1, Math.min(20, Math.trunc(Number(shipLevel) || 1)));
  const rarity = mod?.data?.rarity ?? "standard";
  const authoredOverride = Number(mod?.data?.minShipLevel);
  const minShipLevel = Number.isFinite(authoredOverride)
    ? Math.max(1, Math.min(20, Math.trunc(authoredOverride)))
    : shipModRarityRule(rarity).minShipLevel;
  return level >= minShipLevel;
}

export function shipModAlphaTarget(rarity = "standard") {
  return shipModRarityRule(rarity).alphaTarget;
}

export function shipModOrdinaryPurchaseAllowed(rarity = "standard") {
  return SHIP_MOD_ACQUISITION_RULES[rarity]?.ordinaryPurchaseAllowed ?? false;
}

export function shipModRequiredPredecessors(mod) {
  return Object.freeze([...(mod?.data?.upgradeChain?.requiresMods ?? [])]);
}

export function shipModPrerequisitesMet(mod, installedModIds = []) {
  const installed = new Set(installedModIds ?? []);
  return shipModRequiredPredecessors(mod).every((id) => installed.has(id));
}

export function shipModUpgradeReplacement(mod) {
  const requiresMods = shipModRequiredPredecessors(mod);
  const replacementMode = mod?.data?.upgradeChain?.mode ?? (requiresMods.length ? "replace" : "standalone");
  const replaces = Object.freeze([...(mod?.data?.upgradeChain?.replaces ?? requiresMods)]);
  return Object.freeze({
    mode: replacementMode,
    replaces,
    inheritsSlot: replacementMode === "replace" && replaces.length > 0
  });
}

export function activeShipModSynergies(mod, installedModIds = []) {
  const installed = new Set(installedModIds ?? []);
  return Object.freeze((mod?.data?.synergies ?? []).filter((synergy) =>
    Array.isArray(synergy?.requiresMods) &&
    synergy.requiresMods.length > 0 &&
    synergy.requiresMods.every((id) => installed.has(id))
  ));
}

export function shipModInstallEligibility(mod, { shipLevel = 1, installedModIds = [] } = {}) {
  const errors = [];
  if (!shipModAvailableAtLevel(mod, shipLevel)) errors.push("ship-level-too-low");
  if (!shipModPrerequisitesMet(mod, installedModIds)) errors.push("missing-required-mod");
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

function hasMechanicalPurpose(mod) {
  return Boolean(
    mod?.effects?.length ||
    mod?.capabilities?.length ||
    mod?.unlocks?.actions?.length ||
    mod?.unlocks?.masteries?.length ||
    mod?.unlocks?.combatActions?.length ||
    mod?.unlocks?.passiveEffects?.length ||
    mod?.unlocks?.signatures?.length ||
    Object.values(mod?.unlocks?.stations ?? {}).some((entry) =>
      entry?.masteries?.length || entry?.combatActions?.length || entry?.passiveEffects?.length
    ) ||
    mod?.data?.ruleModifiers?.length ||
    mod?.data?.synergies?.length ||
    mod?.data?.resistances?.length
  );
}

function validateResistance(resistance, errors) {
  if (!resistance || !SHIP_RESISTANCE_TYPES.includes(resistance.type)) {
    errors.push("invalid-resistance-type");
    return;
  }
  const value = Number(resistance.value);
  if (!Number.isInteger(value) || value <= 0) errors.push("invalid-resistance-value");
  if (resistance.condition != null && typeof resistance.condition !== "string") errors.push("invalid-resistance-condition");
}

export function validateShipModProgression(mod) {
  const errors = [];
  const rarity = mod?.data?.rarity;
  if (!SHIP_MOD_RARITIES.includes(rarity)) errors.push("invalid-rarity");

  const minShipLevel = Number(mod?.data?.minShipLevel);
  if (!Number.isInteger(minShipLevel) || minShipLevel < 1 || minShipLevel > 20) {
    errors.push("invalid-min-ship-level");
  } else if (SHIP_MOD_RARITIES.includes(rarity) && minShipLevel < SHIP_MOD_RARITY_RULES[rarity].minShipLevel) {
    errors.push("rarity-level-gate-too-low");
  }

  if (!hasMechanicalPurpose(mod)) errors.push("no-mechanical-purpose");

  const family = mod?.data?.effectFamily;
  if (family != null && !SHIP_MOD_EFFECT_FAMILIES.includes(family)) errors.push("invalid-effect-family");

  const requiresMods = mod?.data?.upgradeChain?.requiresMods ?? [];
  if (!Array.isArray(requiresMods)) errors.push("invalid-upgrade-requirements");
  else {
    if (requiresMods.includes(mod?.id)) errors.push("self-requiring-upgrade");
    if (new Set(requiresMods).size !== requiresMods.length) errors.push("duplicate-upgrade-requirement");
  }

  if (requiresMods.length) {
    const upgrade = shipModUpgradeReplacement(mod);
    if (upgrade.mode !== "replace") errors.push("upgrade-chain-must-replace");
    if (!upgrade.inheritsSlot) errors.push("upgrade-chain-must-inherit-slot");
    if (!upgrade.replaces.length) errors.push("upgrade-chain-missing-replacement");
  }

  const synergies = mod?.data?.synergies ?? [];
  if (!Array.isArray(synergies)) errors.push("invalid-synergies");
  else {
    for (const synergy of synergies) {
      if (!synergy?.id || !Array.isArray(synergy?.requiresMods) || synergy.requiresMods.length < 2) {
        errors.push("invalid-synergy-definition");
        continue;
      }
      if (synergy.requiresMods.includes(mod?.id)) errors.push("self-requiring-synergy");
      if (synergy.requiresMods.length >= 3 && SHIP_MOD_RARITIES.includes(rarity) && SHIP_MOD_RARITY_RULES[rarity].rank < SHIP_MOD_RARITY_RULES.epic.rank) {
        errors.push("three-mod-synergy-below-epic");
      }
      const hasBonus = Boolean(
        synergy?.effects?.length ||
        synergy?.capabilities?.length ||
        synergy?.ruleModifiers?.length ||
        synergy?.unlocks?.length
      );
      if (!hasBonus) errors.push("synergy-without-bonus");
    }
  }

  const resistances = mod?.data?.resistances ?? [];
  if (!Array.isArray(resistances)) errors.push("invalid-resistances");
  else for (const resistance of resistances) validateResistance(resistance, errors);

  if (rarity === "mythic" && mod?.data?.coreRuleException) {
    const exception = mod.data.coreRuleException;
    if (!exception.limit && !exception.cost && !exception.trigger && !exception.usage) {
      errors.push("unbounded-mythic-rule-exception");
    }
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
