import { SHIP_TALENTS } from "../content/ship-talents.js";
import { SHIP_LEVEL_MAX, clampShipLevel, canAccessTalent, talentPointsForLevel } from "./progression.js";

export const SHIP_XP_PER_LEVEL = 1000;

function progression(ship) {
  return ship?.progression ?? {};
}

export function shipExperienceView(ship) {
  const level = clampShipLevel(progression(ship).level ?? 1);
  const rawXp = Math.max(0, Math.trunc(Number(progression(ship).xp) || 0));
  const atMaximum = level >= SHIP_LEVEL_MAX;
  const xp = atMaximum ? Math.min(SHIP_XP_PER_LEVEL, rawXp) : Math.min(SHIP_XP_PER_LEVEL - 1, rawXp);
  const nextLevel = atMaximum ? null : level + 1;
  const percent = atMaximum ? 100 : Math.max(0, Math.min(100, (xp / SHIP_XP_PER_LEVEL) * 100));
  return Object.freeze({ level, xp, max: SHIP_XP_PER_LEVEL, nextLevel, atMaximum, percent });
}

export function setShipExperience(ship, value) {
  const next = structuredClone(ship);
  next.progression ??= { level: 1, xp: 0, talentIds: [], arkcraftUpgrades: {} };
  let level = clampShipLevel(next.progression.level ?? 1);
  let xp = Math.max(0, Math.trunc(Number(value) || 0));

  if (level >= SHIP_LEVEL_MAX) {
    next.progression.level = SHIP_LEVEL_MAX;
    next.progression.xp = Math.min(SHIP_XP_PER_LEVEL, xp);
    return next;
  }

  while (xp >= SHIP_XP_PER_LEVEL && level < SHIP_LEVEL_MAX) {
    xp -= SHIP_XP_PER_LEVEL;
    level += 1;
  }

  if (level >= SHIP_LEVEL_MAX) xp = Math.min(SHIP_XP_PER_LEVEL, xp);
  next.progression.level = level;
  next.progression.xp = xp;
  return next;
}

export function addShipExperience(ship, amount) {
  const current = shipExperienceView(ship);
  const gain = Math.trunc(Number(amount) || 0);
  if (gain <= 0 || current.atMaximum) return structuredClone(ship);
  return setShipExperience(ship, current.xp + gain);
}

/**
 * GM-facing de-level operation.
 *
 * Lowering a vessel's level resets XP to zero and keeps as much of the current
 * build as remains legal. Talents from locked tiers are refunded first. If the
 * surviving build still exceeds the lower level's TP budget, the most recently
 * purchased talents (the end of talentIds) are refunded until the build is legal.
 */
export function resetShipLevel(ship, targetLevel) {
  const next = structuredClone(ship);
  next.progression ??= { level: 1, xp: 0, talentIds: [], arkcraftUpgrades: {} };

  const previousLevel = clampShipLevel(next.progression.level ?? 1);
  const level = clampShipLevel(targetLevel);
  const originalIds = [...new Set(next.progression.talentIds ?? [])];
  const refundedTalentIds = [];

  let keptIds = originalIds.filter((id) => {
    const talent = SHIP_TALENTS[id];
    const legal = Boolean(talent && canAccessTalent(level, talent));
    if (!legal) refundedTalentIds.push(id);
    return legal;
  });

  const budget = talentPointsForLevel(level);
  let spent = keptIds.reduce((sum, id) => sum + Number(SHIP_TALENTS[id]?.cost || 0), 0);
  while (spent > budget && keptIds.length) {
    const id = keptIds.pop();
    refundedTalentIds.push(id);
    spent -= Number(SHIP_TALENTS[id]?.cost || 0);
  }

  next.progression.level = level;
  next.progression.xp = 0;
  next.progression.talentIds = keptIds;

  return Object.freeze({
    ship: next,
    previousLevel,
    level,
    refundedTalentIds: Object.freeze([...refundedTalentIds])
  });
}
