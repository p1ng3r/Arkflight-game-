import { generateEnemyShipPreview } from "./enemy-ship-generator.js";
import { generatePF2eOfficerActorDraft } from "./pf2e-officer-actor-draft.js";

const LOOT_SPLITS = Object.freeze({
  poor: Object.freeze({ personal: 0.25, cargo: 0.40, salvage: 0.35, multiplier: 0.55 }),
  standard: Object.freeze({ personal: 0.30, cargo: 0.40, salvage: 0.30, multiplier: 1.00 }),
  rich: Object.freeze({ personal: 0.30, cargo: 0.45, salvage: 0.25, multiplier: 1.35 }),
  treasure: Object.freeze({ personal: 0.20, cargo: 0.60, salvage: 0.20, multiplier: 1.75 })
});

export const ENEMY_REWARD_WEIGHTS = Object.freeze(["minor", "standard", "major", "hoard"]);

function clampLevel(value) { return Math.max(1, Math.min(20, Math.round(Number(value) || 1))); }

function automaticRewardWeight(config) {
  if (config.lootProfile === "treasure") return "hoard";
  if (config.lootProfile === "rich" || config.difficulty === "elite") return "major";
  if (config.lootProfile === "poor" && config.difficulty === "poor") return "minor";
  return "standard";
}

function lootContract(basePreview, input) {
  const partyLevel = clampLevel(input.partyLevel ?? basePreview.config.level);
  const split = LOOT_SPLITS[basePreview.config.lootProfile] ?? LOOT_SPLITS.standard;
  const automatic = automaticRewardWeight(basePreview.config);
  const requested = String(input.rewardWeight ?? "auto");
  const rewardWeight = ENEMY_REWARD_WEIGHTS.includes(requested) ? requested : automatic;
  return Object.freeze({
    profile: basePreview.config.lootProfile,
    partyLevel,
    shipLevel: basePreview.config.level,
    rewardWeight,
    rewardWeightSource: ENEMY_REWARD_WEIGHTS.includes(requested) ? "gm-override" : "automatic",
    automaticRewardWeight: automatic,
    economicCeiling: Object.freeze({
      basis: "party-level",
      level: partyLevel,
      gpBudget: null,
      state: "pf2e-treasure-table-value-pending"
    }),
    distribution: Object.freeze({
      personal: split.personal,
      shipCargo: split.cargo,
      arkflightSalvage: split.salvage,
      profileMultiplier: split.multiplier
    }),
    personal: Object.freeze([]),
    shipCargo: Object.freeze([]),
    salvage: Object.freeze([]),
    state: "policy-complete-values-pending",
    note: `Party level ${partyLevel} sets the PF2e economic ceiling. Reward weight is ${rewardWeight}${ENEMY_REWARD_WEIGHTS.includes(requested) ? " (GM override)" : " (automatic)"}. Ship level ${basePreview.config.level} and ${basePreview.config.lootProfile} richness determine how value is split among personal treasure, cargo, and Arkflight salvage.`
  });
}

export function generateEnemyEncounterPreview(input = {}) {
  const base = generateEnemyShipPreview(input);
  const partyLevel = clampLevel(input.partyLevel ?? base.config.level);
  const officers = base.crew.officers.map((officer) => generatePF2eOfficerActorDraft({
    station: officer.station,
    level: officer.level,
    quality: base.config.difficulty,
    faction: base.config.faction,
    theme: base.config.theme,
    seed: `${base.config.seed}:${officer.station}`
  }));
  const loot = lootContract(base, { ...input, partyLevel });
  const blockers = [
    ...(base.validation.ok ? [] : base.validation.errors),
    "PF2e signature gear compendium resolution and embedding is not implemented yet.",
    "PF2e treasure table GP ceiling and concrete item selection are not implemented yet."
  ];

  return Object.freeze({
    ...base,
    version: 4,
    config: Object.freeze({ ...base.config, partyLevel, rewardWeight: input.rewardWeight ?? "auto" }),
    crew: Object.freeze({ ...base.crew, officers: Object.freeze(officers) }),
    loot,
    canCommit: blockers.length === 0,
    blockers: Object.freeze(blockers)
  });
}

export const ENEMY_LOOT_SPLITS = LOOT_SPLITS;
