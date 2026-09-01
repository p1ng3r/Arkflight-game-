import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { createShip } from "../ship/ship-schema.js";
import { validateShip } from "../ship/validate-ship.js";
import { buildShipSheetView, SHIP_SHEET_TABS } from "./ship-sheet-view-model.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function statValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function catalogName(catalog, id, fallback = "Not commissioned") {
  return id && catalog?.[id]?.name ? catalog[id].name : fallback;
}

function resolveStationAssignment(value) {
  if (!value) return "Unassigned";
  const actor = game.actors?.get(value) ?? game.actors?.find((entry) => entry.uuid === value);
  return actor?.name ?? String(value);
}

function resourceView(ship, key, label, icon) {
  const resource = ship.resources?.[key] ?? { value: 0, max: 0 };
  return { key, label, icon, value: statValue(resource.value), max: statValue(resource.max) };
}

function tabState(activeTab) {
  return Object.freeze({
    overview: activeTab === "overview",
    fittings: activeTab === "fittings",
    refit: activeTab === "refit"
  });
}

function fittingCapacity(label, used, max) {
  return Object.freeze({ label, used: statValue(used), max: statValue(max) });
}

export function isArkflightShip(actor) {
  if (actor?.type !== "vehicle") return false;
  return actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor));
}

export class ArkflightShipSheet extends foundry.appv1.sheets.ActorSheet {
  constructor(...args) {
    super(...args);
    this.activeTab = "overview";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arkflight", "arkflight-ship-sheet"],
      width: 1080,
      height: 820,
      resizable: true,
      template: `modules/${MODULE_ID}/templates/ship/ship-sheet.hbs`
    });
  }

  get title() {
    return `${this.actor.name} — Arkflight Vessel`;
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const ship = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
    const validation = validateShip(ship, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(ship, SHIP_CATALOGS);
    const sheetView = buildShipSheetView({
      ship,
      derived,
      catalogs: SHIP_CATALOGS,
      resolveAssignment: resolveStationAssignment
    });
    const stats = derived.stats ?? {};
    const canManageRefit = Boolean(game.user.isGM || this.actor.isOwner);

    return {
      ...data,
      arkflight: {
        marked: isArkflightShip(this.actor),
        actorUuid: this.actor.uuid,
        actorImg: this.actor.img,
        isGM: game.user.isGM,
        canOperate: this.actor.isOwner,
        canManageRefit,
        activeTab: this.activeTab,
        tab: tabState(this.activeTab),
        ship,
        hullName: catalogName(SHIP_CATALOGS.hulls, ship.hull?.chassisId),
        hullPatternName: ship.hull?.chassisId ? catalogName(SHIP_CATALOGS.hullPatterns, ship.hull?.patternId, "Not selected") : "—",
        arkengineName: catalogName(SHIP_CATALOGS.arkengines, ship.arkengine?.chassisId),
        arkenginePatternName: ship.arkengine?.chassisId ? catalogName(SHIP_CATALOGS.arkenginePatterns, ship.arkengine?.patternId, "Not selected") : "—",
        level: ship.progression?.level ?? 1,
        resources: [
          resourceView(ship, "hull", "Hull", "fa-shield-halved"),
          resourceView(ship, "lifeveil", "Lifeveil", "fa-sparkles"),
          resourceView(ship, "strain", "Strain", "fa-gauge-high"),
          resourceView(ship, "supplies", "Supplies", "fa-boxes-stacked"),
          resourceView(ship, "morale", "Morale", "fa-flag")
        ],
        cargoUsed: statValue(ship.cargo?.used),
        cargoCapacity: statValue(stats.cargoCapacity),
        fittingCapacity: {
          rooms: fittingCapacity("Rooms", derived.usage?.rooms, stats.roomCapacity),
          shipMods: fittingCapacity("Ship Mods", derived.usage?.shipMods, stats.shipModCapacity),
          arkengineMods: fittingCapacity("Arkengine Mods", derived.usage?.arkengineMods, stats.arkengineModCapacity)
        },
        view: sheetView,
        tags: [...(derived.tags ?? [])],
        capabilities: [...(derived.capabilities ?? [])],
        conditions: [...(ship.conditions ?? [])],
        validation: {
          ok: validation.ok,
          statusClass: validation.ok ? "is-ready" : "is-incomplete",
          label: validation.ok ? "VOYAGE READY" : "COMMISSIONING REQUIRED",
          errors: [...validation.errors],
          warnings: [...validation.warnings]
        }
      }
    };
  }

  activateListeners($html) {
    super.activateListeners($html);
    const html = $html[0];

    for (const button of html.querySelectorAll("[data-tab]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const tab = event.currentTarget.dataset.tab;
        if (!SHIP_SHEET_TABS.includes(tab)) return;
        this.activeTab = tab;
        this.render(false);
      });
    }

    for (const input of html.querySelectorAll("[data-resource]")) {
      input.addEventListener("change", async (event) => {
        if (!this.actor.isOwner) return;
        const key = event.currentTarget.dataset.resource;
        const ship = shipFlag(this.actor);
        if (!ship?.resources?.[key]) return;
        const max = statValue(ship.resources[key].max);
        const requested = statValue(event.currentTarget.value);
        const value = max > 0 ? Math.max(0, Math.min(requested, max)) : Math.max(0, requested);
        await this.actor.update({ [`flags.${MODULE_ID}.ship.resources.${key}.value`]: value });
      });
    }

    for (const button of html.querySelectorAll("[data-compendium-pack]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const packId = event.currentTarget.dataset.compendiumPack;
        const pack = game.packs?.get(packId);
        if (!pack) {
          ui.notifications?.warn(`Arkflight Compendium pack is not available yet: ${packId}`);
          return;
        }
        pack.render(true);
      });
    }
  }
}

export function registerArkflightShipSheet() {
  if (game.system.id !== "pf2e") {
    console.warn("Arkflight | Ship sheet registration skipped: PF2e system is not active.");
    return;
  }
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, ArkflightShipSheet, {
    types: ["vehicle"],
    label: "Arkflight Vessel Sheet",
    makeDefault: false
  });
}

export async function markVehicleAsArkflightShip(actor) {
  if (!actor || actor.type !== "vehicle") throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  const existingShip = shipFlag(actor);
  const ship = existingShip ?? createShip({ identity: { name: actor.name || "Unnamed Vessel" } });
  await actor.update({
    [`flags.${MODULE_ID}.isArkflightShip`]: true,
    [`flags.${MODULE_ID}.ship`]: ship,
    "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID
  });
  return actor;
}
