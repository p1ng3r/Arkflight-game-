# Arkflight Refit Alpha Roadmap

## Goal
Deliver one complete ship-refit gameplay loop that connects blueprints, Salvage Parts, physical components, typed sockets, Crafting or shipyard installation, time passage, and final derived ship effects.

## Definition of Refit Alpha
A crew can:
1. Learn or acquire a blueprint.
2. Spend Salvage Parts to build a physical Ship Mod or Arkengine Mod.
3. Store built or recovered components in the vessel inventory.
4. Open Shipwright and see only relevant owned components and known blueprints.
5. Select or drag a component and see compatible sockets.
6. Stage a compatible fitting without immediately changing the ship.
7. Preview the proposed derived ship state.
8. Begin a refit using crew Crafting or a shipyard.
9. Spend Salvage Parts, gold where appropriate, and installation time.
10. Complete the work order and only then persist the installed component.

## Core vocabulary
- Blueprint: knowledge that permits construction of a mod.
- Salvage Parts: universal Arkflight construction/refit resource.
- Component Inventory: physical built, purchased, salvaged, or rewarded components not currently installed.
- Installed Component: a component currently mounted on the vessel and applied by `deriveShip`.
- Refit Draft: temporary socket assignments that preview changes but are not persistent.
- Work Order: timed Build, Install, Remove, or Repair job.

## Part 1 — Shared Refit Contract
Status: IN PROGRESS

Deliverables:
- Add Salvage Parts to persistent ship resources.
- Add blueprint knowledge state for Ship Mods and Arkengine Mods.
- Add physical component inventory state for Ship Mods and Arkengine Mods.
- Add backward-compatible schema normalization/migration.
- Define canonical Ship Mod and Arkengine socket classes.
- Define canonical build/install metadata contract.
- Add tests proving old ships migrate safely.

## Part 2 — Normalize Every Mod
Deliverables:
- Give every Ship Mod an explicit `slotClass`.
- Give every Arkengine Mod an explicit `slotClass`.
- Give every mod explicit build and install costs, times, DCs, and tier.
- Remove gameplay dependence on inferred tags for compatibility; inference remains migration/fallback only.
- Audit every placeholder/empty mechanical effect and mark intentionally narrative-only entries.

## Part 3 — Blueprint and Component Economy
Deliverables:
- Unlock blueprint action/API.
- Grant/remove Salvage Parts API.
- Build-component action using Blueprint + Salvage Parts + time/work order.
- Grant intact component action for loot, purchase, salvage, or GM reward.
- Distinguish Unknown, Blueprint Known, Available Component, and Installed states.

## Part 4 — Typed Shipwright Sockets
Deliverables:
- Keep Arkengine Power, Stability, Lifeveil, Utility, Flexible socket behavior.
- Finish typed Ship Mod sockets: Weapon, Structural, Rigging, Lifeveil, Support, Utility, Flexible/General as allowed.
- Use icon + label + color, never color alone.
- Compatible sockets wake/highlight; incompatible sockets dim and reject drops.

## Part 5 — Refit Draft / Preview
Deliverables:
- Drop no longer installs immediately.
- Drag/drop creates a staged socket assignment.
- Right inspector previews effects, slot use, Salvage Parts required, work time, DC, and shipyard cost.
- Reset Draft clears staging.
- Begin Refit validates the entire draft before creating work.

## Part 6 — Universal Work Order Engine
Deliverables:
- Work types: Build, Install, Remove, Repair.
- Methods: Crew or Shipyard.
- Track worker, Crafting DC, Parts cost, gold cost, duration, start/remaining time, status, and result.
- Initial statuses: planned, working, complete, complication.
- Work completion performs the persistent ship mutation exactly once.

## Part 7 — Crew Engineering Installation
Deliverables:
- Select installer from crew/station context.
- Use PF2e Crafting as the mechanical skill; UI may label it Engineering Work.
- Resolve degree of success.
- Baseline result model:
  - Critical Success: reduced time.
  - Success: listed time.
  - Failure: increased time.
  - Critical Failure: increased time plus authored/refit complication.
- Do not destroy expensive mods by default on failure.

## Part 8 — Shipyard Installation
Deliverables:
- Guaranteed baseline installation when requirements are met.
- Allow crew-provided Salvage Parts for reduced gold cost.
- Shipyard may supply missing ordinary Parts for additional gold.
- Do not build shipyard-quality tiers for Alpha unless required by playtest.

## Part 9 — Time Passage
Deliverables:
- GM-facing advance-time control suitable for hours/days.
- Work orders decrement/complete from the same time passage.
- Completion creates a visible refit result and refreshes the vessel.
- No separate mod-only timer system.

## Part 10 — Unified Arkflight Presentation
Deliverables:
- Apply shared visual grammar across base ship sheet, Event Manager, Shipwright, and Progression.
- Navy = workspace.
- Blackened iron = structure.
- Brass = interaction/selection.
- Cyan-white = valid/active magical state.
- Amber = staged/pending/caution.
- Red = invalid/critical/danger.
- Event Manager remains the quality benchmark, but screens should be sibling instruments rather than identical layouts.

## Alpha scope guardrails
- One universal Salvage Parts currency.
- Rare named materials may exist later as exceptional prerequisites.
- No cargo-weight simulation for Salvage Parts in Refit Alpha.
- No giant new Crafting skill; use PF2e Crafting.
- No automatic install on drag/drop.
- No Talents/Progression redesign until the base Refit loop is playable.
