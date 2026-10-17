# Arkflight combat foundations — Working paper 01

17 October 2026. **Two damage tracks accepted as the design direction. Latest discussion separates Structure, Engineering and Veil saves; detailed triggers below remain a working proposal. Not implemented.**

The current development build has five integrity tracks and automatic saves/faults. This paper records the accepted simpler direction and the proposed trigger contract for discussion. It does not change the running module, retire saved ship data, or supersede the implemented-rules guide. Decide the resource structure before changing abilities or programming a migration.

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

The accepted direction gives Drive and Arkengine persistent faults without separate percentage health pools. Existing fault content and ship-owned save modifiers can be reused where appropriate. Converting the recently implemented five-track system still requires an agreed trigger contract and a safe migration of existing damage, faults and upgrades.

## What happens to incoming damage?

An ordinary weapon attack deals Hull damage after applicable defenses. A specifically described veil-disruption attack reduces Lifeveil. A weapon may retain its fire, cold, piercing or other damage flavor for resistances and abilities; that label does not create another health pool.

Lifeveil remains a protective envelope. Ordinary hits do not automatically empty it before reaching Hull. An active ward can reduce incoming damage, with an explicit Lifeveil or action cost where appropriate.

Illustrative arithmetic only: 25 incoming damage minus 4 Hardness and 6 active Ward leaves 15 Hull damage. Reduction stops at zero. The stacking/order rules and balanced amounts are a later decision.

## Can the Arkengine be damaged?

Yes. Strain represents pressure building up; an Arkengine fault represents actual trouble left behind. An overload consequence might cause a cracked conduit or unstable regulator. Venting reduces Strain; repairing clears the fault. Venting should not automatically erase broken machinery.

A targeted attack could also cause an engine fault if its rules explicitly permit that outcome. Avoid adding a second routine save or another damage roll merely because a fault was acquired. The proposed triggers and overload exception are recorded below; DC tuning and migration remain to be settled before programming.

## Three saving throws — proposed trigger contract

The user endorsed simplifying the save types after accepting Hull and Lifeveil as the two direct damage tracks. Structure covers physical impact; Engineering covers Strain and unstable power; Veil covers the protective envelope. The user requested Engineering have its own save after the earlier two-save proposal. That separate Engineering save supersedes the shared Structure/Strain check described in the previous draft. Morale and Supplies have no routine save of their own. These remain ship-owned d20 saves with Ship Bonus and appropriate Hull, Arkengine, talent and modification contributions. Exact DC progression and modifier migration are a later bounded decision.

| Event | Required result |
| --- | --- |
| Actual Hull damage leaves Hull at 50% or lower | One Structure save, if not already resolved this round |
| Actual Lifeveil disruption leaves Lifeveil at 50% or lower | One Veil save, if not already resolved this round |
| A positive Strain gain leaves Strain at 50% or more, below its limit | One Engineering save, if not already resolved this round; replaces the separate Strain flat check |
| Strain reaches or exceeds its limit | One automatic Arkengine fault and the pressure discharge described below; no additional Engineering save for the same overload |
| Another damaging incident in a later round leaves Hull or Lifeveil at/below 50% | Relevant save becomes eligible again |
| Further Strain gained in a later round leaves Strain in its danger range | Engineering save becomes eligible again |
| Ordinary round passage without qualifying damage or Strain gain | No save |
| Healing, venting, acquiring a fault, clearing a fault, or applying a negative modifier | No save and no automatic chain of further consequences |
| Paying Hull/Lifeveil/Morale/Supplies as an ability cost | No damage save merely for paying the cost |
| An ability adds Strain | The normal Strain trigger applies; Strain is pressure even when voluntarily incurred |

Thresholds use actual resource ratios before display rounding. Exactly 50% qualifies. Hull remains a point pool; Lifeveil remains a percentage resource. The six Hull/Lifeveil display bands can remain without producing extra rolls at 25% or 10%.

### One check per family per round

At most one save of each family per ship per round. Hull damage uses Structure's round mark; Strain uses Engineering's; Lifeveil disruption uses Veil's. Hull damage does not consume the protection against engineering trouble later in the round.

A critical hit can require Structure and Engineering saves if its actual Hull damage and Strain gain independently qualify. It does not also cause the old Strain flat check or a separate Arkengine integrity save. Veil checks require actual Lifeveil disruption, not merely an energy damage label. Healing then crossing a threshold again does not reset that family's round mark. This can produce more checks than the prior shared Structure/Strain draft; playtest whether the independent protections justify the added resolution.

### Full Strain is an explicit limit consequence

Recommended limit policy: reaching the Strain limit causes one automatic Arkengine fault and discharges pressure, carrying excess Strain forward as under the existing pressure-cycle concept. Reaching the limit still matters when Engineering has already saved earlier in the round. The once-per-round rule limits saving throws; it does not grant immunity to an explicit full-Strain overload.

For a single incident that both damages Hull and reaches full Strain, resolve the automatic Arkengine fault instead of an Engineering save and mark Engineering resolved for the round. A separately qualifying Structure or Veil save remains independent. Distinct later overload incidents can cause another automatic fault; they never cause another routine Engineering save that round. A single unusually large Strain source causes one overload fault rather than one per crossed limit; exact excess handling for such sources needs a bounded numeric rule before programming.

This exception preserves a meaningful limit without duplicating the ordinary check. It must be shown in the interface rather than hidden behind the once-per-round wording. Venting pressure does not repair the overload's fault. Duplicate fault outcomes reroll; a saturated table adds no duplicate fault.

### Which fault table applies?

- Ordinary Hull impact: Hull/physical fault table.
- Failed check from engine stress or automatic overload: Arkengine fault table.
- Explicit rigging/steering threat: Drive fault table when the authored effect permits it.
- Lifeveil disruption: Lifeveil fault table.

For ordinary Hull damage, the attack's impact is the Structure threat. Strain is independently an Engineering threat. An explicit targeted-system effect can identify a different affected physical system. Table choice follows a written source rule; the GM should not need to improvise it. Any weapon-specific override and the fate of old Morale fault data must be reviewed during migration.

### Two small examples

**Cannon impact:** Hull falls from 110/200 to 94/200. Roll one Structure save. On failure, resolve one physical fault automatically. More Hull damage in this round does not cause another Structure save. More actual damage next round can.

**Overcharge:** Strain rises from 4/10 to 6/10. Roll Engineering if its round mark is unused. Failure gives one Arkengine fault. If Engineering already saved earlier this round, apply the Strain without another routine Engineering save. A Structure save earlier this round does not prevent this Engineering check. If a later effect takes Strain to its limit, the automatic overload consequence still occurs.

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

1. Accepted direction: Hull and Lifeveil are the direct damage tracks; Structure, Engineering and Veil are the current three save families.
2. Review the trigger contract above, including the full-Strain exception; settle DCs and migration before programming.
3. Define Morale's gameplay job and recovery.
4. Define Supplies, capacity, spending and restocking.
5. Fit movement, facing, station abilities and upgrades onto that agreed structure.

The first architectural decision is recorded. The trigger contract is ready for a mock/playtest discussion; later resource sections remain recommendations, not approved numeric rules. Before programming the next bounded step, ask the agreed five focused questions about its unresolved DC, overload, fault, migration and recovery choices.


See [the sailing-game comparison and combat review](SAILING-GAME-COMPARISON-AND-COMBAT-REVIEW.md) for evidence, remaining conflicts and proposed fixes. Its new recommendations are not automatically approved rules.
