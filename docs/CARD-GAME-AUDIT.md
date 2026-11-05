# Arkflight card-game audit

4 November 2026. Code audit of `feat/1.1-complication-foundation`, baseline `4e13f52`. Findings distinguish working implementation, missing integration, design questions and unverified native behavior. This is not a claim of production balance or a completed live Foundry test.

## Overall judgment

The promising core is already here: a shared ship and AP pool, a retained random hand, hull-specific positioning, crew-owned skill rolls and readable tactical consequences. Keep that core. The largest risks are competing generations of rules/documentation, incomplete campaign/equipment integration, variable pacing, and interaction complexity—not a shortage of artwork or another new resource.

Do not restart from scratch. Freeze the current rules vocabulary, prove the current flow with real clients, connect existing ship data, then expand content around observed decisions.

## Verified strengths to preserve

- Mutations run through authenticated commands with encounter/revision checks and copies of state. Player station ownership is checked in the adapter.
- Native movement has immutable destinations, expected/actual pose checks and a saved recovery journal. Optional 3D dice animate evaluated rolls instead of rerolling them.
- `roundFlow=2` separates planning from crew resolution. Drawn-card follow-ups preserve the locked-plan boundary instead of reopening every card.
- Permanent learned libraries and three stored loadouts are distinct from encounter piles. Invalid drafts are retained rather than silently pruning the player's cards.
- Normal fire is always available without drawing an attack card; maneuver templates are hull capabilities. The crew is not completely disabled by a bad hand.
- Burn, Prepared and ordinary discard are different lifecycles. Critical-failure complications provide shared context across collisions/stations.
- Recent UI improvements reduce hunting: dotted canvas targeting, raised eligible Instants, folds/Focus mode and central blocking choices. Art and native skill checks are worth retaining.

## Findings and priorities

| ID | Priority | Evidence | Consequence / recommended action |
|---|---|---|---|
| A01 | P0 | README, old card-combat plan, foundation tables and current sources disagree on RP, cooldown classes, hand/deck limits and flow. | New contributors can rebuild the wrong game. Current contract/handoff now lead the repo; retain historical docs with explicit precedence. Freeze unresolved hand/economy questions before tuning. |
| A02 | P0 | `alpha:simulate` calls `createAlphaSession` without `roundFlow:2`; the default is 1. | Existing 4–6-round claims are not evidence about the current flow. Script output now explicitly says legacy. Build a separate current-flow benchmark before changing weapon values. |
| A03 | P0 before hidden-information claims | `alphaPlayerState` leaves an owned ship's ordered `drawPile` and instance mapping in the returned object. Authoritative state and movement journal are world settings. | The pile browser hiding order is presentation, not a full secrecy boundary. Redact owner draw order in the public projection, supply counts, and verify native setting/socket exposure before claiming hidden plans/decks are private. A GM-private state/public projection architecture needs deliberate migration, not a cosmetic patch. |
| A04 | P0 campaign-alpha gate | `fixtureToken`, `shipActor` and `libraryShips` require marked alpha vehicles/tokens; campaign migration is explicitly disabled. | The current game is a dedicated alpha, not a general campaign deployment workflow. Add an opt-in import/validation adapter that preserves original actors and can roll back. |
| A05 | P1 | `batteries(profile)` builds three standard batteries from hull/level; native ship equipment is not read. | Weapons/upgrades cannot yet reliably provide the persistent identity the user wants. Design one equipment-to-battery adapter and migration policy; do not add a second independent equipment catalog. |
| A06 | P1 | Alpha encounter resources, older ship service resources and Event/voyage systems have different authorities. Alpha derives travel/trade/event tags, but no complete cross-pillar persistence bridge is established. | A combat result or talent can appear meaningful in one pillar but not another. Define shared vessel state and explicit begin/commit/abort behavior, then wire consumers and acceptance tests. |
| A07 | P1 | Card text/outcome tables, rules effects, portrait preview math, eligibility cues and some phase guidance repeat information. | Drift can display a different result than the engine. Shared Instant presentation predicate is consolidated in this pass. Next: declarative effect/cost/timing metadata and a shared check-preview builder. Preserve server validation. |
| A08 | P1 | `alphaTargetLegal` checks geometry/team/living status; command targeting also enforces Crossed Sights' different-target restriction. Dotted lines currently use the geometry predicate. | A visually legal marker can still be rejected by the command. Add one context-aware selection predicate reused by previews, normal orders and replacement targets; test multiple committed shots. Do not weaken the command check. |
| A09 | P1 | HUD Fire then Target are separate commands. Failure after Fire leaves an AP-paid, unassigned shot; the HUD explains recovery. | Concurrent changes can produce a confusing partial workflow. Add an atomic Fire-with-target operation while keeping compatibility for already-prepared shots. Assert no extra AP/ammo/reload on rejected target assignment. |
| A10 | P1 | Base hand 5, explicit hand upgrade, derived cap up to 10, older foundation max 7, user discussions also favored fixed-five. Deck minimum 15 versus starter/capacity 20. | Capacity increases are not automatically desirable, and a smaller legal deck improves consistency. Freeze whether hand is fixed or explicitly upgradeable, and what larger deck capacity is intended to reward. Do not silently change these numbers. |
| A11 | P1 | 26 designs; only Shield Pulse and Emergency Helm are Instants. Reaction window is pre-attack, one defending response. | The interaction model is narrower than the vision of reacting to movement, draws, rolls and damage. Define a small timing contract before adding more Instants. Keep meaningful priority; avoid prompting at every internal operation. |
| A12 | P1 | Default damage and multi-AP attack bonuses can be multiplied on critical hits; defense uses AC, DR and resistance. | Alpha damage/defense may have burst or dominant-combo outliers. Compare equal-AP/resource plans across hulls, levels and defenses. Tune using the current flow, not the fixed training batteries. |
| A13 | P1 | Generic shots spend Supply, repairs spend Supply, travel cargo and resupply are not unified. | Supply can become a combat tax without a meaningful expedition choice. Set a Bulk/storage/resupply contract and show affordability in every relevant card/action. Keep firing requirements visible. |
| A14 | P1 | Three-round auto test uses one curated fixture, training damage, fixed card schedules and shared route choices. It advances commands, not UI clicks. | Excellent regression smoke test, insufficient UI/multiplayer/balance coverage. Add independent route choices, varied seeds, mixed PC/NPC crews, ownership, optional-module failures, native click and recovery cases. |
| A15 | P1 | Complete encounter setup still creates/reuses fixture actors; setup UI organizes existing alpha hull/refit/deck controls. | The four setup tabs are not a full campaign ship-creation wizard. Finish new/import ship creation, equipment, crew assignment, artwork and launch validation as one path. |
| A16 | P2 | Multiple stylesheets override the same HUD selectors; older view models still compute retired flow-1 fields. | Visual fixes can override each other and dead state is hard to audit. Move one component at a time into a scoped layout layer with viewport tests. Keep illustrated art; reduce overrides rather than replacing the UI again. |
| A17 | P2 | Simulation/saved state supports an older alpha flow; older card engines and station combat coexist with new alpha. Some are test-only, some supply helpers, some serve other pillars. | Migrate first; remove later with import/template/asset reference scans and historical data fixtures. Do not delete all files containing `card-combat` or all legacy combat because Events still exist. |
| A18 | P2 | Catalog size, narrative objectives, onboarding, ship-sheet equipment and progression are not yet one authored campaign. | Add a small tutorial and objective encounters before chasing the old 75-card target. Capture time-to-action, unused cards, card circulation and station participation. |

No exploit execution or player-world probing was performed for A03. A document-double reproduction returned 15 ordered draw entries plus the instance map for an owning player. The owned draw-order exposure is directly visible in the return shape; native settings transport/read access requires the listed acceptance test.

## Redundancy cleanup performed in this pass

1. Removed the unused `AlphaRoundTrackerWindow` class and its template. Repository search found no instantiation or consumer; `openRoundTracker()` remains a compatibility redirect to the current HUD. Removed its unused singleton/render-loop slot.
2. Removed the obsolete `[data-round-order]` dropdown listener and `respond-card` menu action from the current HUD. Canvas targeting and card clicking replaced those controls.
3. Extracted `usableInstant` into `src/ui/alpha-instant-readiness.js`; both the current hand and shared command-focus presentation use it. The old export is re-exported for compatibility. Costs, rolls and engine rules are unchanged.
4. Corrected Coordinated Volley's obsolete “attack in the Damage phase” wording to weapon resolution.
5. Marked the pacing probe explicitly `roundFlow:1`/legacy in its output rather than reporting it as current-card-game balance.
6. Added the current contract, handoff, ordered backlog and root navigation; historical plans remain accessible.

## Dependency boundary: why more deletion is deferred

A static relative-import walk from the manifest found 313 JS files, 95 manifest roots and 273 reachable source files at the pre-cleanup baseline. This is a static loading inventory, not proof that every branch is used or that every unreachable file is safe to delete.

Examples of live shared dependencies:
- `alpha-combat-ui.js` uses `card-combat-presentation.js` for existing card art.
- `alpha-combat-effects.js` uses `card-combat-audio.js`.
- `alpha-combat-canvas.js` imports native hex-grid geometry from `card-combat-canvas.js`.

Ten older card test UI/adapter files were not reachable from current manifest roots: `card-combat-motion`, `card-combat-hud-layout`, `card-combat-workspace`, `card-combat-canvas-overlays`, `card-combat-motion-state`, `card-combat-playtest-ui`, `card-combat-fire-ui`, `card-combat-test-ships`, `card-combat-test-fleet`, `card-combat-playtest-api`. They remain because tests/history and further migration checks must be considered before removing their whole dependency families. Their absence from startup already prevents duplicate live dashboards.

## Recommendations from other card games

These are proposals, not newly adopted rules.

| Reference | Relevant mechanism | Arkflight recommendation |
|---|---|---|
| Slay the Spire board game, publisher rulebook [S1] | Clearly separate Draw, Discard, Exhaust and persistent in-play powers. | Keep our existing zones visually distinct; show where a card goes before committing it. Burn means this encounter only. Do not copy its whole end-of-turn discard rule into our retained-hand game. |
| MTG Arena smart priority, Wizards [S2] | Priority exceptions stop play at meaningful opportunities rather than every possible internal step. | Use a small declared set of Instant windows; raise legal cards in hand, auto-skip impossible responses and retain an explicit Pass. Do not import a full Magic stack before the simple model works. |
| X-Wing rules reference, Fantasy Flight [S3] | Hidden maneuver selection and different maneuver capabilities by ship type. | Keep hull-specific choices and clear intent/reveal. Add safe commitment information and predicted path feedback. Arkflight's simultaneous movement and collisions remain its own rules; do not claim X-Wing moves all ships simultaneously. |
| Marvel Champions rules reference, Fantasy Flight [S4] | Explicit hand-size/readying and cooperative player turns. | Make each round's refresh/draw/retain/overflow contract a one-screen explanation; show who owns the next contribution. Do not silently switch to drawing back to full hand. |

Additional design recommendations based on this audit:
- Prefer one clear setup/payoff pair across two stations over long mandatory card chains. Make support meaningful without requiring a perfect draw.
- Add enemy intent and mission objectives (escort, break pursuit, salvage under threat) so movement and trade-oriented builds matter beyond damage racing. Intent is a proposal, not a currently authored enemy AI system.
- Before adding card count, cover roles: reliable defense, positional play, recovery, draw/filter, crew coordination and one exciting Burn payoff. Use rarity for complexity/options, not automatic AP inflation.
- A full hand plus only one normal draw can slow access to the rest of a 20-card deck. Measure actual circulation and dead-hand frequency. Test an explicit optional cycle action before changing the draw rate or discarding everybody's hand.
- Make a ship upgrade change a choice: a new maneuver, different mount, safer charge, better cargo handling or a sidegrade card. Merely increasing maximum deck size can dilute a deck rather than improve it.
- Write one unified “why unavailable?” explanation per action/card. Color/glow is a cue, not a substitute for the cost/owner/window reason.

## Evidence and limits

Baseline `npm test`: 936 passed, 0 failed. `npm run alpha:simulate`: 12 seeds, mean 5.5 rounds, range 2–9, 8/12 within 4–6; it is the older flow and has been relabeled accordingly. This audit did not run the user's live Foundry or establish current-flow balance. No recommendation above is a substitute for native player-client testing.

Primary references checked 4 November 2026:
- [S1 — Contention Games, Slay the Spire rulebook](https://contentiongames.com/_images/STS_KS_Rulebook.pdf). Publisher search excerpt verified zone definitions; full PDF fetch exceeded the browsing size limit. No claim of a full rules review.
- [S2 — Wizards, Smart Priority section](https://magic.wizards.com/en/news/mtg-arena/announcements-october-27-2025). Read the priority section, not an assumed full stack specification.
- [S3 — Fantasy Flight, X-Wing rules reference v1.0.6](https://images-cdn.fantasyflightgames.com/filer_public/93/da/93daf87a-d914-4306-aa28-e58ed14e60c6/b_swzrulesreference_v106_book-compressed.pdf). Search excerpt verified planning and hull maneuver restrictions; direct PDF fetch returned unavailable. Version-specific historical reference, not latest tournament legality.
- [S4 — Fantasy Flight, Marvel Champions rules reference v1.2](https://images-cdn.fantasyflightgames.com/filer_public/81/4b/814b6668-f0af-4fff-a45e-e325c080aafc/mc_rulesreference_v12.pdf). Publisher excerpt verified player-phase hand/ready structure. Historical rulebook comparison, not a claim that v1.2 is current.

See [the ordered tasks](CARD-GAME-TODO.md) for acceptance criteria and dependencies.
