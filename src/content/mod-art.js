const MODULE_ROOT = "modules/arkflight-game/assets/icons";
const FALLBACK_MOD_ICON = "icons/svg/item-bag.svg";

export const MOD_UI_ART = Object.freeze({
  rarity: Object.freeze({
    standard: `${MODULE_ROOT}/mod-ui/rarity/rarity_standard.webp`,
    rare: `${MODULE_ROOT}/mod-ui/rarity/rarity_rare.webp`,
    epic: `${MODULE_ROOT}/mod-ui/rarity/rarity_epic.webp`,
    legendary: `${MODULE_ROOT}/mod-ui/rarity/rarity_legendary.webp`,
    mythic: `${MODULE_ROOT}/mod-ui/rarity/rarity_mythic.webp`
  }),
  chain: `${MODULE_ROOT}/mod-ui/synergy/chain_synergy.webp`
});

const SHIP_FILES = Object.freeze({
  standard: new Set([
    "aether_crystal_capacitor.webp", "aether_vent_conduit.webp", "auxiliary_veil_capacitors.webp", "cargo_netting.webp",
    "counterweight_rigging.webp", "crew_muster_bell_network.webp", "crystal_lens_optic.webp", "detection_spire.webp",
    "distributed_strain_dampeners.webp", "docking_claw_system.webp", "emergency_repair_lockers.webp", "enchanted_compass.webp",
    "expanded_lifeveil_array.webp", "firebreak_plating.webp", "gyroscopic_stabilizer.webp", "longwatch_lookout_platform.webp",
    "propulsion_stabilization_fins.webp", "reinforced_bulkhead_network.webp", "reinforced_docking_framework.webp", "reinforced_hull_plating.webp",
    "reinforced_maneuvering_fins.webp", "runed_bulkhead_seal.webp", "stormgrounding_mesh.webp", "trim_sail_regulators.webp",
    "veil_warded_bulkheads.webp", "void_sail_weave.webp", "void_scout_observation_spire.webp"
  ]),
  rare: new Set([
    "ablative_iron_sheathing.webp", "aether_bound_ribbing.webp", "battleline_signal_array.webp", "battlewake_control_fins.webp",
    "battlewatch_scrying_crown.webp", "crew_cohesion_network.webp", "deep_void_armor_web.webp", "grounded_conduit_bus.webp",
    "merchant_prime_cargo_lattice.webp", "precision_helm_relays.webp", "salvage_winch_clusters.webp", "stormglass_firebreak_shell.webp",
    "stormproof_void_sails.webp", "veil_harmonic_capacitors.webp", "veil_resonance_relay.webp"
  ]),
  epic: new Set([
    "aetheric_load_balancer.webp", "battlewake_vector_vanes.webp", "battlewatch_augury_array.webp", "black_tide_racing_sails.webp",
    "captains_war_command_net.webp", "citadel_bulkhead_grid.webp", "emergency_reconstruction_bays.webp", "fleet_command_concordance.webp",
    "grand_salvage_foundry.webp", "harmonic_strain_reservoir.webp", "living_adamant_frame.webp", "oracle_helm_assembly.webp",
    "phoenix_firebreak_mantle.webp", "prismatic_veil_refractors.webp", "stormheart_grounding_spine.webp", "veil_citadel_projector.webp",
    "void_hunter_prow.webp", "voidbone_armor_weave.webp"
  ]),
  legendary: new Set([
    "legendary_admirals_living_command_web.webp", "legendary_aegis_of_the_star_sea.webp", "legendary_all_seeing_battlewatch_oracle.webp",
    "legendary_arkengine_sovereign_distribution_grid.webp", "legendary_fatesight_helm.webp", "legendary_fortress_of_nine_bulkheads.webp",
    "legendary_grand_fleet_concordance.webp", "legendary_leviathan_salvage_foundry.webp", "legendary_phoenix_heart_mantle.webp",
    "legendary_seraphic_vector_vanes.webp", "legendary_sevenfold_prismatic_aegis.webp", "legendary_star_iron_voidweave.webp",
    "legendary_sunpiercer_void_sails.webp", "legendary_thunder_crown_grounding_spine.webp", "legendary_worldroot_keel_frame.webp"
  ]),
  mythic: new Set([
    "mythic_crown_of_the_ninefold_fortress.webp", "mythic_eternity_worldroot_frame.webp", "mythic_oracle_of_the_last_horizon.webp",
    "mythic_singularity_strain_vault.webp", "mythic_sovereign_concordance_of_five_stations.webp", "mythic_veil_of_the_first_firmament.webp",
    "mythic_wings_of_the_first_dawn.webp", "mythic_worldfire_arkengine_nexus.webp"
  ])
});

const ARKENGINE_FILES = Object.freeze({
  standard: new Set(["pressure-lattice-tuning.webp"]),
  rare: new Set(["pressure-lattice-governor.webp"]),
  epic: new Set(["harmonic-pressure-dynamo.webp"]),
  legendary: new Set(["worldheart-pressure-dynamo.webp"]),
  mythic: new Set(["singularity-worldheart-dynamo.webp"])
});

const SHIP_ALIASES = Object.freeze({
  "merchant-prime-lattice": "merchant_prime_cargo_lattice.webp"
});

function normalizeRarity(value) {
  const rarity = String(value ?? "standard").toLowerCase();
  return MOD_UI_ART.rarity[rarity] ? rarity : "standard";
}

function fileStem(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function shipCandidates(mod, rarity) {
  const id = String(mod?.id ?? mod?.data?.id ?? "");
  const name = String(mod?.name ?? mod?.data?.name ?? "");
  const stems = unique([fileStem(id), fileStem(name)]);
  const alias = SHIP_ALIASES[id];
  const candidates = alias ? [alias] : [];
  for (const stem of stems) {
    candidates.push(`${stem}.webp`);
    candidates.push(`${rarity}_${stem}.webp`);
  }
  return unique(candidates);
}

function arkengineCandidates(mod, rarity) {
  const id = String(mod?.id ?? mod?.data?.id ?? "");
  const name = String(mod?.name ?? mod?.data?.name ?? "");
  const stems = unique([fileStem(id), fileStem(name)]);
  const candidates = [];
  for (const stem of stems) {
    candidates.push(`${stem}.webp`);
    candidates.push(stem.replaceAll("_", "-") + ".webp");
    candidates.push(`${rarity}_${stem}.webp`);
  }
  return unique(candidates);
}

function resolveFrom(files, candidates, base) {
  for (const filename of candidates) {
    if (files?.has(filename)) return { img: `${base}/${filename}`, matched: filename, candidates };
  }
  return { img: null, matched: null, candidates };
}

export function resolveShipModArt(mod) {
  const rarity = normalizeRarity(mod?.data?.rarity ?? mod?.rarity);
  const result = resolveFrom(SHIP_FILES[rarity], shipCandidates(mod, rarity), `${MODULE_ROOT}/ship-mods/${rarity}`);
  return Object.freeze({ ...result, rarity });
}

export function resolveArkengineModArt(mod) {
  const rarity = normalizeRarity(mod?.data?.rarity ?? mod?.rarity);
  const result = resolveFrom(ARKENGINE_FILES[rarity], arkengineCandidates(mod, rarity), `${MODULE_ROOT}/arkengine-mods/${rarity}`);
  return Object.freeze({ ...result, rarity });
}

export function shipModArt(id, rarity = "standard", name = "") {
  return resolveShipModArt({ id, name, data: { rarity } }).img;
}

export function arkengineModArt(id, rarity = "standard", name = "") {
  return resolveArkengineModArt({ id, name, data: { rarity } }).img;
}

export function modArtMetadata(mod, family) {
  const data = mod?.data ?? {};
  const resolved = family === "arkengineMod" ? resolveArkengineModArt(mod) : resolveShipModArt(mod);
  const chained = Boolean(data.upgradeChain);
  return Object.freeze({
    img: resolved.img,
    matched: resolved.matched,
    candidates: Object.freeze([...resolved.candidates]),
    fallback: FALLBACK_MOD_ICON,
    rarityOverlay: MOD_UI_ART.rarity[resolved.rarity],
    chainOverlay: chained ? MOD_UI_ART.chain : null,
    chained
  });
}

export function withModArt(mod, family) {
  const art = modArtMetadata(mod, family);
  return Object.freeze({
    ...mod,
    img: art.img ?? FALLBACK_MOD_ICON,
    data: Object.freeze({
      ...(mod.data ?? {}),
      art
    })
  });
}

export function auditModArt(shipMods = {}, arkengineMods = {}) {
  const inspect = (catalog, family) => Object.values(catalog).map((mod) => {
    const art = modArtMetadata(mod, family);
    return Object.freeze({
      id: mod.id,
      name: mod.name,
      rarity: mod.data?.rarity ?? "standard",
      matched: art.matched,
      img: art.img,
      candidates: art.candidates,
      missing: !art.matched
    });
  });

  const ship = inspect(shipMods, "shipMod");
  const arkengine = inspect(arkengineMods, "arkengineMod");
  return Object.freeze({
    shipModsMissing: Object.freeze(ship.filter((entry) => entry.missing)),
    arkengineModsMissing: Object.freeze(arkengine.filter((entry) => entry.missing)),
    shipModsMatched: ship.filter((entry) => !entry.missing).length,
    arkengineModsMatched: arkengine.filter((entry) => !entry.missing).length,
    totalMatched: [...ship, ...arkengine].filter((entry) => !entry.missing).length
  });
}
