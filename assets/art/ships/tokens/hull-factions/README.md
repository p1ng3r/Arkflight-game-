# Hull and faction token collection

Ten unnamed ship illustrations, one per current alpha hull. Cosmetic art only: faction treatments do not change statistics, movement, footprint or ownership. Existing ships and token choices are preserved.

| File | Hull | Artistic influence |
|---|---|---|
| void-skiff.webp | Void Skiff | Freespacer scout |
| sloop.webp | Sloop | Underwake smuggler |
| cutter.webp | Cutter | Freebooter patrol |
| brigantine.webp | Brigantine | Grelkin captured/rebuilt raider |
| frigate.webp | Frigate | Brotherhood of the Cosmic Flame |
| galleon.webp | Galleon | Starweaver commercial shipping |
| hammerhead.webp | Hammerhead | Ironmantle heavy construction |
| arkcruiser.webp | Arkcruiser | Stormglass expedition prototype |
| dread-caravel.webp | Dread Caravel | Council of the Void interpretation |
| cathedral-ship.webp | Cathedral Ship | Faith of the Churn pilgrim interpretation |

Source: https://github.com/p1ng3r/Ayerstone-Setting-Guide/blob/main/docs/factions/index.md and the existing Arkflight Ayerstone integration/doctrine. Colors, markings and ship architecture are artistic interpretations, not new setting canon. In particular, the Council's architecture and the Faith's vessel are not claims about a canonical military fleet.

## Files and use

All production tokens: 1024×1024 WebP, quality 75, transparent background, bow up, no circular base. Files use hull IDs instead of personal ship names. Choose an image in Foundry's token texture picker under `modules/arkflight-game/assets/art/ships/tokens/hull-factions/`. To retain it for future placements, also select it as the actor's prototype token image. Multi-hex footprints continue to use the existing rules; the artwork itself does not define occupied cells.

## Generation provenance and prompts

Built-in image generation, one separate generation per hull. Shared prompt: true 90-degree orthographic overhead camera, bow at twelve o'clock, entire vessel visible, one ship centered on square canvas, transparent margin, historical wooden sailing ship adapted to magical spaceflight; legible deck, port/starboard and sails; hand-painted fantasy RPG illustration, fine ink contours and crosshatching, wood, aged brass, cream cloth and restrained arcane glow. No sea, space backdrop, grid, circular base, exterior drop shadow, text, names or UI.

Subjects:
- Void Skiff: narrow open deck, one swept cream triangular sail, small blue stern Arkengine.
- Sloop: low dark wooden hull, charcoal-teal lateen sails, concealed cargo hatches, violet engine, repaired stern platform.
- Cutter: long fast hull, ivory fore-and-aft sails, blue pennants, brass swivel guns.
- Brigantine: broad captured hull, patched rust-red/ochre sails, bolted scrap armor, reinforced prow, lateral brass engine pods.
- Frigate: armored dark wood, golden dragon prow, crimson square sails, orderly broadside guns, brass scales and amber engine.
- Galleon: broad merchant hull, three masts, ivory/blue sails, cargo hatches and passenger deck, celestial gold decoration.
- Hammerhead: wide transverse iron-plated bow, thick hull, short rust sails, rivets and bronze machinery.
- Arkcruiser: elongated expedition hull, three separated cream sail groups, teal glass/brass conduits, observation galleries.
- Dread Caravel: imposing blackened hull, curved indigo sails, crescent brass ribs, faint violet core, restrained alien geometry.
- Cathedral Ship: broad sanctuary hull, ivory/burgundy sails, chapel stern, brass reliquary dome and turquoise ward machinery.
