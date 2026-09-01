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
10. Arkengine Mod Catalog Completion — Standard + Rare Alpha bands complete; Epic next
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

## Part 10 — Arkengine Mod Catalog Completion

### Separate hardware family

Arkengine Mods remain a distinct physical hardware family with Arkengine-specific sockets. They are not silently folded into Ship Mods. Their identity must remain visibly tied to something installed on, inside, or directly supporting the Arkengine.

### Rarity progression

Arkengine Mods use the same rarity ladder and default ship-level gates as Ship Mods, but with a smaller specialized catalog:

| Rarity | Default minimum ship level | Alpha target | Current status |
|---|---:|---:|---|
| Standard | 1 | 18–22 | ✅ 22 baseline Mods migrated |
| Rare | 3 | 14–16 | ✅ 14 authored |
| Epic | 7 | 10–12 | next |
| Legendary | 12 | 7–8 | pending |
| Mythic | 17 | 4–5 | pending |

Legacy numeric Refit tiers remain temporary installation-cost compatibility metadata only. They do not determine player-facing rarity.

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

The existing 22-entry Arkengine Mod catalog has been migrated to **Standard** rarity while preserving its old numeric Refit tier as `legacyRefitTier` for cost compatibility.

Baseline concepts include pressure tuning, veil focusing, cooling loops, fuel-matrix efficiency, Stormwake injection, voidglass regulation, harmonic lattices, Overburn Catalysts, Deepwake stabilizers, core bracing, fuel siphons, Hushglass cowls, Hard Burn governors, grounding rods, harmonic prisms, pressure bypasses, resonance baffles, Quickspark injectors, ritual channeling rings, filter mesh, Coldwake condensers, and veil-pressure equalization.

Every Standard entry now has a real mechanical purpose through an effect, capability, rule modifier, signature unlock, or fuel hook.

### Rare Alpha band

The Rare band is now at the locked minimum target of **14 Mods**. Rare Arkengine hardware adds stronger effects plus upgrade-chain, fuel-hook, and cross-family build choices.

New Rare fittings include:

- **Pressure Lattice Governor** — replaces Pressure Lattice Tuning, adds +3 Strain Capacity and active pressure control.
- **Focused Veil Manifold** — replaces Veil Projector Focusing, adds +15 Lifeveil and recovery support.
- **Coldwake Recirculation Loop** — replaces Cooling Loop Expansion and can synergize with Trim-Sail Regulators for safer Hard Burn operation.
- **Refined Fuel Matrix** — replaces Fuel Matrix Efficiency and improves the authored fuel-efficiency hook without creating a mandatory fuel loop.
- **Stormwake Twin Injectors** — replaces Stormwake Injector, improves burst travel output, and can synergize with Stormproof Void Sails.
- **Deepwake Voidglass Heart** — replaces Voidglass Regulator and improves deep-void stability.
- **Resonant Choir Core** — replaces Choir Harmonic Lattice and improves ritual/veil-linked engine handling.
- **Controlled Overburn Catalysts** — replaces Overburn Catalysts and provides more controlled emergency output.
- **Aetherite Core Cage** — replaces Aetherite Core Bracing and adds +4 Strain Capacity plus repair support.
- **Deep-Reserve Fuel Siphons** — replaces Refined Fuel Siphons and expands fuel-capacity/reserve-access hooks.
- **Silent Hushglass Shroud** — replaces Hushglass Cowl and can synergize with Occult Signal Refractors for suppressed magical wake.
- **Precision Hard Burn Governor** — replaces Hard Burn Governor, reduces Hard Burn Strain cost by 2, and can synergize with Battlewake Control Fins.
- **Surge Grounding Array** — replaces Overcharge Grounding Rods and improves overcharge Strain handling.
- **Prismatic Lifeveil Feed** — replaces Lifeveil Harmonic Prism, adds +20 Lifeveil, and can synergize with Veil Harmonic Capacitors.

### Fuel hooks — no mandatory fuel subsystem yet

Part 10 does **not** invent a new mandatory Arkengine fuel-consumption gameplay loop.

Fuel-oriented Mods may author explicit hooks such as:

- fuel capacity,
- fuel efficiency,
- safer fuel handling,
- ritual fuel conversion,
- future authored interactions.

Those hooks are structured data for future consumers. Existing fuel-related derived values remain compatibility hooks until a later fuel contract explicitly defines when and how fuel is spent.

### Upgrade chains

Direct Arkengine Mod upgrade chains use the same replacement model as Ship Mods:

1. the predecessor Arkengine Mod must be installed;
2. the higher-rarity Mod replaces it;
3. the upgraded fitting inherits the predecessor's Arkengine socket;
4. the predecessor is consumed into the new fitting;
5. the upgrade must add meaningful new mechanics, not only larger numbers.

### Synergies

Arkengine Mod synergies may reference both:

- other installed Arkengine Mods; and
- compatible installed Ship Mods.

Most synergies should involve two total fittings. Three-component set bonuses begin at Epic. Cross-family synergies must be explicitly authored rather than inferred from tags.

Example intended pattern: an Arkengine governor plus racing sails can unlock an additional Hard Burn or drive benefit because the engine hardware and sail hardware were designed to operate together.

### Mythic Arkengine rules

Mythic Arkengine Mods may produce extreme effects such as:

- one free or reduced-cost Hard Burn,
- brief powered operation while the Arkengine Area is Disabled,
- converting a catastrophic overload into Strain,
- temporary propulsion surges,
- temporary Lifeveil surges,
- other campaign-defining Arkengine behavior.

Every Mythic core-rule exception must be bounded by a clear trigger, cost, usage limit, or hard duration. Unbounded permanent exceptions are invalid.

### Part 10 acceptance

Part 10 will be complete when:

- all five Arkengine rarity bands are inside their locked Alpha density ranges;
- every Arkengine Mod passes the shared Arkengine progression validator;
- upgrade replacement and socket inheritance are represented consistently;
- cross-family synergies are explicitly authored and validated;
- fuel remains hook-based unless a separate fuel contract is approved;
- Mythic Arkengine exceptions are bounded;
- the canonical Arkengine catalog is consumable by deriveShip, Refit, Character Sheet, GM generator, and Event/Combat work without translating legacy numeric tiers back into progression.
