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
10. Arkengine Mod Catalog Completion — next
11. Canonical Derived Stat Registry
12. Character Sheet Completion
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

### Rarity progression

Ship Mods use the player-facing rarity ladder:

| Rarity | Default minimum ship level | Alpha target | Alpha authored |
|---|---:|---:|---:|
| Standard | 1 | 22–26 | 22 ✅ |
| Rare | 3 | 20–22 | 20 ✅ |
| Epic | 7 | 18–20 | 18 ✅ |
| Legendary | 12 | 15–16 | 15 ✅ |
| Mythic | 17 | 8–9 | 8 ✅ |

Legacy numeric Refit tiers remain temporary installation-cost compatibility metadata only. They are not the progression identity.

### Shared catalog rules

Every Ship Mod must provide at least one real mechanic: derived-stat effect, resistance, capability, action/Mastery/combat/passive unlock, explicit rule modifier, Event/Combat interaction, or authored synergy.

Mods may affect Hull, Arkengine, Rigging, Lifeveil, Morale/Command, AC, PF2e-style resistances, maneuverability, speed, Cargo, Detection, crew support, repair/recovery, logistics, combat, Voyage/Event interactions, and cross-system behavior.

The catalog is intentionally spread across the ship rather than concentrating all useful options in one Area.

### Upgrade chains

Direct upgrade-chain Mods:

1. require the authored predecessor to be installed;
2. replace that predecessor when completed;
3. inherit its installation slot;
4. consume the predecessor into the upgraded fitting instead of returning a duplicate physical component;
5. add meaningful new mechanics as well as stronger numbers.

Standalone Mods remain independently installable.

### Synergies

Synergy counts refer to total participating fittings, including the Mod that owns the synergy.

- Normal synergies are usually 2-Mod combinations and therefore name one other required Mod.
- 3-Mod set bonuses begin at Epic and name two other required Mods.
- Synergies are explicitly authored rather than inferred from tags.
- Synergy components retain their own normal slots unless one component is itself a direct replacement-chain upgrade.

### Resistance model

Resistance Mods use explicit PF2e-style positive values such as Resistance 5 fire or Resistance 15 physical. Higher rarities may grant stronger values, multiple resistances, or conditional resistances such as protection only while Lifeveil is online.

### Acquisition

- Standard: ordinary shipyard/market acquisition may be available.
- Rare: limited purchase/reward sources.
- Epic: exceptional purchase or significant reward sources.
- Legendary: no ordinary purchase; exceptional shipyard/faction/discovery/unique blueprint or equivalent source required.
- Mythic: never an ordinary shop/catalog purchase; campaign-defining rewards only.

### Mythic identity

Mythic Mods combine major numerical effects with unique capabilities and may alter a core ship rule only through an explicitly bounded exception.

The Alpha Mythic band contains eight campaign-defining fittings:

- **Eternity Worldroot Frame** — +120 Hull, +3 AC; once/event Hull-zero refusal at a Strain cost.
- **Crown of the Ninefold Fortress** — +6 AC, +60 Hull, Resistance 15 physical and Resistance 10 force; mythic fortress set.
- **Worldfire Arkengine Nexus** — +12 Strain Capacity; once/event one round of powered movement while Arkengine Area is Disabled, followed by +3 Strain.
- **Wings of the First Dawn** — +7 combat speed, +3 maneuverability; once/event one movement action despite Disabled Rigging at +2 Strain.
- **Veil of the First Firmament** — +80 Lifeveil; once/event extend protection to one allied vessel for one discrete resolution at a 20-Lifeveil cost.
- **Oracle of the Last Horizon** — +12 Detection plus Battlewatch/Navigator foresight support and a three-component command synergy.
- **Sovereign Concordance of Five Stations** — mythic command network; once/event permits one Crew Tactic while Morale is Broken, then adds +1 Strain.
- **Singularity Strain Vault** — +10 Strain Capacity; once/event prevent the Area degradation from one threshold crossing, with delayed Strain cost.

Every Mythic core-rule exception must author a trigger, usage restriction, cost, and/or hard limit. Unbounded permanent exceptions are invalid Alpha content.

### Part 9 acceptance

Part 9 is complete when the canonical merged Ship Mod catalog contains all five rarity bands, every band is inside its locked Alpha density range, the entire catalog passes the shared progression validator, upgrade/synergy semantics remain consistent, and Mythic exceptions are bounded.

The repository now contains explicit whole-catalog acceptance tests for those conditions.

## Part 10 — Arkengine Mod Catalog Completion

Next work is to complete the Arkengine Mod catalog as a separate hardware family. Arkengine Mods continue to use Arkengine-specific sockets and must not be silently folded into Ship Mods.
