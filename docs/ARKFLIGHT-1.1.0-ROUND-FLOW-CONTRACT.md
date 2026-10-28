# Crew round-flow contract

Status: user-defined round structure, 28 October 2026. This is the implementation contract, not a claim that the existing alpha controller already follows these phases.

## Confirmed decisions

- Each ship has one shared crew hand. Individual players do not receive separate five-card hands.
- Round 1 begins with five cards per ship and a dedicated opening/mulligan phase.
- A crew may return zero, one or two cards; draw exactly the number returned. Its opening hand remains five.
- Opening/mulligan completes before maneuver planning begins. It never repeats in later rounds.
- From round 2 onward, the owning crew explicitly clicks its ship’s deck icon to draw one card into the shared hand. This replaces automatic round-start drawing.
- Every involved living ship chooses a legal hull maneuver and locks it. The GM controls NPC ships.
- Only after all ships lock does the primary GM receive a Yes/No movement confirmation. Crew connection/readiness is visible. No means wait; it does not execute movement.
- Yes executes the locked maneuvers together on the Foundry canvas through the confirmed-movement journal.
- Card selection/planning and card resolution are distinct phases.
- Normal battery firing costs 1 AP during Firing, from the same shared ship pool.
- Instants also cost their printed AP from that pool. No AP means no Instant. There is no RP pool or free Instant allowance.
- Weapon-distance bands affect accuracy as well as having clear colors and labels.
- Round-end results appear in a recap popup and are recorded in a journal with a visible ID/link.

## Authoritative phase order

### Opening — round 1 only

Deal each ship its shared five-card hand. Show Keep or Return up to 2, selections and replacement count. The Captain/authorized crew confirms one collective mulligan per ship; multiple crew members must not independently replace the same hand. Resolve all ships' opening choices, including GM-controlled ships, before entering Maneuver.

Replacement draws should come from the remaining deck before the returned instances are shuffled back, so the exact returned instances cannot be the replacements. Another copy of the same card may still be drawn.

### Maneuver planning and movement

Each Navigator chooses a predefined legal template; the Captain/authorized crew locks it. Show per-ship Choosing / Waiting for lock / Locked status without exposing an opposing ship's private route. GM chooses NPC courses using the same templates.

All locked: prompt the primary GM to proceed with Yes/No, showing connection/readiness information. Only explicit Yes executes the fleet's shared movement. Keep the existing collision, facing, footprint and partial-movement recovery guarantees. Never reroll or spend movement again during recovery.

Roll/display this round's ship initiative and retain the resulting order for card and firing resolution. Maneuver selection itself is simultaneous; initiative does not reveal another ship's route early.

### Hand planning

Show the shared hand and ship AP. Crew select and order the cards they will commit; all ships must finish their plan before resolution. Spend the committed cards' AP now, but do not make their activation checks or apply their effects yet.

Cards committed to the queue cannot also be used as Instants, discarded by another choice or queued twice. Display queued cards, their total cost and AP remaining. Show a clear reminder: normal firing costs 1 AP per battery later, and Instants need remaining AP.

Weapon controls are available here to every ship owner for inspection: show each weapon's true arc/pattern, colored accuracy-distance bands, distance/penalty labels and legal targets in range. Merely inspecting arcs spends nothing and commits no shot.

### Hand resolution — initiative order

Resolve the first ship's committed cards in its chosen order, then advance to the next ship. Enlarge the current card and identify station, assigned PC/NPC, three eligible skills, crew contribution, ship contribution, situational modifiers and DC.

The owning player selects a skill and explicitly clicks the d20. GM-controlled NPCs use the same visible interface. A deliberate GM override remains possible; guided Next Step must not roll an assigned PC's contribution.

Offer any applicable Instant timing windows to either side before an outcome is finalized, according to each card's authored timing. Recompute affected results without rerolling an already evaluated die unless the Instant explicitly grants a reroll. Complete the current card once, publish its check/effects, then advance. Resolve discards/Complication choices before continuing.

### Firing

Ships choose ready batteries and targets, paying 1 AP per normal shot at this point. No AP means no normal shot. Planning a damage/accuracy aid does not make a normal shot free. The UI must make any authored weapon-card exception explicit rather than silently charging twice or waiving a cost.

Validate current range, facing, arc/pattern, reload, ammunition and target legality when committing a shot and before resolving it. Apply eligible accuracy and damage preparations from resolved cards exactly as authored, including usage counts such as next two attacks.

Show the appropriate Instant window, then the assigned Battle Watch/NPC explicitly rolls the attack. Retain the evaluated die and full modifiers. Offer eligible post-hit and pre-damage Instants before calculating/finalizing the affected result. Roll/display damage when appropriate; misses do not roll hit damage.

After all firing is resolved, apply the completed damage exchange, relevant ship system saves and conditions. Offer any authored post-damage/condition Instant window before advancing. Do not invent post-roll uses for a card whose text only permits a pre-attack use.

### Round recap and journal

Show movement, abilities, shots, misses, critical outcomes, raw damage, reductions, actual Hull damage, resources and conditions. Show a short atmospheric narrative built from those recorded facts, alongside an exact numeric audit.

Example style, using illustrative numbers rather than a promised encounter result:

> Rum Runner surged three hexes ahead and swung hard to port. Its port battery thundered into Needlewake. The shot dealt 12 raw damage, but the crew braced behind their defenses, absorbing 9 and leaving 3 Hull damage.

Use the actual weapon formula and rolled values; do not substitute the example's dice, action sequence, mitigation source or result. Identify whether each reduction came from DR, resistance, a card or another effect. If critical damage was doubled, say so.

Record one page per encounter round in a campaign journal. Include journal/page IDs, an open link and a deduplication key so reopening, refreshing or recovering does not append the same round twice. Journal failure must not replay combat; provide a retry using the saved summary.

The GM explicitly starts the next round after the recap. Refresh AP and activate scheduled effects, then enter a short Draw step. Highlight the deck icon for each ship that still needs its draw. An owning player clicks it to deal one card into that ship’s shared hand; the GM clicks for NPC ships. Persist one draw entitlement per ship per round, so another crew member, repeated clicks, refresh or reconnect cannot draw an extra card. Animate the card moving from deck to hand and update both counts. Show Waiting to draw / Draw complete in the readiness tracker. Resolve any hand-limit discard before continuing. If the draw pile is empty, reshuffle eligible discards under the existing deck rules; if no cards remain anywhere eligible, complete that ship’s draw with an explicit Deck empty result. Once all ships finish, enter Maneuver; do not repeat the opening mulligan. This scheduled draw costs no AP. Other card effects may still grant their separately tracked draws. If the encounter ended, offer the completed recap rather than starting another round.

## Range-band starting recommendation

The user approved accuracy-changing bands, but has not specified their numbers. Proposed alpha starting point: a two-hex range increment, 0 penalty in the first increment, −2 in the second and −4 in the third, while retaining each weapon's existing maximum range. Example: a maximum-five-hex broadside has 1–2 / 3–4 / 5-hex bands; a maximum-four-hex swivel has only the first two bands. Color is supplemented by labels and distance/penalty readouts.

These numbers are a proposed balance baseline, not a statement that current weapons already use range penalties. Range increments should be weapon data so upgrades and future weapons can differ.

## Implementation sequence and acceptance gates

1. Introduce the authoritative phase state machine, separate opening gate, explicit once-per-round deck-click draws, per-ship readiness and reconnect-safe GM movement confirmation.
2. Add committed-card queues with AP spent once, resource reservation/validation and explicit lock/resolve separation. Keep NPC and assigned-PC roll ownership.
3. Implement firing costs/targeting separately, split hit checks from damage finalization, and add authored Instant priority windows without duplicate dice or recursive unintended reactions.
4. Add true canvas weapon-band overlays and inspectable attack modifiers.
5. Add grounded round summaries, the recap popup and idempotent journal pages.
6. Run whole-round tests for two/four ships, mixed PC/NPC stations, zero-AP Instants/shots, mulligans, turn order, overlapping effects, disconnect/reload, partial movement recovery and duplicate requests. Then live-test with connected players.

Existing active alpha encounters need an explicit version/migration policy. Do not silently reinterpret their saved phase, spent AP or pending crew request halfway through a round.
