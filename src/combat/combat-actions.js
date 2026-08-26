import { COMBAT_ACTION_TYPES, canonicalCombatStation, stationArea } from "./combat-schema.js";

function combatAction({
  id,
  name,
  station,
  type = COMBAT_ACTION_TYPES.ACTION,
  cost = 1,
  description,
  pushedArea = null,
  strainCost = 0,
  tags = [],
  requirements = [],
  effect = {}
}) {
  if (!id || !name || !description) throw new Error("Combat action requires id, name, and description.");
  const canonicalStation = canonicalCombatStation(station);
  if (![COMBAT_ACTION_TYPES.ACTION, COMBAT_ACTION_TYPES.REACTION].includes(type)) throw new Error(`Unsupported combat action type: ${type}`);
  if (!Number.isInteger(cost) || cost < 1) throw new Error(`Combat action ${id} requires an integer cost of at least 1.`);
  return Object.freeze({
    id,
    name,
    station: canonicalStation,
    area: stationArea(canonicalStation),
    type,
    cost,
    description,
    pushedArea,
    strainCost: Math.max(0, Number(strainCost) || 0),
    tags: Object.freeze([...tags]),
    requirements: Object.freeze([...requirements]),
    effect: Object.freeze({ ...effect })
  });
}

// Salvaged concepts: Adjust Facing, Evasive Maneuver, Ready Broadside,
// Aim Weapon and Call Target. Their old automation contracts are intentionally
// not copied; these definitions target the new five-station/Strain model.
export const COMBAT_ACTIONS = Object.freeze({
  "adjust-facing": combatAction({
    id: "adjust-facing",
    name: "Adjust Facing",
    station: "navigator",
    cost: 1,
    description: "Bring the vessel around to change which arcs can bear on the enemy.",
    tags: ["maneuver", "facing", "rigging"],
    requirements: ["Rigging must not be disabled."],
    effect: { kind: "change-facing", steps: 1 }
  }),
  "hard-turn": combatAction({
    id: "hard-turn",
    name: "Hard Turn",
    station: "navigator",
    cost: 1,
    strainCost: 1,
    pushedArea: "rigging",
    description: "Drive the rigging beyond normal handling limits to make a more aggressive facing change.",
    tags: ["maneuver", "facing", "rigging", "strain"],
    requirements: ["Rigging must not be disabled."],
    effect: { kind: "change-facing", steps: 2 }
  }),
  "evasive-maneuver": combatAction({
    id: "evasive-maneuver",
    name: "Evasive Maneuver",
    station: "navigator",
    type: COMBAT_ACTION_TYPES.REACTION,
    cost: 1,
    strainCost: 1,
    pushedArea: "rigging",
    description: "Throw the vessel into an evasive handling pattern in response to an incoming attack.",
    tags: ["reaction", "defense", "maneuver", "rigging", "strain"],
    requirements: ["Rigging must not be disabled."],
    effect: { kind: "defensive-maneuver" }
  }),
  "overcharge-arkengine": combatAction({
    id: "overcharge-arkengine",
    name: "Overcharge Arkengine",
    station: "engineer",
    cost: 1,
    strainCost: 1,
    pushedArea: "arkengine",
    description: "Redline the Arkengine to create additional operating capacity this round.",
    tags: ["arkengine", "strain", "action-economy"],
    requirements: ["Arkengine must not be disabled."],
    effect: { kind: "gain-actions", value: 1 }
  }),
  "emergency-repair": combatAction({
    id: "emergency-repair",
    name: "Emergency Repair",
    station: "engineer",
    cost: 2,
    description: "Commit crew and engineering capacity to a field repair during combat.",
    tags: ["repair", "engineering"],
    effect: { kind: "repair-window" }
  }),
  "ready-broadside": combatAction({
    id: "ready-broadside",
    name: "Ready Broadside",
    station: "battlewatch",
    cost: 1,
    description: "Coordinate the weapon crews and prepare a firing arc for a concentrated volley.",
    tags: ["weapons", "broadside", "targeting"],
    requirements: ["Weapons must be available in the selected arc."],
    effect: { kind: "ready-arc" }
  }),
  "aim-weapon": combatAction({
    id: "aim-weapon",
    name: "Aim Weapon",
    station: "battlewatch",
    cost: 1,
    description: "Establish a firing solution for a selected weapon or weapon arc.",
    tags: ["weapons", "aim", "targeting"],
    effect: { kind: "aim" }
  }),
  "call-target": combatAction({
    id: "call-target",
    name: "Call Target",
    station: "battlewatch",
    cost: 1,
    description: "Identify a priority target or vulnerable section for the fighting crews.",
    tags: ["weapons", "targeting", "coordination"],
    effect: { kind: "mark-target" }
  }),
  "fire-weapon": combatAction({
    id: "fire-weapon",
    name: "Fire Weapon",
    station: "battlewatch",
    cost: 1,
    description: "Fire one installed weapon that can bear on the selected target.",
    tags: ["weapons", "attack"],
    requirements: ["The weapon must be functional, in range, and have a valid firing arc."],
    effect: { kind: "weapon-attack" }
  }),
  "brace-for-impact": combatAction({
    id: "brace-for-impact",
    name: "Brace for Impact",
    station: "captain",
    type: COMBAT_ACTION_TYPES.REACTION,
    cost: 1,
    strainCost: 1,
    pushedArea: "morale",
    description: "Drive the crew into emergency battle stations to mitigate an incoming impact at the cost of added ship Strain.",
    tags: ["reaction", "defense", "crew", "morale", "strain"],
    effect: { kind: "brace" }
  }),
  "drive-the-crew": combatAction({
    id: "drive-the-crew",
    name: "Drive the Crew",
    station: "captain",
    cost: 1,
    strainCost: 1,
    pushedArea: "morale",
    description: "Demand more from the crew than safe routine allows to create additional operating capacity this round.",
    tags: ["command", "crew", "morale", "strain", "action-economy"],
    effect: { kind: "gain-actions", value: 1 }
  }),
  "reinforce-lifeveil": combatAction({
    id: "reinforce-lifeveil",
    name: "Reinforce Lifeveil",
    station: "veilwarden",
    cost: 1,
    description: "Strengthen the Lifeveil against hostile energies and environmental attack.",
    tags: ["lifeveil", "defense"],
    effect: { kind: "reinforce-lifeveil" }
  }),
  "overdrive-lifeveil": combatAction({
    id: "overdrive-lifeveil",
    name: "Overdrive Lifeveil",
    station: "veilwarden",
    type: COMBAT_ACTION_TYPES.REACTION,
    cost: 1,
    strainCost: 1,
    pushedArea: "lifeveil",
    description: "Force the Lifeveil beyond safe output in response to a dangerous energy or environmental attack.",
    tags: ["reaction", "lifeveil", "defense", "strain"],
    effect: { kind: "lifeveil-overdrive" }
  })
});

export function getCombatAction(id) {
  return COMBAT_ACTIONS[id] ?? null;
}

export function combatActionsForStation(station) {
  const canonical = canonicalCombatStation(station);
  return Object.values(COMBAT_ACTIONS).filter((action) => action.station === canonical);
}
