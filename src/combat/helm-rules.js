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
  const maneuverability = Math.max(1, nonnegativeInt(state.mobility.maneuverability));
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
    maneuverability: Math.max(1, nonnegativeInt(state?.mobility?.maneuverability)),
    movementRemaining: Math.max(0, nonnegativeInt(movement.allowance) - nonnegativeInt(movement.used)),
    maneuverRemaining: Math.max(0, nonnegativeInt(maneuver.allowance) - nonnegativeInt(maneuver.used)),
    movementUsed: nonnegativeInt(movement.used),
    maneuverUsed: nonnegativeInt(maneuver.used),
    movementPurchases: nonnegativeInt(movement.purchases),
    maneuverPurchases: nonnegativeInt(maneuver.purchases)
  });
}

export function canChangeFacingNow(state, round = 1) {
  const remaining = helmRemaining(state);
  if (remaining.movementUsed > 0 || remaining.maneuverPurchases > 0) return true;
  const baseline = remaining.maneuverability * (1 + remaining.maneuverPurchases);
  if (nonnegativeInt(state?.mobility?.maneuver?.allowance) > baseline) return true;
  const used = state?.stationRuntime?.used ?? {};
  const combatRound = Math.max(1, nonnegativeInt(round));
  if (Number(used["navigator-hard-turn"] ?? 0) === combatRound) return true;
  return (state?.stationRuntime?.effects ?? []).some((entry) => entry?.actionId === "navigator-hard-turn");
}
