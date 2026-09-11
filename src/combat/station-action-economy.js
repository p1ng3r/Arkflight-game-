import { stationEffectProfile } from "./station-effect-rules.js";

export const STATION_BONUS_DEFINITION = "Station Bonus is the ship-level scaling value used by station actions: +1 at ship levels 1–9, +2 at levels 10–19, and +3 at level 20. It applies only where an action specifically says Station Bonus; it is not a universal bonus to every roll.";

export const STRAIN_THRESHOLD_DEFINITION = "When Strain reaches or exceeds the ship's Strain Limit, the ship area threatened by the action that caused the crossing degrades one step: Stable → Stressed → Damaged → Critical → Disabled. Subtract one Strain Limit and keep any overflow. A single station-action resolution degrades at most one area.";

const SECONDARY_SPENDS = Object.freeze({
  "captain-rally-crew": Object.freeze({ supplies: 1 }),
  "captain-drive-the-crew": Object.freeze({ morale: 1 }),
  "engineer-emergency-repair": Object.freeze({ supplies: 2 }),
  "battlewatch-reload-weapon": Object.freeze({ morale: 1 }),
  "battlewatch-ready-broadside": Object.freeze({ supplies: 1 }),
  "veilwarden-reinforce-lifeveil": Object.freeze({ lifeveil: 5 }),
  "veilwarden-focus-ward": Object.freeze({ lifeveil: 10 }),
  "veilwarden-emergency-ward": Object.freeze({ lifeveil: 5 })
});

const STRAIN_AREAS = Object.freeze({
  "captain-drive-the-crew": "morale",
  "engineer-overcharge-arkengine": "arkengine",
  "engineer-redistribute-power": "arkengine",
  "navigator-hard-turn": "rigging",
  "navigator-evasive-maneuver": "rigging",
  "battlewatch-reload-weapon": "morale"
});

export function stationActionEconomy(action, shipLevel = 1) {
  const profile = stationEffectProfile(shipLevel);
  const spends = SECONDARY_SPENDS[action?.id] ?? {};
  let ap = Math.max(0, Math.trunc(Number(action?.cost?.ap) || 0));
  const rp = Math.max(0, Math.trunc(Number(action?.cost?.rp) || 0));
  let strain = Math.max(0, Number(action?.rules?.strain) || 0);

  if (action?.id === "captain-drive-the-crew") {
    ap = 0;
    strain = profile.legendary ? 0 : profile.master ? 1 : 2;
  }
  if (action?.id === "engineer-overcharge-arkengine") strain = 2;
  if (action?.id === "engineer-redistribute-power") strain = 1;

  return Object.freeze({
    ap,
    rp,
    morale: Math.max(0, Math.trunc(Number(spends.morale) || 0)),
    supplies: Math.max(0, Math.trunc(Number(spends.supplies) || 0)),
    lifeveil: Math.max(0, Math.trunc(Number(spends.lifeveil) || 0)),
    strain
  });
}

export function stationActionStrainArea(action) {
  return STRAIN_AREAS[action?.id] ?? action?.rules?.strainArea ?? null;
}

export function stationActionRulesText(action) {
  const fallback = action?.description ?? action?.summary ?? "";
  const rules = {
    "captain-rally-crew": "Spend 1 AP and 1 Supply. Restore Morale equal to the Station Bonus, or improve a degraded Morale area by one step. At ship level 15+, improving the Morale area also restores Morale equal to the Station Bonus.",
    "captain-drive-the-crew": "Spend 1 Morale. Gain 1 AP for this turn and gain 2 Strain. At ship level 15+ gain only 1 Strain; at level 20 gain no Strain. Once per round. This Strain threatens Morale.",
    "engineer-overcharge-arkengine": "Spend 1 AP and gain 2 Strain. Gain one additional full Helm block this turn: movement equal to Combat Speed and facing steps equal to Maneuverability. Once per round. This Strain threatens the Arkengine.",
    "engineer-emergency-repair": "Spend 2 AP and 2 Supplies. Choose Hull, Arkengine, Rigging, or Lifeveil and improve that area's damage state by one step. At ship level 15+, improve it by two steps instead.",
    "engineer-redistribute-power": "Spend 1 AP and gain 1 Strain. Route power to Propulsion, Weapons, or Lifeveil. Propulsion immediately grants Station Bonus movement and 1 maneuver step. Weapons gives the next weapon attack(s) +Station Bonus damage. Lifeveil reduces the next wardable hit(s) by 2 × Station Bonus. From ship level 5, Weapons and Lifeveil each cover two qualifying uses. This Strain threatens the Arkengine.",
    "common-reload-weapon": "Spend 1 AP to reduce one installed weapon's remaining Reload by 1 round. Any assigned crew member may perform this action.",
    "battlewatch-reload-weapon": "Once per round, spend 1 Morale and gain 1 Strain. Choose one installed weapon with 2 or fewer rounds of Reload remaining; it immediately becomes Ready. This action costs 0 AP. This Strain threatens Morale.",
    "battlewatch-ready-broadside": "Spend 1 AP and 1 Supply. Choose Port or Starboard. The next shot from that facing gains +2 × Station Bonus damage. At ship level 15+, that shot also reduces its resulting reload by 1 round.",
    "veilwarden-reinforce-lifeveil": "Spend 1 AP and 5 Lifeveil. The next wardable hit reduces incoming damage by 2 × Station Bonus before Hardness. From ship level 5, this protects against the next two qualifying hits before the ship's next turn.",
    "veilwarden-focus-ward": "Spend 1 AP and 10 Lifeveil. Choose a ship area or energy type. The next matching hit reduces incoming damage by 3 × Station Bonus before Hardness. From ship level 5, this protects against the next two matching hits before the ship's next turn.",
    "veilwarden-emergency-ward": "Reaction — Spend 1 RP and 5 Lifeveil. Trigger: a wardable hit is about to deal damage. Reduce incoming damage by 4 × Station Bonus before Hardness."
  };
  return rules[action?.id] ?? fallback;
}

export function stationResourceIdentity() {
  return Object.freeze({
    ap: "Action Points: what the ship can do during its turn.",
    rp: "Reaction Points: shared emergency capacity used for reactions.",
    strain: "Strain: pressure from pushing the ship beyond safe operation. Reaching the Strain Limit degrades the area threatened by the action, then one Strain Limit is removed and overflow remains.",
    morale: "Morale: crew resolve that the Captain can spend to force extraordinary effort.",
    lifeveil: "Lifeveil: magical defensive energy that can also be deliberately burned for stronger ward effects.",
    supplies: "Supplies: ammunition, spare parts, sealant, powder, reagents, replacement rigging, and other consumables."
  });
}
