# Arkflight Game — Core Design Authority

Status: **Initial rebuild design lock**

This document defines the game that the clean Arkflight rebuild is trying to prove. It intentionally describes player-facing rules before architecture.

## 1. Design Promise

Arkflight is a cooperative fantasy ship-encounter game for Foundry VTT using PF2e characters.

Five officers operate one vessel under pressure. The fun comes from making a crew plan, taking calculated risks, arranging station order so officers can help one another, building group Momentum, surviving accumulating Pressure and Hazards, and deciding when to commit each station's once-per-encounter Signature Ability.

The system should create table talk such as:

> “Captain, go before me. If you land that opening, I can take the dangerous route.”

If a mechanic does not strengthen that experience, it must justify its complexity before being added.

---

## 2. Core Encounter Loop

Every encounter follows this shape:

1. **Situation** — The GM reveals the current crisis, objective, threats, and round conditions.
2. **Planning** — Each station selects its action, approach where applicable, Risk Bid, and one Signature Ability for the encounter.
3. **Order** — The crew arranges station resolution order and sees authored station-to-station benefits.
4. **Resolution** — Stations resolve in order using PF2e checks. Earlier successes may improve later station actions.
5. **Crew State** — Results change Momentum, Pressure, Hazards, and authored encounter state.
6. **Escalation** — The round changes the fiction and presents the next situation until the encounter closes.

Shorthand:

**Plan → Risk → Order → Roll → Chain → Momentum / Pressure → Escalate**

---

## 3. Stations

The five core stations are:

### Captain
Command, coordination, morale, decisive intervention, and crew-wide direction.

### Engineer
Arkengine operation, repairs, overdrive, power distribution, and controlled mechanical risk.

### Navigator
Course finding, positioning, route selection, timing, and exploiting openings in the environment.

### Watchmaster
Detection, threat assessment, weapons/readiness coordination, hazard anticipation, and tactical warning.

### Veilwarden
Lifeveil, Airskin, magical defenses, aetheric stabilization, supernatural hazards, and protection from void effects.

Stations should feel mechanically different without becoming separate minigames.

---

## 4. Planning Phase

Planning is a major gameplay phase, not a form to click through.

Each station chooses:

- one authored **Action** for the current round;
- an **Approach** when that action supports meaningful alternatives;
- an optional **Risk Bid** if the action offers one;
- one **Signature Ability** from the station's currently available Signature pool for this encounter.

The crew must be able to see each other's choices before locking the plan.

The planning UI should make crew conversation easy and expose meaningful interactions without forcing players to inspect hidden rules text.

---

## 5. Station Order

After selections are visible, the crew chooses the order in which stations resolve.

Order is one of Arkflight's primary tactical mechanics.

Authored actions may create benefits for another station, especially a station acting later in the sequence. These benefits should be clearly visible while arranging the order.

Example:

**Captain → Navigator → Engineer → Watchmaster → Veilwarden**

If the Captain's selected action can grant the Navigator +2 on success, that relationship should be visible before the plan is locked.

Order should create questions such as:

- Who needs to act first to create an opening?
- Which station is making the most dangerous attempt?
- Who can make that attempt safer?
- Is a larger Risk Bid worth changing the order?

---

## 6. Risk Bids

Risk represents how hard an officer is willing to push an action for greater payoff.

Risk Bids are authored per action. Not every action needs every tier.

Typical authored tiers may include values such as:

- Normal
- +2
- +5
- +8

A higher Risk Bid increases the challenge or danger while increasing the authored reward, effect, or downstream benefit.

Risk should create ambition, not bookkeeping.

A Risk Bid must tell the player clearly:

- what becomes harder or more dangerous;
- what greater benefit is being attempted;
- what additional consequence may occur if appropriate.

---

## 7. Momentum

Momentum is a **crew resource** and a core mechanic.

Momentum represents how well the officers are functioning together and how much successful execution is carrying forward through the encounter.

Initial target range:

**0 to +3**

Momentum should be highly visible to the entire crew.

Momentum may rise through successful authored actions and may fall through failures or encounter effects. Exact gain/loss triggers are authored by encounter rules and will be tuned through playtesting.

Momentum exists to make one officer's success matter to everyone else.

It must remain simple. It should not become a large spend economy or a second character sheet.

Design identity:

**Momentum = crew mastery.**

---

## 8. Pressure

Pressure represents the ship and its systems being driven toward failure.

Pressure is the primary opposing group state to Momentum.

Different ship systems may carry their own Pressure where that distinction matters, such as Arkengine or Lifeveil Pressure.

Failures, risky choices, Hazards, and authored consequences can increase Pressure.

Thresholds may cause Breaches, complications, or other immediate fictional/gameplay consequences.

Pressure should create visible danger and hard choices, not hidden accounting.

Design identity:

**Pressure = cost and deterioration.**

---

## 9. Hazards

Hazards are active encounter problems that change what the crew must deal with.

Examples include collapsing wreckage, heat, hostile creatures, gravity distortions, failing rigging, void phenomena, fires, or magical interference.

Hazards should alter decisions, create consequences, or change station opportunities. They should not exist only as passive modifier lists.

Design identity:

**Hazards = changing battlefield.**

---

## 10. Signature Abilities

The old Focus system is removed.

There are:

- no Focus points;
- no generic Focus check;
- no four-degree Focus modifier table;
- no universal pre-roll Focus reaction window.

Instead, each station has a pool of **Signature Abilities**.

### Selection

During the Planning / Order phase, each officer selects **one Signature Ability for the encounter** from the abilities currently available to that station.

### Use

The selected Signature Ability may be used **once during that encounter** unless an ability explicitly says otherwise.

After use it becomes **Expended**.

### Purpose

A Signature Ability represents a station expert taking control at a decisive moment.

Design identity:

**Signature Ability = station mastery.**

### Initial Design Direction

Signature Abilities should manipulate different parts of the core game rather than all being generic bonuses.

Examples of design territory:

- Captain — outcome, coordination, Momentum, command;
- Engineer — Risk, Arkengine Pressure, overdrive, repair;
- Navigator — DC/course/order/positioning;
- Watchmaster — Hazards, threat anticipation, openings;
- Veilwarden — Pressure mitigation, Lifeveil, supernatural consequences.

Exact ability lists are not locked by this document and should be authored/tested separately.

---

## 11. Rooms and Ship Mods

Rooms, ship modifications, relics, upgrades, and similar ship features may unlock additional Signature Abilities for one or more stations.

Their default purpose is to add **new choices**, not inflate the number of Signature uses.

Example:

A base Engineer might have three available Signature Abilities. Installing an experimental Arkengine manifold might add **Redline** to the Engineer's available pool.

The Engineer still selects only one Signature for the encounter.

This lets ship construction change how the crew plays without creating a screen full of permanent bonuses.

Design principle:

**Ship upgrades should prefer new decisions over bigger numbers.**

---

## 12. Resolution

Once the plan is locked, stations resolve in the chosen order.

The resolution UI should emphasize one active station at a time and clearly show:

- selected Action;
- selected Approach;
- selected Risk Bid;
- current Momentum;
- relevant earned station benefits;
- relevant Hazard effects;
- selected Signature Ability and whether it is Available or Expended;
- the PF2e check being made;
- the immediate result and consequence.

Resolution should move quickly.

The game should not stop for generic reaction prompts merely because an ability could theoretically be used. Only a specifically authored reactive Signature Ability should interrupt another station's resolution.

---

## 13. PF2e Relationship

Arkflight uses PF2e characters and PF2e checks rather than replacing them with a separate dice engine.

The ship encounter provides context, tactical sequencing, authored DCs/effects, Momentum, Pressure, Hazards, Risk Bids, station links, and Signature Abilities.

PF2e remains responsible for the character's actual skills and check resolution wherever practical.

---

## 14. First Playable Vertical Slice

The rebuild will prove one complete encounter before broad campaign architecture is added.

Preferred donor encounter: **Glassback Cinderwake**, adapted from the previous Arcflight development repository rather than copied wholesale with its old runtime.

The first playable slice must support:

1. encounter start;
2. round situation display;
3. five stations;
4. action selection;
5. approach selection where authored;
6. Risk Bid selection;
7. Signature Ability selection;
8. visible crew planning;
9. station-order arrangement;
10. plan lock;
11. station-by-station PF2e resolution;
12. station-link benefits;
13. Momentum changes;
14. Pressure changes;
15. Hazards;
16. Signature use and expenditure;
17. round escalation;
18. encounter completion.

If this loop is not enjoyable and understandable in Foundry, development returns to the game loop before adding more architecture.

---

## 15. Explicitly Not Carried Forward as Core Requirements

The clean rebuild does **not** inherit previous architecture merely because it already exists.

The following are not prerequisites for the first playable build:

- the old Focus subsystem;
- generic Focus reactions;
- enormous session-runtime contracts;
- exhaustive hostile-state validation;
- sophisticated replay reconstruction;
- deep provenance ledgers;
- correction/recovery frameworks for every transition;
- catastrophic breakdown campaign architecture;
- Void Scar campaign architecture;
- elaborate closeout persistence;
- milestone documentation that exceeds the game rules themselves.

Some of these ideas may return later if actual play demonstrates a need for them.

---

## 16. Complexity Rule

Every new system must answer:

1. What player decision does this create?
2. Does it make the crew feel more like one ship's officers?
3. Can players understand it from the interface without reading a contract document?
4. Is its implementation complexity proportional to its gameplay value?
5. Does the first playable encounter actually need it?

If the answer to #5 is no, defer it.

---

## 17. Current Mechanical Identities

The core systems should remain distinct:

- **Order = teamwork**
- **Risk = ambition**
- **Momentum = crew mastery**
- **Pressure = cost**
- **Hazards = changing battlefield**
- **Signature Abilities = station mastery**

Those identities are the current design spine of the rebuild.
