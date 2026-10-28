# Phase-focused Command Deck

Implemented 28 October 2026 on the existing alpha controller. The redesigned round-flow contract remains a separate pending rules change.

## What to try

1. Open `await game.arkflight.alphaCombat.open();`. The dashboard starts beside the Foundry sidebar, with native movable/resizable window controls.
2. Leave **Follow phases on** to open the appropriate controls as the phase changes. Turn it off to keep your chosen tab. Manually choosing another tab remains possible either way.
3. Click the **Fleet status** disclosure for individual readiness; it starts collapsed. Maneuver templates still preview on the actual canvas and use hull permissions.
4. Open **Cards**. Cards rise on hover/focus and stay raised when selected. Click to inspect; Escape or Close dismisses inspection. Opening mulligan and required discard selections stay in the hand without an obstructing inspector.
5. **Weapons** expands the firing drawer. **Arc / range** uses the existing weapon overlay. Committed batteries appear in a separate tray with their current target and printed formula; AP is already spent by the controller.
6. During a defender response, affordable Instants highlight only for crew allowed to operate their station. Choose one or **Pass response**. The authoritative command still validates every play.
7. Card inspection exposes station skill, actor/source and contribution breakdown, plus expandable four-degree outcomes. Assigned-PC requests still wait for that player; no presentation animation evaluates dice.
8. **Settings → Style → Minimalist** removes decorative shadows and hand overlap. Motion, reduced-motion, sound and volume remain client preferences. Sound starts off; enable **Sound on** to hear the existing authored effects. Draw animations now originate at the deck location.
9. **Fold hand**, **Compact**, **Minimize**, and the separate **Phase tracker** remain available. At narrow widths the hand scrolls horizontally and card inspection becomes one readable rules column.

## Scope

This update does not implement the new opening gate, crew-clicked round draw, all-ship card planning queue, extra Instant timings, new weapon accuracy bands, or recap Journal. It does not change active encounter AP, card zones or hand limits. The displayed hand limit is the actual current profile value. The round-flow contract records the accepted future base-five limit, independent opening/capacity/draw modifiers, and Cleanup overflow policy.

UI inspiration: Slay the Spire's compact hand and enlarged inspection; MTG Arena's selective response pauses; Hearthstone's progressive rules disclosure. Original Arkflight art and controllers are retained. No third-party game artwork is bundled.

Validation: 897 Node tests pass; a Chromium harness using the actual Handlebars template/UI/controller with public-document doubles. The harness checks mulligan selection, phase following, inspection dismissal, weapon expansion and narrow-window overflow. These checks do not replace live Foundry v14 testing with connected players.
