import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "epic";
const MIN_SHIP_LEVEL = 7;
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
    id: "living-adamant-frame",
    name: "Living Adamant Frame",
    description: "Aether-fed adamant ribs flex with the ship instead of merely resisting force, spreading catastrophic impacts through the entire frame.",
    slotClass: "structural",
    effectFamily: "hull",
    effects: [["hullIntegrity", 55], ["armorClass", 1]],
    capabilities: ["distributed-catastrophic-load"],
    upgradeChain: { requiresMods: ["aether-bound-ribbing"] },
    tags: ["structural", "adamant", "upgrade"]
  }),
  mod({
    id: "citadel-bulkhead-grid",
    name: "Citadel Bulkhead Grid",
    description: "Interlocked armored bulkheads isolate breaches and turn the interior into a layered defensive shell.",
    slotClass: "structural",
    effectFamily: "armor-class",
    effects: [["armorClass", 3], ["hullIntegrity", 25]],
    capabilities: ["breach-isolation"],
    synergies: [{ id: "citadel-firewall-suite", requiresMods: ["stormglass-firebreak-shell", "ablative-iron-sheathing"], effects: [{ target: "hullIntegrity", mode: "add", value: 15 }], capabilities: ["sealed-citadel-compartments"] }],
    tags: ["armor", "bulkhead", "set"]
  }),
  mod({
    id: "phoenix-firebreak-mantle",
    name: "Phoenix Firebreak Mantle",
    description: "Runed ceramic armor and heat-drinking aetherite turn major fires into survivable compartment events rather than ship-killing cascades.",
    slotClass: "structural",
    effectFamily: "resistance",
    resistances: [{ type: "fire", value: 15 }, { type: "acid", value: 5 }],
    capabilities: ["contain-major-fire"],
    upgradeChain: { requiresMods: ["stormglass-firebreak-shell"] },
    tags: ["fire", "resistance", "upgrade"]
  }),
  mod({
    id: "voidbone-armor-weave",
    name: "Voidbone Armor Weave",
    description: "Void-cured structural laminates shrug off killing cold, pressure shock, and the abrasive violence of deep Black Tides.",
    slotClass: "utility",
    effectFamily: "resistance",
    effects: [["hullIntegrity", 20]],
    resistances: [{ type: "cold", value: 10 }, { type: "void", value: 10 }],
    capabilities: ["extreme-deep-void-rating"],
    upgradeChain: { requiresMods: ["deep-void-armor-web"] },
    tags: ["deep-void", "survival", "upgrade"]
  }),
  mod({
    id: "aetheric-load-balancer",
    name: "Aetheric Load Balancer",
    description: "A shipwide lattice of reactive conduits redistributes Arkengine surges before they can become structural Strain.",
    slotClass: "utility",
    effectFamily: "arkengine",
    effects: [["strainCapacity", 5]],
    capabilities: ["reactive-overload-routing"],
    ruleModifiers: [{ kind: "hard-burn-strain-reduction", value: 1 }],
    upgradeChain: { requiresMods: ["grounded-conduit-bus"] },
    tags: ["arkengine", "strain", "upgrade"]
  }),
  mod({
    id: "stormheart-grounding-spine",
    name: "Stormheart Grounding Spine",
    description: "A central copper-aetherite spine drinks lightning and violent magical discharge, feeding survivable remnants back into grounded sinks.",
    slotClass: "utility",
    effectFamily: "resistance",
    resistances: [{ type: "electricity", value: 15 }, { type: "force", value: 5 }],
    capabilities: ["storm-discharge-sink"],
    synergies: [{ id: "stormheart-drive-loop", requiresMods: ["aetheric-load-balancer"], effects: [{ target: "strainCapacity", mode: "add", value: 2 }], capabilities: ["storm-fed-stability"] }],
    tags: ["arkengine", "electricity", "synergy"]
  }),
  mod({
    id: "black-tide-racing-sails",
    name: "Black-Tide Racing Sails",
    description: "Layered solar-void membranes and responsive spars hold an aggressive drive profile through dangerous currents.",
    slotClass: "rigging",
    effectFamily: "speed",
    effects: [["combatSpeed", 3], ["maneuverability", 1]],
    capabilities: ["racing-drive-profile"],
    upgradeChain: { requiresMods: ["stormproof-void-sails"] },
    tags: ["rigging", "speed", "upgrade"]
  }),
  mod({
    id: "battlewake-vector-vanes",
    name: "Battlewake Vector Vanes",
    description: "Aether-responsive vanes and split control fins let the ship carve sudden lines through a battlewake without surrendering speed.",
    slotClass: "rigging",
    effectFamily: "maneuverability",
    effects: [["maneuverability", 3]],
    capabilities: ["battlewake-vector-turn"],
    upgradeChain: { requiresMods: ["battlewake-control-fins"] },
    synergies: [{ id: "battlewake-grand-suite", requiresMods: ["black-tide-racing-sails", "precision-helm-relays"], effects: [{ target: "combatSpeed", mode: "add", value: 1 }, { target: "maneuverability", mode: "add", value: 1 }], capabilities: ["three-point-battlewake-drive"] }],
    tags: ["rigging", "maneuverability", "set"]
  }),
  mod({
    id: "oracle-helm-assembly",
    name: "Oracle Helm Assembly",
    description: "Predictive omen needles, star-glass mirrors, and precision relays let the helm anticipate violent course changes moments before they arrive.",
    slotClass: "rigging",
    effectFamily: "maneuverability",
    effects: [["maneuverability", 2], ["detection", 2]],
    capabilities: ["predictive-helm-correction"],
    upgradeChain: { requiresMods: ["precision-helm-relays"] },
    tags: ["helm", "navigation", "upgrade"]
  }),
  mod({
    id: "veil-citadel-projector",
    name: "Veil Citadel Projector",
    description: "Multiple synchronized emitters thicken the Lifeveil into a reinforced envelope that remains coherent under sustained magical assault.",
    slotClass: "lifeveil",
    effectFamily: "lifeveil",
    effects: [["lifeveilCapacity", 35]],
    capabilities: ["reinforced-veil-envelope"],
    ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 3 }],
    upgradeChain: { requiresMods: ["veil-harmonic-capacitors"] },
    tags: ["lifeveil", "projection", "upgrade"]
  }),
  mod({
    id: "prismatic-veil-refractors",
    name: "Prismatic Veil Refractors",
    description: "Prismatic aetherite lenses split hostile energies across the Lifeveil rather than allowing one damage type to hammer a single harmonic.",
    slotClass: "lifeveil",
    effectFamily: "resistance",
    resistances: [{ type: "electricity", value: 10, condition: "while Lifeveil is online" }, { type: "fire", value: 10, condition: "while Lifeveil is online" }, { type: "force", value: 5, condition: "while Lifeveil is online" }],
    capabilities: ["prismatic-veil-diffusion"],
    synergies: [{ id: "prismatic-citadel", requiresMods: ["veil-citadel-projector"], effects: [{ target: "lifeveilCapacity", mode: "add", value: 10 }], capabilities: ["layered-prismatic-envelope"] }],
    tags: ["lifeveil", "resistance", "synergy"]
  }),
  mod({
    id: "captains-war-command-net",
    name: "Captain's War Command Net",
    description: "Redundant command repeaters, tactical bells, signal plates, and warded speaking tubes keep orders moving even when decks are damaged or cut off.",
    slotClass: "support",
    effectFamily: "morale-command",
    capabilities: ["distributed-war-command"],
    ruleModifiers: [{ kind: "crew-muster-support", value: 3 }, { kind: "captain-command-resilience", value: 1 }],
    upgradeChain: { requiresMods: ["crew-cohesion-network"] },
    tags: ["captain", "command", "upgrade"]
  }),
  mod({
    id: "battlewatch-augury-array",
    name: "Battlewatch Augury Array",
    description: "Interlinked scrying crowns and omen mirrors turn fragments of motion, heat, and magic into a coherent tactical picture.",
    slotClass: "support",
    effectFamily: "detection",
    effects: [["detection", 5]],
    capabilities: ["battlewatch-threat-prediction", "hidden-threat-triangulation"],
    upgradeChain: { requiresMods: ["battlewatch-scrying-crown"] },
    tags: ["battlewatch", "detection", "upgrade"]
  }),
  mod({
    id: "fleet-command-concordance",
    name: "Fleet Command Concordance",
    description: "A synchronized command lattice lets one vessel relay precise orders and tactical intent across an allied formation.",
    slotClass: "support",
    effectFamily: "morale-command",
    effects: [["detection", 2]],
    capabilities: ["fleet-command-concordance"],
    synergies: [{ id: "flagship-concordance-suite", requiresMods: ["captains-war-command-net", "battlewatch-augury-array"], capabilities: ["three-point-flagship-command"], ruleModifiers: [{ kind: "allied-station-aid-bonus", value: 1 }] }],
    tags: ["fleet", "command", "set"]
  }),
  mod({
    id: "grand-salvage-foundry",
    name: "Grand Salvage Foundry",
    description: "Heavy sorting cranes, cutting frames, and forge fixtures let the ship turn wreckage into useful material while still underway at a secure site.",
    slotClass: "support",
    effectFamily: "logistics",
    effects: [["cargoCapacity", 30]],
    capabilities: ["field-salvage-refinement"],
    ruleModifiers: [{ kind: "salvage-processing-bonus", value: 2 }],
    upgradeChain: { requiresMods: ["salvage-winch-clusters"] },
    tags: ["salvage", "cargo", "upgrade"]
  }),
  mod({
    id: "emergency-reconstruction-bays",
    name: "Emergency Reconstruction Bays",
    description: "Distributed brace frames, patch presses, and prefabricated hull sections dramatically improve major repairs at a safe site.",
    slotClass: "support",
    effectFamily: "recovery-repair",
    capabilities: ["major-field-reconstruction"],
    ruleModifiers: [{ kind: "hull-repair-per-part-bonus", value: 5 }, { kind: "repair-time-reduction-fraction", value: 0.25 }],
    tags: ["repair", "recovery", "support"]
  }),
  mod({
    id: "void-hunter-prow",
    name: "Void Hunter Prow",
    description: "A reinforced, rune-angled prow turns pursuit collisions and boarding approaches into deliberate weapons rather than desperate maneuvers.",
    slotClass: "weapon",
    effectFamily: "combat",
    effects: [["armorClass", 1]],
    capabilities: ["void-hunter-ram", "assault-boarding-line"],
    synergies: [{ id: "hunter-kill-suite", requiresMods: ["battlewatch-augury-array"], capabilities: ["predictive-ramming-solution"], ruleModifiers: [{ kind: "ramming-attack-bonus", value: 1 }] }],
    tags: ["combat", "ram", "boarding"]
  }),
  mod({
    id: "harmonic-strain-reservoir",
    name: "Harmonic Strain Reservoir",
    description: "Massive tuned dampers temporarily hold dangerous vibration and aetheric stress, buying the crew time before a threshold becomes a system failure.",
    slotClass: "utility",
    effectFamily: "cross-system",
    effects: [["strainCapacity", 6]],
    capabilities: ["harmonic-strain-buffer"],
    ruleModifiers: [{ kind: "strain-maintenance-reduction-bonus", value: 1 }],
    synergies: [{ id: "resilient-core-suite", requiresMods: ["living-adamant-frame", "aetheric-load-balancer"], effects: [{ target: "strainCapacity", mode: "add", value: 3 }], capabilities: ["three-point-strain-distribution"] }],
    tags: ["strain", "cross-system", "set"]
  })
];

export const EPIC_SHIP_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
