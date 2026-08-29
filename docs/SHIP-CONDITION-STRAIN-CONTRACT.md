# Arkflight Ship Condition & Strain Contract

**Status:** DESIGN LOCK / authoritative gameplay backbone for implementation

**Scope:** Persistent ship condition, Strain, Area degradation, Voyage consequences, Ship Combat carryover, repair, recovery, ship progression hooks, talent-tree hooks, and mod hooks.

This document is the current design authority for the ship-condition model. Existing Pressure/Hazard-era behavior that conflicts with this document is legacy and must be removed or migrated during implementation cleanup.

---

## 1. Core Model

Arkflight uses **one shared ship-wide Strain pool**.

The ship does **not** have separate Strain tracks for Hull, Arkengine, Rigging, Lifeveil, or Morale.

Ship condition is represented by five persistent Areas:

- **Hull** — Battlewatch
- **Arkengine** — Engineer
- **Rigging** — Navigator
- **Lifeveil** — Veilwarden
- **Morale** — Captain

Each Area uses the same five-state degradation ladder:

`Stable -> Stressed -> Damaged -> Critical -> Disabled`

Universal station penalty by Area state:

| State | Related station penalty |
|---|---:|
| Stable | 0 |
| Stressed | -1 |
| Damaged | -3 |
| Critical | -5 |
| Disabled | -10 to recovery/emergency use; normal function may be unavailable |

The Area state persists between rounds, Events, Voyage, and Ship Combat until actually repaired or improved by a valid special effect.

---

## 2. Strain

### 2.1 Shared Strain Pool

Strain represents accumulated stress on the entire ship.

Strain is **persistent**. It does not automatically reset between rounds or Events.

Reaching port alone does not automatically clear Strain.

### 2.2 Standard Voyage Strain

Default result contribution:

| Degree of success | Strain |
|---|---:|
| Critical Success | +0 |
| Success | +0 |
| Failure | +1 |
| Critical Failure | +2 |

Authored abilities, Risk Bids, Arkcraft Skills, Crew Tactics, talents, mods, weapons, Events, and GM-authored effects may explicitly add, reduce, prevent, or redirect Strain.

### 2.3 Strain Limit

The Strain Limit is **derived from the vessel**, not a universal fixed value.

The final Strain Limit is expected to come from:

`Hull/chassis base + ship-level/talent-tree bonuses + ship mods + Arkengine mods + exceptional permanent effects`

Exact Hull/chassis values and progression numbers are intentionally not locked yet. They will be defined when the ship-level, branching talent-tree, and mod systems are designed.

### 2.4 Threshold Crossing

When a result reaches or exceeds the ship's Strain Limit:

1. Determine the triggering Area.
2. Degrade that Area by one state.
3. Subtract one full Strain Limit from current Strain.
4. Keep any overflow Strain.

Example with Strain Limit 4:

`3 Strain + 2 = 5 -> Area degrades one step -> 5 - 4 = 1 Strain remaining`

### 2.5 Triggering Area

Default station-to-Area mapping:

| Triggering station | Area degraded |
|---|---|
| Captain | Morale |
| Engineer | Arkengine |
| Navigator | Rigging |
| Battlewatch | Hull |
| Veilwarden | Lifeveil |

The **station/result that causes the threshold crossing** normally determines the Area that degrades.

Earlier failures merely contributed to the shared Strain pool.

An Event, weapon, ability, talent, mod, or other authored rule may explicitly override the threatened Area when fiction and mechanics require it.

Random Area selection is not the default rule.

### 2.6 One Degradation per Resolution

A single station resolution or single discrete effect may cause **at most one Area degradation**, even if the resulting overflow remains at or above the Strain Limit.

The next qualifying resolution may trigger another degradation.

This prevents one bad roll from jumping an Area multiple states at once.

### 2.7 Disabled Areas

Disabled is the bottom of the normal ladder.

There is no sixth mechanical state.

If a Disabled Area suffers further fictional abuse, the GM/Event may narrate or author consequences appropriate to the situation. There is no universal automatic extra-damage rule.

---

## 3. Area Integrity Bands

Hull, Lifeveil, and Morale use an integrity representation tied to the Area state.

| State | Effective maximum integrity |
|---|---:|
| Stable | 100% |
| Stressed | 90% |
| Damaged | 65% |
| Critical | 25% |
| Disabled | 0% |

The ship sheet must be capable of tracking:

- Base Maximum
- Effective Maximum
- Current Value
- Area State

Recommended cap behavior:

- Degradation lowers Effective Maximum.
- If Current is above the new Effective Maximum, Current falls to the cap.
- Improving the Area state raises Effective Maximum but **does not automatically restore Current**.

Example:

- Hull Base Max = 200
- Hull becomes Damaged
- Effective Max = 130
- Current above 130 is reduced to 130
- Later repairing Damaged -> Stressed raises Effective Max to 180, but Current remains 130 until separately restored

This rule avoids state changes functioning as free healing.

---

## 4. Combat Identity of Each Area

### 4.1 Hull / Battlewatch

Hull already represents the ship's physical HP/structural integrity.

Hull condition also affects all ship attack rolls:

| Hull State | Combat effect |
|---|---|
| Stable | Normal |
| Stressed | -1 to all ship attack rolls |
| Damaged | -3 to all ship attack rolls |
| Critical | -5 to all ship attack rolls |
| Disabled | -10 to emergency/last-ditch ship attack rolls; ship is effectively out of normal combat |

Hull does not need a separate invented movement/defense subsystem on top of this.

### 4.2 Arkengine / Engineer

Arkengine governs powered movement/speed.

| Arkengine State | Combat effect |
|---|---|
| Stable | Full movement |
| Stressed | Engineer -1; Speed -1 hex |
| Damaged | Engineer -3; Speed -3 hex, minimum 1 |
| Critical | Engineer -5; maximum Speed 1 hex |
| Disabled | Recovery/emergency use -10; 0 powered movement |

### 4.3 Rigging / Navigator

Rigging governs maneuverability and facing changes.

Each ship has a base **Facing Allowance**: the number of facing changes it may make during movement without spending extra Actions.

Rigging degradation effectively reduces this allowance by one step at a time. Once the free allowance is exhausted, additional degradation converts facing changes into Action costs with no movement benefit.

Conceptual rule:

- Effective free facing changes = base Facing Allowance reduced by Rigging degradation.
- Once the free allowance falls below zero, each additional step increases the Action cost of a facing change.
- Disabled Rigging prevents voluntary facing changes.

Example for a ship with base Facing Allowance 2:

| Rigging State | Facing effect |
|---|---|
| Stable | 2 free facing changes during movement |
| Stressed | 1 free facing change |
| Damaged | 0 free; 1 Action per facing change |
| Critical | 2 Actions per facing change |
| Disabled | No voluntary facing change |

Example for a ship with base Facing Allowance 1:

| Rigging State | Facing effect |
|---|---|
| Stable | 1 free facing change |
| Stressed | 0 free; 1 Action per facing change |
| Damaged | 2 Actions per facing change |
| Critical | 3 Actions per facing change |
| Disabled | No voluntary facing change |

Exact combat action timing will be finalized when the tactical combat action economy is implemented, but the above degradation principle is locked.

### 4.4 Lifeveil / Veilwarden

Lifeveil uses the universal integrity bands:

`100% -> 90% -> 65% -> 25% -> 0%`

Lifeveil state applies the universal Veilwarden station penalty:

- Stressed: -1
- Damaged: -3
- Critical: -5
- Disabled: -10 recovery/emergency use; Lifeveil offline

The Lifeveil's numerical Current/Base/Effective Max is the primary protection/integrity representation. Avoid creating a redundant second Lifeveil defense track unless Ship Combat later proves one is necessary.

At 0%/Disabled, the Lifeveil is offline. Fictional exposure and special void/environmental consequences are Event/GM/ability dependent.

### 4.5 Morale / Captain

Morale uses the universal integrity bands:

`100% -> 90% -> 65% -> 25% -> 0%`

Recommended simple representation:

| Morale State | Gameplay meaning |
|---|---|
| Stable / 100% | Normal crew coordination |
| Stressed / 90% | Captain -1; crew rattled, otherwise normal cooperative economy |
| Damaged / 65% | Captain -3; reduce Crew Tactic/Reaction availability by one opportunity per round |
| Critical / 25% | Captain -5; maximum one Crew Tactic/Reaction opportunity per round |
| Disabled / 0% | Captain -10 recovery; no Crew Tactics/coordinated reactions; mutiny/rout/refusal/panic becomes possible according to fiction |

0% Morale does **not** automatically mean mutiny.

The GM determines what collapse means for that crew and situation. Possible outcomes include mutiny, panic, surrender, refusal, exhaustion, rout, or another narrative consequence.

---

## 5. Repair

### 5.1 Repair Requires Time + Resources + Check

At sea, Area repair requires:

- time,
- Supplies,
- an appropriate PF2e skill check.

Each successful repair improves the Area by the listed amount.

| Starting State | Repair result | Base Time | Supply Cost |
|---|---|---:|---:|
| Stressed | Stable | 4 hours | 1 |
| Damaged | Stressed | 1 day | 3 |
| Critical | Damaged | 3 days | 5 |
| Disabled | **Damaged** | **10 days** | **10** |

Disabled is intentionally special: a successful 10-day rebuild restores the Area directly to Damaged rather than Critical.

### 5.2 Suggested Repair Skills

Final skill legality may be further authored by ship component/content, but defaults are:

- **Hull:** Crafting
- **Arkengine:** Crafting, Engineering Lore, Arcana
- **Rigging:** Crafting, Sailing Lore, appropriate nautical Lore
- **Lifeveil:** Arcana, Religion, Nature, Occultism
- **Morale:** Diplomacy, Performance, Intimidation, appropriate command/crew Lore

### 5.3 Repair DC

Repair DC is based on the PF2e level-based DC for the **ship's level**, then modified by Area severity:

| Starting State | DC modifier |
|---|---:|
| Stressed | +0 |
| Damaged | +2 |
| Critical | +5 |
| Disabled | +10 |

This should use PF2e level-based DC logic, rather than naively taking an unrelated DC and adding ship level again.

### 5.4 Repair Degrees of Success

**Critical Success**

- Repair succeeds.
- Required time is halved.
- Supply cost is halved, round up, minimum 1.
- Gain a +2 circumstance bonus to the **next repair check on the same Area**.

The +2 follow-up bonus:

- does not stack,
- applies only to the next repair check on that same Area,
- is consumed when used,
- disappears if the crew switches to repairing a different Area before using it.

**Success**

- Repair succeeds.
- Normal time.
- Normal Supply cost.

**Failure**

- No Area improvement.
- Time is spent.
- Half the normal Supply cost is consumed, round up.

**Critical Failure**

- No Area improvement.
- Time is spent.
- Full Supply cost is consumed.
- Ship gains +1 Strain.

### 5.5 Aid

Use native PF2e **Aid**, not a custom d6 bonus.

Normal PF2e Aid rules apply (commonly DC 15, with normal success/critical-success bonuses).

Default limit:

- one primary repairer,
- one primary Aid contribution per repair check.

Other PCs may repair different Areas simultaneously when crew, time, and resources permit.

Talents may later expand the normal Aid limit or improve coordinated work crews.

---

## 6. Port and Shipyard Repair

At sea, repairs consume Supplies.

In port, the crew may spend **money instead of Supplies** for repairs.

A proper shipyard reduces monetary repair cost by **25%**.

Special facilities, talents, mods, factions, or abilities may modify this further.

Special abilities may improve an Area by **one degree** unless explicitly authored otherwise.

---

## 7. Reducing Strain

Reducing Strain and repairing an Area are different actions.

- **Strain reduction** prevents future degradation.
- **Area repair** fixes degradation that has already occurred.

Recommended maintenance structure:

### Routine Maintenance

- Time: 4 hours
- PF2e ship-maintenance check
- No Supply required
- Success: remove 1 Strain
- Critical Success: remove 2 Strain

### Emergency Maintenance

- Time: 1 hour
- Cost: 1 Supply
- Success: remove 1 Strain
- Critical Success: remove 2 Strain
- Failure: Supply spent, no Strain removed
- Critical Failure: Supply spent, +1 Strain

This creates a strategic choice between spending expedition time and spending Supplies.

Arkcraft Skills, Crew Tactics, talents, mods, or authored effects may reduce Strain instantly when explicitly allowed.

### Port/Shipyard Strain

Simply reaching port does not automatically clear Strain.

A proper paid shipyard service/refit may clear remaining Strain as part of the service.

---

## 8. Voyage to Combat Carryover

All Area states and Strain are persistent ship state.

Voyage damage carries directly into Ship Combat.

Examples:

- Damaged Arkengine -> Engineer -3 and Speed -3 hex in combat.
- Critical Rigging -> Navigator -5 and severely restricted facing changes.
- Damaged Hull -> Battlewatch/ship attacks -3 plus reduced Hull integrity.
- Critical Lifeveil -> Veilwarden -5 and Lifeveil capped at 25% effective integrity.
- Damaged Morale -> Captain -3 and reduced Crew Tactic/Reaction economy.

Combat and Voyage must read the same authoritative ship-condition data. Do not build separate duplicate condition systems.

---

## 9. Ship Combat Damage and System Threat

Ship Combat should feed the same shared Strain/Area system.

Recommended base rule:

- Normal hit: deal weapon damage normally.
- Critical hit: deal critical weapon damage and add **+1 Ship Strain**.
- The weapon's **System Threat** identifies the Area threatened if that Strain crosses the threshold.

Weapons may have different System Threat identities, for example:

- Heavy Bombard -> Hull
- Chain Battery / chain shot -> Rigging
- Aether Lance -> Lifeveil
- Resonance Harpoon -> Arkengine
- Crew-sweeper/boarding-focused weapon -> Morale

Special weapon traits may alter the normal rule. Example: a Breaching weapon could add Strain on a normal hit.

Exact weapon families and traits are not yet locked; this is the intended architecture.

---

## 10. Ship Level, Hull/Chassis, Talent Tree, and Mods

Ship progression must be designed against this condition system before final Strain-limit numbers are locked.

### 10.1 Hull/Chassis Establishes the Baseline

Hull/chassis is expected to define or strongly influence:

- Base Hull HP
- Base Lifeveil
- Base Morale
- Base Strain Limit
- Base Speed
- Base Facing Allowance
- Weapon capacity
- Mod slots
- Crew capacity

Different hulls should create meaningfully different vessels before talents and mods are applied.

### 10.2 Ship Level

Target progression remains compatible with a **1-20 ship-level model**.

Ship level should primarily unlock progression choices rather than automatically inflating every stat each level.

### 10.3 Branching Talent Tree

Ship talents should form a **branching progression system**, not five boring linear +1 tracks.

Expected major branches:

- Hull / Battlewatch
- Arkengine / Engineer
- Rigging / Navigator
- Lifeveil / Veilwarden
- Morale / Captain

Cross-branch talents are encouraged.

Talent types may include:

- Passive
- Unlock/new ship or station action
- Reaction
- Base-rule modifier
- Recovery/repair benefit
- Keystone

Possible talent hooks now available include:

- increase Strain Limit,
- prevent/reduce Strain,
- improve Strain recovery,
- ignore a degradation penalty,
- reduce repair Supply cost,
- reduce repair time,
- improve Aid/work crews,
- alter Arkengine speed degradation,
- alter Rigging facing degradation,
- modify Hull attack penalties,
- improve Lifeveil or Morale integrity,
- improve Disabled recovery,
- add Arkcraft/Combat actions.

### 10.4 Mods

Mods remain separate from talents.

- **Talents** = persistent ship development/expertise/design progression.
- **Mods** = physical installable/removable/upgradable/salvageable equipment.

Maintain the existing distinction between:

- **Ship Mods**
- **Arkengine Mods**

Mods may modify Strain Limit, movement, facing, repairs, integrity, weapons, special actions, and other ship capabilities according to authored content.

---

## 11. Player-Facing Repair and Damage Philosophy

The condition system should create meaningful but readable ship problems.

The player should always be able to answer:

- How much Strain does the ship have?
- What is the Strain Limit?
- Which Areas are Stable/Stressed/Damaged/Critical/Disabled?
- What is each Area's Base Max, Effective Max, and Current value where applicable?
- What penalty does the Area currently impose?
- What does that penalty mean in Voyage?
- What does that penalty mean in Ship Combat?
- What will it cost and how long will it take to repair?

Arkcraft Skills and Crew Tactics may allow the crew to fight through damage temporarily, but temporary mitigation does **not** automatically repair the persistent Area state.

---

## 12. Legacy Systems to Remove

The active Voyage/ship gameplay architecture should no longer depend on separate **Pressure** or **Hazard** subsystems.

Pressure/Hazard-era code and authored content should be audited and removed, migrated, or retained only as narrowly scoped backward-compatibility translation where truly required for old persisted data.

Targets for cleanup include, where present:

- Pressure state/tracks
- Pressure UI
- `pressure` authored consequences
- `reduce-highest-pressure`
- Hazard state
- Hazard UI
- hazard guards
- hazard shelters
- suppressed hazards
- Hazard-targeted rewards/abilities that no longer fit the new model

New production Event content must use the Strain/Area contract rather than author new Pressure/Hazard mechanics.

---

## 13. Implementation Plan

Do not continue adding unrelated Voyage mechanics before this backbone is implemented cleanly.

Recommended sequence:

1. Treat this document as the design contract.
2. Audit current ship schema and ship sheet against Base Max / Effective Max / Current / Area State requirements.
3. Design Hull/chassis baselines, ship level progression, branching talent-tree structure, Ship Mods, and Arkengine Mods enough to lock Strain Limit derivation.
4. Add/adjust domain tests for Strain gain, threshold crossing, overflow, one-degradation-per-resolution, Area mapping, persistence, repair, and recovery.
5. Centralize Area degradation and ship-effect resolution into one authoritative domain path.
6. Remove active Pressure mechanics.
7. Remove active Hazard mechanics.
8. Rewrite existing Voyage/Event outcomes to the Strain/Area model.
9. Update Arkcraft Skills, Crew Tactics, Risk benefits, rewards, and tooltips to use the new contract.
10. Update opening/Event/ship-sheet UI to show authoritative Strain and Area state rather than legacy Pressure/Hazard data.
11. Make Ship Combat consume the same Area states and shared Strain pool.
12. Implement combat weapon System Threat behavior.
13. Implement repair/maintenance workflow.
14. Build the branching ship Talent Tree and mods on top of the stable domain model.
15. Remove any remaining migration translator once old persisted content no longer requires it.

---

## 14. Still Open / Not Yet Locked

The following are intentionally still design work, not accidental omissions:

1. Exact Hull/chassis catalog and base Strain Limit values.
2. Exact ship-level progression cadence and talent-point cadence.
3. Exact branching Talent Tree nodes, prerequisites, cross-links, and keystones.
4. Exact Ship Mod slot model and Arkengine Mod slot model.
5. Exact monetary repair-cost formula in port/shipyard.
6. Exact Morale Current-value gain/loss rules outside Area degradation.
7. Exact tactical-combat Action timing for paid facing changes.
8. Exact weapon families, System Threat traits, and which weapons add Strain on normal hits.
9. Exact ship-sheet UI layout for Base Max / Effective Max / Current / condition display.
10. Exact rules for authored emergency behavior of Disabled Areas beyond the baseline 'normal function unavailable' rule.

Everything else in this document is the current agreed backbone and should be treated as the basis for implementation and cleanup.