# Arkflight Ship Systems Alpha Roadmap

**Branch:** `feature/ship-systems-alpha`

**Purpose:** Finish the Arkflight Vehicle Actor as the authoritative persistent ship object before final Event Manager integration and before the GM Operations generator consumes the catalogs.

## Locked execution order

1. Authoritative Ship Rules Contract ✅
2. Hull & Damage ✅
3. Lifeveil ✅
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

## Part 2 — Hull & Damage

### Hull HP and Hull Area are related but distinct

Ordinary Hull HP damage does **not** automatically degrade the Hull Area.

Hull Area degradation comes from the shared Strain threshold system, authored critical/catastrophic effects, or another explicit rule. This prevents Hull HP and Hull Area state from becoming duplicate damage tracks.

### Hull HP repair

Hull HP repair uses the assigned repairer's native PF2e **Crafting** check and physical **Salvage Parts**.

Base repair economy:

- 1 Salvage Part repairs 10 Hull on Success.
- Critical Success repairs twice the normal amount: 20 Hull per Salvage Part.
- Failure repairs nothing and does not consume the committed Salvage Parts.
- Critical Failure repairs nothing and consumes the committed Salvage Parts.
- Base repair time is **1 hour per Salvage Part committed**.
- Critical Success improves repaired Hull, not the base time.

Hull repair may not be performed while the ship is **underway in the Void**. The ship must be in a valid safe repair situation such as landed, docked, anchored, berthed, or another GM-authorized secure repair site.

The repair check uses the standard PF2e level-based DC for **ship level + 5**. Do not add ship level to a DC a second time after resolving the level-based DC.

Installed Mods, Ship Talents, Rooms, specialists, or other authored permanent effects may explicitly improve Hull repaired per Part, repair time, efficiency, or other repair parameters. They modify the shared Hull repair rule rather than creating parallel repair systems.

Hull HP repair is separate from Area repair. Hull HP repair restores numerical structural integrity; Hull Area repair improves the persistent `Stable -> Disabled` readiness condition.

### Zero Hull and wreck recommissioning

0 Hull means **Wrecked**.

A Wrecked vessel cannot be brought back through ordinary emergency Hull patching and cannot be recommissioned in the Void.

Recommissioning requires a proper **shipyard**.

Locked base recommission rules:

- Time: **7 days**.
- Cost: **25% of the vessel's level-appropriate replacement/refit value**.
- Check: **none**; this represents professional shipyard reconstruction.
- Restored Hull: **10% of Base Max Hull**.

Normal Hull HP repairs may continue after recommissioning.

Recommissioning does not automatically repair degraded Areas, clear Strain, refill Lifeveil, restore Supplies, or otherwise reset the ship.

### Zero-value persistence bug guard

Derived-stat synchronization must preserve a legitimate current Hull value of `0`; recalculating maximum Hull from components must never treat zero as an uninitialized value and heal a Wrecked ship back to maximum. The same guard is applied to Lifeveil zero values ahead of Part 3.

## Part 3 — Lifeveil

### Identity

Lifeveil is the vessel's **atmospheric/environmental envelope and magical shielding**. It protects the crew from Void exposure, hostile environments, aetheric hazards, and authored magical/energy threats. It is not merely a temporary-hit-point buffer.

### Lifeveil at zero

At **0 Lifeveil**, the Lifeveil is **Offline**.

The vessel may still move if Hull, Arkengine, and Rigging permit, but the environmental envelope and magical shielding are unavailable. Everyone aboard is exposed to the outside environment. In a safe atmosphere this may be harmless; in the Void or another hostile environment it becomes an immediate serious hazard resolved by the applicable Event, Combat, environmental, or GM-authored rules.

### Base stabilization / recovery

Base Lifeveil recovery requires **1 hour** of stabilization by the Veilwarden using one of:

- Arcana,
- Religion,
- Nature,
- Occultism.

Base degree results:

- Critical Success: restore **20% of Base Max Lifeveil**.
- Success: restore **10% of Base Max Lifeveil**.
- Failure: restore nothing.
- Critical Failure: restore nothing and gain **+1 Strain**.

Base stabilization consumes **no Supplies or other consumable resource**.

Installed Ship Mods, Arkengine Mods, Rooms, specialists, Ship Talents, or other authored permanent effects may explicitly improve recovery percentage, stabilization time, permitted skills, Strain risk, or other parameters. They modify the shared Lifeveil recovery rule rather than creating a parallel recovery system.
