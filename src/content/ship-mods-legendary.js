import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "legendary";
const MIN_SHIP_LEVEL = 12;
const LEGACY_REFIT_TIER = 3;

function refit(slotClass, slotCost = 1) {
  return refitSpec({
    family: "shipMod",
    slotClass,
    tier: LEGACY_REFIT_TIER,
    slotCost,
    ...defaultRefitCosts(LEGACY_REFIT_TIER, slotCost)
  });
}

function mod({ id, name, description, slotClass, effectFamily, effects = [], capabilities = [], resistances = [], ruleModifiers = [], upgradeChain, synergies = [], tags = [] }) {
  return component({
    id,
    name,
    type: COMPONENT_TYPES.SHIP_MOD,
    description,
    capacityCost: 1,
    tags: ["ship-mod", RARITY, effectFamily, ...tags],
    traits: [RARITY, effectFamily, ...tags],
    effects: effects.map(([target, value]) => add(target, value)),
    capabilities,
    data: {
      rarity: RARITY,
      minShipLevel: MIN_SHIP_LEVEL,
      legacyRefitTier: LEGACY_REFIT_TIER,
      modType: effectFamily,
      effectFamily,
      refit: refit(slotClass),
      ...(resistances.length ? { resistances } : {}),
      ...(ruleModifiers.length ? { ruleModifiers } : {}),
      ...(upgradeChain ? { upgradeChain } : {}),
      ...(synergies.length ? { synergies } : {})
    }
  });
}

const entries = [
  mod({
    id: "worldroot-keel-frame",
    name: "Worldroot Keel Frame",
    description: "An impossibly resilient keel of rune-grown ironwood and adamantine ligatures makes the vessel flex like a living thing under impacts that would split lesser ships.",
    slotClass: "structural",
    effectFamily: "hull",
    effects: [["hullIntegrity", 85], ["armorClass", 2]],
    capabilities: ["worldroot-load-sharing", "catastrophic-breach-bracing"],
    ruleModifiers: [{ kind: "hull-repair-per-part-bonus", value: 5 }],
    upgradeChain: { requiresMods: ["living-adamant-frame"] },
    tags: ["hull", "keel", "upgrade"]
  }),
  mod({
    id: "fortress-of-nine-bulkheads",
    name: "Fortress of Nine Bulkheads",
    description: "Nine interlocking defensive compartments, each warded and independently braced, turn the ship interior into a layered fortress.",
    slotClass: "structural",
    effectFamily: "armor-class",
    effects: [["armorClass", 4], ["hullIntegrity", 40]],
    capabilities: ["multi-compartment-breach-isolation"],
    upgradeChain: { requiresMods: ["citadel-bulkhead-grid"] },
    synergies: [{ id: "fortress-worldroot-suite", requiresMods: ["worldroot-keel-frame", "phoenix-heart-mantle"], effects: [{ target: "armorClass", mode: "add", value: 1 }], capabilities: ["legendary-fortress-hull"] }],
    tags: ["armor", "bulkhead", "set"]
  }),
  mod({
    id: "phoenix-heart-mantle",
    name: "Phoenix-Heart Mantle",
    description: "Heat-drinking plates and self-sealing runes turn flame into harmless radiance while protecting the frame from alchemical and corrosive ruin.",
    slotClass: "structural",
    effectFamily: "resistance",
    resistances: [{ type: "fire", value: 20 }, { type: "acid", value: 10 }],
    capabilities: ["legendary-fire-containment"],
    ruleModifiers: [{ kind: "fire-hazard-severity-reduction", value: 1 }],
    upgradeChain: { requiresMods: ["phoenix-firebreak-mantle"] },
    tags: ["fire", "resistance", "upgrade"]
  }),
  mod({
    id: "star-iron-voidweave",
    name: "Star-Iron Voidweave",
    description: "Star-iron mesh and voidbone laminates shield the vessel against the crushing cold and abrasive pressure of hostile deep-void regions.",
    slotClass: "utility",
    effectFamily: "resistance",
    effects: [["hullIntegrity", 30]],
    resistances: [{ type: "cold", value: 15 }, { type: "void", value: 15 }, { type: "force", value: 5 }],
    capabilities: ["legendary-deep-void-rating"],
    upgradeChain: { requiresMods: ["voidbone-armor-weave"] },
    tags: ["deep-void", "survival", "upgrade"]
  }),
  mod({
    id: "arkengine-sovereign-distribution-grid",
    name: "Arkengine Sovereign Distribution Grid",
    description: "A shipwide hierarchy of aetheric governors reroutes impossible engine loads through redundant channels before strain can localize into failure.",
    slotClass: "utility",
    effectFamily: "arkengine",
    effects: [["strainCapacity", 8]],
    capabilities: ["sovereign-load-routing", "emergency-power-bypass"],
    ruleModifiers: [{ kind: "hard-burn-strain-reduction", value: 2 }, { kind: "arkengine-area-repair-bonus", value: 1 }],
    upgradeChain: { requiresMods: ["aetheric-load-balancer"] },
    tags: ["arkengine", "strain", "upgrade"]
  }),
  mod({
    id: "thunder-crown-grounding-spine",
    name: "Thunder-Crown Grounding Spine",
    description: "A crowned lightning spine pulls hostile surges away from crew and engine spaces, bleeding the remainder into reinforced aetheric sinks.",
    slotClass: "utility",
    effectFamily: "resistance",
    resistances: [{ type: "electricity", value: 20 }, { type: "force", value: 10 }],
    capabilities: ["legendary-storm-sink"],
    upgradeChain: { requiresMods: ["stormheart-grounding-spine"] },
    synergies: [{ id: "sovereign-storm-loop", requiresMods: ["arkengine-sovereign-distribution-grid", "harmonic-strain-reservoir"], effects: [{ target: "strainCapacity", mode: "add", value: 4 }], capabilities: ["storm-fed-power-reserve"] }],
    tags: ["arkengine", "storm", "set"]
  }),
  mod({
    id: "sunpiercer-void-sails",
    name: "Sunpiercer Void Sails",
    description: "Radiant solar membranes and impossibly responsive spars seize the Black Tides with enough authority to make a heavy galleon move like a hunter.",
    slotClass: "rigging",
    effectFamily: "speed",
    effects: [["combatSpeed", 5], ["maneuverability", 2]],
    capabilities: ["legendary-drive-profile", "pursuit-burst"],
    ruleModifiers: [{ kind: "travel-day-reduction", value: 1 }],
    upgradeChain: { requiresMods: ["black-tide-racing-sails"] },
    tags: ["rigging", "speed", "upgrade"]
  }),
  mod({
    id: "seraphic-vector-vanes",
    name: "Seraphic Vector Vanes",
    description: "Winglike aetheric vanes adjust faster than mortal hands can follow, carving new headings through battle without surrendering momentum.",
    slotClass: "rigging",
    effectFamily: "maneuverability",
    effects: [["maneuverability", 5], ["combatSpeed", 1]],
    capabilities: ["legendary-vector-turn", "knife-edge-course-change"],
    upgradeChain: { requiresMods: ["battlewake-vector-vanes"] },
    synergies: [{ id: "seraphic-drive-suite", requiresMods: ["sunpiercer-void-sails", "oracle-helm-assembly"], effects: [{ target: "combatSpeed", mode: "add", value: 2 }, { target: "maneuverability", mode: "add", value: 1 }], capabilities: ["legendary-three-point-drive"] }],
    tags: ["rigging", "maneuverability", "set"]
  }),
  mod({
    id: "fatesight-helm",
    name: "Fatesight Helm",
    description: "A web of omen needles, divinatory glass, and precision controls lets the Navigator steer toward the course most likely to survive the next few heartbeats.",
    slotClass: "rigging",
    effectFamily: "cross-system",
    effects: [["maneuverability", 3], ["detection", 4]],
    capabilities: ["fatesight-course-prediction"],
    ruleModifiers: [{ kind: "navigator-dc-reduction-once-per-round", value: 1 }],
    upgradeChain: { requiresMods: ["oracle-helm-assembly"] },
    tags: ["helm", "navigation", "upgrade"]
  }),
  mod({
    id: "aegis-of-the-star-sea",
    name: "Aegis of the Star Sea",
    description: "A ring of immense veil projectors wraps the vessel in a luminous shell that remains coherent through bombardment, storm, and void pressure.",
    slotClass: "lifeveil",
    effectFamily: "lifeveil",
    effects: [["lifeveilCapacity", 55]],
    capabilities: ["legendary-veil-envelope", "veil-overlap-control"],
    ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 5 }, { kind: "lifeveil-area-repair-bonus", value: 1 }],
    upgradeChain: { requiresMods: ["veil-citadel-projector"] },
    tags: ["lifeveil", "projection", "upgrade"]
  }),
  mod({
    id: "sevenfold-prismatic-aegis",
    name: "Sevenfold Prismatic Aegis",
    description: "Seven synchronized refractor banks split hostile energy into harmless spectra before it can bite through the active Lifeveil.",
    slotClass: "lifeveil",
    effectFamily: "resistance",
    resistances: [
      { type: "fire", value: 15, condition: "while Lifeveil is online" },
      { type: "electricity", value: 15, condition: "while Lifeveil is online" },
      { type: "force", value: 10, condition: "while Lifeveil is online" },
      { type: "sonic", value: 10, condition: "while Lifeveil is online" }
    ],
    capabilities: ["sevenfold-energy-diffusion"],
    upgradeChain: { requiresMods: ["prismatic-veil-refractors"] },
    synergies: [{ id: "star-sea-prismatic-suite", requiresMods: ["aegis-of-the-star-sea"], effects: [{ target: "lifeveilCapacity", mode: "add", value: 15 }], capabilities: ["prismatic-aegis-overlap"] }],
    tags: ["lifeveil", "resistance", "synergy"]
  }),
  mod({
    id: "admirals-living-command-web",
    name: "Admiral's Living Command Web",
    description: "A self-correcting network of command relays, warded tubes, signal plates, and tactical bells keeps the crew acting coherently even as sections of the ship fail.",
    slotClass: "support",
    effectFamily: "morale-command",
    effects: [["detection", 2]],
    capabilities: ["legendary-command-redundancy", "distributed-station-control"],
    ruleModifiers: [{ kind: "crew-muster-support", value: 5 }, { kind: "captain-command-resilience", value: 2 }],
    upgradeChain: { requiresMods: ["captains-war-command-net"] },
    tags: ["captain", "command", "upgrade"]
  }),
  mod({
    id: "all-seeing-battlewatch-oracle",
    name: "All-Seeing Battlewatch Oracle",
    description: "A cathedral of omen mirrors and scrying lenses builds a near-continuous tactical picture from fragments of movement, magic, and intent.",
    slotClass: "support",
    effectFamily: "detection",
    effects: [["detection", 8]],
    capabilities: ["legendary-threat-prediction", "ambush-negation-support"],
    ruleModifiers: [{ kind: "battlewatch-first-check-bonus", value: 2 }],
    upgradeChain: { requiresMods: ["battlewatch-augury-array"] },
    tags: ["battlewatch", "detection", "upgrade"]
  }),
  mod({
    id: "grand-fleet-concordance",
    name: "Grand Fleet Concordance",
    description: "The flagship projects command intent through synchronized lanterns, bells, and aetheric relays, allowing allied ships to respond as parts of a single formation.",
    slotClass: "support",
    effectFamily: "morale-command",
    effects: [["detection", 4]],
    capabilities: ["legendary-fleet-command"],
    ruleModifiers: [{ kind: "allied-station-aid-bonus", value: 2 }],
    upgradeChain: { requiresMods: ["fleet-command-concordance"] },
    synergies: [{ id: "grand-flagship-suite", requiresMods: ["admirals-living-command-web", "all-seeing-battlewatch-oracle"], capabilities: ["legendary-three-point-flagship"], ruleModifiers: [{ kind: "fleet-command-range-bonus", value: 1 }] }],
    tags: ["fleet", "command", "set"]
  }),
  mod({
    id: "leviathan-salvage-foundry",
    name: "Leviathan Salvage Foundry",
    description: "Massive cranes, void-cutting frames, and rune forges let a vessel strip hulks and monster remains into usable materials with industrial speed.",
    slotClass: "support",
    effectFamily: "logistics",
    effects: [["cargoCapacity", 50]],
    capabilities: ["legendary-field-salvage", "colossal-wreck-processing"],
    ruleModifiers: [{ kind: "salvage-processing-bonus", value: 4 }, { kind: "salvage-yield-bonus-fraction", value: 0.25 }],
    upgradeChain: { requiresMods: ["grand-salvage-foundry"] },
    tags: ["salvage", "cargo", "upgrade"]
  })
];

export const LEGENDARY_SHIP_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
