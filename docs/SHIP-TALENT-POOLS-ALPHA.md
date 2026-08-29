# Arkflight Ship Talent Pools — Alpha Draft

**Status:** Alpha design draft for playtesting  
**Branch:** `feature/ship-event-strain-unification`  

This document replaces the large branching-tree concept with four **tiered talent pools**.

Ship level itself does **not** increase base statistics. Talents are the permanent progression choices that improve those statistics, actions, efficiencies, and rule interactions.

---

## 1. Alpha Pool Structure

| Ship Levels | Talent Tier | Name | Alpha Pool Size | Intended Power |
|---:|---|---|---:|---|
| 1–5 | Tier I | **Foundation** | 25 | Meaningful, straightforward permanent upgrades |
| 6–10 | Tier II | **Specialist** | 20 | Stronger specialization, improved action economy, larger bonuses |
| 11–15 | Tier III | **Legendary** | 15 | Major bonuses and significant rule-changing effects |
| 16–20 | Tier IV | **Mythic** | 10 | Ship-defining, exceptional, controlled rule-breaking abilities |

A ship may purchase talents from its current tier **or any lower unlocked tier**.

The pool is not a branching tree. Tags such as **Voyage**, **Battle**, **Vessel**, and **Crew** are filters for the UI, not separate advancement tracks.

---

## 2. Talent Point Rule

- Ship Level 1 begins with **1 Talent Point**.
- Every ship level grants **1 Talent Point**.
- Levels **5, 10, 15, and 20** grant **1 additional bonus Talent Point**.
- A level 20 ship therefore has **24 Talent Points** before any exceptional authored bonus.
- Talents normally cost **1 Talent Point**.

The Calling / Signature / Legendary / Mythic milestone identity system remains separate from the normal talent pool and does not consume the normal level Talent Point unless later playtesting says otherwise.

---

## 3. Upgrade-Line Rule

Some higher-tier talents are improved versions of lower-tier talents.

When a talent says it **upgrades** another talent, it requires the lower-tier talent and replaces its value rather than stacking the full values together.

Example:

- Foundation `Voyage Trained`: +1 to Voyage station rolls.
- Specialist `Voyage Expert`: upgrades that bonus to +2 total, not +3.

This keeps the pools simple while still allowing a ship to deepen a specialty.

---

# TIER I — FOUNDATION TALENTS

**Levels 1–5**  
**Pool size: 25**

Foundation talents should feel immediately useful. A new ship should change noticeably after buying one.

| # | Talent | Tags | Alpha Effect |
|---:|---|---|---|
| 1 | **Voyage Trained** | Voyage | Gain **+1 to all ship station rolls during Voyage Events**. |
| 2 | **Battle Hardened** | Battle | Gain **+1 ship AC** and **+1 to all ship weapon attack rolls**. |
| 3 | **Reinforced Hull** | Vessel / Hull | Increase maximum **Hull HP by 10**. |
| 4 | **Expanded Lifeveil** | Vessel / Lifeveil | Increase maximum **Lifeveil by 10**. |
| 5 | **Hardened Plating** | Vessel / Defense | Gain **+1 Hardness** against ship-scale damage. |
| 6 | **Tough Ship** | Vessel | Increase maximum **Hull HP by 5** and **Lifeveil by 5**. |
| 7 | **Steady Arkengine** | Vessel / Arkengine | Increase **Strain Limit by 1**. |
| 8 | **Responsive Helm** | Vessel / Rigging | Increase **Facing Allowance by 1**. |
| 9 | **Improved Drive** | Vessel / Arkengine | Increase ship **Speed by 1 hex**. |
| 10 | **Disciplined Crew** | Crew / Morale | Increase maximum **Morale by 10**. |
| 11 | **Damage Control** | Vessel / Repair | Reduce normal repair **time by 25%**. |
| 12 | **Efficient Stores** | Voyage / Supply | Reduce Supply cost of a successful repair by **1 Supply, minimum 1**. |
| 13 | **Calibrated Guns** | Battle / Weapons | Gain **+1 damage per weapon damage die** on ship weapon hits. |
| 14 | **Reinforced Rigging** | Vessel / Rigging | Increase maximum **Rigging integrity by 10**. |
| 15 | **Strengthened Arkengine** | Vessel / Arkengine | Increase maximum **Arkengine integrity by 10**. |
| 16 | **Captain’s Authority** | Crew / Captain | Gain **+1 to Captain station rolls**. |
| 17 | **Engineer’s Touch** | Crew / Engineer | Gain **+1 to Engineer station rolls**. |
| 18 | **Navigator’s Eye** | Crew / Navigator | Gain **+1 to Navigator station rolls**. |
| 19 | **Battlewatch Drill** | Crew / Battlewatch | Gain **+1 to Battlewatch station rolls**. |
| 20 | **Veilwarden’s Ward** | Crew / Veilwarden | Gain **+1 to Veilwarden station rolls**. |
| 21 | **Repair Stores** | Voyage / Repair | The first successful repair during each Voyage costs **1 fewer Supply, minimum 0**. |
| 22 | **Reinforced Systems** | Vessel | Increase maximum **Arkengine, Rigging, and Lifeveil integrity by 5 each**. |
| 23 | **Steady Hands** | Crew / Repair | Gain **+1 to all ship repair checks**. |
| 24 | **Battle Bracing** | Battle / Defense | Gain **+1 AC against the first ship attack that targets you each round**. |
| 25 | **Aether Reserve** | Voyage / Strain | **Once per Event**, reduce Strain gained from one source by **1**. |

### Foundation benchmark

A Foundation talent may comfortably provide one of the following:

- broad **+1** to an important class of rolls,
- **+1 AC**, **+1 attack**, **+1 Hardness**, **+1 Speed**, **+1 Facing**, or **+1 Strain Limit**,
- around **+10** to one major integrity/resource maximum,
- around **+5/+5** split across two related resources,
- a roughly **25%** improvement to a common downtime efficiency,
- a small once-per-Event defensive or Strain effect.

---

# TIER II — SPECIALIST TALENTS

**Levels 6–10**  
**Pool size: 20**

Specialist talents should make the vessel noticeably purpose-built. They can upgrade Foundation talents, combine two Foundation-scale benefits, or unlock strong new ship actions.

| # | Talent | Tags | Alpha Effect |
|---:|---|---|---|
| 1 | **Voyage Expert** | Voyage | Requires Voyage Trained. Upgrade its bonus to **+2 to all Voyage station rolls**. |
| 2 | **Veteran Warship** | Battle | Requires Battle Hardened. Upgrade to **+2 ship AC** and **+2 ship weapon attack rolls** total. |
| 3 | **Heavy Reinforcement** | Vessel / Hull | Requires Reinforced Hull. Upgrade its Hull increase to **+25 HP total**. |
| 4 | **Deep Lifeveil** | Vessel / Lifeveil | Requires Expanded Lifeveil. Upgrade its Lifeveil increase to **+25 total**. |
| 5 | **Armored Belt** | Vessel / Defense | Requires Hardened Plating. Upgrade ship Hardness bonus to **+2 total**. |
| 6 | **High-Strain Architecture** | Vessel / Arkengine | Requires Steady Arkengine. Upgrade Strain Limit increase to **+2 total**. |
| 7 | **High-Output Drive** | Vessel / Arkengine | Requires Improved Drive. Upgrade Speed increase to **+2 hexes total**. |
| 8 | **Master Helm** | Vessel / Rigging | Requires Responsive Helm. Upgrade Facing Allowance increase to **+2 total**. |
| 9 | **Veteran Crew** | Crew | All five station rolls gain **+1**. This does not stack with a station-specific Foundation talent for the same roll; use the better bonus. |
| 10 | **Rapid Damage Control** | Vessel / Repair | Requires Damage Control. Reduce normal repair time by **50% total**. |
| 11 | **Conservative Logistics** | Voyage / Supply | Reduce Supply cost of all successful repairs by **2, minimum 1**. |
| 12 | **Coordinated Broadside** | Battle / Weapons | Unlock a Battlewatch action that coordinates multiple ready weapons into one authored broadside sequence. |
| 13 | **Controlled Overdrive** | Vessel / Arkengine | Unlock an Engineer action that temporarily increases movement/output at an authored Strain risk. |
| 14 | **Emergency Pivot** | Battle / Rigging | **Once per round**, make one facing change without consuming normal Facing Allowance. |
| 15 | **Resonant Shielding** | Vessel / Lifeveil | Spend **1 Strain** to prevent a limited amount of Lifeveil damage or a narrow hostile Veil consequence. |
| 16 | **Specialist Repair Crew** | Crew / Repair | Gain **+2 to repair checks** and critical-success repairs consume **1 additional fewer Supply, minimum 1**. |
| 17 | **Hardened Systems** | Vessel | Increase maximum Arkengine, Rigging, and Lifeveil integrity by **10 each**. |
| 18 | **Strike Their Systems** | Battle / Targeting | Gain **+1 to attacks made specifically to threaten an enemy Area/system** and improve the authored system-threat effect. |
| 19 | **Deep Stores** | Voyage / Supply | Increase effective Supply capacity by an authored amount and ignore the first minor Supply-loss consequence each Voyage. |
| 20 | **Crew Doctrine** | Crew / Tactics | Gain **one additional Crew Tactic/Reaction use per Event or battle**, subject to Morale restrictions. |

### Specialist benchmark

A Specialist talent may comfortably provide:

- broad **+2** where a Foundation talent gave +1,
- roughly **+25** to one major resource maximum,
- **+2** to a core ship stat such as Speed/Facing/Strain Limit through an upgrade line,
- **50%** improvement to a common downtime process,
- a new reusable station Action,
- a meaningful once-per-round combat exception,
- two related Foundation-scale benefits combined into one talent.

---

# TIER III — LEGENDARY TALENTS

**Levels 11–15**  
**Pool size: 15**

Legendary talents should feel like the vessel has become famous for doing something ordinary ships cannot reliably do.

| # | Talent | Tags | Alpha Effect |
|---:|---|---|---|
| 1 | **Master of the Voyage** | Voyage | Requires Voyage Expert. Upgrade to **+3 to all Voyage station rolls** total. |
| 2 | **Legendary Warship** | Battle | Requires Veteran Warship. Upgrade to **+3 ship AC** and **+3 ship weapon attack rolls** total. |
| 3 | **Iron Citadel** | Vessel / Hull | Requires Heavy Reinforcement. Upgrade the Hull bonus to **+50 HP total** and gain **+1 Hardness**. |
| 4 | **Grand Lifeveil** | Vessel / Lifeveil | Requires Deep Lifeveil. Upgrade Lifeveil increase to **+50 total** and gain +1 to Veilwarden recovery checks. |
| 5 | **Adamantine Bracing** | Vessel / Defense | Requires Armored Belt. Upgrade bonus Hardness to **+3 total**. |
| 6 | **Bottomless Heart** | Vessel / Arkengine | Requires High-Strain Architecture. Upgrade Strain Limit increase to **+3 total** and once per Event ignore 1 Strain gained. |
| 7 | **Heart Still Beating** | Vessel / Arkengine | When the Arkengine is **Critical**, it may operate for one round as though Damaged, once per Event/battle. |
| 8 | **She Turns Before Thought** | Battle / Rigging | **Once per round**, reduce by 1 Action the cost of a paid facing change, minimum 0. |
| 9 | **Where Maps End** | Voyage / Exploration | The ship may attempt authored routes and environmental passages that are unavailable to normal vessels. |
| 10 | **No Second Broadside Needed** | Battle / Weapons | **Once per battle**, after a critical success with a ship weapon, immediately gain a limited follow-up attack with another ready weapon. |
| 11 | **They Know Her Name** | Crew / Morale | When Morale would degrade, **once per Event/battle** gain a major crew response before the degradation resolves. |
| 12 | **Master Damage Control** | Vessel / Repair | Successful repairs take **one-quarter normal time**; critical successes also remove **1 Strain**. |
| 13 | **Unbroken Systems** | Vessel | The first time one non-Hull Area would degrade in an Event/battle, treat the triggering Strain threshold as though it had not yet been crossed; usable once per Event/battle. |
| 14 | **Predator’s Mark** | Battle / Targeting | Once an enemy Area is successfully threatened, gain **+2 to further attacks against that same Area** until the end of the round. |
| 15 | **Carry the Expedition** | Voyage / Crew | Once per Voyage, convert one failed Supply, salvage, repair, or crew-survival check into a success; consequences tied to a critical failure are not eligible. |

### Legendary benchmark

A Legendary talent may comfortably provide:

- broad **+3** in a specialized area,
- roughly **+50** to one major resource through an upgrade line,
- **+3 Hardness / Strain / similar core stat** through a committed line,
- an important **once-per-round** Action-economy exception,
- a strong **once-per-Event/battle** rule override,
- permission to attempt things ordinary ships simply cannot attempt.

---

# TIER IV — MYTHIC TALENTS

**Levels 16–20**  
**Pool size: 10**

Mythic talents are meant to be instantly recognizable capabilities of ships of absolute legend. These should be powerful enough to create stories, while remaining bounded by clear uses, triggers, or costs.

| # | Talent | Tags | Alpha Effect |
|---:|---|---|---|
| 1 | **Unmatched Voyager** | Voyage | Requires Master of the Voyage. Upgrade to **+4 to all Voyage station rolls** total. Once per Voyage, turn a failed Voyage station check into a success. |
| 2 | **Ship of War** | Battle | Requires Legendary Warship. Upgrade to **+4 ship AC** and **+4 ship weapon attack rolls** total. Once per battle, ignore all attack penalties from one degraded Area for one round. |
| 3 | **The Unsinkable** | Vessel / Hull | Requires Iron Citadel. Upgrade Hull bonus to **+100 HP total**. Once per battle/Event, when Hull would become Disabled, it remains Critical instead. |
| 4 | **The Unbroken Veil** | Vessel / Lifeveil | Requires Grand Lifeveil. Upgrade Lifeveil bonus to **+100 total**. Once per Voyage/battle, prevent Lifeveil from becoming Disabled; it remains Critical instead. |
| 5 | **Impossible Burn** | Vessel / Arkengine | Once per Voyage or battle, perform a mythic burn: gain a major movement/output increase for one round. Resolve a fixed authored Strain consequence afterward. |
| 6 | **Turn Between Heartbeats** | Battle / Rigging | Once per battle, immediately change the ship’s facing to any legal facing and reposition within a tightly authored short distance without normal maneuver cost. |
| 7 | **King’s Thunder** | Battle / Weapons | Once per battle, execute a mythic broadside that may fire an authored set of ready weapons outside the normal firing sequence. |
| 8 | **The Void Cannot Have Us** | Voyage / Lifeveil | Once per Voyage, transform one catastrophic environmental/Lifeveil consequence into a severe but survivable consequence chosen from an authored list. |
| 9 | **One Crew, One Ship** | Crew | Once per Event or battle, trigger a coordinated response in which up to **three different stations** may each perform one authored support/reaction effect. |
| 10 | **Legend Beyond Measure** | General | Choose one owned Foundation, Specialist, or Legendary talent that provides a numeric bonus. Increase that talent’s final numeric bonus by **1 step** within its existing effect type; GM-visible derived breakdown must show the source. |

### Mythic benchmark

A Mythic talent may comfortably provide:

- broad **+4** in a deeply specialized line,
- **+100** major integrity through a fully invested line,
- preventing Disabled once per battle/Voyage,
- a major once-per-battle or once-per-Voyage action that breaks normal movement/firing rules,
- coordinated multi-station effects,
- controlled transformation of catastrophic consequences.

Mythic should be spectacular, but not unlimited or permanently automatic.

---

## 4. Alpha Distribution Summary

Total initial talent catalog: **70 talents**.

| Tier | Levels | Count |
|---|---:|---:|
| Foundation | 1–5 | 25 |
| Specialist | 6–10 | 20 |
| Legendary | 11–15 | 15 |
| Mythic | 16–20 | 10 |
| **Total** | 1–20 | **70** |

This intentionally provides the most breadth at low levels, where most Void ships live, and progressively fewer but more dramatic choices at high levels.

---

## 5. Alpha Design Principles

1. **Levels gate access; levels do not grant raw stat growth.**
2. **Talents are significant permanent ship improvements.**
3. Foundation talents should already feel worth buying.
4. Higher tiers may upgrade lower-tier lines or introduce new rule-changing abilities.
5. Upgrade-line bonuses replace the lower value rather than fully stacking.
6. Voyage / Battle / Vessel / Crew are UI tags, not separate talent trees.
7. Mods remain the hardware system; Talents represent permanent vessel/crew development.
8. The same persistent ship stats and Area conditions are used in Voyage and Battle.
9. No Pressure or Hazard subsystem is reintroduced through talents.
10. Exact numbers in this document are **alpha balance values** and are expected to move after Foundry playtesting.

---

## 6. Immediate Alpha Implementation Target

For the first playable implementation, the progression UI only needs to support:

- ship level 1–20,
- Talent Points earned / spent / available,
- unlocked tier by level,
- browsing all unlocked talents,
- filters for Voyage / Battle / Vessel / Crew,
- owned talents,
- simple prerequisite/upgrade-line checks,
- deterministic derived-stat application,
- clear source breakdowns on derived values,
- milestone identity fields for Calling / Signature / Legendary / Mythic when those are implemented.

Do **not** build a graphical branching tree for alpha. A searchable/filterable talent pool is the intended design.
