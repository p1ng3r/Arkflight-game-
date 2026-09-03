export const COMBAT_ACTION_TIMING = Object.freeze({
  ACTION: "action",
  REACTION: "reaction"
});

export const COMBAT_ACTION_CATEGORIES = Object.freeze({
  MOVEMENT: "movement",
  MANEUVER: "maneuver",
  WEAPON: "weapon",
  RELOAD: "reload",
  COMMAND: "command",
  ENGINEERING: "engineering",
  BATTLEWATCH: "battlewatch",
  LIFEVEIL: "lifeveil"
});

function action({
  id,
  station,
  name,
  description,
  ap = 0,
  rp = 0,
  timing = COMBAT_ACTION_TIMING.ACTION,
  category,
  tags = [],
  rules = {}
}) {
  return Object.freeze({
    id,
    station,
    name,
    description,
    cost: Object.freeze({ ap, rp }),
    timing,
    category,
    tags: Object.freeze([...tags]),
    rules: Object.freeze(structuredClone(rules))
  });
}

const CORE_ACTIONS = [
  action({
    id: "navigator-move",
    station: "navigator",
    name: "Move",
    description: "Spend 1 AP to move the ship forward up to its effective Combat Speed. Movement may be interrupted by maneuvering, weapon fire, reload actions, or other legal combat actions, then resumed while movement remains.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MOVEMENT,
    tags: ["core", "movement", "interleavable"],
    rules: {
      movementStat: "combatSpeed",
      direction: "forward",
      interleavable: true,
      cargoFloor: 1
    }
  }),
  action({
    id: "navigator-maneuver",
    station: "navigator",
    name: "Maneuver",
    description: "Spend 1 AP to gain facing changes equal to the ship's effective Maneuverability. Those facing changes may be used at any point during the ship's movement sequence.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "interleavable"],
    rules: {
      facingStat: "maneuverability",
      interleavable: true,
      cargoFloor: 1
    }
  }),
  action({
    id: "battlewatch-fire-weapon",
    station: "battlewatch",
    name: "Fire Weapon",
    description: "Fire a ready ship weapon at any legal point during movement. The AP cost is defined by the weapon. The target must be within the weapon's hex range and firing arc, and the weapon must not be reloading.",
    category: COMBAT_ACTION_CATEGORIES.WEAPON,
    tags: ["core", "weapon", "interleavable"],
    rules: {
      costSource: "weapon.fireAP",
      requiresReadyWeapon: true,
      requiresRange: true,
      requiresArc: true,
      interleavable: true,
      startsReload: true
    }
  }),
  action({
    id: "battlewatch-reload-weapon",
    station: "battlewatch",
    name: "Work the Guns",
    description: "Spend 1 AP to reduce the remaining reload time of one installed weapon by 1 round, to a minimum of 0.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.RELOAD,
    tags: ["core", "weapon", "reload", "interleavable"],
    rules: {
      reloadReduction: 1,
      minimumReload: 0,
      interleavable: true
    }
  }),
  action({
    id: "captain-issue-order",
    station: "captain",
    name: "Issue Order",
    description: "Spend 1 AP to issue a combat order. The specific order effects are resolved by the combat engine and may modify later station actions during the round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command"]
  }),
  action({
    id: "captain-brace-for-impact",
    station: "captain",
    name: "Brace for Impact",
    description: "Spend 1 RP when the ship is about to suffer a damaging impact or attack consequence. The exact mitigation is resolved by the combat engine.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "reaction", "defense"]
  }),
  action({
    id: "engineer-vent-strain",
    station: "engineer",
    name: "Vent Strain",
    description: "Spend 1 AP to perform a controlled Arkengine vent. The amount of Strain removed is resolved by the combat engine and may be modified by the installed Arkengine or Arkengine Mods.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain"]
  }),
  action({
    id: "engineer-emergency-bypass",
    station: "engineer",
    name: "Emergency Bypass",
    description: "Spend 1 RP in response to an Arkengine or ship-system complication. The exact emergency effect is resolved by the combat engine.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "reaction", "arkengine"]
  }),
  action({
    id: "battlewatch-acquire-target",
    station: "battlewatch",
    name: "Acquire Target",
    description: "Spend 1 AP to establish a firing solution on a target. The exact targeting bonus or benefit is resolved by the combat engine.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "targeting", "weapon"]
  }),
  action({
    id: "battlewatch-spoil-their-aim",
    station: "battlewatch",
    name: "Spoil Their Aim",
    description: "Spend 1 RP in response to an enemy firing solution or attack declaration. The exact defensive effect is resolved by the combat engine.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "reaction", "targeting", "defense"]
  }),
  action({
    id: "veilwarden-reinforce-lifeveil",
    station: "veilwarden",
    name: "Reinforce Lifeveil",
    description: "Spend 1 AP to reinforce the ship's Lifeveil. The amount restored or temporary protection granted is resolved by the combat engine.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "defense"]
  }),
  action({
    id: "veilwarden-emergency-ward",
    station: "veilwarden",
    name: "Emergency Ward",
    description: "Spend 1 RP when the ship would take damage through its Lifeveil. The exact mitigation is resolved by the combat engine.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "reaction", "lifeveil", "defense"]
  })
];

export const COMBAT_ACTIONS = Object.freeze(Object.fromEntries(CORE_ACTIONS.map((entry) => [entry.id, entry])));

export const CORE_COMBAT_ACTIONS_BY_STATION = Object.freeze(
  Object.fromEntries(
    ["captain", "engineer", "navigator", "battlewatch", "veilwarden"].map((station) => [
      station,
      Object.freeze(CORE_ACTIONS.filter((entry) => entry.station === station).map((entry) => entry.id))
    ])
  )
);

export function getCombatAction(id) {
  return COMBAT_ACTIONS[id] ?? null;
}

export function getCoreCombatActionsForStation(station) {
  return CORE_COMBAT_ACTIONS_BY_STATION[station] ?? Object.freeze([]);
}
