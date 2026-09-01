# Arkflight Shipwright Visual Board Art

Upload the visual fitting-board art to this directory using these exact filenames:

- `arkengine_mod_board_generic.webp` — fancy Arkengine fitting-board artwork used behind Arkengine mod sockets.
- `ship_mod_board_generic_side.webp` — generic side-profile Arkflight vessel used behind Ship Mod sockets.
- `weapon_board_generic_top.webp` — generic true top-down Arkflight vessel used behind Weapon hardpoints.

## Current visual-board design lock

### Ship Mods
- Explicit `Ship Mods` fitting view.
- Side-profile vessel art.
- Socket count and socket types come from the authoritative hull schema.
- Typed sockets with compatible Flexible sockets where the hull provides them.
- Art only supplies visual placement; it never defines capacity.

### Arkengine Mods
- Explicit `Arkengine Mods` fitting view.
- Fancy Arkengine illustration with drag/drop socket overlays.
- Socket count and types come from the authoritative Arkengine chassis/schema.
- Art only supplies visual placement; it never defines capacity.

### Weapons
- Explicit `Weapons` fitting view.
- True top-down vessel art.
- Weapon mount count and types come from the authoritative hull schema.
- Recommended mount families: prow, broadside/port, broadside/starboard, stern, deck, heavy, and flexible/utility where authored by the hull.
- Art only supplies visual placement; it never defines weapon capacity.

## Future hull-specific naming

When unique hull artwork is added, use stable hull IDs in filenames, for example:

- `ship_mod_board_brigantine_side.webp`
- `weapon_board_brigantine_top.webp`
- `ship_mod_board_galleon_side.webp`
- `weapon_board_galleon_top.webp`

Arkengine chassis-specific art should follow the same pattern, for example:

- `arkengine_mod_board_tidewake.webp`

Do not rename the three generic files after wiring begins.