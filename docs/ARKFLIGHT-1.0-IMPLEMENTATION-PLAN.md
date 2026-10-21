# Arkflight 1.0 — Implementation checklist and working process

Created: 16 October 2026 (America/New_York).

Scope authority: [approved pillar review](ARKFLIGHT-1.0-ROADMAP.md). This plan orders implementation of its 38 approved improvement areas and the subsequently approved shared Hull/Morale/Lifeveil condition extension; it does not replace their acceptance criteria or settle their open rules. The [Ayerstone reference](AYERSTONE-FACTION-INTEGRATION.md) supplies existing setting context.

**Current work: Step 01 Ready-only generation and Step 06a five-system damage/save/fault implementation are code-complete on `feat/station-ability-loadouts` (17 October 2026). The user authorized programming after the mock and “Patch mounts” choice. Live Foundry acceptance remains pending. See [rules, defaults, update commands and validation](FIVE-SYSTEM-DAMAGE-AND-REPAIR.md). Later roadmap steps remain unimplemented.**

## How we will work

The user requires **exactly five focused programming questions before each implementation step**. Ask only for the current step; do not front-load questions about the entire project.

For every step:

1. Read the relevant code, current rules, and recorded decisions. Ask exactly five numbered questions about consequential choices for that step. Provide recommendations and easy answer options where useful. Do not use questions to reopen settled decisions without a concrete conflict.
2. Record the user's answers in the decision log. An unanswered question is not agreement with its recommendation. Do not begin dependent programming until the required answers are available; independent inspection or verification can continue.
3. State the bounded implementation outcome and the relevant approved review IDs. Keep only one implementation step active at a time.
4. Implement the rule, persistence/migration, necessary controls, and focused regression checks together. If the step grows beyond a manageable, independently verifiable result, split it into named substeps before expanding scope; each new implementation substep gets its own five-question opening.
5. Run checks appropriate to the change. Use the full suite at meaningful integration boundaries or for shared-rule changes. Record exactly what passed, failed, or still needs live Foundry validation.
6. Save a coherent commit and publish it to the agreed development branch/PR. Provide exact laptop/desktop update commands and a short Foundry check when that build is intended for local testing. Do not ship patch files as the normal update method, erase untracked artwork, or deploy an unrelated branch.
7. Report the outcome, tests, remaining limits, commit, and next step. Then open the next step with its five questions. Do not automatically expand into another unreviewed programming step.

Five questions are a design gate for the current step, not five new permission requests for routine edits or tests. Routine authorized implementation decisions can be made within the recorded answers. If a new material rule conflict appears, document it and resolve it before implementing that dependent behavior.

## Keep work small and recoverable

- Use this checklist and a persistent decision log instead of relying on conversation memory.
- Avoid a single rewrite, a giant implementation commit, or several unfinished systems at once.
- Keep each completed step independently reviewable, with the existing interface usable.
- Preserve current ships, assignments, resources, talent purchases, artwork, and campaign records through explicit migrations.
- Reuse the actual runtime rules in generators, previews, and balance tools instead of introducing parallel math.
- Fix a shared contract before rewriting all of its consumers. Do not repeatedly balance systems against rules that are still changing.
- Keep existing behavior where its approved replacement has not been settled and implemented; disclose transitional limitations.
- Record deferred items against the source review ID. Checking one task does not complete that whole review area unless all its acceptance criteria are satisfied.
- Use live Foundry checks to establish interactive behavior. Passing Node tests does not verify rendered layout, PF2e document compatibility, multi-user interaction, or fun.

No detailed timeline is promised before the open decisions and implementation results establish the actual workload. Later steps are planned work packages and may be split into smaller implementation steps when opened.

## Ordered work queue

### Phase A — Reliable foundations

These fixes produce trustworthy starting state and prevent early work from being obscured by unrelated failures.

- [x] **01 — Fresh enemy resources and operational readiness (code and regression coverage complete; live acceptance pending).** Initialize fresh generated ships correctly; define explicit starting-condition behavior; preserve damage when existing ships synchronize. Cover GM-01. **This is the first programming step.**
- [ ] **02 — One crew-assignment authority.** Canonical stations and Actor references, duplicate rules, legacy migration, and consistent controls. Cover CRW-01; prepare for COM-01's roster changes.
- [ ] **03 — Correct GM active-combat detection.** Repair the dashboard's runtime/API mismatch, operation state, and reopen/update behavior. First part of GM-05; the final station display follows the new economy.
- [ ] **04 — Reward summary and recipient context.** Repair summary preparation and make characters, ship, campaign destination, empty states, and pending choices understandable. First part of CRW-07.
- [ ] **05 — Safe reward delivery.** Durable grant progress, safe retries, concurrent-request handling, and partial-failure recovery. Finish the shared grant foundation in CRW-07; GM-07 later reuses it.

**Phase check:** Generate a ship with the intended resources, assign officers consistently, recognize native combat, and safely grant/retry a representative reward. Do not call every related pillar complete yet.

### Phase B — Shared ship rules and the station economy

These contracts must be stable before encounter generation and combat balance are rebuilt around them.

- [ ] **06 — Real resource benefits.** Replace legacy Lifeveil/Morale capacity promises and honor supported specialization Supply capacity. Cover PRO-01 and the resource portion of PRO-07. Settle replacements before purchasing or migrating them.
- [x] **06a — Five-system integrity, saves, faults and repair (code and regression coverage complete; live acceptance pending).** Hull/Battlewatch, Drive/Navigator, Arkengine/Engineer, Lifeveil/Veilwarden and Morale/Captain use six bands. Actual damage at 50% or lower causes at most one ship-owned save per system per round; later-round damage retriggers it. Each has twelve auto-resolved faults. Named Emergency Repair and paid Shipwright fault repairs are implemented. See the linked rules guide for first-pass DC/component/stacking defaults and transitional limits. This does not complete COM-01's station AP migration or the rest of the combat review.
- [ ] **07 — Talent upgrade chains and capstones.** Preserve earned passive benefits, resolve starter/retired-action conflicts, and specify usable capstones. Cover PRO-02.
- [ ] **08 — Station AP and economy talent migration.** Replace hull AP with station budgets, one shared base RP, Captain bonus-AP allocation/expiry, and explicit replacements or refunds for old economy talents. Cover the core of COM-01 and PRO-05.
- [ ] **09 — Hull station rosters and staffing contracts.** Define additional positions, staffing/ownership, basic-action spending, restricted-use sharing, and small-ship tradeoffs. Finish COM-01's hull policy and the hull-identity portion of PRO-07; establish the counts later used by CRW-02.

**Phase check:** A representative small and large ship each take a complete round. Verify AP/RP refresh, Captain allocation, limits, migration, and persistence before adding new balance content.

### Phase C — Complete the combat loop

- [ ] **10 — Bring balance tools onto runtime rules.** Model the implemented station economy, limits, and reload behavior; establish a reproducible baseline. Begin COM-09. Update the same tools as subsequent rules land and finish calibration in Phase G.
- [ ] **11 — Weapon range and tactical roles.** Settle range-band behavior and compare mounting, reload, accuracy, and positioning. Cover COM-04.
- [ ] **12 — Consistent attacks, salvos, and damage.** Settle salvo accuracy, damage application/undo, wards, typed resistance, Hardness, Brace, and charges. Cover COM-05 and the damage portion of COM-03.
- [ ] **13 — Working talent/equipment contributions.** Audit advertised effects, define stacking, and connect supported modifiers and properties to combat and existing cross-pillar consumers. Cover COM-03 and the first integration pass of PRO-03; add the remaining repair, crew, and faction consumers when their systems land.
- [ ] **14 — Useful core station loadouts.** Balance proactive choices, costs, roll outcomes, and narrowly situational abilities against the stable action and weapon rules. Cover COM-02.
- [ ] **15 — Meaningful ability-learning rewards.** Add supported alternatives, preserve earned credits, and make learning/equipping work between combats. Cover PRO-04.
- [ ] **16 — Defending-crew reactions.** Eligible opportunities, fast Pass, player/GM control, safe shared-RP spending, and clear timing. Cover COM-06.
- [ ] **17 — Sides and objectives.** Side-aware victory and supported escape, capture, protection, and boarding transitions. Cover COM-07; establish the contract GM-04 will use.

**Phase check:** Run a complete combat from setup to outcome, including several stations, an enemy reaction, reload, damage/undo, an equipment benefit, and a non-destruction objective where supported. Complete the combat-specific feedback in COM-08 as the controls change.

### Phase D — Complete the Event loop

- [ ] **18 — Distinct authored choices and fair fallbacks.** Settle normal/critical effects and Event-aware fallback policy, then update the built-in Events. Cover EVT-01 and EVT-02.
- [ ] **19 — Installed features in Event resolution.** Component choices, costs/use state, eligibility, source feedback, and persistence. Cover EVT-03 and the Event portion of PRO-03.
- [ ] **20 — Risk preferences and automatic rewards.** Planning preferences, eligibility, invalidated targets, defaults, and no routine GM allocation gates. Cover EVT-04.
- [ ] **21 — Consequences that carry forward.** Manageable state that changes later choices, costs, restrictions, or endings. Cover EVT-05.
- [ ] **22 — Functional Event/combat feedback consistency.** Finish clear previews, contribution reporting, working window controls, and consolidation needed for reliable operation. Cover EVT-06 and COM-08 without undertaking the deferred visual redesign.

**Phase check:** Run an entire revised Event with player-controlled stations, optional Risk, component support, carry-forward consequences, and persistent closeout. Recheck the combat controls changed in this phase.

### Phase E — Refit, crew, expeditions, and faction play

- [ ] **23 — One fabrication/refit path.** Consistent blueprint, payment, job, completion, inventory, and installation rules; connect supported repair talents. Cover PRO-06 and relevant PRO-03 consumers.
- [ ] **24 — Crew counts, upkeep, and recovery.** Apply the staffing contract, safe time advancement, Supply use, overcrowding policy, and Morale recovery. Cover CRW-02 and associated PRO-03 benefits.
- [ ] **25 — Recruitment and specialist availability.** Recruited versus assigned roster, supported benefits, ship/away availability, player participation, and setup overrides. Cover CRW-03.
- [ ] **26 — Expedition preparation and Supply settlement.** Active/relevant mission checks, equipment and capability sources, actual mission effects, reservation/estimate policy, consumption/returns, and retry safety. Cover CRW-04 and CRW-05; split preparation and resource settlement when opening this work if needed.
- [ ] **27 — Factions, contacts, contracts, and usable rewards.** Implement the extensible relationship foundation and a playable slice from the approved Ayerstone starting selection. Preserve other/custom factions; connect routes, services, blueprints, recruitment, obligations, and reliable rewards. Cover CRW-06 and remaining applicable PRO-03 consumers. Build the shared foundation before adding individual faction content in small follow-up substeps.
- [ ] **28 — Personal development for important crew.** Lightweight identities, goals/relationships, earned changes, and training tied to actual adventures. Cover CRW-08.

**Phase check:** Prepare an expedition, use its choices in a mission, settle its resources, deliver usable rewards, and return to refit/recovery. Verify a named contact or contract changes a supported opportunity. Do not require a complete reputation or NPC simulation.

### Phase F — Complete the GM build-to-recovery loop

- [ ] **29 — Coherent generated builds and threat previews.** Apply the finished progression, station, weapon, and crew rules with usable role-specific loadouts and honest difficulty information. Cover GM-02.
- [ ] **30 — Selective generation and preview control.** Choose/lock useful parts, reroll/edit supported sections, revalidate dependencies, and reject stale asynchronous results. Cover GM-03.
- [ ] **31 — Encounter deployment and GM controls.** Create/save/position packages, assign sides/objectives, register the intended Combat, and show the acting ship's current station economy and legal options. Cover GM-04 and the remaining GM-05 controls. Reuse the existing simple placement path for earlier playtests; this phase completes the integrated workflow.
- [ ] **32 — Boarding-ready crews.** Complete custom ability rules, validate native PF2e documents, select participants, and run the character-scale handoff. Cover GM-06.
- [ ] **33 — Loot and salvage recovery.** Reconcile real recoverable value, conditions, capture consequences, decisions, and persistent delivery using the shared grant foundation. Cover GM-07.
- [ ] **34 — Presets and safe reuse.** Library, templates, existing-vessel placement versus independent copies, identity/state separation, and duplicate-safe operations. Cover GM-08.

**Phase check:** Build and refine a force, deploy it, run its ship encounter, exercise boarding, and recover rewards without manual data cleanup. GM-01 and the dashboard fault were fixed early; finishing deployment here avoids building it repeatedly against changing station and objective rules.

### Phase G — Integration, balance, and the implementation audit

- [ ] **35 — Cross-pillar verification and balance.** Finish COM-09 calibration and audit every supported talent, fitting, learned ability, specialist, and faction reward from acquisition to use. Complete PRO-03 and outstanding pillar acceptance checks. Validate migrations, reloads, multi-user control, interrupted operations, and representative small/large/multi-ship cases. Record live play findings separately from automated results.
- [ ] Verify all 38 approved review areas against their original acceptance criteria. An implementation task's completion does not waive an unchecked criterion.
- [ ] Record unresolved balance/content items and fix blockers before the UI reassessment.

### Phase H — Reassess, choose the interface, and release

- [ ] **36 — Reassess and offer mockups.** Inspect actual implemented workflows and offer several comparable design directions with representative Bridge/Combat states and navigation through the other systems. Ask the step's five design/programming questions before building the mockups. Let the user choose and refine a direction.
- [ ] **37 — Implement the chosen interface.** Build in screen-sized substeps with the same five-question opening; preserve runtime rules, ownership, readable feedback, persistence, and laptop/window usability. The goal is fun, easy, cool, and sleek.
- [ ] **38 — Release validation and packaging.** Complete automated and live Foundry checks, migration/recovery guidance, rules documentation, clean-install/update checks, and release packaging. Do not label the module 1.0 or publish a release until its actual completion and release decisions support it.

## Coverage and dependencies

All approved IDs remain governed by the original roadmap. Major dependencies are:

| Shared contract | Downstream work that should use it |
|---|---|
| Canonical assignments and station roster | Station AP, player ownership, staffing, Events, generated crews, GM deployment |
| Actual resources and fair talent migration | Recovery, costs, abilities, upkeep, generated readiness and build math |
| Station AP/RP and hull positions | Weapon/ability balance, reactions, simulations, generated forces, combat displays |
| Supported effect consumers | Talent/fitting value, component abilities, specialist support, faction rewards |
| Safe reward grants | Event closeout, faction rewards, recovered gear, salvage, retry/reload behavior |
| Sides and objectives | Encounter deployment, victory, escape/capture, boarding and recovery consequences |
| Stable implemented workflows | Final UI reassessment and mockup selection |

The order is intended to reduce rework. If inspection establishes a better dependency order, record the reason and update the queue before moving work; preserve the five-question gate and one active step.

## Step 01 — Initial five questions and recorded answers

Scope: fresh generated ship resources and operational readiness (GM-01). Full Hull and a sound default vessel are already approved. The original questions are retained below as history. The user's answers on 16 October 2026 settle Ready-only generation and introduce a wider Hull/Morale condition discussion; do not treat the original recommendations as accepted defaults.

1. **Starting-condition options:** offer Ready, Damaged, and Wrecked now (**recommended**), or ship Ready-only first and add the other options later?
2. **Damaged preset Hull:** start at 50% (**recommended**), 75%, or 25% of maximum?
3. **Damaged preset systems:** reduce Hull only and leave Drive/Weapons sound (**recommended**), or also start with one impaired system? If impaired, specify Drive or Weapons.
4. **Starting Morale:** retain quality-based values — Poor 40%, Standard 60%, Elite 100% (**recommended**) — or use a fixed 60% or 100% for all qualities?
5. **Older generated zero-Hull ships:** fix only future generation and preserve existing ships (**recommended**), or also provide an explicit GM tool to select old generated ships to repair? Never automatically heal existing vessels during routine synchronization.

### Step 01 decision log

| Decision | State |
|---|---|
| Condition options | User chose Ready only for initial generation. No Damaged/Wrecked generation presets in this first pass. |
| Damaged Hull percentage | Fixed generated-damage presets are superseded by shared percentage states. Any Hull below 100% counts as damaged. User endorsed the six-band direction at 100%, 75%, 50%, 25%, and 10%, with Wrecked below 10%. |
| Damaged systems | User endorsed threshold saves on first downward crossings below 50% and 25% per encounter, using d20 + Ship Bonus + applicable talent/mod bonuses. Hull failures cause automatically resolved physical faults; detailed DCs, consequences, critical results, and Strain interaction remain open for Step 06a. |
| Initial Morale policy | Morale follows the shared band/save structure with crew/command consequences. This does not select a new starting value or approve the original quality-based recommendation. Keep existing generation values unchanged in the bounded fresh-Hull fix; settle any starting-value change explicitly in its implementation step. |
| Lifeveil extension | User explicitly added Lifeveil to the same percentage bands and save system. Consequences must concern Lifeveil protection/containment, with Collapsed as the resource-specific bottom state. Intermediate labels and exact failure consequences remain to be defined; do not apply Hull Wrecked effects to Lifeveil automatically. |
| Existing generated ships | User delegated the choice. Adopt the conservative recommendation: fix future generation, preserve existing ships and damage, and do not add an old-ship repair tool in this first pass. Routine synchronization must never heal an existing ship automatically. |

### Scope and dependency note

The Hull/Morale/Lifeveil requests affect shared resource status, damage resolution, operational defeat, recovery, talents/mods, Events, and displays. Record the contract before programming its dependent behavior. They are an extension to the approved review, not evidence those systems already exist.

Keep the fresh-generation fix bounded. Once the relevant answers are settled, implement its independent initial-resource behavior separately from the larger condition/save work. Add the shared-condition implementation as an explicitly bounded substep in Phase B/C when its rules are ready, with the same five-question process. Do not silently expand Step 01 into a complete combat rewrite.

Existing code has separate structural Hull/Drive/Weapons fault tracks that can reduce Hardness, movement, accuracy, or reload, and Strain already causes degradation. Weapon criticals currently add Strain. Any new percentage/save rule must define its interaction with those tracks, avoid accidental duplicate penalties, and specify whether existing consequences are retained, replaced, or limited. Hull remains a point resource; percentage status can be derived from its current/max values without changing it into a fixed-100 pool.

### Five additional questions — endorsed threshold direction

The user responded "I like it" to this proposal and explicitly requested the same bands and save system for Lifeveil on 16 October 2026. Record the recommended direction as endorsed. The five questions below remain as the decision history; the detailed open mechanics explicitly identified in them still need resolution before Step 06a programming. None of these new rules are implemented yet.

| Percentage | Proposed Hull label | Proposed Morale label |
|---|---|---|
| 100% | Sound | Inspired |
| At least 75%, below 100% | Scuffed | Confident |
| At least 50%, below 75% | Battered | Steady |
| At least 25%, below 50% | Damaged | Shaken |
| At least 10%, below 25% | Critical | Faltering |
| Below 10% | Wrecked | Broken |

1. **Bands:** use the table's six thresholds for both Hull and Morale, with distinct labels (**recommended**), or change a boundary/add a band?
2. **Save timing:** save on the first downward crossing of 50% and 25% per encounter (**recommended**), on every damaging hit/loss below 50%, or at each round end below 50%? Healing should not repeatedly retrigger an already resolved threshold under the recommended policy; a hit crossing multiple thresholds needs a defined single-versus-multiple-roll policy before implementation.
3. **Who rolls:** use a ship-owned save of d20 + Ship Bonus + applicable talent/mod bonuses (**recommended**), or use the assigned officer's PF2e statistic? The exact DC/progression remains open until this choice is made.
4. **Failure scope:** apply one automatically resolved, eligible physical system fault for a Hull save and a crew/command-specific consequence for a Morale save (**recommended**), or use a general penalty to ship actions? Exact effects, selection policy, duration, stacking, and critical results still require definition before their programming step.
5. **Bottom-state operation:** should Wrecked stop normal movement/firing while preserving applicable emergency repair, rescue, and abandonment, and Broken Morale impose crew/command limits while preserving recovery actions and player control (**recommended**)? Settle exact blocked/allowed actions and repair/recommission requirements before implementation.

Additional answer recorded: the user likes the proposed direction and adds Lifeveil. Use the same first-crossing save approach and ship-owned modifier structure for all three resources, with resource-appropriate consequences. Preserve the recommended Wrecked/Broken behavior and recovery/player agency. Lifeveil uses Collapsed as its bottom state; its environmental and protective consequences require their own definition. Do not invent automatic Hull loss or ship destruction from a Lifeveil or Morale failure.

The bands themselves must not accidentally double-apply existing system-fault penalties. Applicable talents and mods can modify the relevant saves or supported consequences once their specific effects and stacking rules are authored. Healing alone does not reset a resolved encounter threshold. The user allowed these five follow-up questions; the normal five-question gate still applies when opening the later bounded shared-rule implementation substep.

After answers, record the implementation branch, commit, focused tests, full-suite result if run, local update instructions, Foundry verification, and any remaining limits here. Mark Step 01 complete only when its defined outcome is delivered; retain any outstanding GM-01 acceptance items explicitly.

## Baseline and handoff

- Starting implementation baseline: `9640cee4c42bc115a329eee7abc144ed30f13e74`, branch `feat/station-ability-loadouts`, draft PR #11.
- Full existing suite run during planning on 16 October 2026: **636 tests passed, zero failed**. This does not cover the already reproduced runtime gaps or establish live Foundry readiness.
- Current change is planning/documentation only. No gameplay fix is marked implemented by creating this checklist.
- Inspect the actual local and remote state before each implementation step. Prefer focused code commits/PRs over accumulating the whole release in one unreviewable change. Record the chosen branch/base at that step; do not merge or promote releases implicitly.
- Keep this file's current step, decision log, result evidence, and next step updated so a later session can continue without reconstructing the conversation.


## 16–17 October 2026 — Mock approval and implementation record

The user's later decisions supersede the earlier threshold-crossing proposal above. They approved the six bands, five ship-owned saves influenced by Hull/Arkengine, twelve negative conditions for each system, and a save only when further actual system damage occurs at/below 50%. A system saves at most once per round. No new damage, an additional modifier, or acquisition of a fault causes no extra save. They chose “Patch mounts” in the mock and explicitly said “I like it program it to do this please.” That authorizes this bounded implementation without another question gate.

Implemented Ready-only fresh enemy generation; schema v10 with Drive/Arkengine integrity and persistent faults/save marks; sixty faults with actual stat/check/reload effects; automatic native shot, salvo and Event save integration; named Emergency Repair; Shipwright integrity/fault work orders; below-10% operations; five-system status and explicit GM damage controls. Existing ships retain actual damage, and Strain remains separate. Emergency Repair still uses the existing shared AP runtime; one AP per station remains Step 08.

First-pass defaults: DC 14 + Ship Bonus, Hull/Arkengine component contributions, supported upgrade effects, binary saves with natural 1/20, duplicate d12 rerolls, one selected fault per emergency repair, and bounded fault modifiers. These values are documented as implementation defaults rather than earlier user-selected numbers. See `docs/FIVE-SYSTEM-DAMAGE-AND-REPAIR.md` for the full contract and Foundry acceptance procedure.

Automated validation: all 657 Node tests pass, including 21 new regressions covering five-system rules, all sixty fault effects, damage adapters, repair, fresh generation, and Undo; changed JavaScript passes syntax checks and `git diff --check` passes. Live Foundry rendering, PF2e-world compatibility, multiple-client play and balance remain pending. Do not mark the remaining GM-01/COM/PRO review areas or the 1.0 release complete from this substep.

## 17 October 2026 — Superseding 1.1.0 combat direction

The user has replaced the proposed one-action-per-station combat economy with a shared ship AP pool and Captain-committed orders, following Limithron's planning and round initiative structure. They also replaced fixed station loadouts with a permanent ship-owned card library and a shared random starting hand: 8 General, 3 Flux, 1 Signature AP cards, plus a separate 3/2/1 RP hand. See [the 1.1.0 decision record](ARKFLIGHT-1.1.0-CARD-COMBAT.md) for movement, skill contribution, recovery, progression, collection counts and unresolved details.

The new isolated `src/cards/card-library.js` rules foundation and tests implement dealing, library/hand rules and availability without switching live combat or generation. The existing 1.0 damage implementation remains active. Treat earlier per-station AP/loadout proposals in this checklist as superseded design history, not instructions to implement alongside the shared-pool system. No release has been promoted.

The subsequent approved order-flow step adds `src/cards/committed-orders.js` and `src/cards/order-controller.js`: Captain locks commit AP and reserve normal costs, batteries/targets remain deferred, operators resolve in any order, earned AP funds additional plans, and impossible orders skip without consuming card uses. The controller tests authority, stale requests, serialization and atomic persistence with synthetic effects. Live Foundry relay/UI, initiative orchestration, skill rolls and weapon/card effects remain pending; see the 1.1.0 record for the integration contract. The RP collection count is now settled at 30 (16 General, 10 Flux, 4 Signature).

The next connected slice adds a dedicated Foundry Card Combat playtest window and shared encounter adapter, 16 executable AP / 6 RP cards, automatic round initiative after locked plans, hex movement, balanced battery attacks and reaction prompts. First libraries are saved on Actors and reused; encounter resources/positions are copies. Existing native combat remains separate. See [the connected playtest guide](CARD-COMBAT-PLAYTEST.md) for launch steps, numerical defaults and remaining work. The full 105-card collection, native canvas migration, new saves/faults and complete talent/equipment integration are not complete.
