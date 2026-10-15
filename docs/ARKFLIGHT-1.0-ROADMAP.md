# Arkflight 1.0 — Approved Pillar Review and Update Plan

Recorded: 15 October 2026 (America/New_York).

Status: **Voyage / Events findings approved for the 1.0 update; implementation pending.**

This is the saved scope of the pillar-by-pillar review. Approval means the work belongs in the 1.0 update; it does not mean these fixes have shipped. This document does not publish a 1.0 release or change the module version.

## Review approach and design direction

- Review one pillar at a time. Complete its discussion before moving to the next.
- Record strengths and flaws against both the design and the running code.
- Preserve the existing foundations where they serve the intended game.
- Make the final cross-pillar keep/remove/redesign plan after all five reviews.
- Keep Events, tactical Combat, and ship leveling distinct, while connecting them through the same persistent vessel, crew, resources, equipment, and consequences.
- Audit talent-system support across every pillar. Record particular talent and progression changes in the relevant reviews before implementing them.
- Make the ship sheet enjoyable and interactive by exposing meaningful choices, equipment contributions, and results. A visual redesign is an option; existing useful presentation should be retained.

## Pillar review status

| Pillar | Review status |
|---|---|
| 1. Voyage / Events | Findings and all six improvement areas approved for 1.0 on 15 October 2026 |
| 2. Ship Combat | Detailed pillar review pending |
| 3. Ship Progression / Vessel Management | Detailed pillar review pending |
| 4. Crew / Faction / Expedition | Detailed pillar review pending |
| 5. GM Build & Run | Detailed pillar review pending |

The pending rows reserve later reviews; they do not authorize a simultaneous redesign of those pillars. Earlier combat proposals remain subject to their own review and implementation decisions.

## Pillar 1 — Voyage / Events

### Identity and foundations to preserve

Events are cooperative, cinematic ship crises using the officers' PF2e skills. Their core loop is:

**Situation → shared planning → Action / Skill / optional Risk → station order → resolution → Momentum and persistent consequences → escalation and closeout.**

Preserve:

- Shared planning, visible crew choices, and player-controlled station resolution.
- Station order and benefits that make one officer's contribution matter to others.
- PF2e character skills and checks.
- Optional Risk with an explicit increased challenge and payoff.
- The reusable Risk-benefit library, which contained 70 entries at review time.
- Distinct Event Masteries and their encounter-use limits.
- Simple, visible crew Momentum.
- Ship-wide Strain, persistent Ship Conditions, and resource consequences.
- Rewards connected to the persistent ship and campaign: experience, components, salvage, knowledge, and other authored rewards.
- Existing station identities, portraits, action descriptions, Risk explanations, and cinematic reports as a presentation foundation.

### EVT-01 — Make authored action choices mechanically meaningful

**Finding:** Some ordinary actions have different fictional descriptions but identical mechanical results. In Cinderwake Round 1, Engineer's *Bleed the Furnace* and *Reroute the Drive* can both use Arcana at DC 18. Successful checks without Risk produce the same encounter changes and score contribution.

**Approved work:** Review authored actions and give choices understandable purposes beyond contributing the same round score. Preserve the common scoring structure while making action selection matter.

Acceptance criteria:

- [ ] Audit the built-in Events for mechanically equivalent choices and unintended dominant choices.
- [ ] Give each retained authored action a clear mechanical purpose or explicitly distinguish its approach and tradeoff.
- [ ] Define and implement applicable normal-success and critical-success effects; specify failure consequences where needed.
- [ ] Show the practical difference between actions before the player commits.
- [ ] Verify that distinct actions produce their intended different outcomes in resolution.

Exact new action effects remain to be authored. The review's illustrative protection and teamwork examples are not already implemented rules.

### EVT-02 — Balance fallback actions against their Event

**Finding:** Fallback actions currently use DC 18. Gilded Shatter's authored actions use DC 22, while either can contribute the same basic degree-based score. This can reward repeatedly selecting a fallback over the Event's bespoke actions.

**Approved work:** Retain dependable fallback actions. Evaluate their difficulty and contribution in the context of the Event, and make authored choices justify their additional challenge.

Acceptance criteria:

- [ ] Establish an Event-aware fallback difficulty/contribution policy.
- [ ] Keep a viable fallback for officers whose skills or circumstances do not suit the authored choices.
- [ ] Check that fallbacks do not routinely dominate authored actions for score, payoff, and safety together.
- [ ] Display the relevant difficulty and contribution consistently.
- [ ] Validate the policy across the built-in Events and representative officer skill profiles.

No replacement DC formula or fallback score penalty is locked by this approval.

### EVT-03 — Complete the ship-feature and Event-resolution connection

**Finding:** Voyage talent bonuses and ship-derived Mastery availability already reach Events. Component-ability selections are saved in planning, but the review found no corresponding consumption of that selection in the station-resolution engine.

**Approved work:** Complete and audit the component-ability path and make installed feature contributions visible. Preserve the working talent and Mastery connections.

Acceptance criteria:

- [ ] Identify which installed components and features promise Event abilities or modifiers.
- [ ] Derive eligible choices from the selected persistent ship and validate prerequisites.
- [ ] Resolve a selected component ability at its intended timing, including its effects, costs, and use limits.
- [ ] Preserve spent/available state correctly through normal round transitions and reloads of the interface.
- [ ] Avoid offering selectable abilities that have no supported resolution behavior.
- [ ] Show which talent, fitting, room, or other feature contributed to a check or consequence.
- [ ] Verify both the supported contribution and its ineligible/expended cases.

This is the Events integration scope. The full talent catalog and progression economy will be reviewed under their own pillar.

### EVT-04 — Preserve player intent within automatic Risk rewards

**Finding:** Automatic rewards can choose a station or hazard and rearrange unresolved station order. A reward can also resolve without an additional effect when no eligible target remains. This removes administrative pauses but can differ from the crew's intended plan.

**Approved work:** Keep automatic resolution. Capture relevant player preferences during planning and disclose reward eligibility before commitment.

Acceptance criteria:

- [ ] Identify rewards requiring a beneficiary, hazard, order preference, or other meaningful choice.
- [ ] Capture supported preferences during planning and show them to the crew.
- [ ] Use those preferences automatically when the reward is earned.
- [ ] Explain when the present order or encounter state leaves a reward with no eligible target.
- [ ] Define and show what happens when a planned target becomes ineligible before resolution.
- [ ] Preserve clear automatic defaults where a preference is optional.
- [ ] Do not reintroduce pending-Risk administrative gates or require the GM to allocate routine earned rewards.

Any substitute payoff or retargeting policy must be explicitly defined; it must not silently invent a different reward.

### EVT-05 — Make decisions influence the unfolding situation

**Finding:** Current Events advance through authored rounds in sequence. Results change Momentum, costs, hazards, and endings, but individual approaches often have limited influence on the following situation.

**Approved work:** Keep short, structured Events. Add a small number of understandable consequences that carry forward and affect later options or outcomes.

Acceptance criteria:

- [ ] Define meaningful carry-forward consequences for the Events being revised.
- [ ] Let relevant earlier decisions alter later opportunities, costs, restrictions, or ending details.
- [ ] Display established advantages and unresolved complications to the crew.
- [ ] Keep setbacks compatible with an Event's authored continuation and fail-forward intent.
- [ ] Verify that the later state actually changes, rather than changing only descriptive text.
- [ ] Keep authoring and play manageable; full branching adventure trees are not required.

Securing a return line, protecting salvage, opening a safer approach, and losing time are possible design examples, not mandatory new subsystems.

### EVT-06 — Explain decisions and contributions in the Event interface

**Finding:** The board already contains useful station presentation and action/Risk information. It needs clearer explanations of why a player would choose one option and how a crew member or ship feature helped. Several modules also rebuild portions of the rendered board, creating maintenance fragility.

**Approved work:** Improve the existing presentation and consolidate overlapping UI behavior where appropriate. Evaluate a larger visual redesign only against the actual play needs.

Acceptance criteria:

- [ ] Before commitment, show the action's fictional purpose, skill/DC, practical payoff, relevant Risk, and ship support.
- [ ] Make planned station-to-station support and order dependencies understandable to the crew.
- [ ] During resolution, identify the active officer, applicable effects, and their sources.
- [ ] Credit meaningful contributions in the results rather than displaying only a total and outcome label.
- [ ] Clearly distinguish Event Masteries from combat abilities and expose their availability/use state.
- [ ] Consolidate conflicting or duplicate board-rebuilding behavior while preserving player ownership and station controls.
- [ ] Verify player and GM views in a live Foundry session, including reopening and normal window interactions.
- [ ] Observe whether players can make and explain choices without repeated rules searches.

### Validation and completion gate

The initial review ran 34 focused Event, Mastery, player-access, and campaign-wiring checks successfully. Those checks describe the pre-fix baseline; they do not establish that the approved improvements are implemented or that play is fun.

Before marking this pillar complete for 1.0:

- [ ] Implement and verify EVT-01 through EVT-06.
- [ ] Update the Event authoring rules and affected content to match the resulting behavior.
- [ ] Run relevant automated checks for changed behavior and existing Event integrations.
- [ ] Run a complete live Foundry Event with player-controlled stations, from planning through persistent ship consequences and reward closeout.
- [ ] Record remaining balance/usability findings before calling the Event pillar ready.

The next review is **Ship Combat**. The overall 1.0 implementation and release sequence will be decided after all pillar reviews are recorded.
