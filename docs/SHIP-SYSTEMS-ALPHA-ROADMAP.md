# Arkflight Ship Systems Alpha Roadmap

**Branch:** `feature/ship-systems-alpha`

**Purpose:** Finish the Arkflight Vehicle Actor as the authoritative persistent ship object before final Event Manager integration and before the GM Operations generator consumes the catalogs.

## Locked execution order

1. Authoritative Ship Rules Contract ✅
2. Hull & Damage ✅
3. Lifeveil ✅
4. Strain & Area Readiness ✅
5. Morale ✅
6. Supplies, Cargo & Salvage Economy ✅
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

The Morale Area remains the persistent degradation/readiness state.

### Architectural invariant

The character sheet displays persistent/derived state. Domain rules determine state.

The Ship Sheet, GM Operations generator, Ship Combat, Refit, Voyage/Event Manager, and future downtime systems must consume the same ship-domain rules instead of maintaining parallel copies.

## Part 2 — Hull & Damage

Ordinary Hull HP damage does **not** automatically degrade the Hull Area. Hull Area degradation comes from shared Strain threshold resolution or an explicit authored effect.

Hull HP repair uses PF2e **Crafting** and physical **Salvage Parts**:

- 1 Salvage Part repairs 10 Hull on Success.
- Critical Success repairs 20 Hull per Salvage Part.
- Failure repairs nothing and preserves committed Salvage Parts.
- Critical Failure repairs nothing and consumes committed Salvage Parts.
- Base repair time is 1 hour per Salvage Part committed.
- Repair requires a valid safe repair site and cannot be performed while underway in the Void.
- Repair uses the PF2e level-based DC for ship level + 5.
- Mods, Talents, Rooms, specialists, or other authored effects may improve the shared repair rule.

0 Hull means **Wrecked**. Recommissioning requires a proper shipyard, takes 7 days, costs 25% of level-appropriate replacement/refit value, requires no roll, restores 10% Base Max Hull, and does not reset Areas, Strain, Lifeveil, Supplies, or other state.

Derived-stat synchronization must preserve legitimate zero Hull and Lifeveil values.

## Part 3 — Lifeveil

Lifeveil is the vessel's atmospheric/environmental envelope and magical shielding. It protects crew from Void exposure, hostile environments, aetheric hazards, and authored magical/energy threats.

At 0 Lifeveil the veil is **Offline**. The vessel may still move if other systems permit, but the crew is exposed to the outside environment.

Base Lifeveil stabilization:

- 1 hour.
- Veilwarden uses Arcana, Religion, Nature, or Occultism.
- Critical Success: restore 20% Base Max Lifeveil.
- Success: restore 10% Base Max Lifeveil.
- Failure: restore nothing.
- Critical Failure: restore nothing and gain +1 Strain.
- No default consumable cost.
- Mods, Talents, Rooms, specialists, and other authored effects may improve the shared rule.

## Part 4 — Strain & Area Readiness

Locked integrity caps:

| Area state | Effective integrity cap |
|---|---:|
| Stable | 100% |
| Stressed | 90% |
| Damaged | 65% |
| Critical | 25% |
| Disabled | 0% |

Hull and Lifeveil use Area state to determine Effective Maximum. Lowering the cap may reduce Current to the new cap. Improving the Area raises the cap but does not heal Current.

Direct Hull or Lifeveil depletion does not automatically degrade its Area.

For one discrete Strain contribution:

1. Add Strain to the shared persistent pool.
2. If below the Strain Limit, retain it with no Area degradation.
3. If at or above the limit, degrade the threatened Area exactly one state.
4. Subtract exactly one full Strain Limit.
5. Preserve overflow.
6. A single discrete resolution causes at most one Area degradation.

Disabled is the bottom of the ladder; no sixth Area state exists.

## Part 5 — Morale

Morale is a short-term 0–5 crew-spirit resource while the Morale Area represents persistent command/cohesion damage.

### UI presentation

The ship sheet should not lead with a raw Morale number. Present Morale as **five tankards/beer mugs**, filled or empty, with the named band visible by tooltip/label. The numerical 0–5 value remains canonical under the hood.

### Mechanical bands

- **5 Inspired:** once per round, the crew may apply a +1 circumstance bonus to one Arkflight station check.
- **4 Confident:** no automatic modifier.
- **3 Steady:** normal baseline.
- **2 Shaken:** no automatic modifier.
- **1 Faltering:** warning state, no automatic numeric modifier.
- **0 Broken:** Crew Tactics are unavailable until Morale rises above 0.

Normal authored Morale changes are typically ±1, while exceptional/catastrophic effects may explicitly change more. Morale always clamps 0–5.

### Safe-rest recovery

- 8 hours safe rest restores +1 Morale.
- Ordinary rest cannot raise Morale above 3 Steady.
- Morale above 3 requires a positive authored cause such as success, Captain action, shore leave, reward, Room, Mod, Talent, or other explicit effect.
- Mods/Talents/Rooms/specialists may improve recovery amount or ceiling through the shared Morale recovery rule.

## Part 6 — Supplies, Cargo & Salvage Economy

### Daily Supplies

A crewed active vessel consumes Supplies at the rate of **1 Supply per day per 10 crew aboard**, rounded up, with a minimum of 1 Supply/day for any crewed vessel.

Examples:

- 1–10 crew: 1 Supply/day.
- 11–20 crew: 2 Supplies/day.
- 21–30 crew: 3 Supplies/day.
- 0 crew: 0 Supplies/day.

### Cargo conversion

Locked Cargo conversion:

- **10 Supplies = 1 Cargo**.
- **10 Salvage Parts = 1 Cargo**.
- Uninstalled Ship Mods consume Cargo equal to their authored Refit slot cost per physical fitting.
- Uninstalled Arkengine Mods consume Cargo equal to their authored Refit slot cost per physical fitting.
- Uninstalled Weapons consume their authored Cargo value.
- Ordinary cargo consumes its authored/direct Cargo value.
- Installed Ship Mods, Arkengine Mods, and Weapons do not also consume Cargo; their installation/mount capacity is the relevant limit once installed.

Partial Supply/Salvage stacks use proportional Cargo accounting, so one Supply or one Salvage Part is 0.1 Cargo.

### Running out of Supplies

At 0 Supplies, each full day without Supplies causes:

- **-1 Morale per day**.
- **+1 Strain every second day** without Supplies.

These consequences use the same canonical Morale and Strain systems and do not create separate starvation/stress tracks.
