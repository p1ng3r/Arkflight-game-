# Arkflight Ship Strain and Station Systems

Status: Working design direction

This document captures the current agreed gameplay direction for unifying persistent ship state across Voyage/Event gameplay and future Ship Combat without making those modes play the same way.

## Core Design Principle

Arkflight uses one persistent vessel model across all modes.

Voyage/Event gameplay and Ship Combat may have very different moment-to-moment rules, but they interact with the same ship, the same Strain resource, and the same five core ship areas.

The five core areas are:

1. Morale
2. Arkengine
3. Rigging
4. Lifeveil
5. Hull

Each area is associated with one of the five core ship stations.

Strain is not damage. Strain represents how hard the crew is pushing the vessel beyond safe operating limits. Higher Strain makes the five core areas more vulnerable to degradation, failure, or other consequences.

## The Five Stations and Their Ship Areas

### Captain — Morale / Crew

The Captain is responsible for the crew as a functioning whole.

Morale represents:

- crew discipline
- confidence
- fatigue
- cohesion
- willingness to continue operating under pressure
- command effectiveness

Morale degradation should create obvious mechanical consequences for Captain actions and for crew-wide coordination.

### Engineer — Arkengine

The Engineer is responsible for the Arkengine.

The Arkengine represents:

- propulsion
- acceleration
- top speed
- engine power output
- high-output operation
- overcharge capability
- propulsion reliability

Arkengine degradation should directly affect movement potential, speed, high-output actions, overcharge, and other propulsion-dependent capabilities.

### Navigator — Rigging / Helm / Maneuvering

The Navigator is responsible for controlling how the ship moves.

Rigging represents:

- helm response
- steering
- sails and control surfaces
- maneuverability
- turning and facing changes
- evasive handling
- control of movement produced by the Arkengine

The Arkengine provides the power to move. Rigging determines how effectively that movement can be controlled.

Rigging degradation should create obvious penalties to Navigator actions and should affect maneuvering, facing changes, evasive actions, and similar combat or voyage movement effects.

### Veilwarden — Lifeveil

The Veilwarden is responsible for the Lifeveil.

Lifeveil is not merely a combat shield. It represents the magical environmental envelope that makes Arkflight travel survivable.

Lifeveil provides:

- breathable atmosphere
- temperature regulation
- radiation shielding
- protection from hostile energies
- protection from environmental extremes
- magical and occult environmental insulation

Lifeveil degradation should threaten environmental safety and reduce the Veilwarden's ability to protect the vessel and crew.

Core distinction:

- Hull keeps the ship together.
- Lifeveil keeps everyone inside it alive.

### Battlewatch — Hull / Threats / Weapons

Battlewatch replaces the former Watchmaster concept.

Battlewatch is the officer responsible for the vessel's fighting watch. They serve as the ship's eyes during exploration and as the primary threat-and-weapons coordinator during combat.

Battlewatch responsibilities include:

- lookout and threat detection
- scouting and observation
- identifying hostile movement
- target acquisition
- calling targets
- reading enemy vulnerabilities
- directing weapon crews
- coordinating broadsides and other attacks
- recognizing incoming physical threats

Hull represents:

- structural integrity
- armor and physical protection
- exposed fighting decks
- structural battle readiness
- the vessel's ability to survive physical punishment

Hull degradation should produce obvious consequences for Battlewatch and for physical combat capability.

## Strain

### Definition

Strain is a single persistent ship resource.

Strain represents accumulated operational stress caused by demanding more from the vessel than normal safe operation allows.

Strain should persist between Voyage/Event gameplay and Ship Combat until removed through appropriate recovery, maintenance, rest, upgrades, abilities, or other mechanics.

### Strain Is Not Damage

Strain does not automatically reduce Hull, Lifeveil, Morale, Rigging, or Arkengine condition.

Instead:

- Strain increases risk.
- Players may deliberately accept Strain to gain stronger effects.
- High Strain makes failures or system tests more dangerous.
- When a system is pushed or exposed to danger, current Strain helps determine how likely that system is to degrade.

The intended player question is:

> We can push the ship harder, but is the extra performance worth the Strain?

### Push-Your-Luck Role

Possible uses of Strain may include:

- gaining an additional combat Action
- reducing an Action cost
- strengthening a Reaction
- overcharging the Arkengine
- forcing an extreme maneuver
- reinforcing the Lifeveil beyond normal output
- forcing exhausted crew to continue operating
- other authored high-output ship abilities

Exact costs and limits are not yet locked.

## System Degradation

Each of the five core areas should have a clear degradation state.

The exact ladder and numerical penalties are still to be designed, but the intended structure is similar to:

- Stable
- Stressed
- Damaged
- Critical
- Disabled

The important rule is that degradation must have an immediate, visible mechanical effect before a system becomes completely disabled.

Illustrative only:

- Stable: no penalty
- Stressed: small station penalty
- Damaged: larger station penalty and/or reduced system capability
- Critical: severe penalty and restricted actions
- Disabled: normal actions tied to the area may become unavailable until restored

Exact names, values, and thresholds remain open.

## Station Penalties

Each degraded area should mechanically affect its paired station.

- Morale degradation affects Captain gameplay.
- Arkengine degradation affects Engineer gameplay.
- Rigging degradation affects Navigator gameplay.
- Lifeveil degradation affects Veilwarden gameplay.
- Hull degradation affects Battlewatch gameplay.

This relationship should be obvious in the user interface. If a system is degraded, the associated station should visibly show the resulting penalty or restriction.

## Voyage / Event Manager Integration

Voyage/Event gameplay should retain its current identity:

- narrative opening
- station planning
- PF2e skill choices
- Risk Bids
- station resolution
- cinematic round outcomes

The shared Strain and system model should simplify the consequence layer rather than make Voyage play like Combat.

Event outcomes should increasingly speak in persistent ship language such as:

- Gain Strain.
- Lose Hull.
- Lose Lifeveil.
- Reduce Morale.
- Degrade Rigging.
- Degrade Arkengine.
- Gain a persistent Condition.

A degraded system should immediately affect its associated station in future Event rounds.

Example:

> Rigging becomes Damaged.
>
> The Navigator immediately suffers the defined Rigging-Damaged penalty on relevant Event checks.

### Pressure / Exposure Direction

The current Event Manager has system-oriented Pressure mechanics.

The preferred direction is to evaluate whether Pressure can be simplified into a temporary Event concept such as Exposure rather than remain a parallel damage system.

Possible relationship:

- Strain = persistent whole-ship stress.
- Exposure = temporary Event-specific danger aimed at one of the five core areas.
- When Exposure reaches an authored threshold, it may force a Strain/system test or cause a real consequence.

This is a design direction only and is not yet locked.

## Hazards and Void Scars

The current Event consequence model should be reviewed for unnecessary overlapping terminology.

Preferred direction:

### Hazards

Hazards should primarily be temporary encounter problems rather than another persistent damage currency.

Examples:

- burning rigging
- void lightning
- unstable debris
- hostile magical field
- breached deck

A Hazard exists because something dangerous is happening and may cause Strain, resource loss, degradation, or another consequence.

### Void Scars

If Void Scars remain in Arkflight, they should be reconsidered as specific persistent Conditions rather than a generic parallel damage subsystem.

Examples:

- Void-Scarred Hull
- Whispering Arkengine
- Fractured Lifeveil

The condition should be special because of its authored mechanical effect, not because it requires another universal resource track.

## Ship Combat Integration

Ship Combat should feel mechanically different from the Event Manager.

Combat should emphasize:

- Actions
- Reactions
- facing
- range
- weapon arcs
- maneuvering
- firing
- direct ship damage
- tactical system management

Combat should nevertheless use the same persistent Strain and five-area model.

Examples:

- Overcharge Arkengine: gain Strain; Arkengine is the system being pushed.
- Hard Turn: gain Strain; Rigging is the system being pushed.
- Brace for Impact: may trade incoming Hull damage for Strain or otherwise place Hull at risk.
- Extreme Lifeveil defense: gain Strain; Lifeveil is the system being pushed.
- Drive the Crew: gain Strain; Morale is the area being pushed.

The exact Strain-test mechanic is not yet locked.

## Combat Action Economy Direction

The rebuilt combat system is expected to use a PF2e-familiar action economy.

Player-facing terminology should favor:

- Actions
- Reactions

The old AP/RAP architecture is useful design reference, but terminology may be cleaned up during the rebuild.

Current design direction:

- the ship has a shared Action budget
- the ship has reactive capacity
- larger Hulls may provide more baseline Actions
- higher Ship Level and upgrades may improve combat economy by:
  1. reducing the Action cost of specific actions
  2. adding Actions
  3. unlocking new actions

Action-cost reductions should normally have a minimum cost rather than allowing unrestricted free-action chains.

Exact starting Action and Reaction values are not locked.

## Ship Progression Relationship

Strain and the combat action economy should be valid upgrade axes.

Possible advancement effects include:

- increase maximum Strain
- reduce Strain generated by specific actions
- improve a system's resistance to Strain consequences
- recover Strain more effectively
- alter the consequence of a failed Strain/system test
- gain additional Actions
- reduce Action cost for a class of maneuvers or ship actions
- unlock advanced combat actions

This supports the broader progression goal:

- Hull determines baseline vessel capability.
- Ship Level represents vessel development.
- Player choices determine where that development goes.
- Upgrades specialize the ship and unlock new behavior.

## Current Shared Vocabulary

### Persistent Ship State

- Hull
- Lifeveil
- Rigging
- Arkengine
- Morale
- Strain
- Conditions

### Core Stations

- Captain
- Engineer
- Navigator
- Veilwarden
- Battlewatch

### Combat Language

- Actions
- Reactions
- Facing
- Range
- Weapon Arc
- Maneuver
- Attack
- Damage

### Event Language

- Momentum
- Risk Bid
- Hazard
- Pressure / Exposure remains under review

## Design Rules to Preserve

1. Voyage/Event gameplay and Ship Combat must feel mechanically different.
2. Both modes operate on the same persistent vessel.
3. Strain is the common push-your-luck resource connecting the modes.
4. The five ship areas are persistent and each has a clear station relationship.
5. Damage or degradation must create obvious mechanical consequences.
6. Avoid creating multiple overlapping currencies for the same concept.
7. If a consequence persists after an encounter, it should normally be represented on the ship sheet.
8. Temporary encounter concepts should disappear when the encounter ends unless explicitly converted into a persistent consequence.
9. Do not force one-to-one equivalence between every ship System and every action; stations represent crew responsibility, while systems represent vessel state.
10. Prefer understandable, reusable language over mode-specific terminology when the underlying concept is genuinely the same.

## Open Design Questions

The following remain intentionally unresolved:

- exact Strain capacity and scaling
- exact Strain/system test formula
- exact degradation ladder names
- exact penalties at each degradation stage
- how Hull degradation mechanically affects Battlewatch
- whether Pressure is retained, renamed Exposure, or further simplified
- exact role of Momentum outside Events
- exact Action/Reaction baseline by Hull size
- how Ship Level modifies Action economy
- recovery rules for Strain and degraded systems
- how persistent Conditions interact with degradation
- how Supplies influence Morale, repairs, or Strain recovery

These should be resolved through gameplay design and testing rather than assumed from the old implementation.
