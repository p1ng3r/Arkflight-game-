export const LIFEVEIL = Object.freeze({
  minimum: 0,
  maximum: 100,
  protectsAtmosphere: true,
  protectsEnvironment: true,
  magicalShielding: true,
  temporaryHitPoints: false,
  offlineBelowPercent: 10,
  standardAbilityCostPercent: 5,
  degradationLossPercent: 25
});

export const LIFEVEIL_BANDS = Object.freeze([
  { minimum: 100, id: "stable", label: "Stable" },
  { minimum: 75, id: "weakened", label: "Weakened" },
  { minimum: 50, id: "fraying", label: "Fraying" },
  { minimum: 25, id: "unstable", label: "Unstable" },
  { minimum: 10, id: "critical", label: "Critical" },
  { minimum: 0, id: "collapsed", label: "Collapsed" }
].map(Object.freeze));

export const LIFEVEIL_RECOVERY_DEGREES = Object.freeze({
  CRITICAL_SUCCESS: "criticalSuccess",
  SUCCESS: "success",
  FAILURE: "failure",
  CRITICAL_FAILURE: "criticalFailure"
});

export const LIFEVEIL_RECOVERY = Object.freeze({
  hours: 1,
  skills: Object.freeze(["arcana", "religion", "nature", "occultism"]),
  successPercent: 10,
  criticalSuccessPercent: 20,
  defaultConsumableCost: 0,
  criticalFailureStrain: 1
});

function clampLifeveil(value) {
  const n = Number(value) || 0;
  return Math.max(LIFEVEIL.minimum, Math.min(LIFEVEIL.maximum, n));
}

export function lifeveilState(value) {
  const percent = clampLifeveil(value);
  const band = LIFEVEIL_BANDS.find((entry) => percent >= entry.minimum) ?? LIFEVEIL_BANDS.at(-1);
  return Object.freeze({ value: percent, percent, band: band.id, label: band.label, online: percent >= 10 });
}

export function changeLifeveil(current, deltaPercent) {
  return clampLifeveil(clampLifeveil(current) + Number(deltaPercent || 0));
}

export function degradeLifeveil(current, steps = 1) {
  const loss = Math.max(0, Number(steps) || 0) * LIFEVEIL.degradationLossPercent;
  return changeLifeveil(current, -loss);
}

export function lifeveilOperationalState(ship) {
  const value = clampLifeveil(ship?.resources?.lifeveil?.value ?? 0);
  const state = lifeveilState(value);
  if (value >= 10) {
    return Object.freeze({
      id: "online",
      label: "Online",
      lifeveilState: state.band,
      lifeveilPercent: value,
      environmentalEnvelopeAvailable: true,
      magicalShieldingAvailable: true,
      exposureRequired: false
    });
  }
  return Object.freeze({
    id: "offline",
    label: "Offline",
    lifeveilState: state.band,
    lifeveilPercent: value,
    environmentalEnvelopeAvailable: false,
    magicalShieldingAvailable: false,
    exposureRequired: true
  });
}

/**
 * Resolve one Lifeveil stabilization attempt.
 *
 * Lifeveil is always a 0-100% integrity resource. Recovery restores fixed
 * percentage points rather than a fraction of a hull-specific maximum.
 * Permanent modifiers supplied by Mods/Talents may adjust those percentages.
 */
export function resolveLifeveilRecovery({
  degree,
  successPercentBonus = 0,
  criticalSuccessPercentBonus = 0,
  recoveryMultiplier = 1,
  hoursModifier = 0,
  criticalFailureStrainModifier = 0,
  // Legacy fraction bonuses remain accepted during migration.
  successFractionBonus = 0,
  criticalSuccessFractionBonus = 0
} = {}) {
  const multiplier = Math.max(0, Number(recoveryMultiplier) || 0);
  const timeHours = Math.max(0, LIFEVEIL_RECOVERY.hours + Number(hoursModifier || 0));
  const successPercent = Math.max(0,
    LIFEVEIL_RECOVERY.successPercent +
    Number(successPercentBonus || 0) +
    Number(successFractionBonus || 0) * 100
  );
  const criticalPercent = Math.max(0,
    LIFEVEIL_RECOVERY.criticalSuccessPercent +
    Number(criticalSuccessPercentBonus || 0) +
    Number(criticalSuccessFractionBonus || 0) * 100
  );
  const critFailStrain = Math.max(0, LIFEVEIL_RECOVERY.criticalFailureStrain + Number(criticalFailureStrainModifier || 0));

  switch (degree) {
    case LIFEVEIL_RECOVERY_DEGREES.CRITICAL_SUCCESS:
      return Object.freeze({
        success: true,
        lifeveilRestored: Math.round(criticalPercent * multiplier),
        strainGained: 0,
        consumablesConsumed: LIFEVEIL_RECOVERY.defaultConsumableCost,
        timeHours
      });
    case LIFEVEIL_RECOVERY_DEGREES.SUCCESS:
      return Object.freeze({
        success: true,
        lifeveilRestored: Math.round(successPercent * multiplier),
        strainGained: 0,
        consumablesConsumed: LIFEVEIL_RECOVERY.defaultConsumableCost,
        timeHours
      });
    case LIFEVEIL_RECOVERY_DEGREES.FAILURE:
      return Object.freeze({
        success: false,
        lifeveilRestored: 0,
        strainGained: 0,
        consumablesConsumed: LIFEVEIL_RECOVERY.defaultConsumableCost,
        timeHours
      });
    case LIFEVEIL_RECOVERY_DEGREES.CRITICAL_FAILURE:
      return Object.freeze({
        success: false,
        lifeveilRestored: 0,
        strainGained: critFailStrain,
        consumablesConsumed: LIFEVEIL_RECOVERY.defaultConsumableCost,
        timeHours
      });
    default:
      throw new Error(`Unknown Lifeveil recovery degree: ${degree}`);
  }
}
