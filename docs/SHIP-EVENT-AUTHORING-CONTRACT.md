# Arkflight Ship Event Authoring Contract

## Protected opening/setup screen

The existing Event opening/setup screen is authoritative and must remain intact unless separately approved.

It owns:

1. Event art, title, goal, and opening vignette.
2. Binding the active Arkflight vessel.
3. Assigning one PF2e character to each station.
4. Selecting one once-per-event Mastery for each station.
5. Beginning Round 1 planning.

The reusable round engine begins after this setup is complete.

## Authoritative event loop

Each Ship Event runs this sequence:

1. **Opening / Setup** — assign stations and Masteries.
2. **Round Opening** — show round art and a short opening vignette.
3. **Planning / Action Board** — each station chooses one authored Action, one real PF2e skill used to resolve it, and optionally an authored Heroic / Risk Bid.
4. **Lock Plan** — all five stations must have an officer, Action, and PF2e skill. Locking moves directly to Resolution.
5. **Resolution** — resolve the five stations in the locked order using the assigned PF2e character and selected PF2e skill. Masteries and Resolution Crew Tactics may intervene at their authored trigger windows.
6. **Round Result** — score all five degrees of success, determine the round band, apply Momentum and Strain/Hazard consequences, and show the cinematic round result.
7. Repeat steps 2–6 until the final round.
8. **Event Result** — score the complete history of all rounds, apply any legal Event Result Crew Tactic, determine the final Event Result, apply persistent failure consequences or successful rewards, and show the ending vignette/rewards.

## Station checks

Every round authors exactly three Actions for each station:

- Captain
- Engineer
- Navigator
- Battlewatch
- Veilwarden

Every Action includes a one-sentence description (two only when necessary) explaining what that station is doing in the fiction.

Every Action resolves with one or more **real PF2e statistics/skills**. Arkflight-flavored pseudo-skill names must never replace PF2e skill names in the player-facing skill selector.

## Heroic / Risk Bids

Heroic / Risk is authored only where the Action supports a meaningful gamble.

Legal bid tiers are exactly:

- +2 DC
- +5 DC
- +8 DC

The selected tier determines the authored reward. Effects that reduce the rolled Risk tier may not silently reduce the earned reward tier unless the effect explicitly says so.

## Round scoring

Station degrees score:

- Critical Success: +2
- Success: +1
- Failure: -1
- Critical Failure: -2

The five station scores produce the existing round bands:

- Extraordinary
- Strong Success
- Narrow Success
- Failure
- Disaster

The round band controls Momentum change and authored Strain/Hazard consequences.

## Aggregate Event Result

A Ship Event is never resolved from only the final round.

Every completed round is appended to `eventHistory` with its score, band, station degrees, Momentum change, and ship consequences. The Event Result uses the average score of all completed rounds:

- average +5 or higher: **Critical Success**
- average 0 through +4.999: **Success**
- average -4 through -0.001: **Failure**
- average below -4: **Critical Failure**

Failure applies a persistent major/massive ship disadvantage authored by or associated with the Event Result. Critical Failure applies the event's most severe persistent consequence.

Success automatically earns one Crew Tactic in addition to authored treasure. Critical Success automatically earns two Crew Tactics in addition to authored treasure. Ship progression may increase the shared Tactic capacity.

## Crew Tactics — three theaters of play

Every Crew Tactic declares exactly one `theater`.

### 1. Planning

Played on the Action Board before Lock Plan. These alter the plan or the whole upcoming round.

Examples:

- +1 to every station check for the round.
- -1 DC to every station for the round.
- Reorder stations before Lock Plan.

### 2. Resolution

Played while station checks are resolving, alongside Mastery trigger windows.

Examples:

- Reroll a failed station.
- Roll twice and keep the better result.
- Lower one station's DC.
- Add a check bonus to one station.
- Step a +8 Heroic Bid to +5, +5 to +2, or +2 to +0 while preserving the originally selected Heroic reward.

### 3. Event Result

Played after the final round has been scored but before the Event Result is finalized.

Example:

- Improve Critical Failure to Failure or Failure to Success. A normal Event Result Tactic cannot improve Success to Critical Success unless its own text explicitly permits it.

## Mastery versus Crew Tactic

**Mastery** is the selected officer's personal once-per-event capability.

**Crew Tactic** is a shared opportunity earned by the crew and spent in its declared theater.

They use the same visible event flow but remain separate resources and separate rules systems.

## Vignette contract

- Event opening: normally 4–6 sentences and may run longer when needed to establish environment, tone, stakes, and immediate danger.
- Round opening: no more than 4 sentences unless absolutely necessary.
- Action description: normally 1 sentence, occasionally 2.
- Round-end vignette: no more than 4 sentences unless absolutely necessary.
- Event ending: may run up to approximately 10 sentences and should reflect the overall Event Result and the history of the complete event.

## Future event authoring target

A new event should primarily author:

- title, goal, images, and vignettes;
- round list;
- three Actions per station per round;
- real PF2e skill choices and DCs;
- optional +2/+5/+8 Heroic Bids and rewards;
- five round-band consequence packages;
- four final Event Result outcomes/rewards or mappings to compatible legacy endings;
- event-specific hazards, treasure, salvage, and persistent failure consequences.

The Event engine owns setup transitions, Lock Plan, ordered PF2e resolution, scoring, Momentum, Strain application, Tactic theater enforcement, aggregate Event Result scoring, and reward delivery.
