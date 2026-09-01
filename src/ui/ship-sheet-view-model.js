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

export const STATION_PRESENTATION = Object.freeze({ captain: "Captain", engineer: "Engineer", navigator: "Navigator", battlewatch: "Battlewatch", veilwarden: "Veilwarden" });
export const AREA_STATION_PENALTIES = Object.freeze({
  [AREA_STATES.STABLE]: 0,
  [AREA_STATES.STRESSED]: -1,
  [AREA_STATES.DAMAGED]: -3,
  [AREA_STATES.CRITICAL]: -5,
  [AREA_STATES.DISABLED]: -10
});
export const AREA_CONSEQUENCES = Object.freeze({
  hull: Object.freeze({ stable: "Hull structure is fully operational.", stressed: "Battlewatch operates at -1 from Hull stress.", damaged: "Battlewatch operates at -3 and ship attacks suffer the Hull-area penalty.", critical: "Battlewatch operates at -5 and the hull is near structural failure.", disabled: "Battlewatch normal Hull functions are unavailable; the vessel is structurally disabled." }),
  arkengine: Object.freeze({ stable: "Arkengine is fully operational.", stressed: "Engineer operates at -1 from Arkengine stress.", damaged: "Engineer operates at -3 and powered performance is degraded.", critical: "Engineer operates at -5 and powered movement is severely limited.", disabled: "Normal powered Arkengine function is unavailable." }),
  rigging: Object.freeze({ stable: "Rigging and facing control are fully operational.", stressed: "Navigator operates at -1 from Rigging stress.", damaged: "Navigator operates at -3 and facing control is degraded.", critical: "Navigator operates at -5 and Rigging control is severely limited.", disabled: "Normal Rigging and facing-control functions are unavailable." }),
  lifeveil: Object.freeze({ stable: "Lifeveil systems are fully operational.", stressed: "Veilwarden operates at -1 from Lifeveil stress.", damaged: "Veilwarden operates at -3 and Lifeveil integrity is reduced.", critical: "Veilwarden operates at -5 and Lifeveil integrity is critically reduced.", disabled: "Normal Lifeveil-area function is unavailable; environmental protection may be offline." }),
  morale: Object.freeze({ stable: "Command cohesion is fully operational.", stressed: "Captain operates at -1 from Morale-area stress.", damaged: "Captain operates at -3 as command cohesion deteriorates.", critical: "Captain operates at -5 as command cohesion nears collapse.", disabled: "Normal Morale-area command functions are unavailable." })
});
export const SHIP_COMPENDIUM_PACKS = Object.freeze({ hulls: "arkflight-game.hulls-and-patterns", arkengines: "arkflight-game.arkengines", shipMods: "arkflight-game.ship-mods", arkengineMods: "arkflight-game.arkengine-mods", rooms: "arkflight-game.rooms", weapons: "arkflight-game.ship-weapons", talents: "arkflight-game.ship-talents" });

function titleCase(value) { const text = String(value ?? ""); return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Unknown"; }
function numeric(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function resistanceText(profile = {}) { const entries = Object.entries(profile?.values ?? {}); return entries.length ? entries.map(([type, value]) => `${titleCase(type)} ${value}`).join(" · ") : "None"; }
function displayValue(key, value) {
  if (key === "resistances") return resistanceText(value);
  if (key === "crew") return `${numeric(value?.minimum)} / ${numeric(value?.recommended)} / ${numeric(value?.maximum)}`;
  if (key === "weaponMounts") return `${Object.keys(value ?? {}).length} mount types`;
  if (value && typeof value === "object") return "Structured";
  return numeric(value);
}
function resolveCatalog(catalog, id) { return id ? catalog?.[id] ?? null : null; }
function fitting(catalog, id, family, extra = {}) {
  const item = resolveCatalog(catalog, id);
  return Object.freeze({ id, family, name: item?.name ?? id ?? "Unknown fitting", description: item?.description ?? "", rarity: item?.data?.rarity ?? item?.rarity ?? "standard", capacityCost: numeric(item?.data?.refit?.slotCost ?? item?.capacityCost), ...extra });
}
function groupedFittings(ids, catalog, family) {
  const counts = new Map();
  for (const id of ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Object.freeze([...counts.entries()].map(([id, quantity]) => fitting(catalog, id, family, { quantity })));
}
function workOrderView(entry, catalogs) {
  const catalog = entry?.componentFamily === "arkengineMod" ? catalogs.arkengineMods : catalogs.shipMods;
  return Object.freeze({ ...entry, componentName: catalog?.[entry?.componentId]?.name ?? entry?.componentId ?? "Ship work", statusLabel: titleCase(entry?.status), typeLabel: titleCase(entry?.type), methodLabel: titleCase(entry?.method), canStart: entry?.status === "planned", active: ["planned", "working", "complication"].includes(entry?.status) });
}

export function areaPenalty(state) { return AREA_STATION_PENALTIES[state] ?? 0; }
export function buildAreaViews(ship = {}) {
  return Object.freeze(SHIP_AREA_KEYS.map((area) => {
    const presentation = AREA_PRESENTATION[area];
    const state = ship.areas?.[area]?.state ?? AREA_STATES.STABLE;
    const penalty = areaPenalty(state);
    return Object.freeze({ key: area, label: presentation.label, icon: presentation.icon, state, stateLabel: titleCase(state), stateClass: `is-${state}`, station: presentation.station, stationLabel: STATION_PRESENTATION[presentation.station], penalty, penaltyLabel: penalty === 0 ? "No penalty" : `${penalty} station penalty`, consequence: AREA_CONSEQUENCES[area]?.[state] ?? "" });
  }));
}
export function buildStationViews(ship = {}, resolveAssignment = (value) => value ?? "Unassigned") {
  return Object.freeze(STATION_KEYS.map((station) => Object.freeze({ key: station, label: STATION_PRESENTATION[station], assignment: resolveAssignment(ship.crew?.stations?.[station]) || "Unassigned" })));
}
function statRows(stats, presentation) {
  return Object.freeze(derivedStatsByPresentation(presentation).filter((definition) => !definition.path.includes(".")).map((definition) => Object.freeze({ key: definition.path, label: definition.label, category: definition.category, value: displayValue(definition.path, stats?.[definition.path]) })));
}
export function buildStatPresentation(stats = {}) { return Object.freeze({ primary: statRows(stats, DERIVED_STAT_PRESENTATION.PRIMARY), operational: statRows(stats, DERIVED_STAT_PRESENTATION.OPERATIONAL), technical: statRows(stats, DERIVED_STAT_PRESENTATION.TECHNICAL) }); }

export function buildInstalledFittings(ship = {}, catalogs = {}) {
  const hull = resolveCatalog(catalogs.hulls, ship.hull?.chassisId);
  const hullPattern = resolveCatalog(catalogs.hullPatterns, ship.hull?.patternId);
  const arkengine = resolveCatalog(catalogs.arkengines, ship.arkengine?.chassisId);
  const arkenginePattern = resolveCatalog(catalogs.arkenginePatterns, ship.arkengine?.patternId);
  return Object.freeze({
    hull: hull ? fitting(catalogs.hulls, hull.id, "hull", { patternId: ship.hull?.patternId ?? null, patternName: hullPattern?.name ?? "No pattern" }) : null,
    arkengine: arkengine ? fitting(catalogs.arkengines, arkengine.id, "arkengine", { patternId: ship.arkengine?.patternId ?? null, patternName: arkenginePattern?.name ?? "No pattern" }) : null,
    rooms: groupedFittings(ship.rooms, catalogs.rooms, "room"),
    shipMods: groupedFittings(ship.shipMods, catalogs.shipMods, "shipMod"),
    arkengineMods: groupedFittings(ship.arkengine?.modIds, catalogs.arkengineMods, "arkengineMod"),
    weapons: groupedFittings((ship.weapons ?? []).map((entry) => typeof entry === "string" ? entry : entry?.id), catalogs.weapons, "weapon"),
    talents: groupedFittings(ship.progression?.talentIds, catalogs.shipTalents, "talent")
  });
}

export function buildRefitInventory(ship = {}, catalogs = {}) {
  const physicalShipMods = Object.entries(ship.inventory?.shipMods ?? {}).flatMap(([id, quantity]) => { const count = Math.max(0, Math.trunc(Number(quantity) || 0)); return count > 0 ? [Object.freeze({ ...fitting(catalogs.shipMods, id, "shipMod"), quantity: count })] : []; });
  const physicalArkengineMods = Object.entries(ship.inventory?.arkengineMods ?? {}).flatMap(([id, quantity]) => { const count = Math.max(0, Math.trunc(Number(quantity) || 0)); return count > 0 ? [Object.freeze({ ...fitting(catalogs.arkengineMods, id, "arkengineMod"), quantity: count })] : []; });
  const allOrders = (ship.refit?.workOrders ?? []).map((entry) => workOrderView(entry, catalogs));
  return Object.freeze({
    shipMods: Object.freeze(physicalShipMods),
    arkengineMods: Object.freeze(physicalArkengineMods),
    workOrders: Object.freeze(allOrders.filter((entry) => entry.active)),
    history: Object.freeze(allOrders.filter((entry) => !entry.active)),
    blueprints: Object.freeze({ shipMods: Object.freeze((ship.blueprints?.shipModIds ?? []).map((id) => fitting(catalogs.shipMods, id, "shipMod"))), arkengineMods: Object.freeze((ship.blueprints?.arkengineModIds ?? []).map((id) => fitting(catalogs.arkengineMods, id, "arkengineMod"))) })
  });
}

export function buildShipSheetView({ ship, derived, catalogs, resolveAssignment } = {}) {
  const stats = derived?.stats ?? {};
  return Object.freeze({ tabs: SHIP_SHEET_TABS, areas: buildAreaViews(ship), stations: buildStationViews(ship, resolveAssignment), stats: buildStatPresentation(stats), fittings: buildInstalledFittings(ship, catalogs), refit: buildRefitInventory(ship, catalogs), compendiums: SHIP_COMPENDIUM_PACKS });
}
