# Arkflight Four-Beat Combat — isolated playable experiment

**Branch:** `experiment/four-beat-combat-ui-20261106`

The existing `feat/1.1-complication-foundation` branch is frozen for this experiment and has **not been merged, rewritten or reset**. This branch reuses native ship/token/hex movement, 20-card starter/decks, AP, PF2e manual crew rolls, Attack/Instant cards, sounds, complications and damage exchange from the already-tested Foundry v14 alpha. A manual battle newly started from the Arkflight HUD opts into `experience: "four-beat"`, `roundFlow: 2` and `combatFlow: 3`. Older encounters and guided fixtures remain unchanged.

## The four player-facing steps

### 1 — Maneuver

Show five recommended maneuvers and put the others under **All maneuvers**. Hovering or keyboard-focusing an option previews that exact legal route on the map; clicking selects it, Stage sends the route to GM authority, and Lock commits it. Route secrecy and existing five-second fleet movement countdown remain. **Navigator is the fifth-station contribution**: choosing a route adds no separate station action or dice roll; specially priced hull routes still use their printed maneuver AP costs. If the player owns the ship but not the assigned Navigator, explain the permission issue instead of claiming there are zero legal routes.

### 2 — Strategy

After movement, from round two onward two cards fly from the deck to a shared reveal. Online controllers of that ship can click Ready, otherwise a 12-second authoritative AFK timeout releases the cards. The shared ship hand and 4 base AP remain; the crew can spend AP on cards or save it for guns and Instants. A free one-card cycle may be used once each round. Card illustration/category labels, hover lift and Instant glow are reused.

**New experimental zero-AP crew signals (one per station each Strategy; no separate die roll):**

| Station | Choice | Effect |
| --- | --- | --- |
| Captain | Focus Guns | +1 on first Battle Watch check |
| Captain | Shield Wall | +1 on first Lifeveil Warden check |
| Engineer | Calibrate | +1 on first Engineer check |
| Engineer | Vent Heat | Immediately remove 1 Strain |
| Battle Watch | Mark Target | +1 on first gun check against the designated enemy |
| Lifeveil Warden | Brace Veil | Reduce first positive incoming Hull hit by 1 |
| Lifeveil Warden | Attune Veil | +1 on first Lifeveil Warden check |
| Navigator | Choose hull route | No extra contribution action or roll; special routes retain their printed AP cost |

All free calls are **optional** and cannot be repeated within a round. Their benefits use existing PF2e skill rolls and attack resolution; they never add a second roll or spend AP. Station Actor ownership is enforced in the GM relay. The free-signal bonus may stack with a second distinct station's +1 in appropriate circumstances; that is deliberately visible and should be evaluated in playtesting before balancing.

### 3 — Resolve

Existing committed card queue, station-specific player roll requests, three PF2e skills per station, four success degrees, normal 1 AP weapons, Attack card guns, paid Instants, after-hit damage and simultaneous application of the exchange remain. The four-beat phase rail highlights **Resolve** through card execution, firing, reactions, attack rolls and damage. Existing visuals/audio produce flashes, impact effects and glowing Instant cards. No automatic PF2e player rolls have been introduced.

### 4 — Recover

Keep the existing scripted combat log/journal, ship resource effects, hand overflow handling, saved damage results, and GM next-round control, now under one **Recover** step. Prepared effects, reload times, AP replenishment, and crew free signals reset on the round transition.

## Playtest instructions (native Foundry still required)

1. Preserve untracked images/manifests. In your existing Codex project check `git status --short` before switching anything; **don't clean, reset, or overwrite files**.
2. Fetch the experimental branch from GitHub. Only switch the live Foundry module folder if Git confirms no untracked-file collisions. Reopen/hard-refresh GM and player clients after switching.
3. Verify `game.arkflight.alphaCombat.build` is `four-beat-prototype-20261106`.
4. In the GM's Arkflight HUD, expand **⚙ Command settings** and click **Start Four-Beat Prototype**. Confirm the restart; the new encounter uses the saved fleet and does not overwrite the old rules branch. For a world with no active encounter, use **Build test fleet**. Do **not** run the old three-round guided test. Verify `game.arkflight.alphaCombat.state()?.experience === "four-beat"` in GM.
5. Opening: keep or mulligan up to two cards. Check the four-step rail; navigator ownership must be set (GM Ship/Crew → assign actual PC or Ship baseline) or the player receives an explanatory message.
6. Hover the suggested route options for map previews. Stage and lock from the player, lock NPC/GM ship. Verify secret lock indication and five-second auto movement.
7. Round 1 Strategy: click different free crew signals. Verify 0 AP cost, no dice roll, one call per station only, and that a subsequent actual PF2e card/gun roll includes its bonus. Confirm Engineer Vent Heat removes exactly one Strain and brace absorbs one Hull point when applicable.
8. Resolve manually with PF2e skill choice and attacks/defense; confirm visual feedback. Recover and start round 2.
9. After second-round movement, confirm two illustrated cards appear in the center; click Ready on each active controlling player or allow the 12-second fallback. Confirm the hand receives them once, no duplicate AP consumption, and the free cycle works once per round.
10. Refresh/reconnect and test both actual player and GM clients. Export debug and report whether navigation locks, assigned stations, correct phase transitions, and resource values stay synchronized. Native acceptance is **not yet established** by Node tests.

## Known limits and deliberate boundaries

- The experience is fully opt-in and the original guided test continues to use `combatFlow:2`. Automated Node tests use document doubles, not running Foundry/PF2e UI.
- Quest reward integration, 125 new card designs, GM-private hidden-state migration, duplicate-message recovery, simultaneous damage rule revision, five station advanced abilities and campaign vessel integration are not changed.
- Battle Watch firing is still a multi-step flow; an atomic target/fire refactor is a separately scoped, high-risk task. The new HUD is a playable visual/gameplay prototype, not a complete replacement of all underlying transactions.
- The crew calls are small experimental bonuses and are **not yet user-approved final combat rules**.
- The branch is for review. Do not merge it into the original feature branch or `main` without acceptance and native testing.
