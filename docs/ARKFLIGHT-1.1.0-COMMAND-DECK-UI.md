# Arkflight Command Deck — polished alpha UI

Build: `alpha-command-deck-20261027`. This increment polishes the tested alpha interface; it does not replace the combat economy or rewrite acquired libraries.

## Open and arrange it

Update `feat/1.1-complication-foundation`, restart Foundry so the new stylesheet loads, and run the existing Script macro:

```js
await game.arkflight.alphaCombat.open();
```

The native window opens clear of the left tools, visible right sidebar and bottom hotbar when room permits. Drag its title bar or resize it using Foundry's native controls. **Compact** folds it into a command strip; **Expand** restores its height. **Minimize** uses the native minimized window, and the same macro restores it. **Fold hand** hides only the hand while preserving its cards. All of these controls are cosmetic; they do not advance the encounter.

## The card table

The header shows the round, selected owned ship and current phase. The phase rail tracks Plan/Move → Cards → Targets → Damage → Cleanup. AP pips and resource bars remain visible above the table. Player ownership, Navigator permissions and GM-only fleet/phase controls are preserved.

The hand uses illustrated card faces with colored top bands and a large AP cost:

| Band | Timing |
| --- | --- |
| Teal — Standard | Play during the ship's Card phase |
| Blue — Instant | Play in its legal incoming-attack window |
| Violet — Prepared | Schedules an effect for a later round |
| Gold — Burn | Leaves reshuffles for this encounter |

Click a card to raise it and open its full inspector. The inspector shows its printed rules, four outcomes, station/skill choices and any required battery, target or movement adjustment. **Play [name] · N AP** uses the existing rule controller. An unavailable card explains the common phase, station, AP or resource requirement. The server remains authoritative, including complication restrictions.

**Close** or Escape dismisses the inspector. Mulligan/discard selections are preserved when their selection window requires them. The opening mulligan allows up to two cards; excess-hand discard requires the exact count. A normal card inspection/close does not spend AP. When the hand is wider than the window, scroll the hand horizontally.

## Deck piles

- **Draw:** remaining count and a card back. Its order stays hidden; clicking does not draw.
- **Discard:** inspect already-used cards eligible for a future reshuffle.
- **Prepared:** inspect scheduled cards.
- **Burned:** inspect cards removed from this encounter's reshuffles. Permanent knowledge remains intact.
- **Complications:** shared deck count and the most recently revealed contextual entry, if any. Clicking never draws a Complication.

Card-deal and played-card animations follow actual saved changes. They never generate rolls, change hand contents or advance a cooldown. Opening/reopening the window establishes a new visual baseline instead of replaying old results.

## Weapons and results

In **Cards**, click **Weapons** to jump to the battery tiles. Each tile displays its mount, arc, damage formula, range and Ready/Committed/Reload status. Click its **Arc / range** button for the canvas overlay, or **Commit shot · 1 AP** to queue that specific battery. This is a basic action and needs no card. A different Captain can still control Finish Card phase while the assigned Battle Watch commits weapons.

Choose gunnery skill under **Gunnery skill & weapon help**. After all ships finish their Card phase, the **Maneuver / Targets** view lets each crew declare its firing solutions; the GM locks the exchange. In a response window the defender plays an eligible Instant or passes, then the attacking Battle Watch uses **Roll attack & damage**. Damage rolls occur only on hits. No extra activation roll was added to basic firing.

The latest-result strip exposes the real authoritative skill/save/attack result or damage total. Expand **Details** for the d20 face, modifier, total, DC, degree, damage formula, critical multiplier and mitigation. Damage is labeled queued while awaiting the simultaneous exchange and resolved afterward. The Log remains available. These HUD faces and animations are presentation of actual results, not additional dice rolls. Native chat roll cards and Dice So Nice integration remain separate work.

**Next Step** remains in the footer for the guided test, one real command per click. **Tools** contains View scene, Clear preview and End alpha test. At cleanup, **Start next round** is prominent above the results.

## Motion and sound

Click the header’s **Sound off** button to enable this browser’s audio; its label becomes **Sound on**. Sound defaults off. Card selection, fan/deal, placement and closing use the repository's bundled licensed paper/card recordings; cannon, impact, ward and critical-result accents use its existing audio engine. No remote audio service is required.

**Settings** provides Full/Subtle/Off motion and a volume slider. Preferences are client-local. OS reduced motion overrides Full/Subtle. Results stay readable with motion disabled. Sound can remain enabled independently. Muting, minimizing, closing and hiding the browser stop pending audio; closing/minimizing clears the app's temporary effects. Failed audio loading or a browser autoplay restriction never blocks a command.

## Library polish

**Library / Decks** opens the saved library with three deck-back loadout tabs and a framed card gallery. Type bands, AP badges, art and four-outcome inspection match the combat hand. Use plus/minus or the number field to adjust copies; **Loadout name & settings** holds renaming and the alternate dropdown. Save/select/grant/remove rules, stale-draft protection, refit validation and learned-only player visibility are unchanged. See `ARKFLIGHT-1.1.0-SHIP-LIBRARIES.md` for persistence behavior.

## Live check

1. Confirm the hand is visible without a large inspector open; inspect a card and dismiss it using Close and Escape.
2. Try Sound on, volume, mute, Subtle/Off and OS reduced motion. Confirm the results remain readable.
3. Open every pile. Confirm Draw/Complications do not draw and the encounter revision remains unchanged.
4. Commit Starboard Broadside from its own tile, declare its target later, and inspect the actual attack/damage receipt.
5. Run the guided test through several rounds. Confirm AP, reload, card zones and permissions behave as in the passed alpha.
6. Compact/expand, fold/show hand, minimize/restore, drag/resize and reopen. Confirm no old roll, animation or sound replays.

Local verification includes rules/presentation isolation and the real templates/styles/controllers in Chromium with mocked public Foundry documents. It exercises actual Web Animations, requests all eight bundled foley files and starts audio sources. Native Foundry chrome, audible levels, module interactions and multiplayer timing still require the live check above.
