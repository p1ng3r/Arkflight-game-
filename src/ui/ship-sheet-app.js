import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { createShip, SHIP_SYSTEM_KEYS, STATION_KEYS } from "../ship/ship-schema.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

const SYSTEM_LABELS = Object.freeze({
  hull: "Hull",
  arkengine: "Arkengine",
  lifeveil: "Lifeveil",
  helm: "Helm",
  rigging: "Rigging",
  command: "Command",
  weapons: "Weapons"
});

const STATION_LABELS = Object.freeze({
  captain: "Captain",
  engineer: "Engineer",
  navigator: "Navigator",
  watchmaster: "Watchmaster",
  veilwarden: "Veilwarden"
});

const SYSTEM_STATE_ORDER = Object.freeze(["functional", "damaged", "disabled", "destroyed"]);

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function catalogName(catalog, id, fallback = "Not commissioned") {
  return id && catalog?.[id]?.name ? catalog[id].name : fallback;
}

function statValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function displayStat(value) {
  const numeric = statValue(value);
  return numeric === 0 ? "—" : numeric;
}

function titleCase(value) {
  const text = String(value ?? "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Unknown";
}

function resolveStationAssignment(value) {
  if (!value) return "Unassigned";
  const actor = game.actors?.get(value) ?? game.actors?.find((entry) => entry.uuid === value);
  return actor?.name ?? String(value);
}

function resourceView(ship, key, label, icon) {
  const resource = ship.resources?.[key] ?? { value: 0, max: 0 };
  return {
    key,
    label,
    icon,
    value: statValue(resource.value),
    max: statValue(resource.max)
  };
}

export function isArkflightShip(actor) {
  return actor?.type === "vehicle" && actor?.flags?.[MODULE_ID]?.isArkflightShip === true;
}

export class ArkflightShipSheet extends foundry.appv1.sheets.ActorSheet {
  constructor(...args) {
    super(...args);
    this.shipwrightMode = false;
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

  get title() {
    return `${this.actor.name} — Arkflight Vessel`;
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const ship = shipFlag(this.actor) ?? createShip({ identity: { name: this.actor.name || "Unnamed Vessel" } });
    const validation = validateShip(ship, SHIP_CATALOGS);
    const derived = validation.derived ?? deriveShip(ship, SHIP_CATALOGS);
    const hull = SHIP_CATALOGS.hulls?.[ship.hull?.chassisId] ?? null;
    const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId] ?? null;
    const conditionsBySystem = Object.fromEntries(SHIP_SYSTEM_KEYS.map((key) => [key, []]));

    for (const condition of ship.conditions ?? []) {
      const key = condition?.system;
      if (conditionsBySystem[key]) conditionsBySystem[key].push(condition);
    }

    const systems = SHIP_SYSTEM_KEYS.map((key) => ({
      key,
      label: SYSTEM_LABELS[key] ?? titleCase(key),
      state: ship.systems?.[key] ?? "functional",
      stateLabel: titleCase(ship.systems?.[key] ?? "functional"),
      stateClass: `is-${ship.systems?.[key] ?? "functional"}`,
      conditionCount: conditionsBySystem[key]?.length ?? 0
    }));

    const stations = STATION_KEYS.map((key) => ({
      key,
      label: STATION_LABELS[key] ?? titleCase(key),
      assignment: resolveStationAssignment(ship.crew?.stations?.[key])
    }));

    const stats = derived.stats ?? {};
    const crew = stats.crew ?? {};
    const cargoUsed = statValue(ship.cargo?.used);
    const cargoCapacity = statValue(stats.cargoCapacity);

    return {
      ...data,
      arkflight: {
        marked: isArkflightShip(this.actor),
        actorUuid: this.actor.uuid,
        actorImg: this.actor.img,
        isGM: game.user.isGM,
        canOperate: this.actor.isOwner,
        shipwrightMode: game.user.isGM && this.shipwrightMode,
        ship,
        hullName: catalogName(SHIP_CATALOGS.hulls, ship.hull?.chassisId),
        hullPatternName: catalogName(SHIP_CATALOGS.hullPatterns, ship.hull?.patternId, "Standard Pattern"),
        arkengineName: catalogName(SHIP_CATALOGS.arkengines, ship.arkengine?.chassisId),
        arkenginePatternName: catalogName(SHIP_CATALOGS.arkenginePatterns, ship.arkengine?.patternId, "Standard Pattern"),
        tier: hull?.data?.tier ?? engine?.data?.tier ?? "—",
        resources: [
          resourceView(ship, "hull", "Hull", "fa-shield-halved"),
          resourceView(ship, "lifeveil", "Lifeveil", "fa-sparkles"),
          resourceView(ship, "strain", "Strain", "fa-gauge-high"),
          resourceView(ship, "supplies", "Supplies", "fa-boxes-stacked"),
          resourceView(ship, "morale", "Morale", "fa-flag")
        ],
        stats: [
          { label: "Armor", value: displayStat(stats.armorClass) },
          { label: "Speed", value: displayStat(stats.combatSpeed) },
          { label: "Maneuver", value: displayStat(stats.maneuverability) },
          { label: "Detection", value: displayStat(stats.detection) },
          { label: "Cargo", value: cargoCapacity ? `${cargoUsed} / ${cargoCapacity}` : "—" }
        ],
        crew: {
          minimum: statValue(crew.minimum),
          recommended: statValue(crew.recommended),
          maximum: statValue(crew.maximum),
          specialists: ship.crew?.specialists?.length ?? 0
        },
        systems,
        stations,
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

    html.querySelector('[data-action="shipwright-mode"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!game.user.isGM) return;
      this.shipwrightMode = !this.shipwrightMode;
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
  if (!actor || actor.type !== "vehicle") {
    throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  }

  const existingShip = shipFlag(actor);
  const ship = existingShip ?? createShip({
    identity: {
      name: actor.name || "Unnamed Vessel"
    }
  });

  await actor.update({
    [`flags.${MODULE_ID}.isArkflightShip`]: true,
    [`flags.${MODULE_ID}.ship`]: ship,
    "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID
  });

  return actor;
}
