# Vent Strain master card

Build: `alpha-vent-fitted-20261028`. First-card acceptance pass, not a full HUD rebuild or complete deck conversion.

## View without starting or changing combat

After pulling the feature branch, restart Foundry so the added stylesheet loads. Run this Script macro:

```js
await game.arkflight.alphaCombat.open({tab:"forge"});
```

The Card Forge tab and macro open a separate compact portrait window with no combat dashboard. It fits the full card and die medallion within the viewport, retains native dragging/close, and includes a Minimize control. The die button is disabled in this preview. It does not draw, spend AP, generate test ships or change an encounter. Click **Four outcomes** to turn to the details face, then **Back to art**. Long rules scroll within this face without stretching the card or hiding its die.

## Play in the existing alpha

1. Open the normal alpha window and enter the ship's Card phase.
2. Open **Cards** and click **Vent Strain** when it is in that ship's hand; the portrait opens separately. Its appearance in the opening hand is random; preview mode does not inject it.
3. The owning Engineer selects Crafting, Arcana or Thievery. The GM may operate any station. Existing unassigned-station/NPC crew permissions remain unchanged.
4. Click the circular **d20** medallion, labeled **PLAY & ROLL · 1 AP**, on the illustrated card. This one command commits the card and rolls the normal check and Strain relief; there is no extra activation roll or separate confirmation.
5. The card turns to the saved result: actual d20, each component of the modifier, total, DC and degree of success. The resolved card remains displayed after moving to Discard and cannot be played again from that receipt.

Bonus components show ship level, crew proficiency, crew attribute and ship support adjustment for assigned PC crew; unassigned NPC crew shows the ship baseline. Existing strongest-only Morale/Complication handling remains intact. No balance values changed.

Dice So Nice uses the evaluated Roll objects after the action has saved, via `animateRoll` when present or the documented synchronized `showForRoll` fallback. No second roll and no extra chat message are created. Missing, disabled or failing 3D dice cannot cancel a saved action. Only Vent Strain uses this new animation integration in this first-card pass.

## Verification

885 Node tests pass. Public-document browser doubles verify the real Handlebars template/controller, read-only preview, actual play/receipt flow, station gate, optional dice integration and four viewport sizes, including 1366×768 and 900×600 laptop spaces and 320/390px widths. Full frame, die and hint remain in view. These are not live Foundry acceptance. Real Foundry/PF2e rendering, Dice So Nice appearance and multiplayer visibility still need the user's live test.

A recycled Vent Strain instance uses its new hand state instead of displaying an old receipt. The preview remains read-only even while a combat is active.

Next: approve this master in Foundry, then build the Battle Watch and Lifeveil Warden frames. The complete deck, overall HUD layout and Card Forge authoring automation are later work.
