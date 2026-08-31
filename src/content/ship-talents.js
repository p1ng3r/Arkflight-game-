const TIER = Object.freeze({ FOUNDATION: "foundation", SPECIALIST: "specialist", LEGENDARY: "legendary", MYTHIC: "mythic" });

const TALENT_LORE = Object.freeze({
  "captains-vessel": { quote: "A good captain does not shout louder. The deck simply moves before the order finishes.", credit: "Dockside wisdom" },
  "engineers-vessel": { quote: "You learn a ship by the rhythm of her knocks, not the shine on her brass.", credit: "Arkengineer's notebook" },
  "navigators-vessel": { quote: "The stars are suggestions. The current is the argument.", credit: "Navigator's maxim" },
  "battlewatch-vessel": { quote: "Spot the danger early enough and it becomes someone else's bad day.", credit: "Battlewatch saying" },
  "veilwardens-vessel": { quote: "Everyone forgets the air until the candles lean the wrong way.", credit: "Veilwarden's warning" },
  "voyage-trained": { quote: "A practiced crew can make three weeks of darkness feel almost like a road.", credit: "Longhaul captain" },
  "battle-trained": { quote: "Drill until the first broadside feels like a bell you already knew would ring.", credit: "Privateer doctrine" },
  "toughness": { quote: "More timber, more iron, fewer prayers whispered after impact.", credit: "Brassworks shipwright" },
  "greater-frame": { quote: "If the Void means to break her, make it work for the privilege.", credit: "Hullwright's boast" },
  "reinforced-lifeveil": { quote: "A stronger veil is one more breath between the crew and forever.", credit: "Veilkeeper's lesson" },
  "deep-veil-reservoir": { quote: "Carry more sky than you think you'll need. The Void charges interest.", credit: "Long-route proverb" },
  "hardened-construction": { quote: "The prettiest plate is the one that comes home dented instead of split.", credit: "Ironmantle yard saying" },
  "battle-hardened": { quote: "She has learned where to turn her scars toward the enemy.", credit: "Dockside appraisal" },
  "weapon-calibration": { quote: "A cannon is noise until the crew teaches it exactly where to speak.", credit: "Gunner's catechism" },
  "defensive-bracing": { quote: "Tie it twice, brace it once, and curse whoever says that is excessive.", credit: "Lower Docks carpenter" },
  "repair-trained": { quote: "The best repair crew starts moving before the splinters finish falling.", credit: "Arkflight Mechanics" },
  "efficient-repair-crews": { quote: "Every tool has a place. Every hand has a job. Panic has neither.", credit: "Guild repair doctrine" },
  "frugal-repairs": { quote: "Waste a rivet in port and you will need it in the dark.", credit: "Brassworks quartermaster" },
  "spare-stores": { quote: "The crate nobody wanted to load is always the crate that saves the voyage.", credit: "Quartermaster's complaint" },
  "expanded-cargo": { quote: "There is always room for one more contract, one more relic, one more mistake.", credit: "Merchant captain" },
  "crew-quarters": { quote: "Give sailors somewhere warm to sleep and they will follow you into colder skies.", credit: "Old captain's advice" },
  "efficient-stores": { quote: "A voyage is won by what you do not run out of.", credit: "Grand Docks provisioner" },
  "reinforced-decks": { quote: "A deck should creak to warn you, not crack to surprise you.", credit: "Hullwright's rule" },
  "steady-command": { quote: "When command and watch breathe together, trouble finds fewer openings.", credit: "Escort captain" },
  "technical-crew": { quote: "Engine and veil are two arguments about how the crew gets home alive.", credit: "Arkflight Mechanics" },

  "improved-drive": { quote: "Feed her clean power, open the manifold, and let the horizon get nervous.", credit: "Stormwake engineer" },
  "responsive-rigging": { quote: "A fine-rigged ship turns before a clumsy captain realizes they asked.", credit: "Rigger's boast" },
  "deep-strain-reserves": { quote: "Some ships complain under pressure. This one saves her breath for later.", credit: "Bastion engineer" },
  "expanded-weapon-mount": { quote: "The yardmaster asked what we planned to put there. We told him: options.", credit: "Privateer refit log" },
  "expanded-structural-bay": { quote: "Leave a little room between the ribs. Someday you'll know what belongs there.", credit: "Stormglass shipwright" },
  "expanded-rigging-bay": { quote: "More lines mean more choices, provided the crew knows which one not to cut.", credit: "Master rigger" },
  "expanded-lifeveil-bay": { quote: "A spare lattice node is useless right up until everyone starts gasping.", credit: "Veilkeeper's ledger" },
  "expanded-utility-bay": { quote: "No captain regrets an empty fitting when the right idea finally arrives.", credit: "Grand Docks fitter" },
  "expanded-support-bay": { quote: "Cargo earns coin. Support keeps the crew alive long enough to spend it.", credit: "Dockmaster's arithmetic" },
  "engineers-refit": { quote: "Do not ask an engineer what the extra housing is for. They'll show you eventually.", credit: "Guild apprentice joke" },
  "major-refit": { quote: "She went into the yard as a ship we knew and came out with new ambitions.", credit: "Refit-yard log" },
  "expanded-tactical-doctrine": { quote: "A crew with one more plan than the enemy usually gets to tell the story.", credit: "Blackwake maxim" },
  "advanced-captain-arkcraft": { quote: "There comes a moment when command stops being an order and becomes momentum.", credit: "Captain's journal" },
  "advanced-engineer-arkcraft": { quote: "Run her hot enough and the engine starts sounding like it remembers tomorrow.", credit: "Unsafe engineering note" },
  "advanced-navigator-arkcraft": { quote: "Impossible is often just a route nobody has survived often enough to name.", credit: "Navigator's margin note" },
  "advanced-battlewatch-arkcraft": { quote: "The perfect firing solution is the instant the enemy still believes they are safe.", credit: "Battlewatch doctrine" },
  "advanced-veilwarden-arkcraft": { quote: "Hold the edge. Hold the breath. Hold one heartbeat longer than the Void.", credit: "Veilwarden litany" },
  "mastered-arkcraft": { quote: "A trick becomes a tradition after the crew survives it enough times.", credit: "Arkflight saying" },
  "specialist-voyage-systems": { quote: "Charts, gauges, bells, habits—small certainties against an enormous dark.", credit: "Longhaul handbook" },
  "specialist-battle-systems": { quote: "A fighting ship is not angry. She is prepared.", credit: "Escort-yard inscription" },

  "expanded-action-economy": { quote: "Legendary crews do not find more time. They make the same heartbeat carry more.", credit: "Veteran captain" },
  "expanded-reaction-economy": { quote: "The second answer is the one your enemy never budgeted for.", credit: "Privateer saying" },
  "legendary-tactical-network": { quote: "Five stations, one thought, and the Void suddenly feels too slow.", credit: "Crew drill inscription" },
  "perfected-arkcraft": { quote: "What once required courage now requires only the right glance across the deck.", credit: "Old ship's log" },
  "legendary-captain-arkcraft": { quote: "Some captains command crews. A rare few command the ship's very mood.", credit: "Grand Docks tale" },
  "legendary-engineer-arkcraft": { quote: "The engine should have died three minutes ago. Bromm would call that encouraging.", credit: "Mechanic's incident report" },
  "legendary-navigator-arkcraft": { quote: "For one impossible turn, the compass stopped pointing and simply trusted us.", credit: "Navigator's log" },
  "legendary-battlewatch-arkcraft": { quote: "By the time the range bell rang, the enemy was already living in our answer.", credit: "Warship log" },
  "legendary-veilwarden-arkcraft": { quote: "The veil shone like moonlit glass and nothing beyond it could make us afraid.", credit: "Passenger account" },
  "legendary-drive": { quote: "A good engine carries you. A legendary one dares the route to keep up.", credit: "Arkengineer proverb" },
  "legendary-rigging": { quote: "She does not turn through the current anymore. The current turns around her.", credit: "Pilot's boast" },
  "legendary-strain-reserve": { quote: "We heard the frame groan once. Then it seemed to decide against it.", credit: "Damage-control log" },
  "iron-legend": { quote: "There are ships with thicker hulls. Few have earned theirs scar by scar.", credit: "Upper Docks appraisal" },
  "veil-of-legend": { quote: "Children on deck stopped fearing the stars because the veil had never failed them.", credit: "Crew remembrance" },
  "master-crew": { quote: "No station waits for orders anymore. They already know what the others need.", credit: "Legendary crew saying" },

  "impossible-burn": { quote: "The wake burned blue-white for three days. We arrived before the warning did.", credit: "Mythic voyage account" },
  "turn-between-heartbeats": { quote: "The enemy swore we vanished. The navigator insists we merely turned correctly.", credit: "Survivor's testimony" },
  "ship-will-not-die": { quote: "They counted her wrecked twice. She came home both times carrying trophies.", credit: "Grand Docks legend" },
  "void-cannot-have-us": { quote: "The stars went black, the air bells screamed, and still every soul aboard breathed.", credit: "Pilgrim chronicle" },
  "legendary-tempo": { quote: "For a few terrible seconds, the whole ship moved faster than consequence.", credit: "Battle chronicle" },
  "one-crew-one-ship": { quote: "No one aboard could say where crew ended and vessel began.", credit: "Old sailor's tale" },
  "endless-reserve": { quote: "The gauges ran out of warning marks before the ship ran out of will.", credit: "Arkengine failure report" },
  "master-of-the-black": { quote: "There are routes this ship knows that no compass has ever admitted exist.", credit: "Navigator's whisper" },
  "mythic-broadside": { quote: "One broadside. Then the dark had a new constellation made of wreckage.", credit: "Privateer legend" },
  "mythic-refit": { quote: "At this point the shipwrights stopped asking what she was becoming.", credit: "Brassworks master" }
});

const talent = (id, name, tier, cost, description, effects = [], extra = {}) => Object.freeze({
  id, name, tier, cost, description, lore: TALENT_LORE[id] ?? Object.freeze({ quote: "Every ship writes part of its story in timber, brass, and scars.", credit: "Arkflight saying" }), effects: Object.freeze(effects.map((effect) => Object.freeze(effect))), ...extra
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