export const SHIP_MOD_RARITIES = Object.freeze([
  "standard",
  "rare",
  "epic",
  "legendary",
  "mythic"
]);

export const SHIP_MOD_RARITY_RULES = Object.freeze({
  standard: Object.freeze({
    rank: 0,
    label: "Standard",
    minShipLevel: 1,
    alphaTarget: Object.freeze({ min: 22, max: 26 }),
    acquisition: "ordinary"
  }),
  rare: Object.freeze({
    rank: 1,
    label: "Rare",
    minShipLevel: 3,
    alphaTarget: Object.freeze({ min: 20, max: 22 }),
    acquisition: "restricted"
  }),
  epic: Object.freeze({
    rank: 2,
    label: "Epic",
    minShipLevel: 7,
    alphaTarget: Object.freeze({ min: 18, max: 20 }),
    acquisition: "exceptional"
  }),
  legendary: Object.freeze({
    rank: 3,
    label: "Legendary",
    minShipLevel: 12,
    alphaTarget: Object.freeze({ min: 15, max: 16 }),
    acquisition: "legendary-source"
  }),
  mythic: Object.freeze({
    rank: 4,
    label: "Mythic",
    minShipLevel: 17,
    alphaTarget: Object.freeze({ min: 8, max: 9 }),
    acquisition: "unique-campaign-reward"
  })
});

export const SHIP_MOD_ACQUISITION_RULES = Object.freeze({
  standard: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  rare: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  epic: Object.freeze({ ordinaryPurchaseAllowed: true, exceptionalSourceRequired: false }),
  legendary: Object.freeze({ ordinaryPurchaseAllowed: false, exceptionalSourceRequired: true }),
  mythic: Object.freeze({ ordinaryPurchaseAllowed: false, exceptionalSourceRequired: true })
});

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

  const hasMechanicalPurpose = Boolean(
    mod?.effects?.length ||
    mod?.capabilities?.length ||
    mod?.unlocks?.actions?.length ||
    mod?.unlocks?.masteries?.length ||
    mod?.unlocks?.combatActions?.length ||
    mod?.unlocks?.passiveEffects?.length ||
    mod?.unlocks?.signatures?.length ||
    Object.values(mod?.unlocks?.stations ?? {}).some((entry) =>
      entry?.masteries?.length || entry?.combatActions?.length || entry?.passiveEffects?.length
    )
  );
  if (!hasMechanicalPurpose) errors.push("no-mechanical-purpose");

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
