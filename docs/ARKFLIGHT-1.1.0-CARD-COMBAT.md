# Arkflight 1.1.0: card combat decisions and first implementation

Recorded 17 October 2026. Target version: **1.1.0**. This is not a released version or a manifest version bump.

## Current implementation boundary

`src/cards/card-library.js` is the isolated rules foundation for permanent libraries, shared hands, progression capacities, constrained random starter deals, awards, loadout swaps and per-card combat availability. It returns new ship objects containing a `cardDecks` field without mutating the source ship.

**It is not wired to live generation, Foundry combat, AP/RP spending or the ship sheet yet.** Existing station abilities and their old cooldowns continue running. The 75 AP designs and the new RP designs have not been authored or implemented. Tests use synthetic card definitions, not a playable collection. No old ship data is migrated or discarded by this step.

## Accepted combat direction

- Adapt Limithron's naval structure to Arkflight's ship-owned talents, upgrades and equipment.
- Return to a shared AP pool. Start from 4 AP; normal base range 3–7. Explicit hull profiles and command upgrades determine base AP, with crew requirements; ship level alone does not automatically add AP. Explicit abilities and upgrades can be exceptions to the normal range.
- At round start: advance round recovery, Captains submit locked plans, reroll every ship's initiative, then take one turn per ship in resulting order.
- The Captain discusses the plan with the crew and selects actual abilities, assigning their stations/operators. Submitting commits their AP. Players resolve their orders in any sequence during their ship's turn.
- Targets are chosen when orders execute, not during planning.
- A now-impossible order can use another legal target. If it cannot execute, skip it and retain its committed AP cost; do not expend ammunition, Supplies, cooldowns or Signature uses for a skipped order.
- Multiple paid actions per operator are permitted, subject to allocated orders, readiness and each card's limits.
- Shared RP remains separate from AP. Restore RP to 1 at round start. Reload timers and card availability advance once per round, not each time initiative changes.

## Movement and weapons

| Hull profile | Free movement | Normal 60-degree turns |
| --- | ---: | ---: |
| Light | 6 hexes | 2 |
| Standard | 5 hexes | 2 |
| Heavy | 4 hexes | 2 |
| Giant | 3 hexes | 1 |

Six headings; normal movement forward; no two turns in the same hex. Powered ships may stop. The ship can pause movement to execute an order, then continue. Navigator controls the path; fitted engines, hull handling and upgrades remain meaningful.

- Basic Full Thrust: 1 AP, +2 hexes.
- Basic Hard Turn: 1 AP, one additional 60-degree turn.
- Movement cards may grant 1–3 extra hexes for their AP cost. Combined additional movement is limited to one more full movement allowance per round: Speed 6 can move 6 free + 6 purchased, not merely 6 total.
- At most one additional facing change per round: ordinary ships can buy a third turn; giants can buy a second. The same-hex restriction still applies.
- Fire a balanced battery of compatible, ready weapons for 1 AP. Preserve individual weapon equipment, upgrades, readiness and reloads; battery damage and exact participating-weapon rules still need implementation and balance work.
- Essential basic orders remain available without taking equipped-card slots: Fire Battery, Full Thrust, Hard Turn and basic Damage Control. Exact Damage Control effect is not settled here.

These rules require adapting older abilities that grant full extra movement, uncapped turning, or additional AP. Do not import their old effects unchanged into the new card collection.

## Ship-owned library and hand

The ship permanently learns cards. Its equipped hand is shared across stations, rather than four cards per station. Each card lists eligible stations; selected cards may support multiple stations. The same card cannot occupy multiple slots or gain separate uses through a different operator.

Generation randomly deals **12 AP cards: 8 General, 3 Flux, 1 Signature**. Guarantee at least one usable General card for every installed station type; reject duplicates and cards incompatible with installed equipment or level. Generation fails clearly rather than silently dealing an unusable hand. Reloading/normalizing an existing ship must never reroll its hand.

Generated starter cards enter both library and hand. Awards enter the permanent library without automatically equipping themselves. Players can swap learned cards into available slots outside combat. Removed cards remain known. No card trading mechanic is specified in this step.

| Level | General slots | Flux slots | Signature slots | Total AP slots |
| --- | ---: | ---: | ---: | ---: |
| 1 | 8 | 3 | 1 | 12 |
| 2 | 9 | 3 | 1 | 13 |
| 4 | 9 | 4 | 1 | 14 |
| 6 | 10 | 4 | 1 | 15 |
| 8 | 10 | 5 | 1 | 16 |
| 10 | 10 | 5 | 2 | 17 |
| 12 | 11 | 5 | 2 | 18 |
| 14 | 11 | 6 | 2 | 19 |
| 16 | 12 | 6 | 2 | 20 |
| 18 | 12 | 7 | 2 | 21 |
| 20 | 12 | 7 | 3 | 22 |

Slots expand without automatically awarding a new card. Rewards can be discoveries, training, faction rewards, loot or authored upgrades. The isolated generator currently deals only the starter quantities even when supplied a higher ship level; additional capacity remains open. Confirm how freshly generated higher-level ships should populate those extra slots before connecting generation to Foundry.

## Card use and recovery

- General: once per round per equipped card.
- Flux: once before its printed 2–5 round cooldown. Used in round R with Flux N, ready at the beginning of round R + N. Round 1 + Flux 2 means round 3; Flux 5 means round 6.
- Signature: once per combat per card.
- Reassigning operators or rerolling initiative never restores a use.
- Only executing an order starts its card cooldown. Planning, locking, retargeting and skipping do not.
- The UI should show the absolute ready round, such as **Ready: Round 3**.

Reaction cards follow the same printed recovery categories, with a separate **six-card hand: 3 General, 2 Flux, 1 Signature**. That hand stays at six under ordinary level progression; explicit talents/upgrades may later expand it. Shared RP still limits how many reactions the ship can actually execute. The current pure card module tracks availability only; the forthcoming combat adapter must enforce the separate AP/RP budget.

## Card collection sizes

- AP base collection: **75 designs = 40 General + 25 Flux + 10 Signature**. These are available authored rewards, not an automatic starting library.
- RP request: **30 designs**, with a specified distribution of **16 General + 10 Flux + 2 Signature**, which totals **28**. The last two designs are unresolved. Preserve the specified counts; do not silently add Signatures or change the total.
- Future add-on collections can add learnable cards without automatically expanding hands.

## Skill contribution and outcomes

One roll per operation. Use the ship's appropriate statistic with a contribution from the operator's selected skill proficiency: Trained +1, Expert +2, Master +3, Legendary +4 (Untrained +0). Do not stack the full level-based character skill modifier on top of the level-based ship modifier.

| Station | Three proposed skill choices |
| --- | --- |
| Captain | Diplomacy, Intimidation, Society |
| Engineer | Crafting, Arcana, Thievery |
| Navigator | Survival, Nature, Arcana |
| Battlewatch | Crafting, Athletics, Warfare Lore |
| Veilwarden | Arcana, Occultism, Medicine |

These are Arkflight mappings, not claims about standard PF2e skill actions. Exact Foundry actor skill lookup and roll/DC adapter remain unimplemented.

Every card requires four explicitly authored outcomes: critical success, success, failure and critical failure. Success is its normal effect; critical success adds a small specific benefit; failure and critical failure introduce written drawbacks/complications while retaining the non-attack base operation. For example, Full Thrust can succeed at moving but take 1d8 Hull damage on a critical failure from a collision. The module must resolve written consequences rather than requiring the GM to invent them. Numeric effects still need card-by-card design.

For firing cards, use the attack's roll against AC for both hit resolution and its outcome rider. A shot still needs to hit; no separate activation roll. Reactive timing, exact degree/DC rules and damage-save interactions need explicit integration tests before activation.

## Next implementation slices

1. **Done locally:** isolated library/hand/progression/dealing/availability rules with tests. No live switch.
2. Author and review executable card definitions in manageable batches, including prerequisites, four outcome effects and Flux durations. Reconcile the RP collection count first.
3. Implement the Captain's committed order queue, shared resource accounting, skipped orders and skill contribution. Keep targets deferred until resolution.
4. Implement hex movement/facing budgets and balanced batteries; connect card effects to those operations.
5. Connect fresh generation, saved ship migration and library/hand controls; preserve existing learned content until migration is explicitly mapped.
6. Add round recovery/initiative handling, RP reaction prompts, and live Foundry acceptance scenarios. Only then consider the 1.1.0 release/version change.

The previously discussed two damage tracks and three save families remain in [the combat foundations working paper](COMBAT-FOUNDATIONS-WORKING-PAPER-01.md). They have not been replaced by this card foundation. Keep programming steps bounded and ask the agreed five focused questions for unresolved behavior before each new step; do not re-open settled rules.
