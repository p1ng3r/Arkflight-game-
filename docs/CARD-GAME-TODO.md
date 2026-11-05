# Ordered card-game work list

Updated 4 November 2026. Legend: `[x]` done in code/docs with stated validation; `[ ]` unfinished. Priorities are recommendations from the audit, not promises that every proposed rule has been approved. Reference findings in [the audit](CARD-GAME-AUDIT.md).

## Completed foundation and this cleanup

- [x] Current flow-2 random deck / shared AP / crew roll prototype and persistent alpha loadouts.
- [x] Ten hull profiles, native movement/recovery, contextual 24-card complication deck.
- [x] Illustrated HUD, 20 new hull/faction token options, pile browser, canvas targeting and raised usable Instants.
- [x] Client-persistent folds, Focus canvas, native sheet access and optional audio/motion.
- [x] Manual and automated three-round test fixtures with debug export.
- [x] Current-rule snapshot, new-chat handoff and prioritized audit.
- [x] Consolidated Instant presentation predicate; removed unused tracker class/template and obsolete target/response menu handlers.
- [x] Corrected stale card wording and labeled the old simulation as legacy.
- [ ] Live acceptance of the latest UI/test-runner/aim/glow changes with GM and player clients. Automated pass counts do not complete this item.

## Do next — small, reviewable work packages

### 1. Establish the current-flow acceptance baseline (P0; A02/A14)

- [ ] Run the in-world automated three-round test; collect build/version/module list and debug.txt. A first native report was collected on 5 Nov 2026: Foundry 14.365 / PF2e 8.4.1, build `alpha-private-draw-projection-20261104`, 149 entries. **Failed** at round-2 planning after `max-turns:1` blocked the runner's hard-coded `port-s-3`. The test driver now selects per-ship legal affordable routes in `alpha-native-test-repair-20261105`; the full native 3-round rerun is still pending.
- [ ] Run manual acceptance with separate GM, station owner and unrelated player clients. Exercise mulligan, independent routes, lock/reveal, card ownership/skill choice, draw follow-up, fire, target change, Instant/pass, choices, overflow and recap.
- [ ] Test pointer interaction with dotted labels on Foundry v14, not just graphics doubles.
- [ ] Test folded Cards temporarily revealing a raised Instant, reduced motion, zoom, sidebar/chat open and laptop viewport.
- [ ] Recheck live HUD rendering: the 5 Nov debug report includes three `arkflight-round-deck` `e.fn is not a function` unhandled render rejections. Nine external `eq` subexpressions were removed in the repair build; this is a candidate fix, **not** yet native-verified.
- [ ] Test pause, disconnect/reconnect, GM change, stale revisions, stopped auto run, movement failure and resumption with no duplicate AP, dice, damage or card use.

Acceptance: native evidence and reproduction steps for each failure; a three-round report by itself is not proof of all manual controls. Fix discovered blockers before adding large content packs.

### 2. Define and enforce hidden-information boundaries (P0; A03)

- [ ] Decide exactly what ship owners, station owners, unrelated players and GM can see, including prepared effects, discard, enemy plans and deck composition.
- [x] Redact ordered future draws from non-GM `alphaPlayerState()` snapshots (including owning crews), preserving `drawCount`, owned hand and legitimate Survey choices. This fixes the API projection only; world-setting/socket transport may still expose authoritative data.
- [ ] Verify direct native setting/socket visibility. Move secret authoritative payload to GM-private storage/transport if the intended trust model requires it; migrate with backups/versioning.
- [ ] Test snapshots, console API results and reconnect state—not only hidden HTML.

Acceptance: no future draw order/enemy secret plan is sent to an unauthorized client; commands remain authenticated. Do not describe client-side UI hiding as a secrecy guarantee.

### 3. Freeze the few unresolved rules (P0 design gate; A01/A10/A11)

Resolve together without re-asking settled AP/Standard/Instant/Burn decisions:
- [ ] Is hand capacity fixed at five, or may explicit upgrades raise it? Current Command Relay makes six; old documents also say seven and the generic clamp ceiling is ten.
- [ ] Is a 15-card minimum with 20-card starter/capacity intentional? If yes, explain why larger capacity is an option rather than a mandatory upgrade.
- [ ] Is delayed simultaneous Hull damage across the firing sequence the desired lethality model? Define what happens to disabled ships/orders before changing it.
- [ ] Which Instant windows come next, if any: pre-move, post-hit, pre-damage, or card-resolution? Specify one-response limits and how multi-station ownership works.
- [ ] Are routine shot Supply costs and the current basic-action list the desired expedition economy? Agree on an emergency cycle/repair action before implementing one.

Acceptance: update the current contract and executable tests for decisions; historical documents remain history. No numerical rebalance during documentation cleanup.

### 4. Build a roundFlow=2 pacing/balance harness (P0; A02/A12)

- [ ] Add a separate current-flow driver; fail if a fixture silently falls back to flow 1.
- [ ] Cover light/standard/heavy/capital hulls, levels 1/5/10/15/20, ranged weapons, reload cycles, limited Supply, AC/DR/resistance, drawn-card chains and critical outcomes.
- [ ] Record round/command counts, actual card circulation, AP left for Instants, empty/locked hands, damage distributions, resource use, all station contributions and objectives.
- [ ] Include mirrored matchups and several policies/seeds; report medians/ranges/outliers, not only mean duration.
- [ ] Preserve the three-round training test as a smoke test, not the balance benchmark.

Acceptance: reproducible results identify outliers; the team approves a specific numerical patch with before/after evidence. The legacy 12-seed result cannot satisfy this task.

### 5. Unify targeting and commitment (P1; A08/A09)

- [ ] Reuse one context-aware target selection validator for dotted markers, prepared shots and replacement targets, including Crossed Sights and multi-hex geometry.
- [ ] Add atomic Fire-with-target for normal shots, while preserving old commands and already-committed orders.
- [ ] Show final selected skill/modifier breakdown without pretending a ship baseline is a chosen PC skill.

Acceptance: every offered target is selectable for that order; illegal/stale targets do not cause double AP/ammo/reload consumption; a rejected existing order remains recoverable.

### 6. Shared persistent vessel contract and opt-in campaign adapter (P1; A04/A06)

- [ ] Inventory Actor flags and resource authorities across alpha combat, Events, ship service, travel, trade and salvage.
- [ ] Define one versioned vessel profile/resource/equipment contract, with explicit encounter start, commit/end, abort and recovery semantics.
- [ ] Import an existing chosen ship with preview, compatibility validation and rollback. Never select a specific ship name automatically.
- [ ] Preserve ownership, custom fields, art, libraries, crew assignments and old saved worlds.
- [ ] Wire the actual campaign ship's native token/footprint into combat without requiring fixture flags.

Acceptance: the same selected vessel moves through Event → combat → voyage/trade, with validated persistent results and no duplicated damage or charges after recovery.

### 7. Equipment-to-battery and Arkengine integration (P1; A05)

- [ ] Adapt existing weapons/mounts rather than authoring a parallel alpha-only equipment universe.
- [ ] Define battery grouping, attack cost, selected weapons, range/arc, per-weapon reload/ammo, special ammunition cards and disabled mounts.
- [ ] Hull and Arkengine must produce explicit movement/save/cargo/fitting differences through the shared contract.
- [ ] Equipment previews and actual resolution must use the same values.

Acceptance: swapping a weapon or engine on a saved ship predictably changes legal capabilities; full loadouts validate before combat. A decorative token change never changes statistics.

### 8. Progression across all pillars (P1; A06/A10/A18)

- [ ] Audit each talent/upgrade for implemented consumers, not just declared `pillars` tags.
- [ ] Author meaningful options: new maneuvers, card sidegrades, safer strain use, cargo Bulk efficiency, travel endurance, event approaches and faction access.
- [ ] Set level/slot/power budgets. Prefer broader choices and combinations over simultaneous AP/hand/draw inflation.
- [ ] Persist learn/grant/loot rewards through the existing library and blueprint systems.

Acceptance: at least one testable benefit in each advertised pillar per cross-pillar talent; tooltips describe real effects. No fake bonus from an unused tag.

### 9. Card schema, timing and first balanced content pack (P1/P2; A07/A11/A12)

- [ ] Consolidate costs, requirements, four outcomes, effects, targets, duration, stacking and zone destination into typed/declarative definitions where practical.
- [ ] Derive preview text and availability from shared definitions; retain authoritative command checks.
- [ ] Compare overlapping Acquire Target/Exploit, Read/Fresh Orders/Survey/Recover and damage preparation cards; keep distinct purposes or replace redundant designs after balance review.
- [ ] Ensure deck prerequisites match mounts/ammo/crew and cards have a useful explanation when blocked.
- [ ] Expand Instants only after their timing contract is agreed. Test AP reservation pressure and counterplay.
- [ ] Reconfirm whether the historical 75-card combat catalog is still a release target. Do not restore the obsolete separate 30-card RP deck.

Acceptance: each new card has a unique tactical job, authored outcomes, resource/owner/phase tests and usable art/text at card size. Favor a balanced small pack over raw count.

### 10. Complete ship creation and onboarding (P1/P2; A15/A18)

- [ ] Turn the existing setup tabs into a genuine new/import ship wizard: hull, engine, equipment, crew, learned library, selected deck, art, review, save and launch.
- [ ] Warn on invalid capacities/ownership/equipment without silently deleting stored choices.
- [ ] Add a short first-play tutorial that uses native controls and the current vocabulary. Explain retained hands, Prepared versus Burn, crew skill choices and basic firing.

Acceptance: a new GM creates a usable campaign ship and launches a legal encounter without console edits; players know the next action and can open their sheets.

## Other pillars and release follow-through

- [ ] Events: preserve authored events/Risk flows; consume the shared vessel/talent contract and test saving throws/condition/resource round trips. Keep combat's deck rules from overwriting Event pacing.
- [ ] Travel/trade: define cargo Bulk/Supply relationship, route endurance, prices/availability and resupply through existing systems. Add a voyage budget example and test reward persistence.
- [ ] Boarding: expose pause/scene selection/return through the current HUD, tie real actors and chosen deck scene to the saved battle, and test resumption after disconnect. Do not claim the core boarding branch alone is a complete encounter workflow.
- [ ] Factions: use Ayerstone source identities and lawful harbor context. Add actual contracts/blueprints/card rewards; keep rumored/unknown Council information uncertain.
- [ ] Enemy encounters: add escort, pursuit, extraction and environmental objectives; create GM tools or an explicitly limited AI. The automated test driver is not opponent AI.
- [ ] UI cleanup: consolidate overlapping stylesheet/layout rules, remove unused current view-model fields incrementally, test click hitboxes, card scroll, native sidebar/chat, tooltips and accessibility.
- [ ] Audio: verify actual move, cannon, impact, card and draw sounds; provide mute/volume/reduced-motion fallbacks. Do not count existing sound files as native audible acceptance.
- [ ] Art: catalog unique card scenes and missing maneuver/weapon/condition visuals. Preserve current approved assets; WebP quality 75 for new production images.
- [ ] Legacy retirement: trace shared imports, external launchers, tests, saves and content-pack references; archive history and add migration fixtures before deleting module families.
- [ ] Package/release: decide migration/versioning, manifest compatibility, build/package asset validation, release notes and user guide. No merge/version bump until native acceptance and release scope are satisfied.

## Suggested next chat assignment

Begin with work package 1, then 2 and 3; create the current-flow benchmark before balancing. If native access/debug reports are unavailable, continue useful repository work on the benchmark or target-validator consolidation and clearly label the missing native evidence. Keep every task small enough to test and review, update this list and HANDOFF.md, and publish checkpoints to the current feature branch.

## 5 November 2026 movement-first card redesign checkpoint

**Implemented and passing Node tests, live Foundry acceptance pending:** six card color categories and tags; 20-card ship starter retained; a commissioning and GM-issued per-quest choose-one-of-three reward mechanism; affinity shaping the next five offers; earned active-deck slots capped at 30; 5-second synchronized movement locks; two-card draw *after* movement; player-owned ship Ready confirmations with 12-second AFK completion; one free discard-and-replace per ship per Strategy round; WebP fleet lock badges and center card reveal with optional foley.

**Remaining:**
- [ ] Live native Foundry v14 test of all new mechanics and UI with GM, two players and an NPC ship. Capture build `alpha-quest-crew-reveal-20261105`, debug and actual clicks. Verify pause/reconnect/GM handoff and accidental multi-clicks.
- [ ] Hook completed quests into the commission/quest reward authority. Quest rewards currently require a GM to enter a unique quest reference, then ship owner picks the card. Confirm reward permissions and whether crew should vote.
- [ ] Author and implement **125 additional distinct playable cards**, with rules effects, categories/tags, category-balanced rarity, equipment/faction requirements, art, tests, and no duplicate tactical job. Current catalog is only 26 card designs; pending offers correctly refuse when fewer than three new designs remain.
- [ ] Finalize minimum combat deck size (legacy minimum 15), earned slots versus level slots, swap/replace UI at the 30-card limit, and a current-flow pacing/balance benchmark before balancing numbers.
- [ ] Implement and test one simple shared-AP basic action for each of five stations, while preserving manual skill/rolls and normal weapon fire.
- [ ] Finish hidden opponent maneuver/deck secrecy by migrating authoritative world-setting data to verified GM-private storage and transport; current player API redaction alone is not enough.
- [ ] Ensure card foley is audible and animation configurable for all motion settings. Validate quest/reveal screen scale and participant readiness when users become inactive mid-countdown.
- [ ] Review repositioning card semantics and exact firing/damage ordering against the new movement-first Strategy phase.

### 5 Nov 2026 — player-to-GM request timeout repair

- [x] Player requests now receive a separate **GM-received** receipt before lengthy native movement and journal processing. A missing GM receipt times out after 30 seconds; an accepted request has a separate 120-second processing deadline. On an uncertain timeout the HUD warns players to inspect the current ship cards/AP/phase **before retrying**. See `test/alpha-request-ack.test.js`.
- [x] Updated old GM relay mocks to await a final command result rather than mistaking the early received receipt for success/failure. Latest code checks pass; the feature build is `alpha-relay-receipt-20261105`.
- [ ] **Native multiplayer validation still needed.** Test on separate GM and player browsers, including slow movement and the 12-second card reveal. If a player still sees a timeout, check which message occurs and capture GM/player console errors; unit tests do not prove Foundry chat delivery.

### 5 November 2026 — Native three-round log audit and recap render repair

Uploaded automated guided test: `arkflight-guided-debug-2026-11-05T12-06-34-760Z.txt`, build `alpha-relay-receipt-20261105`, Foundry `14.365`, PF2e `8.4.1`. The report records status **complete**, **358 entries**, **86 evaluated command records**, all three rounds finished, six saved attack rolls plus six damage resolutions, and **zero differences** between expected and actual token hex/rotation across diagnostic snapshots. No command timeout is present. It is a **GM-side scripted guided test, not a multi-client player relay acceptance**.

**Real failure:** 9 `unhandledrejection` entries (three clustered at each round-end transition) all report `Failed to render Application "arkflight-round-deck": Failed to render template part "main": e.fn is not a function`. The tests did complete, but the command HUD was not reliable at cleanup.

**Repair candidate pushed:** `src/ui/alpha-recap-render.js` builds the recap from the existing escaped journal renderer, and `templates/alpha-round-deck.hbs` now inserts `recapMarkup` rather than evaluating the recap's deeply nested Handlebars block. This avoids the cleanup-only template path and preserves recent result details, the saved journal link, and GM next-round action. `test/alpha-recap-render.test.js` checks escaped text, buttons, and the template. This is **not yet proof the native Foundry render error is gone**; rerun guided test after updating the new build.

The two console warnings were: deprecated `Scene#background` getter (changed to `scene.firstLevel?.background?.src` for test-scene backdrop checking) and `Cannot change to combat movement, there is no active combat` (one early warning, not proven to impede test). If the second repeats, inspect native Combat tracker timing separately.

- [ ] **Immediate native acceptance:** pull build `alpha-recap-render-repair-20261105`, hard-refresh, rerun guided 3-round test, export a new debug report. Require `status=complete`, **zero `unhandledrejection`**, no movement mismatches, zero request timeouts, and rendered HUD/recap visible on rounds 1–3.
- [ ] Once guided view is clean, test the separate new `combatFlow:3` with **two actual browser connections**. The guided script intentionally uses the older `combatFlow:2`; it cannot certify five-second auto move, two-card group reveal, 12-second AFK completion or free cycle in the new flow.
