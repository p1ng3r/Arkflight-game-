import { component, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";
import { shipModRarityRule } from "../ship/ship-mod-rarity.js";

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
  })
});

const CAP = Object.freeze({
  "stormglass-lance": ["stormglass-weapon"],
  "grapnel-harpoon": ["ship-grappling"]
});

const RARITY_BY_REFIT_TIER = Object.freeze({ 1: "standard", 2: "rare", 3: "epic", 4: "legendary", 5: "mythic" });

function refitFor(entry) {
  const tier = Math.max(1, Math.trunc(Number(entry.tier) || 1));
  const slotCost = tier;
  const costs = defaultRefitCosts(tier, slotCost);
  return refitSpec({ family: "weapon", slotClass: "weapon", tier, slotCost, ...costs });
}

export const WEAPONS = Object.freeze(Object.fromEntries(Object.entries(D).map(([id, entry]) => {
  const refitTier = Math.max(1, Math.trunc(Number(entry.tier) || 1));
  const rarity = RARITY_BY_REFIT_TIER[refitTier] ?? "standard";
  const rarityRule = shipModRarityRule(rarity);
  return [id, component({
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
  })];
})));
