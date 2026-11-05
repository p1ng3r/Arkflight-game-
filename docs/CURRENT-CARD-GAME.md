# Current Arkflight card-game contract

Audit snapshot: 4 November 2026. This describes the current implementation and latest direction; it does not declare a production release. Use the executable sources when a number conflicts with historical planning documents. Open design questions are listed explicitly in the work list.

## Identity and loop

One crew operates one shared ship and hand on Foundry's hex canvas. Captain, Engineer, Navigator, Battle Watch and Lifeveil Warden provide different card/skill roles. The ship owns a learned library and selected deck. Crew make PF2e skill checks using three allowed choices per station. Routine legal hull maneuvers do not require a success roll.

Opening (first round only) → maneuver choice/lock → simultaneous fleet movement → card planning/lock → station-card resolution by initiative → weapon declaration and resolution by ship initiative, with a defending Instant window → simultaneous exchange damage application → cleanup/recap. Later rounds begin with the normal draw. Draw-card effects can temporarily reopen a limited follow-up planning window for newly drawn Standards.

**Important implementation detail:** the current Firing phase resolves a ship's declared exchanges before moving to the next firing ship; Hull damage is accumulated and applied when the exchange finishes. Do not assume all ships declare every target before any attack. Target timing and lethality need explicit design review before changing this.

## Runtime values and zones

| Item | Current implementation |
|---|---|
| Shared AP | Base 4 per hull; delayed prepared AP may add up to 2. No RP pool. |
| Card costs | Authored 1–3 AP; Instants also spend AP. AP is reserved/spent when committing Standards; skipping a committed card retains its AP cost. |
| Normal weapon fire | Available without drawing an attack card; 1 AP. Attack cards prepare their own shot for their printed card cost. |
| Catalog | 26 distinct combat card designs, not 75 completed cards. |
| Starter deck | 20 entries, containing duplicates. Ordinary copy limit 2, Unique limit 1. |
| Valid loadout | At least 15 cards, up to profile capacity. Capacity starts 20 and increases 1 every four levels beyond level 1. |
| Opening / normal draw | 5 opening cards; draw 1 on later rounds. Card effects can draw more. |
| Hand | Baseline capacity 5; retain unplayed cards, choose overflow discards in Cleanup. Command Relay currently raises capacity from 5 to 6; the generic clamp ceiling is 10. This conflicts with some older fixed-five/max-seven records and needs explicit design freeze. |
| Mulligan | Once, up to 2 different cards; replacements are drawn before returned cards are shuffled back. This differs from the older foundation's ordering. |
| Zones | Learned Library; selected loadout; Draw, Hand, Prepared, Discard, Burned during the encounter. |
| Empty draw | Shuffle eligible discard; do not put Prepared/Burned/pending cards back prematurely. |
| Burn | Removed for this encounter when used; does not remove permanent knowledge. |
| Instant window | Currently before an incoming weapon attack, one response by the defending ship per attack; not a general stack or after-every-roll interrupt engine. |
| Hulls | 10; one-, two- and three-hex footprints, six headings and hull-specific maneuver catalogs. |
| Resources | Hull, Lifeveil, Morale, Strain and Supply; three system-risk save families (Structure/Hull, Engineer/Strain, Warden/Lifeveil). |
| Complications | Shared 24 cards × Impact and five station entries. Draw on final critical failure, not every ordinary failure. |
| Basic ammo | Generic battery shots currently consume 1 Supply when resolved; Chainshot consumes its actual charge. Reload is round-based, with once-per-battery-per-round firing. |

There is no compulsory General/Flux/Signature recovery-class system in this alpha. Standard/Instant describes timing; Prepared/Burn describes lifecycle. Do not reintroduce separate RP merely because old content mentions it.

## Rolls, damage and stacking

Crew skill modifiers come from `alpha-combat-api.js` through the core check service. The core has a fallback ship baseline for rules-only execution. Count ship/crew levels once; preserve the component breakdown. Four degrees use the PF2e check helper, including natural die adjustments.

Support cards generally deliver their base effect on failure, with a station setback; critical failure uses the contextual complication system. Boarding is an explicit contested exception. Attacks can miss. An attack's evaluated hit is saved before its damage command so damage resolution does not reroll accuracy. Optional Dice So Nice presentation cannot change an evaluated result.

Same-type accuracy and AC bonuses generally use the strongest value. Prepared DR is distinct from Instant resistance. Equipment and card-specific exceptions require authored rules, not additive UI guesses. Hull damage is applied at exchange closeout. Lifeveil currently pays for resistance/ward effects; it is not a universal shield pool that automatically absorbs every hit. Morale thresholds apply check penalties. Worsening Hull/Lifeveil or rising Strain in danger bands can trigger system saves; no-new-worsening means no automatic repeat save.

## Persistent ship boundary

Marked alpha vehicle Actors store `flags.arkflight-game.alphaLibrary` (schema/revision/config, learned IDs, three saved loadouts), `alphaShip` and station assignments. Encounter state lives in the `alphaCombat` world setting; interrupted movement uses `alphaMovementJournal`. Native token positions are checked against saved hexes and headings.

Only marked alpha fixture ships are currently supported by the native encounter adapter. Campaign actor migration is explicitly rejected. The alpha battery factory derives three fixed batteries from hull/level rather than consuming the complete ship equipment system. Alpha resources are encounter state; a complete shared campaign vessel/resource authority across Events, travel, trade and combat is not implemented.

This is the central unfinished integration task, not a reason to add more disconnected systems.

## References and precedence

1. Executable current alpha and user-approved decisions documented in the handoff.
2. This current snapshot and its explicit unresolved items.
3. Current HUD/testing guide for operational steps.
4. Older foundation/roadmap documents as design history where they do not conflict.

Keep Event gameplay and its authored content. Its risk/Momentum/station mechanics are a separate pillar, not proof that combat should revert to its earlier station-only ability system. Keep old data/schema readers and compatibility launchers until migration and usage checks justify removal.
