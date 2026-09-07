const SPELL_PACK = "pf2e.spells-srd";

function slug(value) {
  if (globalThis.foundry?.utils?.slugify) return foundry.utils.slugify(String(value ?? ""));
  return String(value ?? "").trim().toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getField(entry, path) {
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(entry, path);
  return path.split(".").reduce((value, key) => value?.[key], entry);
}

function itemLevel(entry) {
  const level = Number(getField(entry, "system.level.value") ?? 0);
  return Number.isFinite(level) ? Math.max(0, level) : 0;
}

function rarity(entry) {
  return String(getField(entry, "system.traits.rarity") ?? "common");
}

function traditions(entry) {
  const values = getField(entry, "system.traits.traditions");
  return Array.isArray(values) ? values : [];
}

function deterministicId(seed) {
  let h1 = 2166136261;
  let h2 = 2246822519;
  for (const ch of String(seed)) {
    h1 ^= ch.charCodeAt(0);
    h1 = Math.imul(h1, 16777619);
    h2 ^= ch.charCodeAt(0) + h1;
    h2 = Math.imul(h2, 3266489917);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}0000000000000000`.slice(0, 16);
}

function embeddedId(seed) {
  return globalThis.foundry?.utils?.randomID ? foundry.utils.randomID(16) : deterministicId(seed);
}

export function selectOfficerSpellCandidates(index, intent) {
  const maxRank = Math.max(1, Math.min(10, Number(intent?.maxRank) || 1));
  const tradition = String(intent?.tradition ?? "");
  const selected = [];
  const used = new Set();

  for (const requested of intent?.candidateSlugs ?? []) {
    const wanted = slug(requested);
    const matches = index
      .filter((entry) => entry.type === "spell")
      .filter((entry) => slug(getField(entry, "system.slug")) === wanted || slug(entry.name) === wanted)
      .filter((entry) => itemLevel(entry) <= maxRank)
      .filter((entry) => {
        const list = traditions(entry);
        return !tradition || !list.length || list.includes(tradition);
      })
      .filter((entry) => !used.has(entry._id))
      .sort((a, b) => {
        const rarityDelta = (rarity(a) === "common" ? 0 : 1) - (rarity(b) === "common" ? 0 : 1);
        if (rarityDelta) return rarityDelta;
        const slugDelta = (slug(getField(a, "system.slug")) === wanted ? 0 : 1) - (slug(getField(b, "system.slug")) === wanted ? 0 : 1);
        if (slugDelta) return slugDelta;
        return itemLevel(a) - itemLevel(b);
      });
    if (!matches.length) continue;
    used.add(matches[0]._id);
    selected.push(matches[0]);
  }

  return selected;
}

function spellSlots(maxRank) {
  const slots = {};
  for (let rank = 0; rank <= 10; rank += 1) {
    const active = rank >= 1 && rank <= maxRank;
    const max = active ? (rank === maxRank ? 2 : 3) : 0;
    slots[`slot${rank}`] = { prepared:[], value:max, max };
  }
  return slots;
}

function spellcastingEntry(intent, id) {
  return {
    _id:id,
    name:`${intent.label ?? "Officer"} Spellcasting`,
    type:"spellcastingEntry",
    system:{
      description:{ value:"<p>Generated Arkflight officer spellcasting using the PF2e NPC benchmark for this creature level.</p>" },
      traits:{ value:[], otherTags:[] },
      ability:{ value:intent.ability ?? "cha" },
      spelldc:{ value:Number(intent.attack) || 0, dc:Number(intent.dc) || 10 },
      tradition:{ value:intent.tradition ?? "occult" },
      prepared:{ value:intent.mode ?? "spontaneous", flexible:false, validItems:null },
      showSlotlessLevels:{ value:false },
      proficiency:{ slug:"", value:0 },
      slots:spellSlots(Math.max(1, Math.min(10, Number(intent.maxRank) || 1))),
      autoHeightenLevel:{ value:null }
    },
    flags:{
      "arkflight-game":{
        generatedOfficerSpellcasting:true,
        station:intent.station ?? null,
        archetype:intent.archetype ?? null,
        actorLevel:intent.actorLevel ?? null,
        maxRank:intent.maxRank ?? null
      }
    }
  };
}

async function spellIndex() {
  const pack = game.packs?.get(SPELL_PACK);
  if (!pack) throw new Error(`PF2e spell compendium ${SPELL_PACK} is unavailable.`);
  const index = await pack.getIndex({ fields:["type","system.slug","system.level.value","system.traits.traditions","system.traits.rarity"] });
  return { pack, index:[...index] };
}

export async function resolveOfficerSpellcasting(intent) {
  if (!intent) return null;
  const { pack, index } = await spellIndex();
  const selected = selectOfficerSpellCandidates(index, intent);
  if (!selected.length) {
    throw new Error(`No legal PF2e ${intent.tradition ?? ""} spells at rank ${intent.maxRank ?? 1} or lower matched generated ${intent.station ?? "officer"} spell list.`);
  }

  const entryId = embeddedId(`${intent.station}:${intent.archetype}:${intent.actorLevel}:spellcasting`);
  const entry = spellcastingEntry(intent, entryId);
  const spells = [];
  for (const candidate of selected) {
    const document = await pack.getDocument(candidate._id);
    if (!document) continue;
    const source = document.toObject();
    if (itemLevel(source) > Number(intent.maxRank ?? 1)) continue;
    source.system ??= {};
    source.system.location ??= {};
    source.system.location.value = entryId;
    source.flags ??= {};
    source.flags["arkflight-game"] = {
      ...(source.flags["arkflight-game"] ?? {}),
      generatedOfficerSpell:true,
      station:intent.station ?? null,
      archetype:intent.archetype ?? null,
      generatedForActorLevel:intent.actorLevel ?? null,
      maxSpellRank:intent.maxRank ?? null
    };
    spells.push(source);
  }

  if (!spells.length) throw new Error(`PF2e spell documents for generated ${intent.station ?? "officer"} could not be materialized.`);
  return Object.freeze({
    entry:Object.freeze(entry),
    spells:Object.freeze(spells.map(Object.freeze)),
    names:Object.freeze(spells.map((spell) => spell.name)),
    state:"resolved"
  });
}

export { SPELL_PACK as PF2E_SPELL_PACK };