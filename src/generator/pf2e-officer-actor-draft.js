import { generatePF2eOfficerBenchmark, stationRole } from "./pf2e-officer-generator.js";
import { ayerstoneFaction } from "./ayerstone-setting-catalog.js";

const GIVEN = Object.freeze([
  "Alden", "Brenna", "Cassian", "Dara", "Edrin", "Fara", "Garrick", "Hessa", "Ilyra", "Joren",
  "Kael", "Liora", "Marek", "Nessa", "Orin", "Petra", "Quill", "Ressa", "Soren", "Tamsin",
  "Ulric", "Veyra", "Wren", "Ysra", "Zarek"
]);

const SURNAMES = Object.freeze([
  "Ashwake", "Blackreef", "Brasshand", "Cinderwake", "Deepwell", "Farstar", "Glassward", "Ironmark",
  "Kestrel", "Lantern", "Mournwind", "Nightglass", "Rook", "Stormbough", "Tideborn", "Voidmere"
]);

const PERSONALITIES = Object.freeze({
  captain: ["measured and authoritative", "warm until challenged", "grimly practical", "recklessly charismatic"],
  engineer: ["methodical and grease-stained", "dryly sarcastic", "restless and inventive", "quietly obsessive"],
  navigator: ["distant and observant", "calm under impossible pressure", "superstitious but precise", "curious to a fault"],
  watchmaster: ["vigilant and severe", "competitive and blunt", "patiently predatory", "protective of the deck crew"],
  veilwarden: ["soft-spoken and intense", "ritual-minded and compassionate", "eerie but reassuring", "sternly devotional"]
});

const VISUALS = Object.freeze({
  captain: ["weathered command coat with brass clasps", "dark naval coat and scarred leather gloves", "ornate sash over practical voidfaring leathers"],
  engineer: ["heavy apron, brass tools, and aether-burn scars", "patched work coat with copper fittings", "blackened gloves and a belt crowded with gauges"],
  navigator: ["layered chart-cloth coat and star lenses", "long coat stitched with route sigils", "slender voidfaring leathers hung with brass instruments"],
  watchmaster: ["reinforced coat with a shoulder spyglass", "scarred brigandine and a compact ranged weapon", "dark watch cloak over practical battle gear"],
  veilwarden: ["warded robes reinforced with shipboard leathers", "dark vestments with pale aetherite charms", "ritual coat marked with protective silver-white sigils"]
});

const HOOKS = Object.freeze({
  captain: ["will abandon profit before abandoning crew", "owes a dangerous favor to a rival captain", "keeps a sealed order no one else has read"],
  engineer: ["claims the Arkengine speaks in its sleep", "is hiding a serious flaw in the drive", "collects broken enemy mechanisms as trophies"],
  navigator: ["refuses to cross one particular void route", "has charted a shortcut no sane pilot uses", "believes the ship is being followed by a star that moves wrong"],
  watchmaster: ["keeps a private list of every vessel they failed to stop", "suspects a crew member is a spy", "never fires the first shot without a reason"],
  veilwarden: ["has heard a voice beyond the Lifeveil", "maintains a forbidden secondary ward", "believes the ship carries a spiritual debt"]
});

const SIGNATURE_GEAR = Object.freeze({
  captain: { category: "weapon", query: "saber OR rapier", label: "officer saber", abstractSecondary: "command pistol or dagger" },
  engineer: { category: "weapon", query: "warhammer OR light hammer", label: "engineer's hammer", abstractSecondary: "aetheric discharge" },
  navigator: { category: "weapon", query: "rapier OR shortsword", label: "navigator's blade", abstractSecondary: "precision sidearm" },
  watchmaster: { category: "weapon", query: "crossbow OR longbow", label: "watchmaster ranged weapon", abstractSecondary: "boarding blade" },
  veilwarden: { category: "weapon", query: "staff OR mace", label: "ritual staff", abstractSecondary: "aetheric surge" }
});

function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rngFor(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(rng, values) { return values[Math.floor(rng() * values.length)]; }
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function biography({ station, faction, theme, seed }) {
  const rng = rngFor(`${seed}:${station}:identity`);
  const factionProfile = ayerstoneFaction(faction);
  const ancestry = choose(rng, factionProfile.ancestries);
  const name = `${choose(rng, GIVEN)} ${choose(rng, SURNAMES)}`;
  const personality = choose(rng, PERSONALITIES[station]);
  const visual = choose(rng, VISUALS[station]);
  const hook = choose(rng, HOOKS[station]);
  return Object.freeze({
    name,
    ancestry,
    personality,
    visual,
    hook,
    faction: factionProfile.label,
    factionSource: factionProfile.source,
    factionTone: factionProfile.crewTone,
    theme: theme || "",
    summary: `${ancestry} ${titleCase(station)} of ${factionProfile.label}; ${personality}. ${hook}.`
  });
}

function skillSources(skills) {
  return Object.fromEntries(Object.entries(skills).map(([slug, value]) => [slug, { base: value, value, mod: value } ]));
}

function abilityItems(benchmark) {
  return benchmark.abilities.map((ability) => ({
    name: ability.name,
    type: "action",
    system: {
      actionType: { value: "action" },
      actions: { value: ability.actionCost },
      category: null,
      description: { value: `<p>${ability.summary}</p>` },
      traits: { value: [] }
    },
    flags: { "arkflight-game": { generatedOfficerAbility: ability.id, station: benchmark.station } }
  }));
}

function abstractStrikeItem(benchmark, gear) {
  return {
    name: `${gear.label} strike`,
    type: "melee",
    system: {
      attackEffects: { value: [] },
      bonus: { value: benchmark.statistics.strike.attack },
      damageRolls: { primary: { damage: benchmark.statistics.strike.damage, damageType: "physical" } },
      traits: { value: benchmark.station === "watchmaster" ? ["range-increment-60"] : [] },
      description: `<p>Generated Arkflight officer strike. Signature physical item is resolved from PF2e compendia at Commit.</p>`
    },
    flags: { "arkflight-game": { generatedAbstractStrike: true, station: benchmark.station } }
  };
}

function actorSourceDraft(benchmark, bio, gear) {
  const saves = benchmark.statistics.saves;
  const skills = skillSources(benchmark.statistics.skills);
  return {
    name: bio.name,
    type: "npc",
    img: "icons/svg/mystery-man.svg",
    system: {
      details: {
        level: { value: benchmark.level },
        alliance: null,
        publicNotes: `<p><strong>${bio.ancestry} ${benchmark.role} — ${bio.faction}</strong></p><p>${bio.visual}. ${bio.personality}. ${bio.hook}.</p>`,
        privateNotes: `<p>Ayerstone faction source: ${bio.factionSource}</p><p>Faction tone: ${bio.factionTone}</p><p>${bio.theme}</p>`
      },
      traits: { value: ["humanoid"], rarity: "common", size: { value: "med" }, languages: { value: ["common"], custom: "" } },
      attributes: {
        ac: { value: benchmark.statistics.ac, details: "Arkflight generated benchmark" },
        hp: { value: benchmark.statistics.hp, max: benchmark.statistics.hp, temp: 0, details: "Arkflight generated benchmark" },
        speed: { value: 25, otherSpeeds: [] }
      },
      perception: { mod: benchmark.statistics.perception, senses: [], details: "Arkflight generated benchmark" },
      saves: {
        fortitude: { value: saves.fortitude, saveDetail: "Arkflight generated benchmark" },
        reflex: { value: saves.reflex, saveDetail: "Arkflight generated benchmark" },
        will: { value: saves.will, saveDetail: "Arkflight generated benchmark" }
      },
      skills,
      initiative: { statistic: "perception" }
    },
    items: [abstractStrikeItem(benchmark, gear), ...abilityItems(benchmark)],
    flags: {
      "arkflight-game": {
        generatedOfficer: true,
        station: benchmark.station,
        quality: benchmark.quality,
        ancestry: bio.ancestry,
        faction: bio.faction,
        factionSource: bio.factionSource,
        personality: bio.personality,
        visual: bio.visual,
        hook: bio.hook,
        signatureGearIntent: gear
      }
    }
  };
}

export function generatePF2eOfficerActorDraft({ station, level, quality = "standard", faction = "Independent", theme = "", seed = Date.now() } = {}) {
  const benchmark = generatePF2eOfficerBenchmark({ station, level, quality });
  stationRole(station);
  const bio = biography({ station, faction, theme, seed });
  const gear = SIGNATURE_GEAR[station];
  const actorData = actorSourceDraft(benchmark, bio, gear);
  return Object.freeze({
    ...benchmark,
    name: bio.name,
    ancestry: bio.ancestry,
    personality: bio.personality,
    visual: bio.visual,
    hook: bio.hook,
    biography: bio,
    signatureGear: Object.freeze({ ...gear, lootableByDefault: true, recoveryPolicy: "profile-and-quality", state: "compendium-resolution-pending" }),
    abstractSecondary: gear.abstractSecondary,
    actorData: Object.freeze(actorData),
    generationState: "actor-draft-complete"
  });
}

export const PF2E_OFFICER_SIGNATURE_GEAR = SIGNATURE_GEAR;
