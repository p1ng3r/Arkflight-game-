import { normalizeShipHeading, SHIP_HEADING_INCREMENT } from "./combat-schema.js";

export function normalizeHeading(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

export function snapShipHeading(value) {
  return normalizeShipHeading(value);
}

export function signedHeadingDelta(from, to) {
  const a = normalizeHeading(from);
  const b = normalizeHeading(to);
  let delta = ((b - a + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return delta;
}

/**
 * Convert Foundry token rotation intent into Arkflight's 30° visual headings.
 * Ctrl/Shift wheel commonly requests only 5° or 15°. Any small non-zero request
 * is treated as one deliberate 30° preview step; direct larger rotations snap to
 * the nearest 30° heading.
 */
export function resolveShipFacingRequest(current, requested) {
  const currentHeading = snapShipHeading(current);
  const requestedHeading = normalizeHeading(requested);
  if (requestedHeading % SHIP_HEADING_INCREMENT === 0) return requestedHeading;

  const delta = signedHeadingDelta(currentHeading, requestedHeading);
  if (delta !== 0 && Math.abs(delta) <= SHIP_HEADING_INCREMENT / 2) {
    return normalizeHeading(currentHeading + Math.sign(delta) * SHIP_HEADING_INCREMENT);
  }
  return snapShipHeading(requestedHeading);
}

// Compatibility aliases for older callers and stored macro references.
export const snapHexHeading = snapShipHeading;
export const resolveHexFacingRequest = resolveShipFacingRequest;
