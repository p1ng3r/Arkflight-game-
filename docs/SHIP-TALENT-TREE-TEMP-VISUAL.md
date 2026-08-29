# Arkflight Ship Talent Tree — Temporary Visual Draft

**Status:** Temporary design mockup for review. Not final balance.

This document exists only to show the intended shape of ship progression before individual talents are locked.

---

# Core Progression Shape

Ship level does **not** increase base statistics.

Each level after 1 grants 1 Talent Point.

Special milestone abilities occur at:

- **Level 5 — Calling**: defines what kind of ship this has become.
- **Level 10 — Signature Ability**: choose a specialization inside that Calling.
- **Level 15 — Legendary Ability**: major identity-defining vessel ability.
- **Level 20 — Mythic Keystone**: final unique capstone from the ship's developed talent path.

The normal talent tree remains available between milestone levels.

---

# Example 1–20 Progression View

```text
LEVEL 1
Off-the-lot vessel
No earned talent points
        |
        v
LEVEL 2
Choose Foundation Talent
        |
        v
LEVEL 3
Choose Foundation Talent
        |
        v
LEVEL 4
Choose Foundation Talent / branch
        |
        v
LEVEL 5  ===== CALLING =====
Choose ship identity:
Voyager / Battle Ship / Explorer / Trader / Raider / Expedition
        |
        v
LEVEL 6
Specialist talent access begins
        |
        +--------------------------+
        |                          |
        v                          v
LEVEL 7                  Cross-branch talent
Deepen primary branch     becomes possible
        |                          |
        +-------------+------------+
                      |
                      v
LEVEL 8
Specialist Talent
                      |
                      v
LEVEL 9
Specialist Talent / prerequisite setup
                      |
                      v
LEVEL 10 ===== SIGNATURE ABILITY =====
Choose one Calling specialization
                      |
             +--------+--------+
             |                 |
             v                 v
          PATH A             PATH B
             |                 |
             +--------+--------+
                      |
                      v
LEVEL 11
Legendary-tier talents unlock
                      |
                      v
LEVEL 12
Legendary Talent
                      |
                      v
LEVEL 13
Legendary Talent / cross-branch ability
                      |
                      v
LEVEL 14
Prepare legendary identity path
                      |
                      v
LEVEL 15 ===== LEGENDARY ABILITY =====
Calling-specific legendary ability
                      |
                      v
LEVEL 16
Mythic-tier talents unlock
                      |
              +-------+-------+
              |               |
              v               v
LEVEL 17   Mythic Path A   Mythic Path B
              |               |
              +-------+-------+
                      |
                      v
LEVEL 18
Mythic Talent
                      |
                      v
LEVEL 19
Final prerequisite / cross-branch choice
                      |
                      v
LEVEL 20 ===== MYTHIC KEYSTONE =====
Ship-defining capstone
```

---

# The Five Talent Branches

```text
                         SHIP TALENT TREE
                                |
      +-------------+-----------+-----------+-------------+
      |             |           |           |             |
      v             v           v           v             v
   HULL          ARKENGINE    RIGGING     LIFEVEIL      MORALE
Battlewatch      Engineer     Navigator   Veilwarden     Captain
      |             |           |           |             |
      |             |           |           |             |
 weapons         speed       facing      protection    crew tactics
 attacks         strain      maneuver    recovery      command
 damage ctrl     overdrive   pursuit     void defense  morale
 armor           repair      escape      warding       reactions
```

Each branch has multiple internal paths.

---

# Temporary Hull / Battlewatch Branch

```text
FOUNDATION

     Reinforced Gun Decks
     Ship attacks ignore the first minor situational firing penalty each round.
            |
       +----+----------------+
       |                     |
       v                     v
 Braced Mounts          Damage-Control Crew
 Better weapon          Better emergency
 stability              Hull recovery
       |                     |
       v                     v
 Ready Broadside        Hold the Frame
 Once per round,        Reduce a narrow class
 improve weapon         of Hull consequence
 readiness              once per Event

SPECIALIST
       |                     |
       +----------+----------+
                  |
                  v
          Coordinated Battery
          Unlock a Battlewatch
          multi-weapon action
                  |
          +-------+-------+
          |               |
          v               v
   Precision Fire     Weight of Shot
   targeted system    heavy broadside
   pressure           specialization
          |               |
          +-------+-------+
                  |
                  v
LEGENDARY
           The Guns Remember
           First attack after a
           successful Captain support
           gains a special benefit
                  |
          +-------+-------+
          |               |
          v               v
   Hunter's Mark       Iron Broadside
   target-system       devastating salvo
   control             with action cost
          |               |
          +-------+-------+
                  |
                  v
MYTHIC KEYSTONE
             King's Thunder
             Once per battle, execute
             a legendary broadside that
             breaks normal firing rules
```

This is not balanced text yet. It shows the intended branching shape.

---

# Temporary Arkengine / Engineer Branch

```text
FOUNDATION

         Reinforced Engine Mounts
                  |
          +-------+-------+
          |               |
          v               v
    Efficient Burn    Aggressive Burn
    endurance path    output path
          |               |
          v               v
   Cool the Lines     Hot-Burn Manifold
   better Strain      stronger movement /
   maintenance        higher risk
          |               |
          +-------+-------+
                  |
                  v
SPECIALIST
          Controlled Overdrive
          New Engineer action
                  |
          +-------+-------+
          |               |
          v               v
   Deep Reserve      Redline Doctrine
   better long-haul  burst performance
   operation         under danger
          |               |
          +-------+-------+
                  |
                  v
LEGENDARY
           Heart Still Beating
           Arkengine can function through
           severe degradation briefly
                  |
          +-------+-------+
          |               |
          v               v
  Endless Passage    Burning Heart
  voyage/endurance   combat/output
          |               |
          +-------+-------+
                  |
                  v
MYTHIC KEYSTONE
             Impossible Burn
             Once per Voyage or battle,
             perform a legendary burn that
             would be impossible for a
             normal vessel.
```

---

# Temporary Rigging / Navigator Branch

```text
FOUNDATION

              Tight Helm
                 |
         +-------+-------+
         |               |
         v               v
   Fine Control      Long Reach
   better facing     movement efficiency
         |               |
         v               v
  Slip the Wake      Carry the Turn
  reaction move      preserve facing value
         |               |
         +-------+-------+
                 |
                 v
SPECIALIST
          Impossible Angle
          special maneuver action
                 |
         +-------+-------+
         |               |
         v               v
   Pursuit Master    Void Dancer
   chase control     evasive positioning
         |               |
         +-------+-------+
                 |
                 v
LEGENDARY
          She Turns Before Thought
          reduce action cost of a major
          facing maneuver once per round
                 |
         +-------+-------+
         |               |
         v               v
   No Escape        Untouchable Line
   pursuit          evasive maneuvering
         |               |
         +-------+-------+
                 |
                 v
MYTHIC KEYSTONE
           Turn Between Heartbeats
           Once per battle, completely
           rewrite the ship's facing /
           position within strict limits.
```

---

# Temporary Lifeveil / Veilwarden Branch

```text
FOUNDATION

           Steady Lattice
                 |
         +-------+-------+
         |               |
         v               v
   Deep Warding      Fast Reweave
   stronger defense  faster recovery
         |               |
         v               v
   Seal the Seam     Draw the Veil
   resist hostile    temporary defense
   Void effects      reaction
         |               |
         +-------+-------+
                 |
                 v
SPECIALIST
          Void-Hardened Veil
          survive unusual environments
                 |
         +-------+-------+
         |               |
         v               v
  Guardian Lattice   Living Veil
  protect Areas      recovery / sustain
         |               |
         +-------+-------+
                 |
                 v
LEGENDARY
            Beyond the Black
            ship may endure a class of
            environment ordinary ships
            cannot safely enter
                 |
         +-------+-------+
         |               |
         v               v
   Fortress Veil    Veilwalker
   battle defense   exploration / passage
         |               |
         +-------+-------+
                 |
                 v
MYTHIC KEYSTONE
           The Void Cannot Have Us
           once per Voyage, prevent or
           transform a catastrophic
           Lifeveil consequence.
```

---

# Temporary Morale / Captain Branch

```text
FOUNDATION

           Seasoned Crew
                 |
         +-------+-------+
         |               |
         v               v
   Battle Rhythm     Long Watch
   combat teamwork   voyage endurance
         |               |
         v               v
  Ready Response    Keep Them Together
  reaction value    morale recovery
         |               |
         +-------+-------+
                 |
                 v
SPECIALIST
             Crew Doctrine
             improve Crew Tactics
                 |
         +-------+-------+
         |               |
         v               v
   Command Fire      All Hands
   offense support   repair / recovery
         |               |
         +-------+-------+
                 |
                 v
LEGENDARY
           They Know Her Name
           crew gains a unique benefit
           when Morale would degrade
                 |
         +-------+-------+
         |               |
         v               v
   Dread Crew        Beloved Crew
   intimidation /    loyalty / recovery
   battle identity   expedition identity
         |               |
         +-------+-------+
                 |
                 v
MYTHIC KEYSTONE
          One Crew, One Ship
          once per Event/battle, the crew
          performs a coordinated legendary
          response spanning stations.
```

---

# Calling System — Level 5

The Calling is **not** one of the five station branches.

It answers:

> What kind of vessel has this ship become?

Temporary Calling list:

- Voyager
- Battle Ship
- Explorer
- Trader
- Raider
- Expedition Ship

A ship may have any branch build under any Calling.

Example:

```text
VOYAGER

Fast Voyager         = Arkengine + Rigging
Deep-Void Voyager    = Lifeveil + Arkengine
Convoy Voyager       = Morale + Hull
Self-Reliant Voyager = Engineer + Morale
```

---

# Example Calling Progression — Battle Ship

```text
LEVEL 5
CALLING: BATTLE SHIP

Battle Stations
Once per battle, the ship gains a narrow opening-round combat benefit.

                 |
                 v
LEVEL 10 SIGNATURE CHOICE

       +----------------------+----------------------+
       |                                             |
       v                                             v
  GUNSHIP DOCTRINE                              LINEHOLDER DOCTRINE
  offense specialization                        defense specialization
       |                                             |
       v                                             v
  coordinated weapon                              resist / control
  abilities                                       incoming pressure
       |                                             |
       +----------------------+----------------------+
                              |
                              v
LEVEL 15 LEGENDARY ABILITY

                Famous in the Line

The vessel gains a battle-defining ability tied to the chosen doctrine.

                              |
                              v
LEVEL 20 MYTHIC KEYSTONE

                Ship of War

A final capstone built from the ship's Calling plus the talent branches
it actually invested in.
```

---

# Example Calling Progression — Explorer

```text
LEVEL 5
CALLING: EXPLORER

Beyond the Chart
Gain a unique exploration / discovery benefit during Voyages.

                 |
                 v
LEVEL 10 SIGNATURE CHOICE

       +----------------------+----------------------+
       |                                             |
       v                                             v
  DEEP-VOID SURVEYOR                            PATHFINDER
  hostile environment                          route / maneuver /
  specialization                               discovery specialization
       |                                             |
       +----------------------+----------------------+
                              |
                              v
LEVEL 15 LEGENDARY ABILITY

              Where Maps End

The ship can attempt passages or discoveries ordinary vessels cannot.

                              |
                              v
LEVEL 20 MYTHIC KEYSTONE

              First Through the Dark

Mythic exploration capability shaped by the ship's actual branch build.
```

---

# Example Cross-Branch Nodes

```text
ARKENGINE + RIGGING
Helmsman's Redline
Overdrive creates a maneuver opportunity.

HULL + MORALE
Broadside Discipline
Captain coordination improves Battlewatch firing economy.

LIFEVEIL + RIGGING
Veiled Passage
Maneuver through hostile magical terrain more safely.

ARKENGINE + LIFEVEIL
Resonant Shielding
Feed Arkengine power into Lifeveil at a Strain cost.

HULL + MORALE
Damage-Control Teams
Crew coordination improves emergency Hull repair.

MORALE + ARKENGINE
All Hands Below
Crew assistance improves emergency engine recovery.
```

---

# Design Intent Shown by This Mockup

The intended tree is not:

```text
+1
+1
+2
+2
+3
```

It is:

```text
Choose what the ship is good at
        |
Branch into how it does that
        |
Gain new Actions / Reactions / exceptions
        |
Choose a Calling at 5
        |
Specialize that Calling at 10
        |
Become legendary at 15
        |
Become singular at 20
```

Two level-15 Battle Ships should be capable of having completely different talent layouts and different tactical identities.

---

# Not Yet Locked

This mockup intentionally does **not** lock:

- exact numerical bonuses
- exact Action costs
- exact reaction timing
- exact prerequisites
- final Calling names
- final Level 10 paths
- final Level 15 abilities
- final Level 20 keystones
- exact number of talents in each branch
- whether every level requires spending its Talent Point immediately

These should be reviewed after the overall tree shape is approved.
