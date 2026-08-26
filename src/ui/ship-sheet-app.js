import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { createShip, SHIP_SYSTEM_KEYS, STATION_KEYS } from "../ship/ship-schema.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

const SYSTEM_LABELS = Object.freeze({ hull: "Hull", arkengine: "Arkengine", lifeveil: "Lifeveil", helm: "Helm", rigging: "Rigging", command: "Command", weapons: "Weapons" });
const STATION_LABELS = Object.freeze({ captain: "Captain", engineer: "Engineer", navigator: "Navigator", watchmaster: "Watchmaster", veilwarden: "Veilwarden" });
const SYSTEM_STATE_ORDER = Object.freeze(["functional", "damaged", "disabled", "destroyed"]);

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function clone(value) { return foundry.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value); }
function statValue(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function displayStat(value) { const n = statValue(value); return n === 0 ? "—" : n; }
function titleCase(value) { const text = String(value ?? ""); return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Unknown"; }
function catalogName(catalog, id, fallback = "Not commissioned") { return id && catalog?.[id]?.name ? catalog[id].name : fallback; }
function resolveStationAssignment(value) {
  if (!value) return "Unassigned";
  const actor = game.actors?.get(value) ?? game.actors?.find((entry) => entry.uuid === value);
  return actor?.name ?? String(value);
}
function resourceView(ship, key, label, icon) {
  const resource = ship.resources?.[key] ?? { value: 0, max: 0 };
  return { key, label, icon, value: statValue(resource.value), max: statValue(resource.max) };
}
function optionView(item, selectedId, extra = {}) {
  return { id: item.id, name: item.name, description: item.description, selected: item.id === selectedId, ...extra };
}

export function isArkflightShip(actor) {
  return actor?.type === "vehicle" && actor?.flags?.[MODULE_ID]?.isArkflightShip === true;
}

export class ArkflightShipSheet extends foundry.appv1.sheets.ActorSheet {
  constructor(...args) {
    super(...args);
    this.shipwrightMode = false;
    this.activeTab = "command";
    this._draftShip = null;
    this._draftDirty = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arkflight", "arkflight-ship-sheet"],
      width: 1080,
      height: 780,
      resizable: true,
      template: `modules/${MODULE_ID}/templates/ship/ship-sheet.hbs`
    });
  }

  get title() { return `${this.actor.name} — Arkflight Vessel`; }

  _ensureDraft(ship) {
    if (!this._draftShip || !this._draftDirty) this._draftShip = clone(ship);
    return this._draftShip;
  }

  _commissioningView(draft) {
    const hull = SHIP_CATALOGS.hulls?.[draft.hull?.chassisId] ?? null;
    const allowedEngines = hull?.data?.allowedArkengines ?? [];
    const compatibleEngines = Object.values(SHIP_CATALOGS.arkengines ?? {}).filter((engine) => !hull || !allowedEngines.length || allowedEngines.includes(engine.id));
    const validation = validateShip(draft, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(draft, SHIP_CATALOGS);
    const stats = derived.stats ?? {};

    return {
      hulls: Object.values(SHIP_CATALOGS.hulls ?? {}).map((item) => optionView(item, draft.hull?.chassisId, {
        tier: item.data?.tier ?? "—",
        role: item.tags?.filter((tag) => tag !== "core-hull").slice(0, 3).join(" · ") ?? "",
        base: item.data?.baseStats ?? {}
      })),
      hullPatterns: Object.values(SHIP_CATALOGS.hullPatterns ?? {}).map((item) => optionView(item, draft.hull?.patternId)),
      arkengines: compatibleEngines.map((item) => optionView(item, draft.arkengine?.chassisId, {
        tier: item.data?.tier ?? "—",
        preferred: hull?.data?.preferredArkengine === item.id,
        modCapacity: item.data?.modCapacity ?? 0,
        fuelSlots: item.data?.fuelSlots ?? 0
      })),
      arkenginePatterns: Object.values(SHIP_CATALOGS.arkenginePatterns ?? {}).map((item) => optionView(item, draft.arkengine?.patternId)),
      hasHull: !!hull,
      hasEngine: !!SHIP_CATALOGS.arkengines?.[draft.arkengine?.chassisId],
      hullName: catalogName(SHIP_CATALOGS.hulls, draft.hull?.chassisId, "Choose Hull"),
      hullPatternName: draft.hull?.chassisId ? catalogName(SHIP_CATALOGS.hullPatterns, draft.hull?.patternId, "Choose Pattern") : "—",
      engineName: catalogName(SHIP_CATALOGS.arkengines, draft.arkengine?.chassisId, "Choose Arkengine"),
      enginePatternName: draft.arkengine?.chassisId ? catalogName(SHIP_CATALOGS.arkenginePatterns, draft.arkengine?.patternId, "Choose Pattern") : "—",
      previewStats: [
        { label: "Armor", value: displayStat(stats.armorClass) },
        { label: "Hull", value: displayStat(stats.hullIntegrity) },
        { label: "Lifeveil", value: displayStat(stats.lifeveilCapacity) },
        { label: "Strain", value: displayStat(stats.strainCapacity) },
        { label: "Cargo", value: displayStat(stats.cargoCapacity) },
        { label: "Speed", value: displayStat(stats.combatSpeed) },
        { label: "Maneuver", value: displayStat(stats.maneuverability) },
        { label: "Detection", value: displayStat(stats.detection) }
      ],
      usage: derived.usage,
      validation: { ok: validation.ok, errors: [...validation.errors], warnings: [...validation.warnings] },
      canCommission: game.user.isGM && validation.ok,
      dirty: this._draftDirty
    };
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const ship = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
    const validation = validateShip(ship, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(ship, SHIP_CATALOGS);
    const hull = SHIP_CATALOGS.hulls?.[ship.hull?.chassisId] ?? null;
    const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId] ?? null;
    const conditionsBySystem = Object.fromEntries(SHIP_SYSTEM_KEYS.map((key) => [key, []]));
    for (const condition of ship.conditions ?? []) if (conditionsBySystem[condition?.system]) conditionsBySystem[condition.system].push(condition);

    const systems = SHIP_SYSTEM_KEYS.map((key) => ({
      key, label: SYSTEM_LABELS[key] ?? titleCase(key), state: ship.systems?.[key] ?? "functional",
      stateLabel: titleCase(ship.systems?.[key] ?? "functional"), stateClass: `is-${ship.systems?.[key] ?? "functional"}`,
      conditionCount: conditionsBySystem[key]?.length ?? 0
    }));
    const stations = STATION_KEYS.map((key) => ({ key, label: STATION_LABELS[key] ?? titleCase(key), assignment: resolveStationAssignment(ship.crew?.stations?.[key]) }));
    const stats = derived.stats ?? {};
    const crew = stats.crew ?? {};
    const cargoUsed = statValue(ship.cargo?.used);
    const cargoCapacity = statValue(stats.cargoCapacity);
    const draft = this._ensureDraft(ship);

    return {
      ...data,
      arkflight: {
        marked: isArkflightShip(this.actor), actorUuid: this.actor.uuid, actorImg: this.actor.img,
        isGM: game.user.isGM, canOperate: this.actor.isOwner,
        shipwrightMode: game.user.isGM && this.shipwrightMode,
        isCommandTab: this.activeTab === "command", isShipwrightTab: this.activeTab === "shipwright",
        ship,
        hullName: catalogName(SHIP_CATALOGS.hulls, ship.hull?.chassisId),
        hullPatternName: ship.hull?.chassisId ? catalogName(SHIP_CATALOGS.hullPatterns, ship.hull?.patternId, "Not selected") : "—",
        arkengineName: catalogName(SHIP_CATALOGS.arkengines, ship.arkengine?.chassisId),
        arkenginePatternName: ship.arkengine?.chassisId ? catalogName(SHIP_CATALOGS.arkenginePatterns, ship.arkengine?.patternId, "Not selected") : "—",
        tier: hull?.data?.tier ?? engine?.data?.tier ?? "—",
        resources: [resourceView(ship, "hull", "Hull", "fa-shield-halved"), resourceView(ship, "lifeveil", "Lifeveil", "fa-sparkles"), resourceView(ship, "strain", "Strain", "fa-gauge-high"), resourceView(ship, "supplies", "Supplies", "fa-boxes-stacked"), resourceView(ship, "morale", "Morale", "fa-flag")],
        stats: [
          { label: "Armor", value: displayStat(stats.armorClass) }, { label: "Speed", value: displayStat(stats.combatSpeed) },
          { label: "Maneuver", value: displayStat(stats.maneuverability) }, { label: "Detection", value: displayStat(stats.detection) },
          { label: "Cargo", value: cargoCapacity ? `${cargoUsed} / ${cargoCapacity}` : "—" }
        ],
        crew: { minimum: statValue(crew.minimum), recommended: statValue(crew.recommended), maximum: statValue(crew.maximum), specialists: ship.crew?.specialists?.length ?? 0 },
        systems, stations, tags: [...(derived.tags ?? [])], capabilities: [...(derived.capabilities ?? [])], conditions: [...(ship.conditions ?? [])],
        validation: { ok: validation.ok, statusClass: validation.ok ? "is-ready" : "is-incomplete", label: validation.ok ? "VOYAGE READY" : "COMMISSIONING REQUIRED", errors: [...validation.errors], warnings: [...validation.warnings] },
        commissioning: this._commissioningView(draft)
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
        if (tab === "shipwright" && !game.user.isGM) return;
        if (!["command", "shipwright"].includes(tab)) return;
        this.activeTab = tab;
        if (tab === "shipwright") this.shipwrightMode = true;
        this.render(false);
      });
    }

    html.querySelector('[data-action="shipwright-mode"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!game.user.isGM) return;
      this.shipwrightMode = !this.shipwrightMode;
      this.activeTab = this.shipwrightMode ? "shipwright" : "command";
      this.render(false);
    });

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

    for (const button of html.querySelectorAll("[data-system-state]")) {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!game.user.isGM || !this.shipwrightMode) return;
        const key = event.currentTarget.dataset.systemState;
        const ship = shipFlag(this.actor);
        if (!SHIP_SYSTEM_KEYS.includes(key) || !ship) return;
        const current = ship.systems?.[key] ?? "functional";
        const index = SYSTEM_STATE_ORDER.indexOf(current);
        const next = SYSTEM_STATE_ORDER[(index + 1) % SYSTEM_STATE_ORDER.length];
        await this.actor.update({ [`flags.${MODULE_ID}.ship.systems.${key}`]: next });
      });
    }

    for (const button of html.querySelectorAll("[data-commission-field]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (!game.user.isGM) return;
        const field = event.currentTarget.dataset.commissionField;
        const id = event.currentTarget.dataset.id;
        const persistent = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
        const draft = this._ensureDraft(persistent);
        if (field === "hull") {
          draft.hull.chassisId = id;
          const hull = SHIP_CATALOGS.hulls?.[id];
          const allowed = hull?.data?.allowedArkengines ?? [];
          if (draft.arkengine.chassisId && allowed.length && !allowed.includes(draft.arkengine.chassisId)) draft.arkengine.chassisId = "";
        } else if (field === "hullPattern") {
          draft.hull.patternId = id;
        } else if (field === "arkengine") {
          draft.arkengine.chassisId = id;
        } else if (field === "arkenginePattern") {
          draft.arkengine.patternId = id;
        } else return;
        this._draftDirty = true;
        this.activeTab = "shipwright";
        this.render(false);
      });
    }

    html.querySelector('[data-action="reset-commissioning"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      this._draftShip = clone(shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } }));
      this._draftDirty = false;
      this.render(false);
    });

    html.querySelector('[data-action="commission-vessel"]')?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!game.user.isGM || !this._draftShip) return;
      const validation = validateShip(this._draftShip, SHIP_CATALOGS);
      if (!validation.ok) {
        ui.notifications?.warn("Arkflight vessel cannot be commissioned until all commissioning errors are resolved.");
        return;
      }
      const commissioned = syncResourceMaxima(clone(this._draftShip), validation.derived);
      await this.actor.update({ [`flags.${MODULE_ID}.ship`]: commissioned });
      this._draftShip = clone(commissioned);
      this._draftDirty = false;
      this.shipwrightMode = false;
      this.activeTab = "command";
      ui.notifications?.info(`${this.actor.name} commissioned as an Arkflight vessel.`);
      this.render(false);
    });
  }
}

export function registerArkflightShipSheet() {
  if (game.system.id !== "pf2e") { console.warn("Arkflight | Ship sheet registration skipped: PF2e system is not active."); return; }
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, ArkflightShipSheet, { types: ["vehicle"], label: "Arkflight Vessel Sheet", makeDefault: false });
}

export async function markVehicleAsArkflightShip(actor) {
  if (!actor || actor.type !== "vehicle") throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  const existingShip = shipFlag(actor);
  const ship = existingShip ?? createShip({ identity: { name: actor.name || "Unnamed Vessel" } });
  await actor.update({ [`flags.${MODULE_ID}.isArkflightShip`]: true, [`flags.${MODULE_ID}.ship`]: ship, "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID });
  return actor;
}
