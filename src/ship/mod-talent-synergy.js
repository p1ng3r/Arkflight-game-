import { SHIP_TALENTS } from "../content/ship-talents.js";

const RARITY_RANK = Object.freeze({ standard: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 });

const PROFILE = Object.freeze({
  hull: Object.freeze({
    talents: Object.freeze(["toughness", "greater-frame", "iron-legend", "ship-will-not-die", "defensive-bracing"]),
    label: "Frame Doctrine Link"
  }),
  lifeveil: Object.freeze({
    talents: Object.freeze(["reinforced-lifeveil", "deep-veil-reservoir", "veil-of-legend", "void-cannot-have-us"]),
    label: "Veil Doctrine Link"
  }),
  drive: Object.freeze({
    talents: Object.freeze(["improved-drive", "legendary-drive", "impossible-burn"]),
    label: "Drive Doctrine Link"
  }),
  maneuver: Object.freeze({
    talents: Object.freeze(["responsive-rigging", "legendary-rigging", "turn-between-heartbeats"]),
    label: "Rigging Doctrine Link"
  }),
  strain: Object.freeze({
    talents: Object.freeze(["deep-strain-reserves", "legendary-strain-reserve", "endless-reserve"]),
    label: "Strain Doctrine Link"
  }),
  combat: Object.freeze({
    talents: Object.freeze(["battle-trained", "specialist-battle-systems", "mythic-broadside"]),
    label: "Battle Doctrine Link"
  }),
  voyage: Object.freeze({
    talents: Object.freeze(["voyage-trained", "specialist-voyage-systems", "master-of-the-black"]),
    label: "Voyage Doctrine Link"
  }),
  repair: Object.freeze({
    talents: Object.freeze(["repair-trained", "efficient-repair-crews", "frugal-repairs"]),
    label: "Damage-Control Link"
  }),
  logistics: Object.freeze({
    talents: Object.freeze(["spare-stores", "expanded-cargo", "efficient-stores", "voyage-trained"]),
    label: "Logistics Doctrine Link"
  }),
  command: Object.freeze({
    talents: Object.freeze(["battle-trained", "voyage-trained", "master-crew", "one-crew-one-ship"]),
    label: "Crew Doctrine Link"
  }),
  resistance: Object.freeze({
    talents: Object.freeze(["defensive-bracing", "toughness", "greater-frame", "reinforced-lifeveil"]),
    label: "Defensive Doctrine Link"
  })
});

const FAMILY_PROFILES = Object.freeze({
  hull: ["hull"],
  "armor-class": ["hull", "resistance"],
  resistance: ["resistance"],
  lifeveil: ["lifeveil"],
  maneuverability: ["maneuver"],
  speed: ["drive"],
  cargo: ["logistics"],
  detection: ["voyage", "combat"],
  "crew-support": ["command"],
  "recovery-repair": ["repair"],
  combat: ["combat"],
  "voyage-event": ["voyage"],
  logistics: ["logistics"],
  "morale-command": ["command"],
  "cross-system": ["strain", "command"],
  arkengine: ["strain", "drive"],
  "power-output": ["drive", "strain"],
  strain: ["strain"],
  "hard-burn": ["drive", "strain"],
  fuel: ["voyage", "logistics"],
  cooling: ["strain"],
  stability: ["strain"],
  "travel-speed": ["drive", "voyage"],
  "emergency-power": ["strain", "drive"],
  stealth: ["voyage"],
  "deep-void": ["voyage", "resistance"],
  ritual: ["lifeveil", "voyage"]
});

function unique(values) { return [...new Set((values ?? []).filter(Boolean))]; }
function rankFor(mod) { return RARITY_RANK[String(mod?.data?.rarity ?? "standard").toLowerCase()] ?? 0; }
function talentExists(id) { return Boolean(SHIP_TALENTS[id]); }
function freezeObjects(values = []) { return Object.freeze(values.map((value) => Object.freeze({ ...value }))); }

function profileKeysForMod(mod) {
  const profiles = new Set(FAMILY_PROFILES[mod?.data?.effectFamily] ?? []);
  const targets = new Set((mod?.effects ?? []).map((effect) => effect.target));
  const tags = new Set([...(mod?.tags ?? []), ...(mod?.traits ?? [])].map((tag) => String(tag).toLowerCase()));

  if (targets.has("hullIntegrity") || targets.has("armorClass") || targets.has("hardness")) profiles.add("hull");
  if (targets.has("lifeveilCapacity")) profiles.add("lifeveil");
  if (targets.has("combatSpeed") || targets.has("voyageSpeedTravelHexDays")) profiles.add("drive");
  if (targets.has("maneuverability")) profiles.add("maneuver");
  if (targets.has("strainCapacity") || targets.has("hardBurnStrainCost")) profiles.add("strain");
  if (targets.has("cargoCapacity") || targets.has("supplyCapacity")) profiles.add("logistics");
  if (targets.has("detection")) { profiles.add("voyage"); profiles.add("combat"); }

  if (tags.has("repair") || tags.has("recovery")) profiles.add("repair");
  if (tags.has("battlewatch") || tags.has("weapon") || tags.has("military") || tags.has("combat")) profiles.add("combat");
  if (tags.has("command") || tags.has("crew") || tags.has("morale")) profiles.add("command");
  if (tags.has("sail") || tags.has("sails") || tags.has("propulsion") || tags.has("speed")) profiles.add("drive");
  if (tags.has("rigging") || tags.has("maneuvering") || tags.has("helm")) profiles.add("maneuver");
  if (tags.has("lifeveil") || tags.has("veil")) profiles.add("lifeveil");
  if (tags.has("strain") || tags.has("overcharge") || tags.has("hard-burn")) profiles.add("strain");
  if (tags.has("cargo") || tags.has("salvage") || tags.has("logistics")) profiles.add("logistics");
  if (tags.has("deep-void") || tags.has("navigation") || tags.has("scouting")) profiles.add("voyage");
  if (tags.has("resistance") || tags.has("armor")) profiles.add("resistance");

  if (!profiles.size) profiles.add(mod?.type === "arkengine-mod" ? "strain" : "voyage");
  return [...profiles];
}

function synergyForProfile(profileKey, rank, modId) {
  if (rank < 1) return null;
  const profile = PROFILE[profileKey];
  if (!profile) return null;
  const scale = rank >= 3 ? 2 : 1;
  const mythicScale = rank >= 4 ? 2 : scale;
  const base = {
    id: `${modId}:${profileKey}:talent-link`,
    label: profile.label,
    requiresAnyTalents: profile.talents,
    description: "This fitting becomes more effective when the vessel has developed the matching whole-ship talent doctrine.",
    effects: [], capabilities: [], ruleModifiers: []
  };

  switch (profileKey) {
    case "hull":
      base.capabilities = ["talent-linked-frame"];
      base.ruleModifiers = [{ kind: "braced-hull-mitigation-bonus", value: mythicScale }];
      break;
    case "lifeveil":
      base.effects = [{ target: "lifeveilCapacity", mode: "add", value: [0, 5, 8, 12, 15][rank] ?? 5 }];
      base.capabilities = ["talent-linked-lifeveil"];
      break;
    case "drive":
      base.capabilities = ["talent-linked-drive"];
      base.ruleModifiers = [{ kind: "overburn-strain-reduction", value: mythicScale }];
      break;
    case "maneuver":
      base.capabilities = ["talent-linked-rigging"];
      base.ruleModifiers = [{ kind: "maneuver-allowance-bonus", value: 1 }];
      break;
    case "strain":
      base.effects = [{ target: "strainCapacity", mode: "add", value: scale }];
      base.capabilities = ["talent-linked-strain-lattice"];
      break;
    case "combat":
      base.capabilities = ["talent-linked-fire-control"];
      base.ruleModifiers = [{ kind: "acquire-target-bonus", value: rank >= 4 ? 2 : 1 }];
      break;
    case "voyage":
      base.capabilities = ["talent-linked-voyage-systems"];
      base.ruleModifiers = [{ kind: "voyage-station-support-bonus", value: rank >= 3 ? 2 : 1 }];
      break;
    case "repair":
      base.capabilities = ["talent-linked-damage-control"];
      base.ruleModifiers = [{ kind: "repair-time-reduction-fraction", value: [0, 0.1, 0.15, 0.2, 0.25][rank] ?? 0.1 }];
      break;
    case "logistics":
      base.effects = [{ target: "cargoCapacity", mode: "add", value: [0, 5, 10, 15, 20][rank] ?? 5 }];
      base.capabilities = ["talent-linked-logistics"];
      break;
    case "command":
      base.capabilities = ["talent-linked-command-network"];
      base.ruleModifiers = [{ kind: "shipwide-aid-bonus", value: 1 }];
      break;
    case "resistance":
      base.capabilities = ["talent-linked-defensive-array"];
      base.ruleModifiers = [{ kind: "brace-resistance-bonus", value: [0, 2, 3, 4, 5][rank] ?? 2 }];
      break;
    default:
      return null;
  }

  return Object.freeze({
    ...base,
    requiresAnyTalents: Object.freeze(base.requiresAnyTalents.filter(talentExists)),
    effects: freezeObjects(base.effects),
    capabilities: Object.freeze(unique(base.capabilities)),
    ruleModifiers: freezeObjects(base.ruleModifiers)
  });
}

export function decorateModTalentSynergies(mod) {
  if (!mod) return mod;
  const profileKeys = profileKeysForMod(mod);
  const inferredComplements = unique(profileKeys.flatMap((key) => PROFILE[key]?.talents ?? [])).filter(talentExists);
  const authoredComplements = (mod.data?.complementsTalents ?? []).filter(talentExists);
  const complementsTalents = Object.freeze(unique([...authoredComplements, ...inferredComplements]));

  const inferredSynergies = profileKeys.map((key) => synergyForProfile(key, rankFor(mod), mod.id)).filter(Boolean);
  const authoredSynergies = Array.isArray(mod.data?.talentSynergies) ? mod.data.talentSynergies : [];
  const byId = new Map();
  for (const synergy of [...inferredSynergies, ...authoredSynergies]) if (synergy?.id) byId.set(synergy.id, synergy);
  const talentSynergies = Object.freeze([...byId.values()].map((synergy) => Object.freeze({
    ...synergy,
    requiresAnyTalents: Object.freeze(unique((synergy.requiresAnyTalents ?? []).filter(talentExists))),
    effects: freezeObjects(synergy.effects ?? []),
    capabilities: Object.freeze(unique(synergy.capabilities ?? [])),
    ruleModifiers: freezeObjects(synergy.ruleModifiers ?? [])
  })));

  return Object.freeze({
    ...mod,
    data: Object.freeze({ ...(mod.data ?? {}), complementsTalents, talentSynergies })
  });
}

export function activeModTalentSynergies(mod, talentIds = []) {
  const owned = new Set(talentIds ?? []);
  return Object.freeze((mod?.data?.talentSynergies ?? []).filter((synergy) =>
    Array.isArray(synergy?.requiresAnyTalents) && synergy.requiresAnyTalents.some((id) => owned.has(id))
  ));
}

export function resolveInstalledModTalentSynergies(components = [], talentIds = []) {
  const rows = [];
  for (const mod of components ?? []) {
    if (!mod || !["ship-mod", "arkengine-mod"].includes(mod.type)) continue;
    for (const synergy of activeModTalentSynergies(mod, talentIds)) {
      rows.push(Object.freeze({
        modId: mod.id,
        modName: mod.name,
        modType: mod.type,
        rarity: mod.data?.rarity ?? "standard",
        id: synergy.id,
        label: synergy.label,
        description: synergy.description,
        matchedTalentIds: Object.freeze((synergy.requiresAnyTalents ?? []).filter((id) => talentIds.includes(id))),
        effects: synergy.effects,
        capabilities: synergy.capabilities,
        ruleModifiers: synergy.ruleModifiers
      }));
    }
  }
  return Object.freeze(rows);
}

export function modTalentComplementNames(mod) {
  return Object.freeze((mod?.data?.complementsTalents ?? []).map((id) => SHIP_TALENTS[id]?.name).filter(Boolean));
}

export function ruleModifierTotal(ruleModifiers = [], kind) {
  return (ruleModifiers ?? []).reduce((sum, modifier) => modifier?.kind === kind ? sum + Number(modifier.value ?? 0) : sum, 0);
}
