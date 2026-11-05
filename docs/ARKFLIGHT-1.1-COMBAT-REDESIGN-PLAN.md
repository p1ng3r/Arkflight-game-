# Arkflight 1.1 — Movement-first card combat redesign implementation plan

Status: **design plan only; no rules or runtime changes in this document**. Drafted 5 November 2026 for `feat/1.1-complication-foundation`. Read [current card contract](CURRENT-CARD-GAME.md), [audit](CARD-GAME-AUDIT.md), [backlog](CARD-GAME-TODO.md), and [handoff](../HANDOFF.md) before implementation. Executable code remains authoritative until each milestone has tests and explicit rule approval.

## Approved player decisions (do not reopen casually)

1. Draw **two cards per round**, retaining unplayed cards.
2. Once per round, **discard one card and draw one replacement for no AP**.
3. Give **each of the five crew stations one reliable basic action**, spending shared AP.
4. Present combat as **Plan → Execute → Recover**, without exposing every internal engine phase.
5. Players **manually choose a PF2e skill and manually roll each card**. UI may remember a selection, but must never silently roll for the user.
6. Instants continue to **cost AP**; the UI makes AP reservation visible.
7. Every authored card must have a **distinct tactical role**.
8. Retain both normal weapon fire and card-driven attacks, with visibly different card categories and clear AP ownership.
9. **Enemy intentions remain hidden until resolution**; do not add an enemy intent telegraph.
10. Progression favors **maneuvers, sidegrades, equipment-card connections, and synergies** over blanket AP/draw inflation.

### Additional approved movement sequence

- **Every round begins with maneuver selection**, not a card planning step.
- Each ship sees legal hull-specific maneuver templates and preview geometry, saves its own choice, and locks independently.
- The fleet HUD publicly indicates only **lock readiness**, never an opponent's selected route.
- When **all surviving participating ships have locked**, trigger a synchronized **5-second countdown** automatically.
- At zero, reveal selected maneuvers and perform simultaneous ship movement using native Foundry tokens, resolving contact/collisions and checking final positions.
- Only **after all movement and consequences settle** should the **Strategy phase** open for card play.
- First-round starting hand is dealt at encounter setup (outside that round's maneuver interaction). Later two-card round draws occur on **entering Strategy after movement**, not before movement.
- No additional GM click is required for normal countdown or progression. GM pause/recovery must work, and no timer should commit illegal or stale routes.

## Proposed deck size — approval and balance gate

**Recommendation, not yet approved:** increase the shared ship's starter/loadout deck from **20 to 25 cards**. Keep an **opening hand of 5** for initial testing. Normal draw increases from **1 to 2** starting in the second round. The free cycle belongs to Strategy and is once per ship per round. Retained hand overflows are resolved in Recover, not blocked mid-draw or mid-card-effect. Keep 4 shared base AP and existing explicitly purchased hand-capacity upgrades initially.

Deck count is **per ship**, not per station/player. Current catalog has 26 distinct card designs, ordinary copy max 2 and Unique max 1. Build an initial 25-card mix balanced across the five *primary* station roles, including a few cooperative/multistation cards, so Captain does not dominate the shared hand. Audit no-op cards dependent on adjacent ships, special ammo, unavailable batteries, or delayed effects.

**Do not increase starter deck size while leaving the minimum-loadout rule at 15 without review**: competitive decks could shrink back to 15 for more reliable draws. A fixed 25-card starting loadout, or minimum 25 with narrowly justified capacity increases, is the preferred test candidate. Current automatic +1 deck slot per four levels should not be carried forward automatically: progression preference is tactical specialization, not mandatory deck inflation. Decide these linked numbers as one rule change before coding.

Capture draw availability, cards used by each station, dead-hand frequency, cycling frequency, overflow, discarded/Burned card frequency, full draw-to-reshuffle turns, AP left for Instants, and median encounter duration in **roundFlow=2**, not the legacy simulator. Compare 20/25/30 cards using the *same* policy, seed, opponents, and card circulation rules before freezing 25.

## Player-facing flow

### PLAN — Movement selection and strategy

**Maneuver substage:** all players pick route templates, inspect path and endpoint, and lock without revealing enemy choices. Small animated fleet instrument displays each participating ship and states: selecting / locked / countdown / moving. At all locked, 5-second synchronized countdown; on zero, move native ships together. Contact and collision effects must finish before Strategy starts.

**Strategy substage:** grant two normal draws on rounds 2+; permit one free discard/draw cycle; show one shared retained hand, shared AP budget with **reserved-for-Instants** emphasis, individual station role and card eligibility, legal battery arcs, and explicit shot costs. Crew queue or revise Standards and 1-AP station basics. Each card exposes its actual skill choices and waits for the chosen crew member to roll manually during execution. Crew then locks the strategy plan. Enemy planned cards and intent remain hidden until resolution.

### EXECUTE — Outcomes with minimal redundant prompts

Resolve committed station actions in defined order using current PF2e four-degree rules. Never auto-roll a chosen card. An authored **Attack card** includes its weapon shot in its printed AP cost; a **Support/Utility card** does not; normal **Fire** remains a 1-AP battery action without a card. Provide atomic target-and-fire selection, retaining ability to recover existing unfinished shot orders. Only show eligible Instant reactions at real response windows; raised/glowing legal Instants, explicit Pass, and automatic skipping of windows with no legal response. Apply Hull damage following a documented exchange rule; keep any simultaneous damage rule distinct from sequential firing declarations.

### RECOVER — Quick visible summary

Auto-progress expired effects and reload bookkeeping; recap fired shots, damage, resource changes, comp effects, Burned/Prepared/discard destinations and each station's participation. Offer manual overflow discards until hand cap is met, then prepare the next round's **maneuver** stage. Never require extra UI clicks for bookkeeping.

## Known design conflicts to solve before the implementation cutover

1. **After-movement relocation cards.** `Full Ahead`, `Breakaway Volley`, and `Emergency Helm` currently change position after normal movement. A strict movement-first rule needs explicit semantics: e.g., reserve Emergency Helm as a clearly labeled attack-response exception, and redesign Standard positioning cards into limited tactical adjustments with separate transparent overlays or into maneuver choices. Do not silently move movement cards into hidden pre-movement play or delete them. Set the exact exception policy with the user.
2. **Draw timing.** Current later-round flow draws before planning. The approved order makes movement first and requires draw only at Strategy. Keep first-round deal at setup. Ensure a draw effect during execution can reopen only its limited current follow-up window; do not restore all planning.
3. **Maneuver AP versus card AP.** Legal maneuver AP must be reserved when locked and shown as remaining shared budget before Strategy. Crew must be able to reserve remaining AP for Instants without a new RP resource. No double charges on stale/failed maneuvers.
4. **5-second timer and multi-client authority.** Use one authoritative movement-lock/countdown state with shared deadline, synchronized visual progress, replay-safe reveal, and pause/GM disconnect recovery. Never trust a CSS timer as game authority. Do not move tokens twice after a retry.
5. **Bigger starter versus smaller legal decks.** Enforce an agreed minimum/loadout policy before reporting 25 as the real standard; 15-card legal decks make larger starters optional and may favor consistency over variety.
6. **Manual rolls and pacing.** Preserve real player skill choice/roll while minimizing extra cards/phase/target menus. Preview modifier and skill effects before committing; no automatic roll without consent.
7. **Basic station actions versus cards.** Define one simple, reliably useful shared-AP option for each role without making paid draw cards obsolete. Existing normal weapon fire should not be accidentally double-counted as an extra free Battle Watch attack.
8. **Hidden intentions and security.** The full `alphaCombat` authoritative state currently lives in world settings; the player API's redaction alone does not prove enemy plans, ordered draws, and hands are secret from clients. Verify and migrate to GM-private authority before claiming competitive hidden movement.
9. **Supply and equipment.** Normal battery fire/repairs consume Supply; cards must indicate actual ammo/mount requirements. Future ship equipment adapter must be a single authority instead of a parallel alpha weapon system.
10. **Native render acceptance.** The Nov 5 debug found a failed round-2 guided test and HUD template errors. Repairs are committed, but live rerun remains pending; verify before major refactor.

## UI specification: small animated WebP fleet dial

- Floating, movable, collapsible display, target footprint approximately **300 × 100 px** for a small fleet; gracefully compress/expand for 2–10 ships without covering the canvas.
- Use existing brass and arcane teal style, **static WebP quality 75** ship silhouettes/decorative assets; optionally animated WebP for short decorative flourishes.
- Prefer **CSS/SVG for driven animations**: gentle selection pulse, latch/lock snap, each ship medallion lighting up, synchronized 5→0 dial sweep, brief reveal flash, moving state, then transition/collapse to Strategy.
- Use true authoritative countdown state; an animated WebP is never the authoritative five-second clock. Ship labels/status remain readable without color and with reduced-motion enabled.
- Show statuses only; never leak opponents' chosen routes. Tooltip/accessibility text should clarify locked / waiting / countdown / movement failure.
- Only rerender/update on relevant changes, avoid excess graphics work during moving or native Foundry token drawing.

## Implementation work packages and acceptance criteria

### P0. Capture current baseline and freeze rule specification

- Re-run repaired native three-round smoke test with GM and separate player; collect logs. Verify current HUD render and token/movement journal.
- Create **roundFlow=2** deterministic behavior/metrics harness for deck, timing, AP, participation, attacks, and encounter outcomes (separate from legacy 1).
- Write exact agreed rules for hand cap, loadout minimum/capacity, cleanup timing, station basics, repositioning exceptions and firing/damage ordering.
- Acceptance: reproducible baseline + reviewed before/after metrics and no ambiguity around what happens in each round.

### P1. Movement lock + countdown engine and reveal

- Refactor current round state so round refresh transitions to maneuver selection with no intervening draw stage.
- Store per-ship maneuver choice/lock; status broadcasts expose lock only. Add authoritative 5-second countdown with cancel/pause/resume, rejoin and stale-revision behavior.
- At zero, reveal and resolve simultaneous hull-specific routes, native tokens, collision impacts, damage saves and movement journaling.
- Acceptance: 2–10 ships, each route correct, no early reveal, no duplicate movement on reconnection/retry; failure is recoverable without progressing to Strategy.

### P2. Fleet dial artwork, animation and HUD

- Add transparent quality-75 WebP silhouettes/emblems and lightweight CSS/SVG motion.
- Status medallions: selecting / locked / countdown / moving / Strategy. Fold/unfold / drag / zoom / narrow screen / reduced motion / optional mute.
- Acceptance: five-second visuals match engine, all clients agree on lock states, negligible obstruction to battlefield and native Foundry render works.

### P3. Strategy hand, decks and AP economy

- Implement approved two-card later-round draw on entering Strategy, free once-per-round cycle, retained hand and overflow only in Recover.
- Trial 25 balanced starter vs 20/30; revise library validation and loadout UIs only after final deck-size gate. Preserve learned libraries, old saved loadouts, and three saved slots; use versioned migration, no silent deletion.
- Add shared AP commitment/reservation visualization, card grouping, affordability and eligibility explanations.
- Acceptance: deck conservation/shuffle/Burn/Prepared/Draw behavior, randomized seeds, legal 25-card loadout validation, station participation, no double AP spend; old saves load with an explicit migration path.

### P4. Station basics and distinct card identities

- Author one intentionally lower-ceiling 1-AP fallback per station and test action ownership/skill resolution. Keep existing normal fire usable.
- Audit all 26 cards for duplicate jobs and special-case failures. Define distinct utility, command/setup, attack, defense/Instant, positioning and recovery niches. Retain clear cooperative synergies.
- Preserve manual skill selection/roll per card, including correct actor modifier breakdown and station permissions.
- Acceptance: every station has useful options without a lucky draw; setup cards are not always strictly dominated by another 1-AP card.

### P5. Execute/reaction/targeting pipeline

- One visually simple Execute sequence on top of internal roll, firing, response and damage states.
- Atomic target-and-fire; shared target legality for dotted arcs, replacement targets and contextual restrictions. Distinguish Shot Included vs normal 1-AP Fire on cards.
- Maintain currently approved Instant AP timing and explicit reserved AP. Auto-skip empty response windows; no automatic card roll.
- Acceptance: duplicate commands, late player inputs, multiple batteries/ships, critical fails, retarget and reactive defenses produce no double spend, duplicate damage or illegal targets.

### P6. Recover + campaign/UI integration

- Single recap of cards/piles, damage, Supply/Morale/Lifeveil/Strain, reload, complications and pending overflow; then next maneuver stage automatically.
- Validate native campaign ship import/selection and future persistent resource/equipment contract, without changing existing actors implicitly.
- Acceptance: complete three-round native runs, mixed GM/station owners, real player click flows, mixed hull sizes, reload and interruptions; no block waiting on irrelevant manual bookkeeping.

## Rollout gates / safeguards

- Ship all of this on `feat/1.1-complication-foundation`; do not merge, publish 1.1.0, change unrelated Events, or delete legacy migration files as part of the first implementation.
- Feature-flag new combat flow and migrate alpha encounter schema rather than retroactively interpreting old saves under changed rules.
- Unit tests + current-flow benchmark + Foundry v14/PF2e native GM/player manual acceptance are all required; node tests alone do not prove countdown, WebP/HUD, movement or hidden info.
- Prioritize correctness of movement/reveal, multi-client authority and hidden-information security over art polish.
- Freeze a design decision only after it is explicitly approved, even if this file proposes a numeric value.

## Suggested implementation order

1. Live baseline, objective metrics and unresolved semantic gates.
2. Per-ship movement locks + synchronized five-second reveal + movement-before-draw.
3. Compact WebP fleet dial and phase transition.
4. 25-card starter/loadout policy, two-card draw, free cycle, AP reserve.
5. Station basics and 26-card uniqueness pass.
6. Execution simplification / target-and-fire / response polish.
7. Native multiplayer regression, campaign adapter and release gate.
