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

### Separate hardware family

Arkengine Mods remain a distinct physical hardware family with Arkengine-specific sockets. They are not silently folded into Ship Mods. Their identity must remain visibly tied to something installed on, inside, or directly supporting the Arkengine.

### Rarity progression

Arkengine Mods use the same rarity ladder and default ship-level gates as Ship Mods, with the smaller specialized Alpha catalog now complete:

| Rarity | Default minimum ship level | Alpha target | Authored |
|---|---:|---:|---:|
| Standard | 1 | 18–22 | 22 ✅ |
| Rare | 3 | 14–16 | 14 ✅ |
| Epic | 7 | 10–12 | 10 ✅ |
| Legendary | 12 | 7–8 | 8 ✅ |
| Mythic | 17 | 4–5 | 5 ✅ |

Legacy numeric Refit tiers remain installation-cost compatibility metadata only. They do not determine player-facing rarity.

### Arkengine Mod identity

Arkengine Mods primarily modify engine-linked behavior such as:

- power output,
- shared Strain handling,
- Hard Burn,
- fuel capacity/efficiency hooks,
- Lifeveil interaction,
- cooling,
- engine stability,
- travel speed,
- emergency power,
- stealth/signature suppression,
- deep-void operation,
- ritual channeling,
- unusual Arkengine behavior.

They may affect general ship statistics when the effect is clearly caused by Arkengine hardware, but should not become generic Ship Mods with an engine-themed description.

### Standard Alpha band

The existing 22-entry Arkengine Mod catalog is the Standard band while preserving old numeric Refit tier data as `legacyRefitTier` for cost compatibility. Baseline concepts include pressure tuning, veil focusing, cooling loops, fuel-matrix efficiency, Stormwake injection, voidglass regulation, harmonic lattices, Overburn Catalysts, core bracing, fuel siphons, Hushglass cowls, Hard Burn governors, grounding rods, harmonic prisms, Quickspark injectors, ritual channeling rings, Coldwake condensers, and veil-pressure equalization.

Every Standard entry has a real mechanical purpose through an effect, capability, rule modifier, signature unlock, or fuel hook.

### Rare Alpha band

The Rare band contains 14 Mods. It adds stronger effects, direct replacement chains, authored fuel hooks, and cross-family Ship Mod synergies. Representative fittings include Pressure Lattice Governor, Focused Veil Manifold, Coldwake Recirculation Loop, Refined Fuel Matrix, Stormwake Twin Injectors, Deepwake Voidglass Heart, Resonant Choir Core, Controlled Overburn Catalysts, Aetherite Core Cage, Deep-Reserve Fuel Siphons, Silent Hushglass Shroud, Precision Hard Burn Governor, Surge Grounding Array, and Prismatic Lifeveil Feed.

### Epic Alpha band

The Epic band contains 10 Mods and introduces the first true three-component Arkengine/Ship Mod set bonuses. It includes Harmonic Pressure Dynamo, Seraphic Veil Reactor, Absolute-Zero Recirculator, Consecrated Fuel Crucible, Tempest Triad Injectors, Black-Tide Stability Core, Grand Choir Resonator, Phoenix Overburn Chamber, Adamant Core Suspension, and Sovereign Hard Burn Governor.

Epic hardware changes play through stronger Strain control, emergency output, ritual support, pursuit-drive combinations, Lifeveil reinforcement, and explicit Event/Hard Burn interactions rather than relying on larger numbers alone.

### Legendary Alpha band

The Legendary band contains 8 build-defining Mods: Worldheart Pressure Dynamo, Aegis-Sun Veil Reactor, Winterstar Recirculation Crown, Saintfire Fuel Reliquary, Thunderlord Tempest Injectors, Abyssal Tide Stability Heart, Archon Overburn Forge, and Crown of the Sovereign Burn.

Legendary Arkengine Mods may create powerful cross-system builds and three-component sets, but they do not receive Mythic core-rule exceptions.

### Mythic Alpha band

The Mythic band contains 5 campaign-defining fittings:

- **Singularity Worldheart Dynamo** — once per event can suppress one Strain-threshold degradation of the Arkengine Area while threshold consumption and overflow still resolve.
- **Firmament Veil Heart** — once per event can sustain Lifeveil for one round after the Arkengine Area becomes Disabled, at a Lifeveil cost.
- **Crown of the First Burn** — once per event can ignore the base Strain cost of one Hard Burn, with a delayed Arkengine-threatening Strain cost.
- **Godspark Emergency Nexus** — once per event can force a Disabled Arkengine to function for one round, followed by +3 Strain threatening Arkengine.
- **Saintfire Eternity Reliquary** — once per event can waive one explicitly authored Arkengine fuel expenditure without creating a universal fuel-consumption rule.

Every Mythic exception has an explicit trigger, usage limit, hard boundary, and where appropriate a direct cost. Permanent unbounded rule bypasses remain invalid.

### Fuel hooks — no mandatory fuel subsystem yet

Part 10 does **not** invent a mandatory Arkengine fuel-consumption gameplay loop. Fuel-oriented Mods may author structured hooks such as fuel capacity, fuel efficiency, safer fuel handling, ritual fuel conversion, fuel memory, and future authored interactions. Existing fuel-related derived values remain compatibility hooks until a later fuel contract explicitly defines when and how fuel is spent.

### Upgrade chains

Direct Arkengine Mod upgrade chains use the same replacement model as Ship Mods:

1. the predecessor Arkengine Mod must be installed;
2. the higher-rarity Mod replaces it;
3. the upgraded fitting inherits the predecessor's Arkengine socket;
4. the predecessor is consumed into the new fitting;
5. the upgrade must add meaningful new mechanics, not only larger numbers.

### Synergies

Arkengine Mod synergies may reference both other installed Arkengine Mods and compatible installed Ship Mods. Most synergies involve two total fittings. Three-component set bonuses begin at Epic. Cross-family synergies are explicitly authored rather than inferred from tags.

### Part 10 acceptance — complete

Part 10 is complete because:

- all five Arkengine rarity bands are inside their locked Alpha density ranges;
- every current Arkengine Mod passes the shared progression validator;
- upgrade replacement and socket inheritance are represented consistently;
- cross-family synergies are explicitly authored and validated;
- fuel remains hook-based rather than becoming a mandatory subsystem;
- all Mythic Arkengine exceptions are bounded;
- the canonical Arkengine catalog is consumable by downstream deriveShip, Refit, Character Sheet, GM generator, Event, and Combat work without translating legacy numeric tiers back into progression.

## Next — Part 11: Canonical Derived Stat Registry

Part 11 will define the authoritative registry of derived ship statistics and their consumers so Ship Mods, Arkengine Mods, Rooms, Weapons, Hulls, Patterns, Talents, Events, Combat, and the Character Sheet do not invent competing stat names or silently ignore authored effects.
