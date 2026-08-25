# Arkflight Hybrid Reward System

Arkflight uses three different reward layers because they serve different jobs.

## 1. Momentum — immediate crew performance

Momentum remains the encounter-scale measure of how well the crew is operating together right now. It is capped at 0–3 and changes from the universal round-result bands unless an explicitly authored ability changes it.

A round report must make the change visible as:

`Momentum Before → Round Award → Momentum After`

Momentum is not loot and is not replaced by Crew Edge cards.

## 2. Crew Edge — shared tactical reward

Crew Edge cards are single-use crew reactions or tactical opportunities. They belong to one shared crew hand, not individual stations.

Rules:

- Shared hand maximum: 3 cards.
- Each card has one explicit trigger window.
- A card is only offered when its trigger is legal.
- One card may be cashed in for a given triggering check or consequence unless a card explicitly says otherwise.
- A spent card is discarded.
- Cards may be awarded by a round outcome or an Event ending.
- Cards may carry between Arkflight Events.
- If the hand is full, new cards become overflow and must replace/discard an existing card before being kept.

The explicit trigger rule exists to prevent Crew Edge from becoming a universal reaction interrupt after every roll.

### Initial Crew Edge catalog

The initial catalog includes Hold Together, Clear Opening, Ride the Momentum, Second Chance, Change of Course, Not Yet, Brace for It, One More Push, Steady Hands, Seize the Gap, Protect the System, and Crew Instinct.

## 3. Event rewards — campaign consequences and treasure

Every Event ending may author any combination of:

- gold
- valuables
- PF2e items
- salvage or crafting materials
- Arkengine Mods / Ship Mods / other ship components
- faction rewards or favor
- route knowledge
- temporary or persistent boons
- Crew Edge cards

Reward type should follow the fiction. A salvage Event may award gold-equivalent wreckage and items. A diplomatic Event may award favor and access. A dangerous navigation Event may award route knowledge rather than arbitrary coin.

The engine prepares and displays the authored reward package but does not automatically transfer gold or PF2e Items until a recipient or party stash is explicitly chosen.

## Round rewards versus Event rewards

Round rewards are intended to be tactical and immediately relevant to later rounds. Crew Edge cards are the preferred round reward.

Event rewards are the aftermath package: treasure, items, salvage, ship parts, campaign access, knowledge, and optional Edge cards.

An Event author is never required to use every reward type.

## Glassback first implementation

Glassback uses the reward system as a vertical slice:

- Mixed Success in Round 1: Hold Together.
- Mixed Success in Round 2: Ride the Momentum.
- Mixed Success in Round 3: Clear Opening (carried forward if the Event ends).
- Extraordinary rounds award stronger Edge cards.
- Final outcomes award fiction-appropriate salvage/coin/route knowledge depending on the escape result.
- Every final outcome has a 3–6 sentence closing cinematic vignette.

The next implementation step is Crew Edge trigger execution and a GM-controlled reward-recipient flow for actual PF2e gold/item transfer.
