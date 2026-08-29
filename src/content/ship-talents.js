const TIER = Object.freeze({ FOUNDATION: "foundation", SPECIALIST: "specialist", LEGENDARY: "legendary", MYTHIC: "mythic" });

const talent = (id, name, tier, cost, description, effects = [], extra = {}) => Object.freeze({
  id, name, tier, cost, description, effects: Object.freeze(effects.map((effect) => Object.freeze(effect))), ...extra
});
const add = (target, value) => ({ mode: "add", target, value });
const percentBase = (target, value) => ({ mode: "percentBase", target, value });
const station = (stationId, value) => ({ mode: "stationBonus", station: stationId, value });
const pillar = (pillarId, value) => ({ mode: "pillarBonus", pillar: pillarId, value });
const slot = (slotType, value = 1) => ({ mode: "modSlot", slotType, value });
const unlockArkcraft = (stationId, ids) => ({ mode: "unlockArkcraft", station: stationId, ids });
const upgradeArkcraft = (stationId, ids) => ({ mode: "upgradeArkcraft", station: stationId, ids });

const FOUNDATION = [
  talent("captains-vessel", "Captain's Vessel", TIER.FOUNDATION, 1, "+1 to all Captain station rolls in Voyage and Combat.", [station("captain", 1)]),
  talent("engineers-vessel", "Engineer's Vessel", TIER.FOUNDATION, 1, "+1 to all Engineer station rolls in Voyage and Combat.", [station("engineer", 1)]),
  talent("navigators-vessel", "Navigator's Vessel", TIER.FOUNDATION, 1, "+1 to all Navigator station rolls in Voyage and Combat.", [station("navigator", 1)]),
  talent("battlewatch-vessel", "Battlewatch Vessel", TIER.FOUNDATION, 1, "+1 to all Battlewatch station rolls in Voyage and Combat.", [station("battlewatch", 1)]),
  talent("veilwardens-vessel", "Veilwarden's Vessel", TIER.FOUNDATION, 1, "+1 to all Veilwarden station rolls in Voyage and Combat.", [station("veilwarden", 1)]),
  talent("voyage-trained", "Voyage Trained", TIER.FOUNDATION, 2, "+1 to all station rolls during Voyage Events.", [pillar("voyage", 1)]),
  talent("battle-trained", "Battle Trained", TIER.FOUNDATION, 2, "+1 to all station rolls during Ship Combat.", [pillar("combat", 1)]),
  talent("toughness", "Toughness", TIER.FOUNDATION, 1, "+10% base Hull maximum.", [percentBase("hullIntegrity", 10)]),
  talent("greater-frame", "Greater Frame", TIER.FOUNDATION, 2, "+20% base Hull maximum.", [percentBase("hullIntegrity", 20)]),
  talent("reinforced-lifeveil", "Reinforced Lifeveil", TIER.FOUNDATION, 1, "+10% base Lifeveil maximum.", [percentBase("lifeveilCapacity", 10)]),
  talent("deep-veil-reservoir", "Deep Veil Reservoir", TIER.FOUNDATION, 2, "+20% base Lifeveil maximum.", [percentBase("lifeveilCapacity", 20)]),
  talent("hardened-construction", "Hardened Construction", TIER.FOUNDATION, 1, "+1 ship Hardness / physical resistance.", [add("hardness", 1)]),
  talent("battle-hardened", "Battle Hardened", TIER.FOUNDATION, 2, "+1 Armor Class and +1 to ship weapon attack rolls.", [add("armorClass", 1), add("weaponAttackBonus", 1)]),
  talent("weapon-calibration", "Weapon Calibration", TIER.FOUNDATION, 1, "+1 to ship weapon attack rolls.", [add("weaponAttackBonus", 1)]),
  talent("defensive-bracing", "Defensive Bracing", TIER.FOUNDATION, 1, "+1 to ship defensive and mitigation checks.", [add("defensiveCheckBonus", 1)]),
  talent("repair-trained", "Repair Trained", TIER.FOUNDATION, 1, "+1 to repair checks made aboard the ship.", [add("repairCheckBonus", 1)]),
  talent("efficient-repair-crews", "Efficient Repair Crews", TIER.FOUNDATION, 1, "Reduce ordinary repair time by 10%.", [add("repairTimePercent", -10)]),
  talent("frugal-repairs", "Frugal Repairs", TIER.FOUNDATION, 1, "Reduce ordinary repair Supply cost by 10%.", [add("repairSupplyPercent", -10)]),
  talent("spare-stores", "Spare Stores", TIER.FOUNDATION, 1, "+10% base Supply capacity.", [percentBase("supplyCapacity", 10)]),
  talent("expanded-cargo", "Expanded Cargo", TIER.FOUNDATION, 1, "+10% base Cargo capacity.", [percentBase("cargoCapacity", 10)]),
  talent("crew-quarters", "Crew Quarters", TIER.FOUNDATION, 1, "+10% base Morale maximum.", [percentBase("moraleCapacity", 10)]),
  talent("efficient-stores", "Efficient Stores", TIER.FOUNDATION, 1, "Reduce routine Supply consumption by 10%.", [add("supplyUsePercent", -10)]),
  talent("reinforced-decks", "Reinforced Decks", TIER.FOUNDATION, 1, "+5% base Hull and +5% base Morale.", [percentBase("hullIntegrity", 5), percentBase("moraleCapacity", 5)]),
  talent("steady-command", "Steady Command", TIER.FOUNDATION, 2, "+1 Captain and +1 Battlewatch station rolls.", [station("captain", 1), station("battlewatch", 1)]),
  talent("technical-crew", "Technical Crew", TIER.FOUNDATION, 2, "+1 Engineer and +1 Veilwarden station rolls.", [station("engineer", 1), station("veilwarden", 1)])
];

const SPECIALIST = [
  talent("improved-drive", "Improved Drive", TIER.SPECIALIST, 2, "+1 Speed.", [add("combatSpeed", 1)]),
  talent("responsive-rigging", "Responsive Rigging", TIER.SPECIALIST, 2, "+1 Maneuverability. Maneuverability includes facing control.", [add("maneuverability", 1)]),
  talent("deep-strain-reserves", "Deep Strain Reserves", TIER.SPECIALIST, 3, "+1 Strain Limit.", [add("strainCapacity", 1)]),
  talent("expanded-weapon-mount", "Expanded Weapon Mount", TIER.SPECIALIST, 2, "+1 Weapon Mod slot.", [slot("weapon")]),
  talent("expanded-structural-bay", "Expanded Structural Bay", TIER.SPECIALIST, 2, "+1 Structural Mod slot.", [slot("structural")]),
  talent("expanded-rigging-bay", "Expanded Rigging Bay", TIER.SPECIALIST, 2, "+1 Rigging Mod slot.", [slot("rigging")]),
  talent("expanded-lifeveil-bay", "Expanded Lifeveil Bay", TIER.SPECIALIST, 2, "+1 Lifeveil Mod slot.", [slot("lifeveil")]),
  talent("expanded-utility-bay", "Expanded Utility Bay", TIER.SPECIALIST, 1, "+1 Utility Mod slot.", [slot("utility")]),
  talent("expanded-support-bay", "Expanded Support Bay", TIER.SPECIALIST, 1, "+1 Cargo / Support Mod slot.", [slot("support")]),
  talent("engineers-refit", "Engineer's Refit", TIER.SPECIALIST, 3, "+1 Arkengine Mod slot.", [add("arkengineModCapacity", 1), slot("arkengine")]),
  talent("major-refit", "Major Refit", TIER.SPECIALIST, 3, "+1 flexible Ship Mod slot.", [add("shipModCapacity", 1), slot("flexible")]),
  talent("expanded-tactical-doctrine", "Expanded Tactical Doctrine", TIER.SPECIALIST, 2, "+1 Crew Tactic capacity.", [add("crewTacticCapacity", 1)]),
  talent("advanced-captain-arkcraft", "Advanced Captain Arkcraft", TIER.SPECIALIST, 2, "Captain gains a new Specialist Arkcraft Skill.", [unlockArkcraft("captain", ["captain-command-the-moment"])]),
  talent("advanced-engineer-arkcraft", "Advanced Engineer Arkcraft", TIER.SPECIALIST, 2, "Engineer gains a new Specialist Arkcraft Skill.", [unlockArkcraft("engineer", ["engineer-run-her-hot"])]),
  talent("advanced-navigator-arkcraft", "Advanced Navigator Arkcraft", TIER.SPECIALIST, 2, "Navigator gains a new Specialist Arkcraft Skill.", [unlockArkcraft("navigator", ["navigator-impossible-vector"])]),
  talent("advanced-battlewatch-arkcraft", "Advanced Battlewatch Arkcraft", TIER.SPECIALIST, 2, "Battlewatch gains a new Specialist Arkcraft Skill.", [unlockArkcraft("battlewatch", ["battlewatch-perfect-firing-solution"])]),
  talent("advanced-veilwarden-arkcraft", "Advanced Veilwarden Arkcraft", TIER.SPECIALIST, 2, "Veilwarden gains a new Specialist Arkcraft Skill.", [unlockArkcraft("veilwarden", ["veilwarden-hold-the-veil"])]),
  talent("mastered-arkcraft", "Mastered Arkcraft", TIER.SPECIALIST, 2, "Upgrade one known Arkcraft Skill to its Specialist version.", [add("arkcraftUpgradeChoices", 1)]),
  talent("specialist-voyage-systems", "Specialist Voyage Systems", TIER.SPECIALIST, 2, "+1 to all Voyage station rolls.", [pillar("voyage", 1)]),
  talent("specialist-battle-systems", "Specialist Battle Systems", TIER.SPECIALIST, 2, "+1 Armor Class and +1 ship weapon attack rolls.", [add("armorClass", 1), add("weaponAttackBonus", 1)])
];

const LEGENDARY = [
  talent("expanded-action-economy", "Expanded Action Economy", TIER.LEGENDARY, 3, "+1 ship Action Point per combat round.", [add("actionBonus", 1)]),
  talent("expanded-reaction-economy", "Expanded Reaction Economy", TIER.LEGENDARY, 2, "+1 ship Reaction Point per combat round.", [add("reactionBonus", 1)]),
  talent("legendary-tactical-network", "Legendary Tactical Network", TIER.LEGENDARY, 2, "+1 Crew Tactic capacity.", [add("crewTacticCapacity", 1)]),
  talent("perfected-arkcraft", "Perfected Arkcraft", TIER.LEGENDARY, 2, "Upgrade one Specialist Arkcraft Skill to its Legendary version.", [add("legendaryArkcraftUpgradeChoices", 1)]),
  talent("legendary-captain-arkcraft", "Legendary Captain Arkcraft", TIER.LEGENDARY, 3, "Captain gains a Legendary Arkcraft Skill.", [unlockArkcraft("captain", ["captain-voice-of-the-ship"])]),
  talent("legendary-engineer-arkcraft", "Legendary Engineer Arkcraft", TIER.LEGENDARY, 3, "Engineer gains a Legendary Arkcraft Skill.", [unlockArkcraft("engineer", ["engineer-heart-without-rest"])]),
  talent("legendary-navigator-arkcraft", "Legendary Navigator Arkcraft", TIER.LEGENDARY, 3, "Navigator gains a Legendary Arkcraft Skill.", [unlockArkcraft("navigator", ["navigator-turn-between-currents"])]),
  talent("legendary-battlewatch-arkcraft", "Legendary Battlewatch Arkcraft", TIER.LEGENDARY, 3, "Battlewatch gains a Legendary Arkcraft Skill.", [unlockArkcraft("battlewatch", ["battlewatch-kill-line"])]),
  talent("legendary-veilwarden-arkcraft", "Legendary Veilwarden Arkcraft", TIER.LEGENDARY, 3, "Veilwarden gains a Legendary Arkcraft Skill.", [unlockArkcraft("veilwarden", ["veilwarden-sanctuary-unbroken"])]),
  talent("legendary-drive", "Legendary Drive", TIER.LEGENDARY, 3, "+1 Speed.", [add("combatSpeed", 1)]),
  talent("legendary-rigging", "Legendary Rigging", TIER.LEGENDARY, 3, "+1 Maneuverability.", [add("maneuverability", 1)]),
  talent("legendary-strain-reserve", "Legendary Strain Reserve", TIER.LEGENDARY, 3, "+1 Strain Limit.", [add("strainCapacity", 1)]),
  talent("iron-legend", "Iron Legend", TIER.LEGENDARY, 2, "+30% base Hull maximum.", [percentBase("hullIntegrity", 30)]),
  talent("veil-of-legend", "Veil of Legend", TIER.LEGENDARY, 2, "+30% base Lifeveil maximum.", [percentBase("lifeveilCapacity", 30)]),
  talent("master-crew", "Master Crew", TIER.LEGENDARY, 3, "+1 to every station roll in Voyage and Combat.", [add("allStationBonus", 1)])
];

const MYTHIC = [
  talent("impossible-burn", "Impossible Burn", TIER.MYTHIC, 4, "+2 Speed and unlock the Impossible Burn capability.", [add("combatSpeed", 2), add("mythicCapabilityCount", 1)], { capabilities: ["impossible-burn"] }),
  talent("turn-between-heartbeats", "Turn Between Heartbeats", TIER.MYTHIC, 4, "+2 Maneuverability and unlock mythic turning.", [add("maneuverability", 2), add("mythicCapabilityCount", 1)], { capabilities: ["turn-between-heartbeats"] }),
  talent("ship-will-not-die", "The Ship Will Not Die", TIER.MYTHIC, 4, "+50% base Hull maximum.", [percentBase("hullIntegrity", 50)], { capabilities: ["mythic-hull-survival"] }),
  talent("void-cannot-have-us", "The Void Cannot Have Us", TIER.MYTHIC, 4, "+50% base Lifeveil maximum.", [percentBase("lifeveilCapacity", 50)], { capabilities: ["mythic-lifeveil-survival"] }),
  talent("legendary-tempo", "Legendary Tempo", TIER.MYTHIC, 4, "+1 Action Point and +1 Reaction Point per combat round.", [add("actionBonus", 1), add("reactionBonus", 1)]),
  talent("one-crew-one-ship", "One Crew, One Ship", TIER.MYTHIC, 4, "+2 to every station roll in Voyage and Combat.", [add("allStationBonus", 2)]),
  talent("endless-reserve", "Endless Reserve", TIER.MYTHIC, 4, "+2 Strain Limit.", [add("strainCapacity", 2)]),
  talent("master-of-the-black", "Master of the Black", TIER.MYTHIC, 4, "+3 to all Voyage station rolls.", [pillar("voyage", 3)]),
  talent("mythic-broadside", "Mythic Broadside", TIER.MYTHIC, 4, "+3 ship weapon attack rolls and unlock Mythic Broadside.", [add("weaponAttackBonus", 3)], { capabilities: ["mythic-broadside"] }),
  talent("mythic-refit", "Mythic Refit", TIER.MYTHIC, 4, "+1 flexible Ship Mod slot and +1 Arkengine Mod slot.", [add("shipModCapacity", 1), add("arkengineModCapacity", 1), slot("flexible"), slot("arkengine")])
];

export const SHIP_TALENT_TIERS = Object.freeze({
  [TIER.FOUNDATION]: Object.freeze({ id: TIER.FOUNDATION, label: "Foundation", minLevel: 1, maxLevel: 5 }),
  [TIER.SPECIALIST]: Object.freeze({ id: TIER.SPECIALIST, label: "Specialist", minLevel: 6, maxLevel: 10 }),
  [TIER.LEGENDARY]: Object.freeze({ id: TIER.LEGENDARY, label: "Legendary", minLevel: 11, maxLevel: 15 }),
  [TIER.MYTHIC]: Object.freeze({ id: TIER.MYTHIC, label: "Mythic", minLevel: 16, maxLevel: 20 })
});

export const SHIP_TALENTS = Object.freeze(Object.fromEntries([...FOUNDATION, ...SPECIALIST, ...LEGENDARY, ...MYTHIC].map((entry) => [entry.id, entry])));
export const SHIP_TALENT_LIST = Object.freeze(Object.values(SHIP_TALENTS));
export { TIER as SHIP_TALENT_TIER };
