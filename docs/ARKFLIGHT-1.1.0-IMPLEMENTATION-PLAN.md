# Arkflight 1.1.0 implementation plan

Updated 24 October 2026. This is a staged rebuild, with the existing prototype retained until its replacement passes acceptance. The accepted rules are in `ARKFLIGHT-1.1.0-DECK-COMBAT-FOUNDATION.md`; the earlier equipped AP/RP hand is superseded for the future design. No merge, version bump or release is implied by a completed increment.

## 1. Complication foundation — programmed for lab testing

- 24 original themed cards; Impact plus the five station entries gives 144 outcomes.
- Critical-failure-only draws; no normal-failure exception or double negative kicker.
- Deterministic deck, one draw per source/ship, serializable receipts, resource tradeoffs, context fallbacks, expiry and typed effect records.
- Foundry GM Complication Lab, separate client-local sample ships, six-entry inspection, test degrees, choices, paid-opportunity claims and simulated effect consumption.
- Local automated and mocked-browser checks establish the catalog/engine/Lab behavior, not native Foundry acceptance or balanced live combat.

The Lab is an integration seam for the new controller, not a retrofit of the old combat economy. Restrictions, reload scheduling and paid-opportunity permissions must be enforced by the appropriate new action/movement/damage consumers before actual encounters use them.

## 2. Hull and maneuver contracts

Define the ten initial hull profiles, differentiating maneuver access, weapon locations, fitting/cargo capacity, baseline defenses and deck/hand progression. Begin with the paper-test Brigantine and Cutter; author exact forward/60-degree-turn sequences, final heading, footprint and costs for every route. Preserve Hold as a legal option under temporary restrictions. Complete the step-timing and collision placement contracts before a native executor is written.

## 3. Planning and native simultaneous movement

Build preview → locked choice → shared reveal → movement → confirmation. One authoritative controller validates all routes and collision contacts before animation. Test one-hex and up-to-three-hex footprints, stationary ships, head-on crossings, contested destinations, obstacles, stale requests, reconnects and partial native completion. Save accepted movement only after the actual native documents and final facings agree. The previously reported live guided-demo rollback remains unverified; a new executor must pass actual PF2e-world acceptance rather than inherit a claim that the old bug was fixed.

## 4. New deck and phase controller

Implement shared AP only, opening draw/mulligan, hand/deck/discard/Prepared/Burn zones, subsequent-round draws, delayed AP after refresh, Card-phase initiative, simultaneous damage and bounded Instant windows. Keep the saved paper encounter's opening hand, opponent course and random state intact. Prove one full two-ship round before expanding the catalog.

## 5. Actions, collisions and complication consumers

Rewrite card effects around the new timing; retain Fire Battery as an AP-costing basic action and repair as a Supply-consuming card. Connect critical-failure receipts to this deck without applying the source's old fixed complication as well. Implement actual modifier/restriction consumption, legal target choices, reload scheduling and paid opportunities, including rejection/refund behavior if an attempted exploit is not legal. Add the collision impact/save rules, severity scaling and optional AP-costing boarding transition once their detailed contracts are settled.

## 6. Persistent ship progression across pillars

Reconcile hull/engine math, equipment, fitting limits, weapons, level/talents, Bulk cargo, travel and event benefits with the new core. Major talents change how a ship plays; equipment specializes it without an obligatory numerical-purchase tax. Migration must preserve crew, libraries, assets and campaign resource state. Do not automatically expand combat complication draws into events or travel without pillar-appropriate timing and recovery.

## 7. Ship builder, sheet, HUD and introduction

Build/refit/level-up wizard, permanent library/deck management, phase-sensitive compact HUD and readable maneuver/card previews. Preserve movable/resizable/minimizable windows and visible restore controls. Reassess the full visual layout with mockup choices after the new behavior is implemented, as agreed. Add a skippable/resumable new-player introduction and a searchable guide.

## Acceptance before replacing the old prototype

Use actual Foundry v14/PF2e, a GM plus player-owned ship, reload/reopen/reconnect, ordinary and poor opening hands, coordinated rolls, delayed effects, collisions, Instants, deck exhaustion and resource recovery. Measure pacing against the 4–6-round target without forcing the outcome. Show which checks were native-world versus mock/Node checks. No live-readiness claim follows solely from a passing unit suite.
