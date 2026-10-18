# Connected Card Combat playtest

18 October 2026. This is the first playable slice of the proposed 1.1.0 system, not the full release. It includes **16 AP cards and 6 RP cards** from the planned 105-card collection.

## Get the build and open it

In the existing **arkflight-game** module repository (not the separate arcflight repository), fetch the feature branch:

```bash
git fetch origin
git switch feat/station-ability-loadouts
git pull --ff-only origin feat/station-ability-loadouts
npm test
```

Reload Foundry clients after updating. Open **Game Settings → Configure Settings → Arkflight Game → Open Card Combat**. The module setting menu is available to players as well as the GM. Alternatively, run this script macro:

```js
await game.arkflight.cardCombat.open();
```

Open a **hex-grid scene** before launching. The primary active GM must view the bound scene while processing commands. Both pointy-top and flat-top hex layouts are supported; square/gridless scenes are rejected explicitly.

The GM selects two to eight existing armed Arkflight ship Actors and at least two sides. Click **Place Selected Ships on Scene** to create only missing linked tokens, or drag the Actors onto the scene yourself. Existing positions are preserved during placement. If an Actor has several linked tokens, select the intended one in its token dropdown. Click **Launch Canvas Encounter**. Starting facings snap to the scene's six legal headings and token centers align to hex centers.

The setup window changes into a canvas HUD. Assigned crew clients receive it automatically on a new encounter; closing the HUD hides it without ending combat. Reopen it through the same macro or the card button on a participating token's normal HUD. An earlier standalone chart encounter must be ended before starting a canvas encounter; its imaginary positions are not imposed on your scene.

## Import the four packaged test ships

On the launch screen, the GM clicks **Import 4 Test Ships**. If an encounter is already running, end it to return to the setup screen. The ships appear in the Actor folder **Arkflight — Combat Test Fleet** and in the vessel picker. Nothing is imported automatically into campaign worlds.

| Vessel | Profile | Suggested side |
| --- | --- | --- |
| [Test] Wayfarer | Standard brigantine / Tidewake engine | A |
| [Test] Swiftwake | Racing brigantine / Tidewake engine | A |
| [Test] IronSpear | Standard frigate / Iron Choir engine | B |
| [Test] Resolute | Battle frigate / military Iron Choir engine | B |

All four are level 5 with six legally mounted weapons (fore, aft and two per broadside), full Hull, Lifeveil, drive, Arkengine integrity, Morale and Supplies, zero Strain, and independent random 12-card AP / 6-card RP hands. They use the real catalog profiles rather than overriding balance values. The GM can operate all stations using the existing Trained NPC fallback; assign real player crew before starting to test player permissions and skill ranks.

Importing again reuses the test Actors by a stable flag, even after renaming them. It preserves edits, resources and existing card libraries, and recreates only missing vessels. Same-name campaign Actors are not treated as test ships. Commands run through the primary GM's serial queue, and import never replaces the active encounter. You still choose which vessels to include and can edit their suggested side labels; use two for a duel or all four for a two-versus-two test.

The same opt-in action is available to a GM macro:

```js
await game.arkflight.cardCombat.importTestShips();
await game.arkflight.cardCombat.open();
```

## Canvas HUD and card hand

![Canvas HUD with portrait cards](images/card-combat-canvas-hud.webp)

This is the actual HUD template and styling rendered over a mock canvas for local browser QA, not a screenshot from a running Foundry world.

- The bottom hand uses portrait cards with full-width **General teal, Flux violet and Signature gold** bands. Artwork, short effects, AP/RP costs and readiness stay visible. Click a card to expand all four outcomes.
- Everyone can inspect the shared hand. **All stations / My stations / a named station** filters preserve the selected AP plan. **Actions / Reactions** use separate tabs and pool readouts. **Basic Orders** jumps to the repeatable basic-order counts; these do not occupy card slots.
- The compact left panel shows the selected vessel's copied resources, Ship Bonus, AP/RP, movement, turns, token focus and weapon coverage. Selecting an encounter token follows that vessel in the HUD.
- Committed orders appear across the top. Click an order or drag it onto a participating canvas token to open the same execution preview. For Fire Battery, dropping selects an enemy, or use normal Foundry targeting and **Use Foundry Target**. Choose a skill and battery, then click **Roll / Execute**. Dropping alone never spends or rolls the order.
- A pending attack opens the defending crew's Reactions tab. Inspect a reaction and choose it, or drag it onto the defending token. Then **Resolve Response**, or pass. The engine continues automatically after a legal response; the GM does not approve player commands.
- **Fold Hand** clears more of the canvas. Local card selections, execution fields, reaction choices and horizontal hand scroll survive shared-state refreshes. The card collection, libraries and plans retain their existing ownership and economy rules.

## Weapon arcs and firing range

![Weapon coverage on scene hexes](images/card-combat-canvas-arcs.webp)

Select **All weapons** or an individual installed weapon in the left panel, then **Show Firing Coverage**. Exact hex polygons use the same range and arc predicate as battery firing, including temporary widened-arc effects. Minimum-range dead zones are excluded. Fore is cyan, port violet, starboard gold, aft coral and deck green. Reloading-only coverage is dimmed; the dropdown gives ready rounds and min–max range. With overlapping weapons on one mount, coverage is bright if any covering weapon is ready.

Coverage follows the session's native grid geometry, position and facing. It is a local visual aid and does not roll attacks, spend AP or add persistent scene drawings/templates. Hide it with the same button; closing the HUD, ending combat, changing selected vessels or tearing down the canvas clears it. Return to the bound scene to view coverage after switching scenes.

## What the playtest saves

- The first enrollment of a ship with no new card library permanently deals 8 General / 3 Flux / 1 Signature AP cards and 3/2/1 RP cards onto that Actor. Each station receives a usable General card. These are chosen randomly from this small batch.
- An existing new-style library and hand are reused. A new encounter never rerolls them. A hand containing cards outside the playtest catalog produces an explicit error rather than deleting those cards.
- The shared encounter, plans, positions, resources, reload ready rounds, reactions and log are stored in a world setting, so all clients see the same state and a reload can resume it.
- Encounter Hull, Strain, Morale, Supplies and Lifeveil remain **copies** for safe testing. Combat effects do not write those resources to live ship Actors. The permanent first card library remains an intentional Actor write.
- **Scene token positions and facings are real.** Ending a playtest leaves tokens where they moved. The placement helper creates linked one-hex test tokens only when missing; it never silently chooses among multiple tokens for an Actor.
- Launch creates a marked native Foundry Combat containing the chosen scene tokens. Its tracker mirrors rolled initiative, round, defeated markers and the active ship. **Lock Plan / Finish Ship Turn in the card HUD own advancement**; native tracker round/turn controls cannot bypass planning or reaction windows. Legacy hull AP, reload, facing and loadout initialization are not attached to this marked encounter. Existing combat remains available separately.
- Equal initiative scores retain the card engine's Actor-ID tie order; the native tracker selects the correct active row even if its own tied-row sort differs. The HUD/engine controls advancement.

## Run one round

1. Select a ship in the window. The Captain checks cards and chooses counts for basic orders. Each selected operation costs 1 AP; the starting pool is 4 in this slice.
2. Click **Lock Captain's Plan**. AP is committed and normal card costs are reserved. Targets and batteries are still undecided.
3. Repeat for every ship; the GM operates enemy Captains. The last submitted initial plan automatically rolls initiative for all operational ships.
4. The active ship's Navigator can drag its actual token straight forward, or use **↑ Hex** and the **60°** turn buttons. Wheel rotation becomes one legal facing step. A new course requires a turn first. Movement is free within the allowance and can stop to fire before continuing. Turning twice in the same hex is blocked. Occupied hexes, walls, exhausted movement and non-Navigator commands are rejected without spending budgets. Native token drag requires normal owner permission on the ship token; assigned Navigators can always use the authorized HUD controls.
5. Assigned players click a committed card/order to open its preview, choose a permitted skill and any required choice, then **Roll / Execute**. Execute orders in any sequence. The Captain can request a player's execution or reassign an unresolved order to another crew member. A GM can resolve any assigned order.
6. For **Fire Battery**, click the order and use a normal Foundry target, choose an enemy in the preview, or drag the committed order onto an enemy token. Choose the battery during execution. A legal ready battery rolls once to hit; damage dice are separate. Other orders and movement pause at the defending crew's reaction prompt.
7. Defenders choose a reaction or **Pass**. Their shared RP starts at 1. The attack then resolves against AC, applies its critical degree, Hardness, wards and any reaction, and updates the copied Hull once.
8. **Finish Ship Turn** skips remaining orders without refunding committed AP or consuming skipped cards. After every operational ship acts, a new planning round starts. It restores AP/RP and movement budgets once; cooldowns use absolute ready rounds. After all new plans lock, initiative rerolls.

The Captain may submit additional locked orders funded only by AP explicitly earned during that turn (for example, Drive the Crew). Original unallocated AP does not reopen the old plan.

## Initial executable cards

| Station | General | Flux |
| --- | --- | --- |
| Captain | Rally Crew; Issue Order | Coordinate Assault |
| Engineer | Vent Strain; Feed the Guns | Redistribute Power |
| Navigator | Charted Course; Set Attack Vector | Breakaway Vector |
| Battlewatch | Acquire Target; Ready Broadside | Work the Guns |
| Veilwarden | Mend Lifeveil; Healing Lifeveil | Reinforce Lifeveil |

The first AP Signature is **Drive the Crew**. The RP batch contains General **Brace for Impact, Evasive Maneuver, Emergency Ward**; Flux **Deflect Impact, Hold Together**; and Signature **Last Bastion**. Each card displays four individually written outcomes. The rest of the planned collection is not present yet.

## Explicit playtest defaults

These numerical defaults remain provisional while the connected card flow is playtested:

- Ordinary checks retain the existing ability DC helper: `9 + Ship Bonus`. Roll `d20 + Ship Bonus + skill rank contribution + applicable ship/station modifiers`. Rank contributes 0–4, not the full PF2e skill modifier.
- Use standard four degree calculation from the existing rules helper, including natural 1/20 shifts. Non-attack operations deliver their base effect with their written rider. Damage/recovery dice determine strength separately.
- The first batch, Flux durations, numerical kickers, new General Feed the Guns and Flux Breakaway Vector are provisional card designs. Most recovery quantities reuse prior abilities. Detailed text is in `src/content/combat-cards-playtest.js`.
- Matching temporary bonuses use the strongest positive plus the strongest negative of a category. Accuracy and damage are separate. One-use buffs are consumed by the qualifying operation; temporary effects expire at the start of that ship's next turn.
- A battery attack uses ready weapons on one mounting side. Its damage is the highest rolled weapon damage plus half (rounded down) of each other participating weapon's rolled damage. Weapon Impact/Potency are read from installations. One Hardness reduction is applied after a critical doubles the combined damage. This formula needs playtest balancing.
- Ship attack base is `level + 4 + B + selected skill rank + ship weapon accuracy + minimum participating Potency`, plus temporary bonuses. Initiative uses `d20 + level + B + Navigator Survival rank`. Both are provisional, ship-owned numerical bases.
- Printed weapon reload N sets readiness to current round + N. A zero-reload weapon can fire again for another committed basic order. Work the Guns can bring a future ready round down to the current round.
- Use derived ship speed capped at 6; giant profiles cap at 3 and have one normal turn, other ships have two. Purchases can add at most one more full movement allowance and one more turn. The playtest uses one hex per ship. Native wall checks constrain movement; wind, terrain movement costs, ramming, grapples and boarding remain pending.
- Basic Damage Control restores `1d4 × B` copied Hull for 1 AP. Its final named-fault suppression/repair behavior remains a separate design step.
- Missing station assignments use explicit NPC crew at Trained (+1) for this playtest. Assigned PF2e actors contribute their selected skill rank; the UI always provides the three station skill choices. Takeovers use the replacement actor's rank.

## Acceptance checks

- Use one GM and at least one actual player client. Verify only the Captain can lock, an assigned player can execute their order, another player cannot, and GM fallback works.
- Watch both windows update after plan submission, initiative, movement, a card, an earned-AP additional plan and a reaction. A player's local checkbox draft should survive another client's updates.
- Repeat-click an execution button: it must not charge twice or grant AP twice. Invalid targets leave an order pending; a truly impossible order or missing reserved resources skip cleanly.
- Use a Flux 2 card in round 1. It must be available at the start of round 3. A Signature remains spent through subsequent rounds.
- Fire two batteries with movement between them. Check six headings, range/arcs, one attack roll per battery, reload readiness and the reaction prompt. A team with two surviving friendly ships must not prevent victory when the opposing side has no operational ships.
- End and start a second encounter. The Actor's card library and equipped hand must be identical; only encounter recovery resets.
- Check that tokens really move/rotate on both clients and the native tracker selects the active ship. Live Actor resources must remain unchanged by playtest effects. First libraries intentionally save to Actors.
- Try both card clicks and drag-to-token targeting. A drop should open the preview without consuming the order. Repeated execution clicks must not roll or charge twice.
- Show one weapon's coverage, rotate/move, and verify edge hexes/minimum range against actual targeting. Test Set Attack Vector and reloading weapons. Close the HUD or change scenes and confirm coverage cleanup.
- Place the same selected ships twice: token count and existing positions must remain unchanged. Verify multiple tokens for one Actor require an explicit choice. End an encounter, reopen setup and start from the ships' current real positions.

Remaining work includes all 83 other card designs, outside-combat library/award/equip UI, complete equipment/talent properties and resistances, the reduced damage/save architecture, engineering overload/faults, deeper native integration (including tracker controls) and production UI assessment. Strain is currently bounded to its copied capacity, without a new Engineering save or overload consequence. These omissions make this a card-flow playtest rather than a complete combat replacement.

The player request adapter uses Foundry's server-provided creation user ID and message author rather than trusting a claimed requester in a socket payload. See the [Foundry v14 ChatMessage lifecycle](https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html) and [generic document hooks](https://foundryvtt.com/api/v14/modules/hookEvents.html). An active GM processes and persists shared commands automatically; no GM approval click is required for a legal player order.

## Validation recorded

All **717 Node tests pass**. In addition to the original connected card, fleet and presentation checks, ten canvas tests exercise both hex orientations/parities, linked token selection, legal binding, real-position initialization, marked Combat creation/legacy exclusion, multi-hex movement, the native drag hook, authority checks, occupied/walled movement, rollback after rejected movement or persistence failure, facing budgets, tracker protection, exact coverage-versus-firing checks, and repeat-safe scene deployment.

The real launch/HUD templates and full module styles were exercised in local Chromium with mocked Foundry application/documents and a simulated scene. Interaction checks passed for portrait cards, expanded four outcomes, selecting through preview, cross-station planning, refresh preservation (including horizontal scroll and reaction choices), folding, actual coverage polygons, Captain plan submission, execution fields, AP and RP drag payloads, token targeting, confirmation before consumption, settings-menu reuse of the HUD and the defender reaction flow. Screenshots were inspected at 1600×1000 and 1366×768 with no horizontal page overflow or browser JavaScript errors. Syntax and whitespace checks pass.

Actual Foundry v14/PF2e token movement, token HUD chrome, PIXI rendering, ownership and multiplayer acceptance remain pending. The mock/browser checks do not establish those live-world results. Use one GM and one player client for acceptance before campaign play.

The adapter follows the documented [v14 token movement API](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html#move), [preMoveToken hook](https://foundryvtt.com/api/v14/functions/hookEvents.preMoveToken.html), [hex grid coordinate API](https://foundryvtt.com/api/v14/classes/foundry.grid.HexagonalGrid.html) and [ApplicationV2 frame configuration](https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationWindowConfiguration.html). It does not manufacture or override Foundry movement IDs.
