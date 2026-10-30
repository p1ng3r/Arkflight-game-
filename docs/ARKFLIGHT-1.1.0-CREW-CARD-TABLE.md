# Crew card table — playable alpha

For the current three-round test and debug export, see [Guided crew test](ARKFLIGHT-1.1.0-GUIDED-CREW-TEST.md). Older combat launchers have been retired; Ship/Crew now opens inside the current dock.

Implemented 28 October 2026. This is the new encounter protocol (`roundFlow: 2`), separate from earlier saved alpha battles.

## Update and launch

Pull `feat/1.1-complication-foundation` in the installed `arkflight-game` module folder. Restart Foundry and refresh every connected browser because the module adds new scripts, styles and templates.

Use a Script macro:

```js
await game.arkflight.alphaCombat.open();
```

An older saved battle shows **Reset into new round flow**. The GM confirms the reset; libraries, loadouts and assigned crew are retained, while round, AP, hands and resources restart. The earlier flow is not silently migrated midway through combat. Without an encounter, choose hulls, level and two/four ships, then **Build test fleet**.

The new bottom hand dock, separate phase tracker and portrait card are native movable, resizable, minimizable windows. Their chrome supplies dragging and resizing. The command header's **−** minimizes the dock; the tracker’s **Open hand** restores it.

## One round, exact controls

1. **Opening:** each ship has one shared opening hand (base five). Click up to two cards to raise them, then **Keep / replace selected**. Keep zero to retain everything. GM chooses NPC ships in the ship selector. All ships finish before Maneuver. Replacements are drawn before returned instances rejoin the deck.
2. **Maneuver:** choose a legal hull template to preview it on the real canvas, **Stage**, then **Lock maneuver**. Only assigned Navigators stage and Captains lock; GM operates NPCs. Once all living ships lock, the primary GM receives Yes/No with connected/offline users. No waits; **Reveal & move fleet** reopens confirmation. Yes uses the confirmed-movement journal and retains recovery safeguards.
3. **Plan cards:** click a card for its portrait. Choose a battery or movement option when applicable, then **Commit**. AP is spent once now, not again on the later roll. Cards remain visibly committed in hand and enter the ordered tray. Arrow buttons reorder; × removes/refunds before lock. **Lock plan / keep remaining cards** is valid with no cards. All ships lock before any planned ability resolves. Normal shots and Instants still need remaining AP.
4. **Station rolls:** ships resolve their queued cards in round initiative order. Assigned PCs automatically receive their own pending skill-choice/d20 prompt; GM does not have to trigger their request. Select one of the station's three skills and click the die. NPC/ship baseline checks use the same portrait via **Open station card / Roll**. Crew, ship and applicable modifier components/DC are shown. Dice So Nice animates the evaluated rolls when available. Chat records results. An invalidated card may be skipped by its Captain; paid AP remains spent. Finish any pending Complication or explicit card discard before continuing.
5. **Firing:** during your ship's turn, inspect **Show arc / bands**, **Commit shot · 1 AP**, then choose a legal target. Authored weapon cards already include their own shot, visibly listed with no second AP charge. **Resolve this ship’s firing / hold fire** starts its exchange. Defender chooses an eligible highlighted Instant or **Pass response**. Empty/unaffordable response hands are automatically passed. Assigned PC Battle Watch receives a skill/d20 prompt automatically once the response is complete; GM handles NPCs. Hit and damage are separate steps: **Resolve damage & mitigation** uses the saved attack die, never rerolls it. Current authored Instants are pre-attack Shield Pulse and Emergency Helm; this update does not invent post-hit uses for them.
6. **Cleanup and recap:** all firing Hull damage applies as a completed simultaneous exchange. Token feedback shows raw, prevented and Hull damage. Select/discard overflow down to effective capacity (base five). The recap popup and dock show a fact-based narrative plus exact round record. A Journal page is saved once per encounter/round, with ID and open button. Failure leaves the recap in encounter state; **Save / retry journal** retries without replaying combat.
7. **Next round:** GM clicks **Start next round**. AP refreshes and prepared effects activate. Each owning crew clicks its highlighted deck for its scheduled draw (base one, free); GM draws for NPCs. A persisted entitlement prevents repeat clicks/reconnects from drawing again. Drawing while full is allowed; excess is discarded at Cleanup. Once every living ship draws, Maneuver begins. No repeat mulligan.

## Cards, canvas and settings

The dock displays hand count/limit, deck/discard, AP and ship resource values. Card bands distinguish Standard, Instant, Prepared and Burn; their hover text explains timing. Hover/focus raises cards; click opens art, rules and outcomes. A committed card cannot be discarded or committed twice. Enemy plans and commitment logs are omitted from player API snapshots before recap; only owned ships expose hand instances. Server ownership/assigned-station checks apply regardless of visible controls.

During planning, **Inspect weapon arcs / range bands** costs nothing. New-flow range increments start at two hexes: green 1–2 has no penalty, amber 3–4 is −2 accuracy, red 5+ is −4 within the weapon's existing maximum. Labels supplement color; legal target choices show distance and penalty. Old saved battles retain their earlier accuracy rules. Hull routes, footprints, collisions, reload and supply/ammo rules remain active.

**⚙** opens sound, volume, motion, Illustrated/Minimalist, Ship/Crew, Library/Decks, tracker and Reset. Sound starts off. Reduced-motion is respected. Full motion includes card/deck effects and canvas damage feedback. Existing original Arkflight artwork is retained; no other game's artwork is bundled. Ship/Crew and the library still use their existing management windows.

## Validation and limits

907 Node tests pass. New cases cover opening/draw gates, AP reservation, ordering, split hit/damage, movement replay prevention, four ships over three rounds, cleanup overflow, authenticated PC rolls/reset, private plan projection, and journal retry/deduplication.

A Chromium harness runs the actual templates, UI classes, Foundry adapter and combat rules against public-document doubles. It clicks through opening, GM No/Yes, planning, station skill/d20, firing/response, saved hit, damage, Journal creation, next-round deck clicks and a 500px dock. Reference screenshots were inspected for card and dock layout. These checks do not claim acceptance in a live Foundry v14 world with multiple connected users, third-party modules, PIXI or Dice So Nice. That live test is the next validation step.
