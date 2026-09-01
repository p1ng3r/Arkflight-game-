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
7. Crew & Stations ✅
8. Rooms & Weapons Completion ✅
9. Ship Mod Catalog Completion ✅
10. Arkengine Mod Catalog Completion ✅
11. Canonical Derived Stat Registry ✅
12. Character Sheet Completion — next
13. Whole-Ship Operational Validator
14. GM Generator Catalog API
15. Event Manager <-> Ship Contract
16. Persistent Event Consequences
17. Hardware Interaction in Events
18. Full Glassback/Cinderwake Event Playthrough

## Parts 1–8 — locked foundation

The existing ship-domain modules and regression tests remain authoritative for the locked Parts 1–8 rules, including:

- 0 Hull = Wrecked, not automatically destroyed;
- Hull HP and Hull Area degradation remain separate systems;
- Lifeveil is environmental/magical protection and 0 Lifeveil = Offline/exposed;
- Area caps are Stable 100%, Stressed 90%, Damaged 65%, Critical 25%, Disabled 0%;
- one shared persistent Strain pool with one Area degradation maximum per discrete threshold resolution;
- Morale 0–5 with 0 Broken preventing Crew Tactics and 5 Inspired granting its locked once-per-round benefit;
- Supplies/Cargo/Salvage conversion and deprivation rules;
- under-Minimum and over-Maximum crew penalties;
- one primary officer per canonical station: Captain, Engineer, Navigator, Battlewatch, Veilwarden;
- Rooms require real gameplay purpose;
- Weapons are physical fittings with mount, crew, reload, arc, damage, System Threat, traits, Cargo, and short-handed operation rules.

## Part 9 — Ship Mod Catalog Completion ✅

Ship Mods are complete for Alpha across the locked rarity ladder:

| Rarity | Minimum ship level | Alpha target | Authored |
|---|---:|---:|---:|
| Standard | 1 | 22–26 | 22 ✅ |
| Rare | 3 | 20–22 | 20 ✅ |
| Epic | 7 | 18–20 | 18 ✅ |
| Legendary | 12 | 15–16 | 15 ✅ |
| Mythic | 17 | 8–9 | 8 ✅ |

Direct upgrade chains replace their predecessor and inherit its slot. Most synergies use two total fittings; three-component set bonuses begin at Epic. Mythic core-rule exceptions are always explicitly bounded. Legendary and Mythic acquisition remain restricted as previously locked.

## Part 10 — Arkengine Mod Catalog Completion ✅

Arkengine Mods remain a distinct physical hardware family with Arkengine-specific sockets. Their complete Alpha rarity spread is:

| Rarity | Default minimum ship level | Alpha target | Authored |
|---|---:|---:|---:|
| Standard | 1 | 18–22 | 22 ✅ |
| Rare | 3 | 14–16 | 14 ✅ |
| Epic | 7 | 10–12 | 10 ✅ |
| Legendary | 12 | 7–8 | 8 ✅ |
| Mythic | 17 | 4–5 | 5 ✅ |

Legacy numeric Refit tiers remain installation-cost compatibility metadata only. Arkengine Mods retain engine-specific identity around power output, Strain, Hard Burn, fuel hooks, Lifeveil interaction, cooling, stability, travel speed, emergency power, stealth, deep-void operation, ritual channeling, and unusual engine behavior. Cross-family synergies with Ship Mods are explicitly authored; three-component set bonuses begin at Epic; Mythic rule exceptions are bounded. Fuel remains hook-based and is not a mandatory subsystem.

## Part 11 — Canonical Derived Stat Registry ✅

`src/ship/derived-stat-registry.js` is now the single authority for the derived ship-stat vocabulary.

### Locked registry behavior

- Generic component effects may target only registered numeric effect paths.
- Unknown effect targets fail loudly instead of silently creating dead properties.
- Structured values such as Crew limits, weapon mounts, and resistance profiles are registered separately from generic numeric effects.
- `deriveShip()` creates defaults from the registry, applies authored components and Talents, normalizes final values, and returns one canonical derived-stat object.
- Final floors apply where rules require non-negative values, including Hull, Lifeveil, Strain, Cargo, Speed, fitting capacities, and Hard Burn cost.
- Detection, Maneuverability, attack/check modifiers, and similar penalties may legitimately resolve below zero.

### Character-sheet presentation groups

Canonical stats are classified for downstream UI instead of requiring each interface to invent its own lists:

- **Primary:** Armor Class, Hull, Lifeveil, Strain, Cargo, Detection, Combat Speed, Maneuverability.
- **Operational:** Hardness, weapon attack and defensive/repair bonuses, Crew limits, fitting capacities, Crew Tactic capacity, Supply and Morale capacities, weapon mounts, unified resistances.
- **Technical:** repair percentages, Supply-use modifier, Action/Reaction bonuses, all-station bonus, Arkengine fuel slots, Hard Burn cost, voyage travel-time modifier.
- **Hidden progression:** Arkcraft upgrade counters and Mythic capability-count bookkeeping.

### Unified resistance profile

Hull `physicalResistances` is retained only as legacy/base authored input. The authoritative derived result is `stats.resistances`:

- unconditional resistances from Hull and installed hardware resolve to the highest applicable value per damage type rather than stacking;
- conditional resistances retain their value, condition, and source fitting separately;
- downstream Character Sheet, Combat, Event, and GM generator work should consume the unified profile instead of reading Mod metadata directly.

### Part 11 acceptance — complete

Part 11 is complete because:

- all currently authored component effect targets pass the canonical registry validator;
- Ship Talent numeric effects are represented in the same vocabulary;
- derived stat defaults no longer live as an ad-hoc literal inside `deriveShip()`;
- final floors and presentation metadata are registry-owned;
- resistance data has one canonical derived output;
- exact-head CI passed the registry, normalization, presentation, and resistance tests.

### Catalog presentation direction

Player/GM-facing catalogs will ultimately be exposed through Foundry Compendium packs while the JavaScript catalogs remain the mechanical authority. Planned browseable packs include Hulls & Patterns, Arkengines, Ship Mods, Arkengine Mods, Rooms, Ship Weapons, and Ship Talents. Compendium documents are presentation/discovery assets and must not become an independent competing rules source.

## Next — Part 12: Character Sheet Completion

Part 12 consumes the canonical derived registry and finished catalogs to turn the Vehicle Actor sheet into the authoritative, readable operational interface rather than a catalog dump. The sheet should emphasize ship state and installed hardware, while Compendium packs and focused selection/refit workflows handle discovery of uninstalled options.
