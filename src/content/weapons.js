import { component, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";
import { shipModRarityRule } from "../ship/ship-mod-rarity.js";
import { withWeaponArt } from "./weapon-art.js";

// Alpha combat values: this core catalog is intentionally compact. Ammunition
// and special load types are a separate future layer rather than duplicate guns.
// Common mechanical weapon families may offer smaller mount variants, but their
// firing locations and arc templates remain inherited from the parent role.
const D = Object.freeze({
  "deck-ballista": Object.freeze({
    name: "Deck Ballista",
    description: "A reinforced deck-mounted ballista intended as the simplest Arkflight ship weapon source item.",
    tier: 1,
    tags: ["weapon", "ballista", "bolt-thrower", "small", "mechanical", "bolt", "crew-served"],
    size: "small",
    family: "ballista",
    category: "bolt-thrower",
    crewRequired: 1,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "2d10", type: "piercing" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 2, optimalMax: 4, max: 6 } }
  }),
  "repeating-bolt-rack": Object.freeze({
    name: "Repeating Bolt Rack",
    description: "A compact indexed rack of lighter bolts built for rapid close-defense fire against fast craft and exposed fittings.",
    tier: 1,
    tags: ["weapon", "ballista", "repeating", "small", "mechanical", "bolt", "close-defense", "crew-served"],
    size: "small",
    family: "ballista",
    category: "repeating-bolt-thrower",
    crewRequired: 1,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "2d6", type: "piercing" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 0, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 3, max: 4 } }
  }),
  "heavy-scorpion": Object.freeze({
    name: "Heavy Scorpion",
    description: "A long-armed precision bolt thrower that trades speed for reach and enough force to punch vulnerable ship fittings at range.",
    tier: 1,
    tags: ["weapon", "ballista", "scorpion", "medium", "mechanical", "precision", "long-range", "crew-served"],
    size: "medium",
    family: "ballista",
    category: "heavy-bolt-thrower",
    crewRequired: 2,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "3d10", type: "piercing" },
    mountType: "medium",
    systemThreat: "rigging",
    cargo: 2,
    combat: { fireAP: 2, reloadRounds: 1, arcTemplate: "line", rangeHexes: { min: 2, optimalMin: 4, optimalMax: 7, max: 10 } }
  }),
  "light-swivel-cannon": Object.freeze({
    name: "Light Swivel Cannon",
    description: "A cut-down swivel gun for small hardpoints, trading striking power and reach for a lighter crew and mounting footprint.",
    tier: 1,
    tags: ["weapon", "cannon", "small", "mechanical", "black-powder", "crew-served"],
    size: "small",
    family: "cannon",
    category: "light-cannon",
    crewRequired: 1,
    allowedMounts: ["fore", "port", "starboard"],
    damageProfile: { dice: "2d8", type: "bludgeoning" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 2, max: 4 } }
  }),
  "swivel-cannon": Object.freeze({
    name: "Swivel Cannon",
    description: "A compact ship cannon on a reinforced swivel mount, useful as a middle-weight starter weapon profile.",
    tier: 1,
    tags: ["weapon", "cannon", "medium", "mechanical", "black-powder", "crew-served"],
    size: "medium",
    family: "cannon",
    category: "cannon",
    crewRequired: 2,
    allowedMounts: ["fore", "port", "starboard"],
    damageProfile: { dice: "3d8", type: "bludgeoning" },
    mountType: "medium",
    systemThreat: "hull",
    cargo: 2,
    combat: { fireAP: 2, reloadRounds: 1, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 3, max: 5 } }
  }),
  "light-deck-culverin": Object.freeze({
    name: "Light Deck Culverin",
    description: "A shortened chase gun sized for small fore or aft mounts, preserving the culverin's pursuit role at reduced damage and range.",
    tier: 1,
    tags: ["weapon", "cannon", "culverin", "small", "mechanical", "black-powder", "long-range", "crew-served"],
    size: "small",
    family: "cannon",
    category: "light-chase-gun",
    crewRequired: 1,
    allowedMounts: ["fore", "aft"],
    damageProfile: { dice: "2d10", type: "bludgeoning" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "line", rangeHexes: { min: 2, optimalMin: 3, optimalMax: 5, max: 7 } }
  }),
  "deck-culverin": Object.freeze({
    name: "Deck Culverin",
    description: "A long-barreled chase gun tuned for accurate fire down pursuit lines before heavier batteries can answer.",
    tier: 1,
    tags: ["weapon", "cannon", "culverin", "medium", "mechanical", "black-powder", "long-range", "crew-served"],
    size: "medium",
    family: "cannon",
    category: "chase-gun",
    crewRequired: 2,
    allowedMounts: ["fore", "aft"],
    damageProfile: { dice: "3d10", type: "bludgeoning" },
    mountType: "medium",
    systemThreat: "hull",
    cargo: 2,
    combat: { fireAP: 2, reloadRounds: 1, arcTemplate: "line", rangeHexes: { min: 2, optimalMin: 4, optimalMax: 7, max: 10 } }
  }),
  "light-broadside-cannon": Object.freeze({
    name: "Light Broadside Cannon",
    description: "A compact naval cannon built for the small port and starboard hardpoints carried by sloops, cutters, and brigantines.",
    tier: 1,
    tags: ["weapon", "cannon", "small", "mechanical", "black-powder", "broadside", "crew-served"],
    size: "small",
    family: "cannon",
    category: "light-broadside-cannon",
    crewRequired: 2,
    allowedMounts: ["port", "starboard"],
    damageProfile: { dice: "3d8", type: "bludgeoning" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 2,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "broadside", rangeHexes: { min: 1, optimalMin: 2, optimalMax: 4, max: 5 } }
  }),
  "broadside-cannon-battery": Object.freeze({
    name: "Broadside Cannon Battery",
    description: "A linked battery of naval guns designed to turn a ship's port or starboard battery into one punishing broadside.",
    tier: 1,
    tags: ["weapon", "cannon", "battery", "medium", "mechanical", "black-powder", "broadside", "crew-served"],
    size: "medium",
    family: "cannon",
    category: "broadside-battery",
    crewRequired: 3,
    allowedMounts: ["port", "starboard"],
    damageProfile: { dice: "4d10", type: "bludgeoning" },
    mountType: "medium",
    systemThreat: "hull",
    cargo: 3,
    combat: { fireAP: 2, reloadRounds: 2, arcTemplate: "broadside", rangeHexes: { min: 1, optimalMin: 2, optimalMax: 5, max: 7 } }
  }),
  "heavy-bombard": Object.freeze({
    name: "Heavy Bombard",
    description: "A massive siege gun whose crushing shot rewards deliberate positioning, patient loading, and room to fire.",
    tier: 2,
    tags: ["weapon", "cannon", "bombard", "large", "mechanical", "black-powder", "siege", "heavy", "crew-served"],
    size: "large",
    family: "cannon",
    category: "siege-bombard",
    crewRequired: 4,
    allowedMounts: ["fore", "port", "starboard"],
    damageProfile: { dice: "5d12", type: "bludgeoning" },
    mountType: "large",
    systemThreat: "hull",
    cargo: 5,
    combat: { fireAP: 3, reloadRounds: 3, arcTemplate: "wide", rangeHexes: { min: 3, optimalMin: 5, optimalMax: 8, max: 11 } }
  }),
  "stormglass-lance": Object.freeze({
    name: "Stormglass Lance",
    description: "A heavy stormglass focusing lance that channels stored force through a reinforced ship mount.",
    tier: 2,
    tags: ["weapon", "lance", "arcane-lance", "large", "arcane", "magical", "crew-served", "experimental"],
    size: "large",
    family: "lance",
    category: "arcane-lance",
    crewRequired: 3,
    allowedMounts: ["fore"],
    damageProfile: { dice: "4d10", type: "electricity" },
    mountType: "large",
    systemThreat: "lifeveil",
    cargo: 3,
    combat: { fireAP: 3, reloadRounds: 2, arcTemplate: "line", rangeHexes: { min: 3, optimalMin: 4, optimalMax: 8, max: 12 } }
  }),
  "grapnel-harpoon": Object.freeze({
    name: "Grapnel Harpoon",
    description: "A shipboard harpoon thrower with reinforced grapnel heads and tether winch fittings.",
    tier: 1,
    tags: ["weapon", "harpoon", "small", "mechanical", "tether", "crew-served"],
    size: "small",
    family: "harpoon",
    category: "harpoon",
    crewRequired: 1,
    allowedMounts: ["fore", "port", "starboard"],
    damageProfile: { dice: "2d8", type: "piercing" },
    mountType: "small",
    systemThreat: "rigging",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "line", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 2, max: 4 } }
  }),
  "hullspike-harpoon": Object.freeze({
    name: "Hullspike Harpoon",
    description: "A heavier winch-driven harpoon built to bury a broad spike in large hulls and hold a boarding or towing line under violent strain.",
    tier: 1,
    tags: ["weapon", "harpoon", "medium", "mechanical", "tether", "boarding", "control", "crew-served"],
    size: "medium",
    family: "harpoon",
    category: "heavy-harpoon",
    crewRequired: 2,
    allowedMounts: ["fore", "port", "starboard"],
    damageProfile: { dice: "3d8", type: "piercing" },
    mountType: "medium",
    systemThreat: "hull",
    cargo: 2,
    combat: { fireAP: 2, reloadRounds: 2, arcTemplate: "line", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 3, max: 5 } }
  }),
  "light-deck-scattergun": Object.freeze({
    name: "Light Deck Scattergun",
    description: "A small-mount scattergun for close defense, throwing a lighter shot cloud across the same firing lanes as the full deck gun.",
    tier: 1,
    tags: ["weapon", "cannon", "scattergun", "small", "mechanical", "black-powder", "close-defense", "crew-served"],
    size: "small",
    family: "cannon",
    category: "light-scattergun",
    crewRequired: 1,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "3d6", type: "bludgeoning" },
    mountType: "small",
    systemThreat: "hull",
    cargo: 1,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 2, max: 3 } }
  }),
  "deck-scattergun": Object.freeze({
    name: "Deck Scattergun",
    description: "A brutal short-range deck gun that throws a spreading storm of heavy shot into nearby attackers and boarding approaches.",
    tier: 1,
    tags: ["weapon", "cannon", "scattergun", "medium", "mechanical", "black-powder", "close-defense", "crew-served"],
    size: "medium",
    family: "cannon",
    category: "scattergun",
    crewRequired: 2,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "4d6", type: "bludgeoning" },
    mountType: "medium",
    systemThreat: "hull",
    cargo: 2,
    combat: { fireAP: 1, reloadRounds: 1, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 1, optimalMax: 2, max: 4 } }
  }),
  "aether-arc-projector": Object.freeze({
    name: "Aether Arc Projector",
    description: "A reinforced projector cage that hurls a short-lived electrical arc into nearby ships to punish exposed Arkengine systems.",
    tier: 2,
    tags: ["weapon", "projector", "medium", "arcane", "electricity", "system-disruption", "experimental", "crew-served"],
    size: "medium",
    family: "projector",
    category: "aether-arc",
    crewRequired: 2,
    allowedMounts: ["fore", "port", "starboard", "aft"],
    damageProfile: { dice: "3d10", type: "electricity" },
    mountType: "medium",
    systemThreat: "arkengine",
    cargo: 3,
    combat: { fireAP: 2, reloadRounds: 2, arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 2, optimalMax: 4, max: 6 } }
  })
});

const CAP = Object.freeze({
  "stormglass-lance": ["stormglass-weapon"],
  "grapnel-harpoon": ["ship-grappling"],
  "hullspike-harpoon": ["ship-grappling", "heavy-tether"],
  "aether-arc-projector": ["arkengine-disruption"]
});

const RARITY_BY_REFIT_TIER = Object.freeze({ 1: "standard", 2: "rare", 3: "epic", 4: "legendary", 5: "mythic" });

function refitFor(entry) {
  const tier = Math.max(1, Math.trunc(Number(entry.tier) || 1));
  // A ship weapon occupies one physical hull mount. Rarity affects its price,
  // work time, and level gate; it must not consume several unrelated mounts.
  const slotCost = 1;
  const costs = defaultRefitCosts(tier, slotCost);
  return refitSpec({ family: "weapon", slotClass: "weapon", tier, slotCost, ...costs });
}

export const WEAPONS = Object.freeze(Object.fromEntries(Object.entries(D).map(([id, entry]) => {
  const refitTier = Math.max(1, Math.trunc(Number(entry.tier) || 1));
  const rarity = RARITY_BY_REFIT_TIER[refitTier] ?? "standard";
  const rarityRule = shipModRarityRule(rarity);
  return [id, withWeaponArt(component({
    id,
    name: entry.name,
    type: COMPONENT_TYPES.WEAPON,
    description: entry.description,
    capacityCost: refitTier,
    tags: ["ship-weapon", rarity, ...entry.tags],
    traits: entry.tags.filter((x) => !["weapon", entry.size, entry.family, entry.category].includes(x)),
    capabilities: CAP[id] ?? [],
    data: {
      rarity,
      minShipLevel: rarityRule.minShipLevel,
      size: entry.size,
      family: entry.family,
      category: entry.category,
      crewRequired: entry.crewRequired,
      allowedMounts: Object.freeze([...entry.allowedMounts]),
      combat: Object.freeze({
        fireAP: entry.combat.fireAP,
        reloadRounds: entry.combat.reloadRounds,
        arcTemplate: entry.combat.arcTemplate,
        rangeHexes: Object.freeze({ ...entry.combat.rangeHexes })
      }),
      damageProfile: Object.freeze({ ...entry.damageProfile }),
      mountType: entry.mountType,
      systemThreat: entry.systemThreat,
      cargo: entry.cargo,
      refit: refitFor(entry)
    }
  }))];
})));
