# Ship libraries and three saved loadouts

Current build: `alpha-command-deck-20261027`. These are the five approved library decisions, implemented on opt-in alpha ship Actors. The user has passed the preceding combat/permissions alpha check. This library increment still needs its own live GM/player acceptance.

## Open the library

After updating and restarting Foundry, click **Library / Decks** in the alpha combat window's footer. It also opens outside an encounter from Module Settings → Arkflight Ship Library, or this Script macro:

```js
await game.arkflight.alphaCombat.library.open();
```

Choose the ship in the header. Players see only their owned alpha ships. The GM sees all alpha ships. Existing campaign ship Actors are not migrated or changed.

If an older test ship has no permanent library, end its alpha encounter and click **Initialize ship library** as GM. This adopts the current encounter's original deck selection, including cards currently in Hand, Discard or Burned. It does not grant the entire catalog or reset the held encounter. New test ships initialize automatically from their starter deck. Reads/reopening never initialize, draw or grant cards.

## What is permanent

Each ship Actor holds its learned card IDs, three independently named loadouts, one selected loadout, and its alpha hull/level/upgrades/talents. The first library uses its selected starter deck to establish knowledge. Learning one ordinary card unlocks up to two copies in a deck; a Unique card allows one. There is no consumable inventory of individual card copies.

The three slots start as **Standard**, **Alternative** and **Reserve**, each seeded with the starting deck. Rename them freely. They are alternative configurations, not three decks used in the same battle.

The catalog currently contains 21 playable combat cards. This increment does not finish the planned 75-card collection or automatic loot/training/trade rewards.

## Build a loadout

1. Choose one of the three visual loadout tabs. Open **Loadout name & settings** to rename it or use the alternate dropdown.
2. Search the framed catalog and adjust **Copies in draft** using plus/minus or its number field. Ordinary maximum is two; Unique maximum is one.
3. Click **Save loadout draft**. Saving does not automatically select another slot.
4. Correct any displayed issues, then click **Select for next combat**.

Players see learned cards only. The GM sees the full catalog and can click **Grant to ship** or **Remove learned card** outside combat. Granting the same technique twice does not create extra copies or duplicate knowledge. Removing knowledge preserves all three deck lists; affected loadouts display errors. An unlearned/absent card retained in a player's draft is shown as an unavailable card without its catalog entry. The crew can explicitly remove it from that draft, or the GM can restore the knowledge.

Decks require at least 15 cards and respect the ship's current capacity, copy limits and authored requirements. Invalid drafts can be saved without truncation. They cannot be selected or launched. If the already-selected deck becomes invalid after removal/refit, it stays selected and visible but blocks the next encounter until corrected. No silent fallback, random replacement or automatic card removal occurs.

Switching ship/loadout or clicking **Reload stored loadout** discards unsaved local edits. Remote changes while a draft is unsaved preserve it and display a stale-data warning. Reload before saving again; one client cannot silently overwrite another client's newer revision.

## Refit and start another test

The GM can open **Ship profile / refit** to save the alpha hull, level, upgrades and talents. The profile itself must satisfy its level/fitting rules. All loadouts remain intact and are revalidated against the new profile. Reducing capacity can therefore make a deck invalid without deleting its extra cards. Save/reload a deck draft before performing a separate grant/remove/refit operation.

To use the stored profile and selected decks, end the current alpha test, open the combat window's **Builder** tab, and click **Start battle with saved ships / loadouts**. This uses the saved configuration for the existing two/four-ship fleet. In contrast, **Build test fleet and start** explicitly uses Builder's hull/level/fittings as a test refit; existing ships still use their permanent selected loadout. Builder's starter card selection seeds newly created ships only.

The encounter receives fresh card instances copied from the selected loadout, plus a snapshot of its learned library. Drawing, discarding, reshuffling or Burning a card never removes permanent knowledge or rewrites a saved deck. Burn becomes available again in the next encounter. The ordinary alpha test reset of Hull, Supply and other resources remains unchanged; persistent campaign damage/resource migration is a separate stage.

## Combat and permissions

Library changes, grants/removals, selection and refits are locked for a ship participating in an unfinished alpha encounter, including planning, cleanup and boarding pauses. A saved movement recovery also locks participants. A ship in a separate started Foundry encounter is locked. Viewing, searching and inspecting saved lists remain available.

Any active player with Owner permission on the ship may edit/select its decks outside combat. Only the GM may grant/remove knowledge, initialize an older ship or refit its profile. Commands use the existing authenticated GM relay, ownership checks and serialized primary-GM queue. Actor saves carry a library revision; stale commands reject. Ownership changes update the UI. Existing maneuver/station/phase permissions remain in place.

## Acceptance in Foundry

1. End the test encounter, open Library / Decks and confirm three slots.
2. As GM, grant Chainshot Volley. As the ship's player, confirm it appears while other unlearned cards remain absent.
3. Edit/rename a second loadout, save it and select it. Close/reopen and restart Foundry; confirm the name, knowledge, copies and selection persist.
4. Start with saved ships/loadouts. Confirm the original deck has the selected cards and all library editing is locked. Complete or end the battle and confirm editing unlocks.
5. Remove a learned card used in the selected deck. Confirm its copies remain visible as unavailable and launching is blocked. Regrant it or correct the saved draft; no other slots should change.
6. With a level-20 test profile, save a 19-card deck; refit to level 1. Confirm all 19 entries remain but capacity is flagged. Correct the deck to launch.
7. Open the same ship on two clients, keep one unsaved draft and save a change on the other. Confirm the first displays a stale warning and cannot overwrite the newer revision.

Local verification covers pure rules, Actor serialization, authenticated relay requests, duplicate/stale saves, save failures, ownership, combat/recovery locks, refit validation and encounter snapshots. Chromium exercises the actual templates/styles/controller against mocked public Foundry documents. Actual world persistence, multi-client timing and these new controls still require the live check above.

## Data contract for future work

The Actor flag is `flags.arkflight-game.alphaLibrary`, schema version 1: `revision`, `config`, unique `learned` IDs, fixed `deck-1`/`deck-2`/`deck-3` records with names/card arrays, and `activeLoadoutId`. Invalid card lists remain stored. Unknown future card IDs are preserved and flagged, not pruned. Later packs can provide authored level/upgrade/mount requirements. Automatic acquisition, campaign migration, complete equipment/talent progression, the production ship sheet and cross-pillar consumers remain separate work.
