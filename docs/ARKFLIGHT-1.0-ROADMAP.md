# Arkflight 1.0 — Approved Pillar Review and Update Plan

Recorded: 15 October 2026 (America/New_York).

Status: **Pillars 1–5 — Voyage / Events, Ship Combat, Ship Progression / Vessel Management, Crew / Faction / Expedition, and GM Build & Run — approved for the 1.0 update; implementation pending. By user direction on 16 October 2026, implement the approved systems first, then reassess UI, Interaction & Ship Sheet and present mockups for selection.**

This is the saved scope of the pillar-by-pillar review. Approval means the work belongs in the 1.0 update; it does not mean these fixes have shipped. This document does not publish a 1.0 release or change the module version.

The [implementation checklist](ARKFLIGHT-1.0-IMPLEMENTATION-PLAN.md) orders the approved work into small steps, records current decisions, and requires exactly five focused programming questions before each step, as requested by the user on 16 October 2026. Its Step 01 questions are pending; creating the plan does not mark gameplay fixes implemented.

## Review approach and design direction

- Review one pillar at a time. Complete its discussion before moving to the next.
- Record strengths and flaws against both the design and the running code.
- Preserve the existing foundations where they serve the intended game.
- Implement the approved work in Pillars 1–5 before the final UI reassessment. This sequencing change was requested on 16 October 2026 and supersedes the earlier requirement to finish all six reviews before implementation planning.
- Keep Events, tactical Combat, and ship leveling distinct, while connecting them through the same persistent vessel, crew, resources, equipment, and consequences.
- Audit talent-system support across every pillar. Record particular talent and progression changes in the relevant reviews before implementing them.
- Make the ship sheet enjoyable and interactive by exposing meaningful choices, equipment contributions, and results. A visual redesign is an option; existing useful presentation should be retained.
- Reassess the working systems after implementation and offer several comparable UI mockups for the user to choose from before committing to the visual redesign.

## Pillar review status

| Pillar | Review status |
|---|---|
| 1. Voyage / Events | Findings and all six improvement areas approved for 1.0 on 15 October 2026 |
| 2. Ship Combat | All nine improvement areas and station-based AP direction approved for 1.0 on 15 October 2026 |
| 3. Ship Progression / Vessel Management | All seven improvement areas approved for 1.0 on 15 October 2026 |
| 4. Crew / Faction / Expedition | All eight improvement areas, Ayerstone integration, starting faction selection, and support for later factions approved on 16 October 2026 |
| 5. GM Build & Run | All eight improvement areas and initial priorities approved for 1.0 on 16 October 2026 |
| 6. UI, Interaction & Ship Sheet | Reassessment and mockups deferred until the approved new systems are implemented, by user direction on 16 October 2026 |

The pending rows reserve later reviews; they do not authorize a simultaneous redesign of those pillars. Approved directions are recorded below, while explicitly open details still require design and balance decisions.

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

## Pillar 2 — Ship Combat

Approved for the 1.0 update on 15 October 2026. All nine findings below are accepted work; they are not claims that the fixes have shipped.

### Identity and foundations to preserve

Combat is tactical vessel maneuvering, weapon positioning, crew coordination, and ship-specific capabilities. It remains distinct from Event skill-and-Risk resolution and from the ship's advancement/refit activity.

Preserve:

- Hex movement, facing, firing arcs, weapon mounts, and useful hull differences.
- Separate Action Points and ship-wide Reaction Points.
- Automatic, AP-free reload timers and different weapon firing rhythms.
- Two Regular abilities, one Surge, and one Signature as the core officer starting loadout.
- Ship-wide Strain and persistent conditions and resource consequences.
- Working weapon Potency and Impact progression.
- Ramming, grappling, boarding, and the character-scale boarding handoff.
- The existing Combat Strip and station controls as a usable presentation foundation.

### COM-01 — Replace hull-based AP with station-based actions

**Finding:** The existing code uses shared hull-based AP. A brigantine starts with four AP, while five officers each activating an ability plus one weapon shot would require six. Participation competes with the ship's necessary actions.

**Approved direction:** Remove the old hull AP allotments. Each station receives **1 station AP / one normal station action per round**. A ship has **1 shared RP per round**, separate from station AP. Larger ships gain operating capacity through **more stations**, rather than retaining their old hull AP pool on top of station actions.

The AP terminology remains: normal station abilities and basic ship actions cost 1 AP. A station can receive additional AP from an expressly permitted effect.

**Captain direction:** Drive the Crew is a shared-tempo Signature: spend 1 Captain AP to generate 3 additional AP for station actions this round. Unspent bonus AP expires at round end. Existing ability-use limits, cooldowns, and reload timers still apply. Previously agreed Morale/Strain costs are retained as the starting design, subject to the overall combat balance review. Free distribution of the three points was recommended earlier; exact allocation limits remain an explicit design detail to settle.

Acceptance criteria:

- [ ] Replace the old hull AP budget throughout resolution, displays, generation, and simulation; do not add it to the new station budget.
- [ ] Track, refresh, spend, and display each station's AP correctly.
- [ ] Define which stations are available, active, and eligible to act, including staffing and ownership rules.
- [ ] Define larger-hull station rosters and limits; additional positions must have a clear purpose.
- [ ] Define whether additional positions share a core officer role or have their own abilities and use limits.
- [ ] Prevent extra positions from unintentionally duplicating ship-wide Signature uses or other restricted effects.
- [ ] Implement Captain AP generation, allocation, expiry, and clear recipient feedback.
- [ ] Preserve one base RP per ship; do not multiply RP by station count or retain larger hulls' former base RP values.
- [ ] Review existing AP/RP talents and upgrades for an explicit migration into the new economy. Any bonus above the new base requires a deliberate rule, not accidental stacking.
- [ ] Compare small and large ships, crew requirements, and encounters with several vessels before locking station counts.

Additional station types, staffing costs, the handling of unused ordinary station AP, and any upper limits on bonus AP/RP are still open. A flat station budget does not by itself establish balanced hull classes.

### COM-02 — Ensure useful starter choices across ordinary combat situations

**Finding:** Some loadouts have limited useful choices in common states. Navigator's Slip the Net requires a grapple, and a healthy ship can leave Veilwarden recovery choices without a useful immediate target. More AP does not guarantee an interesting decision.

**Approved work:** Review core loadouts for proactive and reactive usefulness while retaining station identity and the manageable four-ability starting structure.

Acceptance criteria:

- [ ] Check opening rounds, pursuit, long range, close combat, grappled states, and damaged/healthy ships.
- [ ] Provide useful choices for each core officer without making every role an interchangeable damage dealer.
- [ ] Determine which narrowly specialized abilities belong in starting loadouts versus future learnable alternatives.
- [ ] Review ability-roll frequency, outcome strength, and secondary resource costs for pacing and meaningful decisions.
- [ ] Keep Event Masteries and combat ability behavior distinct.

### COM-03 — Apply the ship's advertised combat upgrades consistently

**Finding:** Some derived stats work in combat, but collected overburn/targeting modifiers do not reach the new ability resolver. Firebreak Plating derives fire resistance 5, while current shot damage paths do not apply that typed resistance. Weapon property selections are stored, while native weapon math implements Potency and Impact.

**Approved work:** Audit every advertised combat benefit and connect supported effects to the actual resolution path.

Acceptance criteria:

- [ ] Map combat-facing talents, fittings, rooms, weapon upgrades, synergies, and conditional benefits to their consumers.
- [ ] Apply supported ability modifiers at the correct timing with explicit stacking rules and limits.
- [ ] Define and implement typed resistance in the damage sequence alongside wards, Hardness, and Brace.
- [ ] Implement supported weapon properties or clearly mark unavailable choices rather than implying an active benefit.
- [ ] Show the source and contribution of installed features.
- [ ] Verify paired cases with and without the relevant fitting or talent, including ineligible conditions.

The full progression economy remains a separate pillar review; this work concerns the combat use of the ship's features.

### COM-04 — Make weapon range and positioning rules match their presentation

**Finding:** Minimum/maximum range and arcs determine legal shots, but displayed Close, Optimal, and Long bands currently do not change attack accuracy or damage.

**Approved work:** Give weapon roles and positioning an intentional, clearly presented rule. Decide whether to give the bands mechanical effects or accurately simplify their presentation.

Acceptance criteria:

- [ ] Define a consistent range-band policy and apply it to all firing paths and previews.
- [ ] Preserve clear minimum/maximum range and firing-arc constraints.
- [ ] Evaluate chase guns, broadsides, fast secondary weapons, and other families for useful tactical roles.
- [ ] Balance damage, reload, accuracy, mounting, and positioning together.
- [ ] Avoid unexplained discrepancies between a legal-shot display and the actual roll.

No new range penalty or bonus formula is locked yet.

### COM-05 — Define salvo balance and unify damage handling

**Finding:** Salvos combine damage before applying Hardness once. Two separate 12-damage hits against Hardness 8 deal 8 total Hull damage, while a combined 24-damage salvo deals 16. Salvo accuracy currently depends on the first participating weapon's upgrades. Single shots wait for chat damage application; salvos apply damage automatically.

**Approved work:** Keep coordinated firing as a potential tactical benefit, define its accuracy and balance rules explicitly, and make damage handling consistent.

Acceptance criteria:

- [ ] Define salvo accuracy without arbitrary dependence on weapon-selection order.
- [ ] Account for combined damage versus Hardness when balancing weapons and abilities.
- [ ] Preserve explicit per-gun AP costs, compatibility rules, reloads, and Signature charges in the station-based economy.
- [ ] Use a consistent attack/damage application and undo workflow for single shots and salvos.
- [ ] Apply the same resistance, ward, Hardness, Brace, critical, and condition rules wherever applicable.
- [ ] Verify mixed upgrade levels, misses, critical results, and partly spent buffs.

Exact salvo accuracy and default automatic/manual damage policies remain to be chosen.

### COM-06 — Put shared reaction decisions with the defending crew

**Finding:** RP is shared and players have reaction controls, but automatic attack and damage reaction prompts currently appear on the GM client. Preparing a reaction separately is not the same as offering the crew a clear decision at the incoming attack.

**Approved work:** Preserve shared RP and automated rules resolution while giving the appropriate crew an understandable opportunity to respond.

Acceptance criteria:

- [ ] Present eligible reaction opportunities to the defending ship's authorized players.
- [ ] Provide a fast Pass option and suitable GM control for NPC ships.
- [ ] Spend the ship's single shared base RP safely when multiple players respond.
- [ ] Explain eligibility, costs, effect timing, and why a reaction is unavailable.
- [ ] Avoid redundant prompts and routine manual effect bookkeeping.

### COM-07 — Support sides and encounter objectives in combat outcomes

**Finding:** The current outcome helper counts surviving individual ships rather than sides. Two surviving allies with their only enemy wrecked do not produce a completed result. Automated terminal handling is primarily Hull-zero wrecking, with boarding operating as a separate handoff.

**Approved work:** Keep Hull-zero wrecking while supporting side-aware outcomes and a small, manageable set of non-destruction objectives.

Acceptance criteria:

- [ ] Resolve victory by participating sides where appropriate, including several surviving allied ships.
- [ ] Define supported capture, escape, protection, or mission-objective outcomes.
- [ ] Connect boarding transitions and other relevant state changes to encounter handling.
- [ ] Allow a valuable enemy vessel to survive a crew victory when the objective permits it.
- [ ] Make completion and its consequences clear without requiring destruction of every opponent.

The precise objective catalog and campaign reward consequences will be coordinated with later pillar reviews.

### COM-08 — Preview combat choices and show contributions clearly

**Finding:** Existing station panels and the Combat Strip are useful foundations, but costs, equipment sources, active charges, legal-shot blockers, and facing commitments need clearer feedback. Facing can create an AP debt reconciled at turn end after a player has spent the remaining points.

**Approved work:** Make combat's actual choices understandable before commitment and credit contributions afterward. The dedicated sixth pillar will address the broader interaction design.

Acceptance criteria:

- [ ] Display station AP separately from ship RP, including recipients and expiry of bonus actions.
- [ ] Preview the equipped ship's final ability effect and contributing upgrades.
- [ ] Show active effects, remaining charges, cooldowns, and Signature use state.
- [ ] Explain target legality, reload state, and inability to fire.
- [ ] Expose movement, facing, and firing costs before an irreversible commitment or remaining-point trap.
- [ ] Credit useful crew actions and equipment in combat feedback.
- [ ] Validate the flow for players and GM in a live Foundry session.

### COM-09 — Bring balance tools onto the actual combat rules

**Finding:** The existing gauntlet still models older behavior, including repeatable Captain AP generation and manual reload work, rather than the current Signature limits, cooldowns, and automatic reload rules.

**Approved work:** Align simulation and validation with the implemented rules before relying on their balance results, then migrate them with the approved station economy.

Acceptance criteria:

- [ ] Reuse actual resolution rules where practical instead of maintaining conflicting manual approximations.
- [ ] Model station AP, shared RP, hull station counts, Captain allocation, cooldowns, Signature limits, and automatic reloads.
- [ ] Model the final weapon, upgrade, salvo, and damage policies.
- [ ] Compare representative hulls, loadouts, tactics, and objectives.
- [ ] Include pacing, meaningful officer participation, and recovery/degradation behavior in live playtests.
- [ ] Distinguish passing rule checks from evidence of balanced and enjoyable encounters.

### Validation and completion gate

The Combat review ran 84 focused checks successfully. Those checks establish a baseline, not completion of these findings or proof of encounter balance.

- [ ] Implement and verify COM-01 through COM-09 after their open rules are settled.
- [ ] Update combat documentation, generators, displays, and migration behavior together.
- [ ] Verify representative upgrade contributions and multi-ship side outcomes.
- [ ] Run complete live Foundry combats with several player-controlled stations and representative enemy ships.
- [ ] Record balance, pacing, and usability findings before marking Combat ready for 1.0.

## Pillar 3 — Ship Progression / Vessel Management

All seven findings and their proposed repair directions were approved for the 1.0 update on 15 October 2026. Approval records the work, not completed implementation. Numerical replacements and other explicitly open choices below remain design and balance work.

### Identity and foundations to preserve

Ship progression is the crew's shared vessel development: adventure rewards, level milestones, talent choices, ship identity, equipment discovery, and deliberate refitting. Preserve its distinct role alongside tactical Combat and cooperative Events.

Preserve:

- Independent ship XP and levels, Talent Points, prerequisites, and upgrade paths.
- Ship specializations that support different vessel identities.
- Blueprint knowledge, physical component ownership, and fitting-slot constraints.
- Refit previews, timed work orders, and meaningful downtime decisions.
- Persistent adventure rewards including XP, blueprints, recovered equipment, and materials.
- The existing talent and refit foundations while repairing the connection between advertised benefits and actual play.

### PRO-01 — Replace ineffective legacy capacity upgrades

**Finding:** Lifeveil and Morale use percentage tracks capped at 100%, while purchasable talents and fittings still modify legacy capacity statistics. Reinforced Lifeveil, Deep Veil Reservoir, Crew Quarters, and other capacity upgrades can change those old statistics without improving the actual resource tracks.

**Approved work:** Preserve the percentage tracks. Redesign affected purchases around supported gameplay benefits and migrate existing purchases fairly.

Acceptance criteria:

- [ ] Audit talents, fittings, engines, patterns, and synergies that modify legacy Lifeveil or Morale capacities.
- [ ] Replace ineffective benefits with intentional effects consumed by the current rules.
- [ ] Keep actual percentage resource maxima and all displays consistent.
- [ ] Update descriptions, costs, previews, and existing-ship migration together.
- [ ] Verify paired outcomes with and without each replacement, beyond its derived statistic.

Reduced losses, better recovery, consequence protection, and stronger station effects are candidate replacements; exact effects and values remain open.

### PRO-02 — Preserve talent-line benefits and redesign conflicting capstones

**Finding:** Purchasing Impossible Burn supersedes Legendary Drive but removes its +2 Speed. Purchasing Turn Between Heartbeats supersedes Legendary Rigging but removes its +2 Maneuverability. The latter also advertises an earlier action while a redesigned ability of the same name is already the Navigator's starter Signature.

**Approved work:** Preserve passive improvements earned through a talent line and give capstones distinct, usable additional value under the current ability system.

Acceptance criteria:

- [ ] Audit upgrade chains for lost predecessor benefits and unintended downgrades.
- [ ] Preserve the intended cumulative passive benefit without stacking replacement totals twice.
- [ ] Resolve overlaps between talent unlocks, retired actions, and starter abilities.
- [ ] Give retained capstones supported effects with clear timing, costs, and limits.
- [ ] Show the resulting total benefit and verify the before/after ship in play.

Exact capstone effects remain to be designed; approval does not reinstate retired actions or grant duplicate Signature uses.

### PRO-03 — Connect talent promises to actual play across the pillars

**Finding:** Voyage bonuses already reach Event resolution, but the new combat ability rolls do not consume advertised station and Combat talent bonuses such as Master Crew's station-roll benefit. Repair and routine Supply talent modifiers also lack corresponding gameplay consumers in the paths inspected during this review.

**Approved work:** Audit every talent from purchase to its actual gameplay outcome. Ensure the talent system supports all pillars while allowing individual talents to specialize.

Acceptance criteria:

- [ ] Map each talent's advertised benefit to supported decisions, checks, resource changes, unlocks, or consequences.
- [ ] Connect applicable station and pillar bonuses to their intended resolution paths with explicit stacking rules.
- [ ] Implement supported repair and routine consumption benefits, or redesign unsupported promises.
- [ ] Coordinate Event integration with EVT-03 and combat integration with COM-03.
- [ ] Include later Crew, GM, and interaction findings in the final cross-pillar audit.
- [ ] Show contribution sources and verify outcomes both with and without the purchase.

Support across the pillars does not require every individual talent to improve every pillar. Exact modifier policy remains open and must preserve the intended ability-roll balance.

### PRO-04 — Make ability learning rewards usable and progression understandable

**Finding:** Learning credits are awarded at levels 5, 9, 13, and 17, but every currently learnable catalog ability is already learned. There are no new ability choices on which those rewards can be spent.

**Approved work:** Add a focused set of learnable alternatives and present level rewards coherently alongside Talent Points and Event Masteries.

Acceptance criteria:

- [ ] Provide eligible, supported alternatives for the awarded learning rewards.
- [ ] Favor different tactical choices rather than mandatory stronger replacements.
- [ ] Preserve the two Regular, one Surge, one Signature station loadout and the separate shared reaction loadout.
- [ ] Define acquisition requirements, reward cadence, and interactions with existing learning credits and talent purchases.
- [ ] Preserve already earned or banked rewards during migration.
- [ ] Present the level's earned rewards, available choices, and their purposes together without conflating Event Masteries with Combat abilities.
- [ ] Verify learning, equipping, persistence, and combat-use limits for the added alternatives.

The exact ability catalog and whether the current credit structure needs consolidation remain open.

### PRO-05 — Migrate economy talents to the approved station action system

**Finding:** Existing talents grant shared AP or RP under the old hull-based combat economy. Their meaning cannot be carried forward automatically into one normal action per station and one shared base RP per ship.

**Approved work:** Coordinate with COM-01 to give these purchases deliberate replacement effects or refunds.

Acceptance criteria:

- [ ] Audit talents and other progression effects that modify AP, RP, extra actions, or station availability.
- [ ] Define each retained bonus against the new station and shared-RP rules.
- [ ] Avoid implicitly multiplying an old +1 AP bonus across every station.
- [ ] Specify stacking, refresh, recipient selection, expiry, and limits where applicable.
- [ ] Preserve Signature limits, cooldowns, and automatic reload restrictions.
- [ ] Provide equivalent replacements or refunds for existing purchases and explain the migration.
- [ ] Verify the resulting economy with representative small and large ships and the updated combat tools.

An extra action for one selected station or a narrowly defined exception are design candidates, not approved final formulas.

### PRO-06 — Use one authoritative fabrication and installation process

**Finding:** The exposed buildFromBlueprint path immediately spends materials and creates a component, while other fabrication paths queue timed work orders. The inventory blueprint UI calls the immediate path, creating competing behavior for the same activity.

**Approved work:** Use consistent rules for blueprint knowledge, payment, fabrication completion, physical ownership, and installation across interfaces and APIs.

Acceptance criteria:

- [ ] Route normal fabrication through one authoritative process: known blueprint, payment, fabrication, owned component, installation.
- [ ] Remove or migrate normal-play shortcuts that bypass intended time, service, or work-order requirements.
- [ ] Preserve convenient controls and the distinction between learning a blueprint, receiving a component, and fitting it.
- [ ] Show total material, gold, time, service, and fitting requirements before commitment.
- [ ] Keep inventory, costs, job completion, cancellation, and failure behavior consistent across entry points.
- [ ] Verify persistence and prevent duplicate grants or charges when operations are retried.

Convenience should reduce bookkeeping while using the same underlying rules. Exact service policies remain open.

### PRO-07 — Make specializations and hull identity deliver their real benefits

**Finding:** Specialization-derived Supply capacity is ignored when synchronizing the resource maximum. In the reviewed sloop, Voyager changed derived capacity from 160 to 240 while the actual maximum stayed at 160; Expedition Ship similarly calculated 200 but retained 160. The approved larger-hull station direction also needs explicit progression, fitting, and staffing rules.

**Approved work:** Apply specialization benefits to actual play, then coordinate hull and station growth with COM-01 so ship identity remains meaningful.

Acceptance criteria:

- [ ] Correct Supply maximum synchronization to honor the supported final capacity and specialization rules.
- [ ] Audit every specialization's advertised stat, capability, and unlock through its gameplay consumer.
- [ ] Keep resource maxima, previews, and persisted state consistent when specialization or equipment changes.
- [ ] Define requirements and costs for additional stations, including relevant staffing, fitting, and operation rules.
- [ ] Preserve worthwhile small-ship advantages and meaningful specialization choices as larger ships gain stations.
- [ ] Verify representative hulls and specializations in actual use, beyond derived-stat previews.

Exact hull station counts, requirements, and small-ship advantages remain open. This finding does not authorize a new hull economy formula without the combat balance review.

### Validation and completion gate

The progression review ran 71 relevant existing checks successfully. Additional direct comparisons reproduced ineffective percentage-resource upgrades, capstone passive losses, unused learning rewards, and specialization Supply maximum mismatches. Passing baseline checks do not establish that these findings are fixed.

- [ ] Implement and verify PRO-01 through PRO-07 after their open rules are settled.
- [ ] Verify purchase-to-outcome behavior and fair migration of existing ships, talents, equipment, and rewards.
- [ ] Update talent descriptions, progression guidance, refit rules, and affected interfaces together.
- [ ] Run relevant automated checks, including cases covering the reproduced gaps.
- [ ] Play through a live Foundry level-up, reward acquisition, fabrication, installation, and subsequent use in Events and Combat.
- [ ] Complete cross-pillar checks after the remaining reviews before marking progression ready for 1.0.

## Pillar 4 — Crew / Faction / Expedition

All eight review areas, the Ayerstone source integration, the recommended starting faction selection, and support for additional factions were approved for the 1.0 update on 16 October 2026. Implementation is pending. The [Ayerstone faction reference and integration notes](AYERSTONE-FACTION-INTEGRATION.md) record the inspected [setting source](https://github.com/p1ng3r/Ayerstone-Setting-Guide), established public lore, and candidate gameplay connections.

The source already establishes the Open Dock Compact, Freespacers and the Dock 44 Freebooters, major external factions, all ten Great Houses, guilds, civic services, and named contacts. Faction identities do not need to be invented for this update. The remaining task is connecting supported relationships, contracts, access, and rewards to actual play.

### Identity and foundations to preserve

This pillar makes the ship a home, an organization, and a base for adventure. Its intended loop is preparation, mission consequences, return, and development of the crew's opportunities and relationships. It connects the other pillars without replacing their separate Event, Combat, progression, or normal PF2e rules.

Preserve:

- PF2e officers, player station ownership, and persistent assignments.
- Lightweight crew hands and ship-owned specialists rather than a compulsory character sheet for every person aboard.
- Expedition preparation using specialists, equipment, Supplies, and a selected vessel.
- Persistent faction favors, route knowledge, boons, and shared Crew Tactics earned through Events.
- Existing faction identity in generated crews, including the distinction between Great House members and retainers.
- The established Ayerstone organizations, contacts, interests, and harbor law.

### Ayerstone integration and initial content selection

- Preserve harbor law and the distinction between docking, trust, contracts, membership, and lawful conduct.
- Allow distinct relationship types such as Freebooter charter, House employment, route license, service access, and a specific debt or favor.
- Build candidate faction rewards and mission opportunities from the existing organizations and their established interests.
- Connect resulting routes, blueprints, specialist recruitment, and services to their actual gameplay consumers across the first three pillars.
- Distinguish setting facts from Arkflight generator preferences and newly proposed mechanics.

Develop an initial playable selection around:

| Starting group | Initial design emphasis |
|---|---|
| Freespacers / Freebooters | Rescue, exploration, mutual aid, and earned charter status |
| Brotherhood of the Cosmic Flame | Imperial pressure, military opposition, rescue, and political consequences |
| Grelkin Cartel | Raids, salvage, captured ships, clan contacts, and negotiation |
| House Starweaver and its associated organizations | Route knowledge, shipping, exploration, and contracts |
| House Stormglass / Guild of Arkengineers | Ship development, repairs, prototype work, recruitment, and training; preserve their separate identities |
| Underwake Syndicates | Covert jobs, unusual equipment leads, contacts, and obligations |

Keep the remaining recorded Houses, factions, guilds, and contacts available for authored stories and later development. The user confirmed that other factions exist: the imported list is a starting reference, not an exhaustive setting catalog. Do not delete existing organizations or invent missing identities to fill the list. Core faction support must allow additional organizations, relationships, contracts, and reward definitions without rewriting the underlying systems.

No numeric faction perks, discount tables, universal reputation model, or complete launch mission count are locked by this approval. The priority is meaningful decisions and usable rewards from a manageable initial selection.

### CRW-01 — Unify permanent crew assignments

**Finding:** Newer controls use Battlewatch and Actor IDs, while the older Crew tab writes Watchmaster and Actor UUIDs directly. A legacy Watchmaster change can lose to an existing Battlewatch assignment during normalization. The older path also bypasses the newer duplicate-officer checks.

**Approved work:** Route every assignment interface through one consistent authority and migrate legacy references safely.

Acceptance criteria:

- [ ] Use canonical station identities and resolvable Actor references across all crew controls.
- [ ] Apply assignment, duplicate-officer, ownership, and persistence rules consistently at the authoritative service.
- [ ] Migrate legacy Watchmaster assignments and mixed references without silently discarding the intended officer.
- [ ] Show missing or unavailable officers clearly instead of counting an unresolved reference as ready.
- [ ] Reflect changes consistently in the ship sheet, Event setup, Combat controls, and GM operations.
- [ ] Coordinate station rosters and additional positions with COM-01 rather than retaining incompatible fixed-five assumptions.
- [ ] Verify GM and authorized player changes, migrations, and reloads in Foundry.

### CRW-02 — Connect staffing, travel upkeep, and recovery

**Finding:** Staffing, overcrowding, daily Supply consumption, and safe-rest Morale recovery have rule helpers, but the review found no normal runtime consumers for those helpers. Displaying crew requirements does not enforce or apply them.

**Approved work:** Keep ordinary hands abstracted as a crew count and integrate staffing, travel consumption, and safe recovery into a manageable voyage/downtime workflow.

Acceptance criteria:

- [ ] Define and persist operating crew and total persons aboard, distinguishing officers, hands, specialists, passengers, and unavailable personnel as needed.
- [ ] Apply supported staffing and occupancy consequences to their intended gameplay consumers.
- [ ] Review the existing unbounded minus-one-per-missing-person penalty before enabling it, especially on large vessels.
- [ ] Calculate travel upkeep from elapsed time and actual persons aboard, coordinating Supply talents with PRO-03.
- [ ] Apply supported safe-rest recovery and show its requirements, limits, and resulting resource changes.
- [ ] Make time advancement and recovery safe against duplicate application, including route and downtime entry points.
- [ ] Show the expected consequence before advancement and an understandable result afterward.

Simple staffing states are a design candidate; the exact penalties, counting rules, recovery policy, and automation timing remain open.

### CRW-03 — Make recruitment and specialist assignment meaningful

**Finding:** The catalog provides thematic specialists, but the Crew tab currently lets the GM toggle catalog entries aboard without checking recruitment or roster availability. This is a setup tool rather than a complete player recruitment loop.

**Approved work:** Separate recruited specialists from active assignments, provide supported benefits, and make bringing or retaining a specialist a meaningful decision.

Acceptance criteria:

- [ ] Distinguish available/recruited specialists from those assigned to the vessel or expedition.
- [ ] Define supported acquisition through contacts, rewards, recruitment, or other explicit campaign opportunities.
- [ ] Audit each retained specialist's advertised benefit through the rules that consume it.
- [ ] Define availability and whether away assignments affect support remaining aboard.
- [ ] Give the crew useful choices without allowing NPC support to replace player station participation.
- [ ] Preserve lightweight specialist records and a clearly identified GM setup/override path.
- [ ] Connect suitable recruitment and training opportunities to the existing Ayerstone organizations.

Roster limits, hiring costs, and individual benefit formulas remain open. The review's Hull Patcher away-versus-aboard choice is an example, not an already authored rule.

### CRW-04 — Make expedition preparation affect mission resolution

**Finding:** Expedition context and requirement-query helpers exist, but the built-in Event paths inspected do not consume them. Direct comparison also showed that a completed expedition still satisfies specialist and equipment requirements because those queries do not require an active expedition.

**Approved work:** Connect preparation to supported opportunities, costs, protection, and outcomes, with correct activity and vessel checks.

Acceptance criteria:

- [ ] Require an active, relevant expedition for normal expedition-based benefits.
- [ ] Validate the expedition's vessel and eligible specialist, equipment, and capability sources.
- [ ] Define whether each benefit requires an embarked specialist, ship support, or another explicit source rather than applying every recorded capability indiscriminately.
- [ ] Connect authored requirements to actual mission options or resolution effects.
- [ ] Make prepared advantages and missing requirements visible before commitment.
- [ ] Provide alternative approaches or manageable complications where the mission permits, rather than unnecessarily stopping play.
- [ ] Verify behavior after completion, cancellation, ship changes, and relevant source changes.
- [ ] Preserve the existing once-per-expedition flexible-equipment concept with explicit eligibility and use state.

This is preparation and support for authored adventures; it does not establish a separate replacement for normal PF2e exploration or character combat.

### CRW-05 — Define and settle expedition Supply commitments

**Finding:** Starting an expedition checks available Supplies and records the commitment, but does not reserve or spend them. The UI describes the commitment as context. Committing 40 of 50 leaves all 50 available aboard.

**Approved work:** Choose a clear reservation or planning-estimate policy and make interfaces, resource rules, and mission closeout agree.

Acceptance criteria:

- [ ] Define what a commitment means and disclose it before mission start.
- [ ] If reserving stock, exclude it from other spending and prevent overcommitment.
- [ ] Track actual consumption and settle unused stock or reservations at completion/cancellation under explicit rules.
- [ ] Coordinate ordinary travel upkeep and expedition consumption to avoid charging twice for the same use.
- [ ] Preserve the selected ship as the settlement target and handle missing vessels or partial failures clearly.
- [ ] Produce a calculated closeout for review without requiring manual reconciliation of several totals.
- [ ] Verify repeat completion/cancellation requests cannot duplicate spending or returns.

Reservation versus estimate, expenditure rates, and cancellation policy remain open decisions.

### CRW-06 — Turn faction relationships and knowledge into usable opportunities

**Finding:** Campaign faction rewards, boons, and route knowledge persist in a ledger, but the inspected gameplay paths do not turn those records into supported faction access or automatically recognized learned routes. Trader route benefits depend on separately supplied route flags.

**Approved work:** Connect campaign rewards to specific usable opportunities, obligations, contacts, and services using the Ayerstone reference and initial content selection above.

Acceptance criteria:

- [ ] Give organizations stable identities and distinguish relationship types, including charters, contracts, membership, employment, licenses, and particular favors or debts.
- [ ] Support several simultaneous relationships without forcing the crew into one exclusive affiliation.
- [ ] Make relevant faction contacts, entitlements, obligations, and source information accessible to authorized users.
- [ ] Consume supported route knowledge, blueprint grants, specialist introductions, service access, and other defined rewards in their actual gameplay paths.
- [ ] Preserve Open Dock Compact rules; distinguish lawful docking from trust and professional access.
- [ ] Use explicit mission outcomes for political consequences rather than automatically changing every allied or rival faction.
- [ ] Deliver meaningful opportunities for the initial selection while preserving other recorded factions for authored use.
- [ ] Allow additional factions, contracts, relationships, and reward definitions without core-system rewrites; preserve custom and legacy entries.
- [ ] Keep lore facts, rumors, generation preferences, and game mechanics distinct.

Exact relationship states, reward amounts, and services remain open. Optional financing must have visible terms; a large mandatory banking or reputation simulation is not required.

### CRW-07 — Make reward display and delivery reliable

**Finding:** Preparing the reward summary reproduced `ReferenceError: hasShipXp is not defined`. Reward delivery also performs several grants before marking the package granted, allowing an earlier successful grant to repeat on retry if a later step fails.

**Approved work:** Repair summary preparation and make delivery resumable and safe across PF2e, ship, and campaign rewards.

Acceptance criteria:

- [ ] Prepare and render reward summaries with supported rewards, empty state, and missing context handled correctly.
- [ ] Preflight recipients and supported grant APIs before applying rewards where possible.
- [ ] Persist completed grant steps so retries resume rather than repeat XP, items, currency, components, or campaign changes.
- [ ] Prevent concurrent grant requests from delivering the same reward twice.
- [ ] Keep rewards tied to their intended characters, vessel, and campaign context.
- [ ] Show what was delivered, what failed, and what still needs a choice or resolution.
- [ ] Provide a supported path for pending reward choices rather than storing them indefinitely without usable follow-through.
- [ ] Verify partial failure, retry, reload, and multi-user cases with appropriate Foundry validation.

### CRW-08 — Give important crew lightweight personal development

**Finding:** Existing specialist records primarily supply roles and capabilities. The review did not find a developed specialist-growth or relationship loop.

**Approved work:** Give notable crew recognizable identities, goals or relationships, and earned development tied to adventures, while keeping ordinary crew abstract.

Acceptance criteria:

- [ ] Support a name, concise personality, and personal goal or relationship for important crew.
- [ ] Record earned development and its source when an adventure changes a specialist's role or supported benefit.
- [ ] Connect applicable introductions and training to established contacts and organizations.
- [ ] Make progress understandable and persistent without requiring detailed simulation for every person aboard.
- [ ] Preserve player officer agency and normal PF2e character rules.

Exact advancement thresholds and benefits remain open. Loyalty meters, daily relationship rolls, and a full NPC leveling subsystem are not required by this approval.

### Validation and completion gate

The review ran 31 existing focused crew, expedition, travel, economy, Morale, and reward checks successfully. Separate runtime comparisons reproduced stale expedition eligibility, the legacy assignment conflict, and the reward-summary error. These checks are a pre-fix baseline, not proof of completed integration or fun.

- [ ] Implement and verify CRW-01 through CRW-08 after their open rules are settled.
- [ ] Verify fair migration of assignments, recruited specialists, ongoing expeditions, Supplies, and existing rewards.
- [ ] Update crew, travel, recovery, expedition, faction, and reward guidance alongside implementation.
- [ ] Play through recruitment/preparation, a mission using those choices, reward delivery, and return/downtime in Foundry.
- [ ] Verify that faction and crew rewards improve actual opportunities in the other pillars.
- [ ] Check that another faction can be added without rewriting the core systems.
- [ ] Record GM workload, player participation, and meaningful-choice findings before marking the pillar ready for 1.0.

## Pillar 5 — GM Build & Run

All eight review areas and the initial priorities were approved for the 1.0 update on 16 October 2026. Implementation is pending. The [GM Build & Run design document](GM-BUILD-RUN-PILLAR.md) remains the supporting vision; the findings and acceptance criteria below define the approved repair scope.

### Identity and foundations to preserve

The goal is a reliable path from generating a force to running an encounter and recovering its rewards, with minimal GM cleanup.

Preserve:

- Persistent enemy vessels using the normal ship schema and construction rules.
- Ayerstone faction and House influences on names, crews, and equipment, retaining the distinction between lore and generation preferences.
- PF2e officer generation with skills, saves, native NPC strikes, equipment, and spellcasting support.
- Reusable ordinary-crew templates and organized ship-and-crew folders.
- Preview before Actor creation, with explicit legality and resolution checks.
- Separate ship level and party-level treasure budgeting.
- Cleanup of partially created packages when creation fails.
- GM authority over generation, placement, and tactical decisions; autonomous enemy AI is not required for the first usable version.

### GM-01 — Initialize generated vessels correctly and distinguish readiness from legality

**Finding:** All 500 previews in the review sweep started at zero current Hull while passing construction validation. One example was 0/240 Hull. Resource synchronization preserves the empty initial Hull value instead of initializing a fresh ship at full health.

**Approved work:** Initialize ordinary generated ships ready to operate. Make damaged, disabled, and wrecked generation explicit, and show operational readiness separately from construction legality.

Acceptance criteria:

- [ ] Initialize supported resources and condition states correctly for fresh generation.
- [ ] Preserve existing damage during later synchronization; do not fix initialization by healing every synchronized vessel.
- [ ] Define explicit generation options for intentionally damaged, disabled, or wrecked ships and display their consequences.
- [ ] Check construction legality, resource state, required crew, and role readiness independently before normal combat deployment.
- [ ] Avoid describing a legal but inoperable vessel as ready to fight.
- [ ] Verify initial preview, PF2e resolution, persistence, and combat initialization retain the intended resource state.
- [ ] Repeat representative level/archetype checks covering the reproduced zero-Hull gap.

### GM-02 — Generate coherent builds and meaningful threat information

**Finding:** Ship level already affects derived statistics and officer levels, but generated vessels have no purchased ship talents, specialization, Arkengine mods, or explicit weapon upgrades. Random mount filling can produce an unarmed naval vessel. Level and quality labels alone do not establish encounter balance.

**Approved work:** Generate viable role-specific builds using the supported progression and combat rules, with honest information about expected encounter threat.

Acceptance criteria:

- [ ] Apply appropriate talents, specialization, equipment, and upgrades under the same supported rules used by player ships.
- [ ] Validate capacities, prerequisites, mounts, and dependencies after assembling the complete build.
- [ ] Require a viable fighting plan for a combat role, while preserving explicitly selected noncombat or unusual vessels.
- [ ] Coordinate officer/station rosters and action budgets with COM-01 and CRW-01.
- [ ] Distinguish ship level, officer quality, encounter threat, and party-level reward budgeting in configuration and preview.
- [ ] Evaluate combined forces, hull differences, weapon rhythms, and mission objectives using the updated COM-09 tools and live play.
- [ ] Explain meaningful limitations of threat estimates until calibrated; do not imply that a label proves balance.

Exact build budgets, selection weights, and encounter-difficulty formulas remain open.

### GM-03 — Preserve selected results while editing or rerolling a package

**Finding:** The interface primarily offers a whole-ship reroll. It does not provide practical locks or independent rerolls for an otherwise useful hull, captain, crew, or loadout. Asynchronous PF2e resolution can also allow an older request to replace a newer preview.

**Approved work:** Add selective controls and reliable preview ownership so the GM can refine a result without losing the parts they want.

Acceptance criteria:

- [ ] Support choosing or locking an eligible hull and other useful configuration constraints.
- [ ] Preserve selected officers or components while rerolling another supported part.
- [ ] Provide practical editing and crew-template selection with immediate revalidation.
- [ ] Re-resolve dependent equipment, crew, derived facts, and loot when a change invalidates them.
- [ ] Prevent stale asynchronous results from overwriting the current preview.
- [ ] Preserve deterministic seeds or equivalent configuration data for reproducible results.
- [ ] Ensure the package committed is the exact current reviewed result.

The first control set should serve common GM decisions; every possible generator parameter need not be exposed at once.

### GM-04 — Complete the encounter deployment workflow

**Finding:** Commit creates vessel and crew Actors in folders. The Combat API separately requires an already placed ship token before adding it to combat. The inspected generation path does not complete placement, side assignment, or objective setup.

**Approved work:** Connect Build, Review, Create, Place, side/objective setup, and readiness to start, while allowing packages to be saved for later.

Acceptance criteria:

- [ ] Allow reviewed packages to be created without forcing immediate placement or combat start.
- [ ] Place selected vessels with the correct footprint, heading, token data, and intended persistent Actor relationship.
- [ ] Validate the target Scene/grid and placement constraints before committing Scene changes.
- [ ] Support deployment of several ships, including allies and escorts, with explicit sides.
- [ ] Configure supported objectives in coordination with COM-07.
- [ ] Add selected deployed vessels to the intended native Foundry Combat without accidentally starting or modifying another encounter.
- [ ] Handle partial creation, placement, and registration failures with clear results and safe recovery.
- [ ] Keep ship-scale placement separate from later normal PF2e crew/boarding deployment.

Exact placement controls and supported objective presets remain open.

### GM-05 — Use authoritative combat state in the GM dashboard

**Finding:** A runtime probe with started native Foundry combat produced no active combat in the dashboard and opened Command. The dashboard treats combat.state as a state object while the current API exposes it as a function.

**Approved work:** Correct active-encounter detection and present enough authoritative information to run the acting ship efficiently.

Acceptance criteria:

- [ ] Detect the intended active native Combat and relevant Arkflight combatants consistently.
- [ ] Show the correct operation, acting ship, round, and contextual default section.
- [ ] Present station actions/AP, shared RP, cooldowns, reloads, active effects, conditions, and legal targets using the same runtime rules as resolution.
- [ ] Show encounter sides and supported objective state.
- [ ] Make switching between ships clear and prevent commands from affecting a stale or unintended vessel.
- [ ] Coordinate with COM-06 and COM-08 for reaction timing and useful action feedback.
- [ ] Where supported, provide concise optional suggestions based on legal firing, movement, or escape choices without taking tactical authority from the GM.
- [ ] Verify normal combat updates, switching encounters, ending combat, and reopening the window in Foundry.

Suggestions do not require autonomous enemy AI. Broader interaction layout remains part of Pillar 6.

### GM-06 — Make generated crews immediately usable for boarding

**Finding:** Generated officers have useful benchmark statistics, native NPC strikes, and spellcasting support, but several custom abilities are broad descriptions without precise targets, modifiers, durations, or limits.

**Approved work:** Finish retained ability rules and define how generated crew templates become an appropriate normal PF2e boarding encounter.

Acceptance criteria:

- [ ] Give each retained custom ability sufficient action, target, range, effect, duration, limit, and check/DC rules where applicable.
- [ ] Reuse suitable supported PF2e abilities or complete the custom NPC action instead of leaving essential effects to improvisation.
- [ ] Preserve native NPC benchmark math and prevent embedded equipment from accidentally adding bonuses twice.
- [ ] Resolve spellcasting and equipment into usable native PF2e structures, with understandable failure messages.
- [ ] Identify the officers, selected crew templates, and participant counts intended for a boarding encounter.
- [ ] Distinguish total people aboard from the number of deployed combatants and evaluate the encounter for the participating PCs.
- [ ] Preserve the transition from ship approach/grapple/boarding into normal PF2e play.
- [ ] Validate representative generated Actor sheets, strikes, spells, and abilities in live Foundry play.

Complete rules are required even for manually resolved abilities. Full automation of every NPC action is not required.

### GM-07 — Finish recovery and reconcile actual recoverable value

**Finding:** The Salvage section is a placeholder and generated rewards are stored without a complete recovery workflow. A mocked resolver example with a 13 gp ceiling recorded 8.2 gp while embedding 15 gp of officer weapons alone; four weapons were marked recoverable without their value being reserved.

**Approved work:** Reconcile actual recoverable value with displayed accounting and complete recovery into the appropriate character, ship, or campaign destination.

Acceptance criteria:

- [ ] Account for supported recoverable officer gear, cargo, components, and materials consistently with the displayed reward budget.
- [ ] Clearly distinguish actual item value, allocated budget, potential recovery, and any explicitly unavailable reward.
- [ ] Do not mark a package economically resolved merely because unreserved recoverable items are omitted from the total.
- [ ] Define how battle outcomes, equipment survival, salvage condition, and intact capture affect recovery.
- [ ] Preserve the distinction between an intact physical component, a blueprint, materials, and narrative salvage.
- [ ] Resolve pending reward decisions through a usable closeout rather than leaving flags without follow-through.
- [ ] Coordinate resumable, duplicate-safe delivery and recipient binding with CRW-07.
- [ ] Verify that recovered equipment reaches the correct inventory/refit path and reward accounting remains consistent after retry or partial failure.

Exact recovery rates, capture value treatment, and budget policies remain open. Displayed budget shares must not silently substitute for supported component or item valuation.

### GM-08 — Provide reusable presets and safe repeated operations

**Finding:** Library remains a placeholder. Generated packages need a usable save/reuse workflow and clear distinctions between deploying an existing vessel and creating a separate copy.

**Approved work:** Preserve useful generated preparation as editable presets and make creation, reuse, and deployment safe against accidental repetition.

Acceptance criteria:

- [ ] Save and browse usable ship or encounter presets with enough configuration to reproduce or edit them.
- [ ] Preserve useful crew-template reuse and package identity without creating unnecessary duplicate Actors.
- [ ] Distinguish placement of an existing persistent vessel from creation of an independent copy.
- [ ] Give independent copies appropriate identities, assignments, resource state, ability use state, and reward tracking.
- [ ] Prevent accidental repeated requests from creating duplicate packages, tokens, combatants, or rewards.
- [ ] Preserve existing content when reusing folders and provide clear partial-failure cleanup/recovery.
- [ ] Verify edit/save/reopen/deploy and multiple-copy scenarios in Foundry.

The preset format, cloning defaults, and exact library controls remain open.

### Initial priorities and completion gate

First priorities are GM-01 resource initialization/readiness, GM-04 deployment, and the active-combat fault in GM-05. This order establishes a usable generation-to-encounter path; it does not drop the other approved areas. Build/threat calibration depends on the approved Combat and Progression rules, and final interface work must coordinate with Pillar 6.

The review ran 12 existing focused generator, officer, equipment, and spell checks successfully. A 500-preview sweep reproduced zero Hull in every preview; separate probes reproduced unarmed naval generation, dashboard active-combat detection failure, and recoverable-value accounting gaps. These are pre-fix findings. Live Foundry interface and encounter validation were not performed during the review.

- [ ] Implement and verify GM-01 through GM-08 after the relevant open rules are settled.
- [ ] Preserve supported existing packages and custom generation context through migration.
- [ ] Update generator guidance, readiness labels, deployment instructions, and recovery documentation with the implementation.
- [ ] Verify selective rerolls, asynchronous requests, partial failures, repeated commands, and copied packages.
- [ ] Build, review, place, and run a multi-ship encounter from GM Operations in live Foundry.
- [ ] Exercise the boarding handoff and recover supported rewards into usable persistent inventories.
- [ ] Measure GM cleanup and rules lookup, rather than relying on Actor creation or passing unit checks as proof of readiness.

## Pillar 6 — UI, Interaction & Ship Sheet

Added by the user on 15 October 2026 as a distinct sixth pillar. On 16 October the user set the desired experience as fun, easy, cool, and sleek, then directed that the approved new systems be programmed before this pillar is reassessed. Detailed review and visual selection are deferred until that point.

Its scope is how the game is understood and operated across all other pillars: the persistent ship sheet, station controls, common navigation, player and GM interaction, meaningful previews, equipment/progression feedback, and visibility of results. Preserve useful existing work while evaluating redesigns against actual player needs.

EVT-06, COM-08, and other approved areas already include functional interaction needs. Implement the controls, feedback, reliability fixes, and resource/state displays needed to operate and test those systems. The deferred visual redesign does not block that functional work.

### Agreed implementation and design sequence

1. Implement the approved gameplay, progression, crew/faction/expedition, and GM systems in dependency-aware increments, settling explicitly open rules as needed.
2. Keep the existing interface usable while exposing and testing the new functionality. Preserve working behavior and address functional UI defects as part of the relevant fixes.
3. Reassess the implemented workflows across the pillars using their real actions, choices, feedback, and player/GM needs.
4. Present several distinct, comparable UI mockups so the user can choose a direction. Include the important Bridge and Combat interactions and show how a design extends to the other workflows; use representative implemented state rather than invented mechanics.
5. Refine and implement the chosen design, then validate it in live Foundry play before release.

The earlier suggested five-destination navigation, palette, ability-card treatment, and other presentation ideas are examples for later exploration, not a selected layout or approved final design. No mockups are required now, and no broad visual redesign should be undertaken before the reassessment and user selection.

### Reassessment and completion criteria

- [ ] Reassess the actual implemented systems and remaining interaction problems after the approved new work is programmed.
- [ ] Offer multiple mockups that can be compared using the same representative tasks and ship state.
- [ ] Let the user select and refine the visual direction before implementing it broadly.
- [ ] Verify readable text, clear costs and availability, useful previews, and feedback that makes crew contributions noticeable.
- [ ] Verify player and GM ownership, persistent selections, reliable reopening/window behavior, and laptop-sized layouts in Foundry.
- [ ] Complete the cross-pillar usability review and final keep/remove/redesign decisions before the 1.0 release.

The next work phase is **implementation of the approved Pillars 1–5**. UI reassessment and mockup selection follow implementation; they are not a prerequisite for starting it. Final release still requires the relevant automated checks, live play, and the selected interface validation.
