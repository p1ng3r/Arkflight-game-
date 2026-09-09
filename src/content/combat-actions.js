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

// Core station combat menu. Arkflight combat uses one shared vessel AP/RP pool:
// these are station-owned choices, not five independent PF2e turns. Every core
// station deliberately ships with four Actions and one Reaction so every crew
// position has meaningful decisions in every engagement before talents add more.
const CORE_ACTIONS = [
  // CAPTAIN — command, morale, coordination.
  action({
    id: "captain-issue-order",
    station: "captain",
    name: "Issue Order",
    description: "Spend 1 AP to direct one station toward a specific combat objective. The next qualifying action by that station gains the authored command benefit for this round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "coordination"],
    rules: { resolver: "issueOrder", chooseStation: true, expires: "end-round" }
  }),
  action({
    id: "captain-rally-crew",
    station: "captain",
    name: "Rally Crew",
    description: "Spend 1 AP to steady the crew under fire, restoring command cohesion and suppressing a Morale combat penalty or condition when possible.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "morale", "recovery"],
    rules: { resolver: "rallyCrew", area: "morale", conditionRecovery: true }
  }),
  action({
    id: "captain-drive-the-crew",
    station: "captain",
    name: "Drive the Crew",
    description: "Spend 1 AP and push Morale to create one net additional ship Action this round. This is powerful, but the ship gains 1 Strain against Morale and the action can be used only once per round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "strain", "action-economy"],
    rules: { resolver: "driveCrew", gainAP: 2, strain: 1, strainArea: "morale", oncePerRound: true }
  }),
  action({
    id: "captain-coordinate-assault",
    station: "captain",
    name: "Coordinate Assault",
    description: "Spend 1 AP to synchronize Battlewatch, helm, and gun crews against one target. The next qualifying attack against that target gains the authored coordinated-assault benefit this round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "targeting", "offense"],
    rules: { resolver: "coordinateAssault", chooseTarget: true, appliesTo: "next-weapon-attack", expires: "end-round" }
  }),
  action({
    id: "captain-brace-for-impact",
    station: "captain",
    name: "Brace for Impact",
    description: "Spend 1 RP when the ship is about to suffer Hull damage from an attack, collision, or impact. The crew braces and the incoming consequence is mitigated before Hull is reduced.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "reaction", "defense", "morale"],
    rules: { resolver: "braceForImpact", trigger: "incoming-hull-damage", mitigation: true }
  }),

  // ENGINEER — Arkengine, power, Strain, damage control.
  action({
    id: "engineer-vent-strain",
    station: "engineer",
    name: "Vent Strain",
    description: "Spend 1 AP to bleed dangerous pressure and aether load from the Arkengine, reducing combat Strain through controlled venting.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "recovery"],
    rules: { resolver: "ventStrain", strainReduction: 1, minimumStrain: 0 }
  }),
  action({
    id: "engineer-overcharge-arkengine",
    station: "engineer",
    name: "Overcharge Arkengine",
    description: "Spend 1 AP to overcharge propulsion and power distribution for the round. Gain a temporary Arkengine output benefit and 1 Strain against Arkengine.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "overcharge"],
    rules: { resolver: "overchargeArkengine", strain: 1, strainArea: "arkengine", expires: "end-round", oncePerRound: true }
  }),
  action({
    id: "engineer-emergency-repair",
    station: "engineer",
    name: "Emergency Repair",
    description: "Spend 2 AP to conduct immediate damage control on a damaged ship system. Combat repairs are deliberately smaller than a full Shipwright repair and cannot exceed the system's normal maximum.",
    ap: 2,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "repair", "damage-control"],
    rules: { resolver: "emergencyRepair", chooseSystem: true, combatRepair: true }
  }),
  action({
    id: "engineer-redistribute-power",
    station: "engineer",
    name: "Redistribute Power",
    description: "Spend 1 AP to route Arkengine output to propulsion, weapons support, or the Lifeveil. Choose one supported system to receive the authored power benefit until the end of the round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "power", "support"],
    rules: { resolver: "redistributePower", choices: ["propulsion", "weapons", "lifeveil"], expires: "end-round" }
  }),
  action({
    id: "engineer-emergency-bypass",
    station: "engineer",
    name: "Emergency Bypass",
    description: "Spend 1 RP when an Arkengine or ship-system complication would disable, interrupt, or penalize a system. Bypass the immediate failure long enough to resolve the triggering operation.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "reaction", "arkengine", "system-defense"],
    rules: { resolver: "emergencyBypass", trigger: "system-complication", temporaryBypass: true }
  }),

  // NAVIGATOR — movement, facing, rigging, position.
  action({
    id: "navigator-move",
    station: "navigator",
    name: "Move",
    description: "Spend 1 AP to gain forward movement equal to the ship's effective Combat Speed. Movement may be interleaved with maneuvering, weapon fire, reload actions, and other legal combat actions.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MOVEMENT,
    tags: ["core", "movement", "interleavable"],
    rules: { resolver: "buyMovement", movementStat: "combatSpeed", direction: "forward", interleavable: true }
  }),
  action({
    id: "navigator-maneuver",
    station: "navigator",
    name: "Maneuver",
    description: "Spend 1 AP to gain facing changes equal to the ship's effective Maneuverability. Those facing changes may be used at any point during the ship's movement sequence.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "interleavable"],
    rules: { resolver: "buyManeuver", facingStat: "maneuverability", interleavable: true }
  }),
  action({
    id: "navigator-hard-turn",
    station: "navigator",
    name: "Hard Turn",
    description: "Spend 1 AP to force an aggressive facing change beyond normal helm handling. The ship gains 1 Strain against Rigging in exchange for the stronger turn.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "strain"],
    rules: { resolver: "hardTurn", facingSteps: 2, strain: 1, strainArea: "rigging" }
  }),
  action({
    id: "navigator-set-attack-vector",
    station: "navigator",
    name: "Set Attack Vector",
    description: "Spend 1 AP to commit the ship to an advantageous attack line. Choose a facing; qualifying weapon attacks from that facing receive the authored positioning benefit until the ship changes heading or the round ends.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "positioning", "weapon-support", "facing"],
    rules: { resolver: "setAttackVector", chooseFacing: true, expires: "heading-change-or-end-round" }
  }),
  action({
    id: "navigator-evasive-maneuver",
    station: "navigator",
    name: "Evasive Maneuver",
    description: "Spend 1 RP when the ship is targeted by an attack and immediately throw the vessel off the predicted line. Apply the authored defensive maneuver benefit and gain 1 Strain against Rigging.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "reaction", "maneuver", "defense", "strain"],
    rules: { resolver: "evasiveManeuver", trigger: "targeted-by-attack", strain: 1, strainArea: "rigging" }
  }),

  // BATTLEWATCH — threat picture, targets, weapons, reload coordination.
  action({
    id: "battlewatch-acquire-target",
    station: "battlewatch",
    name: "Acquire Target",
    description: "Spend 1 AP to establish a precise firing solution on one enemy ship. The next qualifying attack against that target receives the authored targeting benefit this round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "targeting", "weapon"],
    rules: { resolver: "acquireTarget", chooseTarget: true, appliesTo: "next-weapon-attack", expires: "end-round" }
  }),
  action({
    id: "battlewatch-fire-weapon",
    station: "battlewatch",
    name: "Fire Weapon",
    description: "Fire one ready installed ship weapon at a legal target. Its AP cost comes from the weapon itself; range, firing arc, attack roll, damage, Hardness, and reload are resolved by Arkflight fire control.",
    category: COMBAT_ACTION_CATEGORIES.WEAPON,
    tags: ["core", "weapon", "interleavable"],
    rules: { resolver: "fireAtTarget", costSource: "weapon.fireAP", requiresReadyWeapon: true, requiresRange: true, requiresArc: true, interleavable: true, startsReload: true }
  }),
  action({
    id: "battlewatch-reload-weapon",
    station: "battlewatch",
    name: "Work the Guns",
    description: "Spend 1 AP to reduce the remaining reload time of one installed weapon by 1 round, to a minimum of 0.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.RELOAD,
    tags: ["core", "weapon", "reload", "interleavable"],
    rules: { resolver: "workTheGuns", reloadReduction: 1, minimumReload: 0, chooseWeapon: true, interleavable: true }
  }),
  action({
    id: "battlewatch-ready-broadside",
    station: "battlewatch",
    name: "Ready Broadside",
    description: "Spend 1 AP to coordinate every ready weapon on one Port or Starboard battery. The chosen broadside receives the authored battery benefit until fired or the round ends.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "weapon", "broadside", "coordination"],
    rules: { resolver: "readyBroadside", chooseFacing: ["port", "starboard"], expires: "fired-or-end-round" }
  }),
  action({
    id: "battlewatch-spoil-their-aim",
    station: "battlewatch",
    name: "Spoil Their Aim",
    description: "Spend 1 RP when an enemy ship declares or resolves a firing solution against this vessel. Disrupt the shot with counter-calls, obscuration, and rapid threat warnings.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "reaction", "targeting", "defense"],
    rules: { resolver: "spoilTheirAim", trigger: "enemy-attack-declared", attackMitigation: true }
  }),

  // VEILWARDEN — Lifeveil recovery, wards, supernatural defense.
  action({
    id: "veilwarden-reinforce-lifeveil",
    station: "veilwarden",
    name: "Reinforce Lifeveil",
    description: "Spend 1 AP to reinforce the active Lifeveil, increasing its immediate defensive stability until the end of the round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "defense"],
    rules: { resolver: "reinforceLifeveil", temporaryProtection: true, expires: "end-round" }
  }),
  action({
    id: "veilwarden-mend-lifeveil",
    station: "veilwarden",
    name: "Mend Lifeveil",
    description: "Spend 1 AP to restore a small amount of depleted Lifeveil capacity. This cannot raise the Lifeveil above its current maximum.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "recovery"],
    rules: { resolver: "mendLifeveil", restoreLifeveil: true, cappedAtMaximum: true }
  }),
  action({
    id: "veilwarden-focus-ward",
    station: "veilwarden",
    name: "Focus Ward",
    description: "Spend 1 AP to focus the Lifeveil toward one threatened ship area or hostile energy type, granting the authored ward benefit until the end of the round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "ward", "support"],
    rules: { resolver: "focusWard", chooseAreaOrEnergy: true, expires: "end-round" }
  }),
  action({
    id: "veilwarden-purge-interference",
    station: "veilwarden",
    name: "Purge Interference",
    description: "Spend 1 AP to contest a hostile supernatural, aetheric, or environmental effect currently interfering with the ship's Lifeveil or protected crew.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "countermeasure", "recovery"],
    rules: { resolver: "purgeInterference", removesHostileEffect: true }
  }),
  action({
    id: "veilwarden-emergency-ward",
    station: "veilwarden",
    name: "Emergency Ward",
    description: "Spend 1 RP when the ship would suffer energy, supernatural, or Lifeveil-breaching damage. Flash-strengthen the veil to mitigate the triggering damage before it is applied.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "reaction", "lifeveil", "defense"],
    rules: { resolver: "emergencyWard", trigger: "incoming-lifeveil-or-energy-damage", mitigation: true }
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
