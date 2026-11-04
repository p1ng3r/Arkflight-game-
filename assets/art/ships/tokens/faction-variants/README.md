# Faction ship token variants — second collection

Ten unnamed cosmetic variants. These add artwork choices without changing ship statistics or creating new mechanical hull types. Existing token selections are preserved.

| File | Visual inspiration | Suggested existing hull |
|---|---|---|
| veilwarden-containment.webp | Veilwarden binding/containment vessel | Arkcruiser |
| blackwake-privateer.webp | House Blackwake fast boarding privateer | Frigate |
| emberhall-siege.webp | House Emberhall furnace and heavy guns | Hammerhead |
| valecross-sanctuary.webp | House Valecross gardens and Lifeveil | Cathedral Ship |
| veyr-luxury-trader.webp | House Veyr passenger luxury | Galleon |
| tidereach-freighter.webp | House Tidereach freight logistics | Galleon |
| grelkin-twin-hull.webp | Captured hulls joined by salvage construction | Brigantine |
| brotherhood-boarding.webp | Cosmic Flame dragon-led imperial boarding vessel | Frigate |
| freespacer-salvager.webp | Independent recovery and towing vessel | Brigantine |
| stormglass-ring-drive.webp | House Stormglass experimental engine prototype | Arkcruiser |

Designs are artistic interpretations of the Ayerstone setting and Arkflight's existing faction doctrine, not newly established canonical heraldry or ship designs. Source references: `docs/AYERSTONE-FACTION-INTEGRATION.md` and `src/generator/ayerstone-ship-doctrine.js`.

## Use in Foundry

Choose an image in the token texture picker under `modules/arkflight-game/assets/art/ships/tokens/faction-variants/`. Also set the actor's prototype token texture if future placements should use it. The image alone does not define occupied hexes, firing arcs, weapons or abilities.

All exports: transparent 1024×1024 WebP, quality 75, bow up, no circular base. Generation uses the built-in image tool, one separate generation per design. Originals remain unmodified; production copies are resized to fit within a 944px square and centered on a transparent 1024px square.

## Prompt set

Shared prompt: production Foundry ship token; true 90-degree overhead orthographic view, bow up and stern down, one whole ship centered with transparent margin around spars and rigging; historical wooden sailing vessel adapted to magical spaceflight. Hand-painted fantasy RPG illustration, confident ink contours/crosshatching, rich wood, aged brass, textured cloth and restrained arcane light. Readable silhouette and deck. Genuine transparent background; no external glow, shadow, sea, stars, grid, base, text, labels, border or UI.

Subjects:
- Containment: enclosed central chamber with three brass binding rings, pale blue-white sails, turquoise emitters, octagonal midship.
- Privateer: very narrow dark hull, swept black lateen sails, lateral boarding platforms, heavy grapnels, red pennants.
- Siege: broad squat armor, aft furnace, short copper-red sails, oversized recessed forward cannon.
- Sanctuary: rounded hull, green/ivory sails, sheltered garden terraces, Lifeveil machinery, curved galleries.
- Luxury trader: slender gilded hull, plum sails, passenger galleries, compact holds and blue engine.
- Freighter: wide rectangular working hull with pointed prow, folded cranes, freight pods, tan sails and industrial brass engines.
- Twin hull: mismatched captured hulls joined by gun deck and bolted scrap bridges, patched ochre/red sails, asymmetric engines.
- Boarding: wedge armored prow, crimson battened sails, folded boarding ramps, gold dragon ornament and amber engine.
- Salvager: asymmetric hull and single outrigger, folded recovery crane, towing winches, cream patched sails and blue engine.
- Ring drive: compact wooden hull surrounded at midship by a horizontal brass engine ring, short split ivory sails and blue conduits.
