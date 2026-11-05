# Arkflight — start here in a new chat

Updated 4 November 2026, America/Los_Angeles. This file is a repository handoff, not a verbatim transcript. It preserves verified decisions, implementation boundaries, sources, outstanding work and how to resume. Unseen earlier answers must not be invented.

## Read in this order

1. [Current card-game contract](docs/CURRENT-CARD-GAME.md): what the code does now and which older decisions are superseded.
2. [System audit](docs/CARD-GAME-AUDIT.md): findings, cleanup, strengths and sourced game-design suggestions.
3. [Ordered work list](docs/CARD-GAME-TODO.md): next tasks and acceptance criteria.
4. [Canvas HUD and live test guide](docs/ARKFLIGHT-CANVAS-HUD-ALPHA.md): implementation details and exact click tests.
5. Read the implementation files for the specific task before changing them.

## Project and branch

- Correct repository: https://github.com/p1ng3r/Arkflight-game- . The separate `p1ng3r/arcflight` repository is not this project.
- Current shared feature branch: `feat/1.1-complication-foundation`. Continue here unless the user chooses another branch. Do not assume the historical `dev` instructions describe this feature's latest state.
- Target: Arkflight 1.1.0, Foundry VTT v14 / PF2e. Manifest/package still say 0.1.0: this work is an alpha, not a released 1.1.0 package. Do not bump/release/merge to main implicitly.
- Audit baseline: remote commit `4e13f524ed354a025075fd81de403dad138bf2c2`. This handoff/cleanup is a later commit on the same feature branch. Use `git log -1` for the latest revision.
- Laptop Git Bash directory: `/c/Users/thep1/AppData/Local/FoundryVTT/Data/modules/arkflight-game`.
- Desktop directory: `/c/Users/user/AppData/Local/FoundryVTT/Data/modules/arkflight-game`.
- Preserve custom/untracked art. Do not use `git clean`, hard reset, force push or reapply old repair patches to update a working laptop.

```bash
cd /c/Users/thep1/AppData/Local/FoundryVTT/Data/modules/arkflight-game
git status --short --branch
git pull --ff-only origin feat/1.1-complication-foundation
```

If the pull refuses because of local work, inspect the changes and preserve them; do not discard them. Hard refresh Foundry clients with Ctrl+F5 after pulling. Restart Foundry when the manifest changes.

## Product direction to protect

This is a cooperative tactical card game about a shared ship, played on the Foundry canvas. Keep the ship as a persistent character, with crew making PF2e skill checks and ship equipment/talents creating identity. Use PF2e for four-degree checks, X-Wing for hull-specific maneuver templates and positioning, and Limithron as a ship/crew coordination influence. Do not copy all three action economies together.

The ship also participates in Events, travel, trade, progression, boarding and faction stories. Those pillars retain distinct play loops but need a shared vessel authority. The alpha does not yet deliver that full bridge.

Superseded combat ideas include separate RP, compulsory General/Flux/Signature cooldown decks, fixed equipped-card hands without draws, station-only AP and routine move-fire-continue. Older docs/modules are preserved history or separate legacy systems, not permission to reintroduce these ideas.

## Latest delivered features

- Phased `roundFlow: 2` combat; 26 card designs, a 20-card starter, 10 hulls, 24 shared complication cards with six contextual entries each.
- Persistent learned library, three saved loadouts, refits and combat editing locks for marked alpha ships.
- Real native token movement and facing, multi-hex footprint markers, collision/recovery journal, real PF2e crew checks, saved attack dice, damage, chat receipts and optional Dice So Nice animation.
- One current illustrated HUD with phase/readiness tracking; native character/ship sheet access; manual crew skill choice and roll controls.
- Movable native dialogs; independent Phases/Ship/Cards/Orders folds; client-persistent layout; Focus canvas / Restore all. Required responses and choices remain reachable.
- Searchable picker for 20 newly created hull/faction token illustrations. Cosmetic Apply updates selected alpha portrait/prototype/primary token, not ship statistics or secondary hull markers.
- Dotted mount-colored targeting lines and clickable labels; selection is free, committing a normal shot costs AP. Full range bands remain optional.
- Usable Instants glow and rise in the hand; clicking the card opens its skill/roll view. A folded hand temporarily appears when an eligible Instant is available. No duplicate response-card menu.
- Two level-5 training ships, ten level-5 NPC crew, manual three-round walkthrough and an automated three-round runner with Pause/Resume/Stop and debug.txt export.
- Brass/teal illustrated UI, card scenes, starfield for dedicated blank test scenes, motion/sound controls. Existing campaign scenes are not reskinned.

Last pre-audit runtime build: `alpha-instant-hand-20261104`. This audit changes documentation and removes redundancies without changing core numerical rules; see git history for its exact changed files.

## Source map

| Concern | Source |
|---|---|
| Card IDs, AP, stations, starter deck | `src/alpha/cards.js` |
| Hulls, level math, fittings, talents | `src/alpha/hulls.js` |
| Core effects, attacks, saves, draw/refresh | `src/alpha/combat.js` |
| Current opening/planning/resolution flow | `src/alpha/round-flow.js` |
| Maneuvers, collisions, footprints | `src/alpha/maneuvers.js` |
| Learned library, loadout validation | `src/alpha/ship-library.js` |
| Authenticated command/persistence adapter | `src/foundry/alpha-combat-api.js` |
| Native movement and recovery journal | `src/foundry/alpha-combat-canvas.js` |
| Persistent Actor library adapter | `src/foundry/alpha-ship-library.js` |
| Crew requests, receipts, Dice So Nice | `src/foundry/alpha-crew-chat.js`, `alpha-card-dice.js` |
| Current HUD and portrait cards | `src/ui/alpha-round-deck-ui.js`, `templates/alpha-round-deck.hbs` |
| Shared Instant presentation eligibility | `src/ui/alpha-instant-readiness.js` |
| Dotted lines/range/maneuver overlays | `src/ui/alpha-combat-overlays.js` |
| Art/pile browser | `src/ui/alpha-hud-tools.js` |
| Setup/refit/loadout UI | `src/ui/alpha-ship-library-ui.js` |
| Guided steps / automatic scheduling | `src/alpha/guided-test.js`, `src/foundry/alpha-auto-runner.js` |
| Guided debug capture | `src/foundry/alpha-guided-debug.js` |
| Complication catalog/consumers | `src/content/ship-complications.js`, `src/combat/ship-complications.js` |
| Loaded entry points | `module.json` |

## Test and native acceptance boundary

At the audit baseline, `npm test` passed 936 tests. Re-run after edits and report the actual count. Tests include rules, authorization, stale revisions, movement recovery, card flows and the automated driver using Foundry document doubles. Browser harness checks in earlier work were not live Foundry screenshots.

The user confirmed independent maneuver selection/movement worked in their world. Do not turn this into a claim that all subsequent UI, automated-test, dotted-label or glow changes passed native multiplayer acceptance. No latest live debug.txt has been reviewed in this audit.

```js
// GM Script macro: current HUD
await game.arkflight.alphaCombat.open();
// GM Script macro: test window
await game.arkflight.alphaCombat.guided.open();
```

In the test window, choose Run automated 3-round test, confirm dedicated fixtures and unpause. For actual UI ownership/click acceptance, use the manual test and a separate player client. Automation drives real commands, not browser clicks. It replaces the current alpha test after confirmation; it does not migrate a campaign ship.

`npm run alpha:simulate` is explicitly a legacy roundFlow=1 probe. Its result is not current-flow balancing evidence. A roundFlow=2 balance harness is a top-priority task.

## Visual and working preferences

- Keep the approved illustrated brass/arcane teal style, readable cards and unobstructed battlefield. Avoid adding permanent panels for every feature.
- All new production art must be WebP at quality 75. Ship tokens: transparent 1024×1024, overhead, bow up, clear silhouettes, no personal names or circular bases. Use a mix of men and women for crew/card art.
- New collections: `assets/art/ships/tokens/hull-factions/` and `faction-variants/`. Their READMEs record subjects/provenance. Do not overwrite prior art casually.
- Ayerstone lore source: https://github.com/p1ng3r/Ayerstone-Setting-Guide ; integration notes in `docs/AYERSTONE-FACTION-INTEGRATION.md`. Artistic faction treatments are interpretations, not invented canonical heraldry/fleet facts.
- Keep confirmations for actual destructive UI actions, not routine coding. Publish concrete tested changes; tell the user what changed and give the correct laptop commands.
- Separate rules proposals from implemented behavior. Ask only for genuinely unresolved decisions; don't re-ask settled choices or silently rebalance the game during cleanup.

## Paste into the next chat

> Continue Arkflight from https://github.com/p1ng3r/Arkflight-game- on feat/1.1-complication-foundation. Read HANDOFF.md, docs/CURRENT-CARD-GAME.md, docs/CARD-GAME-AUDIT.md and docs/CARD-GAME-TODO.md first. Verify the latest branch and tests. Treat it as a cooperative ship card game using the current roundFlow=2 rules. Preserve the illustrated HUD, native canvas movement, dotted targeting and raised Instants. Start with the highest unfinished task; distinguish proposals from approved rules and do not resurrect RP/Flux-era combat. All new art is WebP quality 75.
