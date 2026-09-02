import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { createShip } from "../ship/ship-schema.js";
import { validateShip } from "../ship/validate-ship.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";
import { buildShipSheetView, SHIP_SHEET_TABS } from "./ship-sheet-view-model.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function statValue(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function catalogName(catalog, id, fallback = "Not commissioned") { return id && catalog?.[id]?.name ? catalog[id].name : fallback; }
function resolveStationAssignment(value) { if (!value) return "Unassigned"; const actor = game.actors?.get(value) ?? game.actors?.find((entry) => entry.uuid === value); return actor?.name ?? String(value); }
function resourceView(ship, key, label, icon, maxOverride = null) { const resource = ship.resources?.[key] ?? { value: 0, max: 0 }; const max = maxOverride == null ? statValue(resource.max) : statValue(maxOverride); return { key, label, icon, value: statValue(resource.value), max }; }
function tabState(activeTab) { return Object.freeze({ overview: activeTab === "overview", fittings: activeTab === "fittings", refit: activeTab === "refit" }); }
function fittingCapacity(label, used, max) { const u = statValue(used); const m = statValue(max); return Object.freeze({ label, used: u, max: m, over: u > m, overBy: Math.max(0, u - m), text: u > m ? `${u} installed / ${m} capacity — ${u - m} over` : `${u} / ${m}` }); }
function validationPresentation(ship, validation) {
  if (validation.ok) return { statusClass: "is-ready", label: "VOYAGE READY" };
  const commissioned = Boolean(ship.hull?.chassisId && ship.arkengine?.chassisId);
  return { statusClass: "is-incomplete", label: commissioned ? `REFIT ATTENTION · ${validation.errors.length}` : `COMMISSIONING REQUIRED · ${validation.errors.length}` };
}
function catalogForFamily(family) { return family === "arkengineMod" ? SHIP_CATALOGS.arkengineMods : SHIP_CATALOGS.shipMods; }
function firstFreeAssignment(ship, family, componentId) {
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, family);
  const item = catalogForFamily(family)?.[componentId];
  const cost = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1)));
  if (layout.overBy > 0) return null;
  const occupied = new Set(layout.occupied);
  const sockets = [];
  for (let index = 0; index < layout.capacity && sockets.length < cost; index += 1) if (!occupied.has(index)) sockets.push(index);
  return sockets.length === cost ? { family, componentId, socketIndices: sockets } : null;
}
async function startQueued(actor, queued, noun) {
  if (!queued?.ok || !queued.job) { ui.notifications?.warn(`${noun} could not be queued: ${queued?.reason ?? "unknown error"}.`); return false; }
  const started = await game.arkflight?.refit?.startWork?.(actor, queued.job.id);
  if (!started?.ok) { ui.notifications?.warn(`${noun} was queued but could not start: ${started?.reason ?? "unknown error"}.`); return false; }
  ui.notifications?.info(`${noun} started — ${started.job.remainingHours}h remaining.`);
  actor.sheet?.render?.(false);
  return true;
}

export function isArkflightShip(actor) { if (actor?.type !== "vehicle") return false; return actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor)); }

export class ArkflightShipSheet extends foundry.appv1.sheets.ActorSheet {
  constructor(...args) { super(...args); this.activeTab = "overview"; }
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["arkflight", "arkflight-ship-sheet"], width: 1080, height: 820, resizable: true, template: `modules/${MODULE_ID}/templates/ship/ship-sheet.hbs` }); }
  get title() { return `${this.actor.name} — Arkflight Vessel`; }

  async getData(options = {}) {
    const data = await super.getData(options);
    const ship = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
    const validation = validateShip(ship, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(ship, SHIP_CATALOGS);
    const sheetView = buildShipSheetView({ ship, derived, catalogs: SHIP_CATALOGS, resolveAssignment: resolveStationAssignment });
    const stats = derived.stats ?? {};
    const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId] ?? null;
    const engineCapacity = Number(engine?.data?.modCapacity ?? 0) + Number(stats.arkengineModCapacity ?? 0);
    const readiness = validationPresentation(ship, validation);
    return {
      ...data,
      arkflight: {
        marked: isArkflightShip(this.actor), actorUuid: this.actor.uuid, actorImg: this.actor.img,
        isGM: game.user.isGM, canOperate: this.actor.isOwner, canManageRefit: Boolean(game.user.isGM || this.actor.isOwner),
        activeTab: this.activeTab, tab: tabState(this.activeTab), ship,
        hullName: catalogName(SHIP_CATALOGS.hulls, ship.hull?.chassisId),
        hullPatternName: ship.hull?.chassisId ? catalogName(SHIP_CATALOGS.hullPatterns, ship.hull?.patternId, "Not selected") : "—",
        arkengineName: catalogName(SHIP_CATALOGS.arkengines, ship.arkengine?.chassisId),
        arkenginePatternName: ship.arkengine?.chassisId ? catalogName(SHIP_CATALOGS.arkenginePatterns, ship.arkengine?.patternId, "Not selected") : "—",
        level: ship.progression?.level ?? 1,
        resources: [
          resourceView(ship, "hull", "Hull", "fa-shield-halved", stats.hullIntegrity),
          resourceView(ship, "lifeveil", "Lifeveil", "fa-sparkles", stats.lifeveilCapacity),
          resourceView(ship, "strain", "Strain", "fa-gauge-high", stats.strainCapacity),
          resourceView(ship, "supplies", "Supplies", "fa-boxes-stacked", stats.supplyCapacity),
          resourceView(ship, "morale", "Morale", "fa-flag", stats.moraleCapacity)
        ],
        cargoUsed: statValue(ship.cargo?.used), cargoCapacity: statValue(stats.cargoCapacity),
        fittingCapacity: {
          rooms: fittingCapacity("Rooms", derived.usage?.rooms, stats.roomCapacity),
          shipMods: fittingCapacity("Ship Mods", derived.usage?.shipMods, stats.shipModCapacity),
          arkengineMods: fittingCapacity("Arkengine Mods", derived.usage?.arkengineMods, engineCapacity)
        },
        view: sheetView, tags: [...(derived.tags ?? [])], capabilities: [...(derived.capabilities ?? [])], conditions: [...(ship.conditions ?? [])],
        validation: { ok: validation.ok, ...readiness, errors: [...validation.errors], warnings: [...validation.warnings] }
      }
    };
  }

  activateListeners($html) {
    super.activateListeners($html);
    const html = $html[0];
    for (const button of html.querySelectorAll("[data-tab]")) button.addEventListener("click", (event) => { event.preventDefault(); const tab = event.currentTarget.dataset.tab; if (!SHIP_SHEET_TABS.includes(tab)) return; this.activeTab = tab; this.render(false); });
    for (const input of html.querySelectorAll("[data-resource]")) input.addEventListener("change", async (event) => {
      if (!this.actor.isOwner) return;
      const key = event.currentTarget.dataset.resource; const ship = shipFlag(this.actor); if (!ship?.resources?.[key]) return;
      const derived = deriveShip(ship, SHIP_CATALOGS);
      const dynamicMax = key === "supplies" ? derived.stats.supplyCapacity : key === "morale" ? derived.stats.moraleCapacity : key === "hull" ? derived.stats.hullIntegrity : key === "lifeveil" ? derived.stats.lifeveilCapacity : key === "strain" ? derived.stats.strainCapacity : ship.resources[key].max;
      const max = statValue(dynamicMax); const requested = statValue(event.currentTarget.value); const value = max > 0 ? Math.max(0, Math.min(requested, max)) : Math.max(0, requested);
      await this.actor.update({ [`flags.${MODULE_ID}.ship.resources.${key}.value`]: value, [`flags.${MODULE_ID}.ship.resources.${key}.max`]: max });
    });
    for (const button of html.querySelectorAll("[data-compendium-pack]")) button.addEventListener("click", (event) => { event.preventDefault(); const packId = event.currentTarget.dataset.compendiumPack; const pack = game.packs?.get(packId); if (!pack) return ui.notifications?.warn(`Arkflight Compendium pack is not available yet: ${packId}`); pack.render(true); });

    for (const button of html.querySelectorAll("[data-refit-build]")) button.addEventListener("click", async (event) => {
      event.preventDefault(); if (!(game.user.isGM || this.actor.isOwner)) return;
      const family = event.currentTarget.dataset.family; const id = event.currentTarget.dataset.id; const method = event.currentTarget.dataset.method ?? "crew";
      try { await startQueued(this.actor, await game.arkflight?.refit?.queueBuild?.(this.actor, family, id, { method }), `Build ${catalogForFamily(family)?.[id]?.name ?? id}`); } catch (error) { ui.notifications?.error(error.message); }
    });
    for (const button of html.querySelectorAll("[data-refit-install]")) button.addEventListener("click", async (event) => {
      event.preventDefault(); if (!(game.user.isGM || this.actor.isOwner)) return;
      const family = event.currentTarget.dataset.family; const id = event.currentTarget.dataset.id; const method = event.currentTarget.dataset.method ?? "crew"; const ship = shipFlag(this.actor);
      const assignment = firstFreeAssignment(ship, family, id);
      if (!assignment) return ui.notifications?.warn("No legal free sockets are available. Resolve over-capacity or remove a fitting first.");
      const draft = { actorUuid: this.actor.uuid, assignments: [assignment] };
      if (method === "crew") { Hooks.callAll("arkflightRefitInstallRequested", { actor: this.actor, draft, preview: null, method: "crew" }); return; }
      try { await startQueued(this.actor, await game.arkflight?.refit?.beginInstallDraft?.(this.actor, draft, { method: "shipyard" }), `Install ${catalogForFamily(family)?.[id]?.name ?? id}`); } catch (error) { ui.notifications?.error(error.message); }
    });
    for (const button of html.querySelectorAll("[data-refit-remove]")) button.addEventListener("click", async (event) => {
      event.preventDefault(); if (!(game.user.isGM || this.actor.isOwner)) return;
      const family = event.currentTarget.dataset.family; const id = event.currentTarget.dataset.id; const layout = installedSocketLayout(shipFlag(this.actor), SHIP_CATALOGS, family); const placement = layout.placements.find((entry) => entry.componentId === id);
      if (!placement) return ui.notifications?.warn("That fitting is not installed.");
      try { const queued = await game.arkflight?.refit?.queueRemove?.(this.actor, family, id, { method: "crew", socketIndices: [...placement.socketIndices], sourceInstallJobId: placement.sourceJobId ?? "" }); await startQueued(this.actor, queued, `Remove ${catalogForFamily(family)?.[id]?.name ?? id}`); } catch (error) { ui.notifications?.error(error.message); }
    });
    for (const button of html.querySelectorAll("[data-refit-start]")) button.addEventListener("click", async (event) => {
      event.preventDefault(); if (!(game.user.isGM || this.actor.isOwner)) return;
      try { const result = await game.arkflight?.refit?.startWork?.(this.actor, event.currentTarget.dataset.refitStart); if (!result?.ok) ui.notifications?.warn(`Could not start work: ${result?.reason ?? "unknown error"}.`); else { ui.notifications?.info(`Work started — ${result.job.remainingHours}h remaining.`); this.render(false); } } catch (error) { ui.notifications?.error(error.message); }
    });
  }
}

export function registerArkflightShipSheet() {
  if (game.system.id !== "pf2e") { console.warn("Arkflight | Ship sheet registration skipped: PF2e system is not active."); return; }
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, ArkflightShipSheet, { types: ["vehicle"], label: "Arkflight Vessel Sheet", makeDefault: false });
}

export async function ensureArkflightShipSheet(actor) {
  if (!isArkflightShip(actor) || actor?.isToken) return false;
  if (actor.getFlag?.("core", "sheetClass") === ARKFLIGHT_SHIP_SHEET_ID || actor.flags?.core?.sheetClass === ARKFLIGHT_SHIP_SHEET_ID) return false;
  await actor.update({ "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID });
  return true;
}

export async function markVehicleAsArkflightShip(actor) {
  if (!actor || actor.type !== "vehicle") throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  const existingShip = shipFlag(actor); const ship = existingShip ?? createShip({ identity: { name: actor.name || "Unnamed Vessel" } });
  await actor.update({ [`flags.${MODULE_ID}.isArkflightShip`]: true, [`flags.${MODULE_ID}.ship`]: ship, "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID });
  return actor;
}

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;
  for (const actor of game.actors?.contents ?? []) {
    if (!isArkflightShip(actor)) continue;
    try { await ensureArkflightShipSheet(actor); }
    catch (error) { console.warn(`Arkflight | Could not enforce vessel sheet for ${actor.name}`, error); }
  }
});
