# Arkflight 1.1.0: phased deck combat foundation

Recorded 21 October 2026, America/Los_Angeles. Status: accepted design foundation with explicitly identified proposals and tuning work. An opt-in phased combat alpha now implements the first playable slice; it is not a released ruleset. The Complication Lab remains available separately; see `ARKFLIGHT-1.1.0-IMPLEMENTATION-PLAN.md`.

This document supersedes conflicting future-design choices in `ARKFLIGHT-1.1.0-CARD-COMBAT.md`, including a separate RP economy, a fixed equipped hand without random draws, General/Flux/Signature as mandatory recovery classes, move-fire-continue as the normal maneuver flow, and one undivided ship turn. The existing combat path still implements its earlier prototype. The separate alpha implements hulls, native movement, phases, deck lifecycle, a small card set and complication consumers. Production catalog expansion, campaign migration and cross-pillar integration remain unfinished. See `ARKFLIGHT-1.1.0-ALPHA-TESTING.md` for exact scope.

## Shared vessel and pillars

The ship is a persistent shared character. Hull, Arkengine, weapons, equipment, talents, known techniques, and crew expertise contribute different capabilities. Combat, events, travel, trade and the other established pillars share that vessel without requiring identical turn structures.

Use PF2e as the mathematical and four-degree resolution guide, X-Wing as the maneuver/equipment interaction guide, and Limithron as the ship-and-crew coordination guide. Adapt their useful mechanisms rather than import incompatible action economies or numerical scales together.

Most routine legal movement works automatically. Attacks and contested actions can fail. Support cards normally provide their printed core effect with an additional benefit or complication determined by the roll. Ship level supplies the progression baseline, crew attributes/training supply expertise, and equipment supplies bounded modifiers. Count level once; exact formulas and DC/damage budgets remain tuning work.

## Round and AP economy

1. Start the round: refresh the shared ship AP and process scheduled beginning-of-round effects and normal draws once. Delayed AP bonuses apply after the normal AP refresh.
2. Commit hull maneuvers, then establish the round's initiative. Initiative is rerolled each round.
3. Movement phase: reveal locked hull maneuvers and execute all ships together using shared movement steps. This supersedes the earlier lowest-to-highest initiative movement order. Standard cards do not interrupt ordinary maneuvers; explicitly timed Instants require a defined response window.
4. Card phase: each ship completes its Card phase from highest to lowest initiative, rather than alternating one Standard card at a time. Other ships can respond with legal Instants and available AP.
5. Damage phase: test a simultaneous exchange. Resolve committed legal attacks and responses before applying the exchange's simultaneous damage; being destroyed by that exchange does not erase an otherwise valid committed volley.
6. End the round: process expiry and cleanup. Each reload, draw and recovery boundary must have one designated update so changing phases or initiative cannot advance it twice.

All card activations use the same shared AP pool, including Instants. There is no separate RP pool or RP hand. Unspent AP normally expires at its round boundary; keeping AP available enables later Instants. Card costs are printed: most 1 AP, powerful cards 2 AP, exceptional cards may be 3 AP. Zero-cost cards are rare, limited exceptions, not unrestricted draw/AP loops. Four shared AP remains the prototype starting value pending crew-participation and encounter testing.

Keep basic Fire Battery available without requiring the right random card; it still costs AP. The user's latest amendment makes Damage Control a card that consumes Supplies, removing the proposed always-available basic repair order. Repair costs and amounts remain to be balanced. The Captain coordinates the shared budget and crew members execute their station contributions.

Declare all committed batteries' targets at the beginning of the Damage phase before rolling attacks. Check range and arcs using the actual positions, including applicable Instant repositioning. If an Instant makes the target illegal, allow one replacement target for that battery before its attack roll. If none is legal, AP remains spent and ammunition/reload are not expended. Normal batteries attack once per round; an additional attack requires an explicit effect, not merely becoming ready again. A weapon fired in round R with Reload N returns at the beginning of R + N. The alpha resolves queued attacks in deterministic order, permits one defending Instant per attack before its roll, then accumulates Hull damage for the simultaneous exchange. Movement-phase Instant windows are not included in this initial card set.

Normal movement no longer pauses to fire and then continues. Movement cards can provide small later adjustments or explicitly permitted changes. Ordinary movement ceilings, maneuver difficulty and exceptions must be authored consistently in the hull/maneuver specification.

## Accepted movement amendment — 24 October 2026

Each hull offers predefined complete maneuvers with exact movement and facing instructions. Players choose a whole route, not freely place turns while executing it. Examples: Straight 3 = forward 3 hexes; Early Starboard Bank = forward 1, turn right 60 degrees, forward 2; Late Starboard Bank = forward 2, turn right 60 degrees, forward 1. Port equivalents mirror the turn. An S-Curve and a Hard Turn can contain multiple explicitly placed turns. The alpha catalog is in `src/alpha/hulls.js` and `src/alpha/maneuvers.js`; those numerical values remain subject to playtesting.

Clicking a maneuver previews its complete path and final facing without moving the real token. Locking stores that ship's choice; opponents see readiness rather than its route. When planning ends, reveal all locked routes and animate all ships together. Complete and confirm movement before opening the Card phase. Initiative continues to order the Card phase, not ordinary movement. Hulls have different maneuver selections, with talents and upgrades able to unlock additional routes.

Use shared movement steps and deterministic collision rules, independent of client animation timing. Check same-hex arrivals, head-on crossings, static obstacles and the full occupied footprint of larger hulls before animating resolved routes. Resolve contact without overlapping occupied footprints. The user rejected harmless stopping as the default collision design: collisions should create chaos, with an impact roll, moderate Hull damage to both vessels and possible opportunities to continue the fight on their decks. The user subsequently approved the collision framework below; exact formulas outside the stated prototype and detailed boarding/fouling procedures still require specification and testing. The accepted 26 October clarification below supplies step timing and blocked-route handling. Movement-phase Instant windows remain future work.

Accepted collision framework: contact must occur at the same movement step; crossing a location at different steps is not itself a collision. Resolve one impact damage roll and a separate ship-held Structure save for each vessel. Critical success suffers no Hull damage; success half; failure full; critical failure full plus one complication. Use 2d10 + 4 as the level-5 paper-test starting impact damage, not a finalized all-level formula. Angle and momentum distinguish glancing from head-on impacts; reinforced prows and hull talents can specialize deliberate ramming. Ships ending alongside create an opportunity to spend AP attempting to secure boarding lines; boarding is optional, not an automatic transfer to deck combat. Fouled rigging can assist boarding once its detailed rules are specified. Remaining in the same contact does not repeatedly deal impact damage: separate and strike again for a new impact.

Complication deck size approved: one shared 24-card Ship Complication deck, separate from combat decks and hands. The full 24-card/six-entry catalog (144 outcomes) is authored in `src/content/ship-complications.js` and documented in `ARKFLIGHT-1.1.0-SHIP-COMPLICATIONS.md`. An engine and isolated Foundry Lab now implement deck handling, choices and effect tracking; numerical balance remains a draft. The new alpha consumes these effects in its own controller; the older combat path remains separate. Each ship critically failing an impact save receives one automatic draw. A complication replaces the generic critical-failure complication; do not add both. No AP, normal draw or hand capacity is consumed. Cards have concise authored effects, applicability, duration and clearing rules. Pair-wide effects cannot duplicate-stack when both ships draw them. Show the revealed card briefly and record its effect on the affected ship, without a permanent extra HUD panel. The user broadened the same 24-card deck to cover collisions and explicitly authored failed card skill rolls. Use the triggering context to select an appropriate consequence automatically. Latest user rule: draw only on a final critical failure; ordinary failures never draw, including by card-specific exception. Critical-failure draws replace the fixed negative kicker rather than add to it. The user approved the revised format and starting programming: 24 themed cards, each containing Impact plus Captain, Engineer, Navigator, Veil Warden and Battle Watch entries; apply only the entry corresponding to the triggering collision or failed contribution. This replaces domain-filtered redraws and supplies 144 outcome entries across 24 cards. Favor positional problems, temporary tradeoffs and opportunities opponents can exploit. The first implementation caps draws at one per source event/ship; Coordinated activations share a source ID, with the first critically failing contribution in printed order selecting the entry. Actual ability controllers must supply that authoritative ordering. The catalog is now complete as draft content, not proven combat balance. Support base effects and genuine attack misses retain their established behavior. Travel/event triggers require their own explicit later adaptation.

Additional accepted movement refinements: show traced paths, numbered hexes, turn arrows, a destination ghost ship and the full written move/turn sequence in previews. Differentiate hull handling through available routes: tight early turns for Cutters, versatile broadside positioning for Brigantines, and longer approaches for heavier Galleons. Normal legal maneuvers activate automatically; Navigator cards provide exceptional adjustments, with crew rolls determining those cards' kickers and complications. These accept the previous recommendation's points 3-5. On 26 October the user accepted one translation hex per shared step, with turns at printed waypoints and no separate turning beat.

Foundry v14 feasibility was checked against official documentation: `TokenMovementOptions.planned` holds movement, `TokenDocument.startMovement` releases it, waypoint paths describe routes, and `Scene.moveTokens` accepts multiple token instructions and reports per-token completion. Arkflight must implement phase coordination, explicit turn/facing steps, collision resolution, authoritative saved choices and recovery from incomplete movement. The existing one-ship executor does not implement this amendment. Native capabilities establish feasibility, not live-world acceptance; verify with the user's PF2e world and active modules before calling it working.

Official API references:
- https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TokenMovementOptions.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.Scene.html

## Deck, hand and card zones

| Element | Prototype baseline |
| --- | --- |
| Permanent library | Ship-owned learned/acquired cards; persists outside combat |
| Selected combat deck | 15 cards as the starting/minimum deck size |
| Opening hand | 5 random cards |
| Maximum hand | 7 cards |
| Normal draw | 1 card at the beginning of each subsequent round; the opening deal replaces the first normal draw |
| Retention | Unplayed cards stay in hand between rounds |
| Hand overflow | Draw, then choose cards to discard down to the hand limit |
| Empty draw pile | Shuffle eligible discards into the draw pile; never include pending, active or Burned cards |
| Opening mulligan | Once: return up to 2 opening cards, shuffle them into the draw pile, draw replacements |
| Duplicate limit | Up to 2 copies of ordinary cards; 1 copy of a Unique card |
| Regroup | Basic order: 1 AP, discard 1 and draw 1, once per round |

Hull, level and talents can modify deck capacity, opening hand and hand capacity through explicit progression. A larger deck is optional capacity, not automatically a stronger deck. Larger crews can justify modest hand advantages; do not automatically increase hand, draw rate and AP together on every larger hull.

The zones are Library, Draw pile, Hand, Prepared effects, Discard and Burned. A selected combat deck is assembled from eligible library entries before combat. Random draws represent changing tactical opportunities without removing basic ship capabilities.

## Card structure

General/Flux/Signature are no longer mandatory recovery classes. Separate:

- Timing: Standard or Instant, with explicit allowed windows/triggers.
- AP cost and any additional explicit resource payments.
- Role: Maneuver, Attack, Defense, Repair, Command or Utility.
- Requirements: compatible equipment, operators, positioning, resources or setup.
- Keywords such as Unique, Coordinated, Setup, Finisher, Delayed and Burn.
- Four authored outcomes, target/effect scope, durations and recovery conditions.

Most cards should work independently. Setup usually improves an effect or unlocks an alternative. Ordinary combinations should involve about two meaningful contributions; longer chains are exceptional. Named/typed bonus rules and explicit limits prevent repeatedly applying the same preparation from multiplying its bonus.

Instant effects can reposition, adjust facing, draw, modify attacks, protect, recover cards, or do other explicitly authored things. Each needs a defined window; Instant alone does not permit interrupting every internal resolution step. Initially allow one Instant per ship per triggering event; further response windows require an explicitly authored interaction. Validate affected movement, range and arcs after legal repositioning. A displacement off an unfinished maneuver ends its remaining path unless the effect explicitly permits continuation; do not grant a replacement free route. Newly drawn cards can be played immediately if their timing, requirements and AP permit; a Standard draw does not reopen a completed Card phase. Limit self-triggering and repeatable draw/recovery loops.

## Coordinated and delayed effects

Coordinated cards usually involve two operators, with three reserved for exceptional moments. Each operator rolls for a defined contribution; do not require every operator to succeed before any part can happen. For example, Engineering determines weapon preparation and its complications while Battle Watch's attack check determines the hit. Sufficient NPC crew can supply a baseline operator for an unoccupied station; PC expertise improves that contribution. Undercrewing can explicitly restrict some actions, with eligibility visible before activation.

Delayed cards spend AP and make required crew checks when played. Record their rolled outcome, activation boundary and expiry then; do not charge AP or roll activation again next round. Move the card out of the hand into the Prepared area until its pending/active effect ends. Then discard or Burn it according to its rules. Identical preparations do not stack unless explicitly allowed. Initially cap AP gained from preparation effects at +2 per round, with only explicit advanced exceptions. Pending combat effects expire at encounter end without refunding AP; longer-duration voyage preparations have their own authored lifetimes.

Illustrative delayed cards, not balanced catalog entries:

- Prepare the Crew: 1 AP now for +1 shared AP after next round's normal AP refresh. This shifts tempo; versions generating more AP need an additional meaningful limitation.
- Brace for Combat: Common, Standard, Delayed; prototype 1 AP now for DR 3 from the beginning through the end of the next round, against explicitly identified damage. Common is rarity, not a recovery class. It normally discards after the prepared effect ends. Apply reduction per resolved battery attack, not once per individual cannon. It follows the accepted protection/play-limit contract below; affected damage tracks and the exact damage-mitigation order remain numeric/rules specification work.

Burn removes a played card from reshuffling for the encounter. It becomes available again after that encounter. Burn is not permanent loss of library knowledge and does not replenish genuinely consumed ammunition or equipment charges.

## Hulls, equipment and progression

- Start with 10 distinct hulls, within the requested 7-12 range, with expansion support.
- Most ships occupy 1 hex. Massive/giant vessels occupy at most 3 hexes total, not a 3-by-3 footprint. The alpha uses a bow anchor and a straight chain of one to three occupied cells behind it. Per-step footprint/wall checks are implemented; continuous physical rotation/sweep simulation is not claimed.
- Hulls are distinct roles rather than a replacement ladder; small hulls remain useful through advancement.
- Use mounting locations plus fitting capacity and explicit compatibility requirements. Cargo space is consumed when a fitting explicitly occupies storage; avoid redundant universal capacity taxes.
- Essential level-appropriate accuracy/defense progression comes from ship progression. Equipment purchases emphasize distinctive properties and capabilities. Numerical budgets remain unsettled.
- Ready weapons, range, arcs and individual reloads still constrain firing. More AP cannot bypass readiness without an explicit effect.
- Ordinary ammunition is abstracted through Supplies; special ammunition uses the accepted charge-backed card treatment below.
- Major talents introduce meaningful capabilities or alter rules, with smaller supporting talents. Extend relevant major talents into other pillars and audit coverage across all established pillars.
- Travel routes trade time, danger, Supplies and opportunities. Cruise performance is distinct from tactical combat movement.
- Events use the same ship, library, equipment and talents but retain appropriate event choices and resolution. Installed capabilities can modify a check, unlock an approach or change a consequence/reward. Trade-only techniques should not crowd an ordinary combat hand.

The 26 October alpha contract below supersedes the prior reduced damage/save working paper for this slice. Obsolete five-integrity and RP rules are not reinstated. Persistent campaign faults and migration remain future work.

## Cargo Bulk: user-requested design direction

Use PF2e Bulk for cargo capacity rather than a parallel cargo-unit currency. PF2e Bulk represents size, weight and handling awkwardness, with numeric, Light and negligible values; 10 Light contributes 1 Bulk. Existing PF2e items retain their applicable Bulk values. Hulls receive authored cargo Bulk capacities rather than a player character's Strength-based carrying limit.

Trade consignments can be represented as named batches with quantity, per-batch Bulk, value and cargo tags such as perishable, hazardous, contraband or delicate. The sheet totals carried Bulk. Storage talents/upgrades may increase capacity or reduce the effective Bulk of explicitly eligible cargo, with a bounded, non-duplicating packing rule. Exact capacities, packing amounts, overload consequences, Supply-stock Bulk and passenger/accommodation treatment remain proposals for the cargo stage.

Reference: https://2e.aonprd.com/Rules.aspx?ID=2153 (Player Core p. 269).

## Special ammunition cards

Special ammunition uses an Attack/Ammo card that queues its own shot, rather than requiring both an ammunition card and a separate basic Fire Battery payment for that same shot. A printed cost and weapon requirements govern it. Actual shots consume a real matching stock charge even on a miss; drawing, discarding, reshuffling or ending combat must not create ammunition. Discard the used card normally; it is playable again only with matching stock. Clearly mark unavailable ammunition cards. No shot means no ammunition/reload expenditure, and spent AP is retained under the interrupted-action rule above.

Example concept: Chainshot Volley, a specialized attack affecting propulsion/steering through an explicitly authored effect instead of simply being a higher-damage cannon shot. Cost, damage, station checks, eligibility at deck construction and fault interaction remain balance work. Do not equate consumable stock with Burn's encounter-only recovery.

## Paper-combat decisions: second questionnaire

- Test a level-5 Brigantine against a level-5 Cutter, both one hex, using coordinated-attack versus maneuver/defense deck identities.
- Accepted initial Brigantine benchmark: Hull 120, AC 22, expert operator attack around +13, routine support DC 20, basic battery damage 2d10+8. These are test numbers, not the completed progression or a final Cutter profile.
- Operator personal PF2e spell/equipment bonuses apply only through explicit compatibility rules; they do not automatically modify ship checks.
- Attack critical failure is a miss plus a small authored complication; dangerous weapons can explicitly advertise a greater risk. Routine friendly fire and severe self-damage are not the default.
- Hull/Lifeveil loss, Strain, Morale changes, spent Supplies/ammunition and persistent faults survive the encounter until recovered. Hand/discard/Burn and temporary combat effects reset through their own lifecycle, without automatically healing the ship.
- Repair is card-based and consumes Supplies. A Common repair card and starting-deck repair access are recommendations for the first test, not yet approved catalog entries or fixed repair amounts.
- Accepted protection rule: an AC-modifying card, a DR card and a resistance card may all be played in the same round and their applicable effects may coexist. Each ship may play at most one DR card per round, regardless of card name. This is a play prohibition, not merely a rule to apply only the stronger of two newly played cards. Standard, Instant and Delayed DR cards share that round's play limit; delayed activation does not count as playing the card again. The existing no-stacking rule still prevents identical preparations adding together across overlapping durations. Exact AC bonus typing, damage applicability, resistance interactions, damage tracks and mitigation order need explicit rules before implementation; do not silently impose the DR play limit on all AC or resistance cards.
- Question 20 is accepted: enemy ships follow the same core phase, AP, equipment and attack rules, with curated decks and a compact panel suggesting legal plays. Optional behavior assistance can operate simple enemies; important enemies retain full manual control. This is an implementation requirement, not a claim that an enemy controller is already built.
- Phase-aware Foundry encounter integration is feasible design work, not a feature already implemented. The current adapter mirrors an earlier single execution order. Use an authoritative phase controller and native encounter synchronization, with once-per-round bookkeeping and actual v14/PF2e validation before claiming it works live. Reference: https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html.

## Builder, interface and introduction

Build a purpose-first wizard with suitable hull suggestions and complete recommended loadouts, followed by customization. Explain effects on combat, travel, cargo and events. Support new ships, refitting, card loadouts and level-up/talent choices, with a review of the resulting vessel before commitment.

Provide a resumable interactive introduction: choose a station, inspect a ready-built ship, maneuver, cooperate on a card, resolve an event and complete a delivery. Include a searchable written guide and per-lesson skipping.

The combat UI emphasizes the current phase, shared AP, hand, prepared effects, weapons and relevant Instant windows. The complete ship sheet is the place for persistent building, cargo, library, talents and equipment. Introduce simple test controls early; finalize the full presentation after the underlying rules work.

## Implementation sequence and acceptance

1. Rules contract and numeric progression budgets.
2. Contrasting hull profiles and maneuver/footprint data.
3. One authoritative native Foundry movement executor; resolve the existing live synchronization failure.
4. Weapons, batteries, positioning and readiness.
5. Crew checks and phased/AP resolution, including response windows and simultaneous damage.
6. Damage, resources, saves, faults and repairs.
7. Deck lifecycle and a small complete card set, including Instants, Coordinated and Delayed effects.
8. Equipment, cargo Bulk, trade and travel integration.
9. Talents and ship advancement across the pillars.
10. Ship sheet, combat HUD and builder/refit wizard.
11. Expand the card collection and add the guide/interactive introduction.
12. Versioned migration, live GM/player acceptance, and release preparation.

Use 20 focused questions for each substantial design stage, with further questions only when an unresolved gap requires them. Do not reopen accepted choices without identifying a concrete conflict. First milestone: a short two-ship encounter proving the new maneuver, deck, crew, Instant and delayed-effect flow before rewriting the complete catalog. Include a poor opening hand, damage mitigation, actual native movement and refresh/reopen checks. Target ordinary encounters at 4-6 rounds. Mocked tests alone do not establish live Foundry acceptance.

Recording this document does not itself release rules. The opt-in alpha described below is implemented separately; no campaign migration, manifest version bump or release has been performed.

The first [paper encounter kit](playtests/DECK-COMBAT-PAPER-01.md) supplies two test ships, 15-card decks, provisional card effects and a saved opening state. Its new numeric values are test proposals, not additions automatically approved for the production catalog.


## Accepted alpha clarifications — 26 October 2026

These clarify or supersede earlier open proposals above; the saved paper encounter remains historical and unchanged.

- Use dedicated test ships and a dedicated scene, preserving campaign Actors.
- A forward 1 → turn 60° → forward 2 maneuver uses three translation beats. Turning occurs at its printed waypoint without an extra beat.
- Collision priority compares Structure save degree, then total. The winner continues its chosen route. The loser stops and moves to the nearest legal neighboring cell only if needed to clear the winner, excluding occupied cells, obstacles and the winner's remaining route. Exact tie or no safe displacement stops both.
- Lifeveil is a resource for chosen defensive cards, not an automatic second HP pool. Weapon damage reaches Hull after applicable protection.
- Hull, Strain and Lifeveil use ship-held Structure, Engineering and Veil saves after worsening in danger. Save at most once per system per round unless entering a worse band. Unchanged resources do not reroll. Structure/Veil danger bands are 50/25/10%; Strain bands are 50/75/90%.
- A failed system save gives a short next-check setback. Critical failure replaces that setback with a matching Complication: Structure → Impact, Engineering → Engineer, Veil → Veil Warden. No recursive draw or second fixed critical-failure penalty. A collision's Structure save covers that contact's Hull damage.
- Preserve level-5 Hull 120/100 while increasing weapon damage toward 4–6-round encounters. The alpha Brigantine broadside is 4d10+8; Cutter 4d8+6. These supersede the older 2d10+8 alpha weapon proposal, not the saved paper kit. A twelve-seed scripted matchup averaged 4.75 rounds (range 1–7); live balance remains unproven.
- Initial playable catalog: ten hulls, twenty-one combat cards, six upgrades and six talents, plus the existing twenty-four Complication cards. Card collection and progression are not production-complete. Travel/trade/event capability records do not yet drive legacy pillar consumers.

See `ARKFLIGHT-1.1.0-ALPHA-TESTING.md` for launch, manual play, recovery and acceptance checks. The new executor's mock tests do not establish a fix for the old guided-demo movement failure in the user's actual world.


## Accepted permanent library decisions — 26 October 2026

- Learning a card unlocks its permitted deck copies: two ordinary, one Unique. Individual copies need not be separately acquired.
- Each ship holds three named loadouts with one selected before combat. Library/loadout editing remains outside combat.
- Players browse learned cards; the GM browses the full catalog.
- Begin acquisition with GM grant/remove tools; connect loot, training and trade later.
- Refit/removal changes flag invalid loadouts and block launch without deleting their cards or silently selecting a replacement.

These are implemented for opt-in alpha ship Actors; see `ARKFLIGHT-1.1.0-SHIP-LIBRARIES.md`. The permanent collection and loadouts are distinct from each encounter's Hand/Draw/Discard/Burn instances. This does not migrate campaign ships or persist test encounter Hull/Supply between fixture resets.
