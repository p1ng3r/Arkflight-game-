import { applyShipSystemDegradation } from "./ship-conditions.js";
import { normalizeShip } from "./ship-schema.js";

// Deprecated compatibility exports. Ship Conditions are authoritative.
export const AREA_STATE_ORDER = Object.freeze(["stable", "stressed", "damaged", "critical", "disabled"]);
export const AREA_INTEGRITY_FRACTIONS = Object.freeze({
  stable: 1,
  stressed: 1,
  damaged: 1,
  critical: 1,
  disabled: 1
});

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

export function areaIntegrityFraction(_state) { return 1; }
export function effectiveIntegrityMax(baseMax, _state) { return Math.max(0, Number(baseMax) || 0); }
export function applyAreaIntegrityCaps(ship) { return normalizeShip(structuredClone(ship)); }

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
 * Add one discrete source of Strain.
 *
 * The resolver never chooses what breaks. It reports whether the resulting
 * Strain requires a flat check or an automatic degradation roll. Foundry (or
 * another caller) performs the d20/d8 rolls and then calls applyStrainDegradation.
 *
 * A resolution that already caused a Ship Condition to worsen may pass
 * alreadyDegraded=true. That suppresses the extra flat-check/degradation while
 * still applying Strain and Strain-limit overflow.
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
      ship: next, thresholdCrossed: false, degradationRequired: false,
      strainBefore: current, strainAdded: gained, strainAfter: total,
      strainPercent: 0, flatCheckRequired: false, flatCheckDC: null
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

// Legacy helper kept only so older callers fail softly during migration.
export function degradeAreaOneStep(ship, area) {
  const target = ["arkengine", "rigging"].includes(String(area)) ? "drive" : String(area);
  const result = applyShipSystemDegradation(ship, target);
  return Object.freeze({
    ship: result.ship,
    previousState: result.previous?.id ?? null,
    state: result.condition?.id ?? null,
    degraded: result.changed
  });
}
