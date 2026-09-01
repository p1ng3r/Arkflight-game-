import { generateEnemyShipPreview } from "./enemy-ship-generator.js";
import { generatePF2eOfficerActorDraft } from "./pf2e-officer-actor-draft.js";
import { applyCrewAffiliation } from "./ayerstone-crew-affiliation.js";
import { generateAyerstoneShipName } from "./ayerstone-ship-names.js";
import { generatePF2eCrewTemplates } from "./pf2e-crew-template-generator.js";
import { selectCrewTemplates } from "./crew-template-selection.js";
import { applySignatureGearPolicy } from "./officer-signature-gear-policy.js";
import { buildOfficerWeaponIntent } from "./officer-weapon-pools.js";
import { ARKFLIGHT_SALVAGE_VALUE_POLICY, rollAndAnnotateSalvage } from "./arkflight-salvage-value-policy.js";

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

function resolvedRewardWeight(basePreview, input) {
  const automatic = automaticRewardWeight(basePreview.config);
  const requested = String(input.rewardWeight ?? "auto");
  return ENEMY_REWARD_WEIGHTS.includes(requested) ? requested : automatic;
}

function salvageEntries(basePreview) {
  const ship = basePreview.ship;
  const seed = basePreview.config.seed;
  const rows = [
    { type: "arkengine", id: ship.arkengine?.chassisId, name: ship.arkengine?.chassisId },
    ...(ship.weapons ?? []).map((entry, index) => ({ type: "weapon", id: `${entry.id}:${entry.arc}:${index}`, componentId: entry.id, name: entry.id, arc: entry.arc })),
    ...(ship.shipMods ?? []).map((id, index) => ({ type: "ship-mod", id: `${id}:${index}`, componentId: id, name: id })),
    ...(ship.arkengine?.modIds ?? []).map((id, index) => ({ type: "arkengine-mod", id: `${id}:${index}`, componentId: id, name: id }))
  ].filter((entry) => entry.id);
  return Object.freeze(rows.map((entry, index) => rollAndAnnotateSalvage(entry, { seed: `${seed}:salvage:${entry.type}:${entry.id}:${index}` })));
}

function lootContract(basePreview, input, salvage) {
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
    economicCeiling: Object.freeze({ basis: "party-level", level: partyLevel, gpBudget: null, state: "pf2e-treasure-table-value-pending" }),
    distribution: Object.freeze({ personal: split.personal, shipCargo: split.cargo, arkflightSalvage: split.salvage, profileMultiplier: split.multiplier }),
    signatureGearPolicy: Object.freeze({ inventoryMode: "embedded-pf2e-item", combatMathMode: "npc-benchmark-independent", recoveryMode: "reward-system-decision", autoAward: false }),
    salvageValuePolicy: ARKFLIGHT_SALVAGE_VALUE_POLICY,
    personal: Object.freeze([]),
    shipCargo: Object.freeze([]),
    salvage,
    state: "policy-complete-values-pending",
    note: `Party level ${partyLevel} sets the PF2e economic ceiling. Reward weight is ${rewardWeight}${ENEMY_REWARD_WEIGHTS.includes(requested) ? " (GM override)" : " (automatic)"}. Arkflight component condition is rolled Intact, Damaged, or Ruined. Intact value-bearing salvage consumes treasure budget; damaged or ruined narrative salvage does not.`
  });
}

function doctrineWarning(base) {
  const preferred = base.doctrine?.preferredArchetypes ?? [];
  if (!preferred.length || preferred.includes(base.config.archetypeId)) return null;
  return `Faction doctrine usually favors ${preferred.join(", ")}; keeping GM-selected ${base.archetype.label}.`;
}

export function generateEnemyEncounterPreview(input = {}) {
  const base = generateEnemyShipPreview(input);
  const partyLevel = clampLevel(input.partyLevel ?? base.config.level);
  const rewardWeight = resolvedRewardWeight(base, input);
  const shipName = generateAyerstoneShipName({ faction: base.config.faction, archetypeLabel: base.archetype.label, seed: base.config.seed, override: input.shipName });
  const ship = Object.freeze({ ...base.ship, identity: Object.freeze({ ...(base.ship.identity ?? {}), name: shipName }) });
  const officers = base.crew.officers.map((officer) => {
    const seed = `${base.config.seed}:${officer.station}`;
    const draft = generatePF2eOfficerActorDraft({ station: officer.station, level: officer.level, quality: base.config.difficulty, faction: base.config.faction, theme: base.config.theme, seed });
    const affiliated = applyCrewAffiliation(draft, { faction: base.config.faction, seed });
    const policyOfficer = applySignatureGearPolicy(affiliated);
    const weaponIntent = buildOfficerWeaponIntent({ faction: base.config.faction, station: officer.station, level: officer.level, quality: base.config.difficulty, rewardWeight });
    return Object.freeze({ ...policyOfficer, weaponIntent });
  });
  const rawTemplates = generatePF2eCrewTemplates({ shipLevel: base.config.level, quality: base.config.difficulty, faction: base.config.faction });
  const templates = selectCrewTemplates(rawTemplates, { archetypeId: base.config.archetypeId, ship, doctrine: base.doctrine, selectedTypes: input.crewTemplateTypes });
  const salvage = salvageEntries({ ...base, ship });
  const loot = lootContract(base, { ...input, partyLevel }, salvage);
  const blockers = [
    ...(base.validation.ok ? [] : base.validation.errors),
    "PF2e signature gear compendium resolution and embedding is not implemented yet.",
    "PF2e treasure table GP ceiling and concrete item selection are not implemented yet."
  ];

  return Object.freeze({
    ...base,
    version: 9,
    ship,
    config: Object.freeze({ ...base.config, partyLevel, rewardWeight: input.rewardWeight ?? "auto", shipName, crewTemplateTypes: templates.filter((template) => template.selected).map((template) => template.type) }),
    doctrine: Object.freeze({ ...base.doctrine, warning: doctrineWarning(base) }),
    crew: Object.freeze({ ...base.crew, officers: Object.freeze(officers), templates: Object.freeze(templates) }),
    loot,
    canCommit: blockers.length === 0,
    blockers: Object.freeze(blockers)
  });
}

export const ENEMY_LOOT_SPLITS = LOOT_SPLITS;
