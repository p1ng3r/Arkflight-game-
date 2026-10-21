# Five-system damage and repair — 1.0 development build

Implemented on `feat/station-ability-loadouts`, 17 October 2026. This is a development change, not the 1.0 release. Live Foundry acceptance is still required.

## What the ship owns

| System | Station | Integrity resource |
| --- | --- | --- |
| Hull | Battlewatch | Current Hull points / maximum Hull points |
| Drive / Rigging | Navigator | 0–100% |
| Arkengine | Engineer | 0–100% |
| Lifeveil | Veilwarden | 0–100% |
| Morale | Captain | 0–100% |

Strain remains the separate, shared pressure mechanic. Existing Hull/Drive/Weapons Strain conditions remain in place for compatibility. The new percentage bands do not automatically inflict those old penalties.

| Integrity | Hull | Drive / Arkengine | Lifeveil | Morale |
| --- | --- | --- | --- | --- |
| 100% | Sound | Sound | Stable | Inspired |
| 75% to below 100% | Scuffed | Scuffed | Weakened | Confident |
| 50% to below 75% | Battered | Battered | Fraying | Steady |
| 25% to below 50% | Damaged | Damaged | Unstable | Shaken |
| 10% to below 25% | Critical | Critical | Critical | Faltering |
| Below 10% | Wrecked | Disabled | Collapsed | Broken |

Exactly 50% already qualifies for a save when damage is taken. Exactly 10% is still Critical/Faltering, not the final band. Fractional integrity is compared before display rounding.

## Automatic saves and faults

An actual damaging reduction to a system at **50% or lower** causes its ship-owned save. Each affected system can save **once per round**. More damage in a later round requires another save while it remains at or below 50%. Crossing several bands on one hit still produces one save. Different systems save independently.

No damage means no save. A negative modifier, existing fault, Strain degradation, ability resource cost, healing, or mere passage of a round does not itself trigger another save. Adding a fault never deals recursive resource damage.

Combat keys include encounter ID and round. Event keys include Event start time and round. Outside a round-based encounter, each explicit damage entry is its own incident. Save marks and the last 30 results persist on the ship.

First-pass balance defaults, chosen for this implementation:

- Ship Bonus is `ceil(ship level / 4)`, from +1 to +5 at levels 1–20.
- Save is `d20 + Ship Bonus + Hull contribution + Arkengine contribution + supported upgrade bonuses + active save penalties`.
- DC is `14 + Ship Bonus`. The panel's save tooltip shows the contributions.
- An installed Hull and Arkengine each normally contribute +1. Relevant Hull tags/tier and Arkengine tags/tier improve selected saves. An unstable starter engine penalizes its own save. Components can explicitly author `data.systemSaves.<system>`; Mods/Talents can use canonical `systemSaveBonuses.<system>` targets. Existing Defensive Check Bonus also applies.
- Natural 20 succeeds; natural 1 fails. Saves are binary: critical results do not add extra faults or extra resource damage in this first pass.
- Failure automatically rolls the system's d12 table. Different faults coexist. Duplicate faults reroll; the same fault never stacks. With all twelve active, no further duplicate is added.
- Aggregated fault modifiers are bounded per statistic at −4 / +3. The positive cap covers added reload time. Station-specific and all-station modifiers remain separate statistics.

Faults modify actual derived stats, weapon reload duration, station activation/Event checks, repair checks, or system saves. They persist through healing and reopening the sheet. Increased reload duration applies when a weapon next fires; existing reload progress is preserved. Movement already taken is preserved; disabled systems block further movement.

Normal Hull damage from single-shot chat application and coordinated salvos runs the save automatically after mitigation. Event damage uses the same resolver, including `damage-system` effects for any of the five systems. Strain's separate danger checks still run through the existing Strain resolver.

Below 10% Hull blocks normal combat actions and movement/firing; emergency recovery remains available. It does not erase the ship. Drive or Arkengine below 10% disables propulsion and related station operations. Collapsed Lifeveil disables ward/environmental functions. Broken Morale disables ordinary Captain operations and Crew Tactics; Rally Crew and recovery remain possible. Character environmental exposure remains under the existing exposure rules rather than automatically damaging Hull.

## Patch mounts and other recovery

On the ship sheet, open **Combat → Basic Ship Controls → Emergency Repair** and choose a named fault, for example **Patch Jolted Gun Mounts**.

Emergency Repair costs **1 AP and 2 Supplies**, once per combat. Its activation check still uses the existing ability outcome rules. Success, critical success, or ordinary failure clears one selected fault. Critical failure clears none and loses one additional Supply. Selecting a fault **does not restore Hull or any other integrity resource**. Critical success does not clear an extra fault. Legacy condition repair and the existing Lifeveil recovery option remain available.

Example: at Hull 94/200, Jolted Gun Mounts gives −1 weapon attacks. Patching that fault removes the −1, spends the resources, and leaves Hull at 94/200. The ship remains Damaged. Its next qualifying Hull damage in a later round still requires a save.

Outside combat, Shipwright's repair workbench can restore Drive/Arkengine integrity using the existing paid repair packages, and repair an individual fault using a Patch work order. Integrity restoration and fault clearing are separate jobs. Morale recovery still uses Rally Crew and existing rest rules.

The planned one-action-per-station economy is **not implemented by this change**. This build still spends Emergency Repair's AP from the current shared AP runtime. Station budgets and Hull staffing are later roadmap steps.

## Foundry acceptance check

1. Close Foundry before updating the module. In Git Bash, inside the module repository:

   ```bash
   git status --short --branch
   git fetch origin
   git switch feat/station-ability-loadouts
   git pull --ff-only origin feat/station-ability-loadouts
   npm test
   ```

   If Git reports tracked local edits, stop and preserve them before switching. Untracked artwork and archives do not need to be removed. Do not apply another patch or run `git clean`.

2. Restart Foundry and refresh the browser. Open an existing ship's **Overview** or **Combat** tab. Find **Ship Systems**: five percentage/state cards, save modifiers/DCs, and active faults. Existing Hull and Morale must retain their values; missing Drive/Arkengine start at 100%.
3. Use the GM **Apply Damage & Save** controls for actual system damage. Hull uses Hull points; the other systems use percentage points. Changing an ordinary resource input is an administrative adjustment and does not roll a save.
4. In a disposable combat, damage one system to exactly 50% or lower. Verify an automatic d20 save in chat and a d12 fault on failure. Damage it again in the same round: no second save. Advance the round and damage it again: another save. Advance a round without damage: no save.
5. On a failed Hull save that produces Jolted Gun Mounts, check the −1 weapon attack modifier, use Emergency Repair's named fault choice, and verify AP −1, Supplies −2, no Hull healing, restored attack modifier, and Signature unavailable afterward. Other faults can verify the same repair workflow if the d12 gives a different result.
6. Apply a single-shot chat damage result that causes a fault, then Undo it before making other changes. Hull, that fault, and its save mark should all revert. Duplicate Apply must be rejected. Undo after subsequent damage or fault repair must be rejected rather than overwrite later state.
7. Fire a coordinated salvo that takes Hull to 50% or lower; verify the same save/fault flow. Resolve Event Hull/Lifeveil/Morale damage and verify one save per affected system in that Event round.
8. Generate a fresh Poor, Standard, and Elite enemy: Hull full, Drive/Arkengine/Lifeveil 100%, Strain 0, no active faults, and sound legacy conditions. Generated Morale retains its existing quality defaults of 40% / 60% / 100%.
9. Queue and finish a Shipwright Drive/Arkengine repair and a named fault Patch job. Verify the former heals only integrity and the latter clears only the selected fault. Check the console for errors and verify player/GM views together.

All 657 automated tests pass. Checks cover the rules, all 60 fault effects, save timing, migration, fresh generation, runtime dice, shared damage adapters, named repair, paid work-order completion, and chat Apply/Undo. They do not establish live Foundry layout, multi-user behavior, or gameplay balance.
