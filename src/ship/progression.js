import { SHIP_TALENTS, SHIP_TALENT_TIERS } from "../content/ship-talents.js";

export const SHIP_LEVEL_MIN = 1;
export const SHIP_LEVEL_MAX = 20;
export const SHIP_MILESTONE_LEVELS = Object.freeze([5, 10, 15, 20]);

export function clampShipLevel(level) {
  return Math.max(SHIP_LEVEL_MIN, Math.min(SHIP_LEVEL_MAX, Math.trunc(Number(level) || SHIP_LEVEL_MIN)));
}

export function talentPointsForLevel(level) {
  const value = clampShipLevel(level);
  const milestoneBonus = SHIP_MILESTONE_LEVELS.filter((entry) => value >= entry).length;
  return value + milestoneBonus;
}

export function tierForLevel(level) {
  const value = clampShipLevel(level);
  return Object.values(SHIP_TALENT_TIERS).find((tier) => value >= tier.minLevel && value <= tier.maxLevel) ?? SHIP_TALENT_TIERS.foundation;
}

export function canAccessTalent(level, talent) {
  const tier = SHIP_TALENT_TIERS[talent?.tier];
  return Boolean(tier && clampShipLevel(level) >= tier.minLevel);
}

export function selectedTalents(ship) {
  return [...new Set(ship?.progression?.talentIds ?? [])].map((id) => SHIP_TALENTS[id]).filter(Boolean);
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
    if (!talent) { errors.push(`Unknown ship talent: ${id}`); continue; }
    if (!canAccessTalent(level, talent)) errors.push(`${talent.name} is not available until ${SHIP_TALENT_TIERS[talent.tier].label} tier (level ${SHIP_TALENT_TIERS[talent.tier].minLevel}).`);
    spent += Number(talent.cost || 0);
  }
  const budget = talentPointsForLevel(level);
  if (spent > budget) errors.push(`Talent build spends ${spent} TP but level ${level} provides ${budget} TP.`);
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), level, tier: tierForLevel(level), budget, spent, available: Math.max(0, budget - spent) });
}

export function combatEconomyBonuses(ship) {
  let actions = 0;
  let reactions = 0;
  for (const talent of selectedTalents(ship)) {
    for (const effect of talent.effects ?? []) {
      if (effect.mode !== "add") continue;
      if (effect.target === "actionBonus") actions += Number(effect.value || 0);
      if (effect.target === "reactionBonus") reactions += Number(effect.value || 0);
    }
  }
  return Object.freeze({ actions, reactions });
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
  stats.modSlotBonuses ??= { weapon: 0, structural: 0, rigging: 0, lifeveil: 0, utility: 0, support: 0, arkengine: 0, flexible: 0 };
}

export function applyTalentProgression(stats, baseStats, ship, stationCapabilities, capabilities) {
  ensureProgressionStats(stats);
  const talents = selectedTalents(ship);
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

export function progressionView(ship) {
  const validation = validateProgression(ship);
  const owned = new Set(ship?.progression?.talentIds ?? []);
  const talents = Object.values(SHIP_TALENTS).map((talent) => ({
    ...talent,
    owned: owned.has(talent.id),
    locked: !canAccessTalent(validation.level, talent),
    tierLabel: SHIP_TALENT_TIERS[talent.tier]?.label ?? talent.tier
  }));
  return Object.freeze({ ...validation, talents: Object.freeze(talents) });
}
