export function normalizeHeading(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

export function snapHexHeading(value) {
  const normalized = normalizeHeading(value);
  return (Math.round(normalized / 60) * 60) % 360;
}

export function signedHeadingDelta(from, to) {
  const a = normalizeHeading(from);
  const b = normalizeHeading(to);
  let delta = ((b - a + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return delta;
}

/**
 * Resolve a Foundry rotation request to one of Arkflight's six legal headings.
 *
 * Foundry's slow Ctrl+wheel rotation can request only a few degrees. A normal
 * nearest-60° snap turns those requests back into the current heading, making
 * the wheel appear broken. Treat any small non-zero request (<=30°) as intent
 * to advance exactly one Arkflight facing step in that direction.
 *
 * Larger requests still use nearest-heading snapping, so direct rotation
 * changes and Foundry's fast rotation behave naturally.
 */
export function resolveHexFacingRequest(current, requested) {
  const currentHeading = snapHexHeading(current);
  const requestedHeading = normalizeHeading(requested);
  if (requestedHeading % 60 === 0) return requestedHeading;

  const delta = signedHeadingDelta(currentHeading, requestedHeading);
  if (delta !== 0 && Math.abs(delta) <= 30) {
    return normalizeHeading(currentHeading + Math.sign(delta) * 60);
  }
  return snapHexHeading(requestedHeading);
}
