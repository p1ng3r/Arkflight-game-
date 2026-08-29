# Arkflight Ship Level 5 Specializations — Locked Design

**Status:** Locked design for the level-5 specialization milestone.  
**Branch:** `feature/ship-event-strain-unification`  
**Related:** `docs/SHIP-TALENT-TREE-LEVELS-1-5-LOCK.md`, `docs/SHIP-PROGRESSION-TALENTS-MODS.md`

---

## 1. Level 5 Advancement

At ship level 5 the vessel gains **3 advancement points**:

- **2 normal Talent Points** that may be spent in Combat, Voyage, or Shipcraft.
- **1 Specialization Point** that must be spent on exactly one Level 5 ship specialization.

The Specialization Point cannot be spent in an ordinary talent tree.

The Level 5 specialization is a major vessel-development milestone and is intentionally more significant than an ordinary 1-point talent.

The level 1-5 point cadence is therefore:

| Ship Level | Normal TP gained | Specialization points gained | Running ordinary TP | Running specialization points |
|---:|---:|---:|---:|---:|
| 1 | 2 | 0 | 2 | 0 |
| 2 | 1 | 0 | 3 | 0 |
| 3 | 2 | 0 | 5 | 0 |
| 4 | 1 | 0 | 6 | 0 |
| 5 | 2 | 1 | 8 | 1 |

A level-5 ship therefore has **8 ordinary Talent Points plus 1 specialization purchase**.

---

## 2. Existing Weapon-Mount Rules Are Authoritative

Level-5 specializations must use the existing Hull weapon-mount model rather than creating a second weapon-capacity system.

Current Hull data defines weapon mounts by arc using:

```js
{
  fore:      { count, maxSize },
  port:      { count, maxSize },
  starboard: { count, maxSize },
  aft:       { count, maxSize }
}
```

Current weapon sizes are:

```text
small -> medium -> large
```

A specialization that improves weapon capacity changes the **maximum weapon size of an existing mount**. It does not create a new firing arc and does not change the physical location of a mount unless another explicit rule says so.

A mount cannot be increased beyond `large` by the Level 5 specializations in this document.

Weapon `capacityCost`, weapon size, weapon family/category, crew requirements, reload model, arcs, and damage profile remain properties of the installed weapon and are not replaced by specialization rules.

---

# 3. Level 5 Specializations

A ship chooses exactly one of the following at level 5:

- Battle Ship
- Raider
- Trader
- Voyager
- Explorer
- Expedition Ship

The specialization describes what the vessel has been deliberately developed to do. It overlays the three ordinary talent trees; it does not dictate which tree the ship must invest in.

---

## 4. Battle Ship — Warship Conversion

The vessel has been rebuilt to stand in a ship-to-ship fight and carry heavier armament than an ordinary example of its Hull.

### Heavy Battery Conversion

Choose **one existing weapon mount** whose `maxSize` is `small` or `medium`.

Increase that mount's maximum weapon size by one step:

```text
small -> medium
medium -> large
```

If the ship has no mount below `large`, choose one existing large mount instead. That mount gains **Heavy Integration**: one installed `large` weapon in that mount treats its `capacityCost` as 1 lower for installation/integration purposes, minimum 1. This does not reduce its crew, reload, Action, or damage requirements.

The conversion does not create a new arc or mount location.

### Battle-Hardened

The ship gains **+1 Ship AC during Ship Combat**.

This is an explicit specialization bonus and does not represent level-based stat growth.

### Battle Stations — Once per Battle

At the beginning of a combat round, declare **Battle Stations** and choose one ship combat station.

The first qualifying ship combat Action taken by that station during the round costs **1 fewer shared ship Action**, minimum 1.

This benefit cannot reduce a 1-Action activity to 0 Actions.

### Identity

Battle Ship means:

> heavier armament, better battle survival, and deliberate combat action economy.

---

## 5. Raider — Predator Conversion

The vessel has been developed to catch prey, cripple it, force a boarding opportunity, and escape before a heavier warship can answer.

### Pursuit Weapon Integration

Choose one existing weapon mount with `maxSize` below `large`.

That mount may equip a weapon **one size category larger than its printed `maxSize` only when the weapon has a Raider-appropriate pursuit/disable trait or category**.

Initial qualifying weapon identities include authored weapons or future content with concepts such as:

- harpoon
- tether
- grappling
- disabling
- boarding support
- pursuit

Example using current content: a `small` mount with Raider integration may mount a `medium` Raider-qualified weapon when one exists, but it does not become a general-purpose medium mount.

If no eligible mount exists below `large`, choose one mount instead; Raider-qualified weapons installed there treat `capacityCost` as 1 lower for installation/integration purposes, minimum 1.

### Predator's Pace

While the ship is actively **pursuing a declared enemy vessel or disengaging from one**, increase effective combat Speed by **+1 hex**.

This is conditional movement and does not modify the ship's base `combatSpeed`.

### Take the Prize — Once per Battle

When this ship causes an enemy ship Area to degrade, immediately choose one:

1. Move up to **half effective Speed** toward that enemy without changing facing beyond what the movement rules normally allow.
2. Make **one free facing change** if the ship is legally capable of changing facing.
3. Create an immediate **boarding opportunity** if positional requirements are satisfied.
4. Gain **+1 circumstance bonus** to the next qualifying disabling/pursuit attack against that vessel before the end of the next round.

### Identity

Raider means:

> pursuit, disabling fire, boarding pressure, and exploitation of a wounded target.

It is not simply a lighter Battle Ship.

---

## 6. Trader — Mercantile Conversion

The vessel has been rebuilt around profitable carrying capacity, reliable established routes, and efficient logistics.

### Expanded Holds

Increase the Hull's effective **Cargo Capacity by 50%**, rounded down to a whole cargo unit.

This modifies carrying capacity only. It does **not** change the ship's physical Hull size category, token footprint, weapon mounts, crew limits, or base Hull Integrity.

### Efficient Stores

At each normal Voyage Supply-consumption interval, reduce the ship's Supply cost by **1**, minimum 1.

This does not reduce authored exceptional costs unless the effect explicitly says ordinary travel/Supply consumption is eligible.

### Established Routes

When traveling a known, charted, commercially established long-distance route, reduce the ship's **Voyage travel time by 20%**.

This does not increase tactical `combatSpeed` and does not apply to unknown routes, active exploration, pursuit, combat, or an Event whose travel timing is itself the challenge.

If a Voyage uses discrete travel segments rather than continuous time, the 20% reduction is accumulated and applied when it equals at least one complete segment; it never creates a fractional playable segment.

### Identity

Trader means:

> more cargo, lower routine operating cost, and faster movement along established commercial routes.

---

## 7. Voyager — Long-Haul Conversion

The vessel has been developed to remain operational far from port for extended periods.

### Deep Stores

Increase the ship's effective **Supply carrying capacity by 50%**.

This is Supply capacity, not Cargo Capacity. Cargo and Supplies remain distinct operational concepts even if both occupy physical storage in fiction.

### Long-Haul Maintenance

Once per Voyage, when successful Routine or Emergency Maintenance removes Strain, remove **1 additional Strain**.

### Keep Going — Once per Voyage

When travel, environment, or another non-combat Voyage consequence would add enough Strain to cross the ship's Strain Limit, reduce that incoming Strain by **1** before resolving the threshold.

If the reduced gain no longer crosses the threshold, no Area degrades from that gain.

This does not apply to Strain caused by Ship Combat unless an effect explicitly counts as a Voyage consequence.

### Identity

Voyager means:

> endurance, stores, maintenance, and surviving very long passages away from support.

---

## 8. Explorer — Survey Conversion

The vessel has been deliberately equipped to discover what is unknown rather than merely survive a known route.

### Dedicated Exploration Slot

Gain **1 specialized Ship Mod slot**.

This slot may hold only an authored Mod with an Exploration/Survey identity, including future content such as:

- cartographic systems
- divination/survey arrays
- anomaly detection
- specimen/laboratory facilities
- route-mapping systems
- ruin/wreck survey equipment

This is a specialized slot, not an unrestricted general Ship Mod slot.

### Survey Doctrine

The first time each Voyage Event that a station **succeeds on a check whose primary purpose is discovery, surveying, route-finding, anomaly analysis, wreck investigation, or identifying an unknown environmental threat**, reveal one additional useful fact, route, warning, resource, or opportunity when the authored Event/GM can provide one.

This does not automatically reveal hidden information unrelated to the successful check.

### Beyond the Chart — Once per Voyage

Reroll one failed qualifying exploration/navigation/discovery check and use the second result.

If the original check succeeded instead, this ability may be declared before resolution to turn a normal Success into an **enhanced discovery opportunity** rather than changing its PF2e degree of success. The Event/GM determines the additional discovery supported by the fiction.

### Identity

Explorer means:

> survey equipment, information advantage, route discovery, and finding opportunities ordinary ships miss.

---

## 9. Expedition Ship — Field Operations Conversion

The vessel has been outfitted to carry specialists and equipment into remote locations and accomplish a mission after arrival.

### Dedicated Expedition Slot

Gain **1 specialized Ship Mod slot**.

This slot may hold only an authored Expedition/Field-Operations Mod, including future content such as:

- workshop
- salvage rig
- field laboratory
- medical bay
- landing/shore-party support
- repair stores
- survey camp support
- specialist equipment bay

This is not an unrestricted Ship Mod slot.

### Field Logistics

Increase effective **Supply carrying capacity by 25%**, rounded down, and reduce the Supply cost of qualifying field repairs or expedition tasks by **1**, minimum 1.

This does not reduce ordinary Voyage travel consumption; that is Trader/Voyager territory.

### We Brought One — Once per Voyage

When the crew faces a remote field task, declare that the expedition prepared a **reasonable mundane or specialist piece of equipment** appropriate to the mission.

The declared item must be plausible for the vessel's known purpose and storage. It cannot create unique artifacts, restricted magical items, plot keys, living creatures, or equipment the GM determines could not reasonably have been prepared.

Mechanically, the equipment supplies the normal tool/equipment requirement for one qualifying check or task and may grant the ordinary circumstance benefit associated with having proper tools if the underlying rule supports one.

### Identity

Expedition Ship means:

> field support, specialists, repairs, salvage, and being prepared to accomplish a mission far from port.

Explorer asks, **"What is out there?"**

Expedition Ship asks, **"What do we need to do once we get there?"**

---

# 10. Specialization Boundaries

These rules are locked for the Level 5 milestone:

1. A level-5 ship receives 2 ordinary Talent Points and 1 Specialization Point.
2. The Specialization Point must purchase one Level 5 specialization.
3. A ship has exactly one Level 5 specialization unless future explicit rules say otherwise.
4. Level itself still grants no automatic base-stat increases.
5. Specialization bonuses are explicit authored progression effects and therefore may modify stats/capacities.
6. Battle Ship and Raider use the existing `weaponMounts.{arc}.{count,maxSize}` model.
7. Weapon mount size progression at this milestone is `small -> medium -> large`; no specialization creates a size above `large`.
8. A specialization never invents a new firing arc.
9. Trader cargo expansion does not change physical Hull/token size.
10. Voyage travel speed and combat Speed are distinct concepts.
11. Explorer and Expedition slots are specialized Ship Mod slots, not unrestricted general slots.
12. Trader, Voyager, Explorer, and Expedition Ship have intentionally different operational identities.
13. Specialization is meant to be a major conversion and should be substantially stronger/more defining than one ordinary talent.

---

# 11. Later Milestones

The Level 5 specialization is the foundation for later specialization development.

Future design will define:

- Level 10 specialization evolution/signature feature
- Level 15 legendary specialization feature
- Level 20 mythic specialization feature

Those later abilities should grow from the Level 5 identity rather than replace it.
