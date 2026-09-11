import { stationEffectProfile } from "./station-effect-rules.js";

export const STATION_BONUS_DEFINITION = "Station Bonus is the ship-level scaling value used by station actions: +1 at ship levels 1–9, +2 at levels 10–19, and +3 at level 20. It applies only where an action specifically says Station Bonus; it is not a universal bonus to every roll.";

export const STRAIN_THRESHOLD_DEFINITION = "When Strain is added: 50-74% requires DC 5, 75-89% DC 10, and 90-99% DC 15. Failure worsens one Ship Condition determined by 1d8. At 100%+, skip the flat check, automatically roll 1d8, subtract one full Strain capacity, and keep overflow. A single triggering resolution can worsen at most one Ship Condition.";

const SECONDARY_SPENDS = Object.freeze({
  "captain-rally-crew": Object.freeze({ supplies: 1 }),
  "captain-drive-the-crew": Object.freeze({ morale: 20 }),
  "engineer-emergency-repair": Object.freeze({ supplies: 2 }),
  "battlewatch-reload-weapon": Object.freeze({ morale: 20 }),
  "battlewatch-ready-broadside": Object.freeze({ supplies: 1 }),
  "veilwarden-reinforce-lifeveil": Object.freeze({ lifeveil: 5 }),
  "veilwarden-focus-ward": Object.freeze({ lifeveil: 10 }),
  "veilwarden-emergency-ward": Object.freeze({ lifeveil: 5 })
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

export function stationActionStrainArea(_action) {
  // Deprecated compatibility API. Strain is ship-wide and does not threaten a
  // predetermined Area; failed checks use the shared d8 Ship Condition table.
  return null;
}

export function stationActionRulesText(action) {
  const fallback = action?.description ?? action?.summary ?? "";
  const rules = {
    "captain-rally-crew": "Spend 1 AP and 1 Supply. Restore 20% Morale × Station Bonus, up to 100%.",
    "captain-drive-the-crew": "Spend 20% Morale. Gain 1 AP for this turn and gain 2 Strain. At ship level 15+ gain only 1 Strain; at level 20 gain no Strain. Once per round. This Strain stresses the whole ship.",
    "engineer-overcharge-arkengine": "Spend 1 AP and gain 2 Strain. Gain one additional full Helm block this turn: movement equal to Combat Speed and facing steps equal to Maneuverability. Once per round. This Strain stresses the whole ship.",
    "engineer-emergency-repair": "Spend 2 AP and 2 Supplies. Choose Hull, Drive, Weapons, or Lifeveil. Improve that Ship Condition by one step, or restore 25% Lifeveil. At ship level 15+, improve/restore two steps instead.",
    "engineer-redistribute-power": "Spend 1 AP and gain 1 Strain. Route power to Propulsion, Weapons, or Lifeveil. Propulsion immediately grants Station Bonus movement and 1 maneuver step. Weapons gives the next weapon attack(s) +Station Bonus damage. Lifeveil reduces the next wardable hit(s) by 2 × Station Bonus. From ship level 5, Weapons and Lifeveil each cover two qualifying uses. This Strain stresses the whole ship.",
    "common-reload-weapon": "Spend 1 AP to reduce one installed weapon's remaining Reload by 1 round. Any Owner of the ship may perform this action.",
    "battlewatch-reload-weapon": "Once per round, spend 20% Morale and gain 1 Strain. Choose one installed weapon with 2 or fewer rounds of Reload remaining; it immediately becomes Ready. This action costs 0 AP. This Strain stresses the whole ship.",
    "battlewatch-ready-broadside": "Spend 1 AP and 1 Supply. Choose Port or Starboard. The next shot from that facing gains +2 × Station Bonus damage. At ship level 15+, that shot also reduces its resulting reload by 1 round.",
    "veilwarden-reinforce-lifeveil": "Spend 1 AP and 5 Lifeveil. The next wardable hit reduces incoming damage by 2 × Station Bonus before Hardness. From ship level 5, this protects against the next two qualifying hits before the ship's next turn.",
    "veilwarden-focus-ward": "Spend 1 AP and 10 Lifeveil. Choose a Ship Condition system or energy type. The next matching hit reduces incoming damage by 3 × Station Bonus before Hardness. From ship level 5, this protects against the next two matching hits before the ship's next turn.",
    "veilwarden-emergency-ward": "Reaction — Spend 1 RP and 5 Lifeveil. Trigger: a wardable hit is about to deal damage. Reduce incoming damage by 4 × Station Bonus before Hardness.",
    "navigator-impossible-burn": "Once per battle, at 0 AP, overburn the Arkengine to add 50% of current Combat Speed (rounded up) to this turn's movement allowance. Gain 2 Strain.",
    "navigator-turn-between-heartbeats": "Once per battle, at 0 AP, gain 2 extraordinary 60-degree facing steps this turn. These are additional allowance and may be used during movement.",
    "navigator-ram-ship": "Spend 2 AP after moving at least 1 hex this turn. Choose an adjacent ship. The target makes a Maneuver Save against this ship's Collision DC. Critical Success: no collision. Success: half impact. Failure: full impact. Critical Failure: double impact. Hardness reduces final Hull damage, and the ramming ship can suffer recoil damage.",
    "navigator-grapple-ship": "Spend 1 AP and choose an adjacent ship. The target makes a Maneuver Save against this ship's Grapple DC. Failure: both ships become Moored. Critical Failure: Moored and the attacker gains a boarding opportunity.",
    "navigator-break-grapple": "Spend 1 AP while Moored. Make this ship's Maneuver Save against the other vessel's Grapple DC. Success or Critical Success breaks the grapple for both ships.",
    "captain-board-ship": "At 0 AP, choose the ship currently Moored to this vessel and establish boarding. Character-scale movement, initiative, attacks, and encounters then use normal PF2e rules while ship combat keeps the vessels Moored."
  };
  return rules[action?.id] ?? fallback;
}

export function stationResourceIdentity() {
  return Object.freeze({
    ap: "Action Points: what the ship can do during its turn.",
    rp: "Reaction Points: shared emergency capacity used for reactions.",
    strain: "Strain: ship-wide push-your-luck stress. Failed danger-band checks and the Strain Limit worsen a Ship Condition through the shared d8 table.",
    morale: "Morale: crew resolve tracked from 0-100%. A former 1-point Morale cost is now 20%.",
    lifeveil: "Lifeveil: a 0-100% magical/environmental envelope. Abilities spend percentage points directly.",
    supplies: "Supplies: ammunition, spare parts, sealant, powder, reagents, replacement rigging, and other consumables."
  });
}
