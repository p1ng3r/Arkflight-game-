import { GILDED_SHATTER_WEATHER_DECK_GUIDE } from "../content/adventures/gilded-shatter-weather-deck.js";

const FLAG_SCOPE = "arkflight";
const FLAG_KEY = "gildedShatterGmGuide";
const FOLDER_NAME = "Arkflight";
const JOURNAL_PACK = Object.freeze({ name: "arkflight-gilded-shatter-gm-guide", label: "Arkflight — Gilded Shatter GM Guide", documentName: "JournalEntry" });
const MACRO_PACK = Object.freeze({ name: "arkflight-gilded-shatter-gm-macros", label: "Arkflight — Gilded Shatter GM Macros", documentName: "Macro" });

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stableHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function packId(definition) { return `world.${definition.name}`; }

async function ensureFolder() {
  const existing = game.folders?.find?.((folder) => folder.type === "Compendium" && folder.name === FOLDER_NAME && !folder.folder);
  if (existing) return existing;
  const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  if (!FolderClass?.create) throw new Error("Foundry Folder API is unavailable.");
  return FolderClass.create({ name: FOLDER_NAME, type: "Compendium", sorting: "a", color: "#6b5635" });
}

async function ensurePack(definition, folder) {
  const id = packId(definition);
  let pack = game.packs.get(id);
  if (pack && pack.documentName !== definition.documentName) throw new Error(`${definition.label} exists with the wrong document type.`);
  if (!pack) {
    const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");
    pack = await CompendiumClass.createCompendium({ name: definition.name, label: definition.label, type: definition.documentName, package: "world" });
  }
  if (folder && typeof pack.setFolder === "function") {
    const current = typeof pack.folder === "string" ? pack.folder : pack.folder?.id;
    if (current !== folder.id) await pack.setFolder(folder);
  }
  return pack;
}

function managed(document) { return document?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null; }

function journalDocuments() {
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  return GILDED_SHATTER_WEATHER_DECK_GUIDE.journals.map((entry) => ({
    sourceId: entry.id,
    name: entry.name,
    data: {
      name: entry.name,
      pages: entry.pages.map((page) => ({
        name: page.name,
        type: "text",
        text: { format, content: page.content },
        flags: { [FLAG_SCOPE]: { gildedShatter: { pageRole: page.playerFacing ? "player-handout" : "gm-guide", sourceId: entry.id } } }
      }))
    },
    source: entry
  }));
}

function macroDocuments() {
  return GILDED_SHATTER_WEATHER_DECK_GUIDE.macros.map((entry) => ({
    sourceId: entry.id,
    name: entry.name,
    data: { name: entry.name, type: "script", scope: "global", command: entry.command, img: entry.img },
    source: entry
  }));
}

function documentClass(documentName) {
  if (documentName === "JournalEntry") return CONFIG?.JournalEntry?.documentClass ?? globalThis.JournalEntry;
  if (documentName === "Macro") return CONFIG?.Macro?.documentClass ?? globalThis.Macro;
  return null;
}

async function syncPack(definition, entries, folder, { force = false } = {}) {
  const pack = await ensurePack(definition, folder);
  const collection = pack.collection ?? packId(definition);
  const docs = await pack.getDocuments();
  const bySource = new Map(docs.map((document) => [managed(document)?.sourceId, document]).filter(([sourceId]) => sourceId));
  const desired = new Set(entries.map((entry) => entry.sourceId));
  const creates = [];
  const updates = [];
  const deletes = [];

  for (const entry of entries) {
    const sourceHash = stableHash({ source: entry.source, data: entry.data });
    const data = clone(entry.data);
    data.flags = {
      ...(data.flags ?? {}),
      [FLAG_SCOPE]: {
        ...(data.flags?.[FLAG_SCOPE] ?? {}),
        [FLAG_KEY]: { managed: true, sourceId: entry.sourceId, sourceHash }
      }
    };
    const old = bySource.get(entry.sourceId);
    if (!old) creates.push(data);
    else if (force || managed(old)?.sourceHash !== sourceHash || old.name !== entry.name) updates.push({ _id: old.id, ...data });
  }

  for (const document of docs) {
    const flag = managed(document);
    if (flag?.managed && flag.sourceId && !desired.has(flag.sourceId)) deletes.push(document.id);
  }

  const DocumentClass = documentClass(definition.documentName);
  if (!DocumentClass?.createDocuments || !DocumentClass?.updateDocuments || !DocumentClass?.deleteDocuments) throw new Error(`Foundry ${definition.documentName} document API is unavailable.`);

  if (deletes.length) await DocumentClass.deleteDocuments(deletes, { pack: collection });
  if (creates.length) await DocumentClass.createDocuments(creates, { pack: collection });
  if (updates.length) await DocumentClass.updateDocuments(updates, { pack: collection });

  return { pack: collection, created: creates.length, updated: updates.length, deleted: deletes.length, total: entries.length };
}

async function syncGuide({ force = false, notify = true } = {}) {
  if (!game.user?.isGM) return [];
  const folder = await ensureFolder();
  const results = [
    await syncPack(JOURNAL_PACK, journalDocuments(), folder, { force }),
    await syncPack(MACRO_PACK, macroDocuments(), folder, { force })
  ];
  const changed = results.some((result) => result.created || result.updated || result.deleted);
  if (notify && changed) ui.notifications?.info?.("Gilded Shatter GM journals and pulse macros synchronized.");
  console.info("Arkflight | Gilded Shatter GM guide synced", results);
  return results;
}

function openPack(definition) {
  const pack = game.packs.get(packId(definition));
  if (!pack) throw new Error(`${definition.label} does not exist yet.`);
  return pack.render(true);
}

Hooks.once("ready", async () => {
  game.arkflight ??= {};
  game.arkflight.gildedShatterGuide = Object.freeze({
    sync: (options = {}) => syncGuide(options),
    rebuild: () => syncGuide({ force: true, notify: true }),
    openGuide: () => openPack(JOURNAL_PACK),
    openMacros: () => openPack(MACRO_PACK),
    journalPackId: packId(JOURNAL_PACK),
    macroPackId: packId(MACRO_PACK)
  });
  if (!game.user?.isGM) return;
  try { await syncGuide({ notify: true }); }
  catch (error) {
    console.error("Arkflight | Gilded Shatter GM guide sync failed", error);
    ui.notifications?.error?.(`Gilded Shatter GM guide could not be synchronized: ${error.message}`);
  }
});
