import { applyShipSystemDegradation } from "./ship-conditions.js";
import { normalizeShip } from "./ship-schema.js";

export const STRAIN_FLAT_CHECK_BANDS = Object.freeze([
  Object.freeze({ minimumPercent: 90, maximumPercent: 99.999, dc: 15, id: "critical" }),
  Object.freeze({ minimumPercent: 75, maximumPercent: 89.999, dc: 10, id: "danger" }),
  Object.freeze({ minimumPercent: 50, maximumPercent: 74.999, dc: 5, id: "warning" })
]);

export const STRAIN_DEGRADATION_D8 = Object.freeze({
  1: "hull",
  2: "morale",
  3: "drive",
  4: "drive",
  5: "lifeveil",
  6: "hull",
  7: "weapons",
  8: "player-choice"
});

export const PUSHED_ABILITY_STRAIN = Object.freeze({
  criticalSuccess: Object.freeze({ strain: 0, directDegradation: false, flatCheckEligible: false }),
  success: Object.freeze({ strain: 1, directDegradation: false, flatCheckEligible: true }),
  failure: Object.freeze({ strain: 1, directDegradation: true, flatCheckEligible: false }),
  criticalFailure: Object.freeze({ strain: 2, directDegradation: true, flatCheckEligible: false })
});

export function strainPercent(value, maximum) {
  const max = Math.max(0, Number(maximum) || 0);
  if (max <= 0) return 0;
  return Math.max(0, (Number(value) || 0) / max * 100);
}

export function strainFlatCheckDC(value, maximum) {
  const percent = strainPercent(value, maximum);
  if (percent >= 100) return null;
  return STRAIN_FLAT_CHECK_BANDS.find((entry) => percent >= entry.minimumPercent)?.dc ?? null;
}

export function strainRiskState(value, maximum) {
  const percent = strainPercent(value, maximum);
  const dc = strainFlatCheckDC(value, maximum);
  return Object.freeze({
    percent,
    flatCheckRequired: dc !== null,
    flatCheckDC: dc,
    thresholdReached: percent >= 100
  });
}

export function strainDegradationTarget(d8) {
  const roll = Math.trunc(Number(d8) || 0);
  if (roll < 1 || roll > 8) throw new Error(`Strain degradation roll must be 1-8, got: ${d8}`);
  return STRAIN_DEGRADATION_D8[roll];
}

export function pushedAbilityStrainOutcome(degree) {
  const result = PUSHED_ABILITY_STRAIN[String(degree ?? "")];
  if (!result) throw new Error(`Unknown pushed ability degree: ${degree}`);
  return result;
}

export function applyStrainDegradation(ship, d8, { chosenTarget = null } = {}) {
  const target = strainDegradationTarget(d8);
  return applyShipSystemDegradation(ship, target, { chosenTarget });
}

/**
 * Add one discrete source of ship-wide Strain.
 *
 * This resolver performs only persistent math. It reports whether the resulting
 * Strain requires a flat check or an automatic degradation roll. A caller that
 * owns dice/chat UX performs those rolls and then calls applyStrainDegradation.
 *
 * A resolution that already worsened a Ship Condition may pass
 * alreadyDegraded=true. That suppresses an additional degradation while still
 * applying Strain and Strain-limit overflow.
 */
export function resolveStrainContribution(ship, {
  amount = 0,
  strainLimit = ship?.resources?.strain?.max ?? 0,
  suppressFlatCheck = false,
  alreadyDegraded = false
} = {}) {
  const next = normalizeShip(structuredClone(ship));
  const limit = Math.max(0, Number(strainLimit) || 0);
  const current = Math.max(0, Number(next.resources?.strain?.value ?? 0));
  const gained = Math.max(0, Number(amount) || 0);
  const total = current + gained;

  if (limit <= 0) {
    next.resources.strain = { ...(next.resources.strain ?? {}), value: total, max: limit };
    return Object.freeze({
      ship: next,
      thresholdCrossed: false,
      degradationRequired: false,
      strainBefore: current,
      strainAdded: gained,
      strainAfter: total,
      strainPercent: 0,
      flatCheckRequired: false,
      flatCheckDC: null
    });
  }

  if (total >= limit) {
    const overflow = total - limit;
    next.resources.strain = { ...(next.resources.strain ?? {}), value: overflow, max: limit };
    return Object.freeze({
      ship: next,
      thresholdCrossed: true,
      degradationRequired: gained > 0 && !alreadyDegraded,
      strainBefore: current,
      strainAdded: gained,
      strainAfter: overflow,
      strainPercent: strainPercent(overflow, limit),
      flatCheckRequired: false,
      flatCheckDC: null
    });
  }

  next.resources.strain = { ...(next.resources.strain ?? {}), value: total, max: limit };
  const flatCheckDC = (!suppressFlatCheck && !alreadyDegraded && gained > 0)
    ? strainFlatCheckDC(total, limit)
    : null;

  return Object.freeze({
    ship: next,
    thresholdCrossed: false,
    degradationRequired: false,
    strainBefore: current,
    strainAdded: gained,
    strainAfter: total,
    strainPercent: strainPercent(total, limit),
    flatCheckRequired: flatCheckDC !== null,
    flatCheckDC
  });
}
