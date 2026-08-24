export const SHIP_SCHEMA_VERSION = 1;

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
  "watchmaster",
  "veilwarden"
]);

function resource(value = 0, max = 0) {
  return { value, max };
}

export function createShip(overrides = {}) {
  const base = {
    schemaVersion: SHIP_SCHEMA_VERSION,
    identity: {
      name: "Unnamed Vessel",
      registry: "",
      callsign: "",
      owner: "",
      origin: "",
      builder: "",
      motto: "",
      notes: ""
    },
    traits: [],
    hull: { chassisId: "", patternId: "standard" },
    arkengine: { chassisId: "", patternId: "standard", modIds: [] },
    rooms: [],
    shipMods: [],
    weapons: [],
    crew: {
      stations: Object.fromEntries(STATION_KEYS.map((key) => [key, null])),
      specialists: []
    },
    cargo: { used: 0, notes: "" },
    resources: {
      hull: resource(),
      lifeveil: resource(),
      strain: resource(),
      supplies: resource(),
      morale: resource(3, 5)
    },
    systems: Object.fromEntries(SHIP_SYSTEM_KEYS.map((key) => [key, SYSTEM_STATES.FUNCTIONAL])),
    conditions: []
  };

  return mergeShip(base, overrides);
}

function mergeShip(base, overrides) {
  return {
    ...base,
    ...overrides,
    identity: { ...base.identity, ...(overrides.identity ?? {}) },
    hull: { ...base.hull, ...(overrides.hull ?? {}) },
    arkengine: {
      ...base.arkengine,
      ...(overrides.arkengine ?? {}),
      modIds: [...(overrides.arkengine?.modIds ?? base.arkengine.modIds)]
    },
    rooms: [...(overrides.rooms ?? base.rooms)],
    shipMods: [...(overrides.shipMods ?? base.shipMods)],
    weapons: [...(overrides.weapons ?? base.weapons)],
    traits: [...(overrides.traits ?? base.traits)],
    crew: {
      ...base.crew,
      ...(overrides.crew ?? {}),
      stations: { ...base.crew.stations, ...(overrides.crew?.stations ?? {}) },
      specialists: [...(overrides.crew?.specialists ?? base.crew.specialists)]
    },
    cargo: { ...base.cargo, ...(overrides.cargo ?? {}) },
    resources: Object.fromEntries(
      Object.entries(base.resources).map(([key, value]) => [
        key,
        { ...value, ...(overrides.resources?.[key] ?? {}) }
      ])
    ),
    systems: { ...base.systems, ...(overrides.systems ?? {}) },
    conditions: [...(overrides.conditions ?? base.conditions)]
  };
}
