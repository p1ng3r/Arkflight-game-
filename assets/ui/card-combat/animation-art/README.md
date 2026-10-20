# Arkflight combat animation art

Nine separate still-art layers generated for the brass-and-crystal combat interface. The card-combat HUD now animates these layers from confirmed encounter changes. The still assets remain independent of combat rules.

Runtime files are WebP at **70% quality**, at their original generated dimensions with alpha preserved exactly. Transparent padding, glow and edge pixels are retained. No cropping, background removal or resizing was applied during export.

| File | Intended use | Pixels |
| --- | --- | --- |
| [plan-latch-housing.webp](plan-latch-housing.webp) | Fixed brass guide rails; transparent central slot. | 1983 × 793 |
| [plan-latch-bolt.webp](plan-latch-bolt.webp) | Separate moving brass bolt with cyan crystal grip. | 2020 × 779 |
| [ap-crystal.webp](ap-crystal.webp) | Cyan diamond-shaped action-point indicator. | 1254 × 1254 |
| [rp-crystal.webp](rp-crystal.webp) | Amber shield-shaped reaction-point indicator. | 1254 × 1254 |
| [ability-card-frame.webp](ability-card-frame.webp) | Portrait brass frame with transparent center and blank top band. | 1024 × 1536 |
| [lifeveil-impact.webp](lifeveil-impact.webp) | Green/gold leafy protective ring with impact on its upper-right edge. | 1254 × 1254 |
| [arkengine-flare.webp](arkengine-flare.webp) | Vertical cyan aether plume, bright core toward the upper end and tapered lower tail. | 887 × 1774 |
| [cannon-muzzle-flash.webp](cannon-muzzle-flash.webp) | Horizontal amber flash with its ignition point toward the left and plume extending right. | 1774 × 887 |
| [signature-burst.webp](signature-burst.webp) | Gold compass-ring accent with transparent center and cyan crystal sparks. | 1254 × 1254 |

## Integration notes

- The latch housing and bolt are separate components. They are not registered sprite frames; size and align them independently for the lock motion.
- AP uses a cyan diamond; RP uses an amber shield. Their separate shapes and labels should remain distinguishable when motion or color effects are disabled.
- The card frame has a clear center. Keep rules text, costs and General / Flux / Signature type colors in the interface rather than baking text into the artwork.
- Rings leave the underlying illustration or token visible. The engine and cannon effects include no physical vessel or gun; position and rotate each layer at the relevant source.
- Use the manifest dimensions and alpha bounds to account for transparent padding. These are source-space bounds, not calibrated animation anchors or timing data.
- The assets contain no sounds, video loops, outcome logic or module dependencies. Timing, client settings, reduced-motion handling, quiet generated tones and revision deduplication live in `src/ui/card-combat-motion.js` and `card-combat-motion-state.js`.

[manifest.json](manifest.json) records dimensions, alpha bounds and generated source identifiers. [ART.md](ART.md) records the generation method, references and exact prompts.
