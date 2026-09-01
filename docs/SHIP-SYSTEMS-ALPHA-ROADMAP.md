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
9. Ship Mod Catalog Completion — rarity foundation and Alpha density locked
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

Parts 1–8 are design-locked and implemented on this branch. Their authoritative rules remain represented in the ship-domain modules and regression tests. This document keeps the current high-level contract while implementation tests remain the executable authority.

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

Locked rarity ladder:

| Rarity | Default minimum ship level | Alpha catalog target |
|---|---:|---:|
| Standard | 1 | 22–26 |
| Rare | 3 | 20–22 |
| Epic | 7 | 18–20 |
| Legendary | 12 | 15–16 |
| Mythic | 17 | 8–9 |

These are Alpha catalog density targets, not hard lifetime caps. The purpose is to provide substantial build variety at each progression band without reverting to one giant undifferentiated catalog.

A specifically authored reward may set a higher minimum level. Bypassing the normal rarity floor requires an explicit exceptional reward/rule rather than accidental catalog data.

Existing legacy Refit tier values remain temporarily preserved only as **installation-cost compatibility metadata** while Refit economics are migrated. They are not the new progression identity.

### Higher rarity means power plus uniqueness

Rarity progression combines **larger numerical improvements and stronger rule-changing effects**.

- **Standard:** practical baseline fittings and straightforward stat/capacity improvements.
- **Rare:** stronger numbers and/or a specialized capability.
- **Epic:** substantial numerical effect combined with capabilities, action interactions, or Event/Combat hooks.
- **Legendary:** build-defining hardware with strong numbers and rules that materially alter vessel operation.
- **Mythic:** extraordinary vessel-defining hardware combining major numerical impact with unique actions, capabilities, or rule exceptions.

Higher rarity must not collapse into only larger numeric bonuses. Conversely, unique effects do not prevent a high-rarity Mod from also providing appropriately stronger numerical improvements.

### Upgrade families are allowed

A Mod concept may have higher-rarity descendants, for example a practical structural fitting growing into a more extraordinary frame technology.

Upgrade chains are optional rather than mandatory. A higher-rarity descendant must gain a distinct mechanical identity, such as a new capability, action interaction, rule exception, Event/Combat hook, or tradeoff, in addition to any larger numerical effect. A chain that only changes `+20 Hull` into a larger Hull number is not sufficient.

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
- Event/Combat interaction.

Description-only Mods are not valid Alpha catalog entries.

The catalog validator enforces rarity, minimum ship level, and mechanical-purpose requirements. The rarity authority also exposes the locked Alpha density and acquisition rules for future GM generation/catalog presentation.

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
