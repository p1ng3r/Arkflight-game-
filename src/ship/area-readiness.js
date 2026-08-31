import { AREA_STATES, SHIP_AREA_KEYS, normalizeShip } from "./ship-schema.js";

export const AREA_STATE_ORDER = Object.freeze([
  AREA_STATES.STABLE,
  AREA_STATES.STRESSED,
  AREA_STATES.DAMAGED,
  AREA_STATES.CRITICAL,
  AREA_STATES.DISABLED
]);

export const AREA_INTEGRITY_FRACTIONS = Object.freeze({
  [AREA_STATES.STABLE]: 1,
  [AREA_STATES.STRESSED]: 0.90,
  [AREA_STATES.DAMAGED]: 0.65,
  [AREA_STATES.CRITICAL]: 0.25,
  [AREA_STATES.DISABLED]: 0
});

function assertArea(area) {
  if (!SHIP_AREA_KEYS.includes(area)) throw new Error(`Unknown Arkflight area: ${area}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function areaIntegrityFraction(state) {
  return AREA_INTEGRITY_FRACTIONS[state] ?? AREA_INTEGRITY_FRACTIONS[AREA_STATES.STABLE];
}

export function effectiveIntegrityMax(baseMax, state) {
  const base = Math.max(0, Number(baseMax) || 0);
  return Math.floor(base * areaIntegrityFraction(state));
}

export function degradeAreaOneStep(ship, area) {
  assertArea(area);
  const next = normalizeShip(structuredClone(ship));
  const current = next.areas?.[area]?.state ?? AREA_STATES.STABLE;
  const index = Math.max(0, AREA_STATE_ORDER.indexOf(current));
  const targetIndex = Math.min(index + 1, AREA_STATE_ORDER.length - 1);
  const target = AREA_STATE_ORDER[targetIndex];
  next.areas[area] = { ...(next.areas[area] ?? {}), state: target };
  return Object.freeze({ ship: next, previousState: current, state: target, degraded: target !== current });
}

/**
 * Apply the persistent Area integrity caps to numerical integrity resources.
 *
 * Hull and Lifeveil are capped by their corresponding Area states. Raising an
 * Area cap never restores Current; it only increases the ceiling available to
 * later repair/recovery. Morale is intentionally excluded because its compact
 * 0-5 resource-band mechanics are resolved separately in Part 5.
 */
export function applyAreaIntegrityCaps(ship, { hullBaseMax, lifeveilBaseMax } = {}) {
  const next = normalizeShip(structuredClone(ship));

  const hullBase = Math.max(0, Number(hullBaseMax ?? next.resources?.hull?.max ?? 0));
  const hullState = next.areas?.hull?.state ?? AREA_STATES.STABLE;
  const hullEffectiveMax = effectiveIntegrityMax(hullBase, hullState);
  next.resources.hull = {
    ...(next.resources.hull ?? {}),
    baseMax: hullBase,
    max: hullEffectiveMax,
    value: clamp(next.resources?.hull?.value ?? 0, 0, hullEffectiveMax)
  };

  const lifeveilBase = Math.max(0, Number(lifeveilBaseMax ?? next.resources?.lifeveil?.max ?? 0));
  const lifeveilState = next.areas?.lifeveil?.state ?? AREA_STATES.STABLE;
  const lifeveilEffectiveMax = effectiveIntegrityMax(lifeveilBase, lifeveilState);
  next.resources.lifeveil = {
    ...(next.resources.lifeveil ?? {}),
    baseMax: lifeveilBase,
    max: lifeveilEffectiveMax,
    value: clamp(next.resources?.lifeveil?.value ?? 0, 0, lifeveilEffectiveMax)
  };

  return next;
}

/**
 * Resolve one discrete Strain contribution.
 *
 * A single call may degrade at most one Area. If the resulting Strain reaches
 * the vessel's Strain Limit, exactly one full limit is subtracted and overflow
 * remains for a later discrete resolution. Direct resource depletion does not
 * route through this function and therefore does not automatically degrade an
 * Area.
 */
export function resolveStrainContribution(ship, {
  amount = 0,
  threatenedArea,
  strainLimit = ship?.resources?.strain?.max ?? 0
} = {}) {
  assertArea(threatenedArea);
  const next = normalizeShip(structuredClone(ship));
  const limit = Math.max(0, Number(strainLimit) || 0);
  const current = Math.max(0, Number(next.resources?.strain?.value ?? 0));
  const gained = Math.max(0, Number(amount) || 0);
  const total = current + gained;

  if (limit <= 0 || total < limit) {
    next.resources.strain = { ...(next.resources.strain ?? {}), value: total, max: limit };
    return Object.freeze({
      ship: next,
      thresholdCrossed: false,
      areaDegraded: false,
      threatenedArea,
      strainBefore: current,
      strainAdded: gained,
      strainAfter: total
    });
  }

  const degraded = degradeAreaOneStep(next, threatenedArea);
  const overflow = total - limit;
  degraded.ship.resources.strain = { ...(degraded.ship.resources.strain ?? {}), value: overflow, max: limit };

  return Object.freeze({
    ship: degraded.ship,
    thresholdCrossed: true,
    areaDegraded: degraded.degraded,
    threatenedArea,
    previousAreaState: degraded.previousState,
    areaState: degraded.state,
    strainBefore: current,
    strainAdded: gained,
    strainAfter: overflow
  });
}
