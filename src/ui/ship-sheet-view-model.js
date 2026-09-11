import { STATION_KEYS } from "../ship/ship-schema.js";
import {
  SHIP_CONDITION_SYSTEMS,
  lifeveilCondition,
  moraleCondition,
  shipConditionProfile
} from "../ship/ship-conditions.js";
import {
  DERIVED_STAT_PRESENTATION,
  derivedStatsByPresentation
} from "../ship/derived-stat-registry.js";

export const SHIP_SHEET_TABS = Object.freeze(["overview", "hold", "combat", "weapons"]);

export const STATION_PRESENTATION = Object.freeze({
  captain: "Captain",
  engineer: "Engineer",
  navigator: "Navigator",
  battlewatch: "Battlewatch",
  veilwarden: "Veilwarden"
});

// Deprecated export retained for old UI consumers. Ship Conditions no longer
// impose a universal station penalty ladder.
export const AREA_STATION_PENALTIES = Object.freeze({
  stable: 0, stressed: 0, damaged: 0, critical: 0, disabled: 0
});

function conditionConsequence(system, profile) {
  if (system === "hull") {
    const pct = Math.round(Number(profile.hardnessMultiplier ?? 1) * 100);
    return profile.severity === 0 ? "Full Hardness." : `Hardness reduced to ${pct}% of base (round down).`;
  }
  if (system === "drive") {
    return profile.severity === 0
      ? "Normal Speed and Maneuverability."
      : `Speed −${profile.speedPenalty}; Maneuverability −${profile.maneuverPenalty}.`;
  }
  if (system === "weapons") {
    return profile.severity === 0
      ? "Normal weapon attacks and Reload."
      : `Ship weapon attacks −${profile.attackPenalty}; Reload +${profile.reloadPenalty}.`;
  }
  return "";
}

export function areaPenalty(_state) { return 0; }

export function buildConditionViews(ship = {}) {
  const fixed = SHIP_CONDITION_SYSTEMS.map((system) => {
    const profile = shipConditionProfile(ship, system);
    const presentation = {
      hull: { label: "Hull", icon: "fa-shield-halved", station: "battlewatch", stationLabel: "Battlewatch" },
      drive: { label: "Drive", icon: "fa-gears", station: "engineer", stationLabel: "Engineer / Navigator" },
      weapons: { label: "Weapons", icon: "fa-crosshairs", station: "battlewatch", stationLabel: "Battlewatch" }
    }[system];
    return Object.freeze({
      key: system,
      label: presentation.label,
      icon: presentation.icon,
      state: profile.id,
      stateLabel: profile.label,
      stateClass: `is-${profile.id}`,
      station: presentation.station,
      stationLabel: presentation.stationLabel,
      penalty: 0,
      penaltyLabel: "System-specific condition",
      consequence: conditionConsequence(system, profile),
      severity: profile.severity
    });
  });

  const lifeveil = lifeveilCondition(ship.resources?.lifeveil?.value ?? 0);
  const morale = moraleCondition(ship.resources?.morale?.value ?? 0);
  fixed.push(Object.freeze({
    key: "lifeveil", label: "Lifeveil", icon: "fa-sparkles",
    state: lifeveil.id, stateLabel: lifeveil.label, stateClass: `is-${lifeveil.id}`,
    station: "veilwarden", stationLabel: "Veilwarden", penalty: 0,
    penaltyLabel: "Percentage-derived condition",
    consequence: `Lifeveil ${lifeveil.value}%.`, severity: lifeveil.severity
  }));
  fixed.push(Object.freeze({
    key: "morale", label: "Morale", icon: "fa-flag",
    state: morale.id, stateLabel: morale.label, stateClass: `is-${morale.id}`,
    station: "captain", stationLabel: "Captain", penalty: 0,
    penaltyLabel: "Percentage-derived condition",
    consequence: `Morale ${morale.value}%.`, severity: morale.severity
  }));
  return Object.freeze(fixed);
}

export const REFIT_BLUEPRINT_ICONS = Object.freeze({
  shipMod: "modules/arkflight-game/assets/icons/ship-mods/blueprint_ship_mods.webp",
  arkengineMod: "modules/arkflight-game/assets/icons/arkengine-mods/blueprint_engine_mods.webp",
  weapon: "modules/arkflight-game/assets/icons/weapons/blueprint_weapons.webp"
});

const SHIP_COMPENDIUM_PACKS = Object.freeze({ hulls: "arkflight-game.hulls-and-patterns", arkengines: "arkflight-game.arkengines", shipMods: "arkflight-game.ship-mods", arkengineMods: "arkflight-game.arkengine-mods", rooms: "arkflight-game.rooms", weapons: "arkflight-game.ship-weapons", talents: "arkflight-game.ship-talents" });

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
  return Object.freeze({
    id,
    family,
    name: item?.name ?? id ?? "Unknown fitting",
    description: item?.description ?? "",
    rarity: item?.data?.rarity ?? item?.rarity ?? "standard",
    capacityCost: numeric(item?.data?.refit?.slotCost ?? item?.capacityCost),
    img: item?.img ?? item?.data?.art?.img ?? "",
    blueprintImg: REFIT_BLUEPRINT_ICONS[family] ?? "",
    ...extra
  });
}
function groupedFittings(ids, catalog, family) {
  const counts = new Map();
  for (const id of ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Object.freeze([...counts.entries()].map(([id, quantity]) => fitting(catalog, id, family, { quantity })));
}
function workOrderView(entry, catalogs) {
  const catalog = entry?.componentFamily === "arkengineMod" ? catalogs.arkengineMods : entry?.componentFamily === "weapon" ? catalogs.weapons : catalogs.shipMods;
  return Object.freeze({ ...entry, componentName: catalog?.[entry?.componentId]?.name ?? entry?.componentId ?? "Ship work", statusLabel: titleCase(entry?.status), typeLabel: titleCase(entry?.type), methodLabel: titleCase(entry?.method), canStart: entry?.status === "planned", active: ["planned", "working", "complication"].includes(entry?.status) });
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
  const physicalWeapons = Object.entries(ship.inventory?.weapons ?? {}).flatMap(([id, quantity]) => { const count = Math.max(0, Math.trunc(Number(quantity) || 0)); return count > 0 ? [Object.freeze({ ...fitting(catalogs.weapons, id, "weapon"), quantity: count })] : []; });
  const allOrders = (ship.refit?.workOrders ?? []).map((entry) => workOrderView(entry, catalogs));
  return Object.freeze({
    shipMods: Object.freeze(physicalShipMods),
    arkengineMods: Object.freeze(physicalArkengineMods),
    weapons: Object.freeze(physicalWeapons),
    workOrders: Object.freeze(allOrders.filter((entry) => entry.active)),
    history: Object.freeze(allOrders.filter((entry) => !entry.active)),
    blueprints: Object.freeze({ shipMods: Object.freeze((ship.blueprints?.shipModIds ?? []).map((id) => fitting(catalogs.shipMods, id, "shipMod"))), arkengineMods: Object.freeze((ship.blueprints?.arkengineModIds ?? []).map((id) => fitting(catalogs.arkengineMods, id, "arkengineMod"))), weapons: Object.freeze((ship.blueprints?.weaponIds ?? []).map((id) => fitting(catalogs.weapons, id, "weapon"))) })
  });
}

// Compatibility alias for older UI/tests while player-facing terminology is Ship Conditions.
export function buildAreaViews(ship = {}) { return buildConditionViews(ship); }

export function buildShipSheetView({ ship, derived, catalogs, resolveAssignment } = {}) {
  const stats = derived?.stats ?? {};
  const conditions = buildConditionViews(ship);
  return Object.freeze({
    tabs: SHIP_SHEET_TABS,
    conditions,
    areas: conditions,
    stations: buildStationViews(ship, resolveAssignment),
    stats: buildStatPresentation(stats),
    fittings: buildInstalledFittings(ship, catalogs),
    refit: buildRefitInventory(ship, catalogs),
    compendiums: SHIP_COMPENDIUM_PACKS
  });
}
