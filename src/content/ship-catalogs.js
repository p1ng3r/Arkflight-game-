import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";

function catalog(items) {
  return Object.freeze(Object.fromEntries(items.map((item) => [item.id, item])));
}

export const HULLS = catalog([
  component({ id: "void-skiff", name: "Void Skiff", type: COMPONENT_TYPES.HULL, tags: ["tiny", "fast", "scout"], data: { baseStats: { armorClass: 18, hullIntegrity: 60, lifeveilCapacity: 20, strainCapacity: 4, cargoCapacity: 8, detection: 2, combatSpeed: 8, maneuverability: 3, roomCapacity: 1, shipModCapacity: 1, arkengineModCapacity: 0, crew: { minimum: 1, recommended: 3, maximum: 6 }, weaponMounts: { fore: { count: 1, maxSize: "small" } } }, allowedArkengines: ["emberwake-sparkdrive", "lanterncoil-arkengine"] } }),
  component({ id: "sloop", name: "Sloop", type: COMPONENT_TYPES.HULL, tags: ["small", "courier", "scout"], data: { baseStats: { armorClass: 18, hullIntegrity: 90, lifeveilCapacity: 30, strainCapacity: 6, cargoCapacity: 16, detection: 3, combatSpeed: 7, maneuverability: 3, roomCapacity: 2, shipModCapacity: 2, arkengineModCapacity: 1, crew: { minimum: 3, recommended: 6, maximum: 12 }, weaponMounts: { fore: { count: 1, maxSize: "small" }, port: { count: 1, maxSize: "small" }, starboard: { count: 1, maxSize: "small" } } }, allowedArkengines: ["emberwake-sparkdrive", "lanterncoil-arkengine", "tidewake-arkengine"] } }),
  component({ id: "cutter", name: "Cutter", type: COMPONENT_TYPES.HULL, tags: ["small", "durable", "patrol"], data: { baseStats: { armorClass: 17, hullIntegrity: 120, lifeveilCapacity: 40, strainCapacity: 8, cargoCapacity: 28, detection: 3, combatSpeed: 6, maneuverability: 2, roomCapacity: 3, shipModCapacity: 3, arkengineModCapacity: 1, crew: { minimum: 4, recommended: 10, maximum: 20 }, weaponMounts: { fore: { count: 1, maxSize: "medium" }, port: { count: 1, maxSize: "small" }, starboard: { count: 1, maxSize: "small" }, aft: { count: 1, maxSize: "small" } } }, allowedArkengines: ["emberwake-sparkdrive", "lanterncoil-arkengine", "tidewake-arkengine"] } }),
  component({ id: "brigantine", name: "Brigantine", type: COMPONENT_TYPES.HULL, tags: ["flexible", "workhorse"], data: { baseStats: { armorClass: 17, hullIntegrity: 160, lifeveilCapacity: 55, strainCapacity: 10, cargoCapacity: 40, detection: 4, combatSpeed: 5, maneuverability: 2, roomCapacity: 4, shipModCapacity: 4, arkengineModCapacity: 2, crew: { minimum: 5, recommended: 14, maximum: 32 }, weaponMounts: { fore: { count: 1, maxSize: "medium" }, port: { count: 2, maxSize: "small" }, starboard: { count: 2, maxSize: "small" }, aft: { count: 1, maxSize: "small" } } }, allowedArkengines: ["lanterncoil-arkengine", "tidewake-arkengine", "iron-choir-engine"] } })
]);

export const HULL_PATTERNS = catalog([
  component({ id: "standard", name: "Standard Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["general-purpose"] }),
  component({ id: "battle", name: "Battle Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["martial", "reinforced"], effects: [add("armorClass", 1), add("hullIntegrity", 20), add("maneuverability", -1), add("cargoCapacity", -5), add("detection", 1)] }),
  component({ id: "explorer", name: "Explorer Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["survey", "expedition"], effects: [add("lifeveilCapacity", 5), add("strainCapacity", 1), add("cargoCapacity", -2)], capabilities: ["extended-expedition"] }),
  component({ id: "trade", name: "Trade Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["merchant", "cargo"], effects: [add("cargoCapacity", 10), add("maneuverability", -1)] }),
  component({ id: "stealth", name: "Stealth Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["covert", "quiet-running"], effects: [add("detection", -1), add("cargoCapacity", -4), add("hullIntegrity", -5)], capabilities: ["quiet-running"] }),
  component({ id: "racing", name: "Racing Pattern", type: COMPONENT_TYPES.HULL_PATTERN, tags: ["fast", "responsive"], effects: [add("combatSpeed", 1), add("maneuverability", 1), add("cargoCapacity", -6), add("hullIntegrity", -5)] })
]);

export const ARKENGINES = catalog([
  component({ id: "emberwake-sparkdrive", name: "Emberwake Sparkdrive", type: COMPONENT_TYPES.ARKENGINE, tags: ["arkengine", "spark", "frontier"], data: { modCapacity: 1 } }),
  component({ id: "lanterncoil-arkengine", name: "Lanterncoil Arkengine", type: COMPONENT_TYPES.ARKENGINE, tags: ["arkengine", "lantern", "reliable"], data: { modCapacity: 2 } }),
  component({ id: "tidewake-arkengine", name: "Tidewake Arkengine", type: COMPONENT_TYPES.ARKENGINE, tags: ["arkengine", "wake", "expedition"], data: { modCapacity: 2 } }),
  component({ id: "iron-choir-engine", name: "Iron Choir Engine", type: COMPONENT_TYPES.ARKENGINE, tags: ["arkengine", "choir", "military"], data: { modCapacity: 3 } }),
  component({ id: "furnaceheart-drive", name: "Furnaceheart Drive", type: COMPONENT_TYPES.ARKENGINE, tags: ["arkengine", "furnace", "overdrive"], data: { modCapacity: 3 } })
]);

export const ARKENGINE_PATTERNS = catalog([
  component({ id: "standard", name: "Standard Pattern", type: COMPONENT_TYPES.ARKENGINE_PATTERN, tags: ["general-purpose"] }),
  component({ id: "guild", name: "Guild Pattern", type: COMPONENT_TYPES.ARKENGINE_PATTERN, tags: ["regulated", "serviceable"] }),
  component({ id: "military", name: "Military Pattern", type: COMPONENT_TYPES.ARKENGINE_PATTERN, tags: ["martial", "pressure-rated"], effects: [add("strainCapacity", 1), add("lifeveilCapacity", -2)] }),
  component({ id: "smuggler", name: "Smuggler Pattern", type: COMPONENT_TYPES.ARKENGINE_PATTERN, tags: ["covert", "quiet-running"], capabilities: ["quiet-engine"] }),
  component({ id: "longhaul", name: "Longhaul Pattern", type: COMPONENT_TYPES.ARKENGINE_PATTERN, tags: ["expedition", "efficient"], effects: [add("strainCapacity", 1)] })
]);

export const ARKENGINE_MODS = catalog([
  component({ id: "pressure-lattice-tuning", name: "Pressure Lattice Tuning", type: COMPONENT_TYPES.ARKENGINE_MOD, capacityCost: 1, tags: ["arkengine", "pressure", "stability"], effects: [add("strainCapacity", 1)] }),
  component({ id: "veil-projector-focusing", name: "Veil Projector Focusing", type: COMPONENT_TYPES.ARKENGINE_MOD, capacityCost: 1, tags: ["arkengine", "lifeveil"], effects: [add("lifeveilCapacity", 5)] }),
  component({ id: "stormwake-injector", name: "Stormwake Injector", type: COMPONENT_TYPES.ARKENGINE_MOD, capacityCost: 1, tags: ["arkengine", "overdrive", "risk", "pressure"], unlocks: { signatures: ["engineer.storm-surge"] }, tradeoffs: ["Aggressive use may add Arkengine Pressure."] }),
  component({ id: "hard-burn-governor", name: "Hard Burn Governor", type: COMPONENT_TYPES.ARKENGINE_MOD, capacityCost: 1, tags: ["arkengine", "hard-burn", "control"], unlocks: { signatures: ["engineer.governed-burn"] } }),
  component({ id: "emergency-pressure-bypass", name: "Emergency Pressure Bypass", type: COMPONENT_TYPES.ARKENGINE_MOD, capacityCost: 1, tags: ["arkengine", "pressure", "emergency"], unlocks: { signatures: ["engineer.emergency-bypass"] } })
]);

export const SHIP_MODS = catalog([
  component({ id: "reinforced-structural-ribbing", name: "Reinforced Structural Ribbing", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["hull", "reinforced"], effects: [add("hullIntegrity", 15)] }),
  component({ id: "expanded-cargo-lattice", name: "Expanded Cargo Lattice", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["cargo", "infrastructure"], effects: [add("cargoCapacity", 10), add("maneuverability", -1)], tradeoffs: ["Extra mass reduces maneuverability."] }),
  component({ id: "stabilized-helm-relays", name: "Stabilized Helm Relays", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["helm", "navigation"], unlocks: { signatures: ["navigator.perfect-line"] } }),
  component({ id: "void-anchor-array", name: "Void Anchor Array", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["void", "anchoring"], capabilities: ["void-anchoring"], unlocks: { signatures: ["navigator.hold-position"] } }),
  component({ id: "lookout-spire", name: "Lookout Spire", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["watchmaster", "detection"], effects: [add("detection", 1)], unlocks: { signatures: ["watchmaster.eyes-on-everything"] } }),
  component({ id: "expanded-lifeveil-array", name: "Expanded Lifeveil Array", type: COMPONENT_TYPES.SHIP_MOD, capacityCost: 1, tags: ["lifeveil", "veilwarden"], effects: [add("lifeveilCapacity", 10)], unlocks: { signatures: ["veilwarden.hold-the-veil"] } })
]);

export const ROOMS = catalog([
  component({ id: "workshop", name: "Workshop", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["engineer", "crafting", "repair"], capabilities: ["shipboard-repair"], unlocks: { signatures: ["engineer.field-repair"] } }),
  component({ id: "infirmary", name: "Infirmary", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["recovery", "medical"], capabilities: ["shipboard-medical-care"] }),
  component({ id: "observatory", name: "Observatory", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["navigator", "watchmaster", "detection", "void"], capabilities: ["deep-void-observation"], unlocks: { signatures: ["navigator.starsight", "watchmaster.longwatch"] } }),
  component({ id: "chart-room", name: "Chart Room", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["navigator", "navigation"], capabilities: ["advanced-charting"], unlocks: { signatures: ["navigator.course-correction"] } }),
  component({ id: "ritual-chamber", name: "Ritual Chamber", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["veilwarden", "occult", "ritual"], capabilities: ["shipboard-ritual"], unlocks: { signatures: ["veilwarden.aetheric-surge"] } }),
  component({ id: "armory", name: "Armory", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["watchmaster", "military"], capabilities: ["boarding-arms"], unlocks: { signatures: ["watchmaster.battle-stations"] } }),
  component({ id: "diplomatic-suite", name: "Diplomatic Suite", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["captain", "social", "command"], capabilities: ["formal-diplomacy"], unlocks: { signatures: ["captain.rally-the-crew"] } }),
  component({ id: "expanded-cargo-hold", name: "Expanded Cargo Hold", type: COMPONENT_TYPES.ROOM, capacityCost: 1, tags: ["cargo", "logistics"], effects: [add("cargoCapacity", 12)] })
]);

export const WEAPONS = catalog([
  component({ id: "deck-ballista", name: "Deck Ballista", type: COMPONENT_TYPES.WEAPON, capacityCost: 1, tags: ["weapon", "ballista", "small"], data: { size: "small", arcs: ["fore", "port", "starboard", "aft"] } }),
  component({ id: "swivel-cannon", name: "Swivel Cannon", type: COMPONENT_TYPES.WEAPON, capacityCost: 1, tags: ["weapon", "cannon", "small"], data: { size: "small", arcs: ["fore", "port", "starboard", "aft"] } }),
  component({ id: "stormglass-lance", name: "Stormglass Lance", type: COMPONENT_TYPES.WEAPON, capacityCost: 2, tags: ["weapon", "lance", "arcane"], capabilities: ["stormglass-weapon"], data: { size: "large", arcs: ["fore"] } }),
  component({ id: "grapnel-harpoon", name: "Grapnel Harpoon", type: COMPONENT_TYPES.WEAPON, capacityCost: 1, tags: ["weapon", "harpoon", "boarding"], capabilities: ["ship-grappling"], data: { size: "medium", arcs: ["fore", "port", "starboard"] } })
]);

export const CREW_SPECIALISTS = catalog([
  component({ id: "veteran-chief-engineer", name: "Veteran Chief Engineer", type: COMPONENT_TYPES.CREW_SPECIALIST, tags: ["engineer", "veteran"], unlocks: { signatures: ["engineer.keep-her-together"] } }),
  component({ id: "seasoned-navigator", name: "Seasoned Navigator", type: COMPONENT_TYPES.CREW_SPECIALIST, tags: ["navigator", "veteran"], unlocks: { signatures: ["navigator.thread-the-needle"] } }),
  component({ id: "sharp-eyed-watchmaster", name: "Sharp-Eyed Watchmaster", type: COMPONENT_TYPES.CREW_SPECIALIST, tags: ["watchmaster", "veteran"], unlocks: { signatures: ["watchmaster.i-saw-it-coming"] } }),
  component({ id: "occult-veil-adept", name: "Occult Veil Adept", type: COMPONENT_TYPES.CREW_SPECIALIST, tags: ["veilwarden", "occult"], unlocks: { signatures: ["veilwarden.ward-the-ship"] } }),
  component({ id: "old-star-cartographer", name: "Old Star Cartographer", type: COMPONENT_TYPES.CREW_SPECIALIST, tags: ["navigator", "cartography"], capabilities: ["lost-route-lore"], unlocks: { signatures: ["navigator.old-roads"] } })
]);

export const SHIP_CATALOGS = Object.freeze({
  hulls: HULLS,
  hullPatterns: HULL_PATTERNS,
  arkengines: ARKENGINES,
  arkenginePatterns: ARKENGINE_PATTERNS,
  arkengineMods: ARKENGINE_MODS,
  shipMods: SHIP_MODS,
  rooms: ROOMS,
  weapons: WEAPONS,
  crewSpecialists: CREW_SPECIALISTS
});
