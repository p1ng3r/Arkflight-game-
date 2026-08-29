# Arkflight Ship Talent Tree — Levels 1–5 Design Lock

**Status:** LOCKED for levels 1–5 design direction  
**Branch:** `feature/ship-event-strain-unification`

This document supersedes earlier temporary Level 1–5 talent-tree mockups where progression was organized around the five stations/Areas.

The locked structure for early ship progression uses **three primary talent trees**:

1. **Combat** — improves ship combat performance and survivability.
2. **Voyage** — improves Voyage/Event play, station checks, Arkcraft access, Event control, exploration, crew operation, Strain management, and related non-combat ship play.
3. **Shipcraft** — improves the physical vessel and Arkengine: Speed, Facing, movement, Strain capacity, Ship Mod slots, Arkengine Mod slots, slot quality/integration, and related vessel systems.

Ship level itself still does **not** increase base statistics.

---

## 1. Talent Point Cadence

Every ship level grants Talent Points using this cadence:

- **Odd levels:** 2 Talent Points
- **Even levels:** 1 Talent Point

Therefore:

| Ship Level | TP gained at level | Total TP through level |
|---:|---:|---:|
| 1 | 2 | 2 |
| 2 | 1 | 3 |
| 3 | 2 | 5 |
| 4 | 1 | 6 |
| 5 | 2 | 8 |

Talents normally cost **1 Talent Point** unless future higher-level design explicitly says otherwise.

A ship may spend Talent Points across any of the three trees. It is not locked to one tree.

---

## 2. Level 5 Calling

At **Level 5**, the ship also chooses a **Calling**. The Calling is a milestone identity and is **not purchased with Talent Points**.

Current Level 5 Calling candidates:

- Voyager
- Explorer
- Raider
- Battle Ship
- Trader
- Expedition Ship

The Calling answers:

> **What kind of ship has this vessel become?**

The three talent trees answer:

> **How has the vessel been built and developed to do that?**

A Raider can therefore be Combat-heavy, Voyage-heavy, Shipcraft-heavy, or hybrid. An Explorer can likewise be built in several mechanically distinct ways.

---

# 3. COMBAT TALENT TREE — LEVELS 1–5

**Purpose:** AC, ship attacks, damage, DR, weapon efficiency, combat reactions, Hull survival, and Lifeveil defense.

The Level 1 Combat talents are simple, visible, immediately useful ship upgrades.

## 3.1 Armor / Defense Branch

### Hardened Armor — Level 1
**Effect:** Ship gains **+1 AC**.

### Reinforced Plating — Level 2
**Prerequisite:** Hardened Armor  
**Effect:** Reduce the first physical damage the ship takes each round by **2**.

### Deflecting Angles — Level 2
**Prerequisite:** Hardened Armor  
**Effect:** Once per round, when an attack total exactly equals the ship's AC, treat that attack as a miss.

### Brace for Impact — Level 3
**Prerequisite:** Reinforced Plating  
**Effect:** Reaction, once per round. Reduce incoming Hull damage by an additional authored amount. Exact reduction value remains a balance number to test.

### Hard Target — Level 3
**Prerequisite:** Deflecting Angles  
**Effect:** After the ship changes facing during its turn, gain **+1 circumstance AC** against the first attack made against it before its next turn.

### Iron Frame — Level 4
**Prerequisite:** One Level 3 Armor/Defense talent  
**Effect:** When Hull becomes Stressed, ignore its combat attack penalty until the end of the current round.

### Bulwark Hull — Level 5
**Prerequisite:** Iron Frame  
**Effect:** Once per battle, when Hull would degrade, delay that degradation until the end of the current round.

### Hold Together — Level 5
**Prerequisite:** Iron Frame  
**Effect:** Once per battle, when Hull damage would reduce current Hull below 25% of base maximum, reduce that single instance of damage by half.

---

## 3.2 Gunnery Branch

### Calibrated Iron Sights — Level 1
**Effect:** Gain **+1 to ship attack rolls**.

### Heavy Shot — Level 2
**Prerequisite:** Calibrated Iron Sights  
**Effect:** Ship weapon attacks gain a small explicit damage increase. Exact damage expression remains a balance number to test against the final ship weapon model.

### Rangefinder Array — Level 2
**Prerequisite:** Calibrated Iron Sights  
**Effect:** Ignore the first range-related attack penalty each round.

### Punching Fire — Level 3
**Prerequisite:** Heavy Shot  
**Effect:** On a Critical Hit, gain an additional offensive benefit. Current direction: additional damage or +1 Strain against the threatened enemy Area when the weapon supports that System Threat.

### Precision Fire — Level 3
**Prerequisite:** Rangefinder Array  
**Effect:** Reduce the penalty for targeting a specific enemy Area by **1**.

### Gunnery Drill — Level 4
**Prerequisite:** One Level 3 Gunnery talent  
**Effect:** Once per round, after Captain successfully supports Battlewatch, the next ship attack gains **+1 circumstance bonus** or an equivalent non-stacking benefit if already receiving a circumstance bonus.

### Devastating Broadside — Level 5
**Prerequisite:** Gunnery Drill  
**Effect:** Once per battle, a multi-weapon broadside gains a major authored damage benefit while still using normal weapon readiness/ammunition rules.

### Called Shot — Level 5
**Prerequisite:** Gunnery Drill  
**Effect:** Once per round, improve targeted-fire effectiveness and improve the consequence of a Critical Hit against a selected enemy Area.

---

## 3.3 Lifeveil Defense Branch

### Energized Lifeveil — Level 1
**Effect:** While Lifeveil is functioning, the vessel gains **DR 1 against Bludgeoning, Piercing, and Slashing damage**.

### Veil Bracing — Level 2
**Prerequisite:** Energized Lifeveil  
**Effect:** Increase Energized Lifeveil's physical DR to **DR 2 against one incoming attack per round**.

### Reactive Lattice — Level 2
**Prerequisite:** Energized Lifeveil  
**Effect:** Once per round, Veilwarden may react to an incoming attack and grant **+1 AC** against that attack.

### Absorb Impact — Level 3
**Prerequisite:** Veil Bracing  
**Effect:** Once per battle, redirect part of an incoming physical hit from Hull into Lifeveil damage instead.

### Flash Ward — Level 3
**Prerequisite:** Reactive Lattice  
**Effect:** Reaction. Gain temporary resistance against one magical/energy attack or comparable hostile effect.

### Veil Fortress — Level 4
**Prerequisite:** One Level 3 Lifeveil talent  
**Effect:** Lifeveil's Stressed-condition penalty does not apply to its defensive reactions.

### Deep Lattice — Level 5
**Prerequisite:** Veil Fortress  
**Effect:** Increase Lifeveil's protective DR by **+1 while Lifeveil is Stable**.

### Shield Surge — Level 5
**Prerequisite:** Veil Fortress  
**Effect:** Once per battle, treat Lifeveil as one condition better until the end of the round.

---

# 4. VOYAGE TALENT TREE — LEVELS 1–5

**Purpose:** Voyage station checks, Arkcraft, Event control, Strain management, exploration, logistics, crew operation, salvage, navigation, and recovery.

The Voyage tree is allowed to unlock **new Arkcraft Skills**. Arkcraft unlock talents must show the player the actual additional Arkcraft options they are gaining.

## 4.1 Station Training Branch

Each Level 1 Station Training option is a separate Talent.

### Command Training — Level 1
**Effect:** Captain gains **+1 to Voyage station rolls**.

### Engine Training — Level 1
**Effect:** Engineer gains **+1 to Voyage station rolls**.

### Navigation Training — Level 1
**Effect:** Navigator gains **+1 to Voyage station rolls**.

### Battlewatch Training — Level 1
**Effect:** Battlewatch gains **+1 to Voyage station rolls**.

### Veil Training — Level 1
**Effect:** Veilwarden gains **+1 to Voyage station rolls**.

### Specialist Training — Level 2
**Prerequisite:** Any Station Training talent  
**Effect:** Choose one trained station. Once per Event, reroll one failed Voyage station check for that station. The second result must be used.

### Cross-Station Training — Level 3
**Prerequisite:** Two different Station Training talents  
**Effect:** Once per round, when one trained station succeeds, another trained station gains **+1 circumstance bonus** to its next check.

### Seasoned Crew — Level 3
**Prerequisite:** Any two Station Training talents  
**Effect:** Once per Event, when a trained station critically succeeds, remove **1 Strain**.

### Veteran Stations — Level 4
**Prerequisite:** Three Station Training talents  
**Effect:** The first station penalty from a Stressed Area each round is reduced by **1**, minimum 0.

### Seasoned Vessel — Level 5
**Prerequisite:** Four Station Training talents  
**Effect:** Gain **+1 to all Voyage station rolls**.

### Coordinated Stations — Level 5
**Prerequisite:** Cross-Station Training  
**Effect:** Once per Event, after one station critically succeeds, grant another unresolved station an immediate authored support opportunity.

---

## 4.2 Arkcraft Branch

### Expanded Arkcraft — Level 1
**Effect:** Choose one station. Add **one additional Arkcraft Skill** to that station's available Event setup choices.

New Arkcraft Skills must be authored as actual visible choices rather than an abstract unlock.

Current example new Arkcraft Skills already drafted for expansion:

- **Captain — Hold the Course:** once per Event, on success choose one unresolved station to gain +1 circumstance bonus to its next Voyage check; on Critical Success choose two different unresolved stations.
- **Engineer — Bleed the Lines:** once per Event, Success removes 1 Strain, Critical Success removes 2 Strain, Critical Failure adds 1 Strain.
- **Navigator — Find the Quiet Current:** once per Event, Success reduces the next Voyage consequence that would add Strain by 1; Critical Success reduces it by 2.

Additional Arkcraft Skills must still be created for Battlewatch and Veilwarden, plus enough additional options to support later Arkcraft-unlock progression.

### Refined Arkcraft — Level 2
**Prerequisite:** Expanded Arkcraft  
**Effect:** Choose one Arkcraft Skill unlocked through this tree. Improve one narrow authored part of its effect.

### Arkcraft Refresh — Level 3
**Prerequisite:** Refined Arkcraft  
**Effect:** Once per Event, refresh one expended Arkcraft Skill after a Critical Success at that station.

### Arkcraft Link — Level 3
**Prerequisite:** Expanded Arkcraft at two different stations  
**Effect:** Once per Event, one station's Arkcraft Skill may create an authored benefit for another station.

### Masterful Use — Level 4
**Prerequisite:** One Level 3 Arkcraft talent  
**Effect:** Once per Event, when using an Arkcraft Skill, improve one degree of its resulting benefit without changing the degree of success of the underlying check.

### Arkcraft Reserve — Level 5
**Prerequisite:** Masterful Use  
**Effect:** Choose one station during Event setup. That station may prepare **two Arkcraft Skills**. Each remains subject to its own once-per-Event usage rule.

### Second Chance — Level 5
**Prerequisite:** Masterful Use  
**Effect:** Once per Event, when an Arkcraft Skill is used on a failed check, that Arkcraft Skill is not consumed.

---

## 4.3 Expedition / Event Operations Branch

### Survey Crew — Level 1
**Effect:** Gain **+1 to Voyage checks specifically involving discovery, scouting, navigation hazards, wrecks, routes, or unknown phenomena**.

### Prepared Stores — Level 1
**Effect:** Once per Voyage, reduce one Supply expenditure by **1**, minimum 0.

### Route Knowledge — Level 2
**Prerequisite:** Survey Crew  
**Effect:** Once per Voyage, reroll one failed check involving route selection, navigation, or avoiding a known travel hazard. Use the second result.

### Salvage Teams — Level 2
**Prerequisite:** Prepared Stores  
**Effect:** Gain **+1** to salvage/recovery checks and improve salvage yield on a Critical Success.

### Deep Survey — Level 3
**Prerequisite:** Route Knowledge  
**Effect:** On a successful discovery/navigation check, reveal **one additional useful detail, route, danger, opportunity, or piece of information** appropriate to the Event.

### Efficient Supplies — Level 3
**Prerequisite:** Prepared Stores  
**Effect:** The first Supply cost of each Voyage Event is reduced by **1**, minimum 1.

### Expedition Ready — Level 4
**Prerequisite:** One Level 3 Expedition/Event Operations talent  
**Effect:** Once per Event, declare the ship prepared for an appropriate environmental, salvage, or exploration challenge and gain an authored situational advantage.

### Pathfinder Crew — Level 5
**Prerequisite:** Expedition Ready  
**Effect:** Once per Voyage, downgrade one route/environmental consequence by one step after it is revealed.

### Self-Reliant Vessel — Level 5
**Prerequisite:** Expedition Ready  
**Effect:** Once per Voyage, complete one minor field repair or expedition task without consuming its normal Supply cost.

---

# 5. SHIPCRAFT TALENT TREE — LEVELS 1–5

**Purpose:** Speed, Facing, movement, Strain capacity, physical ship integration, Ship Mod slots, Arkengine Mod slots, slot quality, and Mod synergy.

Shipcraft is where the vessel's actual mechanical architecture changes. These changes are explicit Talent effects; they are **not passive level scaling**.

## 5.1 Propulsion Branch

### Tuned Drive — Level 1
**Effect:** Increase ship Speed by **+1 hex**.

### Efficient Drive — Level 2
**Prerequisite:** Tuned Drive  
**Effect:** Once per round, one normal movement action may ignore the first **1 hex of Speed lost from Arkengine degradation**.

### Hot-Burn Injectors — Level 2
**Prerequisite:** Tuned Drive  
**Effect:** Once per round, gain **+1 additional hex of movement**. Using this while Arkengine is Stressed or worse adds **1 Strain**.

### Deep Reserve — Level 3
**Prerequisite:** Efficient Drive  
**Effect:** Once per Event, when an Engineer failure would add Strain, reduce that Strain by **1**.

### Overdrive Control — Level 3
**Prerequisite:** Hot-Burn Injectors  
**Effect:** When using an overdrive/burn action, reduce its Strain consequence on a Success or Critical Success according to the final authored overdrive rules.

### Engine Mastery — Level 4
**Prerequisite:** One Level 3 Propulsion talent  
**Effect:** Once per round, treat Arkengine as one condition better **for purposes of Speed only**.

### High-Output Drive — Level 5
**Prerequisite:** Engine Mastery  
**Effect:** Gain another **+1 Speed while Arkengine is Stable**.

### Strain Capacity — Level 5
**Prerequisite:** Engine Mastery  
**Effect:** Increase ship **Strain Limit by +1**.

---

## 5.2 Handling Branch

### Responsive Helm — Level 1
**Effect:** Gain **+1 Facing Allowance while Rigging is Stable**.

### Fine Helm — Level 2
**Prerequisite:** Responsive Helm  
**Effect:** Retain the +1 Facing Allowance from Responsive Helm while Rigging is Stressed.

### Hard Turn — Level 2
**Prerequisite:** Responsive Helm  
**Effect:** Once per round, reduce the Action cost of one paid facing change by **1**, minimum 0.

### Slip the Wake — Level 3
**Prerequisite:** Fine Helm  
**Effect:** After moving at least half Speed, make one free facing change once per round.

### Quick Pivot — Level 3
**Prerequisite:** Hard Turn  
**Effect:** Reaction. After an enemy completes movement near the ship, immediately change one facing if Rigging is not Critical or Disabled.

### Master Helm — Level 4
**Prerequisite:** One Level 3 Handling talent  
**Effect:** Once per round, ignore one level of Rigging maneuver penalty.

### Perfect Turn — Level 5
**Prerequisite:** Master Helm  
**Effect:** Once per round, perform one facing change during movement without counting it against Facing Allowance.

### Emergency Pivot — Level 5
**Prerequisite:** Master Helm  
**Effect:** Once per battle, immediately change up to **two facings**, even if normal Facing Allowance has already been spent.

---

## 5.3 Modding / Integration Branch

### Expanded Ship Fittings — Level 1
**Effect:** Gain **+1 Ship Mod slot**.

### Expanded Arkengine Fittings — Level 1
**Effect:** Gain **+1 Arkengine Mod slot**.

### Reinforced Slot — Level 2
**Prerequisite:** Expanded Ship Fittings or Expanded Arkengine Fittings  
**Effect:** Choose one existing Mod slot. That slot may accept a Mod **one integration tier higher than normally allowed**, subject to final Mod-tier rules.

### Advanced Integration — Level 2
**Prerequisite:** Expanded Ship Fittings or Expanded Arkengine Fittings  
**Effect:** Choose one installed Mod and reduce/remove one minor authored drawback associated with that Mod.

### Dual Fit — Level 3
**Prerequisite:** Expanded Ship Fittings  
**Effect:** Choose one specifically authored pair of compatible Ship Mods. They gain a small synergy while both are installed.

### Mod Synergy — Level 3
**Prerequisite:** Expanded Arkengine Fittings or Advanced Integration  
**Effect:** One Arkengine Mod may improve a related Ship Mod, or one Ship Mod may improve a related Arkengine Mod, where an authored synergy exists.

### Integrated Systems — Level 4
**Prerequisite:** One Level 3 Modding/Integration talent  
**Effect:** Choose one Mod family. Mods from that family gain an additional narrow authored integration benefit.

### Specialist Bay — Level 5
**Prerequisite:** Integrated Systems  
**Effect:** Add **one specialized Ship Mod slot** usable only for one chosen category such as weapon, exploration, cargo, repair, Lifeveil, or another authored category.

### Expanded Integration — Level 5
**Prerequisite:** Integrated Systems  
**Effect:** Choose one Mod slot. Increase the maximum Mod integration tier that slot can support by one step permanently.

---

# 6. Level 1 Design Rule

Level 1 talents should generally be immediately legible and useful.

Good Level 1 examples:

- +1 Ship AC
- +1 ship attack rolls
- DR 1 physical while Lifeveil functions
- +1 to a specific Voyage station's rolls
- unlock one additional Arkcraft Skill for one station
- +1 to discovery/scouting Voyage checks
- reduce one Supply expenditure once per Voyage
- +1 Speed
- +1 Facing Allowance while Rigging is Stable
- +1 Ship Mod slot
- +1 Arkengine Mod slot

Level 1 talents should not already feel legendary or create complicated multi-stage rules.

---

# 7. Levels 2–5 Design Rule

Levels 2–5 should deepen the simple Level 1 purchase into a recognizable build.

The progression shape is:

```text
Level 1: clear baseline improvement
   ↓
Level 2: choose how that improvement develops
   ↓
Level 3: gain an active rule, reaction, efficiency, or stronger specialization
   ↓
Level 4: consolidate the branch into a stronger identity
   ↓
Level 5: strong Foundation-tier payoff + choose Calling
```

A Level 5 ship should feel meaningfully customized while still belonging to the **common/standard vessel tier** of Arkflight ship progression.

---

# 8. Example Level 5 Builds

A Level 5 ship has **8 total Talent Points** available from levels 1–5.

### Combat-heavy Battle Ship candidate

- Hardened Armor
- Reinforced Plating
- Brace for Impact
- Calibrated Iron Sights
- Heavy Shot
- Punching Fire
- Responsive Helm
- Hard Turn

Then choose **Battle Ship** as the Level 5 Calling.

### Voyage-heavy Explorer candidate

- Navigation Training
- Veil Training
- Survey Crew
- Route Knowledge
- Deep Survey
- Expanded Arkcraft
- Tuned Drive
- Responsive Helm

Then choose **Explorer** as the Level 5 Calling.

### General-purpose vessel candidate

- Hardened Armor
- Calibrated Iron Sights
- Engineer Training
- Navigator Training
- Expanded Arkcraft
- Tuned Drive
- Responsive Helm
- Expanded Ship Fittings

The system intentionally allows hybrid ships.

---

# 9. Locked vs Balance-Tuning

## Locked design direction

The following are now locked for levels 1–5:

1. Three primary trees: **Combat / Voyage / Shipcraft**.
2. Odd levels grant **2 TP**; even levels grant **1 TP**.
3. Level 1 begins with **2 TP**.
4. Level 5 cumulative total is **8 TP**.
5. Talents may be freely mixed across the three trees.
6. Level 5 Calling is separate from Talent Point spending.
7. Level itself does not automatically increase base stats.
8. Combat tree contains AC, attack, damage, DR, combat-defense and weapon progression.
9. Voyage tree contains station-roll improvements, Arkcraft unlocks, Event/Voyage control, exploration, supplies, salvage, crew, and Strain interaction.
10. Shipcraft contains Speed, Facing/movement, Strain capacity, Ship Mod slots, Arkengine Mod slots, Mod integration and system development.
11. Level 1 talents should be simple and immediately understandable.
12. Levels 2–5 branch and deepen those Level 1 choices.
13. Expanded Arkcraft must grant actual visible Arkcraft Skill choices.
14. The same persistent ship state remains authoritative across Voyage and Ship Combat.

## Still subject to balance/playtest

The following exact numbers/effects may be tuned without changing the locked tree architecture:

- exact damage bonus from Heavy Shot
- exact Brace for Impact reduction
- exact Punching Fire critical effect
- exact broadside mechanics
- exact resistance values against magical/energy damage
- exact support opportunity produced by Coordinated Stations
- exact Mod integration tier terminology
- exact overdrive interaction
- exact PF2e circumstance-bonus stacking language where implementation requires native-system compliance
- final names of individual talents
- final names/mechanics of the six Level 5 Callings

Any tuning should preserve the role and placement of the talent unless a later explicit design decision reopens this lock.
