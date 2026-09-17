# Arkflight Ship Strain and Station Systems — Legacy Note

**Status:** RETIRED / compatibility reference only

This document previously described the experimental five-Area / Pressure-era ship model. That model has been replaced.

The authoritative persistent ship rules are now:

- [Ship Conditions & Strain Contract](./SHIP-CONDITION-STRAIN-CONTRACT.md)
- [Ship Schema — Design Authority](./SHIP-SCHEMA.md)

Current rules in brief:

- Strain is **one ship-wide pool**.
- 50–74% Strain: DC 5 flat check.
- 75–89% Strain: DC 10 flat check.
- 90–99% Strain: DC 15 flat check.
- 100%+: automatic shared d8 degradation, subtract one Strain capacity, keep overflow.
- Persistent physical/system damage uses **Ship Conditions**.
- Hull: Sound → Battered → Breached → Shattered.
- Drive: Responsive → Sluggish → Faltering → Unresponsive.
- Weapons: Ready → Fouled → Malfunctioning → Barely Operable.
- Lifeveil and Morale are fixed 0–100% resources with percentage-derived condition labels.
- Arkengine and Rigging remain separate equipment/crew concepts, but their general persistent movement damage is the shared **Drive** condition.
- There is no universal station-penalty degradation ladder.
- Pressure is not a persistent ship resource.

Do not add new gameplay code from the older Area/Pressure model. Legacy identifiers may remain temporarily only for migration of persisted worlds and authored content.
