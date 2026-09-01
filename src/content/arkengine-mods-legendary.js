import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "legendary";
const MIN_SHIP_LEVEL = 12;
const LEGACY_REFIT_TIER = 4;

function refit(slotClass, slotCost = 1) {
  return refitSpec({ family: "arkengineMod", slotClass, tier: LEGACY_REFIT_TIER, slotCost, ...defaultRefitCosts(LEGACY_REFIT_TIER, slotCost) });
}

function mod({ id, name, description, slotClass, effectFamily, effects = [], capabilities = [], ruleModifiers = [], fuelHooks = [], upgradeChain, synergies = [], tags = [] }) {
  return component({
    id, name, type: COMPONENT_TYPES.ARKENGINE_MOD, description, capacityCost: 1,
    tags: ["arkengine-mod", RARITY, effectFamily, ...tags], traits: [RARITY, effectFamily, ...tags],
    effects: effects.map(([target, value]) => add(target, value)), capabilities,
    data: {
      rarity: RARITY, minShipLevel: MIN_SHIP_LEVEL, tier: LEGACY_REFIT_TIER, legacyRefitTier: LEGACY_REFIT_TIER,
      modType: effectFamily, effectFamily, refit: refit(slotClass),
      ...(ruleModifiers.length ? { ruleModifiers } : {}), ...(fuelHooks.length ? { fuelHooks } : {}),
      ...(upgradeChain ? { upgradeChain } : {}), ...(synergies.length ? { synergies } : {})
    }
  });
}

const entries = [
  mod({
    id: "worldheart-pressure-dynamo", name: "Worldheart Pressure Dynamo",
    description: "A colossal self-correcting pressure engine drinks oscillation from the core chambers and feeds the recovered force back into the Arkengine as stable reserve power.",
    slotClass: "stability", effectFamily: "strain", effects: [["strainCapacity", 10]],
    capabilities: ["worldheart-pressure-recovery"],
    ruleModifiers: [{ kind: "engine-strain-spike-reduction", value: 3 }, { kind: "threshold-overflow-damping", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["harmonic-pressure-dynamo"] }, tags: ["pressure", "stability", "upgrade"]
  }),
  mod({
    id: "aegis-sun-veil-reactor", name: "Aegis-Sun Veil Reactor",
    description: "A radiant nested reactor turns Arkengine harmonics into a fortress-grade Lifeveil field whose stability remains exceptional even during violent power routing.",
    slotClass: "lifeveil", effectFamily: "lifeveil", effects: [["lifeveilCapacity", 50], ["strainCapacity", 2]],
    capabilities: ["fortress-lifeveil-feed"], ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 4 }],
    upgradeChain: { requiresArkengineMods: ["seraphic-veil-reactor"] },
    synergies: [{ id: "aegis-sun-fortress", requiresArkengineMods: [], requiresShipMods: ["aegis-of-the-star-sea", "sevenfold-prismatic-aegis"], effects: [{ target: "lifeveilCapacity", mode: "add", value: 15 }], capabilities: ["fortress-grade-veil-harmonics"] }],
    tags: ["lifeveil", "projection", "set"]
  }),
  mod({
    id: "winterstar-recirculation-crown", name: "Winterstar Recirculation Crown",
    description: "An immense crown of cold-channel rings and condensers strips heat, arc flare, and magical turbulence from even the most punishing sustained engine output.",
    slotClass: "utility", effectFamily: "cooling", capabilities: ["legendary-engine-cooling"],
    ruleModifiers: [{ kind: "hard-burn-heat-mitigation", value: 4 }, { kind: "sustained-output-cooling", value: 4 }, { kind: "overburn-strain-reduction", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["absolute-zero-recirculator"] }, tags: ["cooling", "hard-burn", "upgrade"]
  }),
  mod({
    id: "saintfire-fuel-reliquary", name: "Saintfire Fuel Reliquary",
    description: "A sanctified reliquary of brass, crystal, and warded chambers refines nearly any compatible ritual fuel into exceptionally clean Arkengine charge without making fuel expenditure compulsory.",
    slotClass: "utility", effectFamily: "fuel", capabilities: ["saintfire-fuel-transmutation"],
    fuelHooks: [{ kind: "fuel-efficiency", value: 4 }, { kind: "ritual-fuel-conversion", value: 3 }, { kind: "fuel-capacity", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["consecrated-fuel-crucible"] },
    synergies: [{ id: "saintfire-reserve-triad", requiresArkengineMods: ["deep-reserve-fuel-siphons"], requiresShipMods: ["grand-salvage-foundry"], capabilities: ["salvage-to-ritual-fuel-conversion"], ruleModifiers: [{ kind: "future-fuel-conversion-efficiency", value: 2 }] }],
    tags: ["fuel", "ritual", "set"]
  }),
  mod({
    id: "thunderlord-tempest-injectors", name: "Thunderlord Tempest Injectors",
    description: "A ring of synchronized surge chambers hurls enormous controlled thrust through the Arkengine, transforming a well-rigged vessel into a terrifying pursuit ship.",
    slotClass: "power", effectFamily: "power-output", effects: [["voyageSpeedTravelHexDays", -4], ["combatSpeed", 3]],
    capabilities: ["thunderlord-drive-output"], ruleModifiers: [{ kind: "stormwake-risk-output", value: 4 }, { kind: "pursuit-engine-bonus", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["tempest-triad-injectors"] },
    synergies: [{ id: "thunderlord-sunpiercer-drive", requiresArkengineMods: [], requiresShipMods: ["sunpiercer-void-sails", "seraphic-vector-vanes"], effects: [{ target: "combatSpeed", mode: "add", value: 2 }, { target: "maneuverability", mode: "add", value: 2 }], capabilities: ["legendary-pursuit-drive"] }],
    tags: ["overcharge", "speed", "set"]
  }),
  mod({
    id: "abyssal-tide-stability-heart", name: "Abyssal Tide Stability Heart",
    description: "A second heart of voidglass and aetherite counters violent Black Tide reversals before they reach the primary core, allowing coherent power in regions that cripple lesser engines.",
    slotClass: "stability", effectFamily: "deep-void", effects: [["strainCapacity", 8]],
    capabilities: ["abyssal-tide-engine-stability"], ruleModifiers: [{ kind: "deep-void-engine-stability", value: 4 }, { kind: "void-event-engine-bonus", value: 3 }],
    upgradeChain: { requiresArkengineMods: ["black-tide-stability-core"] }, tags: ["deep-void", "stability", "upgrade"]
  }),
  mod({
    id: "archon-overburn-forge", name: "Archon Overburn Forge",
    description: "A sacrificial power forge contains repeated emergency surges in replaceable rune-lined chambers, letting the Engineer demand impossible output without treating every overburn as a near-catastrophe.",
    slotClass: "power", effectFamily: "emergency-power", effects: [["strainCapacity", 5]],
    capabilities: ["archon-overburn-cycle"], ruleModifiers: [{ kind: "emergency-output-access", value: 4 }, { kind: "overburn-strain-reduction", value: 3 }, { kind: "emergency-power-event-bonus", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["phoenix-overburn-chamber"] },
    synergies: [{ id: "archon-drive-fortress", requiresArkengineMods: ["winterstar-recirculation-crown"], requiresShipMods: ["arkengine-sovereign-distribution-grid"], ruleModifiers: [{ kind: "hard-burn-strain-reduction", value: 2 }], capabilities: ["legendary-sustained-overburn"] }],
    tags: ["overburn", "emergency", "set"]
  }),
  mod({
    id: "crown-of-the-sovereign-burn", name: "Crown of the Sovereign Burn",
    description: "This predictive governor crown models pressure, sail load, and current flow before the helm commits to a burn, turning Hard Burn into a disciplined high-performance maneuver rather than a desperate gamble.",
    slotClass: "power", effectFamily: "hard-burn", effects: [["hardBurnStrainCost", -4], ["combatSpeed", 2]],
    capabilities: ["legendary-governed-burn"], ruleModifiers: [{ kind: "hard-burn-control", value: 3 }, { kind: "hard-burn-event-bonus", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["sovereign-hard-burn-governor"] },
    synergies: [{ id: "sovereign-drive-concordance", requiresArkengineMods: ["thunderlord-tempest-injectors"], requiresShipMods: ["sunpiercer-void-sails"], effects: [{ target: "combatSpeed", mode: "add", value: 2 }], ruleModifiers: [{ kind: "hard-burn-strain-reduction", value: 1 }] }],
    tags: ["hard-burn", "governor", "set"]
  })
];

export const LEGENDARY_ARKENGINE_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
