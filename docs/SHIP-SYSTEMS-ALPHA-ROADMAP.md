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
9. Ship Mod Catalog Completion — Standard Alpha band complete; higher rarities next
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
| Standard | 1 | 22–26 | ✅ 22 authored |
| Rare | 3 | 20–22 | in progress |
| Epic | 7 | 18–20 | in progress |
| Legendary | 12 | 15–16 | in progress |
| Mythic | 17 | 8–9 | in progress |

These are Alpha catalog density targets, not hard lifetime caps.

Existing legacy Refit tier values remain temporarily preserved only as installation-cost compatibility metadata while Refit economics are migrated. They are not the new progression identity.

### Standard Alpha band

The Standard band is now at the locked minimum target of **22 Mods**. It includes practical choices across structural durability, cargo, helm/rigging, Lifeveil, command, detection, logistics, repair, maneuverability, speed, Strain, and PF2e-style resistance.

New baseline fittings added to complete the Standard band include:

- **Firebreak Plating** — Resistance 5 fire.
- **Stormgrounding Mesh** — Resistance 5 electricity.
- **Trim-Sail Regulators** — +1 combat speed with an efficient-sail-trim capability.
- **Crew Muster Bell Network** — command/crew-muster support and signal redundancy.
- **Veil-Warded Bulkheads** — +5 Lifeveil Capacity plus Lifeveil recovery support.

These entries are deliberately useful as future upgrade-chain roots for Rare/Epic descendants.

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

Mods may also directly improve or alter other ship statistics and operations, including:

- Armor Class,
- PF2e-style resistances,
- maneuverability,
- combat/travel speed,
- Cargo Capacity,
- Detection,
- crew support,
- recovery and repair,
- combat actions,
- Voyage/Event interactions,
- logistics and salvage,
- cross-system rules.

No single Area should dominate the catalog simply because it has more obvious numerical targets.

### Upgrade chains replace their predecessor

A Mod concept may have higher-rarity descendants. Some descendants require a lower-rarity Mod already installed before they can be fitted.

For a direct upgrade chain:

1. the predecessor must be installed to qualify for the upgrade;
2. completing the upgrade **replaces** the predecessor rather than leaving both installed;
3. the new fitting inherits the predecessor's installation slot instead of consuming an additional slot;
4. the predecessor is consumed into the upgraded fitting rather than returned as a second usable physical component;
5. the upgraded Mod must add meaningful new mechanics as well as any stronger numbers.

Standalone Mods remain independently installable and do not need artificial predecessors.

### Synergy bonuses

Specific installed Mod combinations may unlock additional bonuses at higher levels.

- Most synergies should be **2-Mod combinations**.
- A smaller number of stronger **3-Mod set bonuses** are allowed beginning at **Epic** rarity.
- Synergies do not replace their component Mods; each unrelated synergy component retains its own normal slot.
- Synergy is authored, not inferred from matching tags.

A synergy must name its required Mods and provide a real additional benefit such as an extra derived-stat effect, capability, rule modifier, action/Mastery interaction, or Event/Combat benefit.

This supports deliberate build crafting without turning every Mod into a mandatory hidden tax chain.

### Resistance model

Resistance-granting Mods use explicit PF2e-style resistance values, such as:

- Resistance 5 fire,
- Resistance 10 electricity,
- Resistance 5 physical,
- conditional resistance such as Resistance 5 fire while Lifeveil is online.

Higher-rarity Mods may grant stronger values, multiple resistance types, or conditional/context-sensitive resistance. Resistance values must always be explicit positive numbers and the affected damage type must be authored.

### Mythic rule exceptions

Mythic Mods may alter a core ship rule, including effects such as surviving a Hull-zero result, limited operation while an Area is Disabled, extending Lifeveil to another vessel, or temporarily ignoring a Strain threshold.

Every Mythic core-rule exception must be bounded by an explicit **limit, cost, trigger, or usage restriction**. Unbounded permanent exceptions are invalid Alpha content.

### Acquisition rules

- **Standard:** ordinary shipyard/market acquisition may be available.
- **Rare:** may be purchasable or awarded through more limited sources.
- **Epic:** may be purchasable only through suitably exceptional sources or earned as significant rewards, depending on authored content.
- **Legendary:** not an ordinary catalog purchase; requires exceptional shipyards, major factions, discoveries, unique blueprints, or equivalent GM-authored sources.
- **Mythic:** never an ordinary shop/catalog purchase. Mythic hardware comes from unique blueprints, bosses, Great Houses, ancient wrecks, divine/void artifacts, major campaign rewards, or equivalent campaign-defining sources.

### Every Mod must do something real

A Ship Mod is invalid if it provides none of the following:

- derived-stat effect,
- capability,
- Mastery/action/combat-action/passive unlock,
- explicit rule modifier,
- Event/Combat interaction,
- authored synergy effect,
- explicit resistance.

Description-only Mods are not valid Alpha catalog entries.

### Similar concepts must be mechanically distinct

Multiple fantasy concepts may occupy a broad niche only when their gameplay roles differ.

The current detection family is separated as follows:

- **Lookout Spire:** immediate Battlewatch threat spotting.
- **Detection Spire:** Navigator/anomaly detection.
- **Void Scout Observation Spire:** long-range route scouting.
- **Longwatch Lookout Platform:** sustained watches and ambush prevention.

If future implementation cannot preserve those distinctions in actual play, redundant entries should be consolidated rather than kept as cosmetic duplicates.

### Canonical terminology

New player-facing catalog data uses **Battlewatch**. Legacy `watchmaster` identifiers may remain internally only where compatibility with existing signatures/migrations still requires them; they are not the canonical displayed station name.
