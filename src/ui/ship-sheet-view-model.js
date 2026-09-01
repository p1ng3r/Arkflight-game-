import { SHIP_AREA_KEYS, STATION_KEYS, AREA_STATES } from "../ship/ship-schema.js";
import {
  DERIVED_STAT_PRESENTATION,
  derivedStatsByPresentation
} from "../ship/derived-stat-registry.js";

export const SHIP_SHEET_TABS = Object.freeze(["overview", "fittings", "refit"]);

export const AREA_PRESENTATION = Object.freeze({
  hull: Object.freeze({ label: "Hull", station: "battlewatch", icon: "fa-shield-halved" }),
  arkengine: Object.freeze({ label: "Arkengine", station: "engineer", icon: "fa-gears" }),
  rigging: Object.freeze({ label: "Rigging", station: "navigator", icon: "fa-sailboat" }),
  lifeveil: Object.freeze({ label: "Lifeveil", station: "veilwarden", icon: "fa-sparkles" }),
  morale: Object.freeze({ label: "Morale", station: "captain", icon: "fa-flag" })
});

export const STATION_PRESENTATION = Object.freeze({
  captain: "Captain",
  engineer: "Engineer",
  navigator: "Navigator",
  battlewatch: "Battlewatch",
  veilwarden: "Veilwarden"
});

export const AREA_STATION_PENALTIES = Object.freeze({
  [AREA_STATES.STABLE]: 0,
  [AREA_STATES.STRESSED]: -1,
  [AREA_STATES.DAMAGED]: -3,
  [AREA_STATES.CRITICAL]: -5,
  [AREA_STATES.DISABLED]: -10
});

export const AREA_CONSEQUENCES = Object.freeze({
  hull: Object.freeze({
    [AREA_STATES.STABLE]: "Hull structure is fully operational.",
    [AREA_STATES.STRESSED]: "Battlewatch operates at -1 from Hull stress.",
    [AREA_STATES.DAMAGED]: "Battlewatch operates at -3 and ship attacks suffer the Hull-area penalty.",
    [AREA_STATES.CRITICAL]: "Battlewatch operates at -5 and the hull is near structural failure.",
    [AREA_STATES.DISABLED]: "Battlewatch normal Hull functions are unavailable; the vessel is structurally disabled."
  }),
  arkengine: Object.freeze({
    [AREA_STATES.STABLE]: "Arkengine is fully operational.",
    [AREA_STATES.STRESSED]: "Engineer operates at -1 from Arkengine stress.",
    [AREA_STATES.DAMAGED]: "Engineer operates at -3 and powered performance is degraded.",
    [AREA_STATES.CRITICAL]: "Engineer operates at -5 and powered movement is severely limited.",
    [AREA_STATES.DISABLED]: "Normal powered Arkengine function is unavailable."
  }),
  rigging: Object.freeze({
    [AREA_STATES.STABLE]: "Rigging and facing control are fully operational.",
    [AREA_STATES.STRESSED]: "Navigator operates at -1 from Rigging stress.",
    [AREA_STATES.DAMAGED]: "Navigator operates at -3 and facing control is degraded.",
    [AREA_STATES.CRITICAL]: "Navigator operates at -5 and Rigging control is severely limited.",
    [AREA_STATES.DISABLED]: "Normal Rigging and facing-control functions are unavailable."
  }),
  lifeveil: Object.freeze({
    [AREA_STATES.STABLE]: "Lifeveil systems are fully operational.",
    [AREA_STATES.STRESSED]: "Veilwarden operates at -1 from Lifeveil stress.",
    [AREA_STATES.DAMAGED]: "Veilwarden operates at -3 and Lifeveil integrity is reduced.",
    [AREA_STATES.CRITICAL]: "Veilwarden operates at -5 and Lifeveil integrity is critically reduced.",
    [AREA_STATES.DISABLED]: "Normal Lifeveil-area function is unavailable; environmental protection may be offline."
  }),
  morale: Object.freeze({
    [AREA_STATES.STABLE]: "Command cohesion is fully operational.",
    [AREA_STATES.STRESSED]: "Captain operates at -1 from Morale-area stress.",
    [AREA_STATES.DAMAGED]: "Captain operates at -3 as command cohesion deteriorates.",
    [AREA_STATES.CRITICAL]: "Captain operates at -5 as command cohesion nears collapse.",
    [AREA_STATES.DISABLED]: "Normal Morale-area command functions are unavailable."
  })
});

export const SHIP_COMPENDIUM_PACKS = Object.freeze({
  hulls: "arkflight-game.hulls-and-patterns",
  arkengines: "arkflight-game.arkengines",
  shipMods: "arkflight-game.ship-mods",
  arkengineMods: "arkflight-game.arkengine-mods",
  rooms: "arkflight-game.rooms",
  weapons: "arkflight-game.ship-weapons",
  talents: "arkflight-game.ship-talents"
});

function titleCase(value) {
  const text = String(value ?? "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Unknown";
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function displayValue(value) {
  if (value && typeof value === "object") return value;
  return numeric(value);
}

function resolveCatalog(catalog, id) {
  return id ? catalog?.[id] ?? null : null;
}

function fitting(catalog, id, family, extra = {}) {
  const item = resolveCatalog(catalog, id);
  return Object.freeze({
    id,
    family,
    name: item?.name ?? id ?? "Unknown fitting",
    description: item?.description ?? "",
    rarity: item?.data?.rarity ?? item?.rarity ?? "standard",
    capacityCost: numeric(item?.capacityCost),
    ...extra
  });
}

export function areaPenalty(state) {
  return AREA_STATION_PENALTIES[state] ?? 0;
}

export function buildAreaViews(ship = {}) {
  return Object.freeze(SHIP_AREA_KEYS.map((area) => {
    const presentation = AREA_PRESENTATION[area];
    const state = ship.areas?.[area]?.state ?? AREA_STATES.STABLE;
    const penalty = areaPenalty(state);
    return Object.freeze({
      key: area,
      label: presentation.label,
      icon: presentation.icon,
      state,
      stateLabel: titleCase(state),
      stateClass: `is-${state}`,
      station: presentation.station,
      stationLabel: STATION_PRESENTATION[presentation.station],
      penalty,
      penaltyLabel: penalty === 0 ? "No penalty" : `${penalty} station penalty`,
      consequence: AREA_CONSEQUENCES[area]?.[state] ?? ""
    });
  }));
}

export function buildStationViews(ship = {}, resolveAssignment = (value) => value ?? "Unassigned") {
  return Object.freeze(STATION_KEYS.map((station) => Object.freeze({
    key: station,
    label: STATION_PRESENTATION[station],
    assignment: resolveAssignment(ship.crew?.stations?.[station]) || "Unassigned"
  })));
}

function statRows(stats, presentation) {
  return Object.freeze(derivedStatsByPresentation(presentation)
    .filter((definition) => !definition.path.includes("."))
    .map((definition) => Object.freeze({
      key: definition.path,
      label: definition.label,
      category: definition.category,
      value: displayValue(stats?.[definition.path])
    })));
}

export function buildStatPresentation(stats = {}) {
  return Object.freeze({
    primary: statRows(stats, DERIVED_STAT_PRESENTATION.PRIMARY),
    operational: statRows(stats, DERIVED_STAT_PRESENTATION.OPERATIONAL),
    technical: statRows(stats, DERIVED_STAT_PRESENTATION.TECHNICAL)
  });
}

export function buildInstalledFittings(ship = {}, catalogs = {}) {
  const hull = resolveCatalog(catalogs.hulls, ship.hull?.chassisId);
  const arkengine = resolveCatalog(catalogs.arkengines, ship.arkengine?.chassisId);
  const talentIds = ship.progression?.talentIds ?? [];
  return Object.freeze({
    hull: hull ? fitting(catalogs.hulls, hull.id, "hull", { patternId: ship.hull?.patternId ?? null }) : null,
    arkengine: arkengine ? fitting(catalogs.arkengines, arkengine.id, "arkengine", { patternId: ship.arkengine?.patternId ?? null }) : null,
    rooms: Object.freeze((ship.rooms ?? []).map((id) => fitting(catalogs.rooms, id, "room"))),
    shipMods: Object.freeze((ship.shipMods ?? []).map((id) => fitting(catalogs.shipMods, id, "shipMod"))),
    arkengineMods: Object.freeze((ship.arkengine?.modIds ?? []).map((id) => fitting(catalogs.arkengineMods, id, "arkengineMod"))),
    weapons: Object.freeze((ship.weapons ?? []).map((entry) => {
      const id = typeof entry === "string" ? entry : entry?.id;
      return fitting(catalogs.weapons, id, "weapon", typeof entry === "object" ? { install: entry } : {});
    })),
    talents: Object.freeze(talentIds.map((id) => fitting(catalogs.shipTalents, id, "talent")))
  });
}

export function buildRefitInventory(ship = {}, catalogs = {}) {
  const physicalShipMods = Object.entries(ship.inventory?.shipMods ?? {}).flatMap(([id, quantity]) => {
    const count = Math.max(0, Math.trunc(Number(quantity) || 0));
    return count > 0 ? [Object.freeze({ ...fitting(catalogs.shipMods, id, "shipMod"), quantity: count })] : [];
  });
  const physicalArkengineMods = Object.entries(ship.inventory?.arkengineMods ?? {}).flatMap(([id, quantity]) => {
    const count = Math.max(0, Math.trunc(Number(quantity) || 0));
    return count > 0 ? [Object.freeze({ ...fitting(catalogs.arkengineMods, id, "arkengineMod"), quantity: count })] : [];
  });
  return Object.freeze({
    shipMods: Object.freeze(physicalShipMods),
    arkengineMods: Object.freeze(physicalArkengineMods),
    workOrders: Object.freeze((ship.refit?.workOrders ?? []).map((entry) => Object.freeze({ ...entry }))),
    blueprints: Object.freeze({
      shipMods: Object.freeze([...(ship.blueprints?.shipModIds ?? [])]),
      arkengineMods: Object.freeze([...(ship.blueprints?.arkengineModIds ?? [])])
    })
  });
}

export function buildShipSheetView({ ship, derived, catalogs, resolveAssignment } = {}) {
  const stats = derived?.stats ?? {};
  return Object.freeze({
    tabs: SHIP_SHEET_TABS,
    areas: buildAreaViews(ship),
    stations: buildStationViews(ship, resolveAssignment),
    stats: buildStatPresentation(stats),
    fittings: buildInstalledFittings(ship, catalogs),
    refit: buildRefitInventory(ship, catalogs),
    compendiums: SHIP_COMPENDIUM_PACKS
  });
}
