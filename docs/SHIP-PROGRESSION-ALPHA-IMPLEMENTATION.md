# Arkflight Ship Progression — Alpha Implementation Contract

This document supersedes the earlier branching-tree progression experiments for current alpha implementation work.

## Core progression

Arkflight vessels have 20 ship levels. Ship level by itself does **not** increase Hull, Lifeveil, Armor Class, Speed, Maneuverability, Strain Limit, Actions, Reactions, Mod capacity, or any other base vessel statistic. Base performance comes from the commissioned hull, Arkengine, installed components, and explicit progression choices.

A ship earns 1 Talent Point per level. Levels 5, 10, 15, and 20 each grant one additional milestone Talent Point.

| Level | Total TP earned |
| ---: | ---: |
| 5 | 6 |
| 10 | 12 |
| 15 | 18 |
| 20 | 24 |

A ship may buy talents from its currently unlocked tier or any lower tier.

## Talent tiers

### Foundation — levels 1–5

Foundation improves what an ordinary ship already does. It is intentionally prevented from changing the operating envelope or action economy.

Current pricing principle:

- 1 TP: +1 to one station's rolls across Voyage and Combat.
- 2 TP: +1 to all station rolls in one major pillar such as Voyage.
- 2–3 TP: broader effects affecting multiple stats or systems.

Capacity-style improvements may scale from the unmodified base value. Example: Toughness grants +10% of base Hull. Mechanical values such as roll bonuses remain flat numerical bonuses.

Foundation does not grant Speed, Maneuverability, Strain Limit, extra Mod slots, Actions, or Reactions.

### Specialist — levels 6–10

Specialist begins changing the vessel's operating envelope and purpose-built configuration.

This tier may include:

- Speed
- Maneuverability
- Strain Limit
- additional typed Ship Mod slots
- additional Arkengine Mod capacity
- additional Crew Tactic capacity
- new Specialist Arkcraft Skills
- upgrades to existing Arkcraft Skills

Speed, Maneuverability, and Strain are deliberately expensive Specialist effects, normally 2–3 TP.

**Maneuverability is the single handling stat. There is no separate Facing Allowance progression stat.** Facing behavior is part of Maneuverability.

### Legendary — levels 11–15

Legendary talents may alter action economy and introduce significant rule changes.

Current alpha examples include:

- +1 ship Action Point per combat round — 3 TP
- +1 ship Reaction Point per combat round — 2 TP
- Legendary Arkcraft Skills
- further Speed, Maneuverability, or Strain improvements
- broad crew and vessel bonuses

### Mythic — levels 16–20

Mythic talents are ship-defining rule breakers. They may provide exceptional movement, survival, combat tempo, Arkcraft, or refit capabilities that ordinary vessels cannot reproduce.

## Percentage and flat bonuses

Percentage bonuses are reserved primarily for capacity-style statistics where the chassis should matter, such as Hull and Lifeveil.

Percentage bonuses are calculated from the component's unmodified base value, not from the already-derived total. Multiple percentage talents therefore add their independent base-value bonuses rather than multiplying one another.

Mechanical performance statistics remain flat bonuses. Examples include station rolls, AC, weapon attack bonuses, Speed, Maneuverability, Strain Limit, Actions, and Reactions.

## Station and pillar stacking

Station-specific and pillar-wide bonuses intentionally stack.

Example:

- Engineer's Vessel: +1 Engineer rolls in Voyage and Combat.
- Voyage Trained: +1 all station rolls during Voyage.

An Engineer therefore receives +2 during Voyage and +1 during Combat from those two talents.

## Mod slot identity

Arkengine Mods remain a separate modification family with Arkengine Mod capacity.

Ship Mods already carry authored `modType` identities. Progression now groups those identities into alpha slot classes:

- Weapon
- Structural
- Rigging
- Lifeveil
- Support
- Utility
- Flexible

Base hull Ship Mod capacity remains general-purpose. Extra Specialist slots earned through talents are typed and can only absorb overflow matching their slot class; Flexible slots can absorb any Ship Mod overflow.

The current class mapping is an alpha normalization layer over the existing `modType` catalog and should be tuned as the mod catalog evolves.

## Arkcraft progression

Every station retains its three base Arkcraft choices. Specialist and Legendary ship talents can add stronger ship-derived Arkcraft options to the station's available choice pool.

Current Specialist alpha options:

- Captain — Command the Moment
- Engineer — Run Her Hot
- Navigator — Impossible Vector
- Battlewatch — Perfect Firing Solution
- Veilwarden — Hold the Veil

Current Legendary alpha options:

- Captain — Voice of the Ship
- Engineer — Heart Without Rest
- Navigator — Turn Between Currents
- Battlewatch — Kill Line
- Veilwarden — Sanctuary Unbroken

These advanced values are alpha balance numbers and are expected to change through Foundry playtesting.

## Persistent implementation

Progression persists on the Arkflight ship flag payload:

```js
progression: {
  level: 1,
  talentIds: [],
  arkcraftUpgrades: {}
}
```

Derived stats apply component effects first and then progression talent effects. Persistent resource maxima are synchronized after progression changes.

Voyage station-roll bonuses are applied as visible PF2e modifiers from the currently bound persistent ship. Legendary Action and Reaction bonuses feed into the ship combat profile when combat state is created.

## UI

The Arkflight vessel sheet gains a **SHIP LEVEL UP** launcher. The progression application shows:

- ship level and unlocked tier
- total, spent, and available Talent Points
- Foundation, Specialist, Legendary, and Mythic talent pools
- live derived ship statistics
- station bonuses split into base / Voyage / Combat
- earned typed Ship Mod slots
- current Actions and Reactions per round

The GM controls ship level. Owners and the GM may spend available Talent Points during alpha testing.

## Alpha caution

The progression data contract, tier boundaries, milestone TP economy, Maneuverability consolidation, and pricing principles are the current design direction. Individual talent names, exact numerical values, Arkcraft effects, and mod-type mapping remain alpha balancing content and may be revised after Foundry testing.
