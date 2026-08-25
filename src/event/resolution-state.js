import { scoreRound } from "./event-schema.js";

export function initializeResolution(state) {
  if (!state || state.phase !== "locked") throw new Error("Resolution may only begin from a locked plan.");
  return {
    ...state,
    phase: "resolution",
    activeOrderIndex: 0,
    results: {},
    signatureUses: {},
    roundResult: null
  };
}

export function activeStationId(state) {
  if (!state || state.phase !== "resolution") return null;
  return state.order?.[state.activeOrderIndex ?? 0] ?? null;
}

export function recordStationResult(state, station, result) {
  if (!state || state.phase !== "resolution") throw new Error("Station results may only be recorded during resolution.");
  const active = activeStationId(state);
  if (station !== active) throw new Error(`It is ${active}'s turn to resolve.`);
  if (!result?.degreeKey) throw new Error("A station result requires degreeKey.");

  const results = {
    ...(state.results ?? {}),
    [station]: { ...result }
  };
  const nextIndex = (state.activeOrderIndex ?? 0) + 1;
  const complete = nextIndex >= state.order.length;
  const roundResult = complete
    ? scoreRound(state.order.map((id) => results[id]?.degreeKey))
    : null;

  return {
    ...state,
    results,
    activeOrderIndex: nextIndex,
    phase: complete ? "round-result" : "resolution",
    roundResult
  };
}

export function markSignatureUsed(state, station, signatureId) {
  if (!signatureId) throw new Error("Signature use requires a signature id.");
  if (state.signatureUses?.[station]) throw new Error(`${station} has already used its Signature Ability this encounter.`);
  return {
    ...state,
    signatureUses: {
      ...(state.signatureUses ?? {}),
      [station]: signatureId
    }
  };
}
