import { purchaseManeuver } from "./combatant-state.js";

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

export function helmRemaining(state) {
  const movement = state?.mobility?.movement ?? {};
  const maneuver = state?.mobility?.maneuver ?? {};
  return Object.freeze({
    speed: Math.max(1, nonnegativeInt(state?.mobility?.speed)),
    maneuverability: nonnegativeInt(state?.mobility?.maneuverability),
    movementRemaining: Math.max(0, nonnegativeInt(movement.allowance) - nonnegativeInt(movement.used)),
    maneuverRemaining: Math.max(0, nonnegativeInt(maneuver.allowance) - nonnegativeInt(maneuver.used)),
    movementUsed: nonnegativeInt(movement.used),
    maneuverUsed: nonnegativeInt(maneuver.used),
    movementPurchases: nonnegativeInt(movement.purchases),
    maneuverPurchases: nonnegativeInt(maneuver.purchases)
  });
}

export function canChangeFacingNow(state, _round = 1) {
  const normalized = applyFreeHelmAllowance(state);
  const remaining = helmRemaining(normalized);
  if (remaining.maneuverability > 0) return true;
  return nonnegativeInt(normalized?.mobility?.maneuver?.allowance) > nonnegativeInt(normalized?.mobility?.maneuver?.used);
}

export function facingReconciliation(state) {
  const normalized = applyFreeHelmAllowance(state);
  const maneuver = normalized?.mobility?.maneuver ?? {};
  const maneuverability = nonnegativeInt(normalized?.mobility?.maneuverability);
  const used = nonnegativeInt(maneuver.used);
  const allowance = nonnegativeInt(maneuver.allowance);
  const purchases = nonnegativeInt(maneuver.purchases);
  const free = maneuverability;
  const purchasedAllowance = maneuverability * purchases;
  const bonusAllowance = Math.max(0, allowance - free - purchasedAllowance);
  const uncovered = Math.max(0, used - allowance);
  const impossible = uncovered > 0 && maneuverability <= 0;
  const apRequired = impossible ? null : (uncovered > 0 ? Math.ceil(uncovered / maneuverability) : 0);
  const apRemaining = nonnegativeInt(normalized?.economy?.ap?.value);

  return Object.freeze({
    state: normalized,
    used,
    free,
    allowance,
    purchases,
    purchasedAllowance,
    bonusAllowance,
    uncovered,
    apRequired,
    apRemaining,
    impossible,
    affordable: !impossible && Number(apRequired ?? 0) <= apRemaining
  });
}

export function settleFacingCost(state) {
  const before = facingReconciliation(state);
  if (before.impossible) {
    throw new Error("This ship has Maneuverability 0 and cannot pay for additional normal facing changes.");
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
