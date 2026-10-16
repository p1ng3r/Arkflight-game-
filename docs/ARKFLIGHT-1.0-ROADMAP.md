# Arkflight 1.0 — Approved Pillar Review and Update Plan

Recorded: 15 October 2026 (America/New_York).

Status: **Voyage / Events, Ship Combat, and Ship Progression / Vessel Management findings approved for the 1.0 update; implementation pending. Six gameplay and interaction pillars are now recognized.**

This is the saved scope of the pillar-by-pillar review. Approval means the work belongs in the 1.0 update; it does not mean these fixes have shipped. This document does not publish a 1.0 release or change the module version.

## Review approach and design direction

- Review one pillar at a time. Complete its discussion before moving to the next.
- Record strengths and flaws against both the design and the running code.
- Preserve the existing foundations where they serve the intended game.
- Make the final cross-pillar keep/remove/redesign plan after all six reviews.
- Keep Events, tactical Combat, and ship leveling distinct, while connecting them through the same persistent vessel, crew, resources, equipment, and consequences.
- Audit talent-system support across every pillar. Record particular talent and progression changes in the relevant reviews before implementing them.
- Make the ship sheet enjoyable and interactive by exposing meaningful choices, equipment contributions, and results. A visual redesign is an option; existing useful presentation should be retained.

## Pillar review status

| Pillar | Review status |
|---|---|
| 1. Voyage / Events | Findings and all six improvement areas approved for 1.0 on 15 October 2026 |
| 2. Ship Combat | All nine improvement areas and station-based AP direction approved for 1.0 on 15 October 2026 |
| 3. Ship Progression / Vessel Management | All seven improvement areas approved for 1.0 on 15 October 2026 |
| 4. Crew / Faction / Expedition | Detailed pillar review pending |
| 5. GM Build & Run | Detailed pillar review pending |
| 6. UI, Interaction & Ship Sheet | Added as a distinct pillar on 15 October 2026; detailed review pending |

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

## Pillar 6 — UI, Interaction & Ship Sheet

Added by the user on 15 October 2026 as a distinct sixth pillar. Detailed review is pending.

Its scope is how the game is understood and operated across all other pillars: the persistent ship sheet, station controls, common navigation, player and GM interaction, meaningful previews, equipment/progression feedback, and visibility of results. Preserve useful existing work while evaluating redesigns against actual player needs.

EVT-06 and COM-08 already record approved interaction needs specific to their pillars. The sixth-pillar review will connect those needs into a coherent experience without treating the review as already complete or authorizing every possible visual change.

The next review is **Crew / Faction / Expedition**. The overall 1.0 implementation and release sequence will be decided after all six pillar reviews are recorded.
