import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const RARITY = "rare";
const MIN_SHIP_LEVEL = 3;
const LEGACY_REFIT_TIER = 2;

function refit(slotClass, slotCost = 1) {
  return refitSpec({
    family: "arkengineMod",
    slotClass,
    tier: LEGACY_REFIT_TIER,
    slotCost,
    ...defaultRefitCosts(LEGACY_REFIT_TIER, slotCost)
  });
}

function mod({ id, name, description, slotClass, effectFamily, effects = [], capabilities = [], ruleModifiers = [], fuelHooks = [], upgradeChain, synergies = [], tags = [] }) {
  return component({
    id,
    name,
    type: COMPONENT_TYPES.ARKENGINE_MOD,
    description,
    capacityCost: 1,
    tags: ["arkengine-mod", RARITY, effectFamily, ...tags],
    traits: [RARITY, effectFamily, ...tags],
    effects: effects.map(([target, value]) => add(target, value)),
    capabilities,
    data: {
      rarity: RARITY,
      minShipLevel: MIN_SHIP_LEVEL,
      tier: LEGACY_REFIT_TIER,
      legacyRefitTier: LEGACY_REFIT_TIER,
      modType: effectFamily,
      effectFamily,
      refit: refit(slotClass),
      ...(ruleModifiers.length ? { ruleModifiers } : {}),
      ...(fuelHooks.length ? { fuelHooks } : {}),
      ...(upgradeChain ? { upgradeChain } : {}),
      ...(synergies.length ? { synergies } : {})
    }
  });
}

const entries = [
  mod({
    id: "pressure-lattice-governor",
    name: "Pressure Lattice Governor",
    description: "A responsive brass-and-aetherite governor continuously trims pressure between engine chambers before local surges become shipwide Strain.",
    slotClass: "stability",
    effectFamily: "strain",
    effects: [["strainCapacity", 3]],
    capabilities: ["active-pressure-governing"],
    ruleModifiers: [{ kind: "engine-strain-spike-reduction", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["pressure-lattice-tuning"] },
    tags: ["pressure", "stability", "upgrade"]
  }),
  mod({
    id: "focused-veil-manifold",
    name: "Focused Veil Manifold",
    description: "A multi-ring manifold routes Arkengine output into a tighter, stronger Lifeveil envelope without destabilizing normal drive output.",
    slotClass: "lifeveil",
    effectFamily: "lifeveil",
    effects: [["lifeveilCapacity", 15]],
    capabilities: ["focused-veil-feed"],
    ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["veil-projector-focusing"] },
    tags: ["lifeveil", "projection", "upgrade"]
  }),
  mod({
    id: "coldwake-recirculation-loop",
    name: "Coldwake Recirculation Loop",
    description: "A closed-cycle coolant lattice reuses condensed aetheric chill to stabilize long burns and repeated power surges.",
    slotClass: "utility",
    effectFamily: "cooling",
    capabilities: ["closed-cycle-engine-cooling"],
    ruleModifiers: [{ kind: "hard-burn-heat-mitigation", value: 2 }, { kind: "sustained-output-cooling", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["cooling-loop-expansion"] },
    synergies: [{ id: "coldwake-racing-loop", requiresArkengineMods: [], requiresShipMods: ["trim-sail-regulators"], ruleModifiers: [{ kind: "hard-burn-strain-reduction", value: 1 }] }],
    tags: ["cooling", "hard-burn", "synergy"]
  }),
  mod({
    id: "refined-fuel-matrix",
    name: "Refined Fuel Matrix",
    description: "A more exacting spell-fuel matrix wastes less stored magical charge while preserving compatibility with multiple ritual and alchemical fuel sources.",
    slotClass: "utility",
    effectFamily: "fuel",
    capabilities: ["refined-fuel-conversion"],
    fuelHooks: [{ kind: "fuel-efficiency", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["fuel-matrix-efficiency"] },
    tags: ["fuel", "efficiency", "upgrade"]
  }),
  mod({
    id: "stormwake-twin-injectors",
    name: "Stormwake Twin Injectors",
    description: "Paired surge injectors deliver a stronger burst through alternating channels so one line can cool while the other drives the ship forward.",
    slotClass: "power",
    effectFamily: "power-output",
    effects: [["voyageSpeedTravelHexDays", -2]],
    capabilities: ["twin-stormwake-burst"],
    ruleModifiers: [{ kind: "stormwake-risk-output", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["stormwake-injector"] },
    synergies: [{ id: "stormwake-sail-drive", requiresArkengineMods: [], requiresShipMods: ["stormproof-void-sails"], effects: [{ target: "combatSpeed", mode: "add", value: 1 }] }],
    tags: ["overcharge", "speed", "synergy"]
  }),
  mod({
    id: "deepwake-voidglass-heart",
    name: "Deepwake Voidglass Heart",
    description: "A thick voidglass regulator chamber steadies core rhythm against deep-void pressure reversals and hostile magical currents.",
    slotClass: "stability",
    effectFamily: "deep-void",
    effects: [["strainCapacity", 2]],
    capabilities: ["deepwake-pressure-immunity-support"],
    ruleModifiers: [{ kind: "deep-void-engine-stability", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["voidglass-regulator"] },
    tags: ["deep-void", "stability", "upgrade"]
  }),
  mod({
    id: "resonant-choir-core",
    name: "Resonant Choir Core",
    description: "Matched resonance plates and harmonic chambers let ritual crews tune the Arkengine as a single instrument, strengthening veil-linked output and controlled surges.",
    slotClass: "lifeveil",
    effectFamily: "ritual",
    effects: [["lifeveilCapacity", 12]],
    capabilities: ["resonant-engine-ritual"],
    ruleModifiers: [{ kind: "ritual-engine-check-bonus", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["choir-harmonic-lattice"] },
    tags: ["ritual", "harmonic", "upgrade"]
  }),
  mod({
    id: "controlled-overburn-catalysts",
    name: "Controlled Overburn Catalysts",
    description: "Segmented catalyst plates let the Engineer draw emergency output in measured stages instead of committing the entire core to one violent overburn.",
    slotClass: "power",
    effectFamily: "emergency-power",
    capabilities: ["metered-overburn"],
    ruleModifiers: [{ kind: "emergency-output-access", value: 2 }, { kind: "overburn-strain-reduction", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["overburn-catalysts"] },
    tags: ["overburn", "emergency", "upgrade"]
  }),
  mod({
    id: "aetherite-core-cage",
    name: "Aetherite Core Cage",
    description: "A reinforced rune cage braces the Arkengine core in every axis and channels violent torsion into sacrificial mounts rather than the engine cradle.",
    slotClass: "stability",
    effectFamily: "stability",
    effects: [["strainCapacity", 4]],
    capabilities: ["core-shock-isolation"],
    ruleModifiers: [{ kind: "arkengine-area-repair-bonus", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["aetherite-core-bracing"] },
    tags: ["core", "stability", "upgrade"]
  }),
  mod({
    id: "deep-reserve-fuel-siphons",
    name: "Deep-Reserve Fuel Siphons",
    description: "Redundant siphons and reserve interfaces expand safe spell-fuel handling without requiring a universal fuel-consumption subsystem.",
    slotClass: "utility",
    effectFamily: "fuel",
    effects: [["arkengineFuelSlots", 2]],
    capabilities: ["deep-reserve-fuel-routing"],
    fuelHooks: [{ kind: "fuel-capacity", value: 2 }, { kind: "reserve-fuel-access", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["refined-fuel-siphons"] },
    tags: ["fuel", "capacity", "upgrade"]
  }),
  mod({
    id: "silent-hushglass-shroud",
    name: "Silent Hushglass Shroud",
    description: "Layered hushglass and vibration-damping mounts suppress both visible glow and structural resonance from the working Arkengine.",
    slotClass: "utility",
    effectFamily: "stealth",
    capabilities: ["deep-engine-signature-suppression"],
    ruleModifiers: [{ kind: "arkengine-signature-suppression", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["hushglass-cowl"] },
    synergies: [{ id: "silent-running-suite", requiresArkengineMods: [], requiresShipMods: ["occult-signal-refractors"], capabilities: ["suppressed-magical-wake"] }],
    tags: ["stealth", "hushglass", "synergy"]
  }),
  mod({
    id: "precision-hard-burn-governor",
    name: "Precision Hard Burn Governor",
    description: "A finer governor assembly meters drive pressure in rapid pulses, allowing harder acceleration with less accumulated Strain.",
    slotClass: "power",
    effectFamily: "hard-burn",
    effects: [["hardBurnStrainCost", -2]],
    capabilities: ["precision-governed-burn"],
    upgradeChain: { requiresArkengineMods: ["hard-burn-governor"] },
    synergies: [{ id: "governed-racing-drive", requiresArkengineMods: [], requiresShipMods: ["battlewake-control-fins"], effects: [{ target: "maneuverability", mode: "add", value: 1 }] }],
    tags: ["hard-burn", "governor", "synergy"]
  }),
  mod({
    id: "surge-grounding-array",
    name: "Surge Grounding Array",
    description: "A full ring of grounded discharge rods dumps dangerous overcharge through multiple sacrificial paths before it can cascade across the engine room.",
    slotClass: "power",
    effectFamily: "strain",
    effects: [["strainCapacity", 3]],
    capabilities: ["distributed-overcharge-grounding"],
    ruleModifiers: [{ kind: "overcharge-strain-reduction", value: 1 }],
    upgradeChain: { requiresArkengineMods: ["overcharge-grounding-rods"] },
    tags: ["overcharge", "strain", "upgrade"]
  }),
  mod({
    id: "prismatic-lifeveil-feed",
    name: "Prismatic Lifeveil Feed",
    description: "A prismatic engine-feed assembly splits veil power into stable bands before recombining them at the projector manifold.",
    slotClass: "lifeveil",
    effectFamily: "lifeveil",
    effects: [["lifeveilCapacity", 20]],
    capabilities: ["prismatic-engine-veil-feed"],
    ruleModifiers: [{ kind: "lifeveil-recovery-support", value: 2 }],
    upgradeChain: { requiresArkengineMods: ["lifeveil-harmonic-prism"] },
    synergies: [{ id: "engine-veil-citadel", requiresArkengineMods: [], requiresShipMods: ["veil-harmonic-capacitors"], effects: [{ target: "lifeveilCapacity", mode: "add", value: 5 }] }],
    tags: ["lifeveil", "prism", "synergy"]
  })
];

export const RARE_ARKENGINE_MODS = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
