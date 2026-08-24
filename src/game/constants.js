export const STATIONS = Object.freeze([
  "captain",
  "engineer",
  "navigator",
  "watchmaster",
  "veilwarden"
]);

export const RISK_BID_TIERS = Object.freeze([0, 2, 5, 8]);
export const MOMENTUM_MIN = 0;
export const MOMENTUM_MAX = 3;

export const DEGREE = Object.freeze({
  CRITICAL_FAILURE: 0,
  FAILURE: 1,
  SUCCESS: 2,
  CRITICAL_SUCCESS: 3
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
