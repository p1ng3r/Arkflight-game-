# Physical card sounds

Eight unmodified Ogg Vorbis files from **Casino Audio 1.1**, by Kenney Vleugels (Kenney.nl).

- Source: https://kenney.nl/assets/casino-audio
- Download: https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip
- License: Creative Commons Zero (CC0 1.0). The original `License.txt` is preserved as `LICENSE-Kenney.txt`.
- Added: 21 October 2026.

Selection uses `card-place-1/2`; deselection uses `card-slide-1/2`; inspection uses `card-slide-2/3`; closing uses `card-shove-1` or `card-slide-1`; pinning uses `card-place-2/3`; locking uses `card-place-3`; Flux recovery uses `card-fan-1`. Repeated interactions alternate available variants with small playback-rate variation. Hovering, scrolling and dragging remain silent. Short bursts are dropped rather than queued.

Files are bundled and decoded once per browser audio context after a user gesture. No external audio service or extra Foundry module is needed. Missing/unsupported samples remain silent without blocking game actions. Combat sounds (cannon, engine, impact, ward, Signature, reaction and roll outcomes) remain procedural and separate from the physical card cues. Client mute, volume and voice cleanup apply to both.
