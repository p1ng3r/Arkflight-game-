# Arkflight 1.1.0: card combat decisions and first implementation

Recorded 17 October 2026. Target version: **1.1.0**. This is not a released version or a manifest version bump.

## Current implementation boundary

`src/cards/card-library.js` is the isolated rules foundation for permanent libraries, shared hands, progression capacities, constrained random starter deals, awards, loadout swaps and per-card combat availability. It returns new ship objects containing a `cardDecks` field without mutating the source ship.

`src/cards/committed-orders.js` now implements the Captain's order ledger, committed AP, normal resource reservations, additional plans funded by earned AP, operator reassignment, execution requests, skipped orders and turn completion. `src/cards/order-controller.js` adds authority checks, per-ship serialization, round/revision checks and a persistence contract for executing those rules.

**A dedicated Foundry Card Combat playtest is now connected.** `src/content/combat-cards-playtest.js` contains the first 16 AP and 6 RP designs with executable effects. `card-playtest-session.js`, `playtest-commands.js`, the Foundry adapter and its window connect locked plans, PF2e-style rolls, shared hex positions, batteries, reaction prompts and round initiative. See [the playtest guide](CARD-COMBAT-PLAYTEST.md) for entry points and limits.

The playtest now binds selected linked tokens to a native hex-grid scene, renders a compact canvas HUD with a portrait card hand, supports click/drag targeting, and displays effective weapon arc/range hexes. Real tokens move and rotate; a marked native Combat mirrors initiative, round and active ship. Resources remain encounter copies and damage is not written to live ship Actors. The card HUD owns plan/turn advancement; native tracker round/turn controls cannot bypass it. The first deal saves a permanent `cardDecks` library/hand on an Actor that has none; later encounters reuse it. Existing station abilities continue in the old combat mode. The full 75 AP / 30 RP collection, library management UI, deeper native integration, new damage-save architecture and complete talent/equipment integration remain pending. No release/version bump is made here.

## Accepted combat direction

- Adapt Limithron's naval structure to Arkflight's ship-owned talents, upgrades and equipment.
- Return to a shared AP pool. Start from 4 AP; normal base range 3–7. Explicit hull profiles and command upgrades determine base AP, with crew requirements; ship level alone does not automatically add AP. Explicit abilities and upgrades can be exceptions to the normal range.
- At round start: advance round recovery, Captains submit locked plans, reroll every ship's initiative, then take one turn per ship in resulting order.
- The Captain discusses the plan with the crew and selects actual abilities, assigning their stations/operators. Submitting commits their AP. Players resolve their orders in any sequence during their ship's turn.
- Targets are chosen when orders execute, not during planning.
- Normal Supplies, Morale, Lifeveil and any explicitly authored Hull payment are checked and reserved at submission, then paid only at execution. Reservations are not damage immunity: if resources disappear before a valid execution attempt, skip an unaffordable order cleanly. Outcome-specific extra costs remain the effect driver's responsibility.
- Fire Battery selects its battery as well as its target during execution.
- Earned AP can fund an additional locked plan during the ship's turn. It cannot reopen existing orders or spend original AP that the Captain left unallocated. Multiple additional plans may use portions of an earned balance.
- A Captain/GM can reassign an unresolved order to another eligible station operator. Only that operator's player or a GM can resolve it. A Captain may request execution without rolling for another player's station.
- A now-impossible order can use another legal target. If it cannot execute, skip it and retain its committed AP cost; do not expend ammunition, Supplies, cooldowns or Signature uses for a skipped order.
- Multiple paid actions per operator are permitted, subject to allocated orders, readiness and each card's limits.
- Shared RP remains separate from AP. Restore RP to 1 at round start. Reload timers and card availability advance once per round, not each time initiative changes.

## Movement and weapons

| Hull profile | Free movement | Normal 60-degree turns |
| --- | ---: | ---: |
| Light | 6 hexes | 2 |
| Standard | 5 hexes | 2 |
| Heavy | 4 hexes | 2 |
| Giant | 3 hexes | 1 |

Six headings; normal movement forward; no two turns in the same hex. Powered ships may stop. The ship can pause movement to execute an order, then continue. Navigator controls the path; fitted engines, hull handling and upgrades remain meaningful.

- Basic Full Thrust: 1 AP, +2 hexes.
- Basic Hard Turn: 1 AP, one additional 60-degree turn.
- Movement cards may grant 1–3 extra hexes for their AP cost. Combined additional movement is limited to one more full movement allowance per round: Speed 6 can move 6 free + 6 purchased, not merely 6 total.
- At most one additional facing change per round: ordinary ships can buy a third turn; giants can buy a second. The same-hex restriction still applies.
- Fire a balanced battery of compatible, ready weapons for 1 AP. Preserve individual weapon equipment, upgrades, readiness and reloads; battery damage and exact participating-weapon rules still need implementation and balance work.
- Essential basic orders remain available without taking equipped-card slots: Fire Battery, Full Thrust, Hard Turn and basic Damage Control. Exact Damage Control effect is not settled here.

These rules require adapting older abilities that grant full extra movement, uncapped turning, or additional AP. Do not import their old effects unchanged into the new card collection.

## Ship-owned library and hand

The ship permanently learns cards. Its equipped hand is shared across stations, rather than four cards per station. Each card lists eligible stations; selected cards may support multiple stations. The same card cannot occupy multiple slots or gain separate uses through a different operator.

Generation randomly deals **12 AP cards: 8 General, 3 Flux, 1 Signature**. Guarantee at least one usable General card for every installed station type; reject duplicates and cards incompatible with installed equipment or level. Generation fails clearly rather than silently dealing an unusable hand. Reloading/normalizing an existing ship must never reroll its hand.

Generated starter cards enter both library and hand. Awards enter the permanent library without automatically equipping themselves. Players can swap learned cards into available slots outside combat. Removed cards remain known. No card trading mechanic is specified in this step.

| Level | General slots | Flux slots | Signature slots | Total AP slots |
| --- | ---: | ---: | ---: | ---: |
| 1 | 8 | 3 | 1 | 12 |
| 2 | 9 | 3 | 1 | 13 |
| 4 | 9 | 4 | 1 | 14 |
| 6 | 10 | 4 | 1 | 15 |
| 8 | 10 | 5 | 1 | 16 |
| 10 | 10 | 5 | 2 | 17 |
| 12 | 11 | 5 | 2 | 18 |
| 14 | 11 | 6 | 2 | 19 |
| 16 | 12 | 6 | 2 | 20 |
| 18 | 12 | 7 | 2 | 21 |
| 20 | 12 | 7 | 3 | 22 |

Slots expand without automatically awarding a new card. Rewards can be discoveries, training, faction rewards, loot or authored upgrades. The isolated generator currently deals only the starter quantities even when supplied a higher ship level; additional capacity remains open. Confirm how freshly generated higher-level ships should populate those extra slots before connecting generation to Foundry.

## Card use and recovery

- General: once per round per equipped card.
- Flux: once before its printed 2–5 round cooldown. Used in round R with Flux N, ready at the beginning of round R + N. Round 1 + Flux 2 means round 3; Flux 5 means round 6.
- Signature: once per combat per card.
- Reassigning operators or rerolling initiative never restores a use.
- Only executing an order starts its card cooldown. Planning, locking, retargeting and skipping do not.
- The UI should show the absolute ready round, such as **Ready: Round 3**.

Reaction cards follow the same printed recovery categories, with a separate **six-card hand: 3 General, 2 Flux, 1 Signature**. That hand stays at six under ordinary level progression; explicit talents/upgrades may later expand it. Shared RP still limits how many reactions the ship can actually execute. The current pure card module tracks availability only; the forthcoming combat adapter must enforce the separate AP/RP budget.

## Card collection sizes

- AP base collection: **75 designs = 40 General + 25 Flux + 10 Signature**. These are available authored rewards, not an automatic starting library.
- RP base collection: **30 designs = 16 General + 10 Flux + 4 Signature**. The user clarified four Signatures on 17 October, resolving the earlier count mismatch. The starting RP hand remains 3 General, 2 Flux and 1 Signature.
- Combined base collections: **105 designs** (75 AP + 30 RP), not 105 automatically learned cards.
- Future add-on collections can add learnable cards without automatically expanding hands.

## Skill contribution and outcomes

One roll per operation. Use the ship's appropriate statistic with a contribution from the operator's selected skill proficiency: Trained +1, Expert +2, Master +3, Legendary +4 (Untrained +0). Do not stack the full level-based character skill modifier on top of the level-based ship modifier.

| Station | Three proposed skill choices |
| --- | --- |
| Captain | Diplomacy, Intimidation, Society |
| Engineer | Crafting, Arcana, Thievery |
| Navigator | Survival, Nature, Arcana |
| Battlewatch | Crafting, Athletics, Warfare Lore |
| Veilwarden | Arcana, Occultism, Medicine |

These are Arkflight mappings, not claims about standard PF2e skill actions. Exact Foundry actor skill lookup and roll/DC adapter remain unimplemented.

Every card requires four explicitly authored outcomes: critical success, success, failure and critical failure. Success is its normal effect; critical success adds a small specific benefit; failure and critical failure introduce written drawbacks/complications while retaining the non-attack base operation. For example, Full Thrust can succeed at moving but take 1d8 Hull damage on a critical failure from a collision. The module must resolve written consequences rather than requiring the GM to invent them. Numeric effects still need card-by-card design.

For firing cards, use the attack's roll against AC for both hit resolution and its outcome rider. A shot still needs to hit; no separate activation roll. Reactive timing, exact degree/DC rules and damage-save interactions need explicit integration tests before activation.

## Next implementation slices

1. **Done:** isolated library/hand/progression/dealing/availability rules with tests. No live switch.
2. **First executable batch connected:** 16 AP / 6 RP cards. Finish the remaining 83 designs in manageable batches, with card-by-card balance review.
3. **Order engine and playtest controls connected:** committed AP, reservations, earned-AP additions, deferred targets/batteries, skips, skill-rank contributions and ownership checks.
4. **Canvas playtest HUD implemented:** free split movement, six headings, separate-cell turns, movement/turn purchases, weapon reload readiness and battery resolution. Selected scene tokens now move through the native v14 API with ownership, collision, budget and rollback checks. Weapon catalog arcs now drive coverage and attack legality: precision 60°, broadside 90°, wide 180°, explicit turret 360°. Controlled broadsides can assign separate installations to different legal targets while dividing one battery damage pool, sharing one attack roll and presenting each target's reaction window in sequence. Swivels remain single-target weapons. Concentrated fire is the default; true line/cone/burst damage footprints remain a separate future weapon design.
5. **Permanent first library connected:** existing Actor libraries are preserved. Fresh generator integration, explicit saved-content migration, awards and library/hand management controls remain pending.
6. **Playtest round flow connected:** all plans lock before automatic initiative, each ship acts once, reactions interrupt attacks, and the next round restores budgets. Run the live-world acceptance guide, then extend the remaining native integration and damage/talent systems before a 1.1.0 release.

The previously discussed two damage tracks and three save families remain in [the combat foundations working paper](COMBAT-FOUNDATIONS-WORKING-PAPER-01.md). They have not been replaced by this card foundation. Keep programming steps bounded and ask the agreed five focused questions for unresolved behavior before each new step; do not re-open settled rules.

## Committed-order controller contract

The user approved the five order-flow choices on 17 October: reserve normal costs at lock, choose batteries at resolution, allow earned-AP additional plans, permit eligible operator replacement, and let assigned players resolve with GM fallback.

- Every planned AP order costs 1 AP. RP cards are not accepted into this queue. Base AP defaults to 4 through an authority-owned adapter; this step does not change legacy hull AP profiles or grant client-controlled AP.
- Initial plans transition from `planning` to `locked`. A trusted round controller must collect all ships' plans, roll initiative and identify the current ship before opening `execution`. The new order controller checks that trusted context; it does not implement the fleet-wide round controller itself.
- Planning stores only kind, ability ID, station and operator. Client-supplied targets, batteries, costs and rolled outcomes cannot become locked plan fields.
- Execution requests require the current round and revision. Commands for a ship serialize. Duplicate/stale requests cannot execute a driver or consume resources twice. Reopening the same planning round does not restore AP or erase a lock.
- Effect drivers are registered by trusted code as `card:<id>` or `basic:<id>`. Each supplies a `preflight` and an `execute` method. The controller fails clearly when an effect has not been implemented; it never silently runs a legacy resolver.
- Preflight distinguishes an invalid selection (leave the order pending so the player can choose again) from a genuinely impossible action (skip and release reservations). A valid action whose normal costs are no longer affordable also skips without rolling.
- Execution pays the normal resource costs in a working copy, prepares effects, then marks the card used and order resolved. It never pays AP again. The effect driver returns explicit earned AP separately; it cannot reset the hand, cooldowns or committed ledger.
- `availableResources` passed to an effect driver excludes the current order's already-paid cost and protects other pending reservations. Voluntary outcome-dependent payments must respect that available budget; hostile damage or written complications can still make subsequent orders unaffordable.
- Drivers must prepare effects without independent document writes or irreversible chat/target updates. The persistence adapter must compare the original ship snapshot and save the resulting ship atomically, or reject without changes. An authenticated requester context must come from the authority, never a user object supplied in a socket payload.
- A changed combat, round, turn or requester during preparation aborts persistence. Live multiplayer relay identity, cross-ship effects and recovery from interrupted document writes remain integration work; tests of the isolated contract do not establish live Foundry readiness.
- Turn completion skips remaining pending orders and releases their resource reservations without refunding committed AP or consuming those cards. A later round restores its own base AP; card cooldowns retain their original ready rounds.

Validation for this step: **685 Node tests passed, zero failed**, including 18 new committed-order tests (28 combined with the existing card-library tests). JavaScript syntax checks and the staged whitespace check passed. Tests cover arbitrary order sequence, deferred battery/target choice, cost reservations and loss, earned-AP additions, Captain/operator/GM permissions, takeover, repeated clicks, stale rounds, driver/persistence failures and turn completion. These are rules/controller tests with synthetic effects; live Foundry play and transport remain unverified.


## Animated card HUD — 20 October 2026

The canvas playtest now uses the nine brass/crystal art layers for cosmetic feedback: card frames and type-band glints; committed-card/AP transitions and the plan latch; independent RP feedback; outcome reveals with persistent unique text; Flux countdowns and spent Signatures; cannon trails/flashes, engine flares, ward/Signature accents, active-ship indicators and floating resource changes. Confirmed state revisions drive local effects without delaying commands. Initial snapshots, duplicate/stale revisions and reconnect gaps do not replay prior shots.

Each client chooses Full, Subtle or Off in the HUD/settings; OS reduced motion disables movement. Sound is independent, starts off, and has a volume setting. Native token centers and canvas transforms anchor disposable, click-through overlays. No additional effects module is required. Fourteen new automated presentation checks bring the suite to 745 passing tests. Local Chromium covers the actual HUD and real pure combat dispatcher over mocked Foundry documents; live GM/player, native canvas and audio acceptance remains pending. See the [playtest guide](CARD-COMBAT-PLAYTEST.md#motion-and-sound).

## Compact workspace and sound effects — 21 October 2026

The approved five UI fixes are connected: one compact command strip; Ship/Orders on demand; a movable, resizable, pinnable hand showing about five readable cards; real Minimize/Cards restore; successful-lock auto-minimization; larger Lock Plan beside AP; and independent 85–140% UI scaling. Both floating panels remember client positions/sizes/pins. Eligible reactions temporarily reopen a minimized hand without erasing its saved preference. Card previews expand the art and four outcomes. Panel transitions and short outcome messages supplement the existing combat animations without delaying execution.

Eighteen locally synthesized sound cues cover card controls, plan locking, cannon fire, impacts, movement, incoming reactions, wards, Signatures, readiness and roll degrees. Sound is opt-in with a volume slider, user-gesture unlock, bounded voices and cleanup. It requires no external audio/effects module and never changes mechanics.

Validation: **774 Node tests pass**. Chromium checks use the real templates/styles and pure combat dispatcher with mocked Foundry documents; they cover compact layouts, controls, saved state, reactions, split targeting, motion preferences and real Web Audio scheduling. Live Foundry v14/PF2e multiplayer, native chrome and audible output still require acceptance. This remains a feature-branch playtest, with no module version bump or 1.1.0 release.

### Attached commands and physical cards — 21 October follow-up

The command strip now attaches to the card hand and moves with it, rather than occupying Foundry's scene-navigation area. Larger text sits on a solid dark background. Minimize leaves one strip containing Ship, Orders, AP/RP, Options and Cards restore; its move/pin controls remain available. Options opens within available space without covering its toggle.

Eight bundled CC0 Kenney card-handling samples replace electronic card cues with paper slides, fanning and tabletop taps. Variant selection and small playback-rate variation reduce repetition; hover/scroll/drag stay silent and rapid bursts do not queue. Existing combat sounds remain separate. License/source information ships beside the files.

**780 Node tests pass.** Chromium reproduces expanded scene navigation and checks attached/folded movement, menu clearance, saved state, scaled desktop/laptop layouts and combat flow. All eight Ogg files decode, and card interactions schedule samples without oscillator tones. Live Foundry chrome, audio quality and multiplayer acceptance still require testing.

## Guided combat walkthrough — 21 October 2026

The GM can open a three-round, **Next Step only** demonstration from Combat Options, encounter setup or Configure Settings. Setup creates/reuses a separate marked hex scene, four dedicated demo Actors and linked tokens. Fresh, known hands/resources live in encounter copies. The guide refuses active encounters and paused advancement, never activates its scene for everyone, and preserves campaign vessels and the ordinary editable test fleet.

Each click performs one real command or a no-cost coverage inspection. The sequence includes Captain planning, rerolled initiative, movement/turning, stop/fire/continue movement, support cards, split broadside targeting with separate defender responses, reload advancement, Drive the Crew's additional AP plan, Flux recovery and completion after three rounds. Fixed labeled dice make it repeatable; no autoplay runs. Stop, reset and close/reopen preserve deliberate step control. Readable next-action guidance, persistent receipts, weapon readiness, ready-only card filtering, coverage controls, history and a final checklist all live in the guide. Its panel reserves HUD space rather than covering the hand.

The authority serializes Next with session/revision checks, rejects ordinary manual orders while the script runs, and rolls native token movement back if persistence fails. Only marked demo fixtures are reused/reset; no documents are deleted. **788 Node tests pass**, including eight new rules/adapter tests. Chromium completes 108 clicks, 12 coverage inspections and 13 defender responses with no JavaScript errors, and checks pause, filters, Reset/Stop and smaller-screen controls. These are mocked Foundry/browser checks; live v14/PF2e and multiplayer validation remain pending. This does not add the remaining cards, future engineering/save systems, an AI opponent or a release/version bump.

### Card selection and portrait inspection — 21 October follow-up

The canvas hand now uses a single card-face click for selection and details. Clicking a card face toggles the draft and leaves selected cards raised 20 pixels with a gold outline; Enter/Space works on the focused card. The same click opens a portrait card with its existing brass frame, colored type band, AP/RP cost, station, artwork, name, base effect and four outcomes. Title/art and the action footer stay fixed while rules/execution controls scroll. Short hands retain the name and selection status, with full descriptions in the preview. No nested overlay buttons or Inspect buttons remain. No new art or card rules are introduced.

AP still commits at **Lock Plan**. A reaction face selects a draft response and raises the card; **Resolve Response** still spends RP. Unavailable cards remain inspectable, and committed cards retain native dragging. Static selected positions remain visible with motion disabled. The guided test raises the upcoming Captain's scripted cards without selecting a manual draft, temporarily opens the relevant hand and clearly directs the GM to **Next Step**. Next Step moves/turns the actual token and now follows its destination with the camera. Its authority and 108-step sequence remain unchanged. Card-face/scrolling styles live in the already registered workspace stylesheet so a cached module manifest cannot omit them.

**790 Node tests pass.** Chromium checks selection/deselection, keyboard access, click-to-open details, reduced-motion selection, draft persistence, native card dragging, reaction confirmation, split fire, paper audio scheduling, panel controls and scaled desktop/laptop layouts. The guided run completes 108 steps with 12 coverage inspections and 13 responses without JavaScript errors. The Foundry frame/documents are mocked; live v14/PF2e and multiplayer validation remain pending.

### Guided token-input follow-up

Native movement/rotation hooks no longer forward manual inputs into the guided encounter's command queue. Guide-controlled movement and rollback carry an explicit synchronization marker, including for callbacks outside the short local moving guard. The server still rejects direct manual orders during the walkthrough. Full adapter tests now fire native hooks and assert no rejected-order notifications; two additional regressions cover repeated input and late synchronized callbacks. **790 Node tests pass.** Other modules' v14 deprecation warnings are outside this fix.

### Guided fixture recovery

Next Step now synchronizes only the original marked demo tokens in their marked scene to the saved encounter poses before advancing. Unexpected positions/facing never become free movement or a second action. The ordinary encounter guard remains strict. Identity, stale and pause checks precede document updates; blocked corrections preserve the pending step and expose expected/actual pose details. Demo setup/reset locks fixture dimensions to one hex and disables PF2e actor-size linking/autoscaling, leaving campaign tokens and permanent Actor resources alone.

**795 Node tests pass**, including five new adapter regressions covering Step 5 after planning, repeated drift over all three rounds, protected document identities, paused/stale requests, blocked recovery and resized-fixture reset. The 108-step Chromium guide remains passing with camera follow. Native rendering and the particular installed-module interaction that caused the user's drift remain live acceptance work; the reported PF2e tracker render error is a separate unresolved report.
