# Player station rolls and chat cards

Build: `alpha-crew-rolls-20261028`.

Previously the guided **Next Step** executed an assigned PC's card or battery check on the GM's behalf. Dice animation did not provide the player a decision point. Those GM-triggered checks now create a saved station request.

## Crew setup

Assign the PC in **Ship / Crew**. Each player needs Owner permission on their ship Actor and their assigned PC Actor. Refresh the GM and player clients after updating the module.

## Assigned PC workflow

1. The GM's guided action or card play reaches a station with a Character Actor assigned.
2. Combat waits. The card stays in hand and AP is not spent yet. An already committed battery does not pay AP again.
3. The assigned player receives a HUD prompt and a public chat card identifying the ship, station, acting PC and ability/battery.
4. The player explicitly selects one of that station's three skills, then clicks **Roll** in the HUD/chat. Vent Strain's die also resolves its pending request.
5. The action resolves exactly once, using that skill's crew modifier. Dice So Nice animates the evaluated dice. Chat shows source, PC/NPC, skill, degree, d20, modifiers, total, DC/AC, effect dice and resource changes where relevant.

The GM may deliberately choose a skill and use **Roll as GM**, or cancel the waiting request. Neither **Next Step** nor advancing the phase can bypass an assigned PC request. A cancelled request spends no additional AP. Reset/End clear the pending request.

A player who directly plays their own station card can choose its skill in the inspector and click Play/Roll themselves; this remains a single explicit action. It does not add a second activation check.

NPC/unassigned stations remain GM-operated. Ship initiative, impact and system saving throws remain automatic ship-held checks; their chat receipts identify them as ship systems, not as a PC skill contribution.

## Safety and recovery

Pending requests persist with the encounter. The server validates the current request, revision, ship ownership, station ownership and chosen skill. Simultaneous or stale clicks cannot resolve twice. While waiting, other combat commands are blocked except deliberate resolution/cancellation/end/reset. If chat posting fails, the HUD still exposes the request or saved result; a chat failure cannot reroll or undo the action.

Chat receipts do not attach a second native roll array: Dice So Nice has already animated the same evaluated dice. This avoids duplicate dice animations. Existing private alpha relay messages remain hidden; player-facing requests/results are separate public cards.

## Validation

895 Node tests pass. New coverage includes PC wait/no initial AP or dice, selected skill arithmetic, unauthorized crew, cancellation, duplicate clicks, NPC receipts, chat failure and player-selected battery attack skills without double AP. Browser checks run real templates/controllers with public-document doubles and verify explicit skill selection, the pending die, chosen-skill receipt and named chat output. Connected-player and actual Foundry/Dice So Nice acceptance still need a live table check.
