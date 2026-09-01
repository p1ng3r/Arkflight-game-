import { generateEnemyShipPreview } from "./enemy-ship-generator.js";
import { generatePF2eOfficerActorDraft } from "./pf2e-officer-actor-draft.js";

const LOOT_SPLITS = Object.freeze({
  poor: Object.freeze({ personal: 0.25, cargo: 0.40, salvage: 0.35, multiplier: 0.55 }),
  standard: Object.freeze({ personal: 0.30, cargo: 0.40, salvage: 0.30, multiplier: 1.00 }),
  rich: Object.freeze({ personal: 0.30, cargo: 0.45, salvage: 0.25, multiplier: 1.35 }),
  treasure: Object.freeze({ personal: 0.20, cargo: 0.60, salvage: 0.20, multiplier: 1.75 })
});

function clampLevel(value) { return Math.max(1, Math.min(20, Math.round(Number(value) || 1))); }

function lootContract(basePreview, input) {
  const partyLevel = clampLevel(input.partyLevel ?? basePreview.config.level);
  const split = LOOT_SPLITS[basePreview.config.lootProfile] ?? LOOT_SPLITS.standard;
  return Object.freeze({
    profile: basePreview.config.lootProfile,
    partyLevel,
    shipLevel: basePreview.config.level,
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
    note: `Party level ${partyLevel} sets the PF2e economic ceiling. Ship level ${basePreview.config.level} and ${basePreview.config.lootProfile} richness determine how that ceiling is split among personal treasure, cargo, and Arkflight salvage.`
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
    "PF2e signature weapon/armor compendium resolution is not implemented yet.",
    "PF2e treasure table GP ceiling and concrete item selection are not implemented yet."
  ];

  return Object.freeze({
    ...base,
    version: 3,
    config: Object.freeze({ ...base.config, partyLevel }),
    crew: Object.freeze({ ...base.crew, officers: Object.freeze(officers) }),
    loot,
    canCommit: blockers.length === 0,
    blockers: Object.freeze(blockers)
  });
}

export const ENEMY_LOOT_SPLITS = LOOT_SPLITS;
