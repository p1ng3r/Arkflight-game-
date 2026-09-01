# Arkflight Dev Integration Status

## Branch policy

- `dev` is the active integration branch.
- `main` is the release / last-known-good branch and should not receive feature development directly.
- Existing feature branches are retained as source/history until their unique work is integrated and tested.

## Already represented in dev

The current dev lineage already contains the newer ship systems, refit/progression work, combat-strain foundation, integrated ship service, GM Operations shell/command dashboard, Ships roster work, the main-only Event Board sizing-scope fix, and the commissioning/readiness distinction.

## GM Operations integration

Direct merge PR #1 (`feature/gm-operations-alpha` -> `dev`) is intentionally left as a draft reference because GitHub reports it as not mergeable. The GM Operations branch is older than the current ship authority and contains shared runtime/UI files, so its unique functionality is being transplanted selectively instead of overwriting the newer runtime.

### Generator stage 1 integrated

- Ayerstone faction / Great House setting catalog
- Ayerstone ship doctrine
- Ayerstone ship-name generation
- Generated crew affiliation policy
- Crew-template selection policy
- PF2e encounter treasure budgets
- Officer signature-gear policy
- Arkflight salvage-value policy
- Officer weapon pools

### Still to integrate from GM Operations

- Enemy ship generator core
- PF2e officer benchmark / NPC actor draft
- Reusable PF2e ordinary-crew templates
- Enemy encounter preview and package plan
- PF2e equipment resolver
- Generated preview resolver
- Generated crew folders / persistence / commit API
- Generator UI and its GM Operations wiring
- Ship classification/readiness UI enhancements where they remain useful beside the newer Ships screen
- Voyage Operations pieces after ship/generator integration is stable

## Promotion rule

Nothing moves from `dev` to `main` until automated checks and live Foundry VTT integration testing pass for the combined feature set.
