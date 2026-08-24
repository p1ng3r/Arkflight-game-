# Arcflight V3 Donor Audit

Source donor: uploaded Arcflight repository, Gameplay V3 tip `728a574`.

This repository does **not** inherit the old V3 architecture by default. Donor code is accepted only when it directly supports the smaller game described in `GAME-DESIGN.md`.

## KEEP

- Five-station presentation model: Captain, Engineer, Navigator, Watchmaster, Veilwarden.
- Authored Risk Bid tiers: +2, +5, +8.
- Crew Momentum as a bounded shared resource.
- Shared station resolution order.
- PF2e check integration concepts and result-degree handling.
- Station/resource icon registries and presentation helpers.
- Existing room/mod data as future content donors, after adapting them to unlock Signature Abilities.
- Existing station and ship artwork/assets where useful.

## REWRITE SMALLER

- Momentum: old V3 implementation was hundreds of lines; new implementation is a small bounded state transition.
- Risk Bids: old V3 implementation bundled validation, persistence, hostile-data handling, and lifecycle state. New code keeps only authored tiers and DC adjustment behavior.
- Station selection/order: preserve the gameplay idea, not the old lifecycle machinery.
- PF2e check execution: preserve the adapter boundary, but keep it thin and Foundry-facing.
- Event definitions: rewrite around the new round loop and Signature Ability selection.
- Rooms/mods: adapt to add Signature Ability options instead of passive-number bloat where possible.

## DROP

- Focus and all Focus reaction/check infrastructure.
- Universal reaction windows.
- Old event-session runtime architecture.
- Exact replay/provenance/correction machinery as a prerequisite to play.
- Catastrophic breakdown/emergency-response runtime for the first vertical slice.
- Old milestone contract stack as implementation authority.
- Closeout persistence architecture until the core encounter is fun in Foundry.

## Rule

When donor code is larger or more complicated than the gameplay decision it represents, rewrite it rather than transplanting it.
