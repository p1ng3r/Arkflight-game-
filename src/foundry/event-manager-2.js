import { ContentPackageRegistry } from "../content/packages/content-package-registry.js";
import { BUILTIN_CONTENT_PACKAGES } from "../content/packages/builtin-packages.js";
import { registerArkflightEvent, unregisterArkflightEvent } from "../content/events/index.js";
import { ArkflightEventManager2 } from "../ui/event-manager-2-ui.js";

const MODULE_ID = "arkflight-game";
const SETTING_KEY = "contentPackageState";
const FLAG_SCOPE = "arkflight";
const FLAG_KEY = "contentPackage";
const FOLDER_NAME = "Arkflight Adventures";
const DOCUMENT_KINDS = Object.freeze({
  journals: Object.freeze({ documentName: "JournalEntry", label: "Journals" }),
  macros: Object.freeze({ documentName: "Macro", label: "Macros" }),
  tables: Object.freeze({ documentName: "RollTable", label: "Tables" }),
  actors: Object.freeze({ documentName: "Actor", label: "Actors" })
});

let manager = null;

function clone(value) { return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function stableHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function slug(value) { return String(value ?? "content").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "content"; }
function packId(name) { return `world.${name}`; }
function sourceId(entry, index) { return String(entry?.id ?? slug(entry?.name ?? `entry-${index + 1}`)); }

function storedState() { return game.settings?.get(MODULE_ID, SETTING_KEY) ?? {}; }
function packageState(registry, packageId) {
  const pkg = registry.get(packageId);
  if (!pkg) throw new Error(`Unknown Arkflight content package: ${packageId}`);
  const stored = storedState()?.[pkg.id] ?? {};
  const stageIds = new Set(pkg.adventure.stages.map((stage) => stage.id));
  const completedStages = [...new Set((stored.completedStages ?? []).filter((id) => stageIds.has(id)))];
  const currentStageId = stageIds.has(stored.currentStageId) ? stored.currentStageId : (pkg.adventure.stages[0]?.id ?? null);
  return Object.freeze({
    version: stored.version ?? null,
    syncedAt: stored.syncedAt ?? null,
    packs: Object.freeze({ ...(stored.packs ?? {}) }),
    currentStageId,
    completedStages: Object.freeze(completedStages),
    flags: Object.freeze({ ...(stored.flags ?? {}) })
  });
}
async function writePackageState(registry, packageId, patch = {}) {
  if (!game.user?.isGM) throw new Error("Only the GM may change Arkflight content-package state.");
  const currentAll = clone(storedState());
  const current = packageState(registry, packageId);
  currentAll[packageId] = {
    ...clone(current),
    ...clone(patch),
    packs: { ...clone(current.packs), ...(patch.packs ?? {}) },
    completedStages: [...(patch.completedStages ?? current.completedStages)],
    flags: { ...clone(current.flags), ...(patch.flags ?? {}) }
  };
  await game.settings.set(MODULE_ID, SETTING_KEY, currentAll);
  Hooks.callAll("arkflightContentPackageStateChanged", { packageId, state: packageState(registry, packageId) });
  return packageState(registry, packageId);
}

function packageStatus(registry, packageId) {
  const pkg = registry.get(packageId);
  if (!pkg) return Object.freeze({ ready: false, blockers: Object.freeze(["Package is not registered."]), optionalMissing: Object.freeze([]) });
  const blockers = [];
  const optionalMissing = [];
  if (pkg.requirements.system && game.system?.id !== pkg.requirements.system) blockers.push(`Requires game system ${pkg.requirements.system}.`);
  for (const moduleId of pkg.requirements.modules) if (!game.modules?.get(moduleId)?.active) blockers.push(`Requires module ${moduleId}.`);
  for (const moduleId of pkg.optionalModules) if (!game.modules?.get(moduleId)?.active) optionalMissing.push(moduleId);
  if (pkg.requirements.core) {
    const required = pkg.requirements.core.replace(/^>=\s*/, "");
    const current = game.modules?.get(MODULE_ID)?.version ?? "0.0.0";
    if (required && foundry?.utils?.isNewerVersion?.(required, current)) blockers.push(`Requires Arkflight ${pkg.requirements.core}; current ${current}.`);
  }
  return Object.freeze({ ready: blockers.length === 0, blockers: Object.freeze(blockers), optionalMissing: Object.freeze(optionalMissing) });
}

async function ensureFolder() {
  const existing = game.folders?.find?.((folder) => folder.type === "Compendium" && folder.name === FOLDER_NAME && !folder.folder);
  if (existing) return existing;
  const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  if (!FolderClass?.create) throw new Error("Foundry Folder API is unavailable.");
  return FolderClass.create({ name: FOLDER_NAME, type: "Compendium", sorting: "a", color: "#6b5635" });
}

async function ensurePack(pkg, kind, folder) {
  const definition = DOCUMENT_KINDS[kind];
  if (!definition) throw new Error(`Unsupported Arkflight package document kind: ${kind}`);
  const name = `arkflight-${slug(pkg.id)}-${kind}`;
  const id = packId(name);
  let pack = game.packs.get(id);
  if (pack && pack.documentName !== definition.documentName) throw new Error(`${id} exists with document type ${pack.documentName}, expected ${definition.documentName}.`);
  if (!pack) {
    const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");
    pack = await CompendiumClass.createCompendium({ name, label: `Arkflight — ${pkg.title} — ${definition.label}`, type: definition.documentName, package: "world" });
  }
  if (folder && typeof pack.setFolder === "function") {
    const currentFolderId = typeof pack.folder === "string" ? pack.folder : pack.folder?.id;
    if (currentFolderId !== folder.id) await pack.setFolder(folder);
  }
  return pack;
}

function compactJournal(entry) {
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  return {
    name: entry.name,
    img: entry.img,
    pages: (entry.pages ?? []).map((page) => ({
      name: page.name ?? "Page",
      type: page.type ?? "text",
      text: page.text ?? { format, content: page.content ?? "" },
      img: page.img,
      flags: clone(page.flags ?? {})
    }))
  };
}
function compactMacro(entry) { return { name: entry.name, type: entry.type ?? "script", scope: entry.scope ?? "global", command: entry.command ?? "", img: entry.img }; }
function compactTable(entry) {
  const resultType = globalThis.CONST?.TABLE_RESULT_TYPES?.TEXT ?? "text";
  return {
    name: entry.name,
    img: entry.img,
    description: entry.description ?? "",
    formula: entry.formula ?? `1d${Math.max(1, entry.results?.length ?? 1)}`,
    replacement: entry.replacement ?? true,
    displayRoll: entry.displayRoll ?? true,
    results: (entry.results ?? []).map((row, index) => ({
      type: row.type ?? resultType,
      text: row.text ?? row.name ?? `Result ${index + 1}`,
      img: row.img,
      weight: row.weight ?? 1,
      range: row.range ?? [index + 1, index + 1],
      drawn: Boolean(row.drawn),
      flags: clone(row.flags ?? {})
    }))
  };
}
function documentData(kind, entry) {
  if (entry?.data) return clone(entry.data);
  if (kind === "journals") return compactJournal(entry);
  if (kind === "macros") return compactMacro(entry);
  if (kind === "tables") return compactTable(entry);
  if (kind === "actors") return clone(entry);
  throw new Error(`Unsupported Arkflight package document kind: ${kind}`);
}
function documentClass(documentName) {
  if (documentName === "JournalEntry") return CONFIG?.JournalEntry?.documentClass ?? globalThis.JournalEntry;
  if (documentName === "Macro") return CONFIG?.Macro?.documentClass ?? globalThis.Macro;
  if (documentName === "RollTable") return CONFIG?.RollTable?.documentClass ?? globalThis.RollTable;
  if (documentName === "Actor") return CONFIG?.Actor?.documentClass ?? globalThis.Actor;
  return null;
}
function managed(document) { return document?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null; }

async function syncKind(pkg, kind, entries, folder, { force = false } = {}) {
  if (!entries.length) return null;
  const definition = DOCUMENT_KINDS[kind];
  const pack = await ensurePack(pkg, kind, folder);
  const collection = pack.collection ?? packId(pack.metadata?.name ?? "");
  const existing = await pack.getDocuments();
  const bySource = new Map(existing.map((document) => [managed(document)?.sourceId, document]).filter(([id]) => id));
  const desired = new Set();
  const creates = [];
  const updates = [];
  const deletes = [];

  entries.forEach((entry, index) => {
    const id = sourceId(entry, index);
    desired.add(id);
    const data = documentData(kind, entry);
    const sourceHash = stableHash({ id, kind, data });
    data.flags = {
      ...(data.flags ?? {}),
      [FLAG_SCOPE]: {
        ...(data.flags?.[FLAG_SCOPE] ?? {}),
        [FLAG_KEY]: { managed: true, packageId: pkg.id, sourceId: id, sourceHash }
      }
    };
    const old = bySource.get(id);
    if (!old) creates.push(data);
    else if (force || managed(old)?.sourceHash !== sourceHash) updates.push({ _id: old.id, ...data });
  });

  for (const document of existing) {
    const flag = managed(document);
    if (flag?.managed && flag.packageId === pkg.id && flag.sourceId && !desired.has(flag.sourceId)) deletes.push(document.id);
  }

  const DocumentClass = documentClass(definition.documentName);
  if (!DocumentClass?.createDocuments || !DocumentClass?.updateDocuments || !DocumentClass?.deleteDocuments) throw new Error(`Foundry ${definition.documentName} document API is unavailable.`);
  if (deletes.length) await DocumentClass.deleteDocuments(deletes, { pack: collection });
  if (creates.length) await DocumentClass.createDocuments(creates, { pack: collection });
  if (updates.length) await DocumentClass.updateDocuments(updates, { pack: collection });
  return Object.freeze({ kind, pack: pack.collection ?? packId(pack.metadata?.name), created: creates.length, updated: updates.length, deleted: deletes.length, total: entries.length });
}

function createContentApi(registry) {
  async function sync(packageId, { force = false } = {}) {
    if (!game.user?.isGM) throw new Error("Only the GM may synchronize Arkflight content packages.");
    const pkg = registry.get(packageId);
    if (!pkg) throw new Error(`Unknown Arkflight content package: ${packageId}`);
    const status = packageStatus(registry, packageId);
    if (!status.ready) throw new Error(status.blockers.join(" "));
    const folder = await ensureFolder();
    const results = [];
    const packs = {};
    for (const kind of Object.keys(DOCUMENT_KINDS)) {
      const result = await syncKind(pkg, kind, pkg.content[kind] ?? [], folder, { force });
      if (!result) continue;
      results.push(result);
      packs[kind] = result.pack;
    }
    await writePackageState(registry, packageId, { version: pkg.version, syncedAt: Date.now(), packs });
    ui.notifications?.info?.(`${pkg.title} synchronized${results.length ? "" : " — no managed documents required"}.`);
    Hooks.callAll("arkflightContentPackageSynced", { packageId, package: pkg, results });
    return Object.freeze(results);
  }

  async function launch(packageId, { eventId = null, shipReference = null } = {}) {
    if (!game.user?.isGM) throw new Error("Only the GM may launch an Arkflight content package.");
    const pkg = registry.get(packageId);
    if (!pkg) throw new Error(`Unknown Arkflight content package: ${packageId}`);
    const status = packageStatus(registry, packageId);
    if (!status.ready) throw new Error(status.blockers.join(" "));
    const packageProgress = packageState(registry, packageId);
    const currentStage = pkg.adventure.stages.find((stage) => stage.id === packageProgress.currentStageId) ?? null;
    const targetEventId = eventId ?? currentStage?.eventId ?? (pkg.adventure.stages.length ? null : pkg.adventure.entryPoint);
    if (!targetEventId) throw new Error(`${pkg.title}'s current stage is not a launchable Arkflight Event. Use its package resources or advance the stage when that activity is complete.`);
    const active = game.arkflight?.controller?.state?.eventId ?? null;
    if (active) {
      if (active === targetEventId) { game.arkflight.openBoard?.(); return game.arkflight.controller?.state ?? null; }
      throw new Error(`Arkflight Event ${active} is already active. Finish or restart it before launching ${pkg.title}.`);
    }
    const state = await game.arkflight.openEvent(targetEventId, shipReference);
    Hooks.callAll("arkflightContentPackageLaunched", { packageId, package: pkg, eventId: targetEventId, state });
    return state;
  }

  async function openResource(packageId, kind) {
    const pkg = registry.get(packageId);
    if (!pkg) throw new Error(`Unknown Arkflight content package: ${packageId}`);
    const state = packageState(registry, packageId);
    const id = state.packs?.[kind] ?? pkg.resources?.compendiums?.[kind] ?? null;
    if (!id) throw new Error(`${pkg.title} does not declare a ${kind} compendium.`);
    const pack = game.packs.get(id);
    if (!pack) throw new Error(`${id} is not available. Synchronize the package or enable its companion content module.`);
    return pack.render(true);
  }

  async function setStage(packageId, stageId) {
    const pkg = registry.get(packageId);
    if (!pkg?.adventure?.stages?.some((stage) => stage.id === stageId)) throw new Error(`Unknown stage ${stageId} for ${packageId}.`);
    return writePackageState(registry, packageId, { currentStageId: stageId });
  }

  async function completeStage(packageId, stageId) {
    const pkg = registry.get(packageId);
    if (!pkg) throw new Error(`Unknown Arkflight content package: ${packageId}`);
    const index = pkg.adventure.stages.findIndex((stage) => stage.id === stageId);
    if (index < 0) throw new Error(`Unknown stage ${stageId} for ${packageId}.`);
    const state = packageState(registry, packageId);
    const stage = pkg.adventure.stages[index];
    const controllerState = game.arkflight?.controller?.state ?? null;
    if (stage.eventId && controllerState?.eventId === stage.eventId) {
      if (controllerState.phase !== "event-complete") throw new Error(`${stage.label} cannot be completed while its Arkflight Event is still in progress.`);
      await game.arkflight.controller.closeCurrentEvent();
    }
    const completedStages = [...new Set([...state.completedStages, stageId])];
    const currentStageId = pkg.adventure.stages[index + 1]?.id ?? stageId;
    return writePackageState(registry, packageId, { completedStages, currentStageId });
  }

  return Object.freeze({
    registerPackage: (definition, options = {}) => registry.register(definition, options),
    unregisterPackage: (packageId) => {
      const pkg = registry.get(packageId);
      if (pkg?.builtIn) throw new Error("Built-in Arkflight content packages cannot be unregistered.");
      return registry.unregister(packageId);
    },
    list: () => registry.list(),
    get: (packageId) => registry.get(packageId),
    source: (packageId) => registry.source(packageId),
    packageForEvent: (eventId) => registry.packageForEvent(eventId),
    state: (packageId) => packageState(registry, packageId),
    status: (packageId) => packageStatus(registry, packageId),
    sync,
    launch,
    openResource,
    setStage,
    completeStage,
    onChange: (callback) => registry.onChange(callback)
  });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, { name: "Arkflight Content Package State", scope: "world", config: false, type: Object, default: {} });
  const registry = new ContentPackageRegistry({ registerEvent: registerArkflightEvent, unregisterEvent: unregisterArkflightEvent });
  for (const definition of BUILTIN_CONTENT_PACKAGES) registry.register(definition, { source: MODULE_ID });
  game.arkflight ??= {};
  game.arkflight.content = createContentApi(registry);
  game.arkflight.openEventManager = () => {
    if (!game.user?.isGM) { ui.notifications?.info?.("Event Manager 2.0 is a GM tool. Players use the active Event Board."); return null; }
    if (!manager) manager = new ArkflightEventManager2();
    return manager.render({ force: true });
  };
  registry.onChange(() => { if (manager?.rendered) manager.render({ force: true }); });
});

Hooks.once("ready", () => {
  Hooks.callAll("arkflightContentReady", game.arkflight?.content);
});
