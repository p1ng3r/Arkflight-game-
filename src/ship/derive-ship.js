import { AREA_STATES } from "./ship-schema.js";
import { applyTalentProgression, progressionView } from "./progression.js";

function getPath(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) { const keys = path.split("."); const last = keys.pop(); let cursor = object; for (const key of keys) cursor = cursor[key] ??= {}; cursor[last] = value; }
function applyEffect(stats, effect) { const current = getPath(stats, effect.target); if (effect.mode === "set") return setPath(stats, effect.target, effect.value); if (effect.mode === "add") return setPath(stats, effect.target, Number(current ?? 0) + Number(effect.value ?? 0)); throw new Error(`Unsupported Arkflight effect mode: ${effect.mode}`); }
function lookup(catalog, id) { return id ? catalog?.[id] ?? null : null; }
function areaOperational(ship, area) { return (ship.areas?.[area]?.state ?? AREA_STATES.STABLE) !== AREA_STATES.DISABLED; }

function installedComponents(ship, catalogs) {
  const components = [];
  const hull = lookup(catalogs.hulls, ship.hull.chassisId);
  const hullPattern = lookup(catalogs.hullPatterns, ship.hull.patternId);
  const arkengine = lookup(catalogs.arkengines, ship.arkengine.chassisId);
  const enginePattern = lookup(catalogs.arkenginePatterns, ship.arkengine.patternId);
  if (hull) components.push(hull);
  if (hullPattern) components.push(hullPattern);
  if (arkengine && areaOperational(ship, "arkengine")) components.push(arkengine);
  if (enginePattern && areaOperational(ship, "arkengine")) components.push(enginePattern);
  for (const id of ship.arkengine.modIds ?? []) { const item = lookup(catalogs.arkengineMods, id); if (item && areaOperational(ship, "arkengine")) components.push(item); }
  for (const id of ship.rooms ?? []) { const item = lookup(catalogs.rooms, id); if (item) components.push(item); }
  for (const id of ship.shipMods ?? []) { const item = lookup(catalogs.shipMods, id); if (item) components.push(item); }
  for (const install of ship.weapons ?? []) { const id = typeof install === "string" ? install : install.id; const item = lookup(catalogs.weapons, id); if (item) components.push(item); }
  for (const id of ship.crew?.specialists ?? []) { const item = lookup(catalogs.crewSpecialists, id); if (item) components.push(item); }
  return components;
}

function emptyStationCapabilities() {
  return Object.fromEntries(["captain", "engineer", "navigator", "battlewatch", "veilwarden"].map((id) => [id, { masteries: new Set(), combatActions: new Set(), passiveEffects: new Set() }]));
}
function canonicalStation(id) { return id === "watchmaster" ? "battlewatch" : id; }
function addStationUnlocks(target, component) {
  const authored = component.unlocks?.stations ?? {};
  for (const [rawStation, unlocks] of Object.entries(authored)) {
    const station = canonicalStation(rawStation); if (!target[station]) continue;
    for (const id of unlocks.masteries ?? []) target[station].masteries.add(id);
    for (const id of unlocks.combatActions ?? []) target[station].combatActions.add(id);
    for (const id of unlocks.passiveEffects ?? []) target[station].passiveEffects.add(id);
  }
  for (const id of component.unlocks?.masteries ?? []) {
    const station = canonicalStation(String(id).split("-")[0]);
    if (target[station]) target[station].masteries.add(id);
  }
  for (const id of component.unlocks?.signatures ?? []) {
    const station = canonicalStation(String(id).split("-")[0]);
    if (target[station]) target[station].masteries.add(id);
  }
  for (const id of component.unlocks?.actions ?? []) {
    const station = canonicalStation(String(id).split("-")[0]);
    if (target[station]) target[station].combatActions.add(id);
  }
}

export function deriveShip(ship, catalogs = {}) {
  const components = installedComponents(ship, catalogs);
  const hull = lookup(catalogs.hulls, ship.hull.chassisId);
  const baseStats = structuredClone(hull?.data?.baseStats ?? { armorClass: 0, hullIntegrity: 0, lifeveilCapacity: 0, strainCapacity: 0, cargoCapacity: 0, detection: 0, combatSpeed: 0, maneuverability: 0, roomCapacity: 0, shipModCapacity: 0, arkengineModCapacity: 0, crew: { minimum: 0, recommended: 0, maximum: 0 }, weaponMounts: {} });
  const derived = structuredClone(baseStats);
  const tags = new Set(ship.traits ?? []);
  const capabilities = new Set();
  const stationCapabilities = emptyStationCapabilities();

  for (const item of components) {
    for (const effect of item.effects ?? []) applyEffect(derived, effect);
    for (const tag of [...(item.tags ?? []), ...(item.traits ?? [])]) tags.add(tag);
    for (const capability of item.capabilities ?? []) capabilities.add(capability);
    addStationUnlocks(stationCapabilities, item);
  }

  applyTalentProgression(derived, baseStats, ship, stationCapabilities, capabilities);

  const frozenStationCapabilities = Object.fromEntries(Object.entries(stationCapabilities).map(([station, values]) => [station, Object.freeze({ masteries: Object.freeze([...values.masteries]), combatActions: Object.freeze([...values.combatActions]), passiveEffects: Object.freeze([...values.passiveEffects]) })]));
  const progression = progressionView(ship);
  return Object.freeze({
    stats: Object.freeze(derived), tags: Object.freeze([...tags]), capabilities: Object.freeze([...capabilities]), progression,
    stationCapabilities: Object.freeze(frozenStationCapabilities),
    unlocks: Object.freeze({ masteries: Object.freeze(Object.values(frozenStationCapabilities).flatMap((row) => row.masteries)), actions: Object.freeze(Object.values(frozenStationCapabilities).flatMap((row) => row.combatActions)) }),
    usage: Object.freeze({ rooms: (ship.rooms ?? []).reduce((sum, id) => sum + (catalogs.rooms?.[id]?.capacityCost ?? 0), 0), shipMods: (ship.shipMods ?? []).reduce((sum, id) => sum + (catalogs.shipMods?.[id]?.capacityCost ?? 0), 0), arkengineMods: (ship.arkengine.modIds ?? []).reduce((sum, id) => sum + (catalogs.arkengineMods?.[id]?.capacityCost ?? 0), 0) })
  });
}

export function syncResourceMaxima(ship, derived) {
  const existingSupplyMax = Number(ship.resources?.supplies?.max ?? 0);
  const derivedSupplyMax = Number(derived.stats?.supplyCapacity ?? 0);
  const supplyMax = derivedSupplyMax > 0 ? derivedSupplyMax : existingSupplyMax;
  const existingMoraleMax = Number(ship.resources?.morale?.max ?? 5);
  const derivedMoraleMax = Number(derived.stats?.moraleCapacity ?? 0);
  const moraleMax = derivedMoraleMax > 0 ? derivedMoraleMax : existingMoraleMax;
  return { ...ship, resources: { ...ship.resources,
    hull: { value: Math.min(ship.resources.hull.value || derived.stats.hullIntegrity, derived.stats.hullIntegrity), max: derived.stats.hullIntegrity },
    lifeveil: { value: Math.min(ship.resources.lifeveil.value || derived.stats.lifeveilCapacity, derived.stats.lifeveilCapacity), max: derived.stats.lifeveilCapacity },
    strain: { value: Math.min(ship.resources.strain.value, derived.stats.strainCapacity), max: derived.stats.strainCapacity },
    morale: { value: Math.min(ship.resources.morale?.value ?? moraleMax, moraleMax), max: moraleMax },
    supplies: { value: Math.min(ship.resources.supplies?.value ?? 0, supplyMax || Number.MAX_SAFE_INTEGER), max: supplyMax }
  } };
}
