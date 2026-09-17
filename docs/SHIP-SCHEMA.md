# Arkflight Ship Schema — Design Authority

## Purpose

The persistent ship document describes what the vessel **is**, what it **carries**, and the persistent damage/resources it currently has. Combat, Voyage, Event, and UI state machines must not duplicate those facts.

## Core Rules

1. Persistent facts are stored once.
2. Derived values are calculated by `deriveShip(ship, catalogs)`.
3. Installed content contributes effects/capabilities/unlocks; it does not own duplicate runtime state.
4. Persistent ship damage uses **Ship Conditions**, not Areas.
5. Lifeveil and Morale are percentage resources whose condition labels are derived from their current percentage.
6. Strain is one shared ship-wide pool.

## Component Families

- **Hull**
- **Arkengine**
- **Arkengine Mods**
- **Rooms**
- **Ship Mods**
- **Weapons**
- **Crew**

Arkengine and Rigging may remain separate equipment/content concepts. General persistent movement damage is the shared **Drive Ship Condition**.

## Schema Version

Current schema: **8**

## Persistent Shape

```js
{
  schemaVersion: 8,

  identity: {
    name, registry, callsign, owner, origin, builder, motto, notes
  },

  traits: [],

  hull: {
    chassisId,
    patternId
  },

  arkengine: {
    chassisId,
    patternId,
    modIds: []
  },

  rooms: [],
  shipMods: [],
  weapons: [],

  crew: {
    stations: {
      captain,
      engineer,
      navigator,
      battlewatch,
      veilwarden
    },
    specialists: []
  },

  cargo: {
    used,
    notes
  },

  resources: {
    hull:      { value, max },
    lifeveil:  { value, max: 100 },
    strain:    { value, max },
    supplies:  { value, max },
    morale:    { value, max: 100 },
    salvageParts: { value }
  },

  shipConditions: {
    hull: "sound",
    drive: "responsive",
    weapons: "ready"
  },

  blueprints: {
    shipModIds: [],
    arkengineModIds: [],
    weaponIds: []
  },

  inventory: {
    shipMods: {},
    arkengineMods: {},
    weapons: {}
  },

  refit: {
    workOrders: []
  },

  rewards: {
    pendingShip: []
  },

  progression: {
    level,
    xp,
    specializationId,
    specializationConfig,
    talentIds: [],
    arkcraftUpgrades: {}
  },

  // Separate authored hostile/narrative conditions, not the canonical
  // Hull/Drive/Weapons Ship Condition tracks.
  conditions: []
}
```

## Canonical Ship Conditions

Stored:

- `shipConditions.hull`: Sound / Battered / Breached / Shattered
- `shipConditions.drive`: Responsive / Sluggish / Faltering / Unresponsive
- `shipConditions.weapons`: Ready / Fouled / Malfunctioning / Barely Operable

Derived from percentages:

- Lifeveil: Stable / Degraded / Critical / Collapsed
- Morale: Inspired / Confident / Steady / Shaken / Faltering / Broken

Do not store duplicate Lifeveil or Morale condition states.

## Resources

### Hull

`resources.hull` stores current/max Hull Integrity.

Hull Condition changes effective Hardness. It does not reduce maximum Hull Integrity.

### Lifeveil

Always `0..100` with `max: 100`.

Legacy hull-specific Lifeveil point pools migrate proportionally. Old `lifeveilCapacity` derived data may remain hidden temporarily for component migration, but it does not control the current Lifeveil maximum.

### Morale

Always `0..100` with `max: 100`.

Legacy 0–5 values migrate proportionally. One old Morale point equals 20%.

### Strain

`resources.strain.max` remains vessel-derived. Strain is ship-wide and never belongs to a specific system.

### Supply

Supply occupies ordinary Cargo: 10 Supply = 1 Cargo Space.

The runtime may expose a convenience maximum equal to Cargo × 10, but there is no separate player-facing Supply Capacity stat.

## Derived Stats

`deriveShip()` is authoritative for effective combat values.

Ship Conditions modify derived values after installed component/talent effects:

- Hull Condition modifies Hardness.
- Drive Condition modifies Combat Speed and Maneuverability.
- Weapons Condition modifies Weapon Attack Bonus.
- Weapons Reload penalty is applied while hydrating installed combat weapon state.

Do not apply these condition penalties a second time in Foundry combat reconciliation.

## Migration

Schema v8 migrates older data as follows:

- old `areas.arkengine`, `areas.rigging`, `systems.arkengine`, `systems.rigging`, and `systems.helm` → Drive condition using the worst severity;
- old Hull Area/System severity → Hull condition;
- old Weapons system severity → Weapons condition;
- old Lifeveil current/max → proportional 0–100%;
- old Morale 0–5 → proportional 0–100%;
- old `areas` and `systems` are removed from the normalized persistent ship.

Deprecated compatibility exports/functions may remain during migration, but new code must not author persistent Area state.

## Component Contribution Model

Components may contribute:

- numeric `effects`;
- semantic `capabilities`;
- player-choice `unlocks`;
- semantic `tags`;
- explicit `ruleModifiers`.

Structured values such as Crew and Weapon Mounts are not generic numeric effect targets.

## Naming Lock

- **Arkengine Mods** modify the Arkengine.
- **Ship Mods** modify the vessel.
- **Rooms** are physical spaces/infrastructure.
- **Drive** is the shared persistent damage condition for propulsion/control; it is not a replacement name for Arkengine equipment.
- **Ship Conditions** is the player-facing persistent damage language.
- **Areas** is legacy migration terminology only.
