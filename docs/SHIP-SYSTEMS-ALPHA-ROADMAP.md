# Arkflight Ship Systems Alpha Roadmap

**Branch:** `feature/ship-systems-alpha`

**Purpose:** Finish the Arkflight Vehicle Actor as the authoritative persistent ship object before final Event Manager integration and before the GM Operations generator consumes the catalogs.

## Locked execution order

1. Authoritative Ship Rules Contract
2. Hull & Damage
3. Lifeveil
4. Strain & Area Readiness
5. Morale
6. Supplies, Cargo & Salvage Economy
7. Crew & Stations
8. Rooms & Weapons Completion
9. Ship Mod Catalog Completion
10. Arkengine Mod Catalog Completion
11. Canonical Derived Stat Registry
12. Character Sheet Completion
13. Whole-Ship Operational Validator
14. GM Generator Catalog API
15. Event Manager <-> Ship Contract
16. Persistent Event Consequences
17. Hardware Interaction in Events
18. Full Glassback/Cinderwake Event Playthrough

## Part 1 — Authoritative Ship Rules Contract

### Existing authority preserved

The existing `SHIP-CONDITION-STRAIN-CONTRACT.md` remains authoritative for:

- one shared persistent Strain pool,
- five persistent Areas: Hull, Arkengine, Rigging, Lifeveil, Morale,
- `Stable -> Stressed -> Damaged -> Critical -> Disabled`,
- Area integrity bands and station penalties,
- repair/recovery framework,
- persistent Voyage-to-combat carryover.

### Newly locked rules

#### Hull at zero

0 Hull means **Disabled / Wrecked**, not automatically destroyed.

A wrecked ship:

- cannot perform normal operation,
- remains salvageable,
- remains repairable,
- is only destroyed by an explicit catastrophic rule, authored Event/Combat consequence, or GM ruling/effect.

#### Cargo-bearing resources and hardware

The following consume Cargo Capacity:

- Supplies,
- Salvage Parts,
- uninstalled physical Ship Mods,
- uninstalled physical Arkengine Mods,
- uninstalled physical Weapons,
- ordinary cargo.

Installed hardware does not also consume Cargo Capacity. Installed Ship Mods, Arkengine Mods, and Weapons consume their installation/mount capacity instead.

Exact cargo-unit conversion values are intentionally deferred to Part 6.

#### Morale scale

Morale remains a compact 0–5 resource:

| Value | Band |
|---:|---|
| 5 | Inspired |
| 4 | Confident |
| 3 | Steady |
| 2 | Shaken |
| 1 | Faltering |
| 0 | Broken |

The Morale Area remains the persistent degradation/readiness state. Morale resource-band bonuses/penalties are deferred to Part 5 so the resource and Area do not accidentally duplicate mechanics.

### Architectural invariant

The character sheet displays persistent/derived state. Domain rules determine state.

The Ship Sheet, GM Operations generator, Ship Combat, Refit, Voyage/Event Manager, and future downtime systems must consume the same ship-domain rules instead of maintaining parallel copies.
