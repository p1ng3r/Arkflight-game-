# Event Risk and Hazard repair — automatic reward pass

Base: dev 695bc24. Scope: event Risk effects, hazard wiring, shared Strain tactics. No version bump or release-manifest change.

## What changed

- Momentum, stronger DC reductions, Strain guards and round-band protection execute instead of falling through to a GM note.
- All Risk benefits used by shipped events resolve in code when earned. They do not open a GM dialog or block the next roll/consequence. Targeted benefits first use authored target data; otherwise they select the next eligible unresolved station and the highest-impact eligible active Hazard. If no eligible target exists, the benefit records that outcome and continues without interrupting play.
- The Event Board shows the most recent automatically applied Risk benefits. Information rewards display their authored reveal on the board.
- Saved pending rewards created by the earlier manual-resolution build are migrated automatically when the Event Board loads.
- Shipped hazard catalogs now affect DCs, +8 Risk availability, station order, and ignored-hazard Strain. A newly-created round-end Hazard starts upkeep in the next round.
- Collapsing Spars exposes an authored emergency Battlewatch action: Perception or Athletics DC 18; success clears the hazard. Other hazard clearance uses existing Risk rewards or GM adjudication.
- Next-round commitment hazards no longer activate immediately.
- Protect the System prevents up to 2 shared Strain from the next single source; Brace for It prevents all Strain from the next source. Both expire at round end. Their old per-Area text and picker were removed.
- Shared encounter cloning preserves combined Mastery/Tactic/Risk effects.
- Set Up Greatness on ordinary Success improves only a succeeding check; its Critical Success benefit may improve any degree, as its text specifies.

## Automated validation

Run `npm test`. Behavioral tests cover automatic reward targets, saved-award migration, Strain protection, and final-station consequence processing. These are Node tests, not a running Foundry world. Live rendering and multiplayer persistence still need Foundry validation.

## Manual Foundry v14 / PF2e validation

Use a test world or a backup copy. Restart Foundry and reload both a GM and player browser after switching branches.

1. Select any commissioned vessel and assign the five officers. Start Gilded Shatter. Confirm Gravity Shear adds +1 to Navigator DC, with its name in the DC adjustment detail.
2. During planning, inspect the Risk choices in both the compact dropdown and detail view. Each should be labeled Automatic.
3. Earn Catch the Rhythm: Momentum rises by 1, capped at 3. On Critical Success, its next round-band loss protection is retained even if another Tactic/Mastery is used.
4. Earn an order or Hazard reward. Confirm the effect appears in the Automatic Risk Benefits strip and the next station can roll without a dialog. Check that the authored target is used; when omitted, the next eligible station is selected automatically.
5. Earn condition stabilization. Confirm the ship's most severe active Hull, Drive, or Weapons condition improves automatically. Refresh the GM browser and confirm the result persists.
6. Use Protect the System before a round consequence: the next Strain source is reduced by 2; a later distinct Hazard upkeep source is not also protected. Brace for It cancels one source, not the rest of the encounter.
7. In Glassback, allow Collapsing Spars to activate. Confirm its emergency Battlewatch action appears next planning phase, a success removes it, and failure leaves it active with +1 end-of-round Strain.
8. With Glassback Turn active, confirm Navigator-before-Engineer is enforced and Captain +8 Risk is blocked. Check the displayed reason and the applicable restriction override.
9. Suppress a Hazard for the round; confirm its DC/upkeep stops, then it returns next round. Permanent removal must not return.
10. Complete an event and start another. Automatic Risk history and temporary guards must not leak into the new encounter.

## Remaining work

This pass automates the Risk rewards used in current shipped events. Rewards that are not used by a shipped event still need implementation and validation before authors add them to live content. Reward-grant retries and stage closeout, multiplayer command serialization, recovery choices, travel supply consumption, fallback balance and adventure redesign remain separate work. Live Foundry rendering and multi-client persistence must pass before merging into dev or releasing.

## Laptop checkout

Run in the laptop's existing `arkflight-game` module repository, with Foundry stopped:

```bash
git status --short
git remote -v
```

The remote should identify `p1ng3r/Arkflight-game-`. If status lists local edits, preserve/reconcile them before switching. Do not reset or delete them. With a clean checkout:

```bash
git fetch origin
git switch --track origin/fix/event-risk-hazard-repair
npm test
```

If that local branch already exists, use `git switch fix/event-risk-hazard-repair` and `git pull --ff-only` instead. These commands select the draft test branch; pulling dev alone will not include the patch before it is merged. Git updates the module files, not the Foundry world/Actors/Scenes stored separately on the desktop.
