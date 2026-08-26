# Arkflight Ship Combat Foundation

Status: Alpha implementation foundation

This document describes the first rebuilt Arkflight ship-combat domain. It is subordinate to `SHIP-STRAIN-AND-STATION-SYSTEMS.md` for the persistent ship/Strain model.

## Design Boundary

Ship Combat must not play like the Voyage/Event Manager.

Voyage/Event gameplay remains a narrative planning and PF2e station-resolution system. Combat is a tactical ship-operation game centered on a shared action economy, facing, range, weapon arcs, reactions, direct damage, system management, and Strain.

The two modes are unified by the persistent vessel, not by identical round structure.

## Salvaged Ideas

The rebuilt combat foundation deliberately salvages concepts from the older `p1ng3r/arcflight` combat groundwork without copying its old runtime contracts.

Salvaged concepts include:

- ship-level AP/action economy
- separate reactive capacity
- Adjust Facing
- Evasive Maneuver
- Ready Broadside
- Aim Weapon
- Call Target
- tactical facing
- weapon arcs
- station-owned tactical responsibilities

The old Pilot/Helm and Gunnery stations are not restored. Their useful responsibilities are absorbed into the current five-station model:

- Navigator owns helm, rigging, facing, and maneuvering.
- Battlewatch owns threat detection, targeting, and weapons coordination.

## Five Combat Stations

| Station | Persistent area | Combat responsibility |
| --- | --- | --- |
| Captain | Morale | command, crew coordination, bracing, driving the crew |
| Engineer | Arkengine | propulsion output, overcharge, repair, power management |
| Navigator | Rigging | helm, movement, facing, evasive maneuvering |
| Battlewatch | Hull | threats, target acquisition, weapon arcs, firing |
| Veilwarden | Lifeveil | environmental/energy defense and Lifeveil overdrive |

`watchmaster` is accepted as a temporary compatibility alias for `battlewatch` inside the combat domain while the wider Event/UI migration remains unfinished.

## Shared Ship Action Economy

Combat uses a shared vessel action economy rather than giving every station its own PF2e turn.

Player-facing language is:

- Actions
- Reactions

The current alpha baseline is hull-specific and intentionally isolated in `src/combat/combat-schema.js` so it can be balanced without changing the persistent ship schema.

Current alpha baselines:

| Hull | Actions | Reactions |
| --- | ---: | ---: |
| Void Skiff | 2 | 1 |
| Sloop | 3 | 1 |
| Cutter | 3 | 1 |
| Brigantine | 4 | 1 |
| Frigate | 4 | 1 |
| Galleon | 5 | 1 |
| Hammerhead | 5 | 1 |
| Arkcruiser | 6 | 2 |
| Dread Caravel | 6 | 2 |
| Cathedral Ship | 6 | 2 |
| Leviathan Class Platform | 8 | 2 |

These numbers are alpha tuning values, not final balance.

Larger hulls intentionally receive more baseline Actions. Future Ship Level and upgrades are expected to improve combat economy by:

1. reducing the cost of specific actions;
2. adding Actions or Reactions;
3. unlocking new actions.

Normal action-cost reductions should not reduce an action below 1 unless an authored rule explicitly changes its action type.

## Strain in Combat

Combat reads Strain from the persistent ship when combat starts.

Combat actions may generate Strain when the crew deliberately pushes the vessel beyond safe operation. The combat state records which persistent area was pushed so a later Strain/degradation layer can resolve consequences against the correct area.

Examples currently authored:

- Hard Turn -> +1 Strain, pushes Rigging
- Evasive Maneuver -> +1 Strain, pushes Rigging
- Overcharge Arkengine -> +1 Strain, pushes Arkengine
- Brace for Impact -> +1 Strain, pushes Morale
- Drive the Crew -> +1 Strain, pushes Morale
- Overdrive Lifeveil -> +1 Strain, pushes Lifeveil

Strain generated in combat is written back to the persistent ship Actor. Tactical state such as facing, remaining Actions, or the combat log is not copied into the persistent ship payload.

The exact Strain-to-degradation test is intentionally not implemented yet because its formula and degradation thresholds remain an active design decision.

## Facing and Range

The combat domain currently defines four facings:

- Fore
- Starboard
- Aft
- Port

and five alpha range bands:

- Contact
- Close
- Near
- Far
- Distant

These are tactical combat state, not persistent ship state.

`Adjust Facing` changes facing one step. `Hard Turn` changes facing two steps and generates Strain against Rigging.

Range movement and weapon range validation are scaffolded but are not yet connected to a complete movement or firing resolver.

## Initial Combat Actions

### Captain

- Brace for Impact — Reaction; generates Strain against Morale.
- Drive the Crew — Action; generates Strain and creates one temporary additional Action for the current round.

### Engineer

- Overcharge Arkengine — Action; generates Strain and creates one temporary additional Action for the current round.
- Emergency Repair — two-Action repair window placeholder.

### Navigator

- Adjust Facing — Action.
- Hard Turn — Action; stronger facing change for Strain.
- Evasive Maneuver — Reaction; defensive maneuver for Strain.

### Battlewatch

- Ready Broadside — Action.
- Aim Weapon — Action.
- Call Target — Action.
- Fire Weapon — Action.

### Veilwarden

- Reinforce Lifeveil — Action.
- Overdrive Lifeveil — Reaction; generates Strain against Lifeveil.

Several actions currently expose effect descriptors rather than finished attack/repair resolution. This is intentional: the action economy and persistent-state boundary are being established before weapon math and system-degradation math are locked.

## Foundry API

`src/foundry/combat-api.js` registers a minimal GM-controlled combat API under:

```js
game.arkflight.combat
```

Current calls:

```js
await game.arkflight.combat.start(shipActor)
await game.arkflight.combat.execute("adjust-facing")
await game.arkflight.combat.nextRound()
await game.arkflight.combat.stop()
```

Read current state with:

```js
game.arkflight.combat.state
```

Read the action catalog with:

```js
game.arkflight.combat.actions
```

The Foundry controller stores active tactical state in hidden world settings and stores only resulting Strain back on the bound ship.

## Explicitly Not Implemented Yet

The following are intentionally outside this first foundation commit series:

- Combat HUD / tactical UI
- initiative/engagement-opening procedure
- complete movement resolution
- actual weapon attack rolls
- weapon damage resolution
- firing-arc validation against a target bearing
- armor/resistance resolution
- system degradation and station penalties
- Morale degradation thresholds
- Strain checks
- persistent Hull/Lifeveil damage writes from combat attacks
- boarding
- enemy AI
- NPC vessel turns
- Ship Level action-cost reductions and unlocks
- upgrade-driven action modifications

These should be layered onto the tested action/Strain foundation rather than implemented as a second independent combat model.

## Next Implementation Order

Recommended order:

1. Define the five-area degradation ladder and station penalties.
2. Add a Strain check that targets the pushed area.
3. Persist area degradation through the ship schema in a migration-safe form.
4. Connect current Event consequences to the same five-area persistent model.
5. Implement movement, target bearing, and firing-arc validation.
6. Implement weapon attack/damage resolution from installed weapons.
7. Add Ship Level and upgrade hooks for cheaper Actions, bonus Actions, and unlocked Actions.
8. Build the player-facing Combat HUD after the domain behavior is stable.

## Rules That Must Not Drift

- Combat and Voyage/Event remain mechanically distinct.
- Both modes use the same persistent ship.
- Strain is persistent and is not itself damage.
- The five persistent areas are Morale, Arkengine, Rigging, Lifeveil, and Hull.
- The five stations are Captain, Engineer, Navigator, Veilwarden, and Battlewatch.
- Larger hulls can support a larger action economy.
- Ship Level/upgrades may make actions cheaper, add actions, or unlock actions.
- Combat tactical state must not become a second copy of persistent ship state.
- Old combat code is salvage reference only; the new Strain/station model is authoritative.
