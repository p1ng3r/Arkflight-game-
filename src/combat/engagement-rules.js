import { basicShipSaveMultiplier, shipManeuverDC } from "./ship-defense.js";

function nonnegative(value) { return Math.max(0, Number(value) || 0); }
function positiveInt(value, fallback = 1) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function normalizeEngagementState(value = {}) {
  return Object.freeze({
    mooredTo: typeof value.mooredTo === "string" && value.mooredTo ? value.mooredTo : null,
    boardingActive: Boolean(value.boardingActive),
    boardingInitiator: typeof value.boardingInitiator === "string" && value.boardingInitiator ? value.boardingInitiator : null,
    boardingOpportunity: Boolean(value.boardingOpportunity)
  });
}

export function isMooredWith(state, combatantId) {
  return normalizeEngagementState(state).mooredTo === String(combatantId ?? "");
}

export function moorEngagement(state, targetId, { boardingOpportunity = false } = {}) {
  const current = normalizeEngagementState(state);
  return normalizeEngagementState({
    ...current,
    mooredTo: String(targetId ?? ""),
    boardingActive: false,
    boardingInitiator: null,
    boardingOpportunity: Boolean(boardingOpportunity)
  });
}

export function clearEngagement(state) {
  return normalizeEngagementState({});
}

export function beginBoardingEngagement(state, targetId, initiatorId) {
  const current = normalizeEngagementState(state);
  if (current.mooredTo !== String(targetId ?? "")) throw new Error("Boarding requires a Moored target.");
  return normalizeEngagementState({
    ...current,
    boardingActive: true,
    boardingInitiator: String(initiatorId ?? "") || null
  });
}

/**
 * Center-to-center distance still needs to account for large token footprints.
 * This returns the maximum center distance (in grid hexes) that counts as
 * edge-adjacent for two rectangular token footprints.
 */
export function adjacencyDistanceLimit({
  sourceWidth = 1,
  sourceHeight = 1,
  targetWidth = 1,
  targetHeight = 1
} = {}) {
  const sourceRadius = Math.max(0, (Math.max(positiveInt(sourceWidth), positiveInt(sourceHeight)) - 1) / 2);
  const targetRadius = Math.max(0, (Math.max(positiveInt(targetWidth), positiveInt(targetHeight)) - 1) / 2);
  return 1 + sourceRadius + targetRadius;
}

export function isAdjacentShip({ distanceHexes = 0, sourceWidth = 1, sourceHeight = 1, targetWidth = 1, targetHeight = 1 } = {}) {
  return nonnegative(distanceHexes) <= adjacencyDistanceLimit({ sourceWidth, sourceHeight, targetWidth, targetHeight }) + 0.1;
}

export function grappleOutcome(degree) {
  const value = Math.max(-1, Math.min(2, Math.trunc(Number(degree) || 0)));
  if (value >= 2) return Object.freeze({ moored: false, boardingOpportunity: false, label: "Critical Success — target evades the lines." });
  if (value === 1) return Object.freeze({ moored: false, boardingOpportunity: false, label: "Success — the lines fail to hold." });
  if (value === 0) return Object.freeze({ moored: true, boardingOpportunity: false, label: "Failure — target is Moored." });
  return Object.freeze({ moored: true, boardingOpportunity: true, label: "Critical Failure — target is Moored and exposes an immediate boarding opportunity." });
}

export function breakGrappleOutcome(degree) {
  const value = Math.max(-1, Math.min(2, Math.trunc(Number(degree) || 0)));
  return Object.freeze({
    escaped: value >= 1,
    label: value >= 2
      ? "Critical Success — break free cleanly."
      : value === 1
        ? "Success — break free."
        : value === 0
          ? "Failure — the grapple holds."
          : "Critical Failure — the grapple holds fast."
  });
}

export function ramImpactProfile({ hullTier = 1, movementUsed = 0, ramship = false } = {}) {
  const tier = Math.max(1, Math.min(5, positiveInt(hullTier, 1)));
  const momentumDice = Math.min(3, Math.floor(nonnegative(movementUsed) / 2));
  const ramDice = ramship ? 1 : 0;
  const dice = tier + momentumDice + ramDice;
  return Object.freeze({
    hullTier: tier,
    movementUsed: nonnegative(movementUsed),
    dice,
    formula: `${dice}d10`,
    ramship: Boolean(ramship),
    recoilFactor: ramship ? 0.25 : 0.5
  });
}

export function ramDamageAmounts({
  rolled = 0,
  targetSaveDegree = 0,
  targetHardness = 0,
  attackerHardness = 0,
  recoilFactor = 0.5
} = {}) {
  const raw = Math.max(0, Math.trunc(Number(rolled) || 0));
  const multiplier = basicShipSaveMultiplier(targetSaveDegree);
  const contactMultiplier = Math.min(1, multiplier);
  const targetIncoming = Math.floor(raw * multiplier);
  const recoilIncoming = Math.floor(raw * contactMultiplier * Math.max(0, Number(recoilFactor) || 0));
  return Object.freeze({
    rolled: raw,
    multiplier,
    targetIncoming,
    targetHullDamage: Math.max(0, targetIncoming - Math.max(0, Number(targetHardness) || 0)),
    recoilIncoming,
    attackerHullDamage: Math.max(0, recoilIncoming - Math.max(0, Number(attackerHardness) || 0))
  });
}

export function shipGrappleDC({ ship = null, derived = null, circumstance = 0 } = {}) {
  return shipManeuverDC({ ship, derived }) + Math.trunc(Number(circumstance) || 0);
}
