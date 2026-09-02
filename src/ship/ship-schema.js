export const SHIP_SCHEMA_VERSION = 6;

export const SHIP_AREA_KEYS = Object.freeze([
  "hull",
  "arkengine",
  "rigging",
  "lifeveil",
  "morale"
]);

export const AREA_STATES = Object.freeze({
  STABLE: "stable",
  STRESSED: "stressed",
  DAMAGED: "damaged",
  CRITICAL: "critical",
  DISABLED: "disabled"
});

// Deprecated compatibility exports. New code should use SHIP_AREA_KEYS / AREA_STATES.
export const SHIP_SYSTEM_KEYS = Object.freeze([
  "hull",
  "arkengine",
  "lifeveil",
  "helm",
  "rigging",
  "command",
  "weapons"
]);
export const SYSTEM_STATES = Object.freeze({
  FUNCTIONAL: "functional",
  DAMAGED: "damaged",
  DISABLED: "disabled",
  DESTROYED: "destroyed"
});

export const STATION_KEYS = Object.freeze([
  "captain",
  "engineer",
  "navigator",
  "battlewatch",
  "veilwarden"
]);

export const LEGACY_STATION_ALIASES = Object.freeze({ watchmaster: "battlewatch" });

function resource(value = 0, max = 0) { return { value, max }; }
function counter(value = 0) { return { value: Math.max(0, Math.trunc(Number(value) || 0)) }; }
function area(state = AREA_STATES.STABLE) { return { state }; }

function legacySystemToAreaState(value) {
  if (value === "destroyed" || value === "disabled") return AREA_STATES.DISABLED;
  if (value === "damaged") return AREA_STATES.DAMAGED;
  return AREA_STATES.STABLE;
}

function migrateAreas(ship = {}) {
  const existing = ship.areas ?? {};
  const systems = ship.systems ?? {};
  return {
    hull: { ...area(), ...(existing.hull ?? {}), state: existing.hull?.state ?? legacySystemToAreaState(systems.hull) },
    arkengine: { ...area(), ...(existing.arkengine ?? {}), state: existing.arkengine?.state ?? legacySystemToAreaState(systems.arkengine) },
    rigging: { ...area(), ...(existing.rigging ?? {}), state: existing.rigging?.state ?? legacySystemToAreaState(systems.rigging ?? systems.helm) },
    lifeveil: { ...area(), ...(existing.lifeveil ?? {}), state: existing.lifeveil?.state ?? legacySystemToAreaState(systems.lifeveil) },
    morale: { ...area(), ...(existing.morale ?? {}), state: existing.morale?.state ?? legacySystemToAreaState(systems.command) }
  };
}

function migrateStations(stations = {}) {
  const next = { ...stations };
  if (!next.battlewatch && next.watchmaster) next.battlewatch = next.watchmaster;
  delete next.watchmaster;
  return Object.fromEntries(STATION_KEYS.map((key) => [key, next[key] ?? null]));
}

function normalizeProgression(progression = {}) {
  const level = Math.max(1, Math.min(20, Math.trunc(Number(progression.level) || 1)));
  const xp = Math.max(0, Math.trunc(Number(progression.xp) || 0));
  return {
    level,
    xp: level >= 20 ? Math.min(1000, xp) : Math.min(999, xp),
    talentIds: [...new Set(progression.talentIds ?? [])],
    arkcraftUpgrades: { ...(progression.arkcraftUpgrades ?? {}) }
  };
}

function normalizeIdList(values = []) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function normalizeComponentCounts(values = {}) {
  const normalized = {};
  for (const [id, quantity] of Object.entries(values ?? {})) {
    if (!id) continue;
    const count = Math.max(0, Math.trunc(Number(quantity) || 0));
    if (count > 0) normalized[id] = count;
  }
  return normalized;
}

function normalizeBlueprints(blueprints = {}) {
  return {
    shipModIds: normalizeIdList(blueprints.shipModIds),
    arkengineModIds: normalizeIdList(blueprints.arkengineModIds),
    weaponIds: normalizeIdList(blueprints.weaponIds)
  };
}

function normalizeInventory(inventory = {}) {
  return {
    shipMods: normalizeComponentCounts(inventory.shipMods),
    arkengineMods: normalizeComponentCounts(inventory.arkengineMods),
    weapons: normalizeComponentCounts(inventory.weapons)
  };
}

function normalizeRefit(refit = {}) {
  return {
    workOrders: (refit.workOrders ?? []).filter((entry) => entry && typeof entry === "object").map((entry) => ({ ...entry }))
  };
}

function normalizeResources(resources = {}) {
  return {
    hull: { ...resource(), ...(resources.hull ?? {}) },
    lifeveil: { ...resource(), ...(resources.lifeveil ?? {}) },
    strain: { ...resource(), ...(resources.strain ?? {}) },
    supplies: { ...resource(), ...(resources.supplies ?? {}) },
    morale: { ...resource(3, 5), ...(resources.morale ?? {}) },
    salvageParts: counter(resources.salvageParts?.value ?? resources.salvageParts ?? 0)
  };
}

export function createShip(overrides = {}) {
  const base = {
    schemaVersion: SHIP_SCHEMA_VERSION,
    identity: { name: "Unnamed Vessel", registry: "", callsign: "", owner: "", origin: "", builder: "", motto: "", notes: "" },
    traits: [],
    hull: { chassisId: "", patternId: "standard" },
    arkengine: { chassisId: "", patternId: "standard", modIds: [] },
    rooms: [], shipMods: [], weapons: [],
    crew: { stations: Object.fromEntries(STATION_KEYS.map((key) => [key, null])), specialists: [] },
    cargo: { used: 0, notes: "" },
    resources: { hull: resource(), lifeveil: resource(), strain: resource(), supplies: resource(), morale: resource(3, 5), salvageParts: counter() },
    blueprints: { shipModIds: [], arkengineModIds: [], weaponIds: [] },
    inventory: { shipMods: {}, arkengineMods: {}, weapons: {} },
    refit: { workOrders: [] },
    areas: Object.fromEntries(SHIP_AREA_KEYS.map((key) => [key, area()])),
    progression: normalizeProgression(),
    conditions: []
  };
  return normalizeShip(mergeShip(base, overrides));
}

export function normalizeShip(ship = {}) {
  const base = {
    ...ship,
    schemaVersion: SHIP_SCHEMA_VERSION,
    crew: { ...(ship.crew ?? {}), stations: migrateStations(ship.crew?.stations), specialists: [...(ship.crew?.specialists ?? [])] },
    resources: normalizeResources(ship.resources),
    blueprints: normalizeBlueprints(ship.blueprints),
    inventory: normalizeInventory(ship.inventory),
    refit: normalizeRefit(ship.refit),
    areas: migrateAreas(ship),
    progression: normalizeProgression(ship.progression),
    conditions: [...(ship.conditions ?? [])]
  };
  delete base.systems;
  return base;
}

function mergeShip(base, overrides) {
  return {
    ...base, ...overrides,
    identity: { ...base.identity, ...(overrides.identity ?? {}) },
    hull: { ...base.hull, ...(overrides.hull ?? {}) },
    arkengine: { ...base.arkengine, ...(overrides.arkengine ?? {}), modIds: [...(overrides.arkengine?.modIds ?? base.arkengine.modIds)] },
    rooms: [...(overrides.rooms ?? base.rooms)], shipMods: [...(overrides.shipMods ?? base.shipMods)], weapons: [...(overrides.weapons ?? base.weapons)], traits: [...(overrides.traits ?? base.traits)],
    crew: { ...base.crew, ...(overrides.crew ?? {}), stations: { ...base.crew.stations, ...(overrides.crew?.stations ?? {}) }, specialists: [...(overrides.crew?.specialists ?? base.crew.specialists)] },
    cargo: { ...base.cargo, ...(overrides.cargo ?? {}) },
    resources: { ...base.resources, ...(overrides.resources ?? {}) },
    blueprints: {
      ...base.blueprints,
      ...(overrides.blueprints ?? {}),
      shipModIds: [...(overrides.blueprints?.shipModIds ?? base.blueprints.shipModIds)],
      arkengineModIds: [...(overrides.blueprints?.arkengineModIds ?? base.blueprints.arkengineModIds)],
      weaponIds: [...(overrides.blueprints?.weaponIds ?? base.blueprints.weaponIds)]
    },
    inventory: {
      ...base.inventory,
      ...(overrides.inventory ?? {}),
      shipMods: { ...base.inventory.shipMods, ...(overrides.inventory?.shipMods ?? {}) },
      arkengineMods: { ...base.inventory.arkengineMods, ...(overrides.inventory?.arkengineMods ?? {}) },
      weapons: { ...base.inventory.weapons, ...(overrides.inventory?.weapons ?? {}) }
    },
    refit: { ...base.refit, ...(overrides.refit ?? {}), workOrders: [...(overrides.refit?.workOrders ?? base.refit.workOrders)] },
    areas: { ...base.areas, ...(overrides.areas ?? {}) },
    progression: { ...base.progression, ...(overrides.progression ?? {}), talentIds: [...(overrides.progression?.talentIds ?? base.progression.talentIds)], arkcraftUpgrades: { ...base.progression.arkcraftUpgrades, ...(overrides.progression?.arkcraftUpgrades ?? {}) } },
    conditions: [...(overrides.conditions ?? base.conditions)]
  };
}
