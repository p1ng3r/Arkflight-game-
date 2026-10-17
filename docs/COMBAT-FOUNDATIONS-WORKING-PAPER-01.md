# Arkflight combat foundations — Working paper 01

17 October 2026. **Discussion draft: not approved, not implemented.**

The current development build has five integrity tracks and automatic saves/faults. This paper proposes a simpler alternative for discussion. It does not change the running module, retire saved ship data, or supersede the implemented-rules guide. Decide the resource structure before changing abilities or programming a migration.

## The experience we want

A Pathfinder-inspired crew game: understandable action costs, coordinated station turns, meaningful positioning, consequential rolls, weapons and upgrades that change decisions, and recovery that keeps players participating. Every station needs useful choices and a distinct job.

## First proposal: two damage tracks, with different supporting resources

| Element | Meaning | Typical change | Main crew response |
| --- | --- | --- | --- |
| Hull | Physical survival of the vessel | Weapon impacts and collisions | Repair, damage mitigation, better positioning |
| Lifeveil | Integrity of the protective magical/environmental envelope | Explicit veil disruption; specified ward ability costs | Reinforce, stabilize, restore the envelope |
| Strain | Accumulated pressure from pushing the machinery | Overcharge, weapon overloading, explicit stress effects | Vent, redistribute power, accept risk |
| Faults | Specific damaged or malfunctioning equipment | A failed consequence check or an explicitly authored system hit | Suppress or repair the named fault |
| Morale | Crew confidence, cohesion and command endurance | Major setbacks, rallying, demanding Captain orders | Rally and coordinate the crew |
| Supplies | Abstract stores for repairs, maintenance and travel | Meaningful repairs and voyage expenses | Choose when to spend; replenish when the fiction allows |

Under this proposal, Drive and Arkengine can suffer persistent faults without each needing a separate percentage health pool. Existing fault content and ship-owned save modifiers can be reused where appropriate; their triggers would need redesign. This would replace part of the recently implemented five-track system and therefore needs explicit approval and a safe migration plan.

## What happens to incoming damage?

An ordinary weapon attack deals Hull damage after applicable defenses. A specifically described veil-disruption attack reduces Lifeveil. A weapon may retain its fire, cold, piercing or other damage flavor for resistances and abilities; that label does not create another health pool.

Lifeveil remains a protective envelope. Ordinary hits do not automatically empty it before reaching Hull. An active ward can reduce incoming damage, with an explicit Lifeveil or action cost where appropriate.

Illustrative arithmetic only: 25 incoming damage minus 4 Hardness and 6 active Ward leaves 15 Hull damage. Reduction stops at zero. The stacking/order rules and balanced amounts are a later decision.

## Can the Arkengine be damaged?

Yes. Strain represents pressure building up; an Arkengine fault represents actual trouble left behind. An overload consequence might cause a cracked conduit or unstable regulator. Venting reduces Strain; repairing clears the fault. Venting should not automatically erase broken machinery.

A targeted attack could also cause an engine fault if its rules explicitly permit that outcome. Avoid adding a second routine save or another damage roll merely because a fault was acquired. Exact triggers, save frequency and severe-failure limits remain open.

## Each station contributes

| Station | Primary contribution | How it helps the crew deal damage or survive |
| --- | --- | --- |
| Captain | Coordination and Morale | Organizes action order, opens opportunities, rallies the crew |
| Engineer | Power and machinery | Routes power to weapons for extra damage or penetration, enhances propulsion or wards, manages Strain and repairs |
| Navigator | Route, movement and facing | Brings batteries into arc, controls approach/escape, sets up ramming or boarding |
| Battlewatch | Targets and weapon execution | Acquires targets, fires the right battery, exploits openings and manages reload opportunities |
| Veilwarden | Protection and life support | Blunts incoming damage, restores Lifeveil and sustains the crew |

Engineer weapon augmentation should build on Redistribute Power's existing weapon route. Exact damage, penetration and duration need balancing; no new competing buff is approved here.

## Morale and Supplies: give them a purpose before setting numbers

Keep Morale focused on crew coordination and demanding command abilities. Major events can move it; routine hits need not require repeated bookkeeping. Low Morale should leave recovery and useful participation available. Its bands, costs and benefits remain a separate discussion.

Keep one shared Supplies pool with a ship-specific carrying limit. Buying up to that limit is reasonable preparation. Supplies become meaningful through competing repair/travel needs, limited opportunities to restock, cargo tradeoffs, and actions/time/use limits on repairs. A large stock should not allow unlimited repairs during one turn. Avoid deducting ammunition, food and maintenance separately every round. Units, capacity and prices remain open.

## Work through this slowly

1. Decide whether Hull and Lifeveil are the only direct damage tracks.
2. Define Strain's route into persistent faults and how repair differs from venting.
3. Define Morale's gameplay job and recovery.
4. Define Supplies, capacity, spending and restocking.
5. Fit movement, facing, station abilities and upgrades onto that agreed structure.

Only the first decision is ready for discussion now. Later sections are recommendations to revisit, not a complete replacement ruleset. Before programming the next bounded step, ask the agreed five focused questions about that step.
