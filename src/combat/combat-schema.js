import { combatEconomyBonuses } from "../ship/progression.js";

export const COMBAT_STATIONS = Object.freeze([
  "captain",
  "engineer",
  "navigator",
  "battlewatch",
  "veilwarden"
]);

export const STATION_AREAS = Object.freeze({
  captain: "morale",
  engineer: "arkengine",
  navigator: "rigging",
  battlewatch: "hull",
  veilwarden: "lifeveil"
});

export const COMBAT_POINT_TYPES = Object.freeze({ AP: "ap", RP: "rp" });
export const HEX_HEADINGS = Object.freeze([0, 60, 120, 180, 240, 300]);
export const WEAPON_MOUNTS = Object.freeze(["fore", "port", "starboard", "aft", "deck"]);
export const WEAPON_ARC_TEMPLATES = Object.freeze(["forward", "rear", "broadside", "wide", "turret", "line"]);

export const HULL_COMBAT_PROFILES = Object.freeze({
  "void-skiff": Object.freeze({ ap: 2, rp: 1 }),
  sloop: Object.freeze({ ap: 3, rp: 1 }),
  cutter: Object.freeze({ ap: 3, rp: 1 }),
  brigantine: Object.freeze({ ap: 4, rp: 1 }),
  frigate: Object.freeze({ ap: 4, rp: 1 }),
  galleon: Object.freeze({ ap: 5, rp: 1 }),
  hammerhead: Object.freeze({ ap: 5, rp: 1 }),
  arkcruiser: Object.freeze({ ap: 6, rp: 2 }),
  "dread-caravel": Object.freeze({ ap: 6, rp: 2 }),
  "cathedral-ship": Object.freeze({ ap: 6, rp: 2 }),
  "leviathan-class-platform": Object.freeze({ ap: 8, rp: 2 })
});

export function canonicalCombatStation(station) {
  if (!COMBAT_STATIONS.includes(station)) throw new Error(`Unknown Arkflight combat station: ${station}`);
  return station;
}

export function stationArea(station) {
  return STATION_AREAS[canonicalCombatStation(station)];
}

export function hullCombatProfile(ship, { actionBonus = null, reactionBonus = null } = {}) {
  const hullId = ship?.hull?.chassisId;
  const base = HULL_COMBAT_PROFILES[hullId] ?? { ap: 3, rp: 1 };
  const progression = combatEconomyBonuses(ship);
  const resolvedActionBonus = actionBonus == null ? Number(progression.actions || 0) : Number(actionBonus || 0);
  const resolvedReactionBonus = reactionBonus == null ? Number(progression.reactions || 0) : Number(reactionBonus || 0);
  return Object.freeze({
    ap: Math.max(1, Number(base.ap) + resolvedActionBonus),
    rp: Math.max(0, Number(base.rp) + resolvedReactionBonus)
  });
}

export function normalizeHexHeading(rotation = 0) {
  const normalized = ((Number(rotation) || 0) % 360 + 360) % 360;
  return (Math.round(normalized / 60) * 60) % 360;
}

export function headingStepDistance(from, to) {
  const a = normalizeHexHeading(from) / 60;
  const b = normalizeHexHeading(to) / 60;
  const clockwise = (b - a + 6) % 6;
  const counterClockwise = (a - b + 6) % 6;
  return Math.min(clockwise, counterClockwise);
}

export function effectiveMobility({ combatSpeed = 1, maneuverability = 1, speedPenalty = 0, maneuverPenalty = 0 } = {}) {
  return Object.freeze({
    speed: Math.max(1, Math.trunc(Number(combatSpeed) || 1) - Math.max(0, Math.trunc(Number(speedPenalty) || 0))),
    maneuverability: Math.max(1, Math.trunc(Number(maneuverability) || 1) - Math.max(0, Math.trunc(Number(maneuverPenalty) || 0)))
  });
}
