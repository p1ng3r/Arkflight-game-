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
    kind: "ship-mod"
  }),
  arkengineMods: Object.freeze({
    name: "arkflight-arkengine-mods",
    label: "Arkflight — Arkengine Mods",
    kind: "arkengine-mod"
  }),
  masteries: Object.freeze({
    name: "arkflight-masteries",
    label: "Arkflight — Masteries",
    kind: "mastery"
  }),
  crewTactics: Object.freeze({
    name: "arkflight-crew-tactics",
    label: "Arkflight — Crew Tactics",
    kind: "crew-tactic"
  }),
  events: Object.freeze({
    name: "arkflight-ship-events",
    label: "Arkflight — Ship Events",
    kind: "ship-event"
  })
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

function compactList(value) {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value.map((entry) => typeof entry === "string" ? entry : entry?.name ?? entry?.id ?? String(entry)).filter(Boolean).join(", ");
}

function detailRows(rows) {
  const visible = rows.filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0));
  if (!visible.length) return "";
  return `<dl>${visible.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(Array.isArray(value) ? compactList(value) : value)}</dd>`).join("")}</dl>`;
}

function journalArticle({ eyebrow, title, description, rows = [], extra = "", sourceId }) {
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

function modEntry(mod, kind) {
  const source = cloneSerializable(mod);
  const data = source.data ?? source;
  const id = source.id ?? data.id;
  const name = source.name ?? data.name ?? labelize(id);
  const description = source.description ?? data.description ?? "";
  const tags = source.tags ?? data.tags ?? [];
  const rarity = data.rarity ?? source.rarity ?? "standard";
  return {
    sourceId: id,
    name,
    source,
    html: journalArticle({
      eyebrow: kind === "ship-mod" ? "SHIP MOD" : "ARKENGINE MOD",
      title: name,
      description,
      sourceId: id,
      rows: [
        ["Rarity", labelize(rarity)],
        ["Level / Tier", data.level ?? data.tier ?? source.level ?? source.tier],
        ["Slot", data.slotClass ?? data.slot ?? source.slotClass ?? source.slot],
        ["Tags", tags]
      ]
    })
  };
}

function masteryEntry(mastery) {
  const source = cloneSerializable(mastery);
  const station = source.station ?? String(source.id ?? "").split("-")[0];
  return {
    sourceId: source.id,
    name: source.name,
    source,
    html: journalArticle({
      eyebrow: "MASTERY",
      title: source.name,
      description: source.description,
      sourceId: source.id,
      rows: [
        ["Station", labelize(station)],
        ["Tier", labelize(source.tier ?? "base")],
        ["Trigger", source.triggerLabel],
        ["Timing", labelize(source.timing)],
        ["Target", labelize(source.target)]
      ]
    })
  };
}

function tacticEntry(tactic) {
  const source = cloneSerializable(tactic);
  return {
    sourceId: source.id,
    name: source.name,
    source,
    html: journalArticle({
      eyebrow: "CREW TACTIC",
      title: source.name,
      description: source.effect,
      sourceId: source.id,
      rows: [
        ["Theater", labelize(source.theater)],
        ["Rarity", labelize(source.rarity ?? "standard")],
        ["Trigger", source.trigger],
        ["Tags", source.tags ?? []]
      ]
    })
  };
}

function eventEntry(event) {
  const source = cloneSerializable(event);
  const rounds = Array.isArray(source.rounds) ? source.rounds : [];
  const roundHtml = rounds.length
    ? `<h2>Rounds</h2><ol>${rounds.map((round) => `<li><strong>${escapeHtml(round.title ?? round.name ?? round.id)}</strong>${round.situation ? ` — ${escapeHtml(round.situation)}` : ""}</li>`).join("")}</ol>`
    : "";
  return {
    sourceId: source.id,
    name: source.title ?? source.name ?? labelize(source.id),
    source,
    html: journalArticle({
      eyebrow: "SHIP EVENT",
      title: source.title ?? source.name ?? labelize(source.id),
      description: source.openingVignette ?? source.description ?? "",
      sourceId: source.id,
      rows: [
        ["Goal", source.goal],
        ["Rounds", rounds.length],
        ["Image", source.image]
      ],
      extra: roundHtml
    })
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

function documentData(packKey, entry) {
  const sourceHash = stableHash(entry.source);
  return {
    name: entry.name,
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: {
          managed: true,
          packKey,
          sourceId: entry.sourceId,
          sourceHash,
          source: entry.source
        }
      }
    },
    pages: [{
      name: "Overview",
      type: "text",
      text: {
        format: globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1,
        content: entry.html
      }
    }]
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
  const existing = game.packs.get(id);
  if (existing) {
    if (existing.documentName !== "JournalEntry") throw new Error(`${definition.label} exists but is not a JournalEntry compendium.`);
    return { pack: existing, created: false };
  }

  const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");

  const pack = await CompendiumClass.createCompendium({
    name: definition.name,
    label: definition.label,
    type: "JournalEntry",
    package: "world"
  });
  return { pack, created: true };
}

async function syncPack(packKey, definition, entries, { force = false } = {}) {
  const { pack, created: createdPack } = await ensureWorldPack(definition);
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

  const JournalClass = CONFIG?.JournalEntry?.documentClass ?? globalThis.JournalEntry;
  if (!JournalClass?.createDocuments || !JournalClass?.updateDocuments || !JournalClass?.deleteDocuments) {
    throw new Error("Foundry JournalEntry document API is unavailable.");
  }

  if (creates.length) await JournalClass.createDocuments(creates, { pack: collection });
  if (updates.length) await JournalClass.updateDocuments(updates, { pack: collection });
  if (stale.length) await JournalClass.deleteDocuments([...new Set(stale)], { pack: collection });

  return {
    pack: collection,
    label: definition.label,
    createdPack,
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

  const changed = results.some((result) => result.createdPack || result.created || result.updated || result.deleted);
  if (notify && changed) {
    const total = results.reduce((sum, result) => sum + result.total, 0);
    ui.notifications?.info?.(`Arkflight compendiums synced: ${total} managed entries across ${results.length} packs.`);
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
