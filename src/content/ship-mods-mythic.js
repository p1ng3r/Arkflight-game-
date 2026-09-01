import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "mythic";
const MIN_SHIP_LEVEL = 17;
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

function mod({
  id,
  name,
  description,
  slotClass,
  effectFamily,
  effects = [],
  capabilities = [],
  resistances = [],
  ruleModifiers = [],
  upgradeChain,
  synergies = [],
  coreRuleException,
  tags = []
}) {
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
      ...(synergies.length ? { synergies } : {}),
      ...(coreRuleException ? { coreRuleException } : {})
    }
  });
}

const entries = [
  mod({
    id: "eternity-worldroot-frame",
    name: "Eternity Worldroot Frame",
    description: "A single impossible lattice of living ironwood, adamant, and aetherite remembers the vessel's shape and violently resists the moment of final structural collapse.",
    slotClass: "structural",
    effectFamily: "hull",
    effects: [["hullIntegrity", 120], ["armorClass", 3]],
    capabilities: ["mythic-worldroot-memory", "catastrophe-refusal"],
    ruleModifiers: [{ kind: "hull-repair-per-part-bonus", value: 10 }],
    upgradeChain: { requiresMods: ["worldroot-keel-frame"] },
    coreRuleException: {
      rule: "hull-zero-survival",
      trigger: "when Hull would be reduced to 0 by damage",
      usage: "once-per-event",
      cost: "+2 Strain",
      limit: "Hull remains at 1 instead of becoming Wrecked"
    },
    tags: ["hull", "keel", "survival", "upgrade"]
  }),
  mod({
    id: "crown-of-the-ninefold-fortress",
    name: "Crown of the Ninefold Fortress",
    description: "A mythic defensive architecture binds every major bulkhead into one warded citadel, turning impact, shot, and breach pressure against layers of mutually reinforcing structure.",
    slotClass: "structural",
    effectFamily: "resistance",
    effects: [["armorClass", 6], ["hullIntegrity", 60]],
    resistances: [
      { type: "physical", value: 15 },
      { type: "force", value: 10 }
    ],
    capabilities: ["mythic-breach-citadel", "ninefold-damage-routing"],
    upgradeChain: { requiresMods: ["fortress-of-nine-bulkheads"] },
    synergies: [{
      id: "eternal-citadel-suite",
      requiresMods: ["eternity-worldroot-frame", "phoenix-heart-mantle"],
      effects: [{ target: "armorClass", mode: "add", value: 2 }],
      capabilities: ["eternal-fortress-hull"]
    }],
    tags: ["armor", "bulkhead", "resistance", "set"]
  }),
  mod({
    id: "worldfire-arkengine-nexus",
    name: "Worldfire Arkengine Nexus",
    description: "A ring of sovereign aetherite chambers keeps power moving even when the Arkengine's ordinary pathways have fallen silent, at a cost the vessel cannot sustain for long.",
    slotClass: "utility",
    effectFamily: "arkengine",
    effects: [["strainCapacity", 12]],
    capabilities: ["mythic-power-routing", "dead-engine-impulse"],
    ruleModifiers: [
      { kind: "hard-burn-strain-reduction", value: 3 },
      { kind: "arkengine-area-repair-bonus", value: 2 }
    ],
    upgradeChain: { requiresMods: ["arkengine-sovereign-distribution-grid"] },
    coreRuleException: {
      rule: "arkengine-disabled-operation",
      trigger: "while the Arkengine Area is Disabled",
      usage: "once-per-event",
      cost: "+3 Strain after the granted operation",
      limit: "permits one round of powered movement only; does not restore the Arkengine Area"
    },
    tags: ["arkengine", "power", "strain", "upgrade"]
  }),
  mod({
    id: "wings-of-the-first-dawn",
    name: "Wings of the First Dawn",
    description: "Vast sun-white void membranes answer the helm like living wings, letting the ship cross a battle line with a burst of motion that should be impossible for its mass.",
    slotClass: "rigging",
    effectFamily: "speed",
    effects: [["combatSpeed", 7], ["maneuverability", 3]],
    capabilities: ["mythic-drive-profile", "first-dawn-burst"],
    ruleModifiers: [{ kind: "travel-day-reduction", value: 2 }],
    upgradeChain: { requiresMods: ["sunpiercer-void-sails"] },
    synergies: [{
      id: "first-dawn-seraph-suite",
      requiresMods: ["seraphic-vector-vanes", "fatesight-helm"],
      effects: [
        { target: "combatSpeed", mode: "add", value: 2 },
        { target: "maneuverability", mode: "add", value: 2 }
      ],
      capabilities: ["mythic-three-point-drive"]
    }],
    coreRuleException: {
      rule: "rigging-disabled-burst",
      trigger: "when voluntary movement would be prevented by a Disabled Rigging Area",
      usage: "once-per-event",
      cost: "+2 Strain",
      limit: "permits one movement action only; Rigging remains Disabled"
    },
    tags: ["rigging", "speed", "maneuverability", "set"]
  }),
  mod({
    id: "veil-of-the-first-firmament",
    name: "Veil of the First Firmament",
    description: "An ancient projector geometry folds the ship's Lifeveil into a radiant shell vast enough to shelter another vessel for a few desperate moments.",
    slotClass: "lifeveil",
    effectFamily: "lifeveil",
    effects: [["lifeveilCapacity", 80]],
    capabilities: ["mythic-veil-envelope", "companion-veil-extension"],
    ruleModifiers: [
      { kind: "lifeveil-recovery-support", value: 8 },
      { kind: "lifeveil-area-repair-bonus", value: 2 }
    ],
    upgradeChain: { requiresMods: ["aegis-of-the-star-sea"] },
    coreRuleException: {
      rule: "lifeveil-project-to-allied-vessel",
      trigger: "an allied vessel within authored close formation would suffer environmental or Lifeveil-mediated harm",
      usage: "once-per-event",
      cost: "20 current Lifeveil from this vessel",
      limit: "protects one allied vessel for one discrete resolution only"
    },
    tags: ["lifeveil", "projection", "allied-support", "upgrade"]
  }),
  mod({
    id: "oracle-of-the-last-horizon",
    name: "Oracle of the Last Horizon",
    description: "A cathedral of star mirrors, omen engines, and voidglass lenses resolves threats before they fully enter the present, giving Battlewatch and Navigator a terrifying informational advantage.",
    slotClass: "support",
    effectFamily: "detection",
    effects: [["detection", 12]],
    capabilities: ["mythic-threat-foresight", "horizon-before-contact"],
    ruleModifiers: [
      { kind: "battlewatch-first-check-bonus", value: 3 },
      { kind: "navigator-dc-reduction-once-per-round", value: 2 }
    ],
    upgradeChain: { requiresMods: ["all-seeing-battlewatch-oracle"] },
    synergies: [{
      id: "last-horizon-command-suite",
      requiresMods: ["grand-fleet-concordance", "admirals-living-command-web"],
      capabilities: ["mythic-fleet-threat-map"],
      ruleModifiers: [{ kind: "allied-station-aid-bonus", value: 3 }]
    }],
    tags: ["battlewatch", "navigator", "detection", "set"]
  }),
  mod({
    id: "sovereign-concordance-of-five-stations",
    name: "Sovereign Concordance of Five Stations",
    description: "A mythic command lattice binds Captain, Engineer, Navigator, Battlewatch, and Veilwarden into a single responsive command organism without erasing their individual roles.",
    slotClass: "support",
    effectFamily: "morale-command",
    effects: [["detection", 4]],
    capabilities: ["five-station-concordance", "mythic-command-redundancy"],
    ruleModifiers: [
      { kind: "crew-muster-support", value: 8 },
      { kind: "captain-command-resilience", value: 3 },
      { kind: "allied-station-aid-bonus", value: 2 }
    ],
    upgradeChain: { requiresMods: ["grand-fleet-concordance"] },
    coreRuleException: {
      rule: "broken-morale-tactic-use",
      trigger: "when Morale is 0 Broken and the crew would be barred from using Crew Tactics",
      usage: "once-per-event",
      cost: "+1 Strain after the Tactic resolves",
      limit: "permits exactly one Crew Tactic; Morale remains Broken"
    },
    tags: ["captain", "command", "stations", "upgrade"]
  }),
  mod({
    id: "singularity-strain-vault",
    name: "Singularity Strain Vault",
    description: "A forbidden aetherite vault catches one impossible surge and holds it outside the ship's ordinary stress lattice until the danger has passed, leaving the crew to deal with the stored violence afterward.",
    slotClass: "utility",
    effectFamily: "cross-system",
    effects: [["strainCapacity", 10]],
    capabilities: ["mythic-strain-sequestration"],
    ruleModifiers: [{ kind: "strain-maintenance-reduction-bonus", value: 2 }],
    upgradeChain: { requiresMods: ["harmonic-strain-reservoir"] },
    synergies: [{
      id: "worldfire-singularity-loop",
      requiresMods: ["worldfire-arkengine-nexus", "eternity-worldroot-frame"],
      effects: [{ target: "strainCapacity", mode: "add", value: 5 }],
      capabilities: ["mythic-three-point-strain-lattice"]
    }],
    coreRuleException: {
      rule: "ignore-one-strain-threshold",
      trigger: "when a discrete Strain contribution would cross the Strain Limit",
      usage: "once-per-event",
      cost: "the prevented contribution is not removed; add +2 Strain after the current discrete resolution",
      limit: "prevents only the Area degradation from that one threshold crossing"
    },
    tags: ["strain", "cross-system", "set"]
  })
];

export const MYTHIC_SHIP_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
