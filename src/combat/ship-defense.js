import { clampShipLevel, shipDefenseProgressionBonus } from "../ship/progression.js";

function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

/**
 * Arkflight's Reflex-like strategic/tactical ship defense.
 *
 * Weapon attacks continue to target Ship AC. Maneuver Save / Maneuver DC is
 * for collision avoidance, ramming, forced movement, grappling, and similar
 * whole-vessel positioning threats.
 */
export function shipManeuverSaveModifier({ ship = null, derived = null } = {}) {
  const level = clampShipLevel(ship?.progression?.level ?? 1);
  const maneuverability = Math.max(1, Math.trunc(finite(derived?.stats?.maneuverability, 1)));
  const defensiveBonus = Math.trunc(finite(derived?.stats?.defensiveCheckBonus, 0));
  return level + shipDefenseProgressionBonus(level) + maneuverability + defensiveBonus;
}

export function shipManeuverDC(input = {}) {
  return 10 + shipManeuverSaveModifier(input);
}

export function basicShipSaveMultiplier(degree) {
  const value = Math.max(-1, Math.min(2, Math.trunc(Number(degree) || 0)));
  if (value >= 2) return 0;
  if (value === 1) return 0.5;
  if (value === 0) return 1;
  return 2;
}

/**
 * Ramming uses the attacker's Maneuver DC as its base Collision DC. Size,
 * dedicated ram gear, or authored situational effects can adjust this DC
 * without creating opposed d20 rolls.
 */
export function shipCollisionDC({ ship = null, derived = null, circumstance = 0 } = {}) {
  return shipManeuverDC({ ship, derived }) + Math.trunc(finite(circumstance, 0));
}
