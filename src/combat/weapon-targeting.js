const MOUNT_OFFSET = Object.freeze({ fore: 0, starboard: 90, aft: 180, port: 270, deck: 0 });
const ARC_HALF_WIDTH = Object.freeze({ line: 30, broadside: 60, wide: 90, turret: 180 });

function normalizedDegrees(value) {
  return ((Number(value) || 0) % 360 + 360) % 360;
}

function angleDifference(a, b) {
  const difference = Math.abs(normalizedDegrees(a) - normalizedDegrees(b));
  return Math.min(difference, 360 - difference);
}

/** Bearing in Foundry's clockwise degrees: 0 north, 90 east. */
export function targetBearing(from, to) {
  const dx = Number(to?.x ?? 0) - Number(from?.x ?? 0);
  const dy = Number(to?.y ?? 0) - Number(from?.y ?? 0);
  return normalizedDegrees(Math.atan2(dx, -dy) * 180 / Math.PI);
}

export function weaponRangeBand(rangeHexes = {}, distanceHexes = 0) {
  const distance = Math.max(0, Number(distanceHexes) || 0);
  const min = Math.max(0, Number(rangeHexes.min) || 0);
  const optimalMin = Math.max(min, Number(rangeHexes.optimalMin) || min);
  const optimalMax = Math.max(optimalMin, Number(rangeHexes.optimalMax) || optimalMin);
  const max = Math.max(optimalMax, Number(rangeHexes.max) || optimalMax);
  if (distance < min) return Object.freeze({ key: "too-close", label: "Too Close", legal: false, distance, min, optimalMin, optimalMax, max });
  if (distance > max) return Object.freeze({ key: "out-of-range", label: "Out of Range", legal: false, distance, min, optimalMin, optimalMax, max });
  if (distance < optimalMin) return Object.freeze({ key: "close", label: "Close Band", legal: true, distance, min, optimalMin, optimalMax, max });
  if (distance <= optimalMax) return Object.freeze({ key: "optimal", label: "Optimal Band", legal: true, distance, min, optimalMin, optimalMax, max });
  return Object.freeze({ key: "long", label: "Long Band", legal: true, distance, min, optimalMin, optimalMax, max });
}

export function weaponArcCheck({ heading = 0, mount = "fore", arcTemplate = "wide", bearing = 0 } = {}) {
  const center = normalizedDegrees(Number(heading) + (MOUNT_OFFSET[mount] ?? 0));
  const halfWidth = ARC_HALF_WIDTH[arcTemplate] ?? ARC_HALF_WIDTH.wide;
  const difference = angleDifference(center, bearing);
  return Object.freeze({ legal: difference <= halfWidth, center, bearing: normalizedDegrees(bearing), difference, halfWidth, mount, arcTemplate });
}

export function weaponTargetingSolution({ weapon, weaponState, heading = 0, distanceHexes = 0, bearing = 0 } = {}) {
  const combat = weapon?.data?.combat ?? {};
  const range = weaponRangeBand(combat.rangeHexes, distanceHexes);
  const arc = weaponArcCheck({ heading, mount: weaponState?.mount ?? "fore", arcTemplate: combat.arcTemplate ?? "wide", bearing });
  return Object.freeze({ legal: range.legal && arc.legal, range, arc, distanceHexes: range.distance });
}
