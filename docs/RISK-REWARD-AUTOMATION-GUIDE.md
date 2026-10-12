# Risk Reward Automation Guide

## Goal

Every Risk reward offered by an Arkflight Event must resolve from its authored rules. A reward must never wait for a GM to choose what it means, block the next station roll, or claim an effect that did not happen.

Risk bids remain optional and retain their authored **+2 / +5 / +8 DC increases**. A reward is earned only on Success or Critical Success. Critical Success uses the catalog's stronger payoff.

## Current repository snapshot

- The reusable catalog in `src/content/risk-benefits.js` has **70 benefits**.
- The two registered Events contain **152 Risk bid placements** and use **42 distinct benefit IDs**.
- The remaining **28 catalog benefits are not currently offered by those Events**. Some may already have handlers; audit their code before implementing them.
- Earned rewards from the shipped Events resolve automatically. Legacy pending awards are migrated in `src/event/risk-awards.js`.
- The old `hazard-reveal-1` reward was replaced with `hazard-strain-guard-1` / **Brace Against the Shear**. It prevents Strain from active Hazard upkeep and does not absorb Strain from the round outcome. Glassback uses a normal station bonus because its Hazard may not be active when the reward is selected.
- `src/event/round-runtime.js` still has a generic fallback note for unknown non-choice reward IDs. Remove that fallback when coverage is complete; it records an award without applying its advertised mechanic.

## Files to know

| File | Purpose |
|---|---|
| `src/content/risk-benefits.js` | Success and Critical Success text, tier, tags, target, and timing for each benefit. |
| `src/content/events/*-data.js` | Risk bids actually offered by authored actions and skills. |
| `src/event/round-runtime.js` | Direct reward effects and reward timing. |
| `src/event/risk-choices.js` | Automatic defaults for rewards that need a target or order choice. |
| `src/event/risk-awards.js` | Migration for pending rewards saved by older versions. |
| `src/event/hazard-rules.js` | Authored Hazard effects used by Events. Keep Hazard behavior specific and gameplay-relevant. |
| `src/event/resolution-engine.js` | Check modifiers, Risk resolution, and award timing around a station roll. |
| `test/event-gameplay-repair.test.js` | Focused coverage for automatic rewards and Hazard/Strain interactions. |

## Benefits not currently offered by registered Events

These are catalog entries, not a statement that their runtime effects are missing. Check for a direct handler or a `risk-choices.js` handler first.

### Check bonuses and DC adjustments

- `aid-next-2` — Clear the Line
- `aid-next-3` — Perfect Setup
- `dc-next-3` — Impossible Opening
- `bonus-self-1` — Exacting Execution
- `bonus-other-3` — Hero's Gift

### Strain, systems, and resources

- `pressure-drop-1` — Bleed Strain
- `pressure-drop-2` — Stabilize the Crisis
- `pressure-drop-3` — Master the Strain
- `hull-brace` — Brace the Hull
- `resource-recover` — Recover Supplies
- `pressure-transfer` — Take the Load
- `pressure-threshold-raise` — Reinforce the Limit
- `pressure-threshold-raise-big` — Beyond Safe Limits

### Signature and ship abilities

- `signature-preserve` — Hold Something Back
- `signature-refresh-self` — Second Wind
- `signature-refresh-other` — Pass the Spark
- `ship-ability-refresh` — Reset the Mechanism

### Chains, rerolls, and degree protection

- `chain-1` — Pass the Advantage
- `chain-2` — Rolling Advantage
- `chain-3` — Crew Cascade
- `reroll-next` — Give Them Another Chance
- `degree-shield` — Catch the Fall

### Event score and action access

- `progress-1` — Press the Advantage
- `progress-2` — Seize the Moment
- `fallback-upgrade` — Make the Basics Count
- `risk-open-2` — Open a Heroic Window
- `risk-open-3` — Dare the Impossible
- `hazard-emergency-action` — Create an Answer

## Implementation workflow

1. **Build a coverage matrix.** For each of the 70 IDs, record whether it is offered by an Event, where it resolves, the stored state it changes, and its Success/Critical Success payoff. A reward is covered only when code performs the mechanic, not when the UI records its name.

2. **Resolve timing before coding.** Classify each effect as immediate, next station, end of round, next round, event score, or persistent ship effect. Put it in the phase that can still affect play. For example, a score bonus must be applied before the round score is finalized.

3. **Make every branch deterministic.** Use an authored target if present; otherwise use a documented automatic default such as the next eligible unresolved station. For order changes, validate that each unresolved station appears exactly once. If a target or resource does not exist, choose a documented safe fallback or mark the option unavailable in authoring validation. Never open a GM adjudication prompt.

4. **Keep Hazard rewards tied to active rules.** Do not reveal a Hazard already displayed to players. Apply a real adjustment to the authored Hazard, such as a check modifier, order restriction, emergency action, or Strain consequence. Do not restore the old generalized Hazard lifecycle just to support a catalog entry.

5. **Keep player-facing text exact.** The Success and Critical Success descriptions in the catalog must match the effects actually applied. If a mechanic cannot be represented correctly yet, do not offer that Risk bid in an Event.

6. **Migrate saved state.** If an effect's ID or meaning changes, handle old pending awards in `risk-awards.js` and add a migration test. Keep migrations idempotent so reloads cannot award the same benefit twice.

7. **Delete silent fallbacks.** Once all IDs are mapped, replace the generic “automatically resolved using authored reward text” path with an explicit development error or event validation failure for an unknown ID. Do not mark unsupported rewards as resolved.

## Required tests

- Every catalog ID is either explicitly handled or explicitly unavailable to Event authors; no generic fallback counts as coverage.
- Every Risk bid in every registered Event resolves on both Success and Critical Success without creating a pending GM award.
- Each handler's state change matches the catalog text. Include a separate assertion for its Critical Success payoff.
- Target defaults, empty target lists, absent Hazards, and already-resolved stations do not throw or silently produce a false reward.
- Round-timed rewards are applied before scoring or consequences and expire at the specified boundary.
- Strain guards reduce only the named Strain source. In particular, Brace Against the Shear must block Hazard upkeep without consuming protection on ordinary round-outcome Strain.
- Old saved awards migrate once and do not duplicate effects after another reload.

## Verification commands

Run from the module repository root:

```sh
node --test test/event-gameplay-repair.test.js
npm test
git diff --check
```

Current verification note: the focused gameplay test passes. The most recent full suite reported one failure in `test/content-pack-authoring-guide.test.js` with a generic Node test-runner error; its underlying `examples/content-pack-starter/tests/validate.mjs` script passed when run directly. Recheck and resolve this test-runner failure before calling the branch fully verified.

## Foundry smoke test

After the tested branch is available in the Foundry module directory:

1. Restart Foundry or reload the world so the updated module code loads.
2. Start Gilded Shatter and choose an action offering **Brace Against the Shear** at +2 Risk.
3. Resolve the Risk roll as Success. Confirm the reward appears in Automatic Risk Benefits and no dialog asks the GM to choose a target.
4. Resolve the round. Confirm one point of active Hazard upkeep Strain is prevented, while any separate Strain from the round result still applies.
5. Repeat with Critical Success and two Strain-producing active Hazards; confirm up to 2 Hazard Strain is prevented.
6. Confirm the crew can continue to the next roll and next round without resolving a reward manually. Check the browser console for errors.

## Delivering the branch to the local Foundry install

The code in this workspace does not change the user's Windows Foundry folder by itself. After committing and pushing the reviewed branch, update the local module repository from Git Bash:

```sh
git status --short
git fetch origin
git switch fix/event-risk-hazard-repair
git pull --ff-only
npm test
```

Keep local artwork, zip files, and other untracked assets intact. If the local branch does not exist yet, create it from the remote tracking branch instead:

```sh
git switch --track origin/fix/event-risk-hazard-repair
```

Then restart Foundry and run the smoke test above.
