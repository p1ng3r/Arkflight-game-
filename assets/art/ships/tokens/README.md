# Arkflight ship token art

Ten generated ship designs, encoded as WebP at **70% quality**. Original pixel dimensions and exact alpha channels are preserved; no cropping, rescaling, background removal or repainting was applied during conversion. Bow-up artwork uses north/up as its intended heading at rotation 0.

| File | Design | Pixels |
| --- | --- | --- |
| [solar-voyager.webp](solar-voyager.webp) | Solar Voyager — Revised solar-vessel preview | 1254 × 1254 |
| [solar-cruiser.webp](solar-cruiser.webp) | Solar Cruiser — Sleek solar cruiser | 1024 × 1536 |
| [salvage-raider.webp](salvage-raider.webp) | Salvage Raider — Patchwork salvage raider | 1024 × 1536 |
| [broadside-warship.webp](broadside-warship.webp) | Broadside Warship — Heavy broadside vessel | 1024 × 1536 |
| [moonwake.webp](moonwake.webp) | Moonwake — Original armed trader | 1254 × 1254 |
| [copper-kettle.webp](copper-kettle.webp) | Copper Kettle — Cog-inspired cargo hauler | 1254 × 1254 |
| [sirocco.webp](sirocco.webp) | Sirocco — Xebec-inspired courier | 1275 × 1234 |
| [jade-lantern.webp](jade-lantern.webp) | Jade Lantern — Junk-inspired voyager | 1254 × 1254 |
| [ember-crown.webp](ember-crown.webp) | Ember Crown — Galleon-inspired armed merchant | 1254 × 1254 |
| [rime-serpent.webp](rime-serpent.webp) | Rime Serpent — Longship-inspired raider | 1254 × 1254 |

## Use in Foundry

After updating the module, choose a file from `modules/arkflight-game/assets/art/ships/tokens/` in a ship’s **Prototype Token → Appearance → Image** picker. Keep token rotation enabled so the bow follows the tracked heading. Update already placed tokens separately if needed.

These are optional art assets. They do not create Actors, assign mechanical ship profiles, change the equipped test fleet, or replace custom artwork. Different image canvas proportions are retained from the generated originals; Foundry token dimensions and texture scale remain the GM’s choice.

Design briefs and historical reference sources are documented in [ART.md](ART.md).
