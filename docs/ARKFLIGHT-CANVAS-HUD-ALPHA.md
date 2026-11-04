> Arc controls build: `alpha-arc-toggle-20261103`. Each battery preview is a toggle: click again to clear, or choose another battery to replace it. Active buttons show Hide and an ARIA pressed state. Weapon controls stay inside their rows and the tucked deck stack fits below the crew rail.

> Firing controls follow-up: `alpha-visible-firing-20261103`. Weapons scroll above a persistent **Hold fire / Finish firing** footer. The HUD focuses the active owned firing ship; unavailable firing solutions are labelled and cannot spend AP. Pending Complications open an owner/GM choice window with a HUD reopen reminder. This update resumes existing encounters; no reset is required.

> Movement follow-up build: `alpha-independent-routes-20261102`. Choose a fresh template for each ship each round; prior-round local choices no longer carry over. The fleet confirmation lists each ship’s saved route and instructions. Debug exports include the authoritative plan/lock maps.

# Canvas command HUD and 20-card starter

Build: `alpha-canvas-hud-20261102`. Branch: `feat/1.1-complication-foundation`.

The current crew table now opens as a transparent canvas HUD. It uses the existing Foundry scene, tokens, movement journal, crew ownership checks, chat receipts and Dice So Nice adapter. It does not replace the canvas or render fake token movement.

## Update and start

```bash
cd /c/Users/thep1/AppData/Local/FoundryVTT/Data/modules/arkflight-game
git fetch origin
git switch feat/1.1-complication-foundation
git pull --ff-only origin feat/1.1-complication-foundation
```

Restart Foundry (a new stylesheet is registered in the manifest), refresh clients, and run:

```js
await game.arkflight.alphaCombat.guided.open();
```

Click Restart test for two level-5 ships and ten assigned NPC crew. Dawn Runner opens with Fresh Orders, Chart the Possibilities, Tune the Capacitors, Exploit the Opening and Shield Pulse; Night Heron opens with Brace, Acquire Target, Evasive Course, Vent Strain and Shield Pulse. Later draws include recovery. Try Tune → Exploit → a normal battery shot to exercise the cross-station combination. The three-round guide remains manual: use the real UI and download debug.txt at the end. Open the HUD directly with `await game.arkflight.alphaCombat.open()`.

## HUD controls

- Top: current phase, round and per-ship readiness. Initiative is rerolled when the fleet moves; it is not a movement-success roll.
- Right: ship selector, **Ship Sheet**, AP, **Audio ON/OFF**, resources, and permanent **Fire Weapon** access. The ship panel scrolls on short displays. The gear includes crew assignments, library/decks, debug export and test controls.
- Above the hand: five crew portraits with station/name tooltips. Click to open that Actor's PF2e sheet. A pending player contribution highlights its station. Foundry sheet permissions remain in force.
- Left, maneuver phase only: the ship's available route templates. Click one for the real canvas preview, then stage/lock it. GM confirms fleet movement after all surviving ships lock. Choices remain separate per ship.
- Bottom: five-card hand, AP costs, readable base effects, illustrated draw deck, discard count and overflow. The hand tucks during movement/firing; clicking a card opens its full rules. Deck drawing remains a deliberate click in the round draw step.
- Resolution: open the current station card, choose a skill and roll. For a normal weapon shot use **Battle Watch · choose skill / roll** to inspect the full bonus before the attack; damage uses the saved hit.
- **Hide HUD** leaves a **Show Arkflight HUD** tab; empty space passes clicks through to the battlefield. Encounter completion hides the HUD; reopen it to review the recap. Native Foundry dialogs and sheets remain available.

The HUD auto-opens for an active current-flow encounter. The old separate tracker is integrated into its top bar; legacy launcher macros open this same HUD. Library, guided-test and enlarged-card dialogs remain separate purposeful windows.

## Deck and new effects

Fresh ships start with a 20-card deck; opening hand/normal hand capacity remain five. Level progression still changes maximum deck capacity. Existing Actor libraries and saved encounters are preserved, including previously legal 15-card decks. They are not silently rewritten. To use the new starter on a permanent ship, grant its missing cards and edit its loadout outside combat. Dedicated test fixtures use 20 instances without modifying a campaign library.

| Card | Station | AP | Base effect | Critical success |
|---|---|---:|---|---|
| Fresh Orders | Captain | 1 | Draw two | Draw three |
| Chart the Possibilities | Navigator | 1 | Look at three, keep one, put others on bottom | Look at four |
| Recover the Plan | Captain | 1 | Choose an eligible discarded card and return it to hand | Also draw one |
| Tune the Capacitors | Engineer | 1 | Gain one Strain, draw one, charge next battery hit for +1d6 this round | Charge is +1d8 |
| Exploit the Opening | Battle Watch | 1 | Draw one; next attack +1 accuracy; if charged, next hit adds another +1d6 | +2 accuracy and linked +1d8 |

Failure preserves base support effects with the existing station setback. Critical failure preserves the base effect and draws its station Complication. Charges use the strongest same-kind benefit, survive a miss, are consumed on a hit, and expire at round end. Effects that forbid bonus weapon damage also forbid charge dice.

Draw/filter/recovery cards conserve individual instances. Offered filter cards are held outside the hand until the owner chooses; unchosen cards go to the bottom. Other crews cannot see or select those offers. Burned cards cannot be recovered or reshuffled.

A Standard newly drawn during resolution can join the current ship's plan if AP remains. The HUD pauses for an additional-order window: inspect/commit any offered new Standards, then **Lock plan / keep remaining cards**. This does not reopen older uncommitted cards, and an instance already played this round cannot be played again until a later round. Instants remain in hand for their legal response window. Overflow is discarded at Cleanup; an explicitly printed draw-and-discard effect still requires its printed discard.

## Hull maneuvers

Fresh current-flow profiles receive ten curated starting routes. Handling/speed changes their menus; slow hulls have cautious banks and a 1-AP astern template. Reverse travel is explicit and does not add a free facing change. Responsive Helm and Void Runner can unlock additional pivot templates. New equipment/talents can add maneuver IDs through authored `maneuvers` entries. Restrictions, ship footprints, AP costs and collision checks still apply. Prior saved profiles retain their earlier catalog until reset.

## Validation scope

Validation: **926 Node tests passed**. A Chromium walkthrough passed sheet access, canvas click-through, independent route selection, phase-specific menus, card commitment, station skill rolls, targeting, a chosen Battle Watch skill and saved-hit damage.

Node regressions cover the starter, instance conservation, choice escrow, forged/foreign selections, overflow, follow-up AP spending, recovery, charge consumption and all hull menus. Browser tests use actual templates/controllers with public-document doubles: sheet buttons, transparent battlefield clicks, independent routes, ten templates, hide/show and phase transitions. These are not a substitute for live Foundry v14/PF2e multiplayer acceptance. Audio is opt-in through the visible switch; reduced-motion and volume preferences remain honored. All new raster artwork is WebP at quality 75.


## Ornate HUD build: alpha-ornate-hud-20261103
Brass panel frames, illustrated card faces, a fanned hand, AP medallion and segmented resource gauges replace the plain presentation. Show crew / Hide crew is beside Hide HUD at the top right. Crew opens in the right panel and each portrait opens its character sheet. Visibility is saved per client; the strip starts hidden.

Six new illustrations use WebP quality 75 and a mix of men and women. Dedicated blank Arkflight test scenes receive a starfield; campaign scenes and existing background art are preserved. Restart Foundry to load the new manifest stylesheet, then hard refresh each client. No encounter reset is required. The visible build stamp identifies the loaded version.

Validation: 930 automated tests pass. Browser harness checks cover crew visibility and sheet access, loaded art, resource gauges, canvas clicks, maneuver locking and a reachable firing footer at laptop size. The preview is a browser harness rendering of the actual HUD templates, not a live Foundry screenshot. Live Foundry visual acceptance remains to be checked.

## Decision controls — alpha-hud-decisions-20261104

### What changed

- Firing batteries show only legal opposing targets, distance and range modifier. Select a target before **Commit shot · 1 AP**. This commits the existing fire command and then assigns the target with the existing authoritative target command. If a concurrent change rejects target assignment after commitment, the shot remains in firing orders and the error directs the crew to choose a target or Hold shot. It does not spend AP twice or pretend to refund the committed shot.
- The target summary shows base battery damage. Card modifiers and the selected Battle Watch skill still resolve through the enlarged action card; the preview does not present a guessed final modifier.
- Incoming fire focuses the owned defending ship once per attack. Its response panel keeps attacker, defender, weapon and base damage visible, with affordable station-owned Instant choices and **Pass · keep cards and AP**. Clicking Respond opens the existing skill/roll card; it does not roll or spend automatically. Current alpha response timing rules remain unchanged.
- Complications use one central framed choice card. The bottom duplicate choices were removed. A prominent reminder reopens the card if closed. Ownership and server validation still control resolution.
- **Ship tools → Choose ship art** opens a searchable 20-image picker. It saves portrait/prototype art and the current selected ship's primary token texture. It preserves resources, rotation, footprint markers and combat revision. Existing custom art is not replaced until Apply is clicked.
- **Ship tools → Browse combat deck**, or **Browse piles** beside the deck, opens Draw, Discard, Prepared and Burned piles. Draw contents and order remain hidden, including for the GM in this browser. The browser is read-only and rechecks ship ownership.
- Active and prepared effects can be expanded beside ship resources; the recap includes recent evaluated exchanges and the existing full narrative/journal record. Maneuver thumbnails, facing arrows and legal hull restrictions remain in place.
- **Ship tools → Ship setup / loadouts** groups the existing ship library into Hull & fittings, Combat deck, Crew & weapons, and Review. It edits existing alpha ships using existing saved-profile and loadout validation. It is not a replacement for the initial fleet generator. Refit/deck edits remain locked during combat. Native sheet equipment is not automatically translated into alpha batteries; the Crew & weapons step states this explicitly.
- **Ship tools → How to play** opens dismissible phase instructions. Ship and crew sheets remain accessible.

### Manual acceptance test

1. Hard refresh. Confirm build `alpha-hud-decisions-20261104` on the phase bar.
2. Open Ship tools, choose ship art, filter Grelkin, Apply a token. Verify the current primary token and future prototype image change while AP, facing and resources do not.
3. Open Browse combat deck. Draw shows only its count; Discard/Prepared/Burned show their visible card rules. Close the browser and resume combat.
4. During Firing, show an arc, select a listed legal target and commit one shot. Verify AP decreases by one, the target is already assigned, and Hold fire / Finish firing stays reachable.
5. Finish firing. On the defending client, choose Respond or Pass. If responding, choose the assigned station's skill and click its roll button. Confirm Dice So Nice/chat through the existing roll pipeline. An unassigned player must not gain station control.
6. Trigger a choice complication in the guided test. Choose one consequence in the central card. If closed, reopen from the reminder. Verify no duplicate bottom choice row is present.
7. Open Ship setup / loadouts during combat. Profile/deck editing must be disabled. Review remains readable. Outside combat, use the existing Save profile/refit and Save loadout actions, then inspect Review for warnings.
8. Complete three rounds and inspect the narrative recap, recent exchanges and journal. Download the guided test's debug.txt if anything fails.

Validation: 931 Node tests pass. A browser harness using actual templates/controllers checked the 20-art picker, filtering/application, hidden draw pile, legal target selection and commitment, manual response, setup navigation and combat edit locks at 1280×800. This is not live Foundry acceptance; native canvas overlays, multiplayer permissions, Dice So Nice and actor sheets still need the in-world walkthrough above. The accompanying preview is browser-rendered with a placeholder canvas/sidebar.


## Collapsible panels — alpha-collapsible-hud-20261104

The small panel toolbar independently toggles **Phases**, **Ship**, **Cards**, and **Orders**. Minus means minimize; plus means restore. **Focus canvas** folds all four; **Restore all** opens them again. Preferences are stored per client and remain across phase changes, reopening and reloads. They do not spend AP or modify encounter state. The ship header's minus now minimizes only the ship panel. Hide HUD remains the separate whole-HUD control.

Orders covers maneuver selection, card planning, firing, crew assignment and recap panels. Pending station-roll prompts, Instant response controls, required discards/card choices and the complication reminder are not part of this optional group. Separate enlarged roll/complication windows remain usable. Restore Cards before selecting cards for a mulligan or discard. Crew visibility remains controlled by Show crew / Hide crew.

When Phases is folded, a small summary keeps round, phase and available AP visible. Hiding Cards frees more vertical space for firing and maneuver controls.

Validation: 931 automated tests pass; focused integration checks cover remembered preferences, individual toggles, Focus/Restore, the header minus and unchanged combat revision. A 1280×800 browser harness exercised all four hide/restore controls, reload persistence, canvas clicks and visible pending responses in Focus mode. Native Foundry verification remains to be performed.

To test: hard refresh, confirm the build stamp, click each minus and plus, try Focus canvas, reload, then Restore all. During an incoming attack, Focus canvas must retain Respond / Pass.


## Automated in-world test — alpha-auto-test-20261104

GM macro: `await game.arkflight.alphaCombat.guided.open();`

Click **Run automated 3-round test**, confirm creation of the dedicated test encounter, and unpause Foundry. The runner creates/reuses the marked two-ship/ten-crew training fixture and advances the authoritative guided commands about every 1.2 seconds. It exercises movement, AP, cards, PF2e crew checks, attacks, damage, conditions/choices and the three round journals. Recap popups are suppressed while auto-running; the recaps and journals remain saved. This is an in-world engine test, not a synthetic click test of every UI control. The manual walkthrough remains available through Create ships & start test.

**Pause after this action** lets the current command settle, then pauses without changing the encounter or rerolling. **Resume automated test** continues from saved state. **Stop & export** stops scheduling, lets the current command finish, stops the guided encounter and downloads the report. Foundry pause or pending movement recovery pauses the runner. Resolve the cause before Resume. A command error, mismatched token pose or no-progress result stops automation rather than retrying. A 400-action limit catches a stuck planner. Reloading does not silently resume automation; reopen the test window and Resume explicitly.

Completion and failures request the existing debug.txt download. If the browser blocks it, use Download debug.txt. The report includes real evaluated rolls, AP/resources, expected/actual token poses, module versions and warnings/errors captured after test start. It does not retrieve past F12 messages or server logs. Existing campaign actors are untouched; starting the fixture replaces the current alpha test encounter after confirmation.

Validation: 934 automated tests pass. The new runner tests execute three real controller rounds against public Foundry document doubles and verify evaluated rolls, moves, journals and report contents; pause/resume, manual-test/GM guards, recovery pause and single-attempt failure behavior are covered. This has not been executed in the user's live Foundry world.
