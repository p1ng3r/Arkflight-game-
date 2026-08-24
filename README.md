# Arkflight Game

A clean Foundry VTT / PF2e rebuild of the Arkflight ship-encounter game.

This repository exists to prove the game first and keep the older Arcflight development repository untouched.

## Design Goal

Create a fast, cooperative fantasy-ship encounter game where five officers plan together, take risks, chain advantages through station order, build Momentum, manage Pressure, and use one selected Signature Ability to create memorable crew moments.

## Core Loop

**Plan → Choose Risk → Set Order → Resolve → Chain Benefits → Update Momentum / Pressure → Escalate**

The game should feel like five officers operating one ship, not five unrelated skill checks.

## Five Stations

- Captain
- Engineer
- Navigator
- Watchmaster
- Veilwarden

Each station has its own role, authored actions, and a pool of Signature Abilities.

## Signature Abilities

Focus does not exist in this rebuild.

Each station has a small pool of Signature Abilities. During the Planning / Order phase, the officer selects **one** Signature Ability for the encounter. That selected ability may be used **once during that encounter**.

Rooms, ship modifications, relics, upgrades, and other ship features may add new Signature Abilities to a station's available pool. They normally add **options**, not additional uses.

## Development Rule

The playable loop is the product. Infrastructure exists only to support it.

The first milestone is one complete encounter that is enjoyable in Foundry from planning through closeout. Large persistence, replay, recovery, provenance, and campaign subsystems are not prerequisites for proving the game.

See [GAME-DESIGN.md](GAME-DESIGN.md) for the current design authority.
