# Alpha command controls

Build: `alpha-command-controls-20261028`. This extends the fitted Vent Strain master; it does not convert the remaining card collection or replace the full ship sheet.

## Phase and waiting tracker

The GM's Build/Start and Reset flows open a separate, movable Fleet Status window. Reopen it with the **Phase tracker** footer button or:

```js
await game.arkflight.alphaCombat.open({tab:"tracker"});
```

It shows the round, overall phases, ship locks, current Card-phase ship, target readiness and the defender/attacker currently needed. During planning it lists which ships still need to lock. Crew names are shown for owned ships; opposing routes and cards are not exposed. The same readiness strip is in the Command Deck. **Open Command Deck / Maneuvers** returns to planning controls.

## Maneuver templates

Select a ship, open **Maneuver**, then click an illustrated legal route. The selection traces its numbered path, occupied hexes and final facing on the actual canvas. Selecting or previewing does not spend AP or submit an order. Click **Stage maneuver**, then **Lock maneuver**. The GM controls opposition ships by selecting them in the ship menu. **Reveal & move fleet** remains unavailable until every living ship locks. A collapsed **List view** retains the native select control.

## Crew and checks

The GM may now assign crew in **Ship / Crew** during planning, Card phase or cleanup. A resolving attack/response, targeting, movement recovery and boarding pause remain protected. Changes affect future checks. Dropdowns include Character and NPC Actors and identify the currently assigned crew. Successful assignments are saved on the alpha ship Actor for the next test.

- No assigned Actor: use the existing NPC ship baseline.
- Assigned Character: selected skill's proficiency and attribute, replacing personal level with ship level; include ship support adjustment.
- Assigned NPC: selected skill's modifier minus NPC level plus ship level, with ship support adjustment. Missing NPC skill/level data produces an explicit message.

The card inspector identifies the acting Actor, selected skill and base modifier. Situation/Morale adjustments are included in the actual receipt. No second personal-level addition. A player still needs Owner access to the ship and assigned Actor; the GM may operate any station.

## Dice So Nice and sound

The evaluated Roll objects are now sent to the optional Dice So Nice adapter for all alpha controller checks and damage, including initiative/impact rolls resolved with movement. Recovered movement is not rolled again. This was previously restricted to Vent Strain. Dice animation failure cannot cancel a saved action or change its result. Settings shows whether the 3D API is available on the local client. Enable Dice So Nice in the world, including the primary GM's client.

Enable **Sound on** in the Command Deck to hear the new command-submit cue: a low impact with a short rising metallic chord, rather than the paper placement sound. Ordinary card inspection still uses paper sounds. The existing volume setting applies; critical failures, Burn cards and weapon results retain their distinct cues.

## Reset and master frame

**Reset encounter** is visible in the footer for the GM. It opens a confirmation panel. Cancel changes nothing. Confirm resets this dedicated alpha test to round 1 with fresh resources/AP and newly dealt hands; ship libraries, selected loadouts and persisted crew remain. Saved incomplete movement must be resolved before reset. This does not reset a campaign encounter.

The painting is clipped to the existing frame's outer contour, removing the exposed artwork outside the copper edge without thinning or shrinking the border. The die has an explicit equal width/height to resist Foundry button themes.

## Validation

890 Node tests pass. New tests cover readiness, Card-phase assignment, reset preservation, assigned NPC arithmetic, ordinary skill/attack/damage dice animation without rerolls and the command sound recipe. Browser checks use the real template/controllers with public-document doubles: route selection, locking/waiting display, crew assignment, reset confirmation/cancel, preview and circular die under a fixed-height button theme. Actual Foundry canvas, multiplayer behavior, Dice So Nice rendering and sound acceptance remain live checks.
