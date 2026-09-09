# Arkflight Core Combat Station Actions

Status: Alpha core station menu

Arkflight ship combat uses one shared vessel Action/Reaction economy. The five permanent stations do **not** receive five independent turns. Instead, each station owns a set of tactical choices that can spend the ship's remaining Actions or Reactions when appropriate.

The minimum core menu is now **4 Actions + 1 Reaction per station**. Ship talents, specialty conversions, rooms, mods, and future progression may add or modify choices later.

## Captain — Morale / Command

| Type | Ability | Cost | Role |
| --- | --- | ---: | --- |
| Action | Issue Order | 1 AP | Direct a station toward a combat objective. |
| Action | Rally Crew | 1 AP | Recover command cohesion / Morale combat pressure. |
| Action | Drive the Crew | 1 AP + Strain | Push Morale to produce one net extra Action this round. |
| Action | Coordinate Assault | 1 AP | Synchronize stations against one target. |
| Reaction | Brace for Impact | 1 RP | Mitigate incoming Hull damage or impact consequences. |

## Engineer — Arkengine / Damage Control

| Type | Ability | Cost | Role |
| --- | --- | ---: | --- |
| Action | Vent Strain | 1 AP | Reduce dangerous combat Strain. |
| Action | Overcharge Arkengine | 1 AP + Strain | Temporarily push Arkengine output. |
| Action | Emergency Repair | 2 AP | Perform limited combat damage control. |
| Action | Redistribute Power | 1 AP | Route power to propulsion, weapons, or Lifeveil support. |
| Reaction | Emergency Bypass | 1 RP | Temporarily bypass a system complication. |

## Navigator — Rigging / Helm

| Type | Ability | Cost | Role |
| --- | --- | ---: | --- |
| Action | Move | 1 AP | Gain movement equal to effective Combat Speed. |
| Action | Maneuver | 1 AP | Gain facing changes equal to effective Maneuverability. |
| Action | Hard Turn | 1 AP + Strain | Force a stronger facing change. |
| Action | Set Attack Vector | 1 AP | Establish a favorable firing line from a chosen facing. |
| Reaction | Evasive Maneuver | 1 RP + Strain | React to an incoming attack with an emergency helm maneuver. |

## Battlewatch — Hull / Gunnery

| Type | Ability | Cost | Role |
| --- | --- | ---: | --- |
| Action | Acquire Target | 1 AP | Establish a precise firing solution. |
| Action | Fire Weapon | Weapon AP | Resolve a legal installed weapon attack. |
| Action | Work the Guns | 1 AP | Reduce one weapon's reload time. |
| Action | Ready Broadside | 1 AP | Coordinate a Port or Starboard battery. |
| Reaction | Spoil Their Aim | 1 RP | Disrupt an enemy firing solution against the ship. |

## Veilwarden — Lifeveil / Supernatural Defense

| Type | Ability | Cost | Role |
| --- | --- | ---: | --- |
| Action | Reinforce Lifeveil | 1 AP | Temporarily strengthen Lifeveil defense. |
| Action | Mend Lifeveil | 1 AP | Restore a small amount of Lifeveil capacity. |
| Action | Focus Ward | 1 AP | Focus protection toward a threatened area or energy. |
| Action | Purge Interference | 1 AP | Contest hostile supernatural or aetheric interference. |
| Reaction | Emergency Ward | 1 RP | Mitigate incoming Lifeveil / energy damage. |

## Rules Boundary

- These are **combat actions**, not Voyage/Event station actions.
- AP and RP are shared by the vessel.
- Reactions use RP and have authored triggers; they are not free Actions taken during the ship's turn.
- `Fire Weapon` uses the installed weapon's own AP cost.
- Core action definitions live in `src/content/combat-actions.js` and are exposed through `game.arkflight.combat.actions`.
- The action definitions carry declarative resolver contracts so the Foundry combat UI and combat engine can implement each effect without creating a second duplicate action list.
