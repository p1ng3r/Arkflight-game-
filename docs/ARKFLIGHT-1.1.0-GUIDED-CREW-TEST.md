# Three-round crew test and debug export

Build: `alpha-ui-walkthrough-20261031`.

## Update and open

In the installed `arkflight-game` repository:

```bash
git fetch origin
git switch feat/1.1-complication-foundation
git pull --ff-only origin feat/1.1-complication-foundation
```

Restart the Foundry application/server, then refresh every connected browser. This matters because the module manifest stops loading the earlier combat frontends. A browser refresh alone may keep the server's earlier module script list.

As GM, run this Script macro:

```js
await game.arkflight.alphaCombat.guided.open();
```

Alternatively open the current crew table, then **⚙ → 3-round crew test**, or use **Configure Settings → Arkflight → Open 3-round crew test**. The guide displays the build above. Earlier `cardCombat.open()`, `cardCombat.openGuidedDemo()`, `openCombatConsole()` and `combatConsole.open()` launchers redirect to the current UI.

## Run it

1. Click **Create ships & start test** and confirm. It replaces the active alpha test, creates/reuses its own marked fixtures, opens the current hand dock and tracker, and begins debug capture. Unpause Foundry before advancing.
2. The guide now displays a phase checklist. **Show combat controls** opens the actual hand and focuses the ship needing attention. It does not perform the action.
3. Opening: select zero to two replacement cards and click **Keep hand** (or the replace confirmation) for each ship. Use the ship dropdown to switch.
4. Maneuvers: preview different legal routes for the two ships, then lock each. Confirm the fleet movement popup. Routes are your choice; the guide no longer forces matching routes.
5. Card planning: click cards, inspect, commit, and lock each ship’s plan. Keep at least 1 AP for a battery if you want to fire. During resolution select the station skill and click Roll yourself.
6. Firing: show weapon arcs, ready a battery, select its legal target, and finish declarations for each ship. Play eligible Instants or pass, roll to hit, then roll damage using the actual buttons.
7. Review each recap and start the next round; click each ship’s deck to draw. After round-three cleanup, resolve pending discards/choices and click **Finish test & export** in the guide. A fourth round is blocked. Send the resulting debug.txt.

The test window never executes the checklist action. Normal UI permissions, legal targets, AP, station checks, chat receipts and dice still apply. Both fixture crews are NPCs controlled by the GM; this is not a connected-player permission test. Capture includes ordinary UI commands, warnings and saved positions. The scripted backend test remains available through the API for regression tests but is not the new window workflow.

**Stop & export** ends the demonstration and requests a partial report. **Restart test** starts a fresh run. Download the prior report first if you want to keep it. Movement failures expose **Resume saved movement** and **Restore initial positions**, preserving the existing recovery semantics rather than blindly repeating an unconfirmed move.

## Fixtures and test coverage

The dedicated `[Test] Arkflight — Three-Round Crew Test` scene contains two level-5 Brigantines:

- `[Crew Test] Dawn Runner`
- `[Crew Test] Night Heron`

Each has five assigned level-5 PF2e NPC Actors: Captain, Engineer, Navigator, Battle Watch and Lifeveil Warden. There are ten named crew in total. Each station has its three actual PF2e skill options, with primary +13, secondary +11 and third +9. Battle Watch's third option is a real Warfare Lore item. Ship level replaces personal NPC level once, so level 5 is not counted twice. NPC source data follows PF2e's `system.skills.<skill>.base` and Lore item `system.mod.value` shapes; prepared native modifiers take precedence when available.

Opening hands contain five cards and later rounds draw one. The demonstration stages straight movement in rounds 1 and 3 and a shared S-curve in round 2. It exercises opening choices, maneuver locks, card queues, all five station checks, delayed DR, Lifeveil responses, firing, separate hit/damage rolls, simultaneous damage, cleanup, journal pages and later-round draws.

Every test battery is explicitly marked as training damage **2d6+4** in encounter state, retaining its production formula for diagnostics. Real d20 and damage dice are evaluated; the test does not secretly force successful checks or refill Hull between rounds. Lower battery damage keeps the three-round exercise observable, including critical hits. This is a functional test, not a production damage-balance measurement. Tests also exercise all-natural-1 and all-natural-20 runs.

Campaign actors, scenes, ship libraries and resource tracks are not selected by name or rewritten. Marked test fixtures are reused on restart; repeated runs do not create ten more crew each time. Test crew are GM-controlled NPCs, so this solo demonstration does not claim to be a connected-player ownership test.

## What debug.txt contains

Capture begins at Start Test. F12 may stay closed. The file contains:

- build, Foundry/PF2e/module versions and active module IDs/versions;
- named crew, levels and each available skill's actual ship-check modifier;
- command requests, resolved backend commands, saved revisions and step labels;
- AP, resources, card zones, prepared effects, batteries, queued shots and real roll results;
- expected and actual native token hexes, facing, pixel coordinates and movement recovery state;
- failed requests with error messages/stacks, browser `console.warn`/`console.error`, uncaught errors and unhandled rejections during capture;
- the final result, step count and per-round journal references.

The recorder preserves a bounded report in this browser's local storage so a page refresh does not erase it. Reopen the macro and use **Download debug.txt** after reconnecting. Storage failures do not abort combat. Common credential fields are redacted. Capture stops/restores console handlers when the run finishes or is stopped.

The file cannot retrieve messages from before Start Test, logs from another browser, or the Foundry server log. It watches the primary GM client's commands and browser errors; it is not a DevTools protocol attachment.

## UI retirement

The earlier card playtest API/UI, old guided-demo UI and old Combat Console frontend are no longer registered in `module.json`. Their auto-open behavior cannot run in a newly restarted Foundry instance. The obsolete alpha dashboard action handlers and its settings/ready launchers were removed. Ship/Crew assignment now lives inside the current dock. One token-HUD launcher opens that dock.

Historical source fixtures and old engine regression tests remain available for existing-data verification; the retired presentation modules/styles are not loaded. The event board, travel, trade and ship-management systems remain separate.

## Validation

916 Node tests pass, including exactly three rounds, ten crew NPCs, stale/double requests, Stop/restart reuse, all-natural-1 and all-natural-20 runs, all crew skills, debug persistence/redaction and text export. Existing movement recovery, ownership, ship libraries and gameplay tests also pass.

A Chromium harness using the actual UI/templates, adapter and combat rules with public-document doubles clicked 86 Next Steps through the exercise, verified 12 fixture actors, three Journal pages, captured a console warning, exported debug text automatically/manually and checked old launch aliases. The guide layout was visually inspected. Live Foundry v14/PF2e, PIXI and Dice So Nice acceptance still depends on the user's run; the exported report is intended to diagnose that environment.
