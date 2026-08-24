import { SYSTEM_STATES } from "./ship-schema.js";

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let cursor = object;
  for (const key of keys) cursor = cursor[key] ??= {};
  cursor[last] = value;
}

function applyEffect(stats, effect) {
  const current = getPath(stats, effect.target);
  if (effect.mode === "set") return setPath(stats, effect.target, effect.value);
  if (effect.mode === "add") {
    const numeric = Number(current ?? 0);
    return setPath(stats, effect.target, numeric + Number(effect.value ?? 0));
  }
  throw new Error(`Unsupported Arkflight effect mode: ${effect.mode}`);
}

function functional(ship, system) {
  return ship.systems?.[system] === SYSTEM_STATES.FUNCTIONAL || ship.systems?.[system] === SYSTEM_STATES.DAMAGED;
}

function lookup(catalog, id) {
  return id ? catalog?.[id] ?? null : null;
}

function installedComponents(ship, catalogs) {
  const components = [];
  const hull = lookup(catalogs.hulls, ship.hull.chassisId);
  const hullPattern = lookup(catalogs.hullPatterns, ship.hull.patternId);
  const arkengine = lookup(catalogs.arkengines, ship.arkengine.chassisId);
  const enginePattern = lookup(catalogs.arkenginePatterns, ship.arkengine.patternId);
  if (hull) components.push(hull);
  if (hullPattern) components.push(hullPattern);
  if (arkengine && functional(ship, "arkengine")) components.push(arkengine);
  if (enginePattern && functional(ship, "arkengine")) components.push(enginePattern);

  for (const id of ship.arkengine.modIds ?? []) {
    const item = lookup(catalogs.arkengineMods, id);
    if (item && functional(ship, "arkengine")) components.push(item);
  }
  for (const id of ship.rooms ?? []) {
    const item = lookup(catalogs.rooms, id);
    if (item) components.push(item);
  }
  for (const id of ship.shipMods ?? []) {
    const item = lookup(catalogs.shipMods, id);
    if (item) components.push(item);
  }
  for (const install of ship.weapons ?? []) {
    const id = typeof install === "string" ? install : install.id;
    const item = lookup(catalogs.weapons, id);
    if (item && functional(ship, "weapons")) components.push(item);
  }
  for (const id of ship.crew?.specialists ?? []) {
    const item = lookup(catalogs.crewSpecialists, id);
    if (item) components.push(item);
  }
  return components;
}

export function deriveShip(ship, catalogs = {}) {
  const components = installedComponents(ship, catalogs);
  const hull = lookup(catalogs.hulls, ship.hull.chassisId);

  const derived = structuredClone(hull?.data?.baseStats ?? {
    armorClass: 0,
    hullIntegrity: 0,
    lifeveilCapacity: 0,
    strainCapacity: 0,
    cargoCapacity: 0,
    detection: 0,
    combatSpeed: 0,
    maneuverability: 0,
    roomCapacity: 0,
    shipModCapacity: 0,
    arkengineModCapacity: 0,
    crew: { minimum: 0, recommended: 0, maximum: 0 },
    weaponMounts: {}
  });

  const tags = new Set(ship.traits ?? []);
  const capabilities = new Set();
  const signatures = new Set();
  const actions = new Set();

  for (const item of components) {
    for (const effect of item.effects ?? []) applyEffect(derived, effect);
    for (const tag of [...(item.tags ?? []), ...(item.traits ?? [])]) tags.add(tag);
    for (const capability of item.capabilities ?? []) capabilities.add(capability);
    for (const signature of item.unlocks?.signatures ?? []) signatures.add(signature);
    for (const action of item.unlocks?.actions ?? []) actions.add(action);
  }

  return Object.freeze({
    stats: Object.freeze(derived),
    tags: Object.freeze([...tags]),
    capabilities: Object.freeze([...capabilities]),
    unlocks: Object.freeze({
      signatures: Object.freeze([...signatures]),
      actions: Object.freeze([...actions])
    }),
    usage: Object.freeze({
      rooms: (ship.rooms ?? []).reduce((sum, id) => sum + (catalogs.rooms?.[id]?.capacityCost ?? 0), 0),
      shipMods: (ship.shipMods ?? []).reduce((sum, id) => sum + (catalogs.shipMods?.[id]?.capacityCost ?? 0), 0),
      arkengineMods: (ship.arkengine.modIds ?? []).reduce((sum, id) => sum + (catalogs.arkengineMods?.[id]?.capacityCost ?? 0), 0)
    })
  });
}

export function syncResourceMaxima(ship, derived) {
  return {
    ...ship,
    resources: {
      ...ship.resources,
      hull: { value: Math.min(ship.resources.hull.value || derived.stats.hullIntegrity, derived.stats.hullIntegrity), max: derived.stats.hullIntegrity },
      lifeveil: { value: Math.min(ship.resources.lifeveil.value || derived.stats.lifeveilCapacity, derived.stats.lifeveilCapacity), max: derived.stats.lifeveilCapacity },
      strain: { value: Math.min(ship.resources.strain.value, derived.stats.strainCapacity), max: derived.stats.strainCapacity }
    }
  };
}
