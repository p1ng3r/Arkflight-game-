# Arkflight 1.1.0 implementation plan

Updated 26 October 2026. Accepted rules: `ARKFLIGHT-1.1.0-DECK-COMBAT-FOUNDATION.md`. The earlier equipped AP/RP hand is superseded for the new design. The previous prototype remains separate. No completed increment implies a merge, version bump, campaign migration or release.

## 1. Complication foundation — implemented for testing

Twenty-four original cards each have Impact plus five station entries: 144 contextual outcomes. Deterministic deck handling, final-critical-failure gate, per-source/ship idempotency, choices, resource costs, expiry and typed effects are implemented. The independent GM Complication Lab can inspect all entries. The alpha now consumes modifiers/restrictions, reload scheduling and paid opportunities in its own action/movement controller. Explicit ship-held system critical failures use matching entries; travel/event draws are not implied.

## 2. Hull and maneuver contracts — alpha implemented

Ten opt-in hulls have distinct handling, capacity, defenses and one-to-three-hex footprints. Complete forward/60-degree-turn routes have exact previews and costs. Hold remains legal. Translation advances one hex per shared step; printed turns do not add a beat. Collision contests compare degree then total, with safe displacement of a stopped loser and both stopping on a tie/no-space result. Hull progression is test data, not the final production budget.

## 3. Planning and native movement — adapter implemented; live acceptance pending

Navigator stages → Captain locks → shared reveal → batched native movement → position/facing confirmation. One primary GM serializes commands. Movement intent and resolved rolls are journaled before native execution. Partial completion can resume without rerolling or restore starting poses. Tests cover document acknowledgements, mutable native payloads, blocked partial batches and save failure. These public-document mocks do not establish a fix for the previously reported live guided-demo rollback. Actual Foundry v14/PF2e and module-interaction tests remain required.

## 4. Deck and phase controller — alpha implemented

Shared AP only; opening draw/mulligan; Hand/Draw/Discard/Prepared/Burn zones; one later-round draw; hand overflow; delayed AP after refresh; per-round initiative; ship-ordered Card phases; all targets declared before rolls; bounded incoming-attack Instants; one replacement target or held shot; simultaneous Hull exchange. The saved paper encounter's hand, random state and opponent course are untouched.

## 5. Actions and effect consumers — playable slice implemented

Twenty-one cards demonstrate basic support, coordinated attacks, maneuver adjustments, Supply-consuming repair, Lifeveil defenses, Burn, delayed effects, limited ammunition, optional boarding and reload manipulation. Basic Fire Battery remains available for AP. Three ship-held system saves replace old flat checks in this slice; no recursive critical-failure draw or duplicated fixed penalty. A twelve-seed rules-only pacing probe is reproducible with `npm run alpha:simulate`. Expand numerical/edge-case coverage after live play identifies concrete issues, then author the full 75-card production collection.

## 6. Persistent progression across pillars — partial foundation

Six upgrades and six talents validate level/fitting limits and affect the alpha profile. Bulk capacity and travel/trade/event capability records establish a data seam; legacy pillar consumers are not connected. Actor-held learned libraries, three named loadouts, GM grant/remove tools, out-of-combat locks and profile/refit revalidation are now implemented for alpha ships. Remaining work: major play-changing talents, complete weapon/equipment catalog, cargo packing/overload, automatic loot/training/trade acquisition, campaign resource persistence and versioned migration preserving crew/assets/libraries. Ask focused questions when those contracts are reached, without reopening accepted combat decisions unnecessarily.

## 7. Builder, sheet, HUD and introduction — temporary alpha UI implemented

The compact movable/resizable/minimizable native window provides Builder, Maneuver, Cards, Ship/Crew and Log views. It includes raised card selection, readable outcomes, canvas route/arcs, assigned crew skills, diagnostics and one actual suggested command per click. Prepared deck scenes can pause/resume the ship battle. It is not the final ship sheet or a complete new-player introduction. The separate Ship Library window now provides permanent learned-card/deck management with player filtering and stale-draft protection. Remaining work: full refit/level-up wizard, production visual mockup choices after mechanics settle and skippable/resumable introduction. See `ARKFLIGHT-1.1.0-SHIP-LIBRARIES.md`.

## Next gate: native alpha acceptance

Follow `ARKFLIGHT-1.1.0-ALPHA-TESTING.md`. Test a GM and assigned player, ordinary/poor hands, two/four ships, actual collision/footprint movement, reconnect/reopen, Instants, delayed effects, ammunition/reload, deck exhaustion and recovery. Capture diagnostics on failure. Measure the 4–6-round goal without forcing outcomes; large critical bursts already produce outliers in scripted pacing.

Only after those checks should campaign migration, catalog expansion and cross-pillar integration proceed toward replacing the old combat prototype. Distinguish Node/browser mock verification from live-world results in every acceptance report.


The user has passed the initial live combat/permission test, including the current internal-roll presentation. That acceptance does not automatically pass the new library increment; its live persistence/multi-client checklist remains pending. Visible chat/dice roll presentation remains a requested UI improvement.
