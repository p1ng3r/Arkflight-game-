# Arkflight Event Specification

**Status:** Authoritative interaction and event-design lock for the first playable Arkflight Event system.

This document defines how players and the GM interact with an Arkflight Event. Old Voyage code is only eligible for reuse if it serves this specification cleanly. If old code fights this specification, rewrite or discard it.

---

## 1. Design Goal

An Arkflight Event is a short, cinematic, cooperative ship encounter for five stations:

- Captain
- Engineer
- Navigator
- Watchmaster
- Veilwarden

The crew is solving one shared problem, not making five unrelated checks.

The core feel is:

**Situation → Crew Planning → Choose Action + Skill + Heroic/Risk Bid → Set Order → Lock Plan → Resolve Stations → Score Round → Apply Momentum / Pressure / Hazards → Cinematic Vignette → Next Round**

The UI should feel like a shared tactical board with station panels. The original card-game inspiration is useful as an interaction model, but the final UI does not need to look like literal playing cards.

---

## 2. Event Opening

Every Arkflight Event opens with a cinematic presentation containing:

- event title
- event image
- a 3–6 sentence opening vignette
- a concise statement of the immediate goal
- any starting Pressure, Hazards, or special conditions that matter to planning

The opening vignette is mandatory content. It establishes what is happening, why it matters, and what the crew is trying to accomplish.

It should read like a short scene, not rules text.

---

## 3. Crew Planning Phase

Planning is collaborative and visible to the whole crew.

### Planning Timer

Each round begins with a **3-minute in-game planning timer**.

The timer creates urgency but does not auto-submit the plan when it reaches zero. At zero, the UI should clearly indicate that planning time has expired and the GM may lock the plan.

The GM has the final **Lock Plan** control.

### Shared Visibility

All tentative choices are visible to all players in real time.

Each station panel should show the station's current intended:

- Action
- Skill
- Heroic/Risk Bid tier, if available
- selected Signature Ability for the encounter
- any relevant one-use ship/component ability being committed
- intended resolution order position

Players may change tentative choices freely until the plan is locked.

The purpose is to make table coordination visible in the UI instead of forcing players to repeatedly explain their selections aloud.

---

## 4. Station Action Choices

Each station receives:

- **3 authored actions for the current event round**
- **1 dependable core/fallback station action**

The authored actions create event identity. The fallback action prevents a station from becoming useless because the authored options do not fit the current character, ship, Hazard state, or tactical plan.

Fallback actions are station-level game content and should remain broadly useful without being stronger than bespoke event actions.

Every authored action should clearly state:

- what the station is attempting in the fiction
- available PF2e skill choices
- base DC or DC derivation
- immediate result consequences by PF2e degree of success
- any interaction with order, Pressure, Hazards, Momentum, systems, or event state

---

## 5. Skill Choices

Each authored station action normally offers **2–3 PF2e skill choices**.

Different skills may represent different fictional approaches and may have different:

- DCs
- traits
- immediate consequences
- Heroic/Risk Bid availability
- benefits

Not every offered skill is Heroic-capable.

A Heroic/Risk Bid is attached to an **authored skill choice**, not automatically to every action or every skill.

---

## 6. Heroic Action / Risk Bid

**Heroic Action and Risk Bid are the same mechanic.**

Do not implement them as separate systems.

When a skill choice is specifically authored as Heroic-capable, it may offer one or more of these Risk Bid tiers:

- **+2 DC**
- **+5 DC**
- **+8 DC**

Not every Heroic-capable skill needs all three tiers.

The player voluntarily raises the DC in exchange for the chance to earn an authored Heroic benefit.

### Benefit Gate

The Heroic/Risk Bid benefit is earned only if the skill check succeeds.

- Critical Success: benefit is earned, plus its extraordinary Critical Success payoff
- Success: benefit is earned
- Failure: benefit is not earned
- Critical Failure: benefit is not earned

Failure and Critical Failure still use the authored action's normal degree-of-success consequences unless that specific action explicitly adds something else.

Risk should not automatically double-punish a failed check merely because the player raised the DC.

---

## 7. Risk Bid Benefit Library

Arkflight should maintain a reusable pool of **50+ authored Risk Bid benefits**.

The library exists to support varied event authoring without turning every Heroic option into another version of `+2 to the next roll`.

Benefits should be tagged and reusable, with families such as:

- Momentum
- Pressure
- Hazard control
- station aid
- next-station aid
- previous/next station interaction
- DC reduction
- bonuses from +1 through approximately +5 where appropriate
- Signature Ability refresh or preservation
- one-use ship ability refresh
- Arkengine control
- Lifeveil control
- Hull / Rigging / Helm protection
- order interaction
- progress / round outcome interaction
- recovery
- tactical information
- event-state manipulation
- teamwork chains

A Risk Bid benefit should be authored as a paired outcome:

```text
Risk Benefit
├─ tier
├─ success effect
├─ critical-success effect
├─ target
├─ timing
├─ tags
└─ optional event-specific narrative hooks
```

### Critical Success Requirement

Every Risk Bid must define an **extraordinary Critical Success payoff**.

The Critical Success payoff should not merely repeat the Success payoff unchanged.

It may:

- increase the magnitude of the normal benefit
- add Momentum
- remove or suppress a Hazard
- reduce additional Pressure
- refresh a Signature Ability
- protect a ship system
- create a stronger station link
- improve a later station's odds
- unlock a better event state
- create some other authored exceptional result

Critical Success should feel memorable.

---

## 8. Resolution Order

Crew planning includes setting the order in which the five stations resolve.

Order is a core teamwork mechanic.

The whole crew sees the intended order during planning.

Normally the crew may arrange stations freely. Events, Hazards, actions, abilities, or Risk Bid benefits may impose or change order rules when explicitly authored.

Order matters because earlier stations may create benefits or problems for later stations.

---

## 9. Plan Lock

When planning is complete, the GM presses **Lock Plan**.

Once locked:

- tentative selections become committed
- resolution order becomes committed
- the current round moves into station resolution

Normal play should not require additional administrative confirmation steps.

The GM may still use override controls when necessary.

---

## 10. Station Resolution

Resolve one active station at a time in the locked order.

The active station's resolution UI should clearly display:

- station
- chosen Action
- chosen Skill
- base DC
- Heroic/Risk Bid tier and modified DC, if any
- current Momentum
- relevant bonuses or DC reductions
- active Hazard effects
- applicable station-link benefits
- Signature Ability state
- applicable ship/room/mod/crew abilities
- PF2e check control

Resolution should remain fast. Avoid generic interrupt/reaction windows.

A specifically authored reactive Signature or component ability may interrupt when its own rules require it.

---

## 11. PF2e Degree-of-Success Scoring

Each station result contributes to a universal round score:

- **Critical Success = +2**
- **Success = +1**
- **Failure = 0**
- **Critical Failure = -1**

With five stations, the normal score range is -5 through +10.

Risk Bid benefits do not alter this score unless the authored benefit explicitly says they do.

The PF2e degree of success is the source of the score. Heroic rewards modify tactical state, not the base scoring rule.

---

## 12. Universal Round Outcome Bands

All Arkflight Events use the same round-outcome language:

- **7–10: Extraordinary Round**
- **4–6: Strong Success**
- **2–3: Mixed Success**
- **0–1: Failure**
- **Below 0: Disaster**

The bands are universal so players can learn what crew performance means across every event.

The **consequences are authored per event and per round**.

For example, one Mixed Success may increase Arkengine Pressure, while another may create a Rigging Hazard. The band is stable; the fiction and consequence package are not.

---

## 13. Momentum

Momentum represents how effectively the crew is operating together during the current encounter.

Momentum is clamped to:

- **minimum 0**
- **maximum 3**

The universal round-band adjustment is:

- Extraordinary Round: **+2 Momentum**
- Strong Success: **+1 Momentum**
- Mixed Success: **no change**
- Failure: **-1 Momentum**
- Disaster: **-2 Momentum**

Momentum normally changes after the round, not after every station check.

Authored Risk Bid benefits, Signature Abilities, ship abilities, or event effects may explicitly modify Momentum outside this rule.

Momentum should remain highly visible to the crew.

---

## 14. Pressure

Pressure represents escalating danger and deterioration during an encounter.

Pressure is not persistent ship damage by itself.

The universal round-band expectation is:

- Extraordinary Round: no Pressure increase; authored consequence may reduce Pressure
- Strong Success: no Pressure increase
- Mixed Success: usually +1 Pressure to an authored system
- Failure: usually +1 or +2 Pressure, authored by the round
- Disaster: usually +2 Pressure plus a Hazard, breach, or similarly serious consequence

The exact amount, target system, and consequence are event-authored.

Pressure may target systems such as:

- Arkengine
- Lifeveil
- Hull
- Rigging / propulsion
- Helm / navigation
- another specifically authored system

Pressure may eventually lead to a persistent ship Condition or Damage state when an authored threshold or consequence says so.

---

## 15. Hazards

Hazards are persistent encounter problems that **change gameplay**.

They remain active until removed, suppressed, resolved, or ended by an authored condition.

Hazards should usually do more than apply a flat penalty.

A Hazard may:

- alter available station actions
- add a special emergency action
- remove or replace an action
- raise or lower a specific DC
- force or restrict resolution order
- add Pressure if ignored
- block or enable a Heroic/Risk Bid option
- change how a station contributes
- modify round consequences
- alter ship-system behavior
- interact with Signature Abilities or ship abilities

Hazards may be removed or suppressed by:

- authored actions
- Risk Bid benefits
- Signature Abilities
- ship/room/mod abilities
- round consequences
- other explicit event effects

Hazards are part of the evolving tactical state of the event.

---

## 16. Signature Abilities

Focus does not exist in this rebuild.

Each station has a pool of Signature Abilities.

During Planning / Order, the station selects **one Signature Ability for the encounter**.

That selected ability may normally be used **once during the encounter**, then becomes Expended.

Rooms, Ship Mods, Arkengine Mods, Crew Specialists, relics, and other ship features may expand the station's available Signature Ability pool.

They normally add **new options**, not additional Signature uses.

Risk Bid benefits may explicitly refresh or preserve a Signature Ability when authored to do so.

---

## 17. Ship, Room, Mod, and Crew Contributions

Not every component must affect every Arkflight gameplay pillar.

A component should only affect an Arkflight Event when its fiction and gameplay purpose justify it.

Components may contribute through three broad mechanisms:

### Passive Advantage

A narrow numerical modifier.

Typical examples may range from +1 or +2, with rare, exceptional, and legendary components potentially reaching approximately +3 to +5 when tightly scoped.

Avoid broad permanent bonuses such as `+3 to Navigator`.

Prefer narrow benefits such as `+2 to Navigator checks involving celestial positioning`.

### Unlock

Adds a new decision:

- Signature Ability
- event Action
- Heroic/Risk Bid option
- capability
- special interaction

### One-Use Ability

A room, Ship Mod, Arkengine Mod, relic, or other component may have its own limited-use encounter ability.

These should be relatively rare and meaningful.

Example use cases include:

- prevent Pressure
- suppress a Hazard
- improve a station
- refresh another resource
- create an emergency tactical option

Ship upgrades should generally prefer **new decisions over bigger numbers**.

---

## 18. Round-End Cinematic Vignette

Every round ends with a short cinematic vignette.

This is mandatory.

The vignette must **synthesize the round into a coherent scene**.

It must not read like:

> Captain succeeded. Engineer failed. Navigator critically succeeded.

It should instead describe what those combined actions looked and felt like in the fiction.

The vignette should account for relevant facts such as:

- important station successes and failures
- Critical Successes and Critical Failures
- major Heroic/Risk choices
- Signature or ship abilities used
- changes in Momentum
- Pressure increases or relief
- Hazards created, removed, or suppressed
- important event-state changes
- the resulting position of the ship and crew

Target length is approximately **3–5 sentences** unless an authored event has a reason to differ.

The narrative should be cinematic, concise, and accurate to the mechanical state.

### Narrative Safety Rule

The vignette may synthesize authored narrative ingredients, but it must not invent mechanical consequences that did not occur.

Event authors should be able to provide narrative hooks and phrases tied to actions, results, Hazards, systems, and round-outcome bands so the generated vignette remains flavorful without becoming a cut-and-paste result log.

---

## 19. Event-End Cinematic Vignette

Every event ends with a cinematic conclusion based on the accumulated path of the encounter.

It should reflect:

- final outcome
- major turning points
- remaining Pressure or Damage consequences
- significant Hazards
- important Heroic acts
- crew Momentum / overall performance
- event-specific consequences

It should resolve the encounter as a scene, not simply show a score summary.

---

## 20. GM Experience

Arkflight should automate the normal mechanical workflow.

The expected default flow is:

**players choose → GM locks → stations resolve → Heroic benefits trigger → round score calculates → outcome band resolves → Momentum changes → Pressure/Hazards apply → cinematic vignette presents → next round**

The GM should not normally need to manually calculate:

- round score
- outcome band
- Momentum adjustment
- authored Pressure changes
- authored Hazard triggers
- earned Risk Bid rewards
- normal state progression

### GM Overrides

The GM must retain the ability to alter important state when the table needs it.

Override controls may include:

- change a roll result / degree of success
- change a DC
- add/remove Momentum
- add/remove Pressure
- add/remove/suppress a Hazard
- alter station order
- manually trigger or cancel a Risk Bid benefit
- refresh or expend an ability
- choose a different authored consequence when appropriate
- edit or regenerate a cinematic vignette
- advance or correct encounter state

GM overrides are **escape hatches**, not the normal workflow.

Do not rebuild a complex administrative runtime around them.

---

## 21. Event Content Model

An Arkflight Event should primarily be authored content, not bespoke runtime code.

A reusable event definition should be capable of expressing:

```text
Event
├─ Identity
│  ├─ title
│  ├─ image
│  ├─ opening vignette
│  └─ goal
│
├─ Starting State
│  ├─ Momentum
│  ├─ Pressure
│  ├─ Hazards
│  └─ special conditions
│
├─ Rounds[]
│  ├─ title / situation
│  ├─ optional image / narrative hook
│  ├─ station action sets
│  │  ├─ Captain: 3 authored actions
│  │  ├─ Engineer: 3 authored actions
│  │  ├─ Navigator: 3 authored actions
│  │  ├─ Watchmaster: 3 authored actions
│  │  └─ Veilwarden: 3 authored actions
│  ├─ per-action skill choices
│  ├─ Heroic/Risk Bid definitions
│  ├─ round outcome consequences by universal band
│  ├─ Hazard hooks
│  └─ narrative hooks
│
└─ Endings
   ├─ authored outcome conditions
   ├─ mechanical consequences
   └─ cinematic narrative hooks
```

The same runtime should be able to run a catalog of different events.

Examples might include debris fields, voidstorms, dying-star crossings, pirate pursuits, strange celestial phenomena, salvage crises, or other Arkflight situations.

---

## 22. Player UI Vision

The player-facing UI should feel like a personal station panel connected to a shared crew board.

The station panel should make these things obvious without opening extra windows:

- station identity
- character assigned to station
- three current authored Actions
- fallback Action
- available skill choices per Action
- Heroic/Risk Bid availability only where authored
- selected Signature Ability and whether it is Available / Expended
- relevant ship/component one-use abilities
- temporary bonuses / DC changes affecting this station
- active Hazard effects affecting this station
- tentative selection state
- current order position

During planning, all five station summaries should be visible enough for the crew to coordinate.

The UI should prioritize conversation and quick comprehension over dense rules display.

---

## 23. GM UI Vision

The GM should see the whole event board:

- event title and image
- current round
- opening/current situation text
- goal
- 3-minute planning timer
- current Momentum
- Pressure by relevant system
- active Hazards
- all five station planning summaries
- current resolution order
- ready / unresolved / resolved state
- Lock Plan control
- active station resolution controls
- computed round score and outcome band
- authored consequences before/after application
- cinematic vignette presentation
- compact override controls

The GM should operate the encounter, not administrate its internal machinery.

---

## 24. First Vertical Slice Acceptance

The first playable Arkflight Event is successful when the table can complete this sequence in Foundry:

1. GM launches an authored event.
2. Opening image, vignette, goal, and starting state are presented.
3. Round begins and 3-minute crew planning timer starts.
4. Five players see their authored actions and fallback action.
5. Each player tentatively chooses Action, Skill, and Heroic/Risk Bid if eligible.
6. Everyone sees everyone's current choices.
7. Crew arranges station order.
8. GM locks the plan.
9. Five stations resolve in order through PF2e checks.
10. Earned Heroic benefits apply automatically.
11. Round score is calculated from PF2e degrees of success.
12. Universal outcome band is determined.
13. Authored consequence applies.
14. Momentum changes within 0–3.
15. Pressure and Hazards update.
16. A cinematic round-end vignette is presented.
17. Next round reacts to the changed tactical state.
18. Event completes with an authored/cinematic conclusion.
19. GM can correct important state through simple override controls when needed.

If this loop is not enjoyable and understandable at the table, stop adding architecture and improve the play experience first.

---

## 25. Non-Goals for the Event Runtime

The first Event system does not need:

- old Focus mechanics
- generic Focus reaction windows
- huge lifecycle/session contracts
- forensic state provenance
- exhaustive replay reconstruction
- correction ledgers for every transition
- campaign-wide catastrophic-breakdown machinery
- Void Scar runtime as a prerequisite
- elaborate closeout persistence
- per-transition hostile-state validation
- infrastructure whose primary purpose is proving that infrastructure works

The event loop is the product.

---

## 26. Mechanical Identity Summary

**Actions = what the station attempts.**

**Skills = how the station attempts it.**

**Heroic/Risk Bid = how far the officer is willing to push for a larger authored payoff.**

**Order = teamwork.**

**Signature Abilities = station mastery.**

**Ship abilities = vessel identity made actionable.**

**PF2e degree of success = individual result.**

**Round score = combined crew performance.**

**Momentum = crew mastery across the encounter.**

**Pressure = escalating cost and deterioration.**

**Hazards = the changing battlefield.**

**Vignettes = the narrative meaning of the mechanics.**

---

## 27. Salvage Rule

Before importing additional old Voyage code, compare it to this specification.

Classify donor code as:

- **KEEP** — already small, clean, and directly serves this spec
- **REWRITE** — contains useful gameplay/content concepts but implements the wrong interaction model or too much infrastructure
- **DROP** — exists for mechanics or architecture no longer part of the game

Do not preserve code merely because it is complete or heavily tested.

Preserve the game.