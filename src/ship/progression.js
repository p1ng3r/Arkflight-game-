import { RETIRED_SHIP_TALENT_IDS, SHIP_TALENTS, SHIP_TALENT_TIERS } from "../content/ship-talents.js";
import { SHIP_TALENT_PROGRESSION, shipTalentProgressionMeta } from "../content/ship-talent-progression.js";

export const SHIP_LEVEL_MIN = 1;
export const SHIP_LEVEL_MAX = 20;
const RETIRED_TALENT_IDS = new Set(RETIRED_SHIP_TALENT_IDS);

export function clampShipLevel(level) {
  return Math.max(SHIP_LEVEL_MIN, Math.min(SHIP_LEVEL_MAX, Math.trunc(Number(level) || SHIP_LEVEL_MIN)));
}

/**
 * Arkflight ship AC uses the hull's authored AC as a chassis value, then adds
 * ship level plus a PF2e-style defense proficiency step. The step is kept
 * separate from level so hull identity remains meaningful across all levels.
 */
export function shipDefenseProgressionBonus(level) {
  const value = clampShipLevel(level);
  if (value >= 19) return 6;
  if (value >= 13) return 4;
  if (value >= 7) return 2;
  return 0;
}

/**
 * Ship Talent Point cadence:
 * - Level 1 begins with 2 TP.
 * - Every later odd level grants 2 TP.
 * - Every even level grants 1 TP.
 *
 * Totals: L1 2, L2 3, L3 5 ... L10 15 ... L20 30.
 */
export function talentPointsForLevel(level) {
  const value = clampShipLevel(level);
  const oddLevels = Math.ceil(value / 2);
  const evenLevels = Math.floor(value / 2);
  return (oddLevels * 2) + evenLevels;
}

export function tierForLevel(level) {
  const value = clampShipLevel(level);
  return Object.values(SHIP_TALENT_TIERS).find((tier) => value >= tier.minLevel && value <= tier.maxLevel) ?? SHIP_TALENT_TIERS.foundation;
}

export function requiredLevelForTalent(talent) {
  if (!talent) return SHIP_LEVEL_MAX;
  const tier = SHIP_TALENT_TIERS[talent.tier];
  const authored = shipTalentProgressionMeta(talent.id)?.minLevel;
  return clampShipLevel(authored ?? tier?.minLevel ?? SHIP_LEVEL_MAX);
}

export function canAccessTalent(level, talent) {
  const tier = SHIP_TALENT_TIERS[talent?.tier];
  return Boolean(tier && clampShipLevel(level) >= requiredLevelForTalent(talent));
}

function talentName(id) {
  return SHIP_TALENTS[id]?.name ?? String(id ?? "Unknown Talent");
}

function upgradePathIds(talent) {
  const path = [];
  const visited = new Set();
  let id = talent?.id ?? null;
  while (id && !visited.has(id)) {
    visited.add(id);
    path.unshift(id);
    id = shipTalentProgressionMeta(id)?.upgradeOf ?? null;
  }
  return path;
}

/**
 * Eligibility is deliberately separate from affordability. A talent can be
 * mechanically unlocked but still require more TP; the UI reports both facts.
 */
export function talentEligibility(ship, talent) {
  if (!talent) return Object.freeze({ ok: false, reasons: Object.freeze([{ code: "unknown", label: "UNKNOWN TALENT" }]) });
  const level = clampShipLevel(ship?.progression?.level ?? 1);
  const owned = new Set(ship?.progression?.talentIds ?? []);
  const metadata = shipTalentProgressionMeta(talent.id) ?? {};
  const requiredLevel = requiredLevelForTalent(talent);
  const reasons = [];

  if (level < requiredLevel) reasons.push({ code: "level", label: `LEVEL ${requiredLevel}`, requiredLevel });

  const missing = (metadata.prerequisites ?? []).filter((id) => !owned.has(id));
  if (missing.length) {
    reasons.push({
      code: "prerequisite",
      label: `REQUIRES ${missing.map(talentName).join(" + ")}`,
      talentIds: Object.freeze([...missing])
    });
  }

  const anyOf = metadata.prerequisiteAnyOf ?? [];
  if (anyOf.length && !anyOf.some((id) => owned.has(id))) {
    reasons.push({
      code: "prerequisite-any",
      label: `REQUIRES ONE OF: ${anyOf.map(talentName).join(" / ")}`,
      talentIds: Object.freeze([...anyOf])
    });
  }

  const callingRequirement = metadata.callingRequirement;
  if (callingRequirement && ship?.progression?.callingId !== callingRequirement) {
    reasons.push({ code: "calling", label: `REQUIRES ${String(callingRequirement).replaceAll("-", " ").toUpperCase()} CALLING` });
  }

  return Object.freeze({
    ok: reasons.length === 0,
    reasons: Object.freeze(reasons.map((reason) => Object.freeze(reason))),
    requiredLevel,
    metadata
  });
}

export function selectedTalents(ship) {
  return [...new Set(ship?.progression?.talentIds ?? [])].map((id) => SHIP_TALENTS[id]).filter(Boolean);
}

export function activeSelectedTalents(ship) {
  const selected = selectedTalents(ship);
  const owned = new Set(selected.map((talent) => talent.id));
  const superseded = new Set();
  for (const talent of selected) {
    let predecessor = shipTalentProgressionMeta(talent.id)?.upgradeOf ?? null;
    while (predecessor) {
      if (owned.has(predecessor)) superseded.add(predecessor);
      predecessor = shipTalentProgressionMeta(predecessor)?.upgradeOf ?? null;
    }
  }
  return selected.filter((talent) => !superseded.has(talent.id));
}

export function spentTalentPoints(ship) {
  return selectedTalents(ship).reduce((sum, talent) => sum + Number(talent.cost || 0), 0);
}

export function availableTalentPoints(ship) {
  return Math.max(0, talentPointsForLevel(ship?.progression?.level ?? 1) - spentTalentPoints(ship));
}

export function validateProgression(ship) {
  const level = clampShipLevel(ship?.progression?.level ?? 1);
  const ids = [...new Set(ship?.progression?.talentIds ?? [])];
  const errors = [];
  let spent = 0;
  for (const id of ids) {
    const talent = SHIP_TALENTS[id];
    // The five original station-specific Foundation talents were retired in
    // favor of whole-ship Voyage/Battle training. Existing vessels keep their
    // saved IDs for compatibility, but those IDs grant no effect and cost no TP,
    // which effectively refunds the point until the ship is resaved/refit.
    if (!talent && RETIRED_TALENT_IDS.has(id)) continue;
    if (!talent) { errors.push(`Unknown ship talent: ${id}`); continue; }

    const eligibility = talentEligibility(ship, talent);
    for (const reason of eligibility.reasons) {
      if (reason.code === "level") errors.push(`${talent.name} is not available until level ${eligibility.requiredLevel}.`);
      else if (reason.code === "prerequisite") errors.push(`${talent.name} requires ${reason.talentIds.map(talentName).join(" and ")}.`);
      else if (reason.code === "prerequisite-any") errors.push(`${talent.name} requires at least one of: ${reason.talentIds.map(talentName).join(", ")}.`);
      else if (reason.code === "calling") errors.push(`${talent.name} ${reason.label.toLowerCase()}.`);
    }
    spent += Number(talent.cost || 0);
  }
  const budget = talentPointsForLevel(level);
  if (spent > budget) errors.push(`Talent build spends ${spent} TP but level ${level} provides ${budget} TP.`);
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), level, tier: tierForLevel(level), budget, spent, available: Math.max(0, budget - spent) });
}

export function combatEconomyBonuses(ship) {
  let actions = 0;
  let reactions = 0;
  for (const talent of activeSelectedTalents(ship)) {
    for (const effect of talent.effects ?? []) {
      if (effect.mode !== "add") continue;
      if (effect.target === "actionBonus") actions += Number(effect.value || 0);
      if (effect.target === "reactionBonus") reactions += Number(effect.value || 0);
    }
  }
  return Object.freeze({ actions: Math.min(1, actions), reactions: Math.min(1, reactions) });
}

function getPath(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) { const keys = path.split("."); const last = keys.pop(); let cursor = object; for (const key of keys) cursor = cursor[key] ??= {}; cursor[last] = value; }

function ensureProgressionStats(stats) {
  stats.weaponAttackBonus ??= 0;
  stats.defensiveCheckBonus ??= 0;
  stats.repairCheckBonus ??= 0;
  stats.repairTimePercent ??= 0;
  stats.repairSupplyPercent ??= 0;
  stats.supplyUsePercent ??= 0;
  stats.supplyCapacity ??= 0;
  stats.moraleCapacity ??= 5;
  stats.actionBonus ??= 0;
  stats.reactionBonus ??= 0;
  stats.crewTacticCapacity ??= 0;
  stats.arkcraftUpgradeChoices ??= 0;
  stats.legendaryArkcraftUpgradeChoices ??= 0;
  stats.allStationBonus ??= 0;
  stats.mythicCapabilityCount ??= 0;
  stats.stationBonuses ??= { captain: 0, engineer: 0, navigator: 0, battlewatch: 0, veilwarden: 0 };
  stats.pillarBonuses ??= { voyage: 0, combat: 0 };
  stats.modSlotBonuses ??= { weapon: 0, structural: 0, rigging: 0, lifeveil: 0, utility: 0, support: 0, exploration: 0, expedition: 0, arkengine: 0, flexible: 0 };
}

export function applyTalentProgression(stats, baseStats, ship, stationCapabilities, capabilities) {
  ensureProgressionStats(stats);
  const talents = activeSelectedTalents(ship);
  for (const talent of talents) {
    const explicitlyAddsShipCapacity = (talent.effects ?? []).some((effect) => effect.mode === "add" && effect.target === "shipModCapacity");
    for (const effect of talent.effects ?? []) {
      if (effect.mode === "add") {
        setPath(stats, effect.target, Number(getPath(stats, effect.target) ?? 0) + Number(effect.value ?? 0));
      } else if (effect.mode === "percentBase") {
        const base = Number(getPath(baseStats, effect.target) ?? 0);
        setPath(stats, effect.target, Number(getPath(stats, effect.target) ?? 0) + Math.round(base * Number(effect.value ?? 0) / 100));
      } else if (effect.mode === "stationBonus") {
        stats.stationBonuses[effect.station] = Number(stats.stationBonuses[effect.station] ?? 0) + Number(effect.value ?? 0);
      } else if (effect.mode === "pillarBonus") {
        stats.pillarBonuses[effect.pillar] = Number(stats.pillarBonuses[effect.pillar] ?? 0) + Number(effect.value ?? 0);
      } else if (effect.mode === "modSlot") {
        const value = Number(effect.value ?? 0);
        stats.modSlotBonuses[effect.slotType] = Number(stats.modSlotBonuses[effect.slotType] ?? 0) + value;
        if (effect.slotType !== "arkengine" && !explicitlyAddsShipCapacity) stats.shipModCapacity = Number(stats.shipModCapacity ?? 0) + value;
      } else if (effect.mode === "unlockArkcraft") {
        const station = stationCapabilities?.[effect.station];
        if (station) for (const id of effect.ids ?? []) station.masteries.add(id);
      } else if (effect.mode === "upgradeArkcraft") {
        const station = stationCapabilities?.[effect.station];
        if (station) for (const id of effect.ids ?? []) station.masteries.add(id);
      }
    }
    for (const capability of talent.capabilities ?? []) capabilities?.add(capability);
  }
  return stats;
}

function nextMilestoneForLevel(level) {
  const value = clampShipLevel(level);
  if (value < 5) return Object.freeze({ level: 5, label: "Ship Calling" });
  if (value < 10) return Object.freeze({ level: 10, label: "Signature Calling" });
  if (value < 15) return Object.freeze({ level: 15, label: "Legendary Calling" });
  if (value < 20) return Object.freeze({ level: 20, label: "Mythic Calling" });
  return Object.freeze({ level: 20, label: "Mythic Capstone Reached", complete: true });
}

export function progressionView(ship) {
  const validation = validateProgression(ship);
  const owned = new Set(ship?.progression?.talentIds ?? []);
  const talents = Object.values(SHIP_TALENTS).map((talent) => {
    const eligibility = talentEligibility(ship, talent);
    const metadata = shipTalentProgressionMeta(talent.id) ?? {};
    const prerequisites = [...(metadata.prerequisites ?? [])];
    const prerequisiteAnyOf = [...(metadata.prerequisiteAnyOf ?? [])];
    const upgradePath = upgradePathIds(talent);
    const affordable = validation.available >= Number(talent.cost || 0);
    const tpReason = !owned.has(talent.id) && !affordable
      ? Object.freeze({ code: "tp", label: `REQUIRES ${Number(talent.cost || 0)} TP — ${validation.available} AVAILABLE` })
      : null;
    const lockReasons = [...eligibility.reasons, ...(tpReason ? [tpReason] : [])];
    const requiredLevel = eligibility.requiredLevel;
    return Object.freeze({
      ...talent,
      minLevel: requiredLevel,
      requiredLevel,
      owned: owned.has(talent.id),
      locked: !eligibility.ok,
      affordable,
      canPurchase: !owned.has(talent.id) && eligibility.ok && affordable,
      tierLabel: SHIP_TALENT_TIERS[talent.tier]?.label ?? talent.tier,
      prerequisites: Object.freeze(prerequisites),
      prerequisiteNames: Object.freeze(prerequisites.map(talentName)),
      prerequisiteAnyOf: Object.freeze(prerequisiteAnyOf),
      prerequisiteAnyOfNames: Object.freeze(prerequisiteAnyOf.map(talentName)),
      upgradeOf: metadata.upgradeOf ?? null,
      upgradeOfName: metadata.upgradeOf ? talentName(metadata.upgradeOf) : null,
      upgradePath: Object.freeze(upgradePath),
      upgradePathNames: Object.freeze(upgradePath.map(talentName)),
      lockReasons: Object.freeze(lockReasons)
    });
  });
  return Object.freeze({
    ...validation,
    nextMilestone: nextMilestoneForLevel(validation.level),
    talents: Object.freeze(talents)
  });
}

export { SHIP_TALENT_PROGRESSION };
