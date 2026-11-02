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
