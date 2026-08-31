export const ENGINEERING_OUTCOMES = Object.freeze({
  CRITICAL_SUCCESS: "criticalSuccess",
  SUCCESS: "success",
  FAILURE: "failure",
  CRITICAL_FAILURE: "criticalFailure"
});

export function resolveEngineeringInstallOutcome(outcome, baseHours) {
  const hours = Math.max(0, Number(baseHours ?? 0));
  if (outcome === ENGINEERING_OUTCOMES.CRITICAL_SUCCESS) {
    return Object.freeze({ outcome, install: true, complication: false, timeHours: Math.max(1, Math.ceil(hours / 2)), timeMultiplier: 0.5 });
  }
  if (outcome === ENGINEERING_OUTCOMES.SUCCESS) {
    return Object.freeze({ outcome, install: true, complication: false, timeHours: hours, timeMultiplier: 1 });
  }
  if (outcome === ENGINEERING_OUTCOMES.CRITICAL_FAILURE) {
    return Object.freeze({ outcome, install: false, complication: true, timeHours: 0, timeMultiplier: 0 });
  }
  return Object.freeze({ outcome: ENGINEERING_OUTCOMES.FAILURE, install: false, complication: false, timeHours: 0, timeMultiplier: 0 });
}
