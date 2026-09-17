# Arkflight Ship Conditions & Strain Contract

**Status:** DESIGN LOCK / authoritative gameplay backbone

This document defines the current persistent ship-damage model. Older Area, Pressure, Hazard, and targeted-Strain language is legacy compatibility only and must not be used for new gameplay rules.

---

## 1. Core Model

Arkflight ships use:

- **Hull** — physical Hull Integrity plus Hardness.
- **Drive** — combined propulsion, rigging, helm, and control damage.
- **Weapons** — shipwide gunnery condition.
- **Lifeveil** — fixed 0–100% magical/environmental integrity.
- **Morale** — fixed 0–100% crew resolve.
- **Strain** — one shared vessel-wide push-your-luck pool.
- **Supply** — logistics/cargo resource, not a damage system.

Persistent ship damage is expressed as **Ship Conditions**, similar in purpose to PF2e character conditions. There is no universal Stable → Stressed → Damaged → Critical → Disabled ladder and no universal station penalty.

Hull, Drive, and Weapons have named condition tracks. Lifeveil and Morale derive their condition wording directly from their percentages.

---

## 2. Named Ship Conditions

### 2.1 Hull

Hull Integrity remains the ship's physical HP. Hull Conditions change **Hardness**, not maximum Hull Integrity.

| Hull Condition | Effective Hardness |
|---|---:|
| **Sound** | 100% of base |
| **Battered** | 75% of base |
| **Breached** | 50% of base |
| **Shattered** | 0 |

Fractional Hardness always rounds down.

Examples:

- Hardness 4: 4 → 3 → 2 → 0.
- Hardness 3: 3 → 2 → 1 → 0.

Hull 0 is **Wrecked** and is the universal terminal combat state. A non-Hull Ship Condition never automatically removes a vessel from combat.

### 2.2 Drive

Drive represents Arkengine propulsion, rigging, helm, and control as one damage track. Arkengines and Rigging remain separate equipment/modification families.

| Drive Condition | Speed | Maneuverability |
|---|---:|---:|
| **Responsive** | Normal | Normal |
| **Sluggish** | –1 | Normal |
| **Faltering** | –2 | –1 |
| **Unresponsive** | –3 | –2 |

Speed and Maneuverability cannot be reduced below 0 by Drive Conditions.

An Unresponsive vessel can still remain in combat, fire weapons, be boarded, drift, surrender, or attempt repairs.

### 2.3 Weapons

Weapons Conditions affect all installed ship weapons.

| Weapons Condition | Weapon Attacks | Reload |
|---|---:|---:|
| **Ready** | Normal | Normal |
| **Fouled** | –1 | +1 |
| **Malfunctioning** | –2 | +2 |
| **Barely Operable** | –3 | +3 |

Firing still costs exactly **1 AP**. Weapons Conditions do not increase Fire AP.

Common Reload still spends 1 AP to reduce remaining Reload by 1 round.

**Work the Guns** remains once per round: spend **20% Morale + 1 Strain** to immediately ready one weapon with 2 or fewer rounds of Reload remaining.

---

## 3. Percentage-Derived Conditions

### 3.1 Lifeveil

Lifeveil is always stored as **0–100%**. Its percentage is authoritative; there is no separate Lifeveil damage-state pool or hull-specific maximum.

| Lifeveil | Condition |
|---|---|
| 76–100% | **Stable** |
| 51–75% | **Degraded** |
| 1–50% | **Critical** |
| 0% | **Collapsed** |

Rules:

- A Lifeveil degradation result removes **25 percentage points**.
- Standard authored Lifeveil ability-cost unit: **5 percentage points**.
- Stabilization Success restores **10 percentage points**.
- Stabilization Critical Success restores **20 percentage points**.
- At 0%, Lifeveil environmental/magical protection is offline.

### 3.2 Morale

Morale is always stored as **0–100%**.

The legacy 0–5 scale migrates directly: **1 old Morale point = 20 percentage points**.

| Morale | Condition |
|---|---|
| 100% | **Inspired** |
| 80–99% | **Confident** |
| 60–79% | **Steady** |
| 40–59% | **Shaken** |
| 1–39% | **Faltering** |
| 0% | **Broken** |

Rules:

- A Morale degradation result removes **20 percentage points**.
- Existing 1-Morale costs become **20% Morale**.
- **Work the Guns:** 20% Morale + 1 Strain.
- Safe-rest recovery normally restores 20% only up to 60% (Steady); rest never lowers higher Morale.
- 100% retains the Inspired benefit.
- 0% prevents Crew Tactics until Morale is restored.
- Broken Morale does not automatically mean mutiny; fiction determines panic, refusal, surrender, rout, exhaustion, or another consequence.

---

## 4. Worsening and Improving Conditions

When a rule says a system **degrades**, **worsens**, or suffers **System Degradation**:

- Hull worsens one step: Sound → Battered → Breached → Shattered.
- Drive worsens one step: Responsive → Sluggish → Faltering → Unresponsive.
- Weapons worsens one step: Ready → Fouled → Malfunctioning → Barely Operable.
- Lifeveil loses 25%.
- Morale loses 20%.

A named condition cannot worsen beyond its final stage.

Repair/recovery reverses the appropriate mechanic:

- Hull/Drive/Weapons improve their named Ship Condition.
- Lifeveil restores percentage.
- Morale restores percentage through appropriate crew/recovery rules.
- Hull Integrity repair restores HP separately from Hull Condition repair.
- Strain reduction is maintenance, not condition repair.

---

## 5. Strain

### 5.1 Shared Pool

Strain is one shared ship-wide pool. New rules must not assign Strain to Hull, Arkengine, Rigging, Lifeveil, Morale, or Weapons.

When Strain is added, evaluate the ship's **resulting** Strain percentage.

| Resulting Strain | Result |
|---|---|
| 0–49% | No flat check |
| 50–74% | **DC 5 flat check** |
| 75–89% | **DC 10 flat check** |
| 90–99% | **DC 15 flat check** |
| 100%+ | Automatic degradation; no flat check |

On a failed danger-band flat check, roll the shared 1d8 degradation table.

At 100%+:

1. Skip the flat check.
2. Roll the shared 1d8 degradation table automatically.
3. Subtract one full Strain capacity.
4. Keep overflow Strain.

A single triggering resolution can worsen **at most one** Ship Condition.

If that resolution already caused a condition to worsen directly, its Strain does not cause another degradation or danger-band flat check.

### 5.2 Shared d8 Degradation Table

| d8 | Target |
|---:|---|
| 1 | Hull |
| 2 | Morale |
| 3 | Drive |
| 4 | Drive |
| 5 | Lifeveil |
| 6 | Hull |
| 7 | Weapons |
| 8 | Players choose |

On an 8, the players choose Hull, Drive, Lifeveil, Morale, or Weapons.

### 5.3 Pushed Ability Degrees

For pushed maneuvers/abilities where the maneuver itself still happens:

| Degree | Strain | Direct degradation | Extra Strain check? |
|---|---:|---|---|
| Critical Success | +0 | No | No |
| Success | +1 | No | Yes, if resulting Strain is 50–99% |
| Failure | +1 | One degradation | No |
| Critical Failure | +2 | One degradation | No |

---

## 6. Ship Combat

Normal ship weapon resolution is:

**Attack → Damage → Hardness → Hull Integrity**

Core weapon hits do not directly roll System Threat or degrade a predetermined Area.

A **Critical Success weapon attack adds +1 ship-wide Strain** in addition to its normal critical damage. That Strain uses the same danger bands and d8 table as every other Strain source.

Special authored weapon traits or effects may explicitly worsen a particular Ship Condition, but that is an exception written on the effect—not the default combat rule.

Ship Conditions never add a universal station check penalty. Their listed system-specific consequences are the penalty.

---

## 7. Repair and Recovery

PF2e-style terminology:

- **Worsen a Ship Condition** = move one named condition step worse or apply the percentage loss.
- **Improve a Ship Condition** = move one named condition step better.
- **Remove a Ship Condition** = return Hull/Drive/Weapons to their first state.
- **Restore Lifeveil/Morale** = increase the percentage.
- **Repair Hull Integrity** = restore Hull HP.
- **Reduce Strain** = remove ship-wide stress.

Out-of-combat repair packages and shipyard workflows may define their own time/resource costs, but they must operate through these canonical condition/resource rules rather than reintroducing Areas.

Combat **Emergency Repair** currently supports Hull, Drive, Weapons, or Lifeveil. Morale recovery belongs to Captain/crew recovery effects rather than engineering repair.

---

## 8. Supply

Supply is a standardized bundle of provisions, routine maintenance stock, and normal ship consumables.

- **Base value:** 1 gp per Supply.
- **Cargo:** 10 Supply = 1 Cargo Space.
- **1 Supply:** 0.1 Cargo Space.
- **Daily consumption:** 1 Supply per 10 crew aboard per day, rounded up.
- Supply competes with salvage, spare components, weapons, trade goods, and ordinary cargo.
- A normal-port price is 1 gp; scarcity and authored events may alter market price.

Supply is not a Ship Condition and is not included on the Strain degradation table.

---

## 9. Persistence and Migration

Current persistent condition data:

```js
shipConditions: {
  hull: "sound",
  drive: "responsive",
  weapons: "ready"
}
```

Lifeveil and Morale conditions are derived from their resource percentages and are not stored as duplicate condition states.

Legacy Arkengine/Rigging/Helm damage migrates to **Drive**, using the worst old severity.

Legacy Area/System exports may remain temporarily as compatibility shims, but active gameplay code and new authored content must use Ship Conditions.

Hidden legacy derived fields such as old Lifeveil Capacity may remain temporarily while older components are migrated. They do not define current Lifeveil/Morale/Supply resource maxima.

---

## 10. Player-Facing Summary

A player should be able to read the ship as:

- **Hull:** current/max HP, effective Hardness, named Hull Condition.
- **Drive:** named condition plus resulting Speed/Maneuverability.
- **Weapons:** named condition plus attack/Reload modifier.
- **Lifeveil:** percentage plus derived condition.
- **Morale:** percentage plus derived condition.
- **Strain:** current/max plus visible DC 5 / DC 10 / DC 15 danger thresholds.
- **Supply/Cargo:** current Supply and total Cargo use.

Do not display generic Area penalties or a second condition state for Lifeveil or Morale.
