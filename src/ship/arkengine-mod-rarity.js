export const ARKENGINE_MOD_RARITIES = Object.freeze([
  "standard",
  "rare",
  "epic",
  "legendary",
  "mythic"
]);

export const ARKENGINE_MOD_RARITY_RULES = Object.freeze({
  standard: Object.freeze({ rank: 0, label: "Standard", minShipLevel: 1, alphaTarget: Object.freeze({ min: 18, max: 22 }), acquisition: "ordinary" }),
  rare: Object.freeze({ rank: 1, label: "Rare", minShipLevel: 3, alphaTarget: Object.freeze({ min: 14, max: 16 }), acquisition: "restricted" }),
  epic: Object.freeze({ rank: 2, label: "Epic", minShipLevel: 7, alphaTarget: Object.freeze({ min: 10, max: 12 }), acquisition: "exceptional" }),
  legendary: Object.freeze({ rank: 3, label: "Legendary", minShipLevel: 12, alphaTarget: Object.freeze({ min: 7, max: 8 }), acquisition: "legendary-source" }),
  mythic: Object.freeze({ rank: 4, label: "Mythic", minShipLevel: 17, alphaTarget: Object.freeze({ min: 4, max: 5 }), acquisition: "unique-campaign-reward" })
});

export const ARKENGINE_MOD_EFFECT_FAMILIES = Object.freeze([
  "power-output",
  "strain",
  "hard-burn",
  "fuel",
  "lifeveil",
  "cooling",
  "stability",
  "travel-speed",
  "emergency-power",
  "stealth",
  "deep-void",
  "ritual",
  "cross-system"
]);

export const ARKENGINE_MOD_SYNERGY_RULES = Object.freeze({
  normalTotalMods: 2,
  epicPlusSetBonusTotalMods: 3,
  threeModSetBonusMinRarity: "epic",
  shipModCrossSynergyAllowed: true
});

export function arkengineModRarityRule(rarity = "standard") {
  return ARKENGINE_MOD_RARITY_RULES[rarity] ?? ARKENGINE_MOD_RARITY_RULES.standard;
}

export function arkengineModAlphaTarget(rarity = "standard") {
  return arkengineModRarityRule(rarity).alphaTarget;
}

export function arkengineModAvailableAtLevel(mod, shipLevel) {
  const level = Math.max(1, Math.min(20, Math.trunc(Number(shipLevel) || 1)));
  const rarity = mod?.data?.rarity ?? "standard";
  const authoredOverride = Number(mod?.data?.minShipLevel);
  const minShipLevel = Number.isFinite(authoredOverride)
    ? Math.max(1, Math.min(20, Math.trunc(authoredOverride)))
    : arkengineModRarityRule(rarity).minShipLevel;
  return level >= minShipLevel;
}

export function arkengineModRequiredPredecessors(mod) {
  return Object.freeze([...(mod?.data?.upgradeChain?.requiresArkengineMods ?? [])]);
}

export function arkengineModUpgradeReplacement(mod) {
  const requires = arkengineModRequiredPredecessors(mod);
  const mode = mod?.data?.upgradeChain?.mode ?? (requires.length ? "replace" : "standalone");
  const replaces = Object.freeze([...(mod?.data?.upgradeChain?.replaces ?? requires)]);
  return Object.freeze({ mode, replaces, inheritsSlot: mode === "replace" && replaces.length > 0 });
}

export function arkengineModPrerequisitesMet(mod, installedArkengineModIds = []) {
  const installed = new Set(installedArkengineModIds ?? []);
  return arkengineModRequiredPredecessors(mod).every((id) => installed.has(id));
}

export function activeArkengineModSynergies(mod, { installedArkengineModIds = [], installedShipModIds = [] } = {}) {
  const engine = new Set(installedArkengineModIds ?? []);
  const ship = new Set(installedShipModIds ?? []);
  if (mod?.id) engine.add(mod.id);
  return Object.freeze((mod?.data?.synergies ?? []).filter((synergy) => {
    const requiredEngine = synergy?.requiresArkengineMods ?? [];
    const requiredShip = synergy?.requiresShipMods ?? [];
    return Array.isArray(requiredEngine) && Array.isArray(requiredShip) &&
      requiredEngine.every((id) => engine.has(id)) &&
      requiredShip.every((id) => ship.has(id));
  }));
}

export function arkengineModInstallEligibility(mod, { shipLevel = 1, installedArkengineModIds = [] } = {}) {
  const errors = [];
  if (!arkengineModAvailableAtLevel(mod, shipLevel)) errors.push("ship-level-too-low");
  if (!arkengineModPrerequisitesMet(mod, installedArkengineModIds)) errors.push("missing-required-mod");
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
    mod?.data?.ruleModifiers?.length ||
    mod?.data?.synergies?.length ||
    mod?.data?.fuelHooks?.length
  );
}

export function validateArkengineModProgression(mod) {
  const errors = [];
  const rarity = mod?.data?.rarity;
  if (!ARKENGINE_MOD_RARITIES.includes(rarity)) errors.push("invalid-rarity");

  const minShipLevel = Number(mod?.data?.minShipLevel);
  if (!Number.isInteger(minShipLevel) || minShipLevel < 1 || minShipLevel > 20) {
    errors.push("invalid-min-ship-level");
  } else if (ARKENGINE_MOD_RARITIES.includes(rarity) && minShipLevel < ARKENGINE_MOD_RARITY_RULES[rarity].minShipLevel) {
    errors.push("rarity-level-gate-too-low");
  }

  if (!hasMechanicalPurpose(mod)) errors.push("no-mechanical-purpose");

  const family = mod?.data?.effectFamily;
  if (!ARKENGINE_MOD_EFFECT_FAMILIES.includes(family)) errors.push("invalid-effect-family");

  const requires = mod?.data?.upgradeChain?.requiresArkengineMods ?? [];
  if (!Array.isArray(requires)) errors.push("invalid-upgrade-requirements");
  else {
    if (requires.includes(mod?.id)) errors.push("self-requiring-upgrade");
    if (new Set(requires).size !== requires.length) errors.push("duplicate-upgrade-requirement");
  }
  if (requires.length) {
    const replacement = arkengineModUpgradeReplacement(mod);
    if (replacement.mode !== "replace") errors.push("upgrade-chain-must-replace");
    if (!replacement.inheritsSlot) errors.push("upgrade-chain-must-inherit-slot");
  }

  const synergies = mod?.data?.synergies ?? [];
  if (!Array.isArray(synergies)) errors.push("invalid-synergies");
  else {
    for (const synergy of synergies) {
      if (!synergy?.id) { errors.push("invalid-synergy-definition"); continue; }
      const engine = synergy.requiresArkengineMods ?? [];
      const ship = synergy.requiresShipMods ?? [];
      if (!Array.isArray(engine) || !Array.isArray(ship)) { errors.push("invalid-synergy-definition"); continue; }
      if (engine.includes(mod?.id)) errors.push("self-requiring-synergy");
      const total = 1 + engine.length + ship.length;
      if (total < 2) errors.push("invalid-synergy-definition");
      if (total >= 3 && ARKENGINE_MOD_RARITIES.includes(rarity) && ARKENGINE_MOD_RARITY_RULES[rarity].rank < ARKENGINE_MOD_RARITY_RULES.epic.rank) {
        errors.push("three-mod-synergy-below-epic");
      }
      if (!(synergy.effects?.length || synergy.capabilities?.length || synergy.ruleModifiers?.length || synergy.unlocks?.length)) {
        errors.push("synergy-without-bonus");
      }
    }
  }

  const fuelHooks = mod?.data?.fuelHooks ?? [];
  if (!Array.isArray(fuelHooks)) errors.push("invalid-fuel-hooks");
  else for (const hook of fuelHooks) {
    if (!hook?.kind || typeof hook.kind !== "string") errors.push("invalid-fuel-hook");
  }

  if (rarity === "mythic" && mod?.data?.coreRuleException) {
    const exception = mod.data.coreRuleException;
    if (!exception.limit && !exception.cost && !exception.trigger && !exception.usage) {
      errors.push("unbounded-mythic-rule-exception");
    }
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
