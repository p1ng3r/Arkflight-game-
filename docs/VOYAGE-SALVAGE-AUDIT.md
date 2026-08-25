# Voyage Salvage Audit

**Status:** Authoritative KEEP / REWRITE / DROP map for salvaging old Travel/Voyage work into the clean Arkflight Event system.

**Authority:** `docs/ARKFLIGHT-EVENT-SPEC.md` wins whenever old code or documents disagree with this audit.

This audit examined the uploaded Arcflight ZIP, its bundled Git history including `origin/rebuild/arcflight-gameplay-v3`, and the older Travel v2 implementation/content. The goal is not to preserve implementation history. The goal is to preserve the parts that directly serve the current Arkflight Event game.

---

## Executive Decision

The old project contains three different kinds of salvage:

1. **High-value authored content** — keep aggressively.
2. **Useful mechanical ideas and small integration helpers** — rewrite into compact modules.
3. **Defensive runtime / persistence / recovery architecture** — drop.

The best donor is not one branch alone:

- **Travel v2** contains strong narrative/event-card concepts, shared planning ideas, Risk Bid reward patterns, and player-facing UI thinking.
- **Gameplay v3** contains the best Glassback Cinderwake authored round/action content, selective Risk Bid-capable actions, PF2e integration boundaries, station-order concepts, and some useful Hazard semantics.
- Neither old runtime should be transplanted wholesale.

---

# KEEP — Content and Concepts

## 1. Glassback Cinderwake authored content — KEEP CONTENT, NOT RUNTIME

Primary donor:

- `scripts/voyage/m12/event-definition.js` on `origin/rebuild/arcflight-gameplay-v3`

This is the strongest first-event donor.

Keep:

- event identity: Glassback Cinderwake
- three-round structure
- round titles:
  - The Wreck's Ember Wake
  - Through the Cinderwake
  - The Glassback's Turn
- round situation/objective/stakes concepts
- five-station coverage
- three authored actions per station per round
- action names and fiction where still strong
- 2–3 PF2e skill/approach ideas per action
- selective Heroic/Risk-capable actions
- authored +2 / +5 / +8 concepts where present
- success/failure/critical narrative ingredients
- station-to-station benefit ideas

Do **not** preserve its current runtime shape as authority. In particular, Risk Bid capability currently sits mainly at the action level and must move to the authored **skill-choice level** required by the new spec.

The old Glassback definition is a content mine, not a schema to copy.

---

## 2. Travel v2 station-card design — KEEP CONCEPT

Primary donor:

- `docs/PHASE_V_TRAVEL_EVENT_CARD_SCHEMA.md`

Keep:

- event-level opening vignette
- round-level opening narrative
- station panel/card concept
- `skillApproaches` / multiple PF2e approaches
- four-degree roll feedback
- hooks connecting rooms, Ship Mods, Arkengine Mods, crew, and factions
- the principle that events remain data-driven rather than bespoke code

Change:

- literal card presentation is optional; the new UI uses shared station panels/boards
- `shipUpgrades` becomes **Ship Mods**
- hooks are no longer metadata-only; the clean system may resolve declared unlocks/passives/one-use abilities
- event image and explicit goal become required opening content

---

## 3. Shared Crew Planning — KEEP CONCEPT STRONGLY

Primary donor:

- `docs/TRAVEL_V2_SHARED_ROUND_PLANNING_AND_RISK_BIDS.md`

This old document was already pointing toward the game we now want.

Keep:

- every round begins in shared Crew Planning
- every player sees every active station
- every player sees current station actions
- all tentative choices are synchronized and public
- station order is a crew decision
- order is chosen again each round
- order-dependent benefits must state their timing clearly
- drag/reorder plus accessible move controls are good UI ideas
- GM can override/unlock, but is not the ordinary owner of crew decisions
- planning should not be hidden in a GM/debug drawer
- reordering should not destroy scroll/focus/window state

Add from the new spec:

- 3-minute planning timer
- GM Lock Plan button at timer expiry or earlier
- visible tentative Action + Skill + Risk tier + Signature + one-use ship ability

---

## 4. Risk Bid reward idea library — KEEP AND EXPAND

The Travel v2 planning document already contains useful reward families worth salvaging into the new 50+ Risk Benefit library.

Keep as design seeds:

- roll bonuses, including +1 through approximately +5 when scoped
- bonuses to acting / next / chosen / named station
- fortune effects
- future DC reductions
- degree-of-success protection/improvement
- consequence protection
- Hazard suppression / weakening / escalation prevention
- protecting a station from a Hazard
- reward/salvage/discovery improvements
- route clues / hidden locations / future advantages
- cross-station timing requirements
- source-before-target benefits

Rewrite these as tagged reusable `RiskBenefit` definitions with explicit:

- tier eligibility
- success effect
- extraordinary Critical Success effect
- target
- timing
- tags
- optional narrative hooks

The old rule that every action exposes all three +2/+5/+8 bids is **rejected**. The new rule is that only specifically authored **skill choices** expose one or more Risk tiers.

---

## 5. PF2e check integration boundary — KEEP / ADAPT

Candidate donors:

- `scripts/voyage/pf2e/resolution-check-adapter.js`
- `scripts/voyage/pf2e/resolution-check-executor.js`
- related PF2e preflight/context helpers only where truly necessary

Keep:

- using real PF2e actor statistics/check APIs
- letting PF2e determine the four degrees of success
- a narrow adapter between Arkflight event data and PF2e rolls
- public/secrecy handling where useful

Rewrite:

- remove old session/runtime coupling
- no result identity/provenance machinery unless Foundry genuinely requires it
- the clean boundary should accept actor/statistic/DC/modifiers and return the PF2e degree/result needed by the event engine

The new repo already has `src/pf2e/check-runner.js`; donor PF2e code should be mined to improve that boundary rather than imported as another stack.

---

## 6. Station-order behavior — KEEP CONCEPT, REWRITE CODE

Candidate donors:

- Travel v2 shared planning document
- `scripts/voyage/domain/station-order.js`
- `scripts/voyage/domain/station-order-proposal.js`
- `scripts/voyage/domain/resolution-order.js`

Keep:

- exactly one committed order per round
- five stations can normally be freely arranged
- order-dependent benefits can require source before target
- events/Hazards/abilities may explicitly restrict order
- GM override is available

Do not import the old validation/transition machinery. The new repo already has a much smaller `src/game/station-order.js`; extend that only when the event spec requires it.

---

## 7. Hazard identity and persistence concepts — KEEP CONCEPT

Candidate donors:

- `scripts/voyage/domain/pressure-breach-hazard-definitions.js`
- selected authored Hazard names/descriptions from old Travel/Voyage work

Useful concepts to preserve:

- Hazards are named persistent encounter states
- Hazards can activate on a later round
- Hazards can have an explicit removal method
- Critical Success while addressing a Hazard can grant an extra benefit
- ignored Hazards can have authored consequences
- repeat collision/escalation can matter when specifically authored
- system-themed Hazards such as Arkengine Instability, Lifeveil Collapse, Solar-Sail Desynchronization, gravity/Levstone problems are useful content seeds

Rewrite to the new model where Hazards primarily **change gameplay**:

- alter/remove/add actions
- alter DCs
- alter order
- enable/block Risk options
- create emergency actions
- add Pressure if ignored
- interact with Signature/component abilities

Do not preserve the old generalized Hazard lifecycle engine merely because it can represent many cases.

---

## 8. Narrative content model — KEEP STRONGLY, REWRITE SYNTHESIS

Primary donors:

- `docs/TRAVEL_EVENT_TEMPLATE.md`
- `data/travel-events/core-travel-events.js`
- Glassback round stories and action/result prose

Keep:

- event opening prose
- round opening prose
- station-specific fictional problems
- four-degree narrative ingredients
- round outcome branch prose
- event-ending prose
- authored hooks for the next round

Travel v2 already understood that travel should be cinematic and table-ready. That content discipline is worth saving.

However, the old round narration helper is **not** acceptable. It effectively assembled station result sentences into a paragraph. The new spec requires cinematic synthesis, not a prose combat log.

Narrative content should therefore be preserved as ingredients and hooks while the synthesis layer is rewritten.

---

## 9. Existing UI art/assets — KEEP

Useful V3 assets include:

- station icons for Captain / Engineer / Navigator / Watchmaster / Veilwarden
- Momentum icon
- Hazard icon
- Risk Bid +2 / +5 / +8 icons
- other approved Arkflight UI assets already created for the project

Do not keep the Focus icon as part of the Event gameplay because Focus is removed.

---

# REWRITE — Good Game Idea, Wrong Implementation

## 10. Round scoring — REWRITE COMPLETELY

Old implementations disagree with the new game.

Examples:

- Travel v2 runner used `criticalSuccess +2`, `success +1`, `failure -1`, `criticalFailure -2`.
- Gameplay v3 used a different round classification model and success/failure-side behavior.

New authoritative scoring is:

- Critical Success = **+2**
- Success = **+1**
- Failure = **0**
- Critical Failure = **-1**

Universal bands:

- 7–10 = Extraordinary Round
- 4–6 = Strong Success
- 2–3 = Mixed Success
- 0–1 = Failure
- below 0 = Disaster

Write this fresh. Do not adapt the old round classification/aggregation engines.

Old donors to mine only for tests/edge ideas:

- `scripts/voyage/domain/round-result-classification.js`
- `scripts/voyage/domain/round-unit-aggregation.js`
- old Travel runner score helpers

---

## 11. Momentum — REWRITE

Old V3 Momentum is 351 lines and applies a simple success-side/failure-side delta through heavy diagnostics and state validation.

The new rule is dramatically simpler:

- 0–3 only
- Extraordinary +2
- Strong Success +1
- Mixed 0
- Failure -1
- Disaster -2
- applies after the round
- authored abilities/Risk benefits may explicitly modify it

The clean repo's small Momentum module should remain the basis. Do not import V3 Momentum runtime.

---

## 12. Heroic / Risk Bid engine — REWRITE

The V3 `risk-bids.js` is approximately 817 lines and validates a complex exact object contract.

Useful ideas:

- canonical +2/+5/+8 adjustments
- success/critical-success branches earn benefits
- failure/critical-failure can earn no Heroic payoff without automatic extra punishment
- order-aware targets
- effect kinds such as roll bonus / DC reduction / degree improvement

But rewrite because the new design requires:

- Heroic Action and Risk Bid are one mechanic
- Risk availability belongs to an authored **skill choice**
- not every skill is Heroic-capable
- not every Heroic skill needs all tiers
- every tier has Success and extraordinary Critical Success payoffs
- 50+ reusable benefit definitions
- straightforward application of earned effects

Do not import old exact-schema defensive validation, controlled-intent pipelines, risk review queues, or provenance.

---

## 13. Pressure — REWRITE FROM ZERO AROUND THE NEW SHIP Systems

The V3 Pressure implementation is roughly 1,900+ lines and is tightly coupled to breach, lifecycle, persistence, and later campaign systems.

Keep only the concept:

- Pressure is encounter danger attached to a ship system
- Pressure thresholds may create a Hazard or persistent damage consequence when authored
- system identity matters

Rewrite as a small event-state model aligned with the clean ship schema:

- Arkengine
- Lifeveil
- Hull
- Rigging / propulsion
- Helm / navigation
- event-specific systems

Round bands provide the normal Pressure expectation; exact changes are authored by the round.

Do not carry forward pressure provenance, preparation records, checkpoint machinery, exact-once application architecture, or breach-save bureaucracy.

---

## 14. Hazards — REWRITE SMALL

The old V3 Hazard stack includes hundreds of lines across schema, timing, application, escalation, collision, breach creation, and consequences.

We need a much smaller model:

```text
Hazard
├─ id / name / description
├─ tags / affected systems or stations
├─ active effect rules[]
├─ removal options[]
├─ ignored consequence (optional)
├─ escalation rule (optional)
└─ narrative hooks
```

Only build lifecycle features when an authored Hazard needs them.

---

## 15. Player Event UI — REWRITE USING OLD UX LESSONS

Candidate donors:

- Travel v2 `travel-player-station-card.js`
- Travel v2 mission board / scene overlay templates
- V3 `scripts/voyage/apps/player-event.js`
- V3 `templates/voyage/player-event.hbs`

Keep UX ideas:

- station-focused presentation
- shared crew view
- visible active station
- compact player-safe information
- stable rendering while people discuss/reorder

Rewrite for the new interaction model:

- opening image + vignette + goal
- five visible station panels
- 3-minute planning timer
- live public tentative choices
- 3 authored actions + 1 fallback per station
- per-action 2–3 skill choices
- Risk tiers only on eligible skills
- Signature and ship one-use ability visibility
- shared order lane
- one-station-at-a-time resolution view

Literal old templates should not dictate the new UI.

---

## 16. GM Event Manager — REWRITE SMALL

Old donor:

- `scripts/voyage/apps/event-manager.js`
- older Travel Event Runner

Keep the useful GM concepts:

- launch event
- see the whole crew plan
- lock plan
- advance resolution
- review current Pressure/Hazards/Momentum
- override important state

Rewrite so automation is the default and overrides are escape hatches.

Do not carry forward large administrative/review queues or every state transition as a separate GM ceremony.

---

## 17. Fallback station actions — REWRITE CONTENT

Donor:

- `data/station-actions/core-station-actions.js`

Useful seeds among the five current stations:

- Captain: Rally Crew / Coordinate Orders
- Engineer: Stabilize Strain / Hard Burn Prep
- Veilwarden: Reinforce Lifeveil / Damp Occult Surge
- Watchmaster: Scan Threats

The old file also includes Pilot, Gunnery, and Quartermaster station actions and AP/RAP fields. Those do not belong in the current five-station Event fallback system.

Create exactly one dependable fallback for each current station, including Navigator, using the new Event rules and no AP/RAP.

---

# DROP — Do Not Salvage Into the New Event Engine

## 18. Focus — DROP COMPLETELY

Drop:

- Focus points
- Focus abilities/checks
- pre-roll generic reaction windows
- success/failure Focus modifier tables
- `M12_FOCUS_ABILITIES`
- Focus runtime/state/UI

A special authored effect may be redesigned as a Signature Ability if it is genuinely fun, but no Focus implementation survives.

---

## 19. Event session mega-runtime — DROP

Do not import:

- `scripts/voyage/foundry/event-session-runtime.js`
- large session coordinator layers
- boundary snapshot machinery
- replay reconstruction
- correction pipelines
- controlled intent contracts
- exact provenance tracking
- hostile-state validation systems

A playable event does not need a 5,000-line session runtime.

Persistence will be added only to the degree that actual Foundry play requires it.

---

## 20. Closeout/replay/campaign consequence machinery — DROP FOR FIRST EVENT

Do not bring into the vertical slice:

- closeout review engine
- closeout persistence engine
- catastrophic breakdown system
- Void Scar lifecycle
- elaborate reward-allocation ledgers
- replay identity/provenance
- boundary snapshots/checkpoints

Persistent ship Conditions can be added later through the clean ship schema when an authored event consequence genuinely needs them.

---

## 21. Old universal AP/RAP action economy — DROP FROM EVENTS

Do not import AP/RAP into Arkflight Events.

If Ship Combat later needs AP/RAP or another action economy, Combat may own it independently.

---

## 22. Generic Risk review/approval queues — DROP

Do not require:

- GM Risk Bid approval queues
- preview/apply pipelines for every bid
- separate controlled intent preparation
- staged consequence review for ordinary play

Players select an authored Heroic option during planning. If the check succeeds, the authored payoff applies automatically. GM override remains available.

---

## 23. Cut-and-paste round narration helper — DROP

Old Travel runner behavior that sorts resolved station rows and joins station-specific narration sentences is explicitly rejected.

Round-end narration must be cinematic synthesis using authored narrative ingredients plus actual state changes.

---

# Important Design Corrections During Migration

## Risk belongs to skill choices

The V3 Glassback content is worth preserving, but its Risk Bid architecture must be corrected:

```text
Old tendency:
Action → Risk options

New authority:
Action
  → Skill Choice A → normal
  → Skill Choice B → Heroic/Risk tiers
  → Skill Choice C → normal or different Heroic tiers
```

This is a core migration rule.

---

## Critical Success Risk rewards must be exceptional

Old Glassback already has separate critical-success prose for Risk bids, but many mechanical definitions reduce to another bonus/degree shift.

Every migrated Risk tier must explicitly provide:

- Success benefit
- stronger, memorable Critical Success benefit

The critical payoff may combine effects or create a qualitative breakthrough.

---

## Failure is not negative round progress

Old scoring penalized ordinary Failure. The new game intentionally makes Failure contribute **0**, reserving negative progress for Critical Failure.

Do not accidentally migrate old score math.

---

## Momentum is crew performance, not a check-by-check ticker

Do not migrate old success-side/failure-side Momentum logic. Momentum normally moves after the universal round band is known.

---

## Hazards change choices

Do not migrate Hazards merely as penalty containers. Every first-slice Hazard should answer:

> What does this Hazard make the crew do differently next round?

If it does not materially change a choice, it probably is not yet a good Hazard.

---

# Salvage Priority Order

The next implementation pass should happen in this order:

1. **Event definition schema** matching `ARKFLIGHT-EVENT-SPEC.md`.
2. **Fallback actions** for the five stations.
3. **Risk Benefit library foundation**, followed by at least 50 authored benefits.
4. **Glassback Cinderwake content migration** into the new event schema.
5. **Round scoring + universal bands**.
6. **Momentum update** from round band.
7. **Small Pressure model** tied to clean ship systems.
8. **Small Hazard model** with gameplay-changing effects.
9. **PF2e check adapter integration**.
10. **Crew Planning UI + 3-minute timer + shared live selections + order lane**.
11. **Resolution UI**.
12. **Cinematic narrative synthesis layer**.
13. **GM overrides**.
14. Only after the complete event is playable: minimal persistence needed for real Foundry use.

---

# First-Slice Acceptance Test

Glassback Cinderwake is ready for Foundry play only when all of these are true:

- event opens with image, 3–6 sentence vignette, and clear goal
- all five stations participate
- each station gets 3 authored actions + 1 fallback
- actions expose 2–3 PF2e skills
- only authored skills expose Heroic/Risk tiers
- successful Heroic checks earn the correct benefit
- Heroic Critical Success produces an extraordinary payoff
- crew sees all tentative choices live
- planning timer runs for 3 minutes without auto-submitting
- GM can Lock Plan
- crew can set order
- PF2e rolls resolve in order
- score uses +2/+1/0/-1
- universal band is calculated automatically
- Momentum updates automatically and remains 0–3
- authored Pressure applies automatically
- Hazards materially alter later gameplay
- end-of-round vignette is cinematic synthesis, not a result log
- event ending reflects accumulated play
- GM can override important state without becoming the normal operator of every mechanic

---

# Bottom Line

There is substantial good work in the old repo, especially **authored content and player-facing design ideas**. We should save it.

The new build should primarily salvage:

- Glassback's authored situations/actions/skills
- Travel v2 narrative discipline
- shared Crew Planning concepts
- station-order interaction
- Risk reward ideas
- PF2e check integration lessons
- Hazard themes/content
- UI assets

We should **not** salvage the architecture that grew around those ideas.

The governing rule remains:

> **Preserve authored gameplay and useful integration boundaries. Rewrite orchestration. Drop infrastructure that the table never experiences.**
