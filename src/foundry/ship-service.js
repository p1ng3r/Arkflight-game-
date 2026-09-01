import { SHIP_CATALOGS } from "../content/index.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
const CURRENT_SHIP_SETTING = "currentShipActorId";

function extractShip(actor) {
  return actor?.flags?.[MODULE_ID]?.ship
    ?? actor?.system?.arkflight?.ship
    ?? actor?.system?.flags?.arkflight?.ship
    ?? null;
}

function isArkflightShipActor(actor) {
  if (!actor) return false;
  const ship = extractShip(actor);
  return Boolean(ship && (actor.type === "vehicle" || ship.schemaVersion));
}

function componentNames(ids = [], catalog = {}) {
  return ids.map((id) => catalog?.[id]?.name ?? id).filter(Boolean);
}

function weaponNames(installs = []) {
  return installs.map((install) => {
    const id = typeof install === "string" ? install : install?.id;
    return SHIP_CATALOGS.weapons?.[id]?.name ?? id;
  }).filter(Boolean);
}

function stationReadiness(ship) {
  const stations = Object.entries(ship?.crew?.stations ?? {});
  const assigned = stations.filter(([, actorId]) => Boolean(actorId)).length;
  return { assigned, total: stations.length, ready: stations.length > 0 && assigned === stations.length };
}

function damagedSystems(ship) {
  return Object.entries(ship?.systems ?? {})
    .filter(([, state]) => state && state !== "functional")
    .map(([system, state]) => ({ system, state }));
}

function normalizeActor(actor, currentPlayerShipId) {
  const ship = extractShip(actor);
  const validation = validateShip(ship, SHIP_CATALOGS);
  const crew = stationReadiness(ship);
  const damage = damagedSystems(ship);
  const player = Boolean(actor.hasPlayerOwner);
  const resources = ship.resources ?? {};

  return {
    id: actor.id,
    uuid: actor.uuid,
    actor,
    ship,
    name: actor.name ?? ship.identity?.name ?? "Unnamed Vessel",
    level: Number(ship.level ?? actor.system?.details?.level?.value ?? 0) || null,
    player,
    isNPC: !player,
    current: player && actor.id === currentPlayerShipId,
    status: !validation.ok ? "Invalid" : damage.length ? "Damaged" : crew.ready ? "Ready" : "Needs Crew",
    validation,
    derived: validation.derived,
    resources,
    cargo: ship.cargo ?? { used: 0 },
    crew,
    damagedSystems: damage,
    conditions: ship.conditions ?? [],
    hullName: SHIP_CATALOGS.hulls?.[ship.hull?.chassisId]?.name ?? ship.hull?.chassisId ?? "Unassigned Hull",
    hullPatternName: SHIP_CATALOGS.hullPatterns?.[ship.hull?.patternId]?.name ?? ship.hull?.patternId ?? "Standard",
    arkengineName: SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId]?.name ?? ship.arkengine?.chassisId ?? "Unassigned Arkengine",
    arkenginePatternName: SHIP_CATALOGS.arkenginePatterns?.[ship.arkengine?.patternId]?.name ?? ship.arkengine?.patternId ?? "Standard",
    roomNames: componentNames(ship.rooms, SHIP_CATALOGS.rooms),
    shipModNames: componentNames(ship.shipMods, SHIP_CATALOGS.shipMods),
    arkengineModNames: componentNames(ship.arkengine?.modIds, SHIP_CATALOGS.arkengineMods),
    weaponNames: weaponNames(ship.weapons),
    counts: {
      rooms: ship.rooms?.length ?? 0,
      shipMods: ship.shipMods?.length ?? 0,
      arkengineMods: ship.arkengine?.modIds?.length ?? 0,
      weapons: ship.weapons?.length ?? 0,
      specialists: ship.crew?.specialists?.length ?? 0
    }
  };
}

export function registerShipServiceSetting() {
  game.settings.register(MODULE_ID, CURRENT_SHIP_SETTING, {
    name: "Current Arkflight Player Ship",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export function createShipService() {
  return {
    list() {
      const currentId = game.settings.get(MODULE_ID, CURRENT_SHIP_SETTING) || "";
      return (game.actors?.contents ?? [])
        .filter(isArkflightShipActor)
        .map((actor) => normalizeActor(actor, currentId))
        .sort((a, b) => Number(b.current) - Number(a.current) || Number(b.player) - Number(a.player) || a.name.localeCompare(b.name));
    },

    get(actorId) {
      return this.list().find((entry) => entry.id === actorId) ?? null;
    },

    getCurrent() {
      const rows = this.list();
      return rows.find((entry) => entry.current) ?? rows.find((entry) => entry.player) ?? null;
    },

    async setCurrent(actorId) {
      const entry = this.get(actorId);
      if (!entry) throw new Error("That Actor is not an Arkflight ship.");
      if (!entry.player) throw new Error("Only a player Arkflight ship can be designated as the Current Player Ship.");
      await game.settings.set(MODULE_ID, CURRENT_SHIP_SETTING, actorId);
      return this.get(actorId);
    },

    openSheet(actorId) {
      const actor = game.actors.get(actorId);
      if (!actor) throw new Error("Arkflight ship Actor could not be found.");
      return actor.sheet?.render({ force: true });
    },

    openShipwright(actorId) {
      const entry = this.get(actorId);
      if (!entry) throw new Error("Arkflight ship Actor could not be found.");
      const api = game.arkflight?.shipwright;
      if (typeof api?.open === "function") return api.open(entry.actor);
      if (typeof api?.openForActor === "function") return api.openForActor(entry.actor);
      throw new Error("The Arkflight Shipwright UI is not available yet.");
    },

    canOpenShipwright() {
      const api = game.arkflight?.shipwright;
      return typeof api?.open === "function" || typeof api?.openForActor === "function";
    }
  };
}
