import { commitFacing, purchaseManeuver } from "./combatant-state.js";

const DEGREES_PER_FACING_STEP = 60;

function nonnegativeInt(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function freezeTrack(track, allowance) {
  return Object.freeze({
    ...(track ?? {}),
    purchases: nonnegativeInt(track?.purchases),
    allowance: nonnegativeInt(allowance),
    used: nonnegativeInt(track?.used)
  });
}

export function applyFreeHelmAllowance(state) {
  if (!state?.mobility) return state;
  const speed = Math.max(1, nonnegativeInt(state.mobility.speed));
  const maneuverability = nonnegativeInt(state.mobility.maneuverability);
  const movement = state.mobility.movement ?? {};
  const maneuver = state.mobility.maneuver ?? {};
  const minimumMovement = speed * (1 + nonnegativeInt(movement.purchases));
  const minimumManeuver = maneuverability * (1 + nonnegativeInt(maneuver.purchases));
  const movementAllowance = Math.max(nonnegativeInt(movement.allowance), minimumMovement);
  const maneuverAllowance = Math.max(nonnegativeInt(maneuver.allowance), minimumManeuver);
  if (movementAllowance === nonnegativeInt(movement.allowance) && maneuverAllowance === nonnegativeInt(maneuver.allowance)) return state;
  return Object.freeze({
    ...state,
    mobility: Object.freeze({
      ...state.mobility,
      movement: freezeTrack(movement, movementAllowance),
      maneuver: freezeTrack(maneuver, maneuverAllowance)
    })
  });
}

export function facingAllowanceDegrees(state) {
  const normalized = applyFreeHelmAllowance(state);
  return nonnegativeInt(normalized?.mobility?.maneuver?.allowance) * DEGREES_PER_FACING_STEP;
}

export function helmRemaining(state) {
  const normalized = applyFreeHelmAllowance(state);
  const movement = normalized?.mobility?.movement ?? {};
  const facing = normalized?.mobility?.facing ?? {};
  const allowanceDegrees = facingAllowanceDegrees(normalized);
  const usedDegrees = nonnegativeInt(facing.usedDegrees);
  return Object.freeze({
    speed: Math.max(1, nonnegativeInt(normalized?.mobility?.speed)),
    maneuverability: nonnegativeInt(normalized?.mobility?.maneuverability),
    movementRemaining: Math.max(0, nonnegativeInt(movement.allowance) - nonnegativeInt(movement.used)),
    facingRemainingDegrees: Math.max(0, allowanceDegrees - usedDegrees),
    movementUsed: nonnegativeInt(movement.used),
    facingUsedDegrees: usedDegrees,
    movementPurchases: nonnegativeInt(movement.purchases),
    maneuverPurchases: nonnegativeInt(normalized?.mobility?.maneuver?.purchases)
  });
}

export function canChangeFacingNow(state, _round = 1) {
  return Boolean(state?.mobility);
}

export function facingReconciliation(state, { includePreview = false } = {}) {
  let normalized = applyFreeHelmAllowance(state);
  if (includePreview) normalized = commitFacing(normalized, normalized?.mobility?.heading ?? 0, "end-turn");

  const maneuver = normalized?.mobility?.maneuver ?? {};
  const facing = normalized?.mobility?.facing ?? {};
  const maneuverability = nonnegativeInt(normalized?.mobility?.maneuverability);
  const usedDegrees = nonnegativeInt(facing.usedDegrees);
  const freeDegrees = maneuverability * DEGREES_PER_FACING_STEP;
  const allowanceSteps = nonnegativeInt(maneuver.allowance);
  const allowanceDegrees = allowanceSteps * DEGREES_PER_FACING_STEP;
  const purchases = nonnegativeInt(maneuver.purchases);
  const purchasedDegrees = maneuverability * purchases * DEGREES_PER_FACING_STEP;
  const bonusDegrees = Math.max(0, allowanceDegrees - freeDegrees - purchasedDegrees);
  const uncoveredDegrees = Math.max(0, usedDegrees - allowanceDegrees);
  const blockDegrees = maneuverability * DEGREES_PER_FACING_STEP;
  const impossible = uncoveredDegrees > 0 && blockDegrees <= 0;
  const apRequired = impossible ? null : (uncoveredDegrees > 0 ? Math.ceil(uncoveredDegrees / blockDegrees) : 0);
  const apRemaining = nonnegativeInt(normalized?.economy?.ap?.value);

  return Object.freeze({
    state: normalized,
    usedDegrees,
    freeDegrees,
    allowanceDegrees,
    purchases,
    purchasedDegrees,
    bonusDegrees,
    uncoveredDegrees,
    blockDegrees,
    apRequired,
    apRemaining,
    impossible,
    affordable: !impossible && Number(apRequired ?? 0) <= apRemaining,
    committedHeading: Number(normalized?.mobility?.committedHeading ?? normalized?.mobility?.heading ?? 0),
    previewHeading: Number(normalized?.mobility?.heading ?? 0)
  });
}

export function settleFacingCost(state, { includePreview = true } = {}) {
  const before = facingReconciliation(state, { includePreview });
  if (before.impossible) {
    throw new Error("This ship has Maneuverability 0 and cannot pay for additional committed facing.");
  }
  if (!before.affordable) {
    throw new Error(`Facing requires ${before.apRequired} AP, but only ${before.apRemaining} AP remain.`);
  }

  let next = before.state;
  for (let index = 0; index < before.apRequired; index += 1) next = purchaseManeuver(next);
  const after = facingReconciliation(next);
  return Object.freeze({
    state: next,
    apSpent: before.apRequired,
    before,
    after
  });
}

export { DEGREES_PER_FACING_STEP };
