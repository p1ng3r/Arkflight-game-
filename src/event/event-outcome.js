export const EVENT_RESULT_ORDER = Object.freeze(["criticalFailure", "failure", "success", "criticalSuccess"]);

export const EVENT_RESULT_BANDS = Object.freeze([
  Object.freeze({ id: "criticalSuccess", label: "Critical Success", minAverageRoundScore: 5 }),
  Object.freeze({ id: "success", label: "Success", minAverageRoundScore: 0 }),
  Object.freeze({ id: "failure", label: "Failure", minAverageRoundScore: -4 }),
  Object.freeze({ id: "criticalFailure", label: "Critical Failure", minAverageRoundScore: -10 })
]);

export function appendRoundHistory(state, { roundId, roundIndex, roundResult, momentumBefore, momentumAfter, pendingShipEffects = [], results = {} }) {
  if (!roundResult?.bandId || !Number.isFinite(Number(roundResult.score))) throw new Error("Round history requires a scored round result.");
  const history = [...(state?.eventHistory ?? [])];
  const entry = Object.freeze({
    roundId,
    roundIndex: Number(roundIndex ?? history.length),
    score: Number(roundResult.score),
    bandId: roundResult.bandId,
    momentumDelta: Number(roundResult.momentumDelta ?? 0),
    momentumBefore: Number(momentumBefore ?? 0),
    momentumAfter: Number(momentumAfter ?? 0),
    pendingShipEffects: (pendingShipEffects ?? []).map((effect) => ({ ...effect })),
    stationDegrees: Object.fromEntries(Object.entries(results ?? {}).map(([stationId, result]) => [stationId, result?.degreeKey ?? null]))
  });
  const priorIndex = history.findIndex((row) => row.roundId === roundId);
  if (priorIndex >= 0) history[priorIndex] = entry;
  else history.push(entry);
  return { ...state, eventHistory: history };
}

export function scoreEvent(history = []) {
  const rows = [...(history ?? [])].filter((row) => Number.isFinite(Number(row?.score)));
  if (!rows.length) throw new Error("Event Result requires at least one completed round.");
  const totalScore = rows.reduce((sum, row) => sum + Number(row.score), 0);
  const averageRoundScore = totalScore / rows.length;
  const band = EVENT_RESULT_BANDS.find((entry) => averageRoundScore >= entry.minAverageRoundScore) ?? EVENT_RESULT_BANDS.at(-1);
  return Object.freeze({
    id: band.id,
    label: band.label,
    totalScore,
    averageRoundScore,
    roundsScored: rows.length,
    originalId: band.id,
    shift: 0
  });
}

export function shiftEventResult(result, amount = 1, { failuresOnly = false } = {}) {
  if (!result?.id || !EVENT_RESULT_ORDER.includes(result.id)) throw new Error("Cannot shift an unknown Event Result.");
  if (failuresOnly && !["criticalFailure", "failure"].includes(result.id)) return result;
  const index = EVENT_RESULT_ORDER.indexOf(result.id);
  const shiftedIndex = Math.max(0, Math.min(EVENT_RESULT_ORDER.length - 1, index + Number(amount || 0)));
  const id = EVENT_RESULT_ORDER[shiftedIndex];
  const label = EVENT_RESULT_BANDS.find((entry) => entry.id === id)?.label ?? id;
  return Object.freeze({ ...result, id, label, shift: Number(result.shift ?? 0) + (shiftedIndex - index) });
}

export function tacticAwardCountForResult(resultId) {
  if (resultId === "criticalSuccess") return 2;
  if (resultId === "success") return 1;
  return 0;
}

export function endingBandCandidates(resultId) {
  if (resultId === "criticalSuccess") return ["criticalSuccess", "extraordinary", "strong-success"];
  if (resultId === "success") return ["success", "strong-success", "mixed-success"];
  if (resultId === "failure") return ["failure"];
  if (resultId === "criticalFailure") return ["criticalFailure", "disaster"];
  return [resultId];
}
