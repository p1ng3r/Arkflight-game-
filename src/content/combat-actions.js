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

// Arkflight combat deliberately keeps a small, fixed action vocabulary. Each
// permanent station gets four Actions and one Reaction, but those options are
// orthogonal: command changes tempo/coordination, engineering changes resources,
// navigation changes geometry, battlewatch changes accuracy/gunnery, and the
// Veilwarden changes magical defense. Station Bonus remains bounded at +1/+2/+3
// so ship-level progression adds capability without breaking PF2e-style math.
const CORE_ACTIONS = [
  // COMMON — baseline ship actions available to any ship Owner.
  action({
    id: "common-reload-weapon",
    station: "common",
    name: "Reload",
    description: "Spend 1 AP to reduce one installed weapon's remaining Reload by 1 round. Any Owner of the ship may perform this action.",
    summary: "Spend 1 AP to reduce one weapon's Reload by 1 round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.RELOAD,
    tags: ["core", "common", "weapon", "reload", "interleavable"],
    rules: { resolver: "reloadWeapon", minimumReload: 0, chooseWeapon: true, interleavable: true }
  }),

  // CAPTAIN — tempo, morale, coordination, broad defense.
  action({
    id: "captain-issue-order",
    station: "captain",
    name: "Issue Order",
    description: "Choose another station. The next qualifying check or attack made by that station before this ship's next turn gains the ship's Station Bonus as a circumstance bonus. Issue Order does not increase deterministic recovery or resource amounts.",
    summary: "Choose a station; its next qualifying roll gains Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "coordination", "native-effect"],
    rules: { resolver: "issueOrder", chooseStation: true, effect: "station-bonus", expires: "next-qualifying-roll-or-turn" }
  }),
  action({
    id: "captain-rally-crew",
    station: "captain",
    name: "Rally Crew",
    description: "Restore Morale equal to the Station Bonus, or improve a degraded Morale area by one step. At ship level 15+, improving the Morale area also restores Morale equal to the Station Bonus.",
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
    description: "Pay 1 AP, then gain 2 AP for a net +1 AP this turn. Gain 2 Strain. At ship level 15+ gain only 1 Strain; at level 20 gain no Strain. Once per round.",
    summary: "Net +1 AP now; 2 Strain (1 at 15+, 0 at 20); once/round.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "strain", "action-economy", "risk-reward"],
    rules: { resolver: "driveCrew", gainAP: 2, strain: 2, strainArea: "morale", oncePerRound: true, masterReducedStrain: true, legendaryNoStrain: true }
  }),
  action({
    id: "captain-coordinate-assault",
    station: "captain",
    name: "Coordinate Assault",
    description: "Choose one hostile vessel. The next weapon attack against it treats that vessel's Hardness as lower by the Station Bonus for damage resolution. From ship level 5, this applies to the next two qualifying attacks.",
    summary: "Mark a target; next attack(s) reduce its Hardness by Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "command", "targeting", "offense", "native-effect"],
    rules: { resolver: "coordinateAssault", chooseTarget: true, effect: "hardness-reduction", appliesTo: "next-weapon-attack", expires: "next-turn" }
  }),
  action({
    id: "captain-brace-for-impact",
    station: "captain",
    name: "Brace for Impact",
    description: "Reaction — Trigger: this ship is about to take Hull damage. Reduce that Hull damage by 3 × Station Bonus after Hardness.",
    summary: "Reaction: reduce incoming Hull damage by 3 × Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.COMMAND,
    tags: ["core", "reaction", "defense", "morale", "native-effect"],
    rules: { resolver: "braceForImpact", trigger: "incoming-hull-damage", effect: "hull-mitigation" }
  }),

  // ENGINEER — Strain, power routing, damage control, propulsion overdrive.
  action({
    id: "engineer-vent-strain",
    station: "engineer",
    name: "Vent Strain",
    description: "Reduce ship Strain by 1 + Station Bonus, to a minimum of 0.",
    summary: "Reduce Strain by 1 + Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "recovery"],
    rules: { resolver: "ventStrain", scaledStrainReduction: true, baseReduction: 1, minimumStrain: 0 }
  }),
  action({
    id: "engineer-overcharge-arkengine",
    station: "engineer",
    name: "Overcharge Arkengine",
    description: "Gain one additional full Helm block this turn: movement equal to Combat Speed and facing steps equal to Maneuverability. Gain 1 Strain. Once per round.",
    summary: "+Combat Speed movement and +Maneuverability turns; +1 Strain.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "strain", "overcharge", "risk-reward"],
    rules: { resolver: "overchargeArkengine", strain: 1, strainArea: "arkengine", fullHelmBlock: true, oncePerRound: true }
  }),
  action({
    id: "engineer-emergency-repair",
    station: "engineer",
    name: "Emergency Repair",
    description: "Choose Hull, Arkengine, Rigging, or Lifeveil and improve that area's damage state by one step. At ship level 15+, improve it by two steps instead.",
    summary: "Improve one damaged ship area; two steps at level 15+.",
    ap: 2,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "repair", "damage-control", "high-impact"],
    rules: { resolver: "emergencyRepair", chooseSystem: true, combatRepair: true, masterExtraStep: true }
  }),
  action({
    id: "engineer-redistribute-power",
    station: "engineer",
    name: "Redistribute Power",
    description: "Route power to Propulsion, Weapons, or Lifeveil. Propulsion immediately grants Station Bonus movement and 1 maneuver step. Weapons gives the next weapon attack(s) +Station Bonus damage. Lifeveil reduces the next wardable hit(s) by 2 × Station Bonus. From ship level 5, Weapons and Lifeveil each cover two qualifying uses.",
    summary: "Choose a smaller no-Strain boost to Propulsion, Weapons, or Lifeveil.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "arkengine", "power", "support", "native-effect"],
    rules: { resolver: "redistributePower", choices: ["propulsion", "weapons", "lifeveil"], effect: "power-routing", expires: "charges-or-next-turn" }
  }),
  action({
    id: "engineer-emergency-bypass",
    station: "engineer",
    name: "Emergency Bypass",
    description: "Reaction — Trigger: an Engineer action would add Strain. Reduce that Strain gain by the Station Bonus, to a minimum of 0.",
    summary: "Reaction: reduce Engineer Strain gain by Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.ENGINEERING,
    tags: ["core", "reaction", "arkengine", "system-defense", "native-effect"],
    rules: { resolver: "emergencyBypass", trigger: "engineer-strain", effect: "strain-mitigation" }
  }),

  // NAVIGATOR — free Helm baseline plus paid exceptional geometry.
  action({
    id: "navigator-move",
    station: "navigator",
    name: "Push Ahead",
    description: "After the vessel's free Helm movement is available, spend 1 AP to gain additional movement equal to effective Combat Speed. Movement can be interleaved with legal facing changes and weapon fire.",
    summary: "Gain another Combat Speed of movement.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MOVEMENT,
    tags: ["core", "movement", "interleavable", "extra-helm"],
    rules: { resolver: "buyMovement", movementStat: "combatSpeed", direction: "forward", interleavable: true }
  }),
  action({
    id: "navigator-maneuver",
    station: "navigator",
    name: "Extra Maneuver",
    description: "Spend 1 AP to gain additional facing changes equal to effective Maneuverability. This exceptional maneuver allowance permits an in-place pivot.",
    summary: "Gain another Maneuverability worth of facing steps; may pivot.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "interleavable", "extra-helm"],
    rules: { resolver: "buyManeuver", facingStat: "maneuverability", interleavable: true, permitsPivot: true }
  }),
  action({
    id: "navigator-hard-turn",
    station: "navigator",
    name: "Hard Turn",
    description: "Gain additional facing steps equal to Maneuverability + Station Bonus this turn, and you may pivot in place. Gain 1 Strain against Rigging.",
    summary: "+Maneuverability + Station Bonus turns; may pivot; +1 Strain.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "facing", "strain", "risk-reward"],
    rules: { resolver: "hardTurn", scaledFacingSteps: true, includeManeuverability: true, strain: 1, strainArea: "rigging", permitsPivot: true }
  }),
  action({
    id: "navigator-set-attack-vector",
    station: "navigator",
    name: "Set Attack Vector",
    description: "Choose Fore, Port, Starboard, or Aft. Until the heading changes or the ship's next turn, weapons from that facing gain 15° × Station Bonus of extra firing-arc tolerance. This changes geometry rather than adding another attack bonus.",
    summary: "Chosen facing gains +15° × Station Bonus firing-arc tolerance.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "positioning", "weapon-support", "facing", "native-effect"],
    rules: { resolver: "setAttackVector", chooseFacing: true, effect: "arc-tolerance", degreesPerBonus: 15, expires: "heading-change-or-next-turn" }
  }),
  action({
    id: "navigator-evasive-maneuver",
    station: "navigator",
    name: "Evasive Maneuver",
    description: "Reaction — Trigger: this ship is targeted by a weapon attack. Increase this ship's AC against that attack by the Station Bonus, then gain 1 Strain against Rigging.",
    summary: "Reaction: +Station Bonus AC vs this attack; +1 Strain.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "reaction", "maneuver", "defense", "strain", "native-effect"],
    rules: { resolver: "evasiveManeuver", trigger: "targeted-by-attack", effect: "ac-bonus", strain: 1, strainArea: "rigging" }
  }),

  // BATTLEWATCH — accuracy, firing, reload tempo, broadside burst.
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
    description: "Spend 1 AP to fire one ready installed weapon at a legal target. Arkflight resolves range, arc, station effects, attack, damage, mitigation, Hardness, Hull damage, and reload.",
    summary: "Spend 1 AP to resolve a legal installed weapon attack.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.WEAPON,
    tags: ["core", "weapon", "interleavable"],
    rules: { resolver: "fireAtTarget", requiresReadyWeapon: true, requiresRange: true, requiresArc: true, interleavable: true, startsReload: true }
  }),
  action({
    id: "battlewatch-reload-weapon",
    station: "battlewatch",
    name: "Work the Guns",
    description: "Once per round, spend 1 Morale and gain 1 Strain to immediately ready one installed weapon with 2 or fewer rounds of Reload remaining. This action costs 0 AP.",
    summary: "Once/round: 1 Morale +1 Strain; ready a weapon at Reload 2 or less for 0 AP.",
    category: COMBAT_ACTION_CATEGORIES.RELOAD,
    tags: ["core", "weapon", "reload", "battlewatch", "risk-reward", "interleavable"],
    rules: { resolver: "workTheGuns", maxReloadRemaining: 2, readyWeapon: true, chooseWeapon: true, interleavable: true, oncePerRound: true, strain: 1, strainArea: "morale" }
  }),
  action({
    id: "battlewatch-ready-broadside",
    station: "battlewatch",
    name: "Ready Broadside",
    description: "Choose Port or Starboard. The next shot from that facing gains +2 × Station Bonus damage. At ship level 15+, that shot also reduces its resulting reload by 1 round.",
    summary: "Next Port/Starboard shot gains +2 × Station Bonus damage.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "weapon", "broadside", "coordination", "native-effect"],
    rules: { resolver: "readyBroadside", chooseFacing: ["port", "starboard"], effect: "damage-bonus", expires: "fired-or-next-turn" }
  }),
  action({
    id: "battlewatch-spoil-their-aim",
    station: "battlewatch",
    name: "Spoil Their Aim",
    description: "Reaction — Trigger: an enemy declares a weapon attack against this ship. That attack takes a circumstance penalty equal to the Station Bonus.",
    summary: "Reaction: incoming attack takes −Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.BATTLEWATCH,
    tags: ["core", "reaction", "targeting", "defense", "native-effect"],
    rules: { resolver: "spoilTheirAim", trigger: "enemy-attack-declared", effect: "attack-penalty" }
  }),

  // VEILWARDEN — broad ward, focused ward, recovery, countermeasures.
  action({
    id: "veilwarden-reinforce-lifeveil",
    station: "veilwarden",
    name: "Reinforce Lifeveil",
    description: "The next wardable hit reduces incoming damage by 2 × Station Bonus before Hardness. From ship level 5, this protects against the next two qualifying hits before the ship's next turn.",
    summary: "Next wardable hit(s): reduce damage by 2 × Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "defense", "native-effect"],
    rules: { resolver: "reinforceLifeveil", effect: "ward-mitigation", expires: "charges-or-next-turn" }
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
    description: "Choose a ship area or energy type. The next matching hit reduces incoming damage by 3 × Station Bonus before Hardness. From ship level 5, this protects against the next two matching hits before the ship's next turn.",
    summary: "Choose a threat; matching hit(s) reduce damage by 3 × Station Bonus.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "lifeveil", "ward", "support", "native-effect"],
    rules: { resolver: "focusWard", chooseAreaOrEnergy: true, effect: "focused-ward-mitigation", expires: "charges-or-next-turn" }
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
    description: "Reaction — Trigger: a wardable hit is about to deal damage. Reduce incoming damage by 4 × Station Bonus before Hardness.",
    summary: "Reaction: reduce this wardable hit by 4 × Station Bonus.",
    rp: 1,
    timing: COMBAT_ACTION_TIMING.REACTION,
    category: COMBAT_ACTION_CATEGORIES.LIFEVEIL,
    tags: ["core", "reaction", "lifeveil", "defense", "native-effect"],
    rules: { resolver: "emergencyWard", trigger: "incoming-lifeveil-or-energy-damage", effect: "ward-mitigation" }
  })
];

const ADDITIONAL_ACTIONS = [
  action({
    id: "navigator-impossible-burn",
    station: "navigator",
    name: "Impossible Burn",
    description: "Once per battle, overburn the Arkengine to add 50% of current Combat Speed to this turn's movement allowance. Gain 2 Strain against the Arkengine.",
    summary: "Once/battle: +50% Speed movement this turn; +2 Arkengine Strain.",
    ap: 0,
    category: COMBAT_ACTION_CATEGORIES.MOVEMENT,
    tags: ["progression", "mythic", "movement", "strain", "interleavable"],
    rules: { resolver: "impossibleBurn", oncePerBattle: true, requiresCapability: "impossible-burn", strain: 2, strainArea: "arkengine", interleavable: true }
  }),
  action({
    id: "navigator-turn-between-heartbeats",
    station: "navigator",
    name: "Turn Between Heartbeats",
    description: "Once per battle, gain 2 extraordinary 60-degree facing steps this turn. These steps do not consume the ship's normal Maneuverability allowance.",
    summary: "Once/battle: gain 2 extraordinary facing steps this turn.",
    ap: 0,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["progression", "mythic", "maneuver", "facing", "interleavable"],
    rules: { resolver: "turnBetweenHeartbeats", oncePerBattle: true, requiresCapability: "turn-between-heartbeats", extraFacingSteps: 2, interleavable: true, permitsPivot: true }
  }),

  action({
    id: "navigator-ram-ship",
    station: "navigator",
    name: "Ram",
    description: "Spend 2 AP after moving at least 1 hex this turn to ram an adjacent ship. The target makes a Maneuver Save against this ship's Collision DC. Collision damage scales with hull class and approach momentum; the ramming ship can suffer recoil damage.",
    summary: "2 AP: ram an adjacent ship; target makes a Maneuver Save.",
    ap: 2,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "collision", "target", "risk-reward"],
    rules: { resolver: "ramShip", chooseTarget: true, requiresAdjacency: true, requiresMovementThisTurn: true }
  }),
  action({
    id: "navigator-grapple-ship",
    station: "navigator",
    name: "Grapple Ship",
    description: "Spend 1 AP to throw lines and grapples across an adjacent ship. The target makes a Maneuver Save against this ship's Grapple DC. On a failed save the ships become Moored; on a critical failure the target also exposes a boarding opportunity.",
    summary: "1 AP: adjacent target saves or becomes Moored.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "grapple", "boarding", "target"],
    rules: { resolver: "grappleShip", chooseTarget: true, requiresAdjacency: true }
  }),
  action({
    id: "navigator-break-grapple",
    station: "navigator",
    name: "Break Grapple",
    description: "Spend 1 AP while Moored to wrench the ship free. Make this ship's Maneuver Save against the other vessel's Grapple DC. On a success the Moored condition ends for both ships.",
    summary: "1 AP: Maneuver Save to break an existing grapple.",
    ap: 1,
    category: COMBAT_ACTION_CATEGORIES.MANEUVER,
    tags: ["core", "maneuver", "grapple", "escape"],
    rules: { resolver: "breakGrapple", chooseTarget: true, requiresMoored: true }
  }),
  action({
    id: "common-board-ship",
    station: "common",
    name: "Board Ship",
    description: "Once two ships are Moored, establish boarding between them at 0 AP. Ship combat keeps the vessels Moored while character-scale fighting proceeds using normal PF2e rules.",
    summary: "0 AP: establish boarding with a Moored ship.",
    ap: 0,
    category: COMBAT_ACTION_CATEGORIES.SUPPORT,
    tags: ["core", "boarding", "grapple", "pf2e-handoff"],
    rules: { resolver: "boardShip", chooseTarget: true, requiresMoored: true }

];

export const COMBAT_ACTIONS = Object.freeze(Object.fromEntries([...CORE_ACTIONS, ...ADDITIONAL_ACTIONS].map((entry) => [entry.id, entry])));

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
