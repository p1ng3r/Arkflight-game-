import { SHIP_LEVEL_MAX, clampShipLevel } from "./progression.js";

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
