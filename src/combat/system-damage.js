import { AREA_STATE_ORDER, applyAreaIntegrityCaps, degradeAreaOneStep } from "../ship/area-readiness.js";
import { AREA_STATES, SHIP_AREA_KEYS } from "../ship/ship-schema.js";

function areaIndex(ship, area) {
  const state = ship?.areas?.[area]?.state ?? AREA_STATES.STABLE;
  const index = AREA_STATE_ORDER.indexOf(state);
  return Math.max(0, index < 0 ? 0 : index);
}

export function weaponSystemThreat(weapon) {
  const raw = String(weapon?.data?.systemThreat ?? weapon?.systemThreat ?? "hull").toLowerCase();
  return SHIP_AREA_KEYS.includes(raw) ? raw : "hull";
}

export function systemDamageThreshold(ship) {
  const hullMax = Math.max(1, Number(ship?.resources?.hull?.baseMax ?? ship?.resources?.hull?.max) || 1);
  return Math.max(12, Math.ceil(hullMax * 0.15));
}

export function systemThreatTriggers(ship, { degree = 0, hullDamage = 0, threat = "hull" } = {}) {
  const damage = Math.max(0, Number(hullDamage) || 0);
  if (damage <= 0) return false;
  const thresholdHit = damage >= systemDamageThreshold(ship);
  // Hull is already directly depleted by every damaging hit. Requiring the
  // heavy-hit threshold prevents ordinary criticals from double-punishing Hull,
  // while specialized system threats can still score a critical system hit.
  if (String(threat).toLowerCase() === "hull") return thresholdHit;
  return Number(degree) >= 2 || thresholdHit;
}

export function areaMobilityPenalties(ship) {
  const rigging = areaIndex(ship, "rigging");
  const arkengine = areaIndex(ship, "arkengine");
  const speedPenalty = Math.max(0,
    (arkengine >= 1 ? 1 : 0) +
    (arkengine >= 3 ? 1 : 0) +
    (arkengine >= 4 ? 1 : 0) +
    (rigging >= 2 ? 1 : 0)
  );
  const maneuverPenalty = Math.max(0,
    (rigging >= 1 ? 1 : 0) +
    (rigging >= 3 ? 1 : 0)
  );
  return Object.freeze({ speedPenalty, maneuverPenalty });
}

export function applyWeaponSystemThreat(ship, { weapon = null, threat = null, degree = 0, hullDamage = 0 } = {}) {
  const threatenedArea = threat && SHIP_AREA_KEYS.includes(String(threat).toLowerCase())
    ? String(threat).toLowerCase()
    : weaponSystemThreat(weapon);
  if (!systemThreatTriggers(ship, { degree, hullDamage, threat: threatenedArea })) {
    return Object.freeze({
      ship,
      triggered: false,
      degraded: false,
      threatenedArea,
      threshold: systemDamageThreshold(ship),
      mobilityPenalties: areaMobilityPenalties(ship)
    });
  }

  const degraded = degradeAreaOneStep(ship, threatenedArea);
  const hullBaseMax = Number(degraded.ship?.resources?.hull?.baseMax ?? degraded.ship?.resources?.hull?.max) || 0;
  const lifeveilBaseMax = Number(degraded.ship?.resources?.lifeveil?.baseMax ?? degraded.ship?.resources?.lifeveil?.max) || 0;
  const capped = applyAreaIntegrityCaps(degraded.ship, { hullBaseMax, lifeveilBaseMax });
  return Object.freeze({
    ship: capped,
    triggered: true,
    degraded: degraded.degraded,
    threatenedArea,
    previousState: degraded.previousState,
    state: degraded.state,
    threshold: systemDamageThreshold(ship),
    mobilityPenalties: areaMobilityPenalties(capped)
  });
}
