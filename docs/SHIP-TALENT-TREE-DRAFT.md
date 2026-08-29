# Arkflight Ship Talent Tree Draft

**Status:** Active design draft — progression tree structure and milestone identity abilities  
**Branch:** `feature/ship-event-strain-unification`  
**Related:** `docs/SHIP-PROGRESSION-TALENTS-MODS.md`, `docs/SHIP-CONDITION-STRAIN-CONTRACT.md`

---

## 1. Core Rule

Ship level does not raise base statistics by itself.

A ship gains capability through:

- Talent Points
- milestone identity abilities
- Ship Mods
- Arkengine Mods
- explicit unique vessel features

Hull/chassis and installed systems continue to define the vessel's base Hull, Lifeveil, Morale, Speed, Facing, Strain Limit, hardpoints, and mod capacity.

---

## 2. Level Progression Skeleton

A ship has 20 levels.

At every level after 1, the ship gains **1 Talent Point**.

At levels **5, 10, and 15**, the ship also gains a **free milestone ability**. Milestone abilities do not cost Talent Points.

Level 20 grants access to a final Mythic Keystone talent; whether it is a free capstone or purchased with a Talent Point remains open for final balance testing.

| Level | Progression |
|---:|---|
| 1 | Off-the-lot vessel; no earned Talent Points |
| 2 | +1 Talent Point |
| 3 | +1 Talent Point |
| 4 | +1 Talent Point |
| 5 | +1 Talent Point + **Ship Calling** milestone ability |
| 6-9 | +1 Talent Point each level; Specialist talents unlock |
| 10 | +1 Talent Point + **Signature Ability** milestone |
| 11-14 | +1 Talent Point each level; Legendary talents unlock |
| 15 | +1 Talent Point + **Legendary Identity Ability** milestone |
| 16-19 | +1 Talent Point each level; Mythic talents unlock |
| 20 | +1 Talent Point + access to final Mythic Keystone |

Milestone abilities are meant to mark major identity changes, not raw-stat increases.

---

## 3. Level 5 — Ship Calling

At level 5 the crew defines what kind of ship this vessel has become.

This is the first major identity choice and should be visible on the ship sheet.

A Calling is not the Hull class. A cutter, galleon, courier, or barge can become any Calling if its development and play history support it.

Initial Callings:

1. **Voyager** — endurance, long-range travel, Strain management, keeping the ship moving.
2. **Battle Ship** — weapons, combat readiness, coordinated offense, surviving a fight.
3. **Explorer** — unknown routes, hostile environments, discovery, special navigation and Lifeveil play.
4. **Trader** — cargo, commerce, efficient provisioning, profitable routes, negotiation and logistics.
5. **Raider** — pursuit, ambush, boarding support, escape, opportunistic combat.
6. **Expedition Ship** — field repairs, salvage, crew flexibility, self-sufficiency away from port.

The list can expand later, but level 5 should always answer:

> **What is this ship known for doing?**

### Calling Ability Pattern

Each Calling grants one free ability at level 5. The ability should alter play without increasing every related base number.

#### Voyager — Long Haul Discipline

Once per Voyage, after a successful Strain-reduction maintenance check, remove **1 additional Strain**.

Purpose: makes Voyager ships better at surviving long chains of Events without simply granting permanent Strain capacity.

#### Battle Ship — Battle Stations

Once per ship combat, when combat begins, choose one station. That station ignores the penalty from **Stressed** Area condition until the end of the first round.

Purpose: immediate combat readiness without increasing weapon damage or base defenses.

#### Explorer — Sound the Unknown

Once per Event, before a station makes a check against an unknown route, environmental threat, ancient site, or Void phenomenon, reveal one useful piece of authored information about the danger and grant that station **+1 circumstance bonus** to the check.

Purpose: rewards information play and exploration rather than raw movement.

#### Trader — Trim the Ledger

When Supplies are spent for routine ship maintenance or a successful non-Disabled Area repair, reduce the Supply cost by **1, minimum 1**, once per repair/maintenance project.

Purpose: operating efficiency and logistics.

#### Raider — Strike and Break Away

Once per combat, after the ship makes a successful attack, it may perform one normally free Facing change immediately if its Rigging state still permits voluntary maneuvering.

Purpose: hit-and-run identity without granting permanent Speed.

#### Expedition Ship — Field Workshop

Once per Voyage, when a repair check succeeds while away from port, reduce the repair time by **25%** without increasing Supply cost.

Purpose: self-sufficiency in remote operations.

---

## 4. Level 10 — Signature Ability

At level 10 the ship has become a true specialist vessel.

The level-10 milestone should answer:

> **What can this ship do that ordinary ships of the same Calling cannot?**

The ship keeps its level-5 Calling. At level 10 it chooses **one of two Signature Ability paths** within that Calling.

This creates divergence between ships sharing the same broad identity.

### Voyager Signatures

**Deep-Run Endurance**  
Once per Voyage, when Strain would cross the ship's Strain Limit, reduce the triggering Strain by 1 before resolving the threshold.

**Relentless Passage**  
Once per Voyage, after completing an Event, immediately perform Routine Maintenance in half the normal time.

### Battle Ship Signatures

**Coordinated Broadside**  
Once per combat, after one ship weapon attack succeeds, another eligible weapon may gain +1 circumstance bonus to its next attack against the same target before the end of the round.

**Brace for Impact**  
Once per combat, when a combat-generated Strain threshold would degrade Hull, prevent that degradation. Strain is still spent normally.

### Explorer Signatures

**Impossible Route**  
Once per Voyage, the Navigator may treat one Rigging degradation state as one step better for a single movement or Event check.

**Veil Survey**  
Once per Event, the Veilwarden may treat one hostile environmental or magical consequence as one degree less severe for purposes of the Lifeveil system.

### Trader Signatures

**Efficient Hold**  
Once per Voyage, when Supplies would be consumed by maintenance or repair, refund 1 Supply after the activity resolves, minimum final expenditure 1.

**Master of Contracts**  
Once per port visit, gain a circumstance bonus or authored favorable adjustment on one ship-related commerce, provisioning, freight, or service negotiation. Exact PF2e integration to be defined with the port/trade system.

### Raider Signatures

**Predator's Turn**  
Once per combat round after dealing ship weapon damage, spend 1 fewer Action, minimum 0, on the next paid Facing change that round.

**Boarding Window**  
Once per combat, after a successful close-range attack or maneuver creates a boarding opportunity, improve the crew's first boarding setup advantage. Exact PF2e handoff benefit remains to be defined with boarding rules.

### Expedition Ship Signatures

**Make Do**  
Once per Voyage, substitute an appropriate recovered/salvaged material package for up to 2 Supply of one successful ship repair.

**All Hands to the Work**  
Once per repair project, allow a second PC to Aid the same primary repair check. Only the better Aid bonus applies unless a later talent explicitly says otherwise.

---

## 5. Level 15 — Legendary Identity Ability

At level 15 the vessel has become the subject of stories.

The level-15 milestone should answer:

> **Why does the Void remember this ship by name?**

This ability should be powerful, clearly visible in play, and connected to the ship's Calling, but should not simply multiply base statistics.

### Voyager — She Always Comes Through

Once per Voyage, when an Area would become Disabled because of a Voyage-generated Strain threshold, it becomes **Critical** instead. The ship gains 1 Strain after the threshold resolves.

### Battle Ship — Dreaded Silhouette

Once per combat, declare the ship's legendary battle posture at the start of a round. Until the end of that round, Hull degradation attack penalties are reduced by one step for ship attacks: Disabled remains emergency-only, Critical counts as Damaged, Damaged as Stressed, Stressed as Stable.

### Explorer — Beyond the Known Chart

Once per Voyage, the crew may attempt passage through an otherwise impassable or normally prohibited environmental route if the fiction permits any conceivable path. The Event still requires checks and consequences; this ability creates the opportunity rather than automatic success.

### Trader — The Name Opens Doors

Once per port, market, or major settlement, the vessel's reputation may secure access to one normally restricted commercial opportunity, buyer, supplier, berth, contract, or service, subject to GM-authored setting limits. This does not make goods free.

### Raider — They Never See the Second Pass

Once per combat, after completing a movement and attack sequence, the ship may immediately change facing once without consuming a free Facing allowance or Action, provided Rigging is not Disabled.

### Expedition Ship — We Build Our Way Home

Once per Voyage, after a successful repair of a Critical or Disabled Area while away from port, immediately remove 1 Strain and reduce the next repair project's Supply cost by 1, minimum 1.

---

## 6. Talent Tree Structure Around the Milestones

The milestone Calling is separate from the five station/Area branches.

A Voyager is not forced into Arkengine talents. A Battle Ship is not forced into Hull talents. The crew can build combinations such as:

- Battle Ship + Rigging-heavy talents = duelist / pursuit warship
- Battle Ship + Morale-heavy talents = disciplined line vessel
- Explorer + Lifeveil-heavy talents = hostile-environment specialist
- Explorer + Arkengine-heavy talents = deep-range survey ship
- Trader + Rigging-heavy talents = fast courier merchant
- Trader + Hull-heavy talents = armored convoy vessel
- Raider + Arkengine-heavy talents = pursuit predator
- Expedition + Morale-heavy talents = highly organized mobile workshop

The Calling describes the ship's **role**. Talents describe **how it performs that role**.

---

## 7. Five Branches — First Talent Skeleton

These are the first tree nodes, not final balance values.

### Hull / Battlewatch

**Foundation**
- **Steady Gun Decks:** ignore the first -1 Hull attack penalty from Stressed condition once per combat round.
- **Damage-Control Drill:** gain +1 circumstance bonus to one Hull repair check per repair project.
- **Hardpoint Discipline:** once per round, one ship attack may ignore a minor situational penalty caused by vessel movement.

**Specialist**
- **Brace the Batteries:** reaction; when Hull degrades, one currently armed weapon remains fully usable until the end of the round.
- **System Hunter:** when using a weapon with System Threat, gain an authored improvement to the critical-hit system effect once per combat.
- **Crossfire Orders:** unlock a coordinated attack Action involving Battlewatch and Captain.

**Legendary**
- **Fighting Ship:** once per combat, treat Hull condition as one step better for ship attack penalties for one round.
- **Hold the Line:** when Hull would become Disabled, enable one final emergency Battlewatch response before normal Disabled consequences apply.

**Mythic**
- **No Gun Falls Silent:** mythic Battlewatch keystone; severe Hull damage cannot automatically remove all offensive options while at least one weapon system remains physically intact. Exact limits require combat implementation testing.

### Arkengine / Engineer

**Foundation**
- **Clean Burn:** once per round/Voyage context, gain a narrow benefit when operating without adding Strain.
- **Reinforced Mounts:** +1 circumstance bonus to Arkengine repair checks.
- **Vent Lines:** improve one Strain-reduction maintenance activity per Voyage.

**Specialist**
- **Efficient Burn:** endurance path; improve Strain management during movement/long travel.
- **Hot Burn:** aggressive path; unlock stronger movement at explicit Strain risk.
- **Emergency Feed:** reaction; temporarily power another Area from the Arkengine at a Strain cost.

**Legendary**
- **Controlled Overdrive:** once per Event/combat, use an overdrive effect with reduced failure consequence.
- **Keep Her Turning:** treat Critical Arkengine as Damaged for one movement activation once per combat/Voyage scene.

**Mythic**
- **Heart of the Vessel:** mythic Arkengine keystone; once per Voyage, prevent one Arkengine degradation threshold and convert it into an authored emergency effect instead.

### Rigging / Navigator

**Foundation**
- **Tight Helm:** once per round, reduce the Action cost of one paid Facing change by 1, minimum 0.
- **Balanced Rig:** +1 circumstance bonus to Rigging repair checks.
- **Read the Drift:** gain a narrow positioning benefit after a successful Navigator maneuver.

**Specialist**
- **Pursuit Rig:** improve positioning while closing distance.
- **Evasion Rig:** improve positioning while breaking away or avoiding arcs.
- **Emergency Pivot:** unlock a costly facing change that remains available while Rigging is Critical but not Disabled.

**Legendary**
- **Turn Inside Them:** once per combat, perform an additional Facing change beyond normal free allowance.
- **Impossible Line:** once per Voyage Event, treat one paid Facing change as free if it directly answers an authored navigation threat.

**Mythic**
- **Where No Ship Should Turn:** mythic Navigator keystone; once per combat/Voyage scene, perform a legal voluntary facing maneuver regardless of normal Facing allowance and Action cost, provided Rigging is not Disabled.

### Lifeveil / Veilwarden

**Foundation**
- **Steady Lattice:** +1 circumstance bonus to Lifeveil repair checks.
- **Veil Discipline:** once per Event, gain a narrow bonus against a hostile environmental consequence.
- **Shared Shelter:** improve one protection/support action involving another station.

**Specialist**
- **Hardened Veil:** reduce one Lifeveil-specific degradation consequence once per Voyage.
- **Resonant Shelter:** Arkengine/Lifeveil synergy; spend Strain to strengthen a Veil response.
- **Seal the Breach:** unlock emergency Lifeveil stabilization while Critical.

**Legendary**
- **Sanctuary in the Black:** once per Voyage, treat Lifeveil condition as one step better against one environmental consequence.
- **Nothing Gets Through:** reaction; once per Event/combat, prevent one special hostile effect from bypassing normal Lifeveil protection.

**Mythic**
- **A World Beneath the Veil:** mythic Veilwarden keystone; once per Voyage, sustain limited Lifeveil protection through a Disabled state long enough to resolve one emergency scene/action. Exact duration requires implementation testing.

### Morale / Captain

**Foundation**
- **Clear Orders:** +1 circumstance bonus to one Captain recovery/command check per Event.
- **Work the Watches:** improve one crew maintenance or recovery activity.
- **Steady Hands:** once per Event, protect one Crew Tactic/Reaction opportunity from a Stressed Morale consequence.

**Specialist**
- **Drilled Crew:** improve coordinated station action efficiency.
- **Damage-Control Teams:** improve repair cooperation and Aid options.
- **Hold Fast:** once per Event, suppress one Morale degradation penalty for one round.

**Legendary**
- **Every Hand Knows the Ship:** once per Voyage, allow a crew member to support a station outside the normal expected role for one authored action.
- **Not While I Command:** once per Event, treat Critical Morale as Damaged for Crew Tactic/Reaction availability for one round.

**Mythic**
- **The Crew Is the Ship:** mythic Captain keystone; once per Voyage, the crew may continue coordinated actions for one round while Morale is Disabled. The Disabled state remains and must still be repaired/recovered afterward.

---

## 8. Cross-Branch Talent Skeleton

Cross-branch talents begin at Specialist tier.

- **Helmsman's Redline** — Arkengine + Rigging: burn and maneuver interaction.
- **Broadside Discipline** — Hull + Morale: coordinated attack economy.
- **Veiled Passage** — Rigging + Lifeveil: hostile-route maneuvering.
- **Damage-Control Teams** — Hull + Morale: better emergency repair teamwork.
- **Resonant Shielding** — Arkengine + Lifeveil: convert engine output/Strain into protection.
- **Pursuit Doctrine** — Arkengine + Hull: movement into attack setup.
- **Survey Rhythm** — Rigging + Morale: coordinated exploration checks.
- **Living Machine** — Arkengine + Morale: crew-assisted emergency engine operation.

Cross-branch prerequisites and exact effects remain to be balanced after the base combat and repair loops are implemented.

---

## 9. Design Guardrails

1. Level alone never increases base stats.
2. Callings are free milestone identities, not paid talents.
3. Level 5 describes what the ship is known for.
4. Level 10 creates specialization within that Calling.
5. Level 15 creates a legendary reputation-defining ability.
6. Talents and Callings must create actions, reactions, efficiency, choices, or narrow exceptions before raw-number inflation.
7. Hull/chassis and installed systems remain the base-stat authority.
8. Mods remain separate physical components.
9. A high-level small ship can remain physically smaller/weaker than a low-level heavy vessel while being much more capable.
10. No Calling forces investment into any one station branch.
11. Milestone abilities should be usable and memorable, not passive +1s whenever possible.
12. Any talent that changes Strain, degradation, repair, movement, Facing, or attack penalties must use the shared Ship Condition & Strain contract.

---

## 10. Open Decisions Before Implementation

The following are intentionally not yet locked:

- whether level 20 grants a free vessel-specific Mythic capstone in addition to its normal Talent Point
- final list of level-5 Callings; six are drafted here
- exact PF2e numerical integration for Trader commerce and Raider boarding abilities
- final number of talents per branch and prerequisite topology
- whether a ship may ever change its Calling through a major refit/story event
- whether level-10 and level-15 milestone choices are permanently locked or may be retrained through major downtime/refit
- exact UI presentation of branching talents and milestone Calling choices

These should be resolved before production implementation of the talent system.