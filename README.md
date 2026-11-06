# Arkflight Game

A cooperative tactical ship card game for Foundry VTT / PF2e, alongside the existing Event, voyage and ship-management pillars.

## Current development — read these first

- **[HANDOFF.md](HANDOFF.md)** — new-chat continuation, source map, branch, update commands and validation limits.
- **[Current card-game contract](docs/CURRENT-CARD-GAME.md)** — the current shared-AP/random-deck rules and unresolved decisions.
- **[System audit](docs/CARD-GAME-AUDIT.md)** — verified gaps, redundancy cleanup and card-game comparisons.
- **[Ordered task list](docs/CARD-GAME-TODO.md)** — priorities and acceptance criteria.
- **[Current HUD / test guide](docs/ARKFLIGHT-CANVAS-HUD-ALPHA.md)** — live Foundry walkthrough and automated test instructions.

Current feature branch: `feat/1.1-complication-foundation`. Target 1.1.0 remains an alpha; the package version has not been promoted. The ship is the persistent shared character; crew play cards and make PF2e skill checks on a native hex battlefield.

### Earlier Event / station design notes

The material below preserves the earlier Event/station design and roadmap. It is not authority to restore separate RP, Flux cooldown decks or the earlier combat loop over the current card game. See the current contract above for precedence.


For the station ability redesign, installation commands, and Foundry playtest steps, see [Station Ability Redesign](docs/STATION-ABILITY-REDESIGN.md).

For the ordered work queue, current step, and the five-question process before each programming step, see the [1.0 Implementation Checklist](docs/ARKFLIGHT-1.0-IMPLEMENTATION-PLAN.md).

The approved pillar-by-pillar scope for the next major update is recorded in the [Arkflight 1.0 Roadmap](docs/ARKFLIGHT-1.0-ROADMAP.md). Pillars 1–5 — Voyage / Events, Ship Combat, Ship Progression / Vessel Management, Crew / Faction / Expedition, and GM Build & Run — are approved for improvement; implementation is pending. Faction work uses the existing [Ayerstone lore and integration reference](docs/AYERSTONE-FACTION-INTEGRATION.md), with a focused starting selection and support for additional factions. Implement those systems first, then reassess UI, Interaction & Ship Sheet and offer several mockups for the user to choose from. Necessary functional UI work accompanies implementation; the broad visual redesign follows selection.

This repository exists to prove the game first and keep the older Arcflight development repository untouched.

## Design Goal

Create a fast, cooperative fantasy-ship encounter game where five officers plan together, take risks, chain advantages through station order, build Momentum, manage ship-wide Strain and persistent Ship Conditions, and use decisive station abilities to create memorable crew moments.

## Core Loop

**Plan → Choose Risk → Set Order → Resolve → Chain Benefits → Update Momentum / Strain / Ship Conditions → Escalate**

The game should feel like five officers operating one ship, not five unrelated skill checks.

## Five Stations

- Captain
- Engineer
- Navigator
- Battlewatch
- Veilwarden

Each station has its own role, authored actions, and a pool of Signature Abilities.

## Signature Abilities

Focus does not exist in this rebuild.

Each station has a small pool of Signature Abilities. During the Planning / Order phase, the officer selects **one** Signature Ability for the encounter. That selected ability may be used **once during that encounter**.

Rooms, ship modifications, relics, upgrades, and other ship features may add new Signature Abilities to a station's available pool. They normally add **options**, not additional uses.

## Development Rule

The playable loop is the product. Infrastructure exists only to support it.

The first milestone is one complete encounter that is enjoyable in Foundry from planning through closeout. Large persistence, replay, recovery, provenance, and campaign subsystems are not prerequisites for proving the game.

See [GAME-DESIGN.md](GAME-DESIGN.md) for the core game loop and [docs/SHIP-CONDITION-STRAIN-CONTRACT.md](docs/SHIP-CONDITION-STRAIN-CONTRACT.md) for the authoritative persistent ship-damage rules.

## Content Pack Authoring

Arkflight adventures and external Event Manager 2.0 packages should follow [docs/CONTENT-PACK-AUTHORING-GUIDE.md](docs/CONTENT-PACK-AUTHORING-GUIDE.md). Use [docs/CONTENT-PACK-RELEASE-CHECKLIST.md](docs/CONTENT-PACK-RELEASE-CHECKLIST.md) before release and [examples/content-pack-starter/](examples/content-pack-starter/) as the copyable starting point.
