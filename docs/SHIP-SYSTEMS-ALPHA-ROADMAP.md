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
9. Ship Mod Catalog Completion — Standard + Rare Alpha bands complete; Epic next
10. Arkengine Mod Catalog Completion
11. Canonical Derived Stat Registry
12. Character Sheet Completion
13. Whole-Ship Operational Validator
14. GM Generator Catalog API
15. Event Manager <-> Ship Contract
16. Persistent Event Consequences
17. Hardware Interaction in Events
18. Full Glassback/Cinderwake Event Playthrough

## Parts 1–8

Parts 1–8 are design-locked and implemented on this branch. Their authoritative rules remain represented in the ship-domain modules and regression tests.

### Core locked rules retained

- 0 Hull = Wrecked, not automatically destroyed.
- Hull HP and Hull Area damage are distinct.
- Lifeveil is environmental/magical protection; 0 Lifeveil = Offline/exposed.
- Area caps are Stable 100%, Stressed 90%, Damaged 65%, Critical 25%, Disabled 0%.
- Shared Strain threshold resolution degrades at most one threatened Area per discrete result and preserves overflow.
- Morale is mechanically 0–5 but should be presented as five tankards in the player UI.
- Daily Supplies = 1 per 10 people aboard, rounded up; 10 Supplies = 1 Cargo; 10 Salvage Parts = 1 Cargo.
- At 0 Supplies: -1 Morale/day and +1 Strain every second day.
- Under Minimum crew: -1 circumstance penalty per missing operating crew member. Over Maximum occupancy: -1 circumstance penalty per extra person aboard.
- Each canonical station has one primary officer; empty stations are legal but unavailable without an explicit substitute rule.
- Every Room must have a real gameplay purpose.
- Weapons are physical fittings with mount, crew, reload, arc, damage, System Threat, traits, and Cargo metadata; short-handed use is -1 per missing required crew member.

## Part 9 — Ship Mod Catalog Completion

### Mod progression is rarity-based

Ship Mods no longer use generic numeric tiers as their player-facing progression authority.

| Rarity | Default minimum ship level | Alpha catalog target | Current Alpha status |
|---|---:|---:|---|
| Standard | 1 | 22–26 | ✅ minimum target authored |
| Rare | 3 | 20–22 | ✅ 20 authored |
| Epic | 7 | 18–20 | next |
| Legendary | 12 | 15–16 | pending |
| Mythic | 17 | 8–9 | pending |

These are Alpha catalog density targets, not hard lifetime caps.

Existing legacy Refit tier values remain temporarily preserved only as installation-cost compatibility metadata while Refit economics are migrated. They are not the new progression identity.

### Standard Alpha band

The Standard band is inside the locked target and includes practical choices across structural durability, cargo, helm/rigging, Lifeveil, command, detection, logistics, repair, maneuverability, speed, Strain, and PF2e-style resistance.

Baseline fittings added specifically to seed later upgrade families include:

- **Firebreak Plating** — Resistance 5 fire.
- **Stormgrounding Mesh** — Resistance 5 electricity.
- **Trim-Sail Regulators** — +1 combat speed.
- **Crew Muster Bell Network** — command/crew-muster support.
- **Veil-Warded Bulkheads** — +5 Lifeveil Capacity plus recovery support.

### Rare Alpha band

The Rare band is now at the locked minimum target of **20 Mods**. Rare content combines stronger numerical effects with specialized capabilities, direct replacement upgrades, explicit resistances, and authored 2-Mod synergies.

New Rare fittings include:

- **Aether-Bound Ribbing** — replaces Reinforced Structural Ribbing and increases Hull Integrity by 35.
- **Merchant-Prime Cargo Lattice** — replaces Expanded Cargo Lattice, adds 40 Cargo Capacity, and can synergize with reinforced docking hardware.
- **Precision Helm Relays** — replaces Stabilized Helm Relays and grants +2 Maneuverability.
- **Battleline Signal Array** — fleet/command coordination with a Crew Muster synergy.
- **Stormglass Firebreak Shell** — replaces Firebreak Plating, adds +1 AC and Resistance 10 fire.
- **Veil Resonance Relay** — replaces Emergency Veil Relay and adds Lifeveil capacity plus improved recovery support.
- **Deep-Void Armor Web** — replaces Deep Void Reinforcement and adds cold/void resistance.
- **Grounded Conduit Bus** — replaces Stormgrounding Mesh, adds Strain Capacity and Resistance 10 electricity.
- **Stormproof Void Sails** — replaces Reinforced Void Sails, adds +2 combat speed and Hard Burn strain support.
- **Battlewatch Scrying Crown** — replaces Lookout Spire and improves immediate threat detection.
- **Salvage Winch Clusters** — replaces Docking Claw System and improves Cargo/salvage handling.
- **Battlewake Control Fins** — replaces Reinforced Maneuvering Fins, grants +2 Maneuverability, and synergizes with Trim-Sail Regulators.
- **Crew Cohesion Network** — replaces Crew Muster Bell Network and improves morale recovery/station reassignment support.
- **Ablative Iron Sheathing** — +2 AC and Resistance 5 piercing.
- **Veil Harmonic Capacitors** — +20 Lifeveil Capacity with a Veil-Warded Bulkhead synergy.

The inherited Rare entries remain part of the band where they already provide valid Arkflight roles.

### Synergy participant counting

A synergy count refers to the **total number of installed fittings participating**, including the Mod that owns the synergy definition.

- A normal 2-Mod synergy therefore names **one other required Mod**.
- An Epic+ 3-Mod set bonus names **two other required Mods**.
- Three-Mod sets remain invalid below Epic.

This prevents the data schema from accidentally turning a stated 2-Mod synergy into a hidden 3-Mod requirement.

### Higher rarity means power plus uniqueness

Rarity progression combines larger numerical improvements and stronger rule-changing effects.

- **Standard:** practical baseline fittings and straightforward stat/capacity improvements.
- **Rare:** stronger numbers and/or a specialized capability.
- **Epic:** substantial numerical effect combined with capabilities, action interactions, or Event/Combat hooks.
- **Legendary:** build-defining hardware with strong numbers and rules that materially alter vessel operation.
- **Mythic:** extraordinary vessel-defining hardware combining major numerical impact with unique actions, capabilities, or bounded rule exceptions.

Higher rarity must not collapse into only larger numeric bonuses. Unique effects also do not prevent a high-rarity Mod from providing appropriately stronger numbers.

### Effect coverage is broader than the five Areas

The Alpha catalog should be distributed roughly evenly across Hull, Arkengine, Rigging, Lifeveil, and Morale/Command, with a smaller cross-system/logistics pool.

Mods may also directly improve or alter other ship statistics and operations, including Armor Class, PF2e-style resistances, maneuverability, combat/travel speed, Cargo Capacity, Detection, crew support, recovery and repair, combat actions, Voyage/Event interactions, logistics/salvage, and cross-system rules.

### Upgrade chains replace their predecessor

A Mod concept may have higher-rarity descendants. Some descendants require a lower-rarity Mod already installed before they can be fitted.

For a direct upgrade chain:

1. the predecessor must be installed to qualify for the upgrade;
2. completing the upgrade replaces the predecessor rather than leaving both installed;
3. the new fitting inherits the predecessor's installation slot instead of consuming an additional slot;
4. the predecessor is consumed into the upgraded fitting rather than returned as a second usable physical component;
5. the upgraded Mod must add meaningful new mechanics as well as any stronger numbers.

Standalone Mods remain independently installable and do not need artificial predecessors.

### Synergy bonuses

Specific installed Mod combinations may unlock additional bonuses.

- Most synergies are 2-Mod combinations.
- A smaller number of stronger 3-Mod set bonuses are allowed beginning at Epic rarity.
- Synergies do not replace their component Mods; unrelated components retain their normal slots.
- Synergy is authored, not inferred from matching tags.

A synergy must provide a real additional effect, capability, rule modifier, action/Mastery interaction, or Event/Combat benefit.

### Resistance model

Resistance-granting Mods use explicit PF2e-style resistance values such as Resistance 5 fire or Resistance 10 electricity. Higher-rarity Mods may grant stronger values, multiple resistance types, or conditional/context-sensitive resistance.

### Mythic rule exceptions

Mythic Mods may alter a core ship rule, including surviving a Hull-zero result, limited operation while an Area is Disabled, extending Lifeveil to another vessel, or temporarily ignoring a Strain threshold.

Every Mythic core-rule exception must be bounded by an explicit limit, cost, trigger, or usage restriction.

### Acquisition rules

- **Standard:** ordinary shipyard/market acquisition may be available.
- **Rare:** may be purchasable or awarded through more limited sources.
- **Epic:** may be purchasable only through suitably exceptional sources or earned as significant rewards, depending on authored content.
- **Legendary:** not an ordinary catalog purchase; requires exceptional shipyards, major factions, discoveries, unique blueprints, or equivalent GM-authored sources.
- **Mythic:** never an ordinary shop/catalog purchase; Mythic hardware comes from campaign-defining sources.

### Every Mod must do something real

A Ship Mod is invalid if it provides none of the following: derived-stat effect, capability, Mastery/action/combat-action/passive unlock, explicit rule modifier, Event/Combat interaction, authored synergy effect, or explicit resistance.

### Canonical terminology

New player-facing catalog data uses **Battlewatch**. Legacy `watchmaster` identifiers may remain internally only where compatibility with existing signatures/migrations still requires them; they are not the canonical displayed station name.
