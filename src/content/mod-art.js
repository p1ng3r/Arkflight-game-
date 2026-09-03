const MODULE_ROOT = "modules/arkflight-game/assets/icons";

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

const SHIP_ART_IDS = Object.freeze({
  standard: new Set([
    "aether-crystal-capacitor",
    "aether-vent-conduit",
    "auxiliary-veil-capacitors",
    "cargo-netting",
    "counterweight-rigging",
    "crew-muster-bell-network",
    "crystal-lens-optic",
    "detection-spire",
    "distributed-strain-dampeners",
    "docking-claw-system",
    "emergency-repair-lockers",
    "enchanted-compass",
    "expanded-lifeveil-array",
    "firebreak-plating",
    "gyroscopic-stabilizer",
    "longwatch-lookout-platform",
    "propulsion-stabilization-fins",
    "reinforced-bulkhead-network",
    "reinforced-docking-framework",
    "reinforced-hull-plating",
    "reinforced-maneuvering-fins",
    "runed-bulkhead-seal",
    "stormgrounding-mesh",
    "trim-sail-regulators",
    "veil-warded-bulkheads",
    "void-sail-weave",
    "void-scout-observation-spire"
  ]),
  rare: new Set([
    "ablative-iron-sheathing",
    "aether-bound-ribbing",
    "battleline-signal-array",
    "battlewake-control-fins",
    "battlewatch-scrying-crown",
    "crew-cohesion-network",
    "deep-void-armor-web",
    "grounded-conduit-bus",
    "merchant-prime-cargo-lattice",
    "precision-helm-relays",
    "salvage-winch-clusters",
    "stormglass-firebreak-shell",
    "stormproof-void-sails",
    "veil-harmonic-capacitors",
    "veil-resonance-relay"
  ]),
  epic: new Set([
    "aetheric-load-balancer",
    "battlewake-vector-vanes",
    "battlewatch-augury-array",
    "black-tide-racing-sails",
    "captains-war-command-net",
    "citadel-bulkhead-grid",
    "emergency-reconstruction-bays",
    "fleet-command-concordance",
    "grand-salvage-foundry",
    "harmonic-strain-reservoir",
    "living-adamant-frame",
    "oracle-helm-assembly",
    "phoenix-firebreak-mantle",
    "prismatic-veil-refractors",
    "stormheart-grounding-spine",
    "veil-citadel-projector",
    "void-hunter-prow",
    "voidbone-armor-weave"
  ]),
  legendary: new Set([
    "admirals-living-command-web",
    "aegis-of-the-star-sea",
    "all-seeing-battlewatch-oracle",
    "arkengine-sovereign-distribution-grid",
    "fatesight-helm",
    "fortress-of-nine-bulkheads",
    "grand-fleet-concordance",
    "leviathan-salvage-foundry",
    "phoenix-heart-mantle",
    "seraphic-vector-vanes",
    "sevenfold-prismatic-aegis",
    "star-iron-voidweave",
    "sunpiercer-void-sails",
    "thunder-crown-grounding-spine",
    "worldroot-keel-frame"
  ]),
  mythic: new Set([
    "crown-of-the-ninefold-fortress",
    "eternity-worldroot-frame",
    "oracle-of-the-last-horizon",
    "singularity-strain-vault",
    "sovereign-concordance-of-five-stations",
    "veil-of-the-first-firmament",
    "wings-of-the-first-dawn",
    "worldfire-arkengine-nexus"
  ])
});

const ARKENGINE_ART = Object.freeze({
  "pressure-lattice-tuning": `${MODULE_ROOT}/arkengine-mods/standard/pressure-lattice-tuning.webp`,
  "pressure-lattice-governor": `${MODULE_ROOT}/arkengine-mods/rare/pressure-lattice-governor.webp`,
  "harmonic-pressure-dynamo": `${MODULE_ROOT}/arkengine-mods/epic/harmonic-pressure-dynamo.webp`,
  "worldheart-pressure-dynamo": `${MODULE_ROOT}/arkengine-mods/legendary/worldheart-pressure-dynamo.webp`,
  "singularity-worldheart-dynamo": `${MODULE_ROOT}/arkengine-mods/mythic/singularity-worldheart-dynamo.webp`
});

function normalizeRarity(rarity) {
  return MOD_UI_ART.rarity[rarity] ? rarity : "standard";
}

function shipFilename(id, rarity) {
  const stem = String(id).replaceAll("-", "_");
  if (rarity === "legendary" || rarity === "mythic") return `${rarity}_${stem}.webp`;
  return `${stem}.webp`;
}

export function shipModArt(id, rarity = "standard") {
  const tier = normalizeRarity(rarity);
  if (!SHIP_ART_IDS[tier]?.has(id)) return null;
  return `${MODULE_ROOT}/ship-mods/${tier}/${shipFilename(id, tier)}`;
}

export function arkengineModArt(id) {
  return ARKENGINE_ART[id] ?? null;
}

export function modArtMetadata(mod, family) {
  const data = mod?.data ?? {};
  const rarity = normalizeRarity(data.rarity ?? mod?.rarity ?? "standard");
  const id = mod?.id ?? data.id;
  const img = family === "arkengineMod" ? arkengineModArt(id) : shipModArt(id, rarity);
  const chained = Boolean(data.upgradeChain);
  return Object.freeze({
    img,
    rarityOverlay: MOD_UI_ART.rarity[rarity],
    chainOverlay: chained ? MOD_UI_ART.chain : null,
    chained
  });
}

export function withModArt(mod, family) {
  const art = modArtMetadata(mod, family);
  return Object.freeze({
    ...mod,
    ...(art.img ? { img: art.img } : {}),
    data: Object.freeze({
      ...(mod.data ?? {}),
      art
    })
  });
}
