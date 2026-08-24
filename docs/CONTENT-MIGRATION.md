# Arkflight Donor Content Migration

This document records the content migrated from the original Arcflight repository into the clean Arkflight-game rebuild.

## Migrated catalogs

- 11 hulls
- 7 hull patterns
- 11 Arkengines
- 9 Arkengine patterns
- 22 Arkengine Mods
- 28 Ship Mods (renamed from donor `shipUpgrades`)
- 26 rooms total: 6 core rooms + 20 expansion rooms
- 4 ship weapons
- 15 crew specialists

## Preserved

Preserved where useful: names, roles/descriptions, tags/traits, hull stats, crew ranges, weapon mounts/arcs, engine compatibility, engine travel/fuel/mod-slot identity, direct component modifiers, room utility identity, weapon profiles, crew specialties, and selected Signature Ability unlock hooks.

## Intentionally not migrated as runtime requirements

- Focus
- AP/RAP and AP-granting component effects
- refit-pressure values and major-refit bureaucracy
- install history/provenance machinery
- replay/session state
- old Voyage state machines
- automatic combat/reload resolution
- generic passive crew modifier spam

## Arkengine Variants

The donor had both Arkengine Patterns and a second Arkengine Variant layer. The rebuild does not keep Variants as a second installation/customization layer. Existing variant-family identity is retained as Arkengine metadata where useful. If later play demonstrates that Variants create a distinct decision not served by Patterns or Arkengine Mods, they may return as content rather than legacy compatibility baggage.

## Component philosophy

- Hulls define the vessel chassis and capacities.
- Arkengines define propulsion/veil/strain/fuel identity.
- Arkengine Mods alter the engine and use Arkengine Mod capacity.
- Ship Mods alter the vessel globally and remain distinct from Arkengine Mods.
- Rooms are physical infrastructure; expansion rooms consume room capacity while core rooms do not.
- Weapons retain combat source data without forcing the old combat runtime.
- Crew specialists primarily grant capabilities and future choices rather than permanent numeric bonuses.

The clean schema is authoritative. Donor data is source material, not a compatibility contract.
