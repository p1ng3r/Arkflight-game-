# Arkflight Refit Alpha — Foundry Acceptance Playthrough

Use this after pulling `feature/refit-alpha` into Foundry VTT v14 / PF2e.

## 1. Existing vessel integrity

- Open an existing Arkflight Vehicle Actor.
- Sheet opens without lock-up.
- Portrait renders independently from the prototype token image.
- Run `game.arkflight.refitDiagnostics.alphaReady(actor)` and resolve any failed check before continuing.
- Existing Hull, Arkengine, installed Mods, crew assignments, resources, and derived stats remain intact.

## 2. Shipwright presentation

- Core Build / Engine Mods / Rooms / Ship Mods use one compact horizontal navigation row.
- Normal navigation does not use danger red.
- Cyan means active/valid/confirmed.
- Amber means staged/pending/work.
- Red means invalid/critical.
- No visible control says `Apply Refit`.
- Existing core configuration uses `SAVE CORE BUILD`.
- Physical fittings use `INSTALL MOD — CREW` or `INSTALL MOD — SHIPYARD`.

## 3. Blueprint and physical inventory

- Salvage Parts total is visible.
- Blueprint knowledge and physical Available fittings are separate.
- Building a known blueprint spends Build Parts and creates one physical fitting.
- Installed fittings do not count as Available inventory unless another physical copy exists.

## 4. Typed socket staging

- Select/drag a physical fitting.
- Compatible sockets highlight; incompatible sockets reject.
- Staging consumes no fitting and changes no authoritative ship state.
- Preview shows Current → Proposed derived changes.
- Reset Staged Mod returns to the authoritative state.

## 5. Crew installation

- Assigned Engineer uses real PF2e Crafting.
- Critical Success: install succeeds, Parts spent, half listed time passes.
- Success: install succeeds, Parts spent, full listed time passes.
- Failure: install fails, Parts spent, full listed time passes, fitting survives.
- Critical Failure: install fails, Parts spent, full listed time passes, fitting survives, Complication recorded.
- Only successful completion adds the Mod to `ship.shipMods` or `ship.arkengine.modIds`.

## 6. Shipyard installation

- `INSTALL MOD — SHIPYARD` is available for a staged fitting.
- No Crafting roll occurs.
- Installation is guaranteed.
- Install Parts are spent.
- Shipyard labor gold is recorded on the Work Order.
- Full listed installation time passes.
- Successful completion installs the fitting.

## 7. Work Orders and time

- Planned jobs do not advance automatically.
- Working jobs advance when Foundry world time advances.
- Multiple Working jobs advance concurrently.
- Reaching zero uses the canonical completion boundary.
- Build completion creates a physical fitting.
- Install completion mounts the fitting.
- Remove completion returns the fitting to inventory.
- Repair completion closes the repair job.

## 8. Final persistence check

- Close and reopen the ship sheet.
- Reload the world if practical.
- Inventory, installed Mods, Salvage Parts, Work Orders, and derived stats remain correct.
- Run `game.arkflight.refitDiagnostics.alphaReady(actor)` again.

A clean pass through all eight sections marks the Refit system ready for Alpha gameplay testing.
