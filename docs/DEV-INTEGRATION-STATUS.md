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

### Current GM Operations / generator status

The enemy generator core, PF2e officer drafts, reusable ordinary-crew templates, encounter preview, PF2e preview resolution, generated crew folders, package persistence/commit API, generator UI, and GM Voyage/Combat operation panels are now represented in `dev`.

Remaining generator/GM-operation work is primarily last-mile campaign integration:

- generated package deployment to the active Scene;
- token footprint/placement workflow;
- optional add-to-current-Combat flow after generation;
- finished Loot & Salvage recovery workflow;
- reusable Library / crew-template browsing workflow;
- campaign persistence for Arkflight-specific rewards such as blueprints, route knowledge, faction rewards, and boons.

## Promotion rule

Nothing moves from `dev` to `main` until automated checks and live Foundry VTT integration testing pass for the combined feature set.
