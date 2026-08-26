# Arkflight Fifth Pillar — GM Build & Run

Status: **Future design pillar / not part of current combat alpha**

This document preserves the intended fifth major gameplay/tooling pillar for Arkflight.

## The Five Pillars

Arkflight is intended to support five connected ways to use the same persistent ship and campaign rules:

1. **Voyage / Travel** — narrative ship events, station planning, PF2e skill resolution, Momentum, Risk, hazards, and persistent consequences.
2. **Ship Combat** — tactical hex-based vessel combat using Foundry initiative, Actions, movement, facing, maneuver limits, weapon arcs, range bands, damage, system degradation, and Strain.
3. **Ship Progression / Vessel Management** — ship level, player-directed development choices, discovered upgrades, ship mods, Arkengine mods, rooms, weapons, and refit.
4. **Crew / Faction / Expedition** — officers, specialists, relationships, expedition support, faction consequences, salvage, and campaign-scale crew development.
5. **GM Build & Run** — a GM-facing encounter construction and operation screen that can rapidly create, equip, populate, place, and run enemy Arkflight vessels.

The fifth pillar is not merely an enemy stat generator. Its purpose is to reduce GM preparation time enough that a complete enemy ship encounter can be built and placed into play from one workflow.

---

## GM Build & Run Goal

The future GM screen should allow the GM to request or randomly generate a combat-ready enemy vessel and have Arkflight assemble a legal ship from the same rules used by player ships.

A generated enemy ship should be capable of being added directly to the current Scene and native Foundry Combat Tracker with minimal or no manual cleanup.

The GM should be able to either accept a fully random result or constrain the generator before creation.

Useful constraints may include:

- approximate threat / ship level;
- hull class;
- faction or cultural style;
- combat role;
- desired number of vessels;
- preferred range profile;
- weapon emphasis;
- speed versus durability emphasis;
- boarding-capable or stand-off combat doctrine;
- elite, standard, damaged, improvised, merchant, pirate, military, carrier, fortress, or similar encounter identity.

Exact generation controls are future design work.

---

## Generated Ship Requirements

A generated combat ship should be a complete Arkflight vessel, not a temporary combat-only stat block.

Generation should use the normal ship construction rules and produce valid persistent ship data including, where appropriate:

- Hull / frame;
- Arkengine and Arkengine pattern;
- ship level / development choices once that system is implemented;
- ship mods;
- Arkengine mods;
- rooms or major functional spaces when relevant;
- installed weapons and mounts;
- weapon arcs and range profiles;
- Hull, Lifeveil, Strain, and other persistent resources;
- five-area degradation state;
- combat Action / Reaction profile;
- Speed;
- Maneuver;
- Minimum Maneuver Distance;
- token footprint / ship size;
- faction, identity, traits, and descriptive material;
- cargo, salvage, and rewards when relevant.

Random generation must obey legal capacity, mount, room, mod, and compatibility limits rather than simply assembling arbitrary entries.

---

## Full NPC Crew Generation

The GM Build & Run pillar should also generate the people aboard the vessel.

Enemy officers and important crew should be usable PF2e NPC Actors rather than Arkflight-only placeholders wherever normal PF2e play may need them.

Generated crews may include:

- Captain;
- Engineer;
- Navigator;
- Battlewatch;
- Veilwarden;
- specialists;
- marines / boarding parties;
- notable passengers;
- faction-specific crew;
- creatures or unusual crew types where appropriate.

Important NPCs should be generated with complete usable PF2e statistics appropriate to their role and level, including relevant:

- skills;
- Perception;
- saves;
- attacks;
- defenses;
- abilities;
- equipment;
- weapons;
- armor;
- consumables or important carried items;
- station-relevant competencies;
- names and short identity/personality material where useful.

The generator should prefer existing PF2e-native structures and items rather than inventing parallel Arkflight character rules.

---

## Combat Encounter Construction

The GM screen should eventually be able to perform an end-to-end build workflow such as:

1. GM chooses **Build Enemy Encounter**.
2. GM selects constraints or chooses full random generation.
3. Arkflight creates one or more legal enemy ships.
4. Arkflight generates their officers, specialists, boarding parties, and relevant equipment.
5. The GM previews the generated force and may reroll, edit, lock individual pieces, or accept it.
6. Accepted ships are created as real Foundry Actors / ship Actors.
7. Tokens are created at the correct footprint for the current hex Scene.
8. Ships can be placed on the map ready for battle.
9. Ships are added to Foundry's native Combat Tracker when the GM starts the encounter.
10. The GM runs them through Arkflight Ship Combat using the same tactical rules as player vessels.

The system may later provide tactical recommendations or behavior packages, but the GM remains authoritative and can override generated choices.

---

## Enemy Combat Doctrine

Generated ships should eventually have a simple doctrine or tactical identity so two otherwise similar vessels do not behave identically.

Examples may include:

- **Broadside Brawler** — seeks Wide port/starboard arcs and optimal medium range.
- **Lancer** — maintains distance and aligns Narrow fore weapons.
- **Hunter** — favors speed, positioning, and repeated arc denial.
- **Turret Escort** — uses flexible 360-degree weapons to screen larger vessels.
- **Boarder** — closes aggressively and attempts grappling / boarding.
- **Carrier / Platform** — controls space while supporting smaller craft.
- **Fortress** — accepts poor maneuverability in exchange for durability and distributed weapons.

Doctrine should guide generation and optional GM recommendations. It should not require a complicated autonomous AI before the core system is ready.

---

## Relationship to Boarding

Boarding does **not** create a sixth combat rules engine.

Arkflight Ship Combat handles the ship-scale approach, position, adjacency, grappling/docking, and any ship-level consequences required to establish boarding.

Once characters physically engage aboard a vessel, boarding combat switches to normal PF2e encounter rules and Foundry's normal PF2e combat handling.

Generated enemy crews therefore need real PF2e NPC Actors, skills, attacks, defenses, equipment, and abilities so the same generated enemy vessel can transition naturally from ship combat to a boarding encounter.

This is a major reason the GM Build & Run system must generate the crew as well as the ship.

---

## Massive Vessels

Most Arkflight combat ships should occupy one hex.

Exceptional vessels such as Cathedral Ships, Leviathan Class Platforms, moving cities, carriers, and similar gigantic constructions may occupy multiple hexes.

The GM builder must understand these footprints when generating and placing enemy forces.

Massive vessels may receive a small attacker bonus to represent how difficult they are to miss, while relying on their Hull, armor, Lifeveil, systems, escorts, weapon capacity, and enormous durability for defense.

Multi-hex vessels should eventually support weapon mount origin hexes so attacks from a massive platform originate from the relevant battery or turret rather than an arbitrary token center.

---

## Design Boundaries

The GM Build & Run pillar should follow several strict rules:

- use the same ship construction legality rules as player vessels;
- use PF2e NPCs rather than a duplicate humanoid combat system;
- use native Foundry Actors, Tokens, Scenes, and Combat Tracker wherever practical;
- allow random generation without taking authority away from the GM;
- allow rerolling or locking individual generated components rather than forcing complete regeneration;
- keep generated ships editable after creation;
- do not create a second incompatible enemy-only ship schema;
- do not require autonomous enemy AI for the first usable version;
- generated content should be immediately playable, not merely descriptive text.

---

## Future Milestone

This pillar is intentionally deferred until the ship schema, progression rules, combat chassis, weapon system, system degradation, and PF2e boarding handoff are stable enough to serve as generation targets.

The long-term promise is:

> **A GM should be able to build a complete Arkflight enemy force — ships, loadouts, officers, crew, equipment, tokens, and combat-ready placement — from one screen and then run the encounter immediately.**
