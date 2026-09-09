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
  summary = description,
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
    summary,
    cost: Object.freeze({ ap, rp }),
    timing,
    category,
    tags: Object.freeze([...tags]),
    rules: Object.freeze(structuredClone(rules))
  });
}

// Native Arkflight ship-combat actions. These never require a Voyage Event or an
// authored objective. Temporary effects live on the ship Combatant and expire or
// are consumed inside the Arkflight combat loop. "Station Bonus" is +1 at ship
// levels 1-9, +2 at 10-19, and +3 at level 20. Level 5 and 15 unlock selected
// secondary improvements without letting typed PF2e-style modifiers run away.
const CORE_ACTIONS = [
  // CAPTAIN — command, morale, coordination.
  action({
    id: "captain-issue-order",
    station: "captain",
    name: "Issue Order",
    description: "Choose another station. Its next qualifying combat action or check this round receives the ship's Station Bonus. If Battlewatch fires next, the bonus applies to that weapon attack.",
    summary: "Choose a station; its next qualifying action/check gains Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "coordination", "native-effect"],
    rules: { resolver: "issueOrder", chooseStation: true, effect: "station-bonus", expires: "next-qualifying-action-or-turn" }
  }),
  action({
    id: "captain-rally-crew",
    station: "captain",
    name: "Rally Crew",
    description: "Restore Morale equal to the Station Bonus, or improve a degraded Morale area by one step. At ship level 15+, a successful area recovery also restores Morale.",
    summary: "Recover Morale or improve the Morale area one step.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "morale", "recovery"],
    rules: { resolver: "rallyCrew", area: "morale", scaledRecovery: true }
  }),
  action({
    id: "captain-drive-the-crew",
    station: "captain",
    name: "Drive the Crew",
    description: "Gain 2 AP after paying this action's 1 AP cost, for a net +1 AP this turn, and gain 1 Strain. Once per round. At ship level 20, the Strain is ignored.",
    summary: "Net +1 AP this turn; +1 Strain; once per round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "strain", "action-economy"],
    rules: { resolver: "driveCrew", gainAP: 2, strain: 1, strainArea: "morale", oncePerRound: true, legendaryNoStrain: true }
  }),
  action({
    id: "captain-coordinate-assault",
    station: "captain",
    name: "Coordinate Assault",
    description: "Choose one hostile vessel. The next weapon attack against it gains the Station Bonus as a circumstance bonus. From ship level 5, the effect covers the next two qualifying attacks.",
    summary: "Mark a target; next attack(s) gain Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "targeting", "offense", "native-effect"],
    rules: { resolver: "coordinateAssault", chooseTarget: true, effect: "attack-bonus", appliesTo: "next-weapon-attack", expires: "next-turn" }
  }),
  action({
    id: "captain-brace-for-impact",
    station: "captain",
    name: "Brace for Impact",
    description: "Ready this reaction. The next hit that would deal Hull damage reduces that Hull damage by 3 × Station Bonus after Hardness, then consumes the reaction.",
    summary: "Reaction: reduce next Hull hit by 3 × Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "reaction", "defense", "morale", "native-effect"],
    rules: { resolver: "braceForImpact", trigger: "incoming-hull-damage", effect: "hull-mitigation" }
  }),

  // ENGINEER — Arkengine, power, Strain, damage control.
  action({
    id: "engineer-vent-strain",
    station: "engineer",
    name: "Vent Strain",
    description: "Reduce ship Strain by the Station Bonus, to a minimum of 0.",
    summary: "Reduce Strain by Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "recovery"],
    rules: { resolver: "ventStrain", scaledStrainReduction: true, minimumStrain: 0 }
  }),
  action({
    id: "engineer-overcharge-arkengine",
    station: "engineer",
    name: "Overcharge Arkengine",
    description: "Add the Station Bonus to both movement and maneuver allowance this turn, then gain 1 Strain. Once per round.",
    summary: "+Station Bonus movement & maneuver; +1 Strain.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "overcharge"],
    rules: { resolver: "overchargeArkengine", strain: 1, strainArea: "arkengine", scaledAllowance: true, oncePerRound: true }
  }),
  action({
    id: "engineer-emergency-repair",
    station: "engineer",
    name: "Emergency Repair",
    description: "Choose Hull, Arkengine, Rigging, or Lifeveil and improve that area's damage state by one step. At ship level 15+, improve it by two steps instead.",
    summary: "Improve one damaged ship area; two steps at level 15+.",
    ap: 2,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "repair", "damage-control"],
    rules: { resolver: "emergencyRepair", chooseSystem: true, combatRepair: true, masterExtraStep: true }
  }),
  action({
    id: "engineer-redistribute-power",
    station: "engineer",
    name: "Redistribute Power",
    description: "Route power to Propulsion, Weapons, or Lifeveil until the ship's next turn. Propulsion improves movement/maneuver, Weapons adds damage, and Lifeveil adds damage mitigation using the Station Bonus.",
    summary: "Route scaled power to Propulsion, Weapons, or Lifeveil.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "power", "support", "native-effect"],
    rules: { resolver: "redistributePower", choices: ["propulsion", "weapons", "lifeveil"], effect: "power-routing", expires: "next-turn" }
  }),
  action({
    id: "engineer-emergency-bypass",
    station: "engineer",
    name: "Emergency Bypass",
    description: "Ready this reaction. The next Engineer action that would add Strain reduces that Strain by the Station Bonus, then consumes the bypass.",
    summary: "Reaction: reduce next Engineer Strain gain by Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "reaction", "arkengine", "system-defense", "native-effect"],
    rules: { resolver: "emergencyBypass", trigger: "engineer-strain", effect: "strain-mitigation" }
  }),

  // NAVIGATOR — movement, facing, rigging, position.
  action({
    id: "navigator-move",
    station: "navigator",
    name: "Move",
    description: "Gain forward movement equal to the vessel's effective Combat Speed. Movement can be interleaved with other legal ship actions.",
    summary: "Gain movement equal to Combat Speed.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MOVEMENT,
    tags: ["core", "movement", "interleavable"],
    rules: { resolver: "buyMovement", movementStat: "combatSpeed", direction: "forward", interleavable: true }
  }),
  action({
    id: "navigator-maneuver",
    station: "navigator",
    name: "Maneuver",
    description: "Gain facing changes equal to effective Maneuverability. Facing changes can be interleaved with movement and fire.",
    summary: "Gain facing steps equal to Maneuverability.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "interleavable"],
    rules: { resolver: "buyManeuver", facingStat: "maneuverability", interleavable: true }
  }),
  action({
    id: "navigator-hard-turn",
    station: "navigator",
    name: "Hard Turn",
    description: "Gain 1 + Station Bonus additional maneuver steps this turn and gain 1 Strain against Rigging.",
    summary: "+1 + Station Bonus maneuver steps; +1 Strain.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "strain"],
    rules: { resolver: "hardTurn", scaledFacingSteps: true, strain: 1, strainArea: "rigging" }
  }),
  action({
    id: "navigator-set-attack-vector",
    station: "navigator",
    name: "Set Attack Vector",
    description: "Choose Fore, Port, Starboard, or Aft. Weapon attacks from that facing gain the Station Bonus as a circumstance bonus until the heading changes or the ship's next turn.",
    summary: "Chosen facing gains Station Bonus to weapon attacks.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "positioning", "weapon-support", "facing", "native-effect"],
    rules: { resolver: "setAttackVector", chooseFacing: true, effect: "attack-bonus", expires: "heading-change-or-next-turn" }
  }),
  action({
    id: "navigator-evasive-maneuver",
    station: "navigator",
    name: "Evasive Maneuver",
    description: "Ready this reaction. The next incoming weapon attack treats this ship's AC as higher by the Station Bonus. Gain 1 Strain when the reaction is readied.",
    summary: "Reaction: +Station Bonus AC vs next attack; +1 Strain.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "reaction", "maneuver", "defense", "strain", "native-effect"],
    rules: { resolver: "evasiveManeuver", trigger: "targeted-by-attack", effect: "ac-bonus", strain: 1, strainArea: "rigging" }
  }),

  // BATTLEWATCH — threat picture, targets, weapons, reload coordination.
  action({
    id: "battlewatch-acquire-target",
    station: "battlewatch",
    name: "Acquire Target",
    description: "Choose an enemy vessel. The next weapon attack against that target gains the Station Bonus as a circumstance bonus.",
    summary: "Next attack vs selected target gains Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "targeting", "weapon", "native-effect"],
    rules: { resolver: "acquireTarget", chooseTarget: true, effect: "attack-bonus", appliesTo: "next-weapon-attack", expires: "next-turn" }
  }),
  action({
    id: "battlewatch-fire-weapon",
    station: "battlewatch",
    name: "Fire Weapon",
    description: "Fire one ready installed weapon at a legal target. Arkflight resolves range, arc, station effects, attack, damage, Hardness, Hull damage, and reload.",
    summary: "Resolve a legal installed weapon attack.",
    category: COMBAT_ACTION_CATEGORIES.WEAPON,
    tags: ["core", "weapon", "interleavable"],
    rules: { resolver: "fireAtTarget", costSource: "weapon.fireAP", requiresReadyWeapon: true, requiresRange: true, requiresArc: true, interleavable: true, startsReload: true }
  }),
  action({
    id: "battlewatch-reload-weapon",
    station: "battlewatch",
    name: "Work the Guns",
    description: "Reduce one installed weapon's remaining reload time by 1 round, to a minimum of 0.",
    summary: "Reduce selected weapon reload by 1 round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.RELOAD,
    tags: ["core", "weapon", "reload", "interleavable"],
    rules: { resolver: "workTheGuns", reloadReduction: 1, minimumReload: 0, chooseWeapon: true, interleavable: true }
  }),
  action({
    id: "battlewatch-ready-broadside",
    station: "battlewatch",
    name: "Ready Broadside",
    description: "Choose Port or Starboard. The next shot from that facing gains +2 × Station Bonus damage. At ship level 15+, that shot also reduces its resulting reload by 1 round.",
    summary: "Next Port/Starboard shot gains scaled damage.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "weapon", "broadside", "coordination", "native-effect"],
    rules: { resolver: "readyBroadside", chooseFacing: ["port", "starboard"], effect: "damage-bonus", expires: "fired-or-next-turn" }
  }),
  action({
    id: "battlewatch-spoil-their-aim",
    station: "battlewatch",
    name: "Spoil Their Aim",
    description: "Ready this reaction. The next enemy weapon attack against this ship takes a circumstance penalty equal to the Station Bonus.",
    summary: "Reaction: next incoming attack takes −Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "reaction", "targeting", "defense", "native-effect"],
    rules: { resolver: "spoilTheirAim", trigger: "enemy-attack-declared", effect: "attack-penalty" }
  }),

  // VEILWARDEN — Lifeveil recovery, wards, supernatural defense.
  action({
    id: "veilwarden-reinforce-lifeveil",
    station: "veilwarden",
    name: "Reinforce Lifeveil",
    description: "Until the ship's next turn, energy or Lifeveil-threatening weapon damage is reduced by 2 × Station Bonus before Hardness.",
    summary: "Reduce energy/Lifeveil damage by 2 × Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "defense", "native-effect"],
    rules: { resolver: "reinforceLifeveil", effect: "ward-mitigation", expires: "next-turn" }
  }),
  action({
    id: "veilwarden-mend-lifeveil",
    station: "veilwarden",
    name: "Mend Lifeveil",
    description: "Restore 5 × Station Bonus Lifeveil, up to the vessel's current maximum.",
    summary: "Restore 5 × Station Bonus Lifeveil.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "recovery"],
    rules: { resolver: "mendLifeveil", scaledLifeveilRestore: true, cappedAtMaximum: true }
  }),
  action({
    id: "veilwarden-focus-ward",
    station: "veilwarden",
    name: "Focus Ward",
    description: "Choose a ship area or energy type. Matching weapon damage is reduced by 2 × Station Bonus before Hardness until the ship's next turn.",
    summary: "Ward one area/energy type for scaled mitigation.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "ward", "support", "native-effect"],
    rules: { resolver: "focusWard", chooseAreaOrEnergy: true, effect: "ward-mitigation", expires: "next-turn" }
  }),
  action({
    id: "veilwarden-purge-interference",
    station: "veilwarden",
    name: "Purge Interference",
    description: "Remove one tracked supernatural, aetheric, or environmental ship condition interfering with the vessel or its Lifeveil.",
    summary: "Remove one tracked hostile ship condition.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "countermeasure", "recovery"],
    rules: { resolver: "purgeInterference", removesHostileEffect: true }
  }),
  action({
    id: "veilwarden-emergency-ward",
    station: "veilwarden",
    name: "Emergency Ward",
    description: "Ready this reaction. The next energy or Lifeveil-threatening hit reduces incoming damage by 4 × Station Bonus before Hardness, then consumes the ward.",
    summary: "Reaction: reduce next wardable hit by 4 × Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "reaction", "lifeveil", "defense", "native-effect"],
    rules: { resolver: "emergencyWard", trigger: "incoming-lifeveil-or-energy-damage", effect: "ward-mitigation" }
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

export function getCoreCombatActionDefinitionsForStation(station) {
  return Object.freeze(getCoreCombatActionsForStation(station).map((id) => COMBAT_ACTIONS[id]).filter(Boolean));
}