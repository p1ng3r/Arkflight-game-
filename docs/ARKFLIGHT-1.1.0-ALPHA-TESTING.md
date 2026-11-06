# Arkflight phased combat alpha — testing guide

Build: `alpha-command-deck-20261027`. Updated 26 October 2026.

This is an opt-in vertical slice of the new combat rules. It creates marked test Actors, tokens, a hex scene and a native Combat. It preserves campaign ships and the older prototype. The feature branch is not a versioned release or a migration.

## Update the laptop

Close the running world first. In Git Bash:

```bash
cd /c/Users/thep1/AppData/Local/FoundryVTT/Data/modules/arkflight-game
git status --short --branch
git fetch origin
git switch feat/1.1-complication-foundation
git pull --ff-only origin feat/1.1-complication-foundation
npm test
```

On the desktop, use `/c/Users/user/AppData/Local/FoundryVTT/Data/modules/arkflight-game` instead. If Git reports tracked changes or conflicts, stop and preserve them before switching. Do not apply the old patch or run a reset/clean command. Untracked artwork does not need deleting.

Restart Foundry after the update so the manifest loads the new scripts/styles. Open a PF2e world as GM, enable Arkflight and unpause. End any other active encounter before starting this test. The alpha targets Foundry v14; local tests do not establish compatibility with earlier versions.

## Launch and watch three rounds

Create a **Script** macro with:

```js
await game.arkflight.alphaCombat.open();
```

1. Leave the Builder at level 5, Brigantine versus Cutter, two ships. Choose four ships for a second test.
2. Click **Build test fleet and start**. The GM views the dedicated `[Alpha] Arkflight — Ship Combat` scene. Use **View scene** if needed.
3. Read the **Guided test** summary or hover the footer’s **Next Step** button for its next action. Each click performs one real command and waits. There is no automatic advance.
4. Continue through planning, movement, cards, targeting, responses, damage and the next round. The guide can choose enemy actions as well as the party's actions. It uses the same rule controller as manual play.
5. Watch the actual ship tokens move, the AP/resource meters and the Log. A battle can finish before three rounds; use another test rather than forcing it to continue.

The window uses native movable/resizable chrome. **Minimize** folds it; the same macro restores it without advancing the encounter. Movement temporarily folds the window, then restores it. **Tools → End alpha test** ends the encounter; Builder can then create another. Rebuilding resets only marked test fixtures. It refuses to reset a test scene containing unrelated tokens.

## Run a manual round

- **Planning:** select each ship, choose a complete maneuver and inspect its written sequence. **Preview on canvas** draws the route, numbered positions and final heading. The Navigator stages it; the Captain locks it. All ships remain still until the GM clicks **Reveal and move together**. Hold is always available. Initiative is rolled afresh for each round.
- **Movement:** one translation hex is one shared step. Forward 1 → Starboard 60° → Forward 2 takes three translation steps; turning occurs at its printed waypoint. All resolved ships move in the same native batch per step. Capital ships use extra occupied-hex markers, up to three total.
- **Cards:** ships act in initiative order. Click a card to read its outcomes; the raised selection is also used for mulligan/discard. Select crew skills, weapon and any printed movement adjustment, then play it. Click **Weapons**, then a battery’s **Commit shot · 1 AP** button to queue a shot without needing an attack card. **Finish Card phase** preserves unused AP for Instants.
- **Targeting:** declare every queued battery's target before any attack roll. the battery’s **Arc / range** button previews its legal firing area. A broadside is a 90° sector; the fore swivel has a 180° targeting arc. These are single-target batteries, not automatic damage to every token inside an overlay. Hold an unworkable shot rather than spending ammunition.
- **Damage:** the defender may play one eligible Instant or pass for each incoming attack. The attacking crew then rolls. A movement response can invalidate the target; the attacker gets at most one replacement target or holds the shot. Hull damage from all committed attacks is applied together after those rolls, so a ship can fire in the exchange that disables it.
- **Next round:** resolve any complication choice or excess-hand discard, then refresh AP, apply delayed effects and draw one card. Reload N fired in round R is ready at the beginning of R + N; each battery still fires at most once per round unless a future explicit effect says otherwise.

## Polished Command Deck

The framed hand, type bands, interactive deck piles, full card inspector, visible result receipts, paper/card foley, motion/volume controls and compact mode are described in `ARKFLIGHT-1.1.0-COMMAND-DECK-UI.md`. The launch macro is unchanged.

## Permanent libraries and saved decks

The new **Library / Decks** footer button opens ship-owned learned cards and three named loadouts. Owners edit/select decks outside combat; the GM grants/removes knowledge. Existing ships retain their selected deck across encounters. See `ARKFLIGHT-1.1.0-SHIP-LIBRARIES.md` for exact clicks, refit validation, saved-ship launch and acceptance.

## Crew ownership

In **Ship / Crew**, the GM can assign PF2e character Actors to stations during planning. Give the relevant players Owner permission on the party test vehicle and on their own characters. New test vehicles start with no default player ownership. In the Actors directory, use Configure Ownership on the intended ship and grant Owner to its crew only. Existing test ships retain their permissions: review their Default entry and use None if access should be restricted to named players. Players see only ships they own in the HUD selector; opponents remain available as targets. An assigned Navigator sees only the hull’s currently legal maneuvers. Other crew cannot stage or preview maneuvers; the assigned Captain may still lock the staged choice. The GM sees and operates every ship, and alone reveals movement or advances phases.

The Navigator controls staging; the Captain controls locking/finishing; Battle Watch controls basic battery fire/attack rolls. A card's primary station initiates its contribution. Coordinated cards resolve their printed station checks in order as one activation. This alpha does not provide a separate asynchronous confirmation popup for every contributing player. The GM can operate all test ships and use NPC crew baselines if no PC is assigned.

Crew checks offer three station skills. The modifier uses ship level once, plus the selected character's training and attribute; it does not add character level again. Actual rolls and four degrees appear in the latest-result HUD strip and alpha Log. Dice So Nice/native chat roll cards are not part of this slice.

## Current tuning values

| Rule | Alpha value |
| --- | --- |
| Shared pool | 4 AP each round; no RP pool; card costs 1–3 AP |
| Deck and hand | Minimum 15-card deck; opening 5; hand 7 on most hulls, 8 on capitals; one draw in later rounds |
| Copies / Burn | Ordinary cards at most 2; Unique cards at most 1; Burn leaves reshuffles for this encounter |
| Protection | AC, DR and resistance may coexist; no second DR-card play by a ship in the same round; strongest bonus in a category |
| Lifeveil | Pays for chosen defenses; ordinary weapon hits do not automatically deplete it before Hull |
| Supply | 20 test stock; an ordinary fired battery costs 1; repairs consume Supply; Chainshot also needs its limited charges |
| Brigantine, level 5 | Hull 120, AC 22, NPC attack +13, support DC 20; broadside 4d10+8 |
| Cutter, level 5 | Hull 100, AC 23; broadside 4d8+6 |
| Collision at level 5 | 2d10+4 normally, 3d10+6 head-on; each vessel makes a Structure save |

Weapon damage was raised with approval to bring the preserved Hull benchmarks toward 4–6-round fights. `npm run alpha:simulate` reproduces a twelve-seed, rules-only pacing probe. Inspect its range as well as its mean: burst critical hits can end a fight much sooner. One matchup and suggestion policy do not establish balance.

## Saves and complications

Hull, Strain and Lifeveil have ship-held Structure, Engineering and Veil saves. A worsening resource in danger triggers a save after its source resolves: Hull/Lifeveil bands at 50%, 25% and 10%; Strain at 50%, 75% and 90%. Normally save at most once per system per round, with another save if it crosses into a worse band. No further worsening means no new save. The level-5 DCs are 20/22/24. Low Morale applies −1 to crew checks at 50% or less and −2 at 25% or less; it does not penalize ship-held saves or stack with a stronger complication penalty.

A system failure gives a short −1 setback to its next matching check. A critical failure instead draws from the shared 24-card Complication deck: Structure uses Impact, Engineering uses Engineer, Veil uses Veil Warden. Critical card/weapon failures use their corresponding station entry. There is no extra fixed critical-failure kicker and no recursive complication draw. A collision's Structure save covers that impact rather than immediately rolling a second Structure save for the same damage.

For ship-to-ship collision priority, compare save degree, then total. The winner continues its route; the loser stops and is displaced to a safe neighboring hex only when needed to clear the route. An exact tie or no safe displacement stops both. No occupied footprints overlap. Different-time crossings are not collisions. Surviving alongside contact can enable the AP-costing **Secure Boarding Lines** card. After success, the GM can pause the ship battle for an existing prepared PF2e deck scene and return without resetting it. Character/enemy placement and the character encounter use normal Foundry tools.

## Acceptance checklist

1. Complete a two-ship battle and record rounds, burst damage and any dead turns. Repeat with four ships and a poor opening hand.
2. Stage an early versus late bank; lock both sides; verify no movement happens before reveal and reopening does not advance play.
3. Test a two/three-hex hull, a same-step collision, a head-on crossing and blocked displacement. Verify final actual hexes and facings match the Log/diagnostics.
4. Play an AC effect plus next-round Brace plus a Lifeveil defense. Confirm their timing and that a second DR card is rejected.
5. Test a coordinated card, Burn, hand overflow, reload, depleted Supply, an Instant movement invalidating a target, and a held shot spending no ammunition.
6. Have a player stage/lock/play their assigned station. Reload/reopen on both clients and verify saved state.
7. On a movement failure, use **Resume saved movement** to finish the already-resolved intent or **Restore initial poses** to return to the pre-move snapshot. The journal preserves rolls and AP; do not repeatedly rebuild the fleet to conceal a failure.

Use **Log → Copy alpha diagnostic report** after a failure. It includes build, phase, revision, recovery step and actual/expected poses. If clipboard access is unavailable, copy the visible text area. Also include the browser-console error and the last button clicked. There is no need to paste private character data or your whole world.

## Still to build or prove

The test catalog has 10 hulls, 21 combat cards, 6 upgrades and 6 talents. It is not the promised complete 75-card production collection. Ship-owned libraries, three saved decks, GM grant/remove tools and a basic alpha profile/refit editor are implemented. Automatic acquisition/loot, a complete refit/level-up workflow, campaign migration, production sheet, onboarding and cross-pillar effect consumers remain work. Cargo Bulk and travel/trade/event capabilities are recorded on the alpha profile; they do not yet change the existing event/travel systems. Weapon equipment/loadout expansion and the full reaction/Instant catalog also remain work.

Local Node tests and a browser using mocked public documents exercise the rules, UI and recovery contracts. They do not prove native movement with this world's modules, reconnect behavior or encounter balance. This build does not establish that the old guided-demo rollback was fixed. Test the new alpha separately before replacing campaign combat.
