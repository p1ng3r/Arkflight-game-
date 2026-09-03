import { ACTIVE_SHIP_MODS } from "../content/ship-mod-catalog.js";
import { ARKENGINE_MODS } from "../content/arkengine-mod-catalog.js";
import { MASTERY_CATALOG } from "../content/base-mastery.js";
import { CREW_EDGE_CARDS } from "../content/crew-edge-cards.js";
import { ARKFLIGHT_EVENTS } from "../content/events/index.js";

const FLAG_SCOPE = "arkflight";
const FLAG_KEY = "compendiumSource";

const PACKS = Object.freeze({
  shipMods: Object.freeze({
    name: "arkflight-ship-mods",
    label: "Arkflight — Ship Mods",
    kind: "ship-mod",
    documentName: "Item"
  }),
  arkengineMods: Object.freeze({
    name: "arkflight-arkengine-mods",
    label: "Arkflight — Arkengine Mods",
    kind: "arkengine-mod",
    documentName: "Item"
  }),
  masteries: Object.freeze({
    name: "arkflight-masteries",
    label: "Arkflight — Masteries",
    kind: "mastery",
    documentName: "Item"
  }),
  crewTactics: Object.freeze({
    name: "arkflight-crew-tactics",
    label: "Arkflight — Crew Tactics",
    kind: "crew-tactic",
    documentName: "Item"
  }),
  events: Object.freeze({
    name: "arkflight-ship-events",
    label: "Arkflight — Ship Events",
    kind: "ship-event",
    documentName: "JournalEntry"
  })
});

const DEFAULT_ITEM_IMAGES = Object.freeze({
  mastery: "icons/svg/upgrade.svg",
  "crew-tactic": "icons/svg/card-joker.svg"
});

function cloneSerializable(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("Arkflight | Could not serialize compendium source", error);
    return {};
  }
}

function stableHash(value) {
  const text = JSON.stringify(cloneSerializable(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labelize(value) {
  return String(value ?? "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactList(value) {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value
    .map((entry) => typeof entry === "string" ? entry : entry?.name ?? entry?.id ?? String(entry))
    .filter(Boolean)
    .join(", ");
}

function detailRows(rows) {
  const visible = rows.filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0));
  if (!visible.length) return "";
  return `<dl>${visible.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(Array.isArray(value) ? compactList(value) : value)}</dd>`).join("")}</dl>`;
}

function article({ eyebrow, title, description, rows = [], extra = "", sourceId }) {
  return `<article class="arkflight-compendium-entry">
    <p><strong>${escapeHtml(eyebrow)}</strong></p>
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    ${detailRows(rows)}
    ${extra}
    <hr>
    <p><small>Arkflight Source ID: <code>${escapeHtml(sourceId)}</code></small></p>
  </article>`;
}

function pf2eRarity(rarity) {
  switch (rarity) {
    case "rare": return "rare";
    case "epic":
    case "legendary":
    case "mythic": return "unique";
    default: return "common";
  }
}

function itemSystem({ id, description, level = 1, rarity = "standard", tags = [], prerequisites = [] }) {
  const otherTags = [...new Set(["arkflight", ...tags].map(slugify).filter(Boolean))];
  return {
    description: { value: description ?? "" },
    rules: [],
    slug: slugify(id),
    level: { value: Math.max(1, Math.min(30, Number(level) || 1)) },
    traits: {
      value: [],
      rarity: pf2eRarity(rarity),
      otherTags
    },
    category: "bonus",
    onlyLevel1: false,
    maxTakable: 1,
    actionType: { value: "passive" },
    actions: { value: null },
    prerequisites: {
      value: prerequisites.filter(Boolean).map((value) => ({ value: String(value) }))
    }
  };
}

function upgradePrerequisites(data) {
  const chain = data?.upgradeChain ?? {};
  const ids = [
    ...(chain.requiresMods ?? []),
    ...(chain.requiresArkengineMods ?? []),
    ...(chain.requiresShipMods ?? [])
  ];
  return ids.map((id) => `Requires ${labelize(id)}`);
}

function modEntry(mod, kind) {
  const source = cloneSerializable(mod);
  const data = source.data ?? {};
  const id = source.id ?? data.id;
  const name = source.name ?? data.name ?? labelize(id);
  const description = source.description ?? data.description ?? "";
  const tags = source.tags ?? data.tags ?? [];
  const rarity = data.rarity ?? source.rarity ?? "standard";
  const level = data.minShipLevel ?? data.level ?? data.tier ?? source.level ?? 1;
  const image = source.img ?? data.art?.img ?? "icons/svg/item-bag.svg";
  return {
    sourceId: id,
    name,
    source,
    documentName: "Item",
    documentData: {
      name,
      type: "feat",
      img: image,
      system: itemSystem({
        id,
        description: article({
          eyebrow: kind === "ship-mod" ? "SHIP MOD" : "ARKENGINE MOD",
          title: name,
          description,
          sourceId: id,
          rows: [
            ["Arkflight Rarity", labelize(rarity)],
            ["Minimum Ship Level", data.minShipLevel],
            ["Refit Tier", data.legacyRefitTier ?? data.tier],
            ["Mod Type", labelize(data.modType ?? data.effectFamily)],
            ["Tags", tags]
          ]
        }),
        level,
        rarity,
        tags: [kind, rarity, ...tags],
        prerequisites: upgradePrerequisites(data)
      })
    }
  };
}

function masteryEntry(mastery) {
  const source = cloneSerializable(mastery);
  const station = source.station ?? String(source.id ?? "").split("-")[0];
  const tier = source.tier ?? "base";
  return {
    sourceId: source.id,
    name: source.name,
    source,
    documentName: "Item",
    documentData: {
      name: source.name,
      type: "feat",
      img: source.img ?? DEFAULT_ITEM_IMAGES.mastery,
      system: itemSystem({
        id: source.id,
        description: article({
          eyebrow: "MASTERY",
          title: source.name,
          description: source.description,
          sourceId: source.id,
          rows: [
            ["Station", labelize(station)],
            ["Tier", labelize(tier)],
            ["Trigger", source.triggerLabel],
            ["Timing", labelize(source.timing)],
            ["Target", labelize(source.target)]
          ]
        }),
        level: tier === "legendary" ? 12 : tier === "specialist" ? 7 : 1,
        rarity: tier === "legendary" ? "legendary" : "standard",
        tags: ["mastery", station, tier]
      })
    }
  };
}

function tacticEntry(tactic) {
  const source = cloneSerializable(tactic);
  const rarity = source.rarity ?? "standard";
  return {
    sourceId: source.id,
    name: source.name,
    source,
    documentName: "Item",
    documentData: {
      name: source.name,
      type: "feat",
      img: source.img ?? DEFAULT_ITEM_IMAGES["crew-tactic"],
      system: itemSystem({
        id: source.id,
        description: article({
          eyebrow: "CREW TACTIC",
          title: source.name,
          description: source.effect,
          sourceId: source.id,
          rows: [
            ["Theater", labelize(source.theater)],
            ["Arkflight Rarity", labelize(rarity)],
            ["Trigger", source.trigger],
            ["Tags", source.tags ?? []]
          ]
        }),
        level: rarity === "rare" ? 5 : 1,
        rarity,
        tags: ["crew-tactic", source.theater, rarity, ...(source.tags ?? [])]
      })
    }
  };
}

function eventEntry(event) {
  const source = cloneSerializable(event);
  const rounds = Array.isArray(source.rounds) ? source.rounds : [];
  const roundHtml = rounds.length
    ? `<h2>Rounds</h2><ol>${rounds.map((round) => `<li><strong>${escapeHtml(round.title ?? round.name ?? round.id)}</strong>${round.situation ? ` — ${escapeHtml(round.situation)}` : ""}</li>`).join("")}</ol>`
    : "";
  const name = source.title ?? source.name ?? labelize(source.id);
  return {
    sourceId: source.id,
    name,
    source,
    documentName: "JournalEntry",
    documentData: {
      name,
      pages: [{
        name: "Overview",
        type: "text",
        text: {
          format: globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1,
          content: article({
            eyebrow: "SHIP EVENT",
            title: name,
            description: source.openingVignette ?? source.description ?? "",
            sourceId: source.id,
            rows: [
              ["Goal", source.goal],
              ["Rounds", rounds.length],
              ["Image", source.image]
            ],
            extra: roundHtml
          })
        }
      }]
    }
  };
}

function desiredContent() {
  return {
    shipMods: Object.values(ACTIVE_SHIP_MODS).map((entry) => modEntry(entry, "ship-mod")),
    arkengineMods: Object.values(ARKENGINE_MODS).map((entry) => modEntry(entry, "arkengine-mod")),
    masteries: Object.values(MASTERY_CATALOG).map(masteryEntry),
    crewTactics: Object.values(CREW_EDGE_CARDS).map(tacticEntry),
    events: Object.values(ARKFLIGHT_EVENTS).map(eventEntry)
  };
}

function managedFlag(document) {
  return document?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null;
}

function packId(pack) {
  return pack?.collection ?? pack?.metadata?.id ?? null;
}

async function ensureWorldPack(definition) {
  const id = `world.${definition.name}`;
  let existing = game.packs.get(id);
  let replacedWrongType = false;

  if (existing && existing.documentName !== definition.documentName) {
    console.warn(`Arkflight | Replacing ${definition.label}: expected ${definition.documentName}, found ${existing.documentName}.`);
    if (typeof existing.deleteCompendium !== "function") throw new Error(`${definition.label} has the wrong document type and cannot be replaced automatically.`);
    await existing.deleteCompendium();
    existing = null;
    replacedWrongType = true;
  }

  if (existing) return { pack: existing, created: false, replacedWrongType };

  const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");

  const pack = await CompendiumClass.createCompendium({
    name: definition.name,
    label: definition.label,
    type: definition.documentName,
    package: "world"
  });
  return { pack, created: true, replacedWrongType };
}

function documentData(packKey, entry) {
  const sourceHash = stableHash({ source: entry.source, documentData: entry.documentData });
  return {
    ...cloneSerializable(entry.documentData),
    flags: {
      ...(entry.documentData?.flags ?? {}),
      [FLAG_SCOPE]: {
        [FLAG_KEY]: {
          managed: true,
          packKey,
          sourceId: entry.sourceId,
          sourceHash,
          source: entry.source
        }
      }
    }
  };
}

function documentClass(documentName) {
  if (documentName === "Item") return CONFIG?.Item?.documentClass ?? globalThis.Item;
  if (documentName === "JournalEntry") return CONFIG?.JournalEntry?.documentClass ?? globalThis.JournalEntry;
  return null;
}

async function syncPack(packKey, definition, entries, { force = false } = {}) {
  const { pack, created: createdPack, replacedWrongType } = await ensureWorldPack(definition);
  const collection = packId(pack);
  if (!collection) throw new Error(`Could not resolve ${definition.label} compendium ID.`);

  const documents = await pack.getDocuments();
  const existingBySource = new Map();
  const stale = [];
  for (const document of documents) {
    const flag = managedFlag(document);
    if (!flag?.managed || flag.packKey !== packKey || !flag.sourceId) continue;
    if (existingBySource.has(flag.sourceId)) stale.push(document.id);
    else existingBySource.set(flag.sourceId, document);
  }

  const desiredIds = new Set(entries.map((entry) => entry.sourceId));
  const creates = [];
  const updates = [];

  for (const entry of entries) {
    const data = documentData(packKey, entry);
    const existing = existingBySource.get(entry.sourceId);
    if (!existing) {
      creates.push(data);
      continue;
    }
    const oldHash = managedFlag(existing)?.sourceHash;
    const newHash = data.flags[FLAG_SCOPE][FLAG_KEY].sourceHash;
    if (force || oldHash !== newHash || existing.name !== data.name) updates.push({ _id: existing.id, ...data });
  }

  for (const [sourceId, document] of existingBySource.entries()) {
    if (!desiredIds.has(sourceId)) stale.push(document.id);
  }

  const DocumentClass = documentClass(definition.documentName);
  if (!DocumentClass?.createDocuments || !DocumentClass?.updateDocuments || !DocumentClass?.deleteDocuments) {
    throw new Error(`Foundry ${definition.documentName} document API is unavailable.`);
  }

  if (creates.length) await DocumentClass.createDocuments(creates, { pack: collection });
  if (updates.length) await DocumentClass.updateDocuments(updates, { pack: collection });
  if (stale.length) await DocumentClass.deleteDocuments([...new Set(stale)], { pack: collection });

  return {
    pack: collection,
    label: definition.label,
    documentName: definition.documentName,
    createdPack,
    replacedWrongType,
    created: creates.length,
    updated: updates.length,
    deleted: [...new Set(stale)].length,
    total: entries.length
  };
}

async function syncAll({ force = false, notify = true } = {}) {
  if (!game.user?.isGM) return [];

  const content = desiredContent();
  const results = [];
  for (const [packKey, definition] of Object.entries(PACKS)) {
    results.push(await syncPack(packKey, definition, content[packKey] ?? [], { force }));
  }

  const changed = results.some((result) => result.createdPack || result.replacedWrongType || result.created || result.updated || result.deleted);
  if (notify && changed) {
    const total = results.reduce((sum, result) => sum + result.total, 0);
    const replaced = results.filter((result) => result.replacedWrongType).length;
    const suffix = replaced ? ` Rebuilt ${replaced} pack${replaced === 1 ? "" : "s"} with the correct document type.` : "";
    ui.notifications?.info?.(`Arkflight compendiums synced: ${total} managed entries across ${results.length} packs.${suffix}`);
  }
  console.info("Arkflight | Compendium sync complete", results);
  return results;
}

function status() {
  return Object.fromEntries(Object.entries(PACKS).map(([key, definition]) => {
    const pack = game.packs.get(`world.${definition.name}`);
    return [key, {
      id: pack?.collection ?? `world.${definition.name}`,
      label: definition.label,
      expectedDocumentName: definition.documentName,
      documentName: pack?.documentName ?? null,
      correctType: Boolean(pack && pack.documentName === definition.documentName),
      exists: Boolean(pack),
      indexedEntries: pack?.index?.size ?? 0
    }];
  }));
}

function open(packKey) {
  const definition = PACKS[packKey];
  if (!definition) throw new Error(`Unknown Arkflight compendium key: ${packKey}`);
  const pack = game.packs.get(`world.${definition.name}`);
  if (!pack) throw new Error(`${definition.label} does not exist yet.`);
  return pack.render(true);
}

Hooks.once("ready", async () => {
  game.arkflight ??= {};
  game.arkflight.compendiums = {
    definitions: PACKS,
    sync: (options = {}) => syncAll(options),
    rebuild: () => syncAll({ force: true, notify: true }),
    status,
    open
  };

  if (!game.user?.isGM) return;
  try {
    await syncAll({ notify: true });
  } catch (error) {
    console.error("Arkflight | Compendium bootstrap failed", error);
    ui.notifications?.error?.(`Arkflight compendiums could not be synchronized: ${error.message}`);
  }
});
