# Arkflight Ship Progression, Talent Tree, and Mod Framework

**Status:** Design backbone / source of truth for progression direction  
**Branch:** `feature/ship-event-strain-unification`  
**Related contract:** `docs/SHIP-CONDITION-STRAIN-CONTRACT.md`

---

## 1. Core Progression Rule

**Ship level never increases base ship statistics by itself.**

A ship does **not** gain Hull, Lifeveil, Morale, Speed, Facing, Strain Limit, weapon capacity, or other raw baseline statistics merely because its level increases.

Base values come from the vessel's physical and magical construction:

- Hull / chassis
- Arkengine
- Rigging / helm package
- Lifeveil system
- Crew / morale baseline
- installed Ship Mods
- installed Arkengine Mods
- explicit permanent talent effects
- explicit unique vessel features

Level represents the vessel's development, reputation, refinement, learned handling, specialized construction, and access to increasingly powerful talents and modifications.

A high-level small cutter may therefore have less raw Hull and lower Strain capacity than a low-level heavy galleon. The high-level cutter is legendary because of what it can **do**, not because every number inflated with level.

---

## 2. Twenty Ship Levels

Arkflight vessels use **20 ship levels**.

### Levels 1-5 — Common / Standard Vessels

This is the majority of ships operating in the Void.

- **Level 1:** essentially an off-the-lot vessel; competent, functional, nothing remarkable.
- Levels 2-5 represent increasingly seasoned or customized ordinary vessels.
- Merchant ships, local couriers, common raiders, work ships, ordinary patrol vessels, and most civilian Arkflight craft live here.
- Talents in this tier improve reliability, efficiency, handling, repairs, and basic station play.
- No automatic base-stat growth occurs.

### Levels 6-10 — Specialist Vessels

These are purpose-built or heavily developed ships.

Typical examples:

- long-range voyagers
- dedicated exploration ships
- battle vessels
- specialist traders
- deep-Void couriers
- raiders and pursuit ships
- survey or expedition vessels

At this tier, a ship begins to have a clearly recognizable specialization.

Talents can begin to alter normal operating rules rather than merely improve reliability.

### Levels 11-15 — Legendary Vessels

This is where stories begin to accumulate around the vessel itself.

- sailors recognize the ship's name
- captains tell stories about what it survived
- unique capabilities begin appearing
- the vessel may possess unusual station actions, reactions, Arkcraft interactions, or system rules
- rare or named modifications become appropriate

The ship is no longer simply a good example of its class. It has an identity.

### Levels 16-20 — Mythic / Absolute Legend

These are the instantly recognized ships of legend.

- highly unique abilities
- setting-famous reputations
- extraordinary vessel-specific capabilities
- mythic modifications and named components
- abilities capable of breaking normal assumptions in controlled, authored ways

A level 20 vessel should feel singular without simply being a pile of inflated statistics.

---

## 3. Level Does Not Equal Raw Power Scaling

The progression promise is:

> **More Actions / Cheaper Actions / Better Actions / New Exceptions / Stronger Identity.**

Not:

> +Hull every level / +Speed every level / +Strain every level.

Level primarily provides:

1. Talent access.
2. Talent points.
3. Access to higher-tier modifications.
4. Access to unique station actions, reactions, and rule exceptions.
5. Reputation and narrative recognition.
6. Eligibility for legendary and mythic ship features.

---

## 4. Talent Point Economy

### Starting point

A level 1 ship has **0 earned Talent Points**.

This preserves the intended identity of a level 1 vessel as an off-the-lot ship with no exceptional development.

### Advancement

The ship gains **1 Talent Point each time it gains a level after level 1**.

Therefore:

| Ship Level | Earned Talent Points |
|---:|---:|
| 1 | 0 |
| 2 | 1 |
| 5 | 4 |
| 10 | 9 |
| 15 | 14 |
| 20 | 19 |

Talents normally cost **1 Talent Point**.

Balance should come primarily from:

- level gates
- prerequisite talents
- branch requirements
- cross-branch requirements
- mutually exclusive choices where appropriate
- limited action/reaction economy

rather than complicated point costs.

A small number of Mythic Keystone talents may be allowed to cost **2 Talent Points** if playtesting proves necessary, but variable talent costs are **not** part of the default system.

---

## 5. Talent Tiers

Talent strength is gated by ship level.

| Tier | Ship Levels | Design Role |
|---|---|---|
| **Foundation** | 2-5 | Reliability, efficiency, basic rule improvements |
| **Specialist** | 6-10 | Defines vessel specialization; new actions and stronger exceptions |
| **Legendary** | 11-15 | Unique abilities and identity-defining mechanics |
| **Mythic** | 16-20 | Powerful keystones and vessel-defining legendary rules |

A talent may require a higher minimum level inside its tier.

Example:

- Foundation talent: level 2+
- deeper Foundation talent: level 4+
- Specialist talent: level 6+
- deeper Specialist talent: level 9+
- Legendary talent: level 11+
- deeper Legendary talent: level 14+
- Mythic talent: level 16+
- final Keystone: level 20

This prevents the talent tree from becoming four isolated horizontal rows while preserving the 1-20 progression arc.

---

## 6. Five Primary Talent Branches

The talent tree has five primary branches matching the ship's five station/Area identities.

### Hull / Battlewatch Branch

Focus:

- ship attacks
- weapon coordination
- Hull survival
- damage control
- structural resistance
- armor and hardpoint interaction
- combat reactions
- targeted system attacks
- reducing the consequences of Hull degradation

This branch makes the vessel a better fighting platform or a harder structure to kill.

### Arkengine / Engineer Branch

Focus:

- movement
- acceleration / burn actions
- Strain capacity and management
- overdrive
- emergency power
- repair efficiency
- Arkengine degradation mitigation
- Arkengine Mod synergy

This branch makes the ship faster, more resilient under load, or better at operating beyond normal limits.

### Rigging / Navigator Branch

Focus:

- Facing changes
- maneuver Actions
- movement efficiency
- positioning
- difficult maneuvers
- pursuit / escape
- reducing Rigging degradation penalties
- reacting to enemy movement

This branch determines how much of the map the ship can tactically exploit.

### Lifeveil / Veilwarden Branch

Focus:

- Lifeveil integrity
- magical / environmental protection
- special-defense reactions
- resisting hostile Void effects
- recovery
- protecting other Areas from magical consequences
- Lifeveil-specific Arkcraft interaction

This branch allows a vessel to survive conditions that ordinary ships cannot safely endure.

### Morale / Captain Branch

Focus:

- Crew Tactics
- coordinated reactions
- command efficiency
- crew recovery
- Morale resilience
- reordering or supporting station actions
- maintaining cohesion under severe damage
- getting more value from the crew without simply adding universal numeric bonuses

This branch represents the ship as an organized crew rather than merely machinery.

---

## 7. Branching, Not Five Straight Lines

Each primary branch must contain real choices.

The intended structure is:

```text
             FOUNDATION
              /      \
             /        \
       SPECIALIST A  SPECIALIST B
             \        /
              \      /
             LEGENDARY
             /       \
        PATH A       PATH B
             \       /
              MYTHIC
```

Not every node must reconnect. Some choices may remain mutually exclusive.

A vessel should be able to become distinctly different from another ship that invested in the same broad branch.

Example Arkengine split:

```text
Reinforced Engine Mounts
        |
        +--------------------+
        |                    |
Efficient Burn          Aggressive Burn
        |                    |
Low-Strain Drive        Hot-Burn Manifold
        |                    |
        +---------+----------+
                  |
          Controlled Overdrive
                  |
          Mythic Arkengine Keystone
```

One route emphasizes endurance and Strain control; another emphasizes speed and dangerous output.

---

## 8. Cross-Branch Talents

Cross-branch talents are required to make hybrid ship builds interesting.

A cross-branch talent requires investment in two relevant branches.

Examples:

### Helmsman's Redline

**Arkengine + Rigging**

A maneuver performed immediately after an overdrive burn gains a special movement benefit or reduced facing cost.

### Broadside Discipline

**Hull + Morale**

The Captain coordinates the crew so Battlewatch can perform a powerful firing sequence with reduced action cost or a special reaction.

### Veiled Passage

**Rigging + Lifeveil**

The Navigator and Veilwarden cooperate to maneuver through hostile magical terrain while suppressing part of its consequence.

### Damage-Control Teams

**Hull + Morale**

Crew coordination improves emergency Hull repair or allows a special combat repair reaction.

### Resonant Shielding

**Arkengine + Lifeveil**

The Arkengine can temporarily feed power into the Lifeveil at the cost of Strain.

Cross-branch talents should generally appear beginning in the Specialist tier and become increasingly important at Legendary and Mythic tiers.

---

## 9. Talent Types

Talents should not all be passive bonuses.

Allowed talent forms include:

### Passive

Always modifies a narrow ship rule.

Example: ignore the Stressed Arkengine Speed penalty.

### Action Unlock

Adds a new ship/station Action.

Example: Controlled Burn, Emergency Pivot, Broadside Sequence.

### Reaction Unlock

Adds a reaction to Strain, damage, movement, an enemy attack, or another station's result.

### Rule Modifier

Changes an existing rule.

Example: a Rigging Facing change that normally costs 1 Action may cost 0 once per round.

### Recovery Talent

Improves repair, Strain relief, Morale restoration, or emergency stabilization.

### Mod Synergy

Improves the value of installed Ship Mods or Arkengine Mods without creating new raw slots unless explicitly stated.

### Keystone

A high-level branch-defining ability.

Keystones should be memorable and change how the ship is played.

---

## 10. Talent Design Boundaries

Talents **may** explicitly modify base statistics, but level itself never does.

Examples of legitimate talents:

- +1 Strain Limit
- +1 Facing Allowance
- +1 Speed
- increase Lifeveil maximum by an authored amount
- add a Ship Mod slot
- add an Arkengine Mod slot

These should be deliberate investments and generally uncommon compared with action, reaction, efficiency, and exception talents.

The talent tree should not devolve into purchasing raw numbers at every node.

Default design preference:

> **Change what the ship can do before simply making its numbers larger.**

---

## 11. Mod Architecture

Mods are physical, magical, mechanical, ritual, or structural alterations installed on the vessel.

Mods are **not** talents.

### Talents

Represent permanent learned/refined vessel development and progression choices.

### Mods

Represent installed equipment or alterations that can potentially be:

- bought
- salvaged
- installed
- removed
- replaced
- upgraded
- damaged
- discovered

The number of mod slots is **not derived from ship level**.

Slots come from the vessel's physical construction and installed systems.

---

## 12. Two Primary Mod Families

Arkflight maintains two distinct mod families.

### Ship Mods

Installed into the Hull/chassis or vessel-wide systems.

Possible effects:

- structural reinforcement
- weapon support
- rigging packages
- cargo systems
- crew spaces
- Lifeveil augmentations
- armor
- additional hardpoints
- repair facilities
- exploration equipment
- Strain-management systems

### Arkengine Mods

Installed specifically into the Arkengine architecture.

Possible effects:

- burn behavior
- efficiency
- fuel / aetherite interaction
- Strain production or relief
- propulsion
- emergency power
- Lifeveil power coupling
- maneuver coupling
- overdrive
- engine recovery

Arkengine Mods remain mechanically separate from general Ship Mods so an engine has its own build identity.

---

## 13. Mod Slots

### Ship Mod Slots

The Hull/chassis defines the vessel's base number of Ship Mod slots.

A light vessel may have few slots but strong baseline maneuver characteristics.

A large vessel may have more physical room for modifications but poorer baseline maneuverability.

Ship level does not automatically increase these slots.

### Arkengine Mod Slots

The installed Arkengine defines the base number of Arkengine Mod slots.

Changing the Arkengine may therefore change:

- Arkengine Mod capacity
- propulsion characteristics
- Strain interaction
- available engine-specific mod categories

### Increasing slots

Slots may only increase through explicit content such as:

- a Hull refit
- replacing the Arkengine
- a specific talent
- a rare structural modification
- a legendary vessel feature

There is no automatic `+1 slot every X levels` rule.

---

## 14. Mod Tiers and Ship-Level Access

Level gates the complexity of modifications a vessel can safely integrate; it does not create the slot itself.

| Ship Level | Typical Mod Access |
|---|---|
| 1-5 | Common / Standard Mods |
| 6-10 | Specialist / Advanced Mods |
| 11-15 | Rare / Legendary Mods |
| 16-20 | Mythic / Named Mods |

A lower-level vessel may discover or possess a higher-tier component as treasure or salvage, but it cannot automatically benefit from it as an installed functioning Mod unless an explicit rule allows bypassing the normal level gate.

This preserves discovery as something separate from progression.

Finding a legendary Arkengine component does not instantly make a level 3 vessel legendary; it creates a campaign objective around becoming capable of installing, adapting, selling, studying, or protecting it.

---

## 15. Mods May Alter Base Stats

Unlike level progression, Mods are allowed to alter physical ship statistics because they represent actual installed equipment.

Examples:

- reinforced braces: +1 Strain Limit
- improved helm package: +1 Facing Allowance
- high-output Arkengine injector: +1 Speed, with an authored Strain drawback
- expanded Lifeveil matrix: increased Lifeveil base maximum
- armored bulkheads: increased Hull base maximum or mitigation
- crew quarters/refit: increased Morale base maximum or recovery benefit

Every numerical modifier must come from explicit installed content and remain visible on the ship sheet as part of derived stats.

---

## 16. Mods Should Have Tradeoffs Where Appropriate

Not every Mod must have a drawback, but powerful modifications should often create build choices rather than pure upgrades.

Examples:

### Hot-Burn Manifold

- +1 Speed
- overdrive actions generate additional Strain on a failure

### Heavy Armor Belt

- increased Hull durability
- reduced Facing Allowance or Speed

### Expanded Lifeveil Lattice

- increased Lifeveil capacity
- higher Arkengine load during certain defensive actions

### Reinforced Rigging

- reduced Rigging degradation penalty
- consumes a valuable Ship Mod slot that could otherwise hold offensive or exploration equipment

The primary universal cost of a Mod is already the slot it occupies. Drawbacks should be added only when they create meaningful identity or balance.

---

## 17. Unique / Named Mods

Legendary and Mythic tiers may include named components that are closer to campaign artifacts than ordinary equipment.

Examples may have:

- unique actions
- reactions
- special Strain interactions
- Area-state exceptions
- special visual identity
- lore requirements
- installation quests
- faction consequences

These should remain removable physical components unless explicitly defined as permanently fused to a vessel.

---

## 18. Ship Identity Examples

Two vessels of the same level should be capable of feeling completely different.

### Level 10 Heavy Battle Galleon

Possible development:

- Hull/Battlewatch primary
- Morale/Captain secondary
- heavy weapon Ship Mods
- reinforced structural Ship Mods
- conservative Arkengine Mods

Identity:

- slow
- difficult to maneuver
- hard to kill
- excellent coordinated broadsides
- strong crew discipline

### Level 10 Deep-Void Explorer

Possible development:

- Lifeveil/Veilwarden primary
- Arkengine/Engineer secondary
- exploration Ship Mods
- endurance Arkengine Mods

Identity:

- ordinary offensive capability
- high operational endurance
- strong Strain control
- can survive unusual Void environments
- better long-range recovery

### Level 15 Legendary Cutter

Possible development:

- Rigging/Navigator primary
- Arkengine/Engineer secondary
- maneuver and pursuit Mods

Identity:

- physically smaller than many low-level galleons
- less raw Hull than a heavy vessel
- extraordinarily difficult to pin down
- unique movement reactions
- exceptional pursuit/escape capability

This is intentional and demonstrates why level must not automatically scale base statistics.

---

## 19. Initial Talent-Tree Skeleton

The first implementation should **not** attempt to author every final talent immediately.

Build the framework around approximately this shape per primary branch:

### Foundation Tier (levels 2-5)

- 3-4 entry talents
- at least one meaningful fork
- mostly reliability, efficiency, basic station improvement

### Specialist Tier (levels 6-10)

- 4-5 talents
- new Actions/Reactions begin appearing
- specialization becomes obvious
- first cross-branch nodes appear

### Legendary Tier (levels 11-15)

- 3-4 powerful talents
- vessel identity becomes unique
- stronger cross-branch options
- first named/unique style abilities

### Mythic Tier (levels 16-20)

- 2-3 major talents
- one or more branch-defining keystones
- level 20 may unlock an ultimate branch Keystone or vessel-specific legendary feature

Target initial design size:

- approximately 12-16 talents per main branch
- approximately 8-12 cross-branch talents across the entire tree

This creates enough options that 19 Talent Points cannot purchase everything.

---

## 20. Example Talent Seeds — Not Yet Final Content

These are design seeds only. They are not yet balanced or final talent text.

### Hull / Battlewatch

- Reinforced Gun Decks
- Braced Firing Platform
- Damage-Control Crews
- Coordinated Broadside
- Target Their Weakness
- Hold Together
- Legendary Broadside

### Arkengine / Engineer

- Reinforced Engine Mounts
- Efficient Burn
- Aggressive Burn
- Resonance Dampers
- Emergency Venting
- Controlled Overdrive
- Never Let Her Die

### Rigging / Navigator

- Tight Helm
- Quick Tack
- Slip the Line
- Hard Turn
- Pursuit Geometry
- Impossible Vector
- Ghostwake Maneuver

### Lifeveil / Veilwarden

- Reinforced Lattice
- Veil Harmonics
- Emergency Seal
- Shared Protection
- Void-Hardened
- Resonant Shelter
- Unbroken Veil

### Morale / Captain

- Drilled Crew
- Hold Fast
- Coordinated Stations
- All Hands
- Rally the Decks
- Legendary Discipline
- The Crew Remembers

Again: these names are placeholders/seeds until the mechanical tree is authored.

---

## 21. Interaction With Strain and Area Degradation

Progression may interact with the shared Strain/Area system in controlled ways.

Examples:

- increase Strain Limit by an explicit amount
- prevent the first point of Strain from a specific source
- reduce Strain through an unlocked Action
- treat one Area as one condition better for one check or one round
- reduce repair time
- reduce Supply cost
- ignore a specific Stressed penalty
- unlock emergency use of a Disabled Area
- improve repair Critical Success behavior

Progression should **not** replace the core damage model.

Talents and Mods bend or improve the rules; they do not create separate Pressure, Hazard, or parallel damage systems.

---

## 22. Interaction With Voyage and Combat

The same progression applies in both pillars.

A talent that improves Arkengine condition handling must matter whether the Strain came from:

- a Voyage station failure
- a combat critical hit
- an authored Event consequence
- an emergency repair failure

A Rigging talent that changes Facing must operate against the same ship condition read by the combat engine.

A Hull talent that changes ship attacks must use the same Hull condition tracked on the persistent ship Actor.

There must be one derived ship-state source of truth.

---

## 23. Ship Sheet Requirements From Progression

The eventual ship sheet must be able to show:

### Identity

- ship name
- ship level
- level tier / reputation tier
- Hull/chassis
- installed Arkengine

### Progression

- earned Talent Points
- spent Talent Points
- available Talent Points
- selected talents
- talent prerequisites
- locked/unlocked talent tiers

### Mods

- Ship Mod slot capacity
- occupied Ship Mod slots
- Arkengine Mod slot capacity
- occupied Arkengine Mod slots
- installed Mod details
- Mod level/tier requirements
- derived effects

### Derived statistics

The sheet should make it visually clear that a derived statistic comes from components rather than ship level.

Example:

```text
STRAIN LIMIT 6
Hull base               4
Resonance Dampers      +1
Reinforced Bracing     +1
Ship level bonus        0
```

The UI does not necessarily need to literally show a `Ship level bonus 0` line, but the implementation must never silently add one.

---

## 24. Data-Model Direction

Conceptual shape only; exact schema is implementation work.

```js
progression: {
  level: 1,
  talentPoints: {
    earned: 0,
    spent: 0
  },
  talents: []
},

modSlots: {
  ship: {
    base: 0,
    bonus: 0,
    installed: []
  },
  arkengine: {
    base: 0,
    bonus: 0,
    installed: []
  }
}
```

Derived statistics should be calculated from authoritative base component data + selected talents + installed Mods.

Do not persist duplicate derived totals when they can be deterministically recalculated.

---

## 25. What Is Locked

The following progression rules are now treated as design backbone:

1. Ships have 20 levels.
2. Levels 1-5 are common/standard vessels.
3. Levels 6-10 are specialist vessels.
4. Levels 11-15 are legendary vessels where unique abilities begin appearing.
5. Levels 16-20 are mythic/absolute legends with highly unique abilities.
6. Level does **not** increase base ship statistics.
7. Hull/chassis and installed systems establish baseline statistics.
8. Talents and Mods may explicitly alter statistics.
9. Level primarily gates talents, Mod tiers, and special capabilities.
10. A level 1 ship has 0 earned Talent Points.
11. Each level after 1 grants 1 Talent Point, for 19 earned points at level 20.
12. Talents are branching and include cross-branch options.
13. There are five primary talent branches matching the five station/Area identities.
14. Ship Mods and Arkengine Mods remain separate systems.
15. Ship Mod slots come from Hull/chassis, not level.
16. Arkengine Mod slots come from the installed Arkengine, not level.
17. Slots increase only through explicit content, never automatically from level.
18. Higher ship levels unlock access to higher-tier Mods.
19. Discovery of an advanced Mod is separate from being able to install/use it.
20. Progression must use the same persistent ship condition model in Voyage and Combat.

---

## 26. Still To Design Before Implementation

The following are intentionally **not yet locked**:

1. Exact Hull/chassis catalog and base statistics.
2. Exact number of Ship Mod slots by Hull/chassis.
3. Exact Arkengine catalog and Arkengine Mod slot counts.
4. Exact talent tree node layout.
5. Exact talent mechanics and names.
6. Exact prerequisites for every talent.
7. Exact cross-branch talent requirements.
8. Exact Mod catalog.
9. Mod installation/removal time and cost.
10. Whether installed Mods can themselves be damaged independently of their parent Area.
11. Exact rules for retraining/respeccing ship talents.
12. Exact method by which a ship earns a level.
13. Whether level 20 has one universal capstone choice, branch capstones, vessel-specific capstones, or some combination.

These items should be solved deliberately rather than inferred during coding.

---

## 27. Recommended Next Design Step

Before writing progression code, define a small representative chassis/engine matrix sufficient to test the system.

Recommended prototype set:

- light courier Hull
- general-purpose galleon Hull
- heavy battle Hull
- exploration Hull
- one basic Arkengine
- one high-output Arkengine
- one endurance Arkengine

For each prototype, define only:

- base Hull maximum
- base Lifeveil maximum
- base Morale maximum
- base Strain Limit
- base Speed
- base Facing Allowance
- Ship Mod slots
- Arkengine Mod slots

Then build the first mechanical talent-tree draft against those vessels.

This will reveal whether the talent and Mod framework creates meaningful ship builds without relying on level-based stat inflation.
