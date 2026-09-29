# Event Risk and Hazard repair — first implementation package

Base: dev 695bc24. Scope: event Risk effects, hazard wiring, shared Strain tactics. No version bump or release-manifest change.

## What changed

- Momentum, stronger DC reductions, Strain guards and round-band protection execute instead of falling through to a GM note.
- Targeted benefits have a visible pending award and a GM-operated choice dialog. Supported choices apply bonuses, order changes, hazard suppression/removal, opportunity effects, Engineer refresh, and station links. The GM verifies fictional eligibility (e.g. a void/aetheric Hazard or attack-oriented action).
- Effects without sufficiently specific executable rules retain explicit GM resolution. They are labeled before bidding, show the remaining effect after earning, and require a written resolution or no-eligible-target explanation. Recording a manual ruling alone does not execute its mechanics. This package does NOT automate all 70 catalog entries.
- Pending rewards persist in encounter state and block the next roll/consequence until resolved. Decisions record the GM, time and note. Repeated resolution of the same award is rejected.
- Shipped hazard catalogs now affect DCs, +8 Risk availability, station order, and ignored-hazard Strain. A newly-created round-end Hazard starts upkeep in the next round.
- Collapsing Spars exposes an authored emergency Battlewatch action: Perception or Athletics DC 18; success clears the hazard. Other hazard clearance uses existing Risk rewards or GM adjudication.
- Next-round commitment hazards no longer activate immediately.
- Protect the System prevents up to 2 shared Strain from the next single source; Brace for It prevents all Strain from the next source. Both expire at round end. Their old per-Area text and picker were removed.
- Shared encounter cloning preserves combined Mastery/Tactic/Risk effects.
- Set Up Greatness on ordinary Success improves only a succeeding check; its Critical Success benefit may improve any degree, as its text specifies.

## Automated validation

Run `npm test`. The package adds 19 behavioral tests, including a controller test for a final-station reward choice followed by consequence application. These are Node tests, not a running Foundry world. Source/selector checks from the existing suite are not evidence of live UI correctness.

## Manual Foundry v14 / PF2e validation

Use a test world or a backup copy. Restart Foundry and reload both a GM and player browser after switching branches.

1. Select any commissioned vessel and assign the five officers. Start Gilded Shatter. Confirm Gravity Shear adds +1 to Navigator DC, with its name in the DC adjustment detail.
2. During planning, inspect Risk choices. Confirm each displays automatic, target-choice or GM-resolution status. Check both compact dropdown and detail view.
3. Earn Catch the Rhythm: Momentum rises by 1, capped at 3. On Critical Success, its next round-band loss protection is retained even if another Tactic/Mastery is used.
4. Earn a targeted order or Hazard reward. Confirm the pending panel is visible, the next roll is blocked, Cancel leaves it pending, and resolving applies the chosen effect once. Repeat after refreshing the GM browser.
5. Earn a GM-resolved benefit such as condition stabilization. Confirm its remaining text is visible and that recording a note does not silently claim to automate the effect. Record a justified no-target outcome if ineligible.
6. Use Protect the System before a round consequence: the next Strain source is reduced by 2; a later distinct Hazard upkeep source is not also protected. Brace for It cancels one source, not the rest of the encounter.
7. In Glassback, allow Collapsing Spars to activate. Confirm its emergency Battlewatch action appears next planning phase, a success removes it, and failure leaves it active with +1 end-of-round Strain.
8. With Glassback Turn active, confirm Navigator-before-Engineer is enforced and Captain +8 Risk is blocked. Check the displayed reason and the applicable restriction override.
9. Suppress a Hazard for the round; confirm its DC/upkeep stops, then it returns next round. Permanent removal must not return.
10. Complete an event and start another. Pending awards and temporary guards must not leak into the new encounter.

## Remaining work

This is a first repair package, not the complete gameplay roadmap. Reward-grant retries and stage closeout, multiplayer command serialization, recovery choices, travel supply consumption, fallback balance and adventure redesign remain separate work. Live Foundry rendering, dialog behavior and multi-client persistence must pass before merging into dev or releasing.

Some effect descriptions still require authoring decisions: hidden information, breakthrough states, condition suppression/stabilization, a Lifeveil breach guard, and generic hazard eligibility. Those are explicit manual resolutions here. No unsupported mechanic is presented as automatically executed.

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
