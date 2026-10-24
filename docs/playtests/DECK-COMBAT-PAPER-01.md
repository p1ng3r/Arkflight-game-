# Phased deck combat: paper encounter 01

Status: proposed test fixture, not game implementation. Accepted Brigantine benchmarks are preserved; Cutter stats, weapon fits, draft card effects, Supply rates, modifiers and mitigation order below are provisional. Keep this scenario independent of live Foundry actors.

## Purpose

Test phases, a random hand, AP reservation, support/coordinated checks, Instant responses, delayed effects and simultaneous damage. Target 4-6 rounds and report actual pacing rather than force that result. Damage/fault mathematics beyond these stated test rules remain a separate design step.

## Ships

| Ship | Hull | AC | AP | Speed | Crew checks | Initiative |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rum Runner, Brigantine | 120 | 22 | 4 | 5 | +13 | +2 |
| Needlewake, Cutter | 100 | 23 | 4 | 6 | +13 | +3 |

Both occupy one hex. Begin at Lifeveil 100%, Morale 100%, Strain 0/10 and Supplies 10. Routine support checks use DC 20. Hull damage is reduced by applicable resistance then active DR, floored at zero; no innate Hardness is added for this pass. Danger bands are recorded but do not invent a fault subsystem for this card-flow test.

Ordinary battery attacks spend 1 Supply when actually fired, including misses. Special chainshot uses its own stock charge instead. Repair cards spend their explicit additional Supply. All rates are test values. Initiative is rolled only after the player commits a maneuver; higher completes its Card phase first. The accepted 24 October amendment replaces sequential movement with simultaneously revealed, predefined routes; see the foundation document.

## Weapons

| Ship | Battery | Arc | Range | Damage | Reload |
| --- | --- | ---: | --- | --- | ---: |
| Rum Runner | Port Broadside | 90 degrees | 1-5 hexes | 2d10+8 | 1 |
| Rum Runner | Starboard Broadside | 90 degrees | 1-5 hexes | 2d10+8 | 1 |
| Rum Runner | Forward Swivel | 180 degrees | 1-4 hexes | 2d6+6 | 1 |
| Needlewake | Port Light Battery | 90 degrees | 1-4 hexes | 2d8+6 | 1 |
| Needlewake | Starboard Light Battery | 90 degrees | 1-4 hexes | 2d8+6 | 1 |
| Needlewake | Forward Swivel | 180 degrees | 1-4 hexes | 2d6+6 | 1 |

Each basic Fire Battery costs 1 AP and is available without a hand card. Each battery attacks once per round unless an effect explicitly allows another attack. Side batteries center on the relevant side; the forward swivel covers the forward half and remains single-target. Reload 1 returns at next round start. Needlewake carries 2 chainshot charges.

## Decks

Each named ordinary card below has 2 copies; each Unique has 1. A paired name does not permit stacking identical preparations.

### Rum Runner

Brace for Combat x2, Prepare the Crew x2, Coordinated Volley x2, Acquire Target x2, Patch the Hull x2, Emergency Helm x2, Shield Pulse x2, All Hands Broadside x1.

### Needlewake

Brace for Combat x2, Evasive Course x2, Patch the Hull x2, Emergency Helm x2, Shield Pulse x2, Read the Battle x2, Chainshot Volley x2, Breakaway Volley x1.

## Draft card reference

These card effects are test proposals. Support checks happen at play; attack checks happen in Damage. Attacks have no separate activation check. Coordinated cards have one support check for the named helper and one weapon attack check for Battle Watch. Normal support effects still happen on failure with their listed complication.

### Brace for Combat

1 AP; Standard; captain. Keywords: Delayed, DR. Additional cost: none.

Prepare physical-Hull DR 3 for the whole next round; Common. Prepared until that effect ends.

| Result | Effect |
| --- | --- |
| Critical success | Next-round DR 4. |
| Success | Next-round DR 3. |
| Failure | Next-round DR 3; lose 2 Morale now. |
| Critical failure | Next-round DR 3; lose 5 Morale now. |

### Prepare the Crew

1 AP; Standard; captain. Keywords: Delayed. Additional cost: none.

Prepare +1 shared AP after next round refresh. Identical preparations do not add together; total preparation AP capped at +2.

| Result | Effect |
| --- | --- |
| Critical success | Prepare +2 AP. |
| Success | Prepare +1 AP. |
| Failure | Prepare +1 AP; lose 2 Morale now. |
| Critical failure | Prepare +1 AP; lose 5 Morale now. |

### Coordinated Volley

2 AP; Standard; engineer, battlewatch. Keywords: Coordinated, Attack. Additional cost: 1 Supply when the ordinary shot actually fires.

Commit one ready battery attack with +1d8 damage. Engineer checks now; Battle Watch attacks in Damage phase. Includes the firing order.

**Engineer check**

| Result | Effect |
| --- | --- |
| Critical success | Add +1 circumstance to this attack as well as +1d8 damage. |
| Success | The attack gains +1d8 damage. |
| Failure | The attack gains +1d8 damage; gain 1 Strain. |
| Critical failure | The attack gains +1d8 damage; gain 2 Strain. |

**Battlewatch check**

| Result | Effect |
| --- | --- |
| Critical success | Hit; double the complete rolled damage. |
| Success | Hit; deal rolled damage. |
| Failure | Miss; ammunition is spent and normal reload applies. |
| Critical failure | Miss; ammunition/reload apply, and this battery suffers -1 to its next attack, then clears. |

### Acquire Target

1 AP; Standard; battlewatch. Keywords: none. Additional cost: none.

Gain +1 circumstance to one battery attack this round. No attack is included. Strongest circumstance bonus applies.

| Result | Effect |
| --- | --- |
| Critical success | The chosen attack gains +2 circumstance. |
| Success | The chosen attack gains +1 circumstance. |
| Failure | Gain +1 as normal; after that shot this battery takes -1 to its following attack. |
| Critical failure | Gain +1 as normal; after that shot this battery takes -2 to its following attack. |

### Patch the Hull

1 AP; Standard; engineer. Keywords: Repair. Additional cost: 1 Supply when played.

Common repair. Restore 1d10+4 Hull, up to maximum. Requires missing Hull; no always-available basic repair order.

| Result | Effect |
| --- | --- |
| Critical success | Restore 2d10+4 Hull. |
| Success | Restore 1d10+4 Hull. |
| Failure | Restore 1d10+4 Hull; gain 1 Strain. |
| Critical failure | Restore 1d10+4 Hull; gain 2 Strain. |

### Emergency Helm

1 AP; Instant; navigator. Keywords: Maneuver. Additional cost: none.

After all targets are declared and before attack dice, move forward 1 hex OR rotate 60 degrees. Check occupancy, range and arcs afterward. Additional movement/turning must remain inside explicit combat caps.

Trigger: After attack targets are declared, before attack rolls.

| Result | Effect |
| --- | --- |
| Critical success | May move 1 hex and rotate 60 degrees, in that order. |
| Success | Choose the printed move or turn. |
| Failure | Choose the printed move or turn; spend 1 extra Supply. |
| Critical failure | Choose the printed move or turn; spend 2 extra Supplies. |

### Shield Pulse

1 AP; Instant; veilwarden. Keywords: Resistance. Additional cost: 5 Lifeveil percentage points when played.

Gain resistance 5 to bludgeoning damage from one selected incoming battery attack. This is resistance, not a DR card.

Trigger: After an incoming battery target is declared, before its attack roll.

| Result | Effect |
| --- | --- |
| Critical success | Resistance 7. |
| Success | Resistance 5. |
| Failure | Resistance 5; lose 2 extra Lifeveil percentage points. |
| Critical failure | Resistance 5; lose 5 extra Lifeveil percentage points. |

### Evasive Course

1 AP; Standard; navigator. Keywords: AC. Additional cost: none.

Gain +1 circumstance AC until end of this round. Strongest circumstance AC bonus applies.

| Result | Effect |
| --- | --- |
| Critical success | Gain +2 circumstance AC. |
| Success | Gain +1 circumstance AC. |
| Failure | Gain +1 circumstance AC; spend 1 Supply. |
| Critical failure | Gain +1 circumstance AC; spend 2 Supplies. |

### Read the Battle

1 AP; Standard; captain. Keywords: Draw. Additional cost: none.

Draw 1 card. A new Standard cannot reopen a completed Card phase.

| Result | Effect |
| --- | --- |
| Critical success | Draw 2, then discard 1. |
| Success | Draw 1. |
| Failure | Draw 1; lose 2 Morale. |
| Critical failure | Draw 1; lose 5 Morale. |

### Chainshot Volley

2 AP; Standard; battlewatch. Keywords: Attack, Ammunition. Additional cost: 1 chainshot charge when the shot actually fires.

Commit a compatible battery shot using special ammunition: 1d10+6 bludgeoning; on a hit the target next round has -1 hex maneuver allowance, minimum 0. Strongest reduction applies. Includes the attack.

| Result | Effect |
| --- | --- |
| Critical success | Hit; double damage and the next-round reduction is 2 hexes. |
| Success | Hit; normal damage and 1-hex next-round reduction. |
| Failure | Miss; charge spent, normal reload. |
| Critical failure | Miss; charge spent, normal reload; -1 to this battery next attack, then clears. |

### All Hands Broadside

3 AP; Standard; captain, battlewatch. Keywords: Unique, Burn, Coordinated, Attack. Additional cost: 1 Supply when the ordinary shot actually fires.

Unique, Burn. Commit one ready broadside attack with +2d10 damage and +1 circumstance attack. Captain checks now; Battle Watch attacks in Damage phase.

**Captain check**

| Result | Effect |
| --- | --- |
| Critical success | The circumstance attack bonus is +2. |
| Success | The circumstance attack bonus is +1. |
| Failure | The bonus is +1; lose 2 Morale. |
| Critical failure | The bonus is +1; lose 5 Morale. |

**Battlewatch check**

| Result | Effect |
| --- | --- |
| Critical success | Hit; double the complete rolled damage. |
| Success | Hit; deal rolled damage. |
| Failure | Miss; ammunition is spent and normal reload applies. |
| Critical failure | Miss; ammunition/reload apply, and this battery suffers -1 to its next attack, then clears. |

### Breakaway Volley

3 AP; Standard; navigator, battlewatch. Keywords: Unique, Burn, Coordinated, Attack, Maneuver. Additional cost: 1 Supply when the ordinary shot actually fires.

Unique, Burn. Move forward 1 hex OR rotate 60 degrees now, then commit one ready battery attack with +1d8 damage. Navigator checks now; Battle Watch attacks in Damage phase.

**Navigator check**

| Result | Effect |
| --- | --- |
| Critical success | May move 1 hex and rotate 60 degrees, then queue the attack. |
| Success | Choose move or turn; queue the attack. |
| Failure | Choose move or turn; spend 1 Supply; queue the attack. |
| Critical failure | Choose move or turn; spend 2 Supplies; queue the attack. |

**Battlewatch check**

| Result | Effect |
| --- | --- |
| Critical success | Hit; double the complete rolled damage. |
| Success | Hit; deal rolled damage. |
| Failure | Miss; ammunition is spent and normal reload applies. |
| Critical failure | Miss; ammunition/reload apply, and this battery suffers -1 to its next attack, then clears. |

## Starting position and player decisions

Rum Runner starts at axial hex (0,0), heading 0 (north). Needlewake starts at (3,-6), heading 3 (south), six hexes away off Rum Runner's starboard bow. Headings increment clockwise in 60-degree steps. Axial forward vectors: (0,-1), (1,-1), (1,0), (0,1), (-1,1), (-1,0).

Opening hand: 5 cards. Optional mulligan once: return up to 2, shuffle into remaining draw pile, then draw the same number. No extra draw in round 1. Later rounds draw 1; hand limit 7.

The player has kept the opening hand; no movement has been selected or executed. The earlier test menu included Hold; Straight 2, 3, 4, or 5; and a four-hex Port/Starboard Sweep (forward 2, turn 60 degrees, forward 2). Those routes are provisional, with no normal AP cost. Expand the hull menu into exact movement/turn sequences under the accepted simultaneous-movement amendment before resuming the first maneuver choice. Do not treat the old saved menu as the completed maneuver catalog. Needlewake's opening course was committed before player choices and stays hidden until revealed. Preserve both ships' draws, resources, committed opponent course and random state while updating the movement rules.

The adjacent state JSON saves exact instance IDs, hand/draw order, opponent choices, resources, provisional rules and the random generator state. Do not reroll the opening draw. Continue from that state after every decision. Resolve one user-facing decision at a time; do not advance through unchosen maneuvers or card plays.
