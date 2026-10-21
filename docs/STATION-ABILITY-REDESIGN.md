# Arkflight station abilities — implementation and playtest guide

This branch implements the approved five station rosters. Emergency Repair, reaction kickers, Push It costs, and learning milestones use the initial implementation values below; they are balance settings to evaluate in the first playtest.

## Update the laptop or desktop

Close the Foundry world before switching code. From the existing module folder, run:

```bash
git status --short --branch
git fetch origin
git switch --track origin/feat/station-ability-loadouts
npm test
```

If that branch already exists locally, use:

```bash
git switch feat/station-ability-loadouts
git pull --ff-only origin feat/station-ability-loadouts
npm test
```

Your untracked art files remain in place. If Git reports that a file would be overwritten, stop and preserve that specific file before switching. This update needs no patch, reset, or cleaning command. The existing event Risk repair branch remains the base of this work.

Reopen Foundry and hard refresh the browser (Ctrl+F5). Start a fresh test combat so old transient effects do not carry into the redesigned rules. Existing ship Actors retain their ship build, resources, crew, and art; their ability libraries receive starter defaults when normalized.

## Fixed rules

- Ship Bonus B = ceil(ship level / 4): +1 at levels 1–4, +2 at 5–8, +3 at 9–12, +4 at 13–16, +5 at 17–20.
- Every station equips two Regular abilities, one Surge and one Signature. Each ability costs 1 AP.
- Each Regular is usable once per combat round. A Surge used in Round 1 is unavailable in Rounds 2–3 and ready in Round 4. A Signature is usable once per combat.
- RP is a separate shared pool. Four shared reactions are equipped from five learned; all starter reactions are Regular and cost 1 RP. The initial reserve is **Brace for Impact**. Any ship owner may spend RP; station ability ownership remains with its assigned crew player.
- Fire Weapon, Hard Turn, Ram, Board, Grapple and Break Grapple are shared basic controls costing 1 AP. Normal movement purchases and the existing AP/RP budgets are unchanged.
- Check: d20 + B vs DC 9 + B. At least DC+10 is critical success, DC−10 or less is critical failure; natural 20 raises one degree and natural 1 lowers one. Without other modifiers the chances are 10% critical success, 50% success, 35% failure, 5% critical failure. Failure effects still provide the described reduced benefit; critical failures use each ability's own setback.
- Recovery strength is a separate die roll. Round up halved recovery before capping at the resource maximum. Hull uses HP; Morale and Lifeveil use percentage points. Renewal Wave rolls once for both resources and floors its d10 at 5 before multiplying by B.
- An ability must have its normal listed resource cost available before rolling. Outcome-dependent extra costs can bring a resource to zero; resources never become negative. Costs are payments and cannot be absorbed by recovery guards. Active paid protection remains valid if its payment depleted Lifeveil.
- Regular/Surge effects and recovery kickers expire at the ship's next turn unless consumed earlier. Signature charge buffs persist until used or combat ends. Signature extra AP and movement expire on the next ship turn.
- Attack bonuses use the strongest positive circumstance bonus plus the strongest negative penalty. Matching attack buffs consume their charges on the qualifying attack, including a miss. Damage from power, a broadside and a salvo can combine. Overlapping regular wards use the strongest protection; Emergency Ward adds to it. Reinforce protects physical as well as energy hits.
- Self-inflicted Hull setbacks bypass Hardness and do not trigger weapon critical-hit Strain. Existing whole-ship Strain checks and condition consequences remain in use. Vent's critical guard can protect Strain from any source; Emergency Bypass prevents Engineer Strain.

## Reload and salvos

Reload is automatic and costs no AP. After firing a Reload 1 gun in Round 1, it becomes ready at the start of that ship's Round 2 turn. A Reload 2 gun becomes ready on its Round 3 turn. Work the Guns subtracts from the live timer; reaching zero permits another shot that turn if AP remains. Duplicate turn notifications do not subtract twice.

Devastating Salvo prepares a charge. A compatible coordinated salvo still costs 1 AP for each participating gun; preparation also costs 1 AP. Three guns therefore need 4 AP in total. Compatible guns share a mount, damage type and system threat; every gun must have a legal range and arc. Their damage combines before Ward and Hardness. An unused prepared charge persists into later rounds. Ordinary single shots do not spend the prepared salvo.

## Push It — initial balance values

Optional Push It adds +2 to the ability check, never to its recovery die. Pay the originating station's resource on every attempt; double this payment on critical failure:

| Origin | Payment |
|---|---|
| Captain | 5% Morale |
| Engineer | 1 Strain |
| Navigator | 1 Supply |
| Battlewatch | 2 × B Hull |
| Veilwarden | 5% Lifeveil |

This also applies to shared reactions and Emergency Repair using their originating station. Backfire costs from the ability itself still apply.

## Ship library and future learning

Open the ship's Stations area for **Ability Library**. Choose four learned reactions to swap the reserve in. Station selections enforce the two Regular / one Surge / one Signature distribution. Loadouts are locked while that ship belongs to a started combat, including other active combats in the world.

The ship gains one learning credit at levels 5, 9, 13 and 17. Milestones are granted once. This release supplies the approved starting rosters and the fifth reaction reserve; additional learnable station abilities are future content. Credits are banked until that content exists. Learning and equipped selections are stored on the ship Actor; spent abilities and effects belong to the encounter's combatant state.

## Foundry playtest

1. Use a test ship with all five crew assignments and enough Supplies, Morale and Lifeveil. Add a target ship. Start a new combat and select the test ship's turn.
2. Open **Stations** on the ship sheet or the **Arkflight Combat Strip**. Confirm four entries per station, plus Shared Reactions and Basic Ship Controls. Hover costs and expand Roll outcomes, or open the managed Combat Reference journal.
3. Use Issue Order on Engineer, then Overcharge Arkengine. Verify the order modifies the ability check, 1 AP is paid for each, extra movement/maneuver appears, and the rolled Strain result enters the existing Strain system.
4. Use Rally Crew or Mend Lifeveil with room to heal. Check that chat shows the ability d20 and a separate recovery die. The resulting resource change must match the degree and B. Reusing that Regular in the same round must be blocked.
5. Use Coordinate Assault. Advance rounds. Its timer must show unavailable in Rounds 2–3 and ready in Round 4. Refresh the browser or reopen the sheet during the cooldown; the timer must survive.
6. In a separate fresh encounter, prepare Full Synchronization. Confirm half Speed extra movement plus one maneuver step. Fire a qualifying gun, advance the turn and fire another. The damage charge should still apply to the second attack after the refresh.
7. Fire a ready gun. Confirm 1 AP spent and a Reload timer appears. Advance that ship's turns and verify the automatic timer and AP refresh. Use Work the Guns on a reloading gun; if the timer reaches zero, fire with remaining AP. No paid Reload button should appear.
8. Test Set Attack Vector against an edge-of-arc target. Its normal bonus and critical-failure narrowing must affect the actual legal-shot check. Change heading and verify the old vector no longer applies.
9. Use Reinforce before incoming physical and energy attacks. Apply single-shot damage from chat as usual. Confirm protection is applied before Hardness and remains until the ship's next turn. Check Vent's critical guard against critical-hit Strain when that outcome occurs.
10. Use shared Emergency Repair and a reaction from a ship owner who is not assigned to that originating station. AP and RP must remain separate. A second Signature use must be blocked. Outside combat, swap Brace into the four equipped reactions; its old slot should disappear from combat choices.
11. Test a compatible coordinated salvo with at least two ready guns and enough AP. If Devastating Salvo is prepared, verify its per-gun damage and critical reload reduction. Confirm a single ordinary shot leaves that charge intact.
12. Test with two player clients: simultaneous ability/fire requests must recheck the current AP rather than both spend the same final point. One active GM acts as the automatic authority; no approval click is needed for the ability request. Foundry's existing reaction-choice prompts and single-shot Apply Damage buttons remain.

Watch the browser console for errors during the playtest. Automated Node tests cover resolution rules and mocked Foundry persistence/routing; they do not replace a live Foundry v14/PF2e session or encounter-balance playtesting.

## Ability reference


### Captain

**Issue Order — regular; 1 AP.** Choose another station; its next qualifying roll gains Ship Bonus.

| Degree | Effect |
|---|---|
| Critical success | Next two rolls gain Ship Bonus |
| Success | Next roll gains Ship Bonus |
| Failure | Next roll gains half Bonus, rounded up |
| Critical failure | Next roll takes −1 |

**Rally Crew — regular; 1 AP.** Restore 1d8 × Ship Bonus Morale, capped at 40 percentage points. Costs 1 Supply.

| Degree | Effect |
|---|---|
| Critical success | Rolled recovery; next Morale loss reduced by 5 |
| Success | Rolled recovery |
| Failure | Half recovery, rounded up |
| Critical failure | Lose 5 Morale; no recovery |

**Coordinate Assault — surge; 1 AP.** Mark a target; the next two attacks bypass Ship Bonus Hardness.

| Degree | Effect |
|---|---|
| Critical success | Two attacks bypass Bonus +1 Hardness |
| Success | Two attacks bypass Bonus Hardness |
| Failure | One attack bypasses Bonus Hardness |
| Critical failure | Next attack treats target Hardness as +1 |

**Drive the Crew — signature; 1 AP.** Spend 1 AP, gain 3 AP (net +2) this turn. +2 Strain; roll determines Morale cost.

| Degree | Effect |
|---|---|
| Critical success | 5% Morale |
| Success | 20% Morale |
| Failure | 25% Morale |
| Critical failure | 30% Morale |


### Engineer

**Vent Strain — regular; 1 AP.** Remove 1d4 + Ship Bonus Strain.

| Degree | Effect |
|---|---|
| Critical success | Rolled relief; next Strain gain reduced by 1 |
| Success | Rolled relief |
| Failure | Half relief, rounded up |
| Critical failure | Gain 1 Strain; no relief |

**Overcharge Arkengine — regular; 1 AP.** Gain one additional full movement and maneuver allowance; roll determines Strain.

| Degree | Effect |
|---|---|
| Critical success | +1 Strain |
| Success | +2 Strain |
| Failure | +3 Strain |
| Critical failure | +4 Strain |

**Redistribute Power — surge; 1 AP.** Route power to Propulsion, Weapons or Lifeveil. Choose two different routes from level 10. +1 Strain.

| Degree | Effect |
|---|---|
| Critical success | One additional route at normal strength |
| Success | Chosen routes at normal strength |
| Failure | Half numerical bonuses; retain maneuver step |
| Critical failure | Failure effects; +2 Strain total |

**Full Synchronization — signature; 1 AP.** Gain 50% Speed movement and 1 maneuver step; next two attacks gain 2 × Bonus damage; next two wardable hits reduce damage by 4 × Bonus. +2 Strain.

| Degree | Effect |
|---|---|
| Critical success | Weapons and Lifeveil cover three uses |
| Success | Normal strength, two uses |
| Failure | Normal propulsion; half power, two uses |
| Critical failure | Half power, one use |


### Navigator

**Charted Course — regular; 1 AP.** Gain half Combat Speed, rounded up, and 1 maneuver step. No Strain.

| Degree | Effect |
|---|---|
| Critical success | Half Speed and 2 maneuver steps |
| Success | Half Speed and 1 maneuver step |
| Failure | Half Speed only |
| Critical failure | Half Speed only; lose 1 Supply |

**Set Attack Vector — regular; 1 AP.** Chosen facing gains 15° × Ship Bonus arc tolerance, capped at 45°, until heading changes or next turn.

| Degree | Effect |
|---|---|
| Critical success | Normal tolerance +15°, capped at 60° |
| Success | Normal tolerance |
| Failure | Half tolerance, rounded up |
| Critical failure | Chosen facing tolerance narrows by 15° |

**Slip the Net — surge; 1 AP.** Automatically break a grapple and gain half Combat Speed of movement.

| Degree | Effect |
|---|---|
| Critical success | Break grapple; gain full Speed |
| Success | Break grapple; gain half Speed |
| Failure | Break grapple only |
| Critical failure | Break grapple; lose 1 Supply |

**Turn Between Heartbeats — signature; 1 AP.** Extraordinary movement in any direction; choose final heading without normal turning limits. Path must remain legal.

| Degree | Effect |
|---|---|
| Critical success | Gain Speed + Bonus movement |
| Success | Gain full Speed movement |
| Failure | Gain half Speed movement |
| Critical failure | Gain half Speed; lose 2 Supplies |


### Battlewatch

**Acquire Target — regular; 1 AP.** Next weapon attack against selected enemy gains Ship Bonus to hit.

| Degree | Effect |
|---|---|
| Critical success | Next two attacks gain Bonus |
| Success | Next attack gains Bonus |
| Failure | Next attack gains half Bonus |
| Critical failure | Next attack takes −1 |

**Ready Broadside — regular; 1 AP.** Next shot from selected broadside gains 2 × Ship Bonus damage. Costs 1 Supply.

| Degree | Effect |
|---|---|
| Critical success | Damage bonus; bypass 1 extra Hardness |
| Success | 2 × Bonus damage |
| Failure | Bonus damage |
| Critical failure | No bonus; lose 2 × Bonus Hull |

**Work the Guns — surge; 1 AP.** Reduce one weapon's reload by 1. A weapon reaching zero can fire now for its normal AP.

| Degree | Effect |
|---|---|
| Critical success | Reduce reload by 2 |
| Success | Reduce reload by 1 |
| Failure | Reduce by 1; next shot takes −1 |
| Critical failure | Increase reload by 1 |

**Devastating Salvo — signature; 1 AP.** Prepare a coordinated salvo: each participating weapon adds 2 × Ship Bonus damage. Firing costs 1 AP per weapon.

| Degree | Effect |
|---|---|
| Critical success | Normal bonus; each weapon reload reduced by 1 |
| Success | 2 × Bonus damage per weapon |
| Failure | Bonus damage per weapon |
| Critical failure | Failure bonus; lose 2 × Bonus Hull |


### Veilwarden

**Mend Lifeveil — regular; 1 AP.** Restore 1d4 × Ship Bonus Lifeveil percentage points.

| Degree | Effect |
|---|---|
| Critical success | Rolled recovery; next Lifeveil loss reduced by Bonus |
| Success | Rolled recovery |
| Failure | Half recovery, rounded up |
| Critical failure | Lose Bonus Lifeveil; no recovery |

**Healing Lifeveil — regular; 1 AP.** Spend 5% Lifeveil; restore 1d6 × Ship Bonus Hull.

| Degree | Effect |
|---|---|
| Critical success | Rolled Hull recovery; +1 Hardness against next hit |
| Success | Rolled Hull recovery |
| Failure | Half recovery, rounded up |
| Critical failure | No Hull recovery; lose 10% Lifeveil total |

**Reinforce Lifeveil — surge; 1 AP.** Reduce every incoming hit before Hardness until next turn: 3 at levels 1–9, 6 at 10, 9 at 15, 12 at 20. Costs 10% Lifeveil.

| Degree | Effect |
|---|---|
| Critical success | Full protection; 5% Lifeveil |
| Success | Full protection; 10% Lifeveil |
| Failure | Half protection; 10% Lifeveil |
| Critical failure | No protection; lose 15% Lifeveil |

**Renewal Wave — signature; 1 AP.** Restore max(5, 1d10) × Ship Bonus to Hull and Lifeveil using one roll. No Lifeveil payment.

| Degree | Effect |
|---|---|
| Critical success | Rolled recovery; next Veilwarden check keeps higher of two d20s |
| Success | Rolled recovery |
| Failure | Half recovery, rounded up |
| Critical failure | Half recovery; next Veilwarden check keeps lower of two d20s |


### Reactions

**Brace for Impact — regular; 1 RP.** Reduce incoming Hull damage by 3 × Bonus after Hardness.

| Degree | Effect |
|---|---|
| Critical success | Reduce Hull damage by 3 × Bonus; guard next Morale loss by 5 |
| Success | Reduce Hull damage by 3 × Bonus |
| Failure | Half mitigation, rounded up |
| Critical failure | No mitigation; lose 5 Morale |

**Emergency Bypass — regular; 1 RP.** Reduce an Engineer action's incoming Strain by Bonus.

| Degree | Effect |
|---|---|
| Critical success | Prevent Bonus Engineer Strain; guard a later Strain gain by 1 |
| Success | Prevent Bonus Engineer Strain |
| Failure | Prevent half Bonus Strain, rounded up |
| Critical failure | No prevention; gain 1 Strain |

**Evasive Maneuver — regular; 1 RP.** Gain +Bonus AC against this attack; +1 Strain.

| Degree | Effect |
|---|---|
| Critical success | +Bonus AC against this attack; +1 maneuver step; +1 Strain |
| Success | +Bonus AC against this attack; +1 Strain |
| Failure | +half Bonus AC, rounded up; +1 Strain |
| Critical failure | −1 AC against this attack; +1 Strain; lose 1 Supply |

**Spoil Their Aim — regular; 1 RP.** The declared enemy attack takes −Bonus.

| Degree | Effect |
|---|---|
| Critical success | Enemy takes −Bonus to this attack; +1 Hardness against next hit |
| Success | Enemy takes −Bonus to this attack |
| Failure | Enemy takes −half Bonus, rounded up |
| Critical failure | Enemy gains +1 to this attack; lose Bonus Hull |

**Emergency Ward — regular; 1 RP.** Reduce a wardable hit by 4 × Bonus before Hardness. Costs 5% Lifeveil.

| Degree | Effect |
|---|---|
| Critical success | 4 × Bonus mitigation; guard next Lifeveil loss by Bonus |
| Success | 4 × Bonus mitigation |
| Failure | 2 × Bonus mitigation |
| Critical failure | No mitigation; lose 10 Lifeveil total |


### Shared Emergency Repair

**Emergency Repair — signature; 1 AP.** Shared ship Signature: 1 AP and 2 Supplies; improve one condition step or roll 2d10 +5 Lifeveil recovery; doubled recovery from level 15.

| Degree | Effect |
|---|---|
| Critical success | One extra repair step or +5 Lifeveil recovery |
| Success | Normal recovery |
| Failure | One step repair; half Lifeveil recovery |
| Critical failure | No recovery; lose 1 additional Supply |

