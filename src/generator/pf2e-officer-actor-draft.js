import { generatePF2eOfficerBenchmark } from "./pf2e-officer-generator.js";
import { ayerstoneFaction } from "./ayerstone-setting-catalog.js";
import { chooseOfficerArchetype, maxSpellRankForOfficer } from "./officer-archetypes.js";

const GIVEN = Object.freeze([
  "Alden","Brenna","Cassian","Dara","Edrin","Fara","Garrick","Hessa","Ilyra","Joren","Kael","Liora","Marek","Nessa","Orin","Petra",
  "Quill","Ressa","Soren","Tamsin","Ulric","Veyra","Wren","Ysra","Zarek","Ansel","Briala","Corven","Delia","Emric","Fenn","Greta",
  "Halden","Isolde","Jessa","Korin","Lysa","Merrick","Nira","Orren","Perrin","Riona","Stellan","Tavra","Ulla","Varik","Willa","Yoren",
  "Zella","Arven","Bellis","Cador","Dessa","Evran","Fiora","Galen","Harkin","Ivara","Joric","Kessa","Lorcan","Mira","Nolan","Pyria"
]);

const SURNAMES = Object.freeze([
  "Ashwake","Blackreef","Brasshand","Cinderwake","Deepwell","Farstar","Glassward","Ironmark","Kestrel","Lantern","Mournwind","Nightglass","Rook","Stormbough","Tideborn","Voidmere",
  "Amberwake","Brightkeel","Coldharbor","Coppervein","Duskfall","Emberline","Frostwake","Gloamward","Gravesail","Hollowstar","Ironwake","Keelborn","Mistvale","Northglass","Oathmere","Paleharbor",
  "Quickwater","Redwake","Saltmere","Shatterglass","Silverkeel","Starfall","Stormmark","Thornwake","Valeward","Westreach","Whitewake","Windmere","Wyrmglass","Yellowstar","Blackwake","Goldreef"
]);

const PERSONALITIES = Object.freeze({
  captain: ["measured and authoritative","warm until challenged","grimly practical","recklessly charismatic","patient and politically sharp","quietly intimidating"],
  engineer: ["methodical and grease-stained","dryly sarcastic","restless and inventive","quietly obsessive","cheerful around dangerous machinery","suspicious of untested repairs"],
  navigator: ["distant and observant","calm under impossible pressure","superstitious but precise","curious to a fault","restless when stationary","soft-spoken and intensely focused"],
  battlewatch: ["vigilant and severe","competitive and blunt","patiently predatory","protective of the deck crew","coldly analytical under fire","boisterous until battle begins"],
  veilwarden: ["soft-spoken and intense","ritual-minded and compassionate","eerie but reassuring","sternly devotional","philosophical about danger","unflappable around the uncanny"]
});

const VISUALS = Object.freeze({
  captain: ["weathered command coat with brass clasps","dark naval coat and scarred leather gloves","ornate sash over practical voidfaring leathers","high-collared officer coat with a battered signal whistle"],
  engineer: ["heavy apron, brass tools, and aether-burn scars","patched work coat with copper fittings","blackened gloves and a belt crowded with gauges","reinforced sleeves marked by old chemical and arcane burns"],
  navigator: ["layered chart-cloth coat and star lenses","long coat stitched with route sigils","slender voidfaring leathers hung with brass instruments","weathered cloak pinned with a folding astrolabe"],
  battlewatch: ["reinforced coat with a shoulder spyglass","scarred brigandine and a compact ranged weapon","dark watch cloak over practical battle gear","heavy firing gloves and a bandolier of signal markers"],
  veilwarden: ["warded robes reinforced with shipboard leathers","dark vestments with pale aetherite charms","ritual coat marked with protective silver-white sigils","layered ritual cloth beneath a practical armored coat"]
});

const HOOKS = Object.freeze({
  captain: ["will abandon profit before abandoning crew","owes a dangerous favor to a rival captain","keeps a sealed order no one else has read","secretly intends to retire after one final voyage"],
  engineer: ["claims the Arkengine speaks in its sleep","is hiding a serious flaw in the drive","collects broken enemy mechanisms as trophies","has rebuilt the same lucky tool three times"],
  navigator: ["refuses to cross one particular void route","has charted a shortcut no sane pilot uses","believes the ship is being followed by a star that moves wrong","keeps a private map of routes that officially do not exist"],
  battlewatch: ["keeps a private list of every vessel they failed to stop","suspects a crew member is a spy","never fires the first shot without a reason","records every confirmed hit in a tiny brass ledger"],
  veilwarden: ["has heard a voice beyond the Lifeveil","maintains a forbidden secondary ward","believes the ship carries a spiritual debt","recognizes an omen aboard the ship but refuses to explain it"]
});

const SIGNATURE_GEAR = Object.freeze({
  captain: { category:"weapon", query:"saber OR rapier", label:"officer saber", abstractSecondary:"command sidearm" },
  engineer: { category:"weapon", query:"warhammer OR light hammer", label:"engineer's hammer", abstractSecondary:"aetheric discharge" },
  navigator: { category:"weapon", query:"rapier OR shortsword", label:"navigator's blade", abstractSecondary:"precision sidearm" },
  battlewatch: { category:"weapon", query:"crossbow OR longbow", label:"battlewatch ranged weapon", abstractSecondary:"boarding blade" },
  veilwarden: { category:"weapon", query:"staff OR mace", label:"ritual staff", abstractSecondary:"aetheric surge" }
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

export function generatedOfficerName({ rosterSeed="arkflight", rosterIndex=0 }={}) {
  const ordinal = Math.max(0, Number(rosterIndex) || 0);
  const givenIndex = (hashSeed(`${rosterSeed}:given-roster`) + ordinal * 37) % GIVEN.length;
  const surnameIndex = (hashSeed(`${rosterSeed}:surname-roster`) + ordinal * 29) % SURNAMES.length;
  return `${GIVEN[givenIndex]} ${SURNAMES[surnameIndex]}`;
}

function biography({ station, faction, theme, seed, rosterSeed, rosterIndex }) {
  const rng = rngFor(`${seed}:${station}:identity`);
  const factionProfile = ayerstoneFaction(faction);
  const ancestry = choose(rng, factionProfile.ancestries);
  const name = generatedOfficerName({ rosterSeed, rosterIndex });
  const personality = choose(rng, PERSONALITIES[station]);
  const visual = choose(rng, VISUALS[station]);
  const hook = choose(rng, HOOKS[station]);
  return Object.freeze({
    name, ancestry, personality, visual, hook,
    faction:factionProfile.label,
    factionSource:factionProfile.source,
    factionTone:factionProfile.crewTone,
    theme:theme || "",
    summary:`${ancestry} ${titleCase(station)} of ${factionProfile.label}; ${personality}. ${hook}.`
  });
}

function enrichedSkills(benchmark, archetype) {
  const skills = { ...(benchmark.statistics.skills ?? {}) };
  const existing = Object.values(skills).map(Number).filter(Number.isFinite);
  const high = existing.length ? Math.max(...existing) : benchmark.statistics.perception;
  const moderate = Math.max(1, high - 2);
  for (const [index, skill] of (archetype.skills ?? []).entries()) {
    if (skill === "perception") continue;
    skills[skill] = Math.max(Number(skills[skill] ?? 0), index === 0 ? high : moderate);
  }
  return skills;
}

function skillSources(skills) {
  return Object.fromEntries(Object.entries(skills).map(([slug, value]) => [slug, { base:value, value, mod:value }]));
}

function actionItem(ability, station, extraFlags={}) {
  return {
    name:ability.name,
    type:"action",
    system:{
      actionType:{ value:"action" },
      actions:{ value:ability.actionCost },
      category:null,
      description:{ value:`<p>${ability.summary}</p>` },
      traits:{ value:[] }
    },
    flags:{ "arkflight-game":{ generatedOfficerAbility:ability.id, station, ...extraFlags } }
  };
}

function abilityItems(benchmark, archetype) {
  return [
    ...benchmark.abilities.map((ability) => actionItem(ability, benchmark.station)),
    actionItem(archetype.ability, benchmark.station, { generatedArchetypeAbility:archetype.id })
  ];
}

function profileItem(benchmark, archetype, skills) {
  const s = benchmark.statistics;
  const skillText = Object.entries(skills).map(([name, value]) => `${titleCase(name)} +${value}`).join(", ");
  const spellText = benchmark.statistics.spellcasting
    ? `<p><strong>Spell DC</strong> ${s.spellcasting.dc}; <strong>spell attack</strong> +${s.spellcasting.attack}.</p>`
    : "";
  return {
    name:`${archetype.label} Officer Profile`,
    type:"action",
    system:{
      actionType:{ value:"passive" },
      actions:{ value:null },
      category:null,
      description:{ value:`<p><strong>${benchmark.role} — ${archetype.label}</strong></p><p>AC ${s.ac}; HP ${s.hp}; Perception +${s.perception}; Fort +${s.saves.fortitude}, Ref +${s.saves.reflex}, Will +${s.saves.will}.</p><p><strong>Skills</strong> ${skillText}.</p>${spellText}` },
      traits:{ value:[] }
    },
    flags:{ "arkflight-game":{ generatedOfficerProfile:true, station:benchmark.station, archetype:archetype.id } }
  };
}

function strikeItem({ name, benchmark, ranged=false, attackPenalty=0, damageType="physical", secondary=false }) {
  const traits = ranged ? [benchmark.station === "battlewatch" ? "range-increment-60" : "range-increment-30"] : [];
  return {
    name,
    type:"melee",
    system:{
      attackEffects:{ value:[] },
      bonus:{ value:Math.max(0, benchmark.statistics.strike.attack - attackPenalty) },
      damageRolls:{ primary:{ damage:benchmark.statistics.strike.damage, damageType } },
      traits:{ value:traits },
      description:`<p>Generated Arkflight ${secondary ? "secondary" : "primary"} NPC strike using the officer's creature benchmark.</p>`
    },
    flags:{ "arkflight-game":{ generatedAbstractStrike:true, secondary, station:benchmark.station } }
  };
}

function strikeItems(benchmark, gear) {
  const primaryRanged = benchmark.station === "battlewatch";
  const secondaryRanged = benchmark.station !== "battlewatch";
  const secondaryDamageType = ["engineer","veilwarden"].includes(benchmark.station) ? "force" : "physical";
  return [
    strikeItem({ name:`${gear.label} strike`, benchmark, ranged:primaryRanged }),
    strikeItem({ name:gear.abstractSecondary, benchmark, ranged:secondaryRanged, attackPenalty:2, damageType:secondaryDamageType, secondary:true })
  ];
}

function spellcastingIntent(benchmark, archetype) {
  if (!archetype.spellcasting) return null;
  return Object.freeze({
    archetype:archetype.id,
    label:archetype.label,
    station:benchmark.station,
    actorLevel:benchmark.level,
    maxRank:maxSpellRankForOfficer(benchmark.level),
    dc:benchmark.statistics.spellcasting?.dc ?? 10 + benchmark.level + 4,
    attack:benchmark.statistics.spellcasting?.attack ?? benchmark.statistics.strike.attack,
    tradition:archetype.spellcasting.tradition,
    ability:archetype.spellcasting.ability,
    mode:archetype.spellcasting.mode,
    candidateSlugs:Object.freeze([...archetype.spellcasting.spells])
  });
}

function actorSourceDraft(benchmark, bio, gear, archetype, spellIntent) {
  const saves = benchmark.statistics.saves;
  const skills = enrichedSkills(benchmark, archetype);
  const archetypeLine = `${bio.ancestry} ${benchmark.role} — ${archetype.label} profile — ${bio.faction}`;
  return {
    name:bio.name,
    type:"npc",
    img:"icons/svg/mystery-man.svg",
    system:{
      details:{
        level:{ value:benchmark.level },
        alliance:null,
        publicNotes:`<p><strong>${archetypeLine}</strong></p><p>${bio.visual}. ${bio.personality}. ${bio.hook}.</p>`,
        privateNotes:`<p>Ayerstone faction source: ${bio.factionSource}</p><p>Faction tone: ${bio.factionTone}</p><p>${bio.theme}</p>`
      },
      traits:{ value:["humanoid"], rarity:"common", size:{ value:"med" }, languages:{ value:["common"], custom:"" } },
      attributes:{
        ac:{ value:benchmark.statistics.ac, details:`Arkflight ${archetype.label} benchmark` },
        hp:{ value:benchmark.statistics.hp, max:benchmark.statistics.hp, temp:0, details:`Arkflight ${archetype.label} benchmark` },
        speed:{ value:archetype.speed ?? 25, otherSpeeds:[] }
      },
      perception:{ mod:benchmark.statistics.perception, senses:[], details:`Arkflight ${benchmark.role} benchmark` },
      saves:{
        fortitude:{ value:saves.fortitude, saveDetail:`Arkflight ${archetype.label} benchmark` },
        reflex:{ value:saves.reflex, saveDetail:`Arkflight ${archetype.label} benchmark` },
        will:{ value:saves.will, saveDetail:`Arkflight ${archetype.label} benchmark` }
      },
      skills:skillSources(skills),
      initiative:{ statistic:"perception" }
    },
    items:[profileItem(benchmark, archetype, skills), ...strikeItems(benchmark, gear), ...abilityItems(benchmark, archetype)],
    flags:{
      "arkflight-game":{
        generatedOfficer:true,
        station:benchmark.station,
        quality:benchmark.quality,
        ancestry:bio.ancestry,
        faction:bio.faction,
        factionSource:bio.factionSource,
        personality:bio.personality,
        visual:bio.visual,
        hook:bio.hook,
        combatArchetype:{ id:archetype.id, label:archetype.label, classFamily:archetype.classFamily },
        spellcastingIntent:spellIntent,
        signatureGearIntent:gear
      }
    }
  };
}

export function generatePF2eOfficerActorDraft({ station, level, quality="standard", faction="Independent", theme="", seed=Date.now(), rosterSeed=seed, rosterIndex=0 }={}) {
  const benchmarkStation = station === "battlewatch" ? "watchmaster" : station;
  const legacyBenchmark = generatePF2eOfficerBenchmark({ station:benchmarkStation, level, quality });
  const archetype = chooseOfficerArchetype({ station, seed:rosterSeed, rosterIndex });
  const benchmark = Object.freeze({
    ...legacyBenchmark,
    station,
    role:station === "battlewatch" ? "Battlewatch" : legacyBenchmark.role,
    statistics:Object.freeze({
      ...legacyBenchmark.statistics,
      spellcasting:archetype.spellcasting
        ? (legacyBenchmark.statistics.spellcasting ?? Object.freeze({ dc:10 + legacyBenchmark.level + 4, attack:legacyBenchmark.statistics.strike.attack, tradition:archetype.spellcasting.tradition }))
        : null
    })
  });
  const bio = biography({ station, faction, theme, seed, rosterSeed, rosterIndex });
  const gear = SIGNATURE_GEAR[station];
  const spellIntent = spellcastingIntent(benchmark, archetype);
  const actorData = actorSourceDraft(benchmark, bio, gear, archetype, spellIntent);
  return Object.freeze({
    ...benchmark,
    name:bio.name,
    ancestry:bio.ancestry,
    personality:bio.personality,
    visual:bio.visual,
    hook:bio.hook,
    biography:bio,
    combatArchetype:Object.freeze({ id:archetype.id, label:archetype.label, classFamily:archetype.classFamily }),
    spellcastingIntent:spellIntent,
    signatureGear:Object.freeze({ ...gear, lootableByDefault:true, recoveryPolicy:"profile-and-quality", state:"compendium-resolution-pending" }),
    abstractSecondary:gear.abstractSecondary,
    actorData:Object.freeze(actorData),
    generationState:"actor-draft-complete"
  });
}

export const PF2E_OFFICER_SIGNATURE_GEAR = SIGNATURE_GEAR;