# Ship Complications — 24 cards, 144 outcomes

Updated 24 October 2026. The six-entry format and critical-failure-only trigger are approved. All 144 entries are now authored as original Arkflight draft content in `src/content/ship-complications.js`. Individual numerical effects are playtest values, not a balanced release.

## First programmed increment

The catalog, deterministic shuffled deck, six-context selection, final-degree gate, resource choices, one-use effect records, expiry, idempotent draws and a Foundry Complication Lab are implemented. The Lab uses its own client-local setting and two sample ships. It does not change campaign Actors, native tokens, the saved paper encounter or the existing AP/RP combat prototype.

Temporary restrictions and paid enemy opportunities are machine-readable descriptors. The Lab records them and can simulate their consumption and AP claims; the future phased combat controller must enforce them during actual card play, attacks, reload and maneuvers. The old combat path is not automatically connected to this deck. No live Foundry/PF2e acceptance has been established by local tests or browser mocks.

## Open the Lab

After updating to the feature branch, restart/reload Foundry so the new manifest entries load. In a world with Arkflight enabled, open **Configure Settings → Module Settings → Arkflight Game → Open Complication Lab**, or run this as a GM Script macro:

```js
await game.arkflight.complications.open();
```

Choose Impact or a station, then choose the final check result. **Resolve test check** draws only for critical failure. Failure, success and critical success leave the deck and resources unchanged. A revealed card shows only its relevant entry; expand it to inspect all six. Browsing the catalog does not draw. Resolve crew choices, inspect sample resources/effects, test an opponent spending AP, advance rounds and verify expiry. Reset affects only the Lab's samples. The window is movable, resizable, minimizable and restores through the same macro.

## Resolution contract

- Exactly 24 cards, one copy each, one shared deck. Shuffle at encounter start and reshuffle eligible discards when empty. No AP, hand capacity or normal combat draw is consumed by a complication draw.
- Only a final **critical failure** can draw. Ordinary failure never draws, including by card-specific exception. A natural 1 uses the normal degree adjustment; it is not an independent draw trigger.
- Read **one** entry: Impact for a collision Structure critical failure; otherwise the station whose contribution critically failed. A basic weapon attack uses Battle Watch. Character checks, unrelated resource saves and events do not implicitly use this deck.
- At most one draw per ship per source event/activation. Coordinated contributions use the same source ID and resolve in the card's printed order; the first critical failure supplies the entry. Each ship in a collision can draw once. Repeated commands do not redraw or reapply resource losses.
- The complication replaces the source result's fixed negative kicker. The original support base effect remains, while an attack can still miss and spend its ordinary ammunition/reload. Apply the new complication after the original action resolves; it cannot retroactively alter that action. Complications cannot recursively draw more complications.
- Resource losses/Strain gains apply immediately, clamped to the sample track limits. Resource options in a choice must actually be affordable; an empty track or full Strain cannot buy a free escape, and a Hull-cost option cannot destroy the ship. Percentage losses use the track maximum. Normal resource recovery, not shuffling or cleanup, replenishes losses.
- Unless an entry says otherwise, a temporary effect applies to the next matching action and expires at the end of the following round if unused. Normal-maneuver restrictions and initiative penalties begin next round. Restrictions spanning a round, such as different battery targets, retain their full meaning until completed or expired; consumers must not remove them after the first partial use.
- For a reduced normal maneuver, execute the selected route's legal prefix and omit instructions after reaching the reduced travel limit. Restrictions always leave Hold legal. Revalidate footprint/obstacles before any movement; no forced overlap or arbitrary replacement route is granted.
- Battery-specific outcomes use the action's selected battery, or the collision's struck-side battery when provided by the controller. Ties must be resolved by stable mount ID. The current standalone engine falls back to the first mounted battery by stable ID when none is provided. A ship with no batteries receives a one-use -1 check penalty for the relevant station (Structure for Impact) instead.
- Contact-only results have an explicit Structure-check fallback when no opposing ship is alongside. Boarding opportunities still require legal contact and a normal boarding attempt; neither boarding nor a free attack happens automatically.
- A paid opportunity costs its exploiting opponent **1 additional AP**, for one specified benefit on an otherwise legal action. It does not replace the action's own AP cost. The Lab's AP claim reserves the permission; the action controller must validate the target, mitigation and timing before consuming it.
- Identical temporary effects refresh rather than add. Numerical complication penalties to one check use only the greatest applicable penalty. Distinct resource losses from distinct triggers still apply. Existing AC/DR/resistance card play limits remain unchanged.
- Every temporary entry has automatic expiry; recovery never requires drawing a particular random card. Encounter end clears unscheduled temporary complications, not resource losses. Once an extra reload has been scheduled on a weapon, that weapon's reload timer must persist until ready. The standalone engine stores the scheduling descriptor; the future weapon controller owns the actual timer.

## Design reference

Paizo's official PF2e Critical Fumble Deck description confirms drawing one card and applying one of four alternative effects: https://store.paizo.com/pathfinder-critical-fumble-deck-download/. Arkflight uses the multi-scenario presentation idea with six original ship outcomes per card. This is not a reproduction of Paizo's deck.

## Full draft catalog

The common duration/choice rules above apply to each entry. Resource changes are immediate; their losses persist until normal recovery. Most entries create a short-lived constraint, choice or paid enemy opportunity rather than extra damage.

## 01 — Caught Out

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Exposed Rail** | While alongside, the colliding opponent may spend 1 AP for +1 to its next attempt to secure boarding lines. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Divided Attention** | Before your next Captain check, choose Morale loss or -1 to that check. **Choose one:** Lose 5% morale OR Take -1 to next Captain check. |
| Engineer | **Power Diversion** | Choose extra Strain or -1 to your next Engineer check. **Choose one:** Gain 1 strain OR Take -1 to next Engineer check. |
| Navigator | **Awkward Approach** | Next round's normal maneuver may contain at most one 60-degree turn. Hold remains legal. |
| Veil Warden | **Exposed Ward** | One opponent may spend 1 AP before an attack to reduce applicable resistance against that attack by 2. |
| Battle Watch | **Unsteady Battery** | Choose minor Hull wear or -1 to the affected battery's next attack. **Choose one:** Lose 2 hull OR Take -1 to next battery attack. |

## 02 — Crossed Lines

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Tangled Rigging** | The colliding opponent may spend 1 AP for +2 to its next attempt to secure boarding lines while alongside. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Conflicting Orders** | Your next Captain Standard card must follow a Standard action from another station; the restriction expires at end of next round. |
| Engineer | **Crossed Feed** | Choose one mounted battery; its next attack cannot receive bonus damage from support effects. Base weapon damage remains. |
| Navigator | **Snagged Towline** | Choose lost Supply or reduce your next normal maneuver's travel by 1 hex. **Choose one:** Lose 1 Supply OR Lose 1 hex from next normal maneuver. |
| Veil Warden | **Interference** | Your next Veil Warden card cannot be Coordinated. Other legal cards remain available. |
| Battle Watch | **Crossed Sights** | Your next two battery attacks, if both are made, must name different targets. |

## 03 — Violent Lurch

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Listing Hull** | Your next normal maneuver travels 1 fewer hex; follow its legal prefix. |
| Captain | **Crew Stumbles** | Choose Morale loss or -1 to your next Coordinated card's station checks. **Choose one:** Lose 5% morale OR Take -1 to next Coordinated checks. |
| Engineer | **Braced Machinery** | Choose +1 Strain or forgo the next card-granted bonus damage on one selected battery. **Choose one:** Gain 1 strain OR Forgo next battery's bonus damage. |
| Navigator | **Uncertain Footing** | Your next normal maneuver cannot be a stationary Pivot; Hold and traveling routes remain legal. |
| Veil Warden | **Ward Recoil** | Choose Lifeveil loss or -1 to your next Veil Warden check. **Choose one:** Lose 5% lifeveil OR Take -1 to next Veil Warden check. |
| Battle Watch | **Loose Gun Carriage** | The affected battery's next shot has maximum range reduced by 1 hex, minimum 1. |

## 04 — Pressure Spike

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Engine Jolted** | The impact adds 1 Strain; use the finalized Strain system for any threshold consequences. |
| Captain | **Urgent Demands** | Choose Morale loss or hold your next Captain card until another station acts. **Choose one:** Lose 5% morale OR Wait for another station's Standard action. |
| Engineer | **Pressure Release** | Choose +1 Strain or -1 to your next Engineer check. **Choose one:** Gain 1 strain OR Take -1 to next Engineer check. |
| Navigator | **Emergency Ballast** | Choose lost Supply or no stationary Pivot on your next normal maneuver. **Choose one:** Lose 1 Supply OR Forgo next stationary Pivot. |
| Veil Warden | **Bleed the Surge** | Choose Lifeveil loss or reduce your next restoration by 5 percentage points. **Choose one:** Lose 5% lifeveil OR Restore 5% less Lifeveil next time. |
| Battle Watch | **Hot Loading Gear** | The affected battery gains one extra round of reload, immediately if loading or after its next actual shot if ready. |

## 05 — Exposed Flank

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Armor Gap** | One opponent may spend 1 AP before an attack to reduce applicable DR against that attack by 2. |
| Captain | **Read the Orders** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Engineer | **Visible Conduits** | One opponent may spend 1 AP before an attack to reduce applicable DR by 2 for that attack. |
| Navigator | **Predictable Course** | One opponent may spend 1 AP for +1 to one attack against you after normal movement. |
| Veil Warden | **Thin Coverage** | One opponent may spend 1 AP before an attack to reduce applicable resistance by 2 for that attack. |
| Battle Watch | **Muzzle Tells** | One opponent may spend 1 AP for +1 AC against one attack from the affected battery. |

## 06 — Split Second

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Brace or Buckle** | Choose minor Hull wear or -1 to your next Structure check. **Choose one:** Lose 2 hull OR Take -1 to next Structure check. |
| Captain | **Late Command** | Your next Captain Standard card must follow another station's Standard action. |
| Engineer | **Late Boost** | Your next Engineer Standard card must follow another station's Standard action. |
| Navigator | **Late Helm** | Next round's normal maneuver cannot turn before traveling at least 1 hex; Hold remains legal. |
| Veil Warden | **Late Ward** | Your next Veil Warden Standard card must follow another station's Standard action. Instants retain normal timing. |
| Battle Watch | **Late Volley** | The affected battery's next attack must be committed after a Standard action from another station. |

## 07 — Loose Fittings

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Bent Mount** | One affected battery gains 1 extra round of reload, now if loading or after its next shot if ready. |
| Captain | **Confidence Slips** | Lose 5 percentage points of Morale. |
| Engineer | **Unsecured Coupling** | The next card that adds or costs Strain adds 1 extra Strain. Other complications do not trigger this. |
| Navigator | **Dragging Cable** | Reduce your next normal maneuver's travel by 1 hex, following its legal prefix. |
| Veil Warden | **Loose Emitter** | The next Lifeveil restoration restores 5 fewer percentage points, minimum 0. |
| Battle Watch | **Shifting Mount** | The affected battery takes -1 to its next attack roll. |

## 08 — Lost Bearing

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Impact Confusion** | Take -1 to your next round's initiative roll; already established initiative is unchanged. |
| Captain | **Find the Rhythm** | Choose Morale loss or -1 to next round's initiative. **Choose one:** Lose 5% morale OR Take -1 to next initiative roll. |
| Engineer | **Retune the Feed** | Choose +1 Strain or no bonus damage from support effects on one battery's next attack. **Choose one:** Gain 1 strain OR Forgo next battery's bonus damage. |
| Navigator | **No Tight Approach** | Next round select Hold or a route that travels at least 2 hexes before its first turn. |
| Veil Warden | **Lost Resonance** | Take -1 to your next Veil Warden check. |
| Battle Watch | **Lost Range** | Reduce the affected battery's next shot's maximum range by 1 hex, minimum 1. |

## 09 — Bad Timing

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Close Quarters** | The colliding opponent may spend 1 AP for +1 to its next attempt to secure boarding lines while alongside. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Interrupted Briefing** | Your next Captain Standard card must follow another station's Standard action. |
| Engineer | **Rush the Cycle** | Choose +1 Strain or add 1 round to one battery's reload, now or after its next actual shot. **Choose one:** Gain 1 strain OR Add 1 reload round to a battery. |
| Navigator | **Spend the Reserve** | Choose lost Supply or no early turn before 1 hex of travel on next round's maneuver. **Choose one:** Lose 1 Supply OR Travel 1 hex before next maneuver's first turn. |
| Veil Warden | **Ward Handoff** | Your next Veil Warden Standard card must follow another station's Standard action. |
| Battle Watch | **Wait for the Call** | Commit the affected battery's next shot only after another station completes a Standard action. |

## 10 — Crew Disarray

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Stations Scattered** | Take -1 to the station checks on your next Coordinated card. |
| Captain | **Restore Confidence** | Choose Morale loss or -1 to your next Captain check. **Choose one:** Lose 5% morale OR Take -1 to next Captain check. |
| Engineer | **Crew at the Pumps** | Your next Engineer card cannot be Coordinated; other legal cards remain available. |
| Navigator | **Helm Short-Handed** | Next round's normal maneuver can include at most one 60-degree turn; Hold remains legal. |
| Veil Warden | **Ward Team Split** | Your next Veil Warden card cannot be Coordinated. |
| Battle Watch | **Gun Crew Split** | The affected battery's next shot cannot receive bonus damage from support effects; its base damage remains. |

## 11 — Unstable Flow

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Veil Shudder** | Lose 5 percentage points of Lifeveil. |
| Captain | **Unsteady Resolve** | Choose Morale loss or -1 to next round's initiative. **Choose one:** Lose 5% morale OR Take -1 to next initiative roll. |
| Engineer | **Surging Feed** | The next card explicitly adding or costing Strain adds 1 extra Strain. |
| Navigator | **Stabilize the Drift** | Choose lost Supply or reduce your next normal maneuver's travel by 1 hex. **Choose one:** Lose 1 Supply OR Lose 1 hex of normal movement. |
| Veil Warden | **Unstable Emitter** | Choose Lifeveil loss or forgo 5 percentage points of your next Lifeveil restoration. **Choose one:** Lose 5% lifeveil OR Restore 5% less next time. |
| Battle Watch | **Steady the Battery** | Choose minor Hull wear or -1 to the affected battery's next attack. **Choose one:** Lose 2 hull OR Take -1 to next battery attack. |

## 12 — Overextended

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Long Recovery** | Your next normal maneuver cannot be a stationary Pivot; traveling turns remain legal. |
| Captain | **Command Overreach** | Your next Captain card cannot be Coordinated. |
| Engineer | **Borrowed Power** | Choose +1 Strain or no support bonus damage on a selected battery's next attack. **Choose one:** Gain 1 strain OR Forgo next battery's bonus damage. |
| Navigator | **No Spare Thrust** | Reduce the first future card-granted movement bonus by 1 hex, minimum 0; normal hull movement remains. |
| Veil Warden | **Thin Reserves** | Choose Lifeveil loss or let an opponent buy a one-attack resistance gap for 1 AP. **Choose one:** Lose 5% lifeveil OR Offer a paid resistance opening. |
| Battle Watch | **Extended Loading** | Add 1 reload round to the affected battery, now if loading or after its next actual shot. |

## 13 — Slipping Grip

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Rails Within Reach** | While alongside, the colliding opponent may spend 1 AP for +2 to its next attempt to secure boarding lines. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Hold Their Nerve** | Choose Morale loss or -1 to your next Captain check. **Choose one:** Lose 5% morale OR Take -1 to next Captain check. |
| Engineer | **Grip the Controls** | Choose +1 Strain or -1 to your next Engineer check. **Choose one:** Gain 1 strain OR Take -1 to next Engineer check. |
| Navigator | **Secure the Lines** | Choose lost Supply or no stationary Pivot next round. **Choose one:** Lose 1 Supply OR Forgo next stationary Pivot. |
| Veil Warden | **Hold the Lattice** | Choose Lifeveil loss or -1 to your next Veil Warden check. **Choose one:** Lose 5% lifeveil OR Take -1 to next Veil Warden check. |
| Battle Watch | **Loose Traverse** | Take -1 to the affected battery's next attack roll. |

## 14 — Blind Spot

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Unwatched Quarter** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Captain | **Readable Signals** | One opponent may spend 1 AP for +1 AC against one of your ship's battery attacks. |
| Engineer | **Exposed Feed** | One opponent may spend 1 AP to ignore 2 applicable DR on one attack against your ship. |
| Navigator | **Uncertain Approach** | Next round's first maneuver turn requires at least 1 preceding hex of travel; Hold remains legal. |
| Veil Warden | **Uncovered Seam** | One opponent may spend 1 AP to reduce applicable resistance by 2 against one attack. |
| Battle Watch | **Telegraphed Shot** | The target may spend 1 AP for +1 AC against one affected-battery attack. |

## 15 — Debris Wake

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Trailing Wreckage** | Reduce the next normal maneuver's travel by 1 hex; execute only its legal prefix. |
| Captain | **Clear the Deck** | Your next Captain Standard card must follow another station's Standard action. |
| Engineer | **Clear the Intake** | Choose +1 Strain or reduce the first future card-granted bonus movement by 1 hex. **Choose one:** Gain 1 strain OR Lose 1 hex of next bonus movement. |
| Navigator | **Jettison the Snag** | Choose lost Supply or -1 to your next Navigator check. **Choose one:** Lose 1 Supply OR Take -1 to next Navigator check. |
| Veil Warden | **Dust in the Lattice** | Reduce the next Lifeveil restoration by 5 percentage points, minimum 0. |
| Battle Watch | **Obscured Sights** | The affected battery's next shot loses 1 hex of maximum range, minimum 1. |

## 16 — Delayed Response

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Slow to Recover** | Take -1 to next round's initiative roll. |
| Captain | **Late Orders** | Your next Captain Standard card must follow another station's Standard action. |
| Engineer | **Late Engineering** | Your next Engineer Standard card must follow another station's Standard action. |
| Navigator | **Late Turn** | Next round choose Hold or a route that travels at least 2 hexes before its first turn. |
| Veil Warden | **Late Synchronization** | Your next Veil Warden Standard card must follow another station's Standard action; legal Instants are unaffected. |
| Battle Watch | **Late Guns** | Commit the affected battery's next shot after another station completes a Standard action. |

## 17 — Unbalanced Load

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Shifted Stores** | Choose lost Supply or -1 to your next Structure check. **Choose one:** Lose 1 Supply OR Take -1 to next Structure check. |
| Captain | **Reassign the Crew** | Choose Morale loss or forgo a Coordinated Captain card next time. **Choose one:** Lose 5% morale OR Next Captain card cannot be Coordinated. |
| Engineer | **Balance the Feed** | Choose +1 Strain or forgo a Coordinated Engineer card next time. **Choose one:** Gain 1 strain OR Next Engineer card cannot be Coordinated. |
| Navigator | **Heavy to Turn** | Next round's normal maneuver can contain at most one 60-degree turn. |
| Veil Warden | **Rebalance the Ward** | Choose Lifeveil loss or forgo a Coordinated Veil Warden card next time. **Choose one:** Lose 5% lifeveil OR Next Veil Warden card cannot be Coordinated. |
| Battle Watch | **Uneven Broadside** | The affected battery's next shot cannot gain support bonus damage. Base damage remains. |

## 18 — Narrow Margin

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Take the Scrape** | Choose minor Hull wear or no stationary Pivot next round. **Choose one:** Lose 2 hull OR Forgo next stationary Pivot. |
| Captain | **Keep Them Steady** | Choose Morale loss or -1 to your next Captain check. **Choose one:** Lose 5% morale OR Take -1 to next Captain check. |
| Engineer | **Run It Hot** | Choose +1 Strain or add 1 reload round to a selected battery. **Choose one:** Gain 1 strain OR Add 1 battery reload round. |
| Navigator | **Spend the Ballast** | Choose lost Supply or reduce your next normal maneuver by 1 hex. **Choose one:** Lose 1 Supply OR Lose 1 hex of normal movement. |
| Veil Warden | **Spend the Veil** | Choose Lifeveil loss or offer an opponent a paid resistance opening. **Choose one:** Lose 5% lifeveil OR Opponent may buy a resistance opening. |
| Battle Watch | **Brace the Mount** | Choose minor Hull wear or reduce the affected battery's next shot's range by 1 hex. **Choose one:** Lose 2 hull OR Lose 1 hex of next-shot range. |

## 19 — Warning Flare

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Visible Damage** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Captain | **Obvious Orders** | One opponent may spend 1 AP for +1 AC against one of your battery attacks. |
| Engineer | **Glowing Conduit** | One opponent may spend 1 AP before an attack to reduce applicable DR by 2 for that attack. |
| Navigator | **Marked Course** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Veil Warden | **Flashing Ward** | One opponent may spend 1 AP to reduce applicable resistance by 2 for one attack. |
| Battle Watch | **Bright Muzzle** | The target may spend 1 AP for +1 AC against one affected-battery attack. |

## 20 — Chain Reaction

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Shock Through the Frame** | Gain 1 Strain. This card never draws another complication. |
| Captain | **Confusion Spreads** | Take -1 to each station check on your next Coordinated card. No additional complication draw is caused by this effect itself. |
| Engineer | **Isolate the Surge** | Choose +1 Strain or no support bonus damage on one battery's next attack. **Choose one:** Gain 1 strain OR Isolate a battery from bonus damage. |
| Navigator | **Check the Drift** | Reduce the first future card-granted movement bonus by 1 hex; ordinary movement remains. |
| Veil Warden | **Isolate the Lattice** | Choose Lifeveil loss or forgo a Coordinated Veil Warden card next time. **Choose one:** Lose 5% lifeveil OR Next Veil Warden card cannot be Coordinated. |
| Battle Watch | **Slow the Loader** | Add 1 reload round to the affected battery, now if loading or after its next shot if ready. |

## 21 — Contested Space

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Boarding Distance** | The colliding opponent may spend 1 AP for +2 on its next attempt to secure boarding lines while alongside. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Distracted Command** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Engineer | **Crowded Work Area** | Your next Engineer card cannot be Coordinated. |
| Navigator | **Wide Approach** | Next round choose Hold or travel at least 2 hexes before your first maneuver turn. |
| Veil Warden | **Shared Ward Gap** | One opponent may spend 1 AP to reduce resistance against one attack by 2. |
| Battle Watch | **Crossing Fire** | Your next two battery attacks, if made, must choose different targets. |

## 22 — Strained Reserves

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Lost Stores** | Lose 1 Supply. No separate ammunition charges are lost. |
| Captain | **Nerves Fray** | Lose 5 percentage points of Morale. |
| Engineer | **Heat Buildup** | Gain 1 Strain. |
| Navigator | **Lost Ballast** | Lose 1 Supply. |
| Veil Warden | **Veil Bleed** | Lose 5 percentage points of Lifeveil. |
| Battle Watch | **Worn Bracing** | Choose minor Hull wear or -1 to the affected battery's next attack. **Choose one:** Lose 2 hull OR Take -1 to next battery attack. |

## 23 — Open Invitation

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Unprotected Rail** | The colliding opponent may spend 1 AP for +2 to its next boarding-lines attempt while alongside. **Fallback:** No opposing ship is alongside: take -1 to your next Structure check. |
| Captain | **Telegraphed Plan** | One opponent may spend 1 AP for +1 AC against one attack from your ship. |
| Engineer | **Open Access Panel** | One opponent may spend 1 AP to reduce applicable DR by 2 for one attack against your ship. |
| Navigator | **Easy Lead** | One opponent may spend 1 AP for +1 to one attack against your ship. |
| Veil Warden | **Uncovered Emitter** | One opponent may spend 1 AP to reduce applicable resistance by 2 against one attack. |
| Battle Watch | **Readable Aim** | The target may spend 1 AP for +1 AC against one affected-battery attack. |

## 24 — Last-Second Scramble

| Scenario | Outcome | Effect |
| --- | --- | --- |
| Impact | **Scrape or Stall** | Choose minor Hull wear or reduce the next normal maneuver's travel by 1 hex. **Choose one:** Lose 2 hull OR Lose 1 hex of next normal movement. |
| Captain | **Rushed Instructions** | Choose Morale loss or hold the next Captain Standard card until another station acts. **Choose one:** Lose 5% morale OR Wait for another station's Standard action. |
| Engineer | **Rushed Engineering** | Choose +1 Strain or hold the next Engineer Standard card until another station acts. **Choose one:** Gain 1 strain OR Wait for another station's Standard action. |
| Navigator | **Rushed Course** | Choose lost Supply or restrict next round's maneuver to at most one 60-degree turn. **Choose one:** Lose 1 Supply OR At most one turn on next normal maneuver. |
| Veil Warden | **Rushed Shielding** | Choose Lifeveil loss or hold the next Veil Warden Standard card until another station acts. **Choose one:** Lose 5% lifeveil OR Wait for another station's Standard action. |
| Battle Watch | **Rushed Gunnery** | Choose minor Hull wear or commit the battery's next shot after another station's Standard action. **Choose one:** Lose 2 hull OR Wait for another station before next shot. |
