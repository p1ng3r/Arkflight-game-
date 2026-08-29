import { combatEconomyBonuses } from "../ship/progression.js";

export const COMBAT_STATIONS = Object.freeze(["captain", "engineer", "navigator", "battlewatch", "veilwarden"]);

export const LEGACY_STATION_ALIASES = Object.freeze({
  watchmaster: "battlewatch"
});

export const STATION_AREAS = Object.freeze({
  captain: "morale",
  engineer: "arkengine",
  navigator: "rigging",
  battlewatch: "hull",
  veilwarden: "lifeveil"
});

export const COMBAT_FACINGS = Object.freeze(["fore", "starboard", "aft", "port"]);
export const COMBAT_RANGES = Object.freeze(["contact", "close", "near", "far", "distant"]);

export const COMBAT_ACTION_TYPES = Object.freeze({
  ACTION: "action",
  REACTION: "reaction"
});

export const HULL_COMBAT_PROFILES = Object.freeze({
  "void-skiff": Object.freeze({ actions: 2, reactions: 1 }),
  sloop: Object.freeze({ actions: 3, reactions: 1 }),
  cutter: Object.freeze({ actions: 3, reactions: 1 }),
  brigantine: Object.freeze({ actions: 4, reactions: 1 }),
  frigate: Object.freeze({ actions: 4, reactions: 1 }),
  galleon: Object.freeze({ actions: 5, reactions: 1 }),
  hammerhead: Object.freeze({ actions: 5, reactions: 1 }),
  arkcruiser: Object.freeze({ actions: 6, reactions: 2 }),
  "dread-caravel": Object.freeze({ actions: 6, reactions: 2 }),
  "cathedral-ship": Object.freeze({ actions: 6, reactions: 2 }),
  "leviathan-class-platform": Object.freeze({ actions: 8, reactions: 2 })
});

export function canonicalCombatStation(station) {
  const canonical = LEGACY_STATION_ALIASES[station] ?? station;
  if (!COMBAT_STATIONS.includes(canonical)) throw new Error(`Unknown Arkflight combat station: ${station}`);
  return canonical;
}

export function stationArea(station) {
  return STATION_AREAS[canonicalCombatStation(station)];
}

export function hullCombatProfile(ship, { actionBonus = 0, reactionBonus = 0 } = {}) {
  const hullId = ship?.hull?.chassisId;
  const base = HULL_COMBAT_PROFILES[hullId] ?? { actions: 3, reactions: 1 };
  const progression = combatEconomyBonuses(ship);
  return Object.freeze({
    actions: Math.max(1, Number(base.actions) + Number(progression.actions || 0) + Number(actionBonus || 0)),
    reactions: Math.max(0, Number(base.reactions) + Number(progression.reactions || 0) + Number(reactionBonus || 0))
  });
}
