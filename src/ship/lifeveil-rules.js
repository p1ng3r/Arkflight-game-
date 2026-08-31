export const LIFEVEIL = Object.freeze({
  protectsAtmosphere: true,
  protectsEnvironment: true,
  magicalShielding: true,
  temporaryHitPoints: false,
  offlineAtZero: true
});

export const LIFEVEIL_RECOVERY_DEGREES = Object.freeze({
  CRITICAL_SUCCESS: "criticalSuccess",
  SUCCESS: "success",
  FAILURE: "failure",
  CRITICAL_FAILURE: "criticalFailure"
});

export const LIFEVEIL_RECOVERY = Object.freeze({
  hours: 1,
  skills: Object.freeze(["arcana", "religion", "nature", "occultism"]),
  successFractionOfBaseMax: 0.10,
  criticalSuccessFractionOfBaseMax: 0.20,
  defaultConsumableCost: 0,
  criticalFailureStrain: 1
});

export function lifeveilOperationalState(ship) {
  const value = Math.max(0, Number(ship?.resources?.lifeveil?.value ?? 0));
  if (value > 0) {
    return Object.freeze({
      id: "online",
      label: "Online",
      environmentalEnvelopeAvailable: true,
      magicalShieldingAvailable: true,
      exposureRequired: false
    });
  }
  return Object.freeze({
    id: "offline",
    label: "Offline",
    environmentalEnvelopeAvailable: false,
    magicalShieldingAvailable: false,
    exposureRequired: true
  });
}

/**
 * Resolve one Lifeveil stabilization attempt.
 *
 * Permanent modifiers supplied by installed Mods, Talents, Rooms, specialists,
 * or other authored effects modify this shared rule instead of replacing it.
 */
export function resolveLifeveilRecovery({
  degree,
  baseMaxLifeveil,
  successFractionBonus = 0,
  criticalSuccessFractionBonus = 0,
  recoveryMultiplier = 1,
  hoursModifier = 0,
  criticalFailureStrainModifier = 0
} = {}) {
  const baseMax = Math.max(0, Number(baseMaxLifeveil) || 0);
  const multiplier = Math.max(0, Number(recoveryMultiplier) || 0);
  const timeHours = Math.max(0, LIFEVEIL_RECOVERY.hours + Number(hoursModifier || 0));
  const successFraction = Math.max(0, LIFEVEIL_RECOVERY.successFractionOfBaseMax + Number(successFractionBonus || 0));
  const criticalFraction = Math.max(0, LIFEVEIL_RECOVERY.criticalSuccessFractionOfBaseMax + Number(criticalSuccessFractionBonus || 0));
  const critFailStrain = Math.max(0, LIFEVEIL_RECOVERY.criticalFailureStrain + Number(criticalFailureStrainModifier || 0));

  switch (degree) {
    case LIFEVEIL_RECOVERY_DEGREES.CRITICAL_SUCCESS:
      return Object.freeze({
        success: true,
        lifeveilRestored: Math.floor(baseMax * criticalFraction * multiplier),
        strainGained: 0,
        consumablesConsumed: LIFEVEIL_RECOVERY.defaultConsumableCost,
        timeHours
      });
    case LIFEVEIL_RECOVERY_DEGREES.SUCCESS:
      return Object.freeze({
        success: true,
        lifeveilRestored: Math.floor(baseMax * successFraction * multiplier),
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
