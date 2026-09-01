import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "mythic";
const MIN_SHIP_LEVEL = 17;
const LEGACY_REFIT_TIER = 5;

function refit(slotClass, slotCost = 1) {
  return refitSpec({ family: "arkengineMod", slotClass, tier: LEGACY_REFIT_TIER, slotCost, ...defaultRefitCosts(LEGACY_REFIT_TIER, slotCost) });
}

function mod({ id, name, description, slotClass, effectFamily, effects = [], capabilities = [], ruleModifiers = [], fuelHooks = [], upgradeChain, synergies = [], coreRuleException, tags = [] }) {
  return component({
    id, name, type: COMPONENT_TYPES.ARKENGINE_MOD, description, capacityCost: 1,
    tags: ["arkengine-mod", RARITY, effectFamily, ...tags], traits: [RARITY, effectFamily, ...tags],
    effects: effects.map(([target, value]) => add(target, value)), capabilities,
    data: {
      rarity: RARITY, minShipLevel: MIN_SHIP_LEVEL, tier: LEGACY_REFIT_TIER, legacyRefitTier: LEGACY_REFIT_TIER,
      modType: effectFamily, effectFamily, refit: refit(slotClass),
      ...(ruleModifiers.length ? { ruleModifiers } : {}), ...(fuelHooks.length ? { fuelHooks } : {}),
      ...(upgradeChain ? { upgradeChain } : {}), ...(synergies.length ? { synergies } : {}),
      ...(coreRuleException ? { coreRuleException } : {})
    }
  });
}

const entries = [
  mod({
    id: "singularity-worldheart-dynamo", name: "Singularity Worldheart Dynamo",
    description: "A captive knot of impossible pressure folds aetheric stress back through the engine's own harmonic shadow, letting the vessel survive one Arkengine threshold event that should have broken lesser machinery.",
    slotClass: "stability", effectFamily: "strain", effects: [["strainCapacity", 14]],
    capabilities: ["singularity-pressure-recovery"],
    ruleModifiers: [{ kind: "engine-strain-spike-reduction", value: 4 }, { kind: "threshold-overflow-damping", value: 3 }],
    upgradeChain: { requiresArkengineMods: ["worldheart-pressure-dynamo"] },
    coreRuleException: {
      rule: "suppress-one-arkengine-area-threshold-degradation",
      trigger: "A Strain threshold would degrade the Arkengine Area.",
      usage: "once-per-event",
      limit: "Only the Arkengine Area degradation is suppressed; Strain threshold consumption and retained overflow still resolve normally."
    },
    tags: ["pressure", "stability", "threshold", "upgrade"]
  }),
  mod({
    id: "firmament-veil-heart", name: "Firmament Veil Heart",
    description: "A luminous engine-heart holds a memory of the ship's Lifeveil pattern and can sustain that pattern for a few impossible moments even after normal Arkengine power collapses.",
    slotClass: "lifeveil", effectFamily: "lifeveil", effects: [["lifeveilCapacity", 75], ["strainCapacity", 3]],
    capabilities: ["firmament-veil-memory"], ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 5 }],
    upgradeChain: { requiresArkengineMods: ["aegis-sun-veil-reactor"] },
    synergies: [{ id: "firmament-aegis-concordance", requiresArkengineMods: [], requiresShipMods: ["veil-of-the-first-firmament", "sevenfold-prismatic-aegis"], effects: [{ target: "lifeveilCapacity", mode: "add", value: 20 }], capabilities: ["mythic-veil-concordance"] }],
    coreRuleException: {
      rule: "sustain-lifeveil-with-disabled-arkengine",
      trigger: "The Arkengine Area becomes Disabled while Lifeveil remains above 0.",
      usage: "once-per-event",
      limit: "Lifeveil projection continues for one round only; this does not restore Arkengine functions or repair either Area.",
      cost: "Lose 10 Lifeveil when the emergency projection begins."
    },
    tags: ["lifeveil", "emergency", "set", "upgrade"]
  }),
  mod({
    id: "crown-of-the-first-burn", name: "Crown of the First Burn",
    description: "The governor crown reads the ship's intended path as a single perfect pressure equation and, once in a crisis, executes a Hard Burn before ordinary strain can catch up with the vessel.",
    slotClass: "power", effectFamily: "hard-burn", effects: [["hardBurnStrainCost", -5], ["combatSpeed", 3]],
    capabilities: ["first-burn-equation"], ruleModifiers: [{ kind: "hard-burn-control", value: 4 }, { kind: "hard-burn-event-bonus", value: 3 }],
    upgradeChain: { requiresArkengineMods: ["crown-of-the-sovereign-burn"] },
    synergies: [{ id: "first-burn-pursuit-concordance", requiresArkengineMods: ["thunderlord-tempest-injectors"], requiresShipMods: ["sunpiercer-void-sails"], effects: [{ target: "combatSpeed", mode: "add", value: 3 }, { target: "maneuverability", mode: "add", value: 1 }] }],
    coreRuleException: {
      rule: "hard-burn-without-base-strain-cost",
      trigger: "The crew declares a Hard Burn before its Strain cost is applied.",
      usage: "once-per-event",
      limit: "Only the base Hard Burn Strain cost is ignored; authored consequences and other Strain sources still apply.",
      cost: "The next Arkengine-threatening Strain contribution in the same event gains +2 Strain."
    },
    tags: ["hard-burn", "governor", "set", "upgrade"]
  }),
  mod({
    id: "godspark-emergency-nexus", name: "Godspark Emergency Nexus",
    description: "A sealed aetherite nexus carries a forbidden reserve spark capable of forcing a dead Arkengine through one final controlled cycle when every ordinary system has gone dark.",
    slotClass: "power", effectFamily: "emergency-power", effects: [["strainCapacity", 8]],
    capabilities: ["godspark-dead-engine-cycle"], ruleModifiers: [{ kind: "emergency-output-access", value: 5 }, { kind: "emergency-power-event-bonus", value: 3 }],
    upgradeChain: { requiresArkengineMods: ["archon-overburn-forge"] },
    synergies: [{ id: "godspark-cooling-triad", requiresArkengineMods: ["winterstar-recirculation-crown"], requiresShipMods: ["arkengine-sovereign-distribution-grid"], ruleModifiers: [{ kind: "emergency-cycle-strain-reduction", value: 1 }], capabilities: ["contained-godspark-cycle"] }],
    coreRuleException: {
      rule: "operate-disabled-arkengine",
      trigger: "The Arkengine Area is Disabled and the crew needs powered movement or one Arkengine-dependent action.",
      usage: "once-per-event",
      limit: "The Arkengine functions for one round only and remains Disabled afterward.",
      cost: "+3 Strain threatening the Arkengine immediately after the emergency round."
    },
    tags: ["emergency", "disabled", "power", "set", "upgrade"]
  }),
  mod({
    id: "saintfire-eternity-reliquary", name: "Saintfire Eternity Reliquary",
    description: "This impossible reliquary preserves a perfect ember of every compatible fuel rite ever fed into it, allowing the Arkengine to answer one desperate call without consuming the authored fuel normally demanded by that effect.",
    slotClass: "utility", effectFamily: "fuel", capabilities: ["eternity-fuel-memory"],
    fuelHooks: [{ kind: "fuel-efficiency", value: 5 }, { kind: "ritual-fuel-conversion", value: 4 }, { kind: "fuel-capacity", value: 3 }, { kind: "fuel-memory", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["saintfire-fuel-reliquary"] },
    coreRuleException: {
      rule: "waive-one-authored-engine-fuel-requirement",
      trigger: "An authored Arkengine effect explicitly requires a compatible fuel expenditure.",
      usage: "once-per-event",
      limit: "Waives only that single authored fuel expenditure; it does not create fuel, refill stores, or introduce a universal fuel-consumption rule.",
      cost: "The reliquary cannot provide another fuel-memory use until the next event."
    },
    tags: ["fuel", "ritual", "memory", "upgrade"]
  })
];

export const MYTHIC_ARKENGINE_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
