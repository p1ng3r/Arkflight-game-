export const COMPONENT_TYPES = Object.freeze({
  HULL: "hull",
  HULL_PATTERN: "hull-pattern",
  ARKENGINE: "arkengine",
  ARKENGINE_PATTERN: "arkengine-pattern",
  ARKENGINE_MOD: "arkengine-mod",
  ROOM: "room",
  SHIP_MOD: "ship-mod",
  WEAPON: "weapon",
  CREW_SPECIALIST: "crew-specialist"
});

export const EFFECT_MODES = Object.freeze({ ADD: "add", SET: "set" });

export function component({
  id,
  name,
  type,
  description = "",
  tags = [],
  traits = [],
  capacityCost = 0,
  effects = [],
  capabilities = [],
  unlocks = {},
  requirements = {},
  tradeoffs = [],
  data = {}
}) {
  if (!id || !name || !type) throw new Error("Arkflight component requires id, name, and type.");

  return Object.freeze({
    id,
    name,
    type,
    description,
    tags: Object.freeze([...new Set(tags)]),
    traits: Object.freeze([...new Set(traits)]),
    capacityCost,
    effects: Object.freeze(effects.map((effect) => Object.freeze({ ...effect }))),
    capabilities: Object.freeze([...new Set(capabilities)]),
    unlocks: Object.freeze({
      signatures: Object.freeze([...new Set(unlocks.signatures ?? [])]),
      actions: Object.freeze([...new Set(unlocks.actions ?? [])])
    }),
    requirements: Object.freeze({ ...requirements }),
    tradeoffs: Object.freeze([...tradeoffs]),
    data: Object.freeze({ ...data })
  });
}

export function add(target, value) {
  return Object.freeze({ target, mode: EFFECT_MODES.ADD, value });
}

export function set(target, value) {
  return Object.freeze({ target, mode: EFFECT_MODES.SET, value });
}
