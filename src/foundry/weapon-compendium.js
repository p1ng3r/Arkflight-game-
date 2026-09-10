import { SHIP_CATALOGS, WEAPONS } from "../content/index.js";
import { PF2E_SHIP_WEAPON_SCHEMA_VERSION, pf2eShipWeaponDocumentBase } from "./pf2e-ship-weapon-source.js";
import { auditWeaponArt } from "../content/weapon-art.js";

const MODULE_ID = "arkflight-game";
const FLAG_SCOPE = "arkflight";
const SOURCE_FLAG = "compendiumSource";
const FOLDER_NAME = "Arkflight";
const PACK_NAME = "arkflight-weapons";
const PACK_ID = `world.${PACK_NAME}`;
const PACK_LABEL = "Arkflight — Ship Weapons";

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function labelize(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stableHash(value) {
  const text = JSON.stringify(clone(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function weaponArticle(weapon) {
  const data = weapon.data ?? {};
  const combat = data.combat ?? {};
  const range = combat.rangeHexes ?? {};
  const damage = data.damageProfile ?? {};
  const rows = [
    ["Size", labelize(data.size)],
    ["Damage", `${damage.dice ?? "—"} ${labelize(damage.type ?? "")}`.trim()],
    ["Fire Cost", `${combat.fireAP ?? "—"} AP`],
    ["Reload", `${combat.reloadRounds ?? 0} round${Number(combat.reloadRounds) === 1 ? "" : "s"}`],
    ["Firing Arc", labelize(combat.arcTemplate)],
    ["Range", `${range.min ?? "—"} min · ${range.optimalMin ?? "—"}–${range.optimalMax ?? "—"} optimal · ${range.max ?? "—"} max`],
    ["Allowed Mounts", (data.allowedMounts ?? []).map(labelize).join(", ")],
    ["Crew Required", data.crewRequired],
    ["System Threat", labelize(data.systemThreat)],
    ["Cargo", data.cargo],
    ["Minimum Ship Level", data.minShipLevel ?? 1]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return `<article class="arkflight-compendium-entry">
    <p><strong>ARKFLIGHT SHIP WEAPON BLUEPRINT · PF2E WEAPON ITEM</strong></p>
    <h1>${escapeHtml(weapon.name)}</h1>
    <p>${escapeHtml(weapon.description ?? "")}</p>
    <dl>${rows.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
    <hr>
    <p><small>PF2e provides the Weapon Item document shell. Arkflight remains authoritative for ship AP, attack math, mounts, firing arcs, range bands, reload rounds, system threat, and ship-weapon upgrades.</small></p>
    <p><small>A GM can drag this blueprint onto an Arkflight vessel sheet to teach it to that ship. Fabricate a physical weapon, then install it through Refit or the Shipwright; materials, Engineering work, elapsed time, level, and mount restrictions all apply.</small></p>
    <p><small>Arkflight Source ID: <code>${escapeHtml(weapon.id)}</code></small></p>
  </article>`;
}

function weaponDocumentData(weapon) {
  const data = weapon.data ?? {};
  const rarity = data.rarity ?? "standard";
  const source = clone(weapon);
  const sourceHash = stableHash({ documentSchemaVersion: PF2E_SHIP_WEAPON_SCHEMA_VERSION, source });
  const base = pf2eShipWeaponDocumentBase(weapon, { descriptionHtml: weaponArticle(weapon) });

  return {
    ...base,
    flags: {
      [FLAG_SCOPE]: {
        contentType: "weapon",
        shipWeapon: true,
        weaponId: weapon.id,
        rarity,
        size: data.size,
        family: data.family,
        category: data.category,
        mountType: data.mountType,
        allowedMounts: clone(data.allowedMounts ?? []),
        crewRequired: data.crewRequired,
        systemThreat: data.systemThreat,
        cargo: data.cargo,
        tags: clone(weapon.tags ?? []),
        combat: clone(data.combat ?? {}),
        damageProfile: clone(data.damageProfile ?? {}),
        installation: clone(data.refit ?? {}),
        capabilities: clone(weapon.capabilities ?? []),
        [SOURCE_FLAG]: {
          managed: true,
          packKey: "weapons",
          sourceId: weapon.id,
          documentSchemaVersion: PF2E_SHIP_WEAPON_SCHEMA_VERSION,
          sourceHash,
          source
        }
      }
    }
  };
}

async function ensureFolder() {
  const existing = game.folders?.find?.((folder) => folder.type === "Compendium" && folder.name === FOLDER_NAME && !folder.folder);
  if (existing) return existing;
  const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  if (!FolderClass?.create) throw new Error("Foundry Folder API is unavailable.");
  return FolderClass.create({ name: FOLDER_NAME, type: "Compendium", sorting: "a", color: "#6b5635" });
}

async function assignFolder(pack, folder) {
  if (!pack || !folder || typeof pack.setFolder !== "function") return;
  const currentId = typeof pack.folder === "string" ? pack.folder : pack.folder?.id;
  if (currentId !== folder.id) await pack.setFolder(folder);
}

async function ensurePack(folder) {
  let pack = game.packs?.get(PACK_ID) ?? null;
  if (pack && pack.documentName !== "Item") throw new Error(`${PACK_LABEL} exists but is not an Item compendium.`);
  if (!pack) {
    const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");
    pack = await CompendiumClass.createCompendium({ name: PACK_NAME, label: PACK_LABEL, type: "Item", package: "world" });
  }
  await assignFolder(pack, folder);
  return pack;
}

function managedSource(document) {
  return document?.flags?.[FLAG_SCOPE]?.[SOURCE_FLAG] ?? null;
}

export async function syncWeaponCompendium({ force = false, notify = true } = {}) {
  if (!game.user?.isGM) return null;
  const folder = await ensureFolder();
  const pack = await ensurePack(folder);
  const collection = pack.collection ?? PACK_ID;
  const existing = await pack.getDocuments();
  const bySource = new Map();
  const stale = [];

  for (const document of existing) {
    const flag = managedSource(document);
    if (!flag?.managed || flag.packKey !== "weapons" || !flag.sourceId) continue;
    if (bySource.has(flag.sourceId)) stale.push(document.id);
    else bySource.set(flag.sourceId, document);
  }

  const creates = [];
  const updates = [];
  const desiredIds = new Set(Object.keys(WEAPONS));
  for (const weapon of Object.values(WEAPONS)) {
    const data = weaponDocumentData(weapon);
    const current = bySource.get(weapon.id);
    if (!current) {
      creates.push(data);
      continue;
    }

    // Foundry/PF2e does not treat an Item type switch as a normal data update.
    // Delete the old temporary Equipment entry and recreate it as a real PF2e
    // Weapon Item during the next GM sync.
    if (current.type !== "weapon") {
      stale.push(current.id);
      creates.push(data);
      continue;
    }

    const oldHash = managedSource(current)?.sourceHash;
    const newHash = data.flags[FLAG_SCOPE][SOURCE_FLAG].sourceHash;
    if (force || oldHash !== newHash || current.name !== data.name) updates.push({ _id: current.id, ...data });
  }

  for (const [sourceId, document] of bySource.entries()) if (!desiredIds.has(sourceId)) stale.push(document.id);

  const ItemClass = CONFIG?.Item?.documentClass ?? globalThis.Item;
  if (!ItemClass?.createDocuments || !ItemClass?.updateDocuments || !ItemClass?.deleteDocuments) throw new Error("Foundry Item document API is unavailable.");
  const deleteIds = [...new Set(stale)];
  if (deleteIds.length) await ItemClass.deleteDocuments(deleteIds, { pack: collection });
  if (creates.length) await ItemClass.createDocuments(creates, { pack: collection });
  if (updates.length) await ItemClass.updateDocuments(updates, { pack: collection });

  const result = Object.freeze({ pack: collection, total: Object.keys(WEAPONS).length, created: creates.length, updated: updates.length, deleted: deleteIds.length });
  if (notify && (creates.length || updates.length || deleteIds.length)) ui.notifications?.info?.(`${PACK_LABEL} synced — ${result.total} PF2e Weapon Items ready.`);
  console.info("Arkflight | Weapon compendium sync complete", result);
  return result;
}

export function openWeaponCompendium() {
  const pack = game.packs?.get(PACK_ID);
  if (!pack) throw new Error(`${PACK_LABEL} does not exist yet.`);
  return pack.render(true);
}

function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function parseDragData(event) {
  const transfer = event?.dataTransfer;
  if (!transfer) return null;
  for (const type of ["text/plain", "application/json"]) {
    const raw = transfer.getData(type);
    if (!raw) continue;
    try { return JSON.parse(raw); } catch { /* try next type */ }
  }
  return null;
}

function isWeaponPackDrag(data) {
  return typeof data?.uuid === "string" && data.uuid.includes(`world.${PACK_NAME}`);
}

async function handleWeaponDrop(event, actor) {
  const data = parseDragData(event);
  if (!isWeaponPackDrag(data)) return;

  // Stop PF2e from embedding the Weapon Item as ordinary Vehicle inventory.
  // Arkflight consumes the drag as a legal ship-mount installation instead.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  if (!game.user?.isGM) {
    ui.notifications?.warn?.("A GM must add ship-weapon blueprints. Ask the GM to drag this blueprint onto the vessel.");
    return;
  }

  try {
    const resolveUuid = globalThis.fromUuid;
    if (typeof resolveUuid !== "function") throw new Error("Foundry UUID resolver is unavailable.");
    const item = await resolveUuid(data.uuid);
    const weaponId = item?.flags?.[FLAG_SCOPE]?.weaponId ?? item?.flags?.[FLAG_SCOPE]?.[SOURCE_FLAG]?.sourceId;
    if (item?.type !== "weapon" || !weaponId || !SHIP_CATALOGS.weapons?.[weaponId]) throw new Error("Dropped Item is not a managed Arkflight PF2e ship weapon.");

    const ship = actor?.flags?.[MODULE_ID]?.ship;
    if (!ship) throw new Error("This actor does not have Arkflight ship data.");
    const result = await game.arkflight?.refit?.learnBlueprint?.(actor, "weapon", weaponId);
    if (!result.ok) {
      const message = result.reason === "blueprint-already-known"
        ? `${item.name}'s blueprint is already known. Fabricate a physical copy before installation.`
        : `Weapon blueprint could not be learned: ${result.reason ?? "unknown error"}.`;
      ui.notifications?.warn?.(message);
      return;
    }
    ui.notifications?.info?.(`${item.name} blueprint learned. Fabricate it with Aether Scrap, then schedule installation in a legal mount.`);
    actor.sheet?.render?.({ force: true });
  } catch (error) {
    console.error("Arkflight | Weapon blueprint drop failed", error);
    ui.notifications?.error?.(`Arkflight weapon blueprint failed: ${error.message}`);
  }
}

function wireWeaponCompendiumSheet(app, html) {
  const actor = app?.actor ?? app?.document ?? app?.object;
  const ship = actor?.flags?.[MODULE_ID]?.ship;
  if (actor?.type !== "vehicle" || !ship) return;
  const root = rootElement(app, html);
  if (!root) return;

  // The legacy sheet view-model still points at a static module pack. Redirect
  // its existing Browse Compendium button to the managed world weapon pack.
  for (const button of root.querySelectorAll('[data-compendium-pack="arkflight-game.ship-weapons"]')) {
    button.dataset.compendiumPack = PACK_ID;
  }

  if (root.dataset.arkflightWeaponDropBound === "true") return;
  root.dataset.arkflightWeaponDropBound = "true";
  root.addEventListener("drop", (event) => handleWeaponDrop(event, actor), true);
}

Hooks.on("renderActorSheet", wireWeaponCompendiumSheet);
Hooks.on("renderApplicationV2", wireWeaponCompendiumSheet);

Hooks.once("ready", async () => {
  game.arkflight ??= {};
  game.arkflight.weaponCompendium = {
    packId: PACK_ID,
    sync: (options = {}) => syncWeaponCompendium(options),
    rebuild: () => syncWeaponCompendium({ force: true, notify: true }),
    auditArt: () => auditWeaponArt(WEAPONS),
    open: openWeaponCompendium
  };
  if (!game.user?.isGM) return;
  try {
    await syncWeaponCompendium({ notify: true });
    const artAudit = auditWeaponArt(WEAPONS);
    console.info("Arkflight | Weapon art audit", artAudit);
    if (artAudit.missing.length) console.warn("Arkflight | Some weapon artwork is unmatched. Run game.arkflight.weaponCompendium.auditArt() for details.");
  } catch (error) {
    console.error("Arkflight | Weapon compendium bootstrap failed", error);
    ui.notifications?.error?.(`Arkflight weapon compendium could not be synchronized: ${error.message}`);
  }
});
