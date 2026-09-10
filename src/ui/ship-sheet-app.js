import { openArkflightHold } from "./hold-log-ux.js";
import { renderArkflightCombatStations } from "./combat-station-actions-ui.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { createShip } from "../ship/ship-schema.js";
import { validateShip } from "../ship/validate-ship.js";
import { buildShipSheetView, SHIP_SHEET_TABS } from "./ship-sheet-view-model.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function statValue(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function catalogName(catalog, id, fallback = "Not commissioned") { return id && catalog?.[id]?.name ? catalog[id].name : fallback; }
function resolveStationAssignment(value) { if (!value) return "Unassigned"; const actor = game.actors?.get(value) ?? game.actors?.find((entry) => entry.uuid === value); return actor?.name ?? String(value); }
function resourceView(ship, key, label, icon, maxOverride = null) { const resource = ship.resources?.[key] ?? { value: 0, max: 0 }; const max = maxOverride == null ? statValue(resource.max) : statValue(maxOverride); return { key, label, icon, value: statValue(resource.value), max }; }
function tabState(activeTab) { return Object.freeze({ overview: activeTab === "overview", hold: activeTab === "hold", combat: activeTab === "combat" }); }
function validationPresentation(ship, validation) {
  if (validation.ok) return { statusClass: "is-ready", label: "VOYAGE READY" };
  const commissioned = Boolean(ship.hull?.chassisId && ship.arkengine?.chassisId);
  return { statusClass: "is-incomplete", label: commissioned ? `REFIT ATTENTION · ${validation.errors.length}` : `COMMISSIONING REQUIRED · ${validation.errors.length}` };
}

export function isArkflightShip(actor) { if (actor?.type !== "vehicle") return false; return actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor)); }

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ArkflightShipSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  constructor(options = {}) { super(options); this.activeTab = "overview"; }

  static DEFAULT_OPTIONS = {
    classes: ["arkflight", "arkflight-ship-sheet"],
    position: { width: 1080, height: 820 },
    window: { resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/ship/ship-sheet.hbs` }
  };

  get title() { return `${this.actor.name} — Arkflight Vessel`; }

  async _prepareContext(options = {}) {
    const data = await super._prepareContext(options);
    const ship = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
    const validation = validateShip(ship, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(ship, SHIP_CATALOGS);
    const sheetView = buildShipSheetView({ ship, derived, catalogs: SHIP_CATALOGS, resolveAssignment: resolveStationAssignment });
    const stats = derived.stats ?? {};
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
        view: sheetView, tags: [...(derived.tags ?? [])], capabilities: [...(derived.capabilities ?? [])], conditions: [...(ship.conditions ?? [])],
        validation: { ok: validation.ok, ...readiness, errors: [...validation.errors], warnings: [...validation.warnings] }
      }
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = this.element;
    for (const button of html.querySelectorAll("[data-tab]")) button.addEventListener("click", (event) => { event.preventDefault(); const tab = event.currentTarget.dataset.tab; if (!SHIP_SHEET_TABS.includes(tab)) return; this.activeTab = tab; this.render({ force: true }); });
    for (const input of html.querySelectorAll("[data-resource]")) input.addEventListener("change", async (event) => {
      if (!this.actor.isOwner) return;
      const key = event.currentTarget.dataset.resource; const ship = shipFlag(this.actor); if (!ship?.resources?.[key]) return;
      const derived = deriveShip(ship, SHIP_CATALOGS);
      const dynamicMax = key === "supplies" ? derived.stats.supplyCapacity : key === "morale" ? derived.stats.moraleCapacity : key === "hull" ? derived.stats.hullIntegrity : key === "lifeveil" ? derived.stats.lifeveilCapacity : key === "strain" ? derived.stats.strainCapacity : ship.resources[key].max;
      const max = statValue(dynamicMax); const requested = statValue(event.currentTarget.value); const value = max > 0 ? Math.max(0, Math.min(requested, max)) : Math.max(0, requested);
      await this.actor.update({ [`flags.${MODULE_ID}.ship.resources.${key}.value`]: value, [`flags.${MODULE_ID}.ship.resources.${key}.max`]: max });
    });
    for (const button of html.querySelectorAll("[data-compendium-pack]")) button.addEventListener("click", (event) => { event.preventDefault(); const packId = event.currentTarget.dataset.compendiumPack; const pack = game.packs?.get(packId); if (!pack) return ui.notifications?.warn(`Arkflight Compendium pack is not available yet: ${packId}`); pack.render(true); });
    html.querySelector("[data-open-shipwright]")?.addEventListener("click", (event) => {
      event.preventDefault();
      game.arkflight?.openShipwrightWorkspace?.(this.actor);
    });

    if (this.activeTab === "hold") openArkflightHold(this.actor, html);
    if (this.activeTab === "combat") renderArkflightCombatStations(this, html, this.actor);
  }
}

export function registerArkflightShipSheet() {
  if (game.system.id !== "pf2e") { console.warn("Arkflight | Ship sheet registration skipped: PF2e system is not active."); return; }
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    MODULE_ID,
    ArkflightShipSheet,
    { types: ["vehicle"], label: "Arkflight Vessel Sheet", makeDefault: false }
  );
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
