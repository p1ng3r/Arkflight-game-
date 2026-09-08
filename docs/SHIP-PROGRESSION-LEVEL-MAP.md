# Arkflight Ship Progression — 20-Level Talent Map

**Status:** Design map for current combat/progression rebuild.  
**Branch:** `dev`  
**Purpose:** Reconcile the existing 70 ship talents with the current 20-level ship progression, current shared AP/RP combat economy, current ship-defense progression, and the locked Level 5 ship Calling concept.

This document does **not** change runtime code by itself. It is the implementation map to use before rewriting `src/content/ship-talents.js`, progression validation, persistence, and the progression UI.

---

## 1. Core progression retained

Keep the current 20-level Talent Point cadence:

- Level 1 grants 2 TP.
- Every later odd level grants 2 TP.
- Every even level grants 1 TP.
- Level 5 = 8 TP total.
- Level 10 = 15 TP total.
- Level 15 = 23 TP total.
- Level 20 = 30 TP total.

Keep the four broad talent tiers:

- Foundation: levels 1–5
- Specialist: levels 6–10
- Legendary: levels 11–15
- Mythic: levels 16–20

Change talent access so individual talents also have their own `minLevel` instead of every talent in a tier unlocking simultaneously.

---

## 2. Status legend

- **KEEP** — current identity and core mechanical effect can remain. Add level/prerequisite metadata as needed.
- **UPGRADE** — talent belongs in an upgrade line. The stronger talent replaces the weaker mechanical effect instead of stacking with it.
- **REWRITE** — keep the talent identity/name, but its rule needs a significant rewrite for the current system.
- **REPLACE** — retire the current mechanic and substitute a different talent because the existing effect duplicates or conflicts with a subsystem that now owns that math.

---

## 3. System rules this map assumes

1. Hull remains the primary source of base ship identity, including base AP/RP, base Hardness, base Speed, base Maneuverability, weapon mounts, and chassis values.
2. Ship level contributes the current authored ship-defense progression. Talents do not duplicate automatic level progression.
3. Weapon Potency / weapon construction owns permanent weapon hardware accuracy. Talents should not create large stacks of permanent attack bonuses.
4. Hardness remains primarily a hull/chassis property. Talents may improve bracing, mitigation, survival, or damage-control behavior rather than casually adding permanent Hardness.
5. Shared ship AP/RP remain scarce. Talents may grant at most **+1 permanent AP** and **+1 permanent RP** in total from progression.
6. Move and Maneuver are separate AP purchases. Permanent Speed/Maneuverability increases are allowed beginning at Specialist, but higher tiers should increasingly change rules rather than only increase numbers.
7. Morale is a small discrete resource. Percentage increases to Morale maximum are removed.
8. Related capacity and movement talents use replacement chains rather than additive stacking.
9. Normal campaign progression treats purchased talents as persistent. Free removal remains an Alpha/GM respec tool, not the final campaign rule.
10. Calling progression is separate from ordinary Talent Points.

---

# 4. Foundation — Levels 1–5

Foundation establishes crew identity, basic resilience, logistics, and operating habits. It should not grant Speed, Maneuverability, Strain Limit, Mod slots, permanent AP, or permanent RP.

## Level 1 — Station identity

| Talent | Status | Direction |
|---|---|---|
| Captain's Vessel | KEEP | +1 Captain station rolls in Voyage and Combat. |
| Engineer's Vessel | KEEP | +1 Engineer station rolls in Voyage and Combat. |
| Navigator's Vessel | KEEP | +1 Navigator station rolls in Voyage and Combat. |
| Battlewatch Vessel | KEEP | +1 Battlewatch station rolls in Voyage and Combat. |
| Veilwarden's Vessel | KEEP | +1 Veilwarden station rolls in Voyage and Combat. |

These are the simplest permanent ship/crew identity choices and belong at Level 1.

## Level 2 — Basic vessel endurance and stores

| Talent | Status | Direction |
|---|---|---|
| Toughness | KEEP | +10% base Hull maximum. First step in the Hull endurance line. |
| Reinforced Lifeveil | KEEP | +10% base Lifeveil maximum. First step in the Lifeveil endurance line. |
| Repair Trained | KEEP | +1 to persistent ship repair checks. |
| Spare Stores | KEEP | +10% base Supply capacity. |
| Expanded Cargo | KEEP | +10% base Cargo capacity. |

## Level 3 — Operational doctrine

| Talent | Status | Direction |
|---|---|---|
| Voyage Trained | KEEP | +1 all station rolls during Voyage Events. |
| Battle Trained | KEEP | +1 all station rolls during Ship Combat. |
| Defensive Bracing | REWRITE | Improve the benefit of the ship's Brace/mitigation action rather than maintain an orphaned flat `defensiveCheckBonus`. Exact mitigation number is balance content. |
| Efficient Repair Crews | KEEP | Reduce ordinary persistent repair time by 10%. |
| Efficient Stores | KEEP | Reduce routine Supply consumption by 10%. |

Station-specific and pillar-wide bonuses may stack, but Foundation should not add additional broad flat station bonuses beyond these two layers.

## Level 4 — Improved endurance and crew coordination

| Talent | Status | Direction |
|---|---|---|
| Greater Frame | UPGRADE | Requires Toughness. Hull endurance bonus becomes **+20% base Hull total**, replacing Toughness' +10%; do not stack +10% and +20%. |
| Deep Veil Reservoir | UPGRADE | Requires Reinforced Lifeveil. Lifeveil endurance bonus becomes **+20% base Lifeveil total**, replacing the +10%; do not stack both. |
| Frugal Repairs | KEEP | Reduce ordinary repair Supply cost by 10%. |
| Steady Command | REWRITE | Replace flat +1 Captain/+1 Battlewatch stacking. Once per Event/combat round, a successful Captain action may grant Battlewatch +1 circumstance to its next qualifying roll, or vice versa. One transfer per round. |
| Technical Crew | REWRITE | Replace flat +1 Engineer/+1 Veilwarden stacking. Once per Event/combat round, a successful Engineer action may grant Veilwarden +1 circumstance to its next qualifying roll, or vice versa. One transfer per round. |

## Level 5 — Foundation capstones plus Calling

| Talent | Status | Direction |
|---|---|---|
| Hardened Construction | REWRITE | Stop adding permanent Hardness. When the ship Braces or performs a qualifying damage-control action, improve mitigation against the next structural hit before the start of its next turn. |
| Battle Hardened | REWRITE | Stop adding permanent AC + permanent attack. First time each round Hull becomes Stressed or worse, ignore the resulting combat penalty until the end of that round; exact affected penalty hooks follow the Area-condition contract. |
| Weapon Calibration | REPLACE | Replace with **Fire-Control Calibration**: once per round, one weapon attack made under a qualifying firing solution gains a conditional +1 circumstance bonus (for example optimal range / proper target lock). Potency remains the permanent hardware-accuracy progression. |
| Crew Quarters | REWRITE | Remove percentage Morale maximum. Improve Morale recovery after safe rest and/or prevent 1 fatigue-related Morale loss once per Voyage. |
| Reinforced Decks | REWRITE | Remove the split +5% Hull/+5% Morale math. Once per Voyage or battle, when Hull degradation would also cause Morale loss, reduce that Morale loss by 1, minimum 0. |

---

# 5. Level 5 Calling — separate from Talent Points

At Level 5 the ship chooses exactly one Calling. This choice costs **no ordinary TP** and answers: **What kind of ship has this vessel become?**

The existing six locked Calling identities remain the Level 5 baseline:

1. **Battle Ship** — heavier armament, better battle survival, deliberate combat action economy.
2. **Raider** — pursuit, disabling fire, boarding pressure, exploitation of wounded targets.
3. **Trader** — cargo, established routes, routine operating efficiency.
4. **Voyager** — endurance, stores, maintenance, long-haul survival.
5. **Explorer** — survey systems, information advantage, discovery, unknown-route play.
6. **Expedition Ship** — field support, specialists, repair/salvage/mission equipment.

### Current-combat reconciliation

- Battle Ship's Battle Stations feature spends/reduces the current shared ship AP economy and may never reduce an activity below 1 AP.
- Raider free facing changes use the current six-heading token model. A free facing change means one legal 60-degree heading change and does not consume a purchased Maneuver allowance unless the feature explicitly says otherwise.
- Trader/Voyager travel benefits remain distinct from tactical Combat Speed.
- Explorer/Expedition specialized slots need explicit slot-class/tag support in the Shipwright layer rather than becoming unrestricted Flexible slots.
- Cargo changes must continue to feed the cargo-load mobility rules rather than AP/RP.

### Future Calling milestones reserved

- Level 10 — Signature Calling feature
- Level 15 — Legendary Calling evolution
- Level 20 — Mythic Calling capstone

Those later Calling features are separate design work. They should grow from the Level 5 identity rather than replace it.

---

# 6. Specialist — Levels 6–10

Specialist is where the vessel's operating envelope and purpose-built refit begin changing.

## Level 6 — Mobility, strain, tactics

| Talent | Status | Direction |
|---|---|---|
| Improved Drive | KEEP | +1 Combat Speed. First step in the Speed line. |
| Responsive Rigging | KEEP | +1 Maneuverability. First step in the handling line. |
| Deep Strain Reserves | KEEP | +1 Strain Limit. First step in the Strain line. |
| Expanded Tactical Doctrine | KEEP | +1 Crew Tactic capacity. |

## Level 7 — Typed support/refit space

| Talent | Status | Direction |
|---|---|---|
| Expanded Utility Bay | KEEP | +1 Utility Mod slot. |
| Expanded Support Bay | KEEP | +1 Support Mod slot. |
| Expanded Rigging Bay | KEEP | +1 Rigging Mod slot. |
| Expanded Lifeveil Bay | KEEP | +1 Lifeveil Mod slot. |

Level 7 also already contains an automatic ship-defense proficiency step in current progression code, so it does not need another broad numerical combat talent spike.

## Level 8 — Major physical refits

| Talent | Status | Direction |
|---|---|---|
| Expanded Weapon Mount | KEEP | +1 Weapon Mod slot. This is a Ship Mod slot, not a new hull weapon firing arc. |
| Expanded Structural Bay | KEEP | +1 Structural Mod slot. |
| Engineer's Refit | KEEP | +1 Arkengine Mod capacity. Preserve Arkengine as a separate modification family. |
| Major Refit | KEEP | +1 Flexible Ship Mod slot. |

## Level 9 — Advanced station Arkcraft

All five station options unlock together to avoid arbitrary station favoritism.

| Talent | Status | Direction |
|---|---|---|
| Advanced Captain Arkcraft | KEEP | Unlock Captain Specialist Arkcraft. |
| Advanced Engineer Arkcraft | KEEP | Unlock Engineer Specialist Arkcraft. |
| Advanced Navigator Arkcraft | KEEP | Unlock Navigator Specialist Arkcraft. |
| Advanced Battlewatch Arkcraft | KEEP | Unlock Battlewatch Specialist Arkcraft. |
| Advanced Veilwarden Arkcraft | KEEP | Unlock Veilwarden Specialist Arkcraft. |

## Level 10 — Specialist mastery plus Signature Calling milestone

| Talent | Status | Direction |
|---|---|---|
| Mastered Arkcraft | UPGRADE | Requires at least one Advanced Station Arkcraft talent. Grants one authored Specialist Arkcraft upgrade choice. |
| Specialist Voyage Systems | UPGRADE | Requires Voyage Trained. Upgrade the Voyage pillar bonus from +1 to **+2 total** rather than adding another separate +1. |
| Specialist Battle Systems | REPLACE | Replace permanent +1 AC/+1 attack with **Battle Systems Integration**: at the start of each ship turn choose Targeting or Bracing. Targeting improves the first qualifying weapon attack that round by +1 circumstance; Bracing improves the first qualifying defensive/mitigation check that round by +1 circumstance. No permanent AC or weapon-attack stack. |

Level 10 also receives the ship's future Signature Calling feature.

---

# 7. Legendary — Levels 11–15

Legendary progression may change action economy and introduce strong rule changes, but hull identity must remain visible.

## Level 11 — Legendary operating envelope

| Talent | Status | Direction |
|---|---|---|
| Legendary Drive | UPGRADE | Requires Improved Drive. Replace the +1 Speed line with **+2 Speed total from this line**; do not stack +1 and +1 as independent effects. |
| Legendary Rigging | UPGRADE | Requires Responsive Rigging. Replace the +1 Maneuverability line with **+2 Maneuverability total from this line**. |
| Legendary Strain Reserve | UPGRADE | Requires Deep Strain Reserves. Replace the +1 Strain line with **+2 Strain Limit total from this line**. |

## Level 12 — Legendary Arkcraft

All five station options unlock together. Each requires the corresponding Advanced Station Arkcraft talent.

| Talent | Status | Direction |
|---|---|---|
| Perfected Arkcraft | UPGRADE | Requires Mastered Arkcraft. Grants one authored Specialist-to-Legendary Arkcraft upgrade choice. |
| Legendary Captain Arkcraft | KEEP | Requires Advanced Captain Arkcraft. Unlock Legendary Captain Arkcraft. |
| Legendary Engineer Arkcraft | KEEP | Requires Advanced Engineer Arkcraft. Unlock Legendary Engineer Arkcraft. |
| Legendary Navigator Arkcraft | KEEP | Requires Advanced Navigator Arkcraft. Unlock Legendary Navigator Arkcraft. |
| Legendary Battlewatch Arkcraft | KEEP | Requires Advanced Battlewatch Arkcraft. Unlock Legendary Battlewatch Arkcraft. |
| Legendary Veilwarden Arkcraft | KEEP | Requires Advanced Veilwarden Arkcraft. Unlock Legendary Veilwarden Arkcraft. |

## Level 13 — Shared combat economy

| Talent | Status | Direction |
|---|---|---|
| Expanded Action Economy | KEEP | +1 permanent ship AP per round. Hard cap: progression may contribute no more than +1 permanent AP total. |
| Expanded Reaction Economy | KEEP | +1 permanent ship RP per round. Hard cap: progression may contribute no more than +1 permanent RP total. |
| Legendary Tactical Network | KEEP | +1 Crew Tactic capacity. |

Level 13 also already contains an automatic ship-defense proficiency step.

## Level 14 — Legendary endurance

| Talent | Status | Direction |
|---|---|---|
| Iron Legend | UPGRADE | Requires Greater Frame. Hull endurance line becomes **+30% base Hull total**, replacing earlier +10%/+20% effects. |
| Veil of Legend | UPGRADE | Requires Deep Veil Reservoir. Lifeveil endurance line becomes **+30% base Lifeveil total**, replacing earlier +10%/+20% effects. |

## Level 15 — Crew mastery plus Legendary Calling milestone

| Talent | Status | Direction |
|---|---|---|
| Master Crew | REWRITE | Remove permanent +1 to every station roll. Once per Event round / combat round, one station that succeeds may immediately Support a different station's next qualifying action without spending additional ship AP; the supported action gains the normal authored support benefit. |

Level 15 also receives the future Legendary Calling evolution.

---

# 8. Mythic — Levels 16–20

Mythic talents should break ordinary ship rules in limited, memorable ways instead of mainly producing larger passive numbers.

## Level 16 — Impossible movement

| Talent | Status | Direction |
|---|---|---|
| Impossible Burn | REWRITE | Remove passive +2 Speed. Once per battle, when purchasing Move, overburn the Arkengine to exceed the normal movement allowance for that purchased Move; the extra distance causes authored Strain. Exact extra-distance/Strain numbers are balance content. |
| Turn Between Heartbeats | REWRITE | Remove passive +2 Maneuverability. Once per battle, perform an extraordinary heading change during movement that does not consume the normal Maneuverability allowance; exact number of 60-degree steps is balance content. |

## Level 17 — Mythic survival

| Talent | Status | Direction |
|---|---|---|
| The Ship Will Not Die | UPGRADE | Requires Iron Legend. Hull endurance line becomes **+50% base Hull total**, not cumulative +10/+20/+30/+50. Add once-per-battle mythic survival: when Hull would be reduced to destruction/0, remain at 1 Hull and resolve the appropriate severe consequence instead. |
| The Void Cannot Have Us | UPGRADE | Requires Veil of Legend. Lifeveil endurance line becomes **+50% base Lifeveil total**. Add once-per-battle mythic veil survival: when Lifeveil would collapse from a single effect, retain 1 Lifeveil and resolve the appropriate severe consequence instead. |

## Level 18 — Mythic tempo and reserves

| Talent | Status | Direction |
|---|---|---|
| Legendary Tempo | REWRITE | Remove permanent +1 AP/+1 RP. Once per battle at the start of the ship's turn, gain +1 temporary AP and +1 temporary RP for that round only. This does not increase permanent progression AP/RP caps. |
| Endless Reserve | UPGRADE | Requires Legendary Strain Reserve. Strain line becomes **+3 Strain Limit total** from progression, replacing earlier +1/+2 values. Once per Voyage or battle, reduce one incoming Strain gain by 1. |

## Level 19 — Mythic crew and voyage control

| Talent | Status | Direction |
|---|---|---|
| One Crew, One Ship | REWRITE | Remove permanent +2 to every station roll. Once per round, after one station succeeds, a different station may inherit that momentum: +1 circumstance to its next qualifying roll before round end, or the authored non-roll equivalent. |
| Master of the Black | REPLACE | Remove +3 to all Voyage station rolls. Replace with **Beyond Ordinary Routes**: once per Voyage, reroll one failed qualifying Voyage check or downgrade one revealed route/environment consequence by one step. This is a rule-changing Voyage feature, not another permanent PF2e math bonus. |

Level 19 also already contains the final automatic ship-defense proficiency step.

## Level 20 — Mythic capstones plus Mythic Calling milestone

| Talent | Status | Direction |
|---|---|---|
| Mythic Broadside | REWRITE | Remove passive +3 weapon attack. Once per battle, one qualifying Fire action may include one additional ready weapon on the same legal broadside without additional AP. Both weapons still obey legal arc/range and enter their normal reload state. Exact multi-weapon targeting limits are tied to the final firing rules. |
| Mythic Refit | KEEP / EXPAND | Keep +1 Flexible Ship Mod slot and +1 Arkengine Mod capacity. Add one authored Mythic Integration rule later so this is more than raw capacity, but do not create a second weapon-mount system or bypass unique/exclusive Mod rules. |

Level 20 also receives the future Mythic Calling capstone.

---

# 9. Required upgrade lines

The following lines are mutually superseding mechanical progressions. A ship may retain all purchased talent IDs for prerequisite/history purposes, but only the strongest owned effect in a line applies.

### Hull endurance

`Toughness -> Greater Frame -> Iron Legend -> The Ship Will Not Die`

Total progression bonus by step:

- Toughness: +10% base Hull
- Greater Frame: +20% base Hull total
- Iron Legend: +30% base Hull total
- The Ship Will Not Die: +50% base Hull total plus mythic survival

### Lifeveil endurance

`Reinforced Lifeveil -> Deep Veil Reservoir -> Veil of Legend -> The Void Cannot Have Us`

Total progression bonus by step:

- Reinforced Lifeveil: +10% base Lifeveil
- Deep Veil Reservoir: +20% total
- Veil of Legend: +30% total
- The Void Cannot Have Us: +50% total plus mythic survival

### Speed

`Improved Drive -> Legendary Drive -> Impossible Burn`

- Improved Drive: +1 permanent Speed
- Legendary Drive: +2 permanent Speed total from this line
- Impossible Burn: retain Legendary Drive's permanent value and add the limited mythic overburn rule; do not add another passive +2

### Maneuverability

`Responsive Rigging -> Legendary Rigging -> Turn Between Heartbeats`

- Responsive Rigging: +1 permanent Maneuverability
- Legendary Rigging: +2 permanent Maneuverability total from this line
- Turn Between Heartbeats: retain Legendary Rigging's permanent value and add the limited mythic turning rule; do not add another passive +2

### Strain

`Deep Strain Reserves -> Legendary Strain Reserve -> Endless Reserve`

- Deep Strain Reserves: +1 Strain Limit
- Legendary Strain Reserve: +2 total from this line
- Endless Reserve: +3 total from this line plus limited Strain reduction

### Voyage pillar

`Voyage Trained -> Specialist Voyage Systems`

- Voyage Trained: +1 Voyage pillar
- Specialist Voyage Systems: +2 Voyage pillar total, not +1 plus a second +1 effect

### Arkcraft mastery

`Advanced Station Arkcraft -> Mastered Arkcraft -> Perfected Arkcraft`

Station-specific advanced/legendary unlocks remain separate visible choices; Mastered/Perfected are upgrade-choice capacity rather than another direct station roll modifier.

---

# 10. Permanent numerical stacking limits

To preserve PF2e-style bounded math and keep hull/components meaningful:

- Station identity bonus: maximum +1 from one station-specific vessel talent.
- Pillar bonus: Foundation +1, Specialist upgrade may raise Voyage to +2 total. Do not create additional Mythic +3 flat pillar stacks.
- Weapon attack: permanent talent stacking should be removed. Weapon Potency and explicit conditional circumstance bonuses own this space.
- AC: ordinary talents should not create a chain of permanent AC bonuses on top of hull + level + defense proficiency. Calling or conditional combat effects may still grant authored AC benefits.
- Hardness: do not use progression as a generic permanent Hardness ladder.
- AP: maximum +1 permanent from progression.
- RP: maximum +1 permanent from progression.
- Speed line: maximum +2 permanent from progression before temporary/mythic effects.
- Maneuverability line: maximum +2 permanent from progression before temporary/mythic effects.
- Hull and Lifeveil percentages: use strongest-owned replacement effect, never sum the entire line.

---

# 11. Talent data model required

The current talent record needs enough metadata to express real progression rules.

Recommended structure:

```js
{
  id,
  name,
  tier,
  cost,
  minLevel,
  description,

  prerequisites: [],
  upgradeOf: null,
  replacesEffectOf: [],
  exclusiveWith: [],
  callingRequirement: null,

  scope: "voyage" | "combat" | "persistent" | "refit",
  frequency: null | "once-per-round" | "once-per-battle" | "once-per-voyage" | "once-per-event",

  effects: [],
  capabilities: []
}
```

`canAccessTalent()` must check `minLevel` and prerequisites, not just tier minimum.

`validateProgression()` must reject:

- missing prerequisites
- illegal Calling requirements
- mutually exclusive purchases
- purchases below `minLevel`
- total TP overspend
- dangling upgrade chains where the prerequisite was removed during a respec

`applyTalentProgression()` must suppress superseded effects in upgrade lines.

---

# 12. Calling persistence required

The persistent ship progression payload needs a Calling identity.

Recommended shape:

```js
progression: {
  level: 1,
  xp: 0,
  talentIds: [],
  arkcraftUpgrades: {},

  callingId: null,
  callingEvolution: {
    signature: null,
    legendary: null,
    mythic: null
  }
}
```

The Level 5 Calling is selected once in normal campaign play. Alpha/GM tools may reset it for testing.

---

# 13. Progression UI changes required

The progression UI should stop presenting every talent in an unlocked five-level tier as immediately purchasable.

Each talent row needs clear lock reasons such as:

- `LEVEL 8`
- `REQUIRES TOUGHNESS`
- `REQUIRES IMPROVED DRIVE`
- `REQUIRES RAIDER CALLING`
- `INCOMPATIBLE WITH ...`
- `NEED 2 TP`

The UI should show upgrade lines as relationships rather than unrelated stacking cards.

Owned talents should not be freely removable in normal campaign mode. Recommended behavior:

- GM/Alpha mode: refund/reset allowed.
- Normal play: talents persistent.
- Future campaign respec: shipyard/extended refit/retraining workflow.

Removing a prerequisite during GM respec must either cascade-refund descendants or block the removal.

---

# 14. Implementation order

1. Add `minLevel`, prerequisites, upgrade metadata, frequency/scope metadata to the talent data contract.
2. Add Calling persistence and migration defaults.
3. Update access/validation logic.
4. Implement upgrade-effect suppression.
5. Rewrite/replace the conflicting talent mechanics in this map.
6. Add Level 5 Calling persistence/UI using the six locked identities.
7. Update progression UI lock reasons and upgrade-line presentation.
8. Add regression tests for level gates, TP budgets, prerequisites, superseding upgrade effects, AP/RP caps, and Calling persistence.
9. Only after the progression contract is stable, author Level 10/15/20 Calling evolutions.

---

# 15. Existing-talent disposition count

All 70 current talents are accounted for in this map:

- Foundation: 25
- Specialist: 20
- Legendary: 15
- Mythic: 10
- Total: 70

The intent is to preserve as much authored identity and lore as possible while removing the parts that conflict with the current ship combat, defense, weapon, Hardness, movement, Morale, and action-economy models.
