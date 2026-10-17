# Sailing-game comparison and Arkflight combat review

17 October 2026. **Research and design recommendations, not implementation approval.**

Scope: crew ship combat, movement/facing, damage control, resources and combat-facing upgrades. This does not reopen all six pillars or implement another combat rewrite. The review compares published developer/publisher material with Arkflight source code at `e43e98b` and the latest conversation. It is not a live Foundry playtest or a claim to have measured player enjoyment.

## Main finding

Arkflight has enough mechanics to support a good crew game. The unresolved problem is how those mechanics compete for actions, resources and player attention. Finish the crew action contract before balancing more abilities.

The latest working direction is **two damage tracks (Hull/Lifeveil), three ship saves (Structure/Engineering/Veil), Strain as machinery pressure, named equipment faults, Morale and shared Supplies**. The code still implements five integrity/save tracks and shared ship AP. The earlier paper's shared Structure/Strain save has been superseded in discussion by the separate Engineering save.

## What other games offer

The observations in this table come from the linked sources. The Arkflight lessons are my design judgments.

| Comparison | Observed mechanic | Lesson for Arkflight |
| --- | --- | --- |
| **Guns of Icarus** — closest crew-role comparison | The developer manual distinguishes pilot, gunner and engineer specialties while allowing cross-role tasks. Components affect handling and gun performance. Its gameplay page explicitly describes engineering tools that improve firepower. [S1, S2] | Give each player ownership of a useful operation and allow basic fallback tasks. Engineer weapon augmentation belongs in the core loop. |
| **Sea of Thieves** — sailing teamwork and stores | Rare describes crews naturally dividing tasks, including repair and bailing; the official Supply guide distinguishes stored resources. [S3, S4] | Crew effort and the opportunity to replenish matter alongside stock quantities. Let buying a full load be reasonable preparation. |
| **Sails of Glory** — facing, movement and weapon identity | Ares describes ship-specific maneuver decks that account for wind and damage. Its combat preview separates planning, movement, combat and reloading; ammunition can favor Hull, crew or sails. [S5–S7] | Facing deserves rules and readable movement options. Distinct weapon jobs can create decisions without adding many health pools. |
| **Barotrauma** — engineering and campaign logistics | The official wiki describes a reactor powering engines, weapons and oxygen, with output/heat management. Its campaign documentation links restocking to outposts and faction reputation. [S8, S9] | Translate machinery into a visible power-versus-pressure decision; let ports, routes and factions affect supply access. |
| **PF2e vehicles** — rules-language anchor | GM Core distinguishes vehicle heading from creature facing, with forward travel and constrained turns. [S10] | Movement and facing are consistent with the Pathfinder vehicle foundation. Translate this into Arkflight's scale rather than importing every piloting check. |

These games span real-time and turn-based play. Their pressure and role relationships transfer more readily than their click frequency or complete simulation rules. The Barotrauma reactor wiki flags its numeric details as potentially outdated; this review uses the general power/heat relationship, not its temperatures or item balance.

## Keep these foundations

- Navigator owns route, facing and positioning; navigation abilities include their useful movement operation.
- Engineer can route power toward weapons, propulsion or protection, and distinguish venting pressure from repairing damage.
- Battlewatch chooses targets and weapons; distinct mounting and reload profiles are valuable existing content.
- Veilwarden protects the ship and preserves the magical/environmental envelope. Lifeveil retains that identity rather than becoming an automatic ablative Hull bar.
- Captain coordinates opportunities while each player retains their own station decisions.
- Separate AP and shared RP, automatic reloads, Surge/Signature timing, ship-owned progression, and PF2e-style ability outcomes.
- Basic cross-station fallback actions, so one missing or disabled specialist does not make the session unplayable.

## Problems and proposed fixes

### 1. The planned action budget does not yet support the current ability list

**Confirmed transition conflict:** the code uses shared AP. The proposed economy gives each station one action, but Acquire Target and Ready Broadside prepare an attack rather than include one. Fire still costs 1 AP per weapon; a four-weapon salvo costs four AP. Devastating Salvo is another preparatory action. Simply changing the AP refresh to one per station would leave the gunner preparing a shot they cannot personally fire that turn.

**Fix:** preserve the agreed station economy and redesign the operations around it. At least two ordinary Battlewatch choices should include one legal shot within their 1 AP action, with different accuracy/damage/handling benefits. A reload maneuver can deliberately trade away that shot. Multi-weapon salvos need an explicit commitment of additional station actions, staffed gunner positions, or a separately balanced battery rule. Do not silently make every installed gun fire for one AP.

Apply the same principle to Navigator: include the normal Helm operation in its navigation orders. Keep the roll's kicker separate from the reliable basic operation. Captain bonus actions belong to a named recipient, who chooses a legal action; they do not become an unrestricted shared damage budget. The same ability's round/cooldown limits still apply.

### 2. There are too many concurrent representations of damage

**Confirmed:** five integrity resources and sixty named faults now coexist with the older Hull/Drive/Weapons Strain condition tracks. Multiple representations can be internally correct but hard to understand together. The current fault modifier cap of −4 reduces numeric escalation but does not remove the number of things players must understand.

**Fix:** proceed with the two-track/three-save direction. Use one common fault framework. Engineering stress creates Engineering faults, physical hits create the appropriate physical faults, and Veil disruption creates Veil faults. Keep the d12 tables for variety; decide a small active-fault/escalation policy before allowing many simultaneous penalties. An initial policy to test is one active fault per affected subsystem, with further consequences escalating a defined severity rather than adding another independent modifier. This is a new recommendation, not an approved cap.

Treat the six percentage bands as status information; attach additional mechanical effects only where useful and explicit. Save acquisition and consequences remain automatic, with no routine GM choice gate. Existing ships need a reviewed migration that preserves damage severity, talents and fault history rather than deleting their Drive/Arkengine damage.

### 3. Repeatable damage needs an accessible damage-control response

**Confirmed:** named Emergency Repair clears one fault for 1 AP/2 Supplies, once per combat. Permanent Shipwright repairs take paid work orders outside the normal combat round. Repeated failed saves can create more faults than the shared Signature can clear.

**Fix:** keep Emergency Repair and add a dependable basic **Damage Control** action. Proposed behavior: spend 1 AP to suppress one fault's operational penalty until the next ship turn. It restores no Hull and does not permanently repair anything. Give it a clear source, duration and use limit so it cannot suppress the whole ship for one action. Permanent repair uses supplies and/or work time. This gives a damaged station an immediate choice between contributing offensively and keeping a system functioning.

Recovery should remain available when the relevant system is in trouble. A malfunctioning engine should not turn all possible engineering recovery into an unreliable maintenance treadmill. The temporary suppression proposal needs a playtest, especially where several crew members could otherwise chain it indefinitely.

### 4. Supplies lack a consistent carrying and expenditure contract

**Confirmed numeric mismatch:** a stock brigantine has Cargo Capacity 40; `syncResourceMaxima` gives it Supply maximum 400. The Hold manifest totals physical items, uninstalled components and Salvage Parts, but does not count the separate Supplies resource. Cargo validation checks the saved `cargo.used` value and warns about excess; it does not itself establish a Supply-to-Hold conversion. The inspected strategic travel path advances time without charging routine voyage Supplies.

The number 400 is not inherently wrong. The missing unit definition, authoritative cargo contribution and consumption schedule are the more important problems.

**Fix:** define one abstract Supply unit and its Hold cost, use one cargo calculation everywhere, and publish an expected route/repair budget. Charge logistics at route-leg or voyage milestones, and significant repairs/special consumables when used. Routine firing and basic piloting should remain simple. A full load is allowed; carrying it should displace something valuable or constrain the expedition. Restocking depends on an available port, faction access and time. Validate these costs across an expedition, not only one combat.

### 5. Morale has several labels but an underdeveloped crew role

**Confirmed:** 100% Morale grants an Inspired bonus; below 10% Crew Tactics are unavailable. Other code consumes Morale for orders and restores it through Rally/rest. The visible bands alone do not establish distinct decisions at every threshold. Drive the Crew's success costs 20% Morale and adds Strain while granting shared AP; those effects need a station-economy redesign.

**Fix:** make Morale about confidence and coordination. Define a small number of meaningful effects and major events that change it, while retaining the approved percentage data until a migration is chosen. High confidence can support one bounded coordination benefit; low confidence can constrain demanding command boosts rather than penalize every player's basic action. Rally should remain a useful route back. Avoid making the Captain choose a compulsory Rally loop simply to keep others functional. Morale should connect combat consequences to rescue, rest and campaign treatment of the crew.

### 6. Stacking and salvos need a shared balance baseline

**Confirmed:** Issue Order and Acquire Target both granting +2 combine to +2 in the current attack planner, not +4. Using both on one attack can waste a preparatory action. Offensive damage, Hardness bypass, AC, enemy attack penalties and mitigation also have different consumption rules.

**Confirmed isolated salvo effect:** ignoring accuracy/criticals/charges/reload, four 12-damage hits against Hardness 4 deal 32 Hull individually. Combining the same incoming 48 damage and applying Hardness once deals 44. That is a real aggregation advantage, not a complete damage-per-round verdict.

**Confirmed legal defense example:** at level 8, a brigantine's Hardness 4 plus successful Engineer Lifeveil power (4 mitigation) and Emergency Ward (8 mitigation) can reduce a qualifying 16-damage hit to zero. Reinforce Lifeveil's mitigation 3 is also available but the planner takes the stronger persistent ward, not both. The tested setup spent two AP and one shared RP and left Lifeveil at 85%; it does not assume spending two reactions from one RP.

**Fix:** keep clear PF2e-style stacking rules and show when an effect replaces an existing bonus. Give Captain and Battlewatch complementary benefits where overlap wastes actions. Zero damage can be an earned defensive success. Calibrate weapons and enemies against ordinary and fully prepared defenses, and compare salvos at equal action/resource cost with their accuracy and charge behavior included. A default solution should not dominate all targets.

### 7. Movement needs a complete operation, not a collection of allowances

**Current/proposed gap:** movement allowances and facing bonuses exist; the new Navigator-owned Helm contract is not implemented. Multiple sources can increase allowances. We have not settled normal travel, stationary pivot limits, extra Helm actions and the interaction of firing with unfinished movement under the new station budget.

**Fix:** one clear Helm action with path preview, normal turning budget and committed final facing. Engineer adds propulsion to that operation; Navigator executes it. Hard Turn is an explicit exceptional maneuver. Resolve a complete movement action before another station acts unless a specific ability permits an interruption. Preserve individual weapon arcs and range roles. Scenario currents, debris and cover can vary the problem without requiring a universal sailing-physics subsystem. Turn profiles should distinguish hulls and appear in previews.

### 8. Ship identity must include tradeoffs beyond more stations and bigger guns

Larger hulls gaining additional stations, mounting, durability and action capacity together can multiply their advantage. Small ships need meaningful handling, initiative, operating-cost or scenario advantages. The roster must say who operates extra stations and what an unstaffed station contributes.

**Fix:** compare small/medium/large ships at the same encounter budget, recording staffed actions, usable arcs, reload cadence, protection, upkeep and mission access. Keep weapon variants and mount upgrades, but test them as part of a complete crew turn. Upgrades should change choices: safer Overcharge, different turn profiles, or better field stabilization, alongside bounded numeric improvements. Those benefits can later contribute to the other pillars through their appropriate checks and resource contracts.

### 9. Combat needs victory conditions that reward maneuvering and restraint

**Confirmed implementation gap:** `combatVictoryState` currently ends when at most one ship remains active, without sides. Two surviving friendly ships can therefore keep its universal victory test open even after the opposition is gone. Broader side-aware and objective work is already on the roadmap.

**Fix:** support sides and an explicit objective: escape, capture, escort, defend, survive a timed threat, or defeat a ship. Success can depend on positioning, protecting cargo, disabling a specific system or securing boarding. This gives maneuvering, restraint and damage control a reason to compete with raw damage. Test the character-scale boarding transition separately.

## Recommended next scope

1. **Write the complete crew-turn/action contract.** Who acts, what their 1 AP includes, how firing and multi-gun commitments work, who controls extra actions, and how movement ends. Five focused design questions before this programming step.
2. **Settle two damage tracks / three saves / one fault framework.** Include overload, accessible damage control and preservation of existing ships. Finish the trigger questions before code conversion.
3. **Run a small encounter matrix before adding content.** Fix ranges, defense stacking and reload cadence against the agreed action budget. Preserve existing abilities by adapting the ones that conflict.
4. **Give Morale and Supplies explicit expedition jobs.** One cargo ledger and understandable restock/use rules; no per-cannonball or per-meal bookkeeping requirement.
5. **Implement the agreed rules, then reassess the full visual interface**, as previously requested. Necessary legal-action and path previews belong with rule implementation; the broad art/layout redesign remains later.

## First playtest targets

These are suggested acceptance targets, not proven balance numbers:

- Each staffed core station has at least two useful ordinary choices in a typical round. Record idle turns and turns spent solely preparing an action another budget cannot afford.
- A familiar crew can choose and resolve its ship turn in about five minutes. Record decision time, UI time and automatic roll/chat noise separately.
- Try a four-to-six-round baseline duel, a pursuit/escape, and an escort with two allies. Count saves, active faults, repair/suppression actions and rounds without meaningful participation.
- Compare firing now, aiming then firing, and salvos at equal action commitments; include missed attacks, criticals and cooldowns.
- Compare ordinary armor, active protection and the strongest legal one-RP response. Record zero-damage turns without assuming all zero-damage hits are failures of design.
- Simulate a short expedition with a full Supply load. Record cargo displaced, route spending, repairs, purchases and whether returning to port becomes an interesting choice.
- Test Captain absent, Navigator disabled and one missing player. Specialists should be rewarding while basic fallback tasks keep the session running.

## Arkflight evidence inspected

- `src/content/station-abilities.js`, `src/combat/ship-ability-rules.js`: costs, preparatory actions, recovery, Captain AP and Engineer routes.
- `src/combat/ability-effect-plans.js`, `src/combat/salvo-rules.js`: stacking, mitigation, charge handling and per-weapon action commitments.
- `src/ship/system-damage.js`, `src/ship/ship-conditions.js`: five-track saves/faults and parallel legacy Strain conditions.
- `src/ship/derive-ship.js`, `src/content/hulls.js`, `src/ui/hold-log-ux.js`, `src/ship/validate-ship.js`: Supply capacity and cargo accounting.
- `src/ship/morale-rules.js`, `src/ship/repair-rules.js`: Morale bands/recovery and paid repair packages.
- `src/voyage/travel-rules.js`, `src/foundry/voyage-travel-api.js`: inspected strategic time progression.
- `src/combat/combat-outcome.js`: side-unaware active-ship victory test.

Numeric examples were reproduced by calling the real pure resolvers during this review. No gameplay code was changed and no new rules were tested in live Foundry.

## Primary and official references

- **S1:** [Muse Games — Guns of Icarus manual](https://gunsoficarus.com/manual/).
- **S2:** [Muse Games — Guns of Icarus gameplay](https://gunsoficarus.com/gameplay/).
- **S3:** [Xbox Wire — Craig Duncan discussing Sea of Thieves crew roles](https://news.xbox.com/en-us/podcast/615-craig-duncan-sea-of-thieves/).
- **S4:** [Rare — Pirate Academy: Supplies](https://www.seaofthieves.com/pirate-academy/guide/supplies).
- **S5:** [Ares Games — Sails of Glory movement overview](https://www.aresgames.eu/37451).
- **S6:** [Ares Games — Sails of Glory: Fire!](https://www.aresgames.eu/7862).
- **S7:** [Ares Games — Sails of Glory standard rules and ammunition](https://www.aresgames.eu/7974).
- **S8:** [Official Barotrauma Wiki — Nuclear Reactor](https://barotraumagame.com/wiki/Nuclear_Reactor).
- **S9:** [Official Barotrauma Wiki — Campaign](https://barotraumagame.com/wiki/Campaign).
- **S10:** [Archives of Nethys — GM Core: Movement and Heading](https://2e.aonprd.com/Rules.aspx?ID=3119).

Some Rare and Ares pages blocked full-page retrieval; their narrowly described features above were supported by the publisher's indexed text. No specific current patch balance or complete tabletop rule reproduction is inferred from those snippets.
