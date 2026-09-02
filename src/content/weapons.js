import { component, COMPONENT_TYPES } from "../ship/component-rules.js";
import { defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";
import { shipModRarityRule } from "../ship/ship-mod-rarity.js";

const D = {
  "deck-ballista": [
    "Deck Ballista",
    "A reinforced deck-mounted ballista intended as the simplest Arkflight ship weapon source item.",
    1,
    ["weapon", "ballista", "bolt-thrower", "small", "mechanical", "bolt", "crew-served"],
    "small",
    "ballista",
    "bolt-thrower",
    1,
    { type: "crewServed", actions: 1, crewRequired: 1 },
    ["fore", "port", "starboard", "aft"],
    { dice: "2d10", type: "piercing" },
    "small",
    "hull",
    1
  ],
  "swivel-cannon": [
    "Swivel Cannon",
    "A compact ship cannon on a reinforced swivel mount, useful as a middle-weight starter weapon profile.",
    1,
    ["weapon", "cannon", "medium", "mechanical", "black-powder", "crew-served"],
    "medium",
    "cannon",
    "cannon",
    2,
    { type: "crewServed", actions: 2, crewRequired: 2 },
    ["fore", "port", "starboard"],
    { dice: "3d8", type: "bludgeoning" },
    "medium",
    "hull",
    2
  ],
  "stormglass-lance": [
    "Stormglass Lance",
    "A heavy stormglass focusing lance that channels stored force through a reinforced ship mount.",
    2,
    ["weapon", "lance", "arcane-lance", "large", "arcane", "magical", "crew-served", "experimental"],
    "large",
    "lance",
    "arcane-lance",
    3,
    { type: "charge", actions: 3, crewRequired: 3 },
    ["fore"],
    { dice: "4d10", type: "electricity" },
    "large",
    "lifeveil",
    3
  ],
  "grapnel-harpoon": [
    "Grapnel Harpoon",
    "A shipboard harpoon thrower with reinforced grapnel heads and tether winch fittings.",
    1,
    ["weapon", "harpoon", "small", "mechanical", "tether", "crew-served"],
    "small",
    "harpoon",
    "harpoon",
    1,
    { type: "singleShot", actions: 1, crewRequired: 1 },
    ["fore", "port", "starboard"],
    { dice: "2d8", type: "piercing" },
    "small",
    "rigging",
    1
  ]
};

const CAP = {
  "stormglass-lance": ["stormglass-weapon"],
  "grapnel-harpoon": ["ship-grappling"]
};

const RARITY_BY_REFIT_TIER = Object.freeze({ 1: "standard", 2: "rare", 3: "epic", 4: "legendary", 5: "mythic" });

function refitFor(v) {
  const tier = Math.max(1, Math.trunc(Number(v[2]) || 1));
  const slotCost = Math.max(1, Math.trunc(Number(v[2]) || 1));
  const costs = defaultRefitCosts(tier, slotCost);
  return refitSpec({
    family: "weapon",
    slotClass: "weapon",
    tier,
    slotCost,
    ...costs
  });
}

export const WEAPONS = Object.freeze(Object.fromEntries(Object.entries(D).map(([id, v]) => {
  const refitTier = Math.max(1, Math.trunc(Number(v[2]) || 1));
  const rarity = RARITY_BY_REFIT_TIER[refitTier] ?? "standard";
  const rarityRule = shipModRarityRule(rarity);
  return [id, component({
    id,
    name: v[0],
    type: COMPONENT_TYPES.WEAPON,
    description: v[1],
    capacityCost: v[2],
    tags: ["ship-weapon", rarity, ...v[3]],
    traits: v[3].filter((x) => !["weapon", v[4], v[5], v[6]].includes(x)),
    capabilities: CAP[id] ?? [],
    data: {
      rarity,
      minShipLevel: rarityRule.minShipLevel,
      legacyRefitTier: refitTier,
      size: v[4],
      family: v[5],
      category: v[6],
      crewRequired: v[7],
      reload: v[8],
      arcs: v[9],
      damageProfile: v[10],
      mountType: v[11],
      systemThreat: v[12],
      cargo: v[13],
      refit: refitFor(v)
    }
  })];
})));
