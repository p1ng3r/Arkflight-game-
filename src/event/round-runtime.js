import { clampMomentum } from "./event-schema.js";

function cloneEncounter(encounter) {
  return {
    momentum: Number(encounter?.momentum ?? 0),
    pressure: { ...(encounter?.pressure ?? {}) },
    hazards: [...(encounter?.hazards ?? [])],
    checkBonuses: { ...(encounter?.checkBonuses ?? {}) },
    dcAdjustments: { ...(encounter?.dcAdjustments ?? {}) },
    degreeLifts: { ...(encounter?.degreeLifts ?? {}) },
    notes: [...(encounter?.notes ?? [])]
  };
}

function addPressure(encounter, system, value) { encounter.pressure[system] = Math.max(0, Number(encounter.pressure[system] ?? 0) + Number(value ?? 0)); }
function addHazard(encounter, hazardId) { if (hazardId && !encounter.hazards.includes(hazardId)) encounter.hazards.push(hazardId); }
function targetStation(state, riskBid) {
  const authored = riskBid?.parameters?.targetStationId;
  if (authored && state.order.includes(authored) && !state.results?.[authored]) return authored;
  return state.order.filter((id) => !state.results?.[id])[0] ?? null;
}

export function encounterFromEvent(event) { return cloneEncounter(event?.startingState ?? {}); }
export function checkAdjustments(state, stationId) { const encounter = cloneEncounter(state?.encounter); return { bonus: Number(encounter.checkBonuses?.[stationId] ?? 0), dc: Number(encounter.dcAdjustments?.[stationId] ?? 0), degreeLift: Number(encounter.degreeLifts?.[stationId] ?? 0) }; }
export function consumeCheckAdjustments(state, stationId) { const encounter = cloneEncounter(state?.encounter); delete encounter.checkBonuses[stationId]; delete encounter.dcAdjustments[stationId]; delete encounter.degreeLifts[stationId]; return { ...state, encounter }; }

export function applyEarnedRiskBenefit(state, chosen, degreeKey) {
  if (!chosen?.riskBid || !chosen?.riskBenefit || !(degreeKey === "success" || degreeKey === "criticalSuccess")) return state;
  const critical = degreeKey === "criticalSuccess";
  const id = chosen.riskBenefit.id;
  const encounter = cloneEncounter(state.encounter);
  const target = targetStation(state, chosen.riskBid);
  const unresolved = state.order.filter((stationId) => !state.results?.[stationId]);
  const bonusTarget = (value) => { if (target) encounter.checkBonuses[target] = Number(encounter.checkBonuses[target] ?? 0) + value; };
  const dcTarget = (value) => { if (target) encounter.dcAdjustments[target] = Number(encounter.dcAdjustments[target] ?? 0) + value; };

  switch (id) {
    case "aid-next-1": bonusTarget(critical ? 2 : 1); break;
    case "dc-next-1": dcTarget(critical ? -2 : -1); break;
    case "crew-surge": for (const stationId of unresolved) encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + (critical ? 2 : 1); break;
    case "order-followup":
      if (target) {
        const activeIndex = Number(state.activeOrderIndex ?? 0); const currentTargetIndex = state.order.indexOf(target);
        if (currentTargetIndex > activeIndex) { const order = [...state.order]; order.splice(currentTargetIndex, 1); order.splice(activeIndex, 0, target); state = { ...state, order }; }
        encounter.checkBonuses[target] = Number(encounter.checkBonuses[target] ?? 0) + (critical ? 3 : 2);
        if (critical) encounter.dcAdjustments[target] = Number(encounter.dcAdjustments[target] ?? 0) - 1;
      }
      break;
    case "arkengine-vent": addPressure(encounter, "arkengine", critical ? -2 : -1); break;
    case "lifeveil-steady": addPressure(encounter, "lifeveil", critical ? -2 : -1); break;
    case "arkengine-overdrive": bonusTarget(critical ? 3 : 2); break;
    case "arkengine-master": addPressure(encounter, "arkengine", -2); if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1); break;
    case "degree-lift": if (target) encounter.degreeLifts[target] = Math.max(Number(encounter.degreeLifts[target] ?? 0), 1); break;
    case "order-swap":
      if (target) { const activeIndex = Number(state.activeOrderIndex ?? 0); const currentTargetIndex = state.order.indexOf(target); if (currentTargetIndex > activeIndex) { const order = [...state.order]; order.splice(currentTargetIndex, 1); order.splice(activeIndex, 0, target); state = { ...state, order }; } }
      break;
    case "hazard-remove-1": { const hazardId = chosen.riskBid.parameters?.hazardId ?? encounter.hazards[0]; if (hazardId) encounter.hazards = encounter.hazards.filter((id) => id !== hazardId); if (critical) encounter.momentum = clampMomentum(encounter.momentum + 1); break; }
    case "hazard-reveal-1": encounter.notes.push(critical ? "A hidden danger was revealed with an exploitable opening." : "A hidden danger was revealed before it struck."); break;
    default: encounter.notes.push(`${chosen.riskBenefit.name} was earned; its authored payoff remains available for GM adjudication.`); break;
  }
  return { ...state, encounter };
}

function applyOutcomeEffects(encounter, effects = []) {
  for (const effect of effects) {
    if (!effect) continue;
    if (effect.kind === "pressure") addPressure(encounter, effect.system, effect.value);
    if (effect.kind === "hazard") addHazard(encounter, effect.hazardId);
    if (effect.kind === "reduce-highest-pressure") {
      const systems = effect.systems ?? Object.keys(encounter.pressure);
      const system = [...systems].sort((a, b) => Number(encounter.pressure[b] ?? 0) - Number(encounter.pressure[a] ?? 0))[0];
      if (system) addPressure(encounter, system, -Math.abs(Number(effect.value ?? 1)));
    }
  }
}

function stationPhrase(result) {
  const name = result.actionName;
  if (result.degreeKey === "criticalSuccess") return `${name} lands with startling precision`;
  if (result.degreeKey === "success") return `${name} holds`;
  if (result.degreeKey === "criticalFailure") return `${name} breaks badly under the strain`;
  return `${name} slips at the worst moment`;
}

export function cinematicRoundNarrative({ round, bandId, results, consequenceNarrative }) {
  const rows = Object.values(results ?? {});
  const strong = rows.find((r) => r.degreeKey === "criticalSuccess") ?? rows.find((r) => r.degreeKey === "success");
  const weak = rows.find((r) => r.degreeKey === "criticalFailure") ?? rows.find((r) => r.degreeKey === "failure");
  const opening = { extraordinary: `For a few fierce breaths, the crew owns ${round.title.toLowerCase()}.`, "strong-success": `The ship drives through ${round.title.toLowerCase()} with the crew moving as one.`, "mixed-success": `The ship claws its way through ${round.title.toLowerCase()}, but the passage is anything but clean.`, failure: `The crossing through ${round.title.toLowerCase()} begins to come apart around the crew.`, disaster: `Everything in ${round.title.toLowerCase()} turns violent at once.` }[bandId] ?? `The crew fights through ${round.title.toLowerCase()}.`;
  const middle = strong && weak ? `${stationPhrase(strong)}, buying precious room even as ${stationPhrase(weak)}.` : strong ? `${stationPhrase(strong)}, giving the ship the opening it needs.` : weak ? `${stationPhrase(weak)}, and the rest of the crew is forced to compensate.` : `Every station strains against the same narrowing window.`;
  const risk = rows.find((r) => r.riskEarned);
  const riskSentence = risk ? `${risk.riskBenefitName} turns that gamble into a real advantage as the crew presses on.` : `No heroic gamble changes the shape of the crossing before the moment closes.`;
  return `${opening} ${middle} ${riskSentence} ${consequenceNarrative}`;
}

export function finalizeRound(event, state) {
  if (state?.phase !== "round-result" || !state.roundResult) return state;
  if (state.consequenceApplied) return state;
  const round = event?.rounds?.[state.roundIndex ?? 0];
  const outcome = round?.outcomes?.[state.roundResult.bandId];
  if (!outcome) throw new Error(`Missing authored round outcome for ${state.roundResult.bandId}.`);
  const encounter = cloneEncounter(state.encounter);
  encounter.momentum = clampMomentum(encounter.momentum + Number(state.roundResult.momentumDelta ?? 0));
  applyOutcomeEffects(encounter, outcome.effects ?? []);
  const roundNarrative = cinematicRoundNarrative({ round, bandId: state.roundResult.bandId, results: state.results, consequenceNarrative: outcome.narrative });
  return { ...state, encounter, roundNarrative, consequenceNarrative: outcome.narrative, consequenceApplied: true };
}

export function advanceToNextRound(event, state) {
  if (state?.phase !== "round-result" || !state.consequenceApplied) throw new Error("Finish the current round before advancing.");
  const nextIndex = Number(state.roundIndex ?? 0) + 1;
  const nextRound = event?.rounds?.[nextIndex];
  if (!nextRound) return { ...state, phase: "event-complete" };
  return {
    ...state,
    roundIndex: nextIndex,
    roundId: nextRound.id,
    phase: "round-opening",
    planningStartedAt: null,
    planningEndsAt: null,
    lockedAt: null,
    activeOrderIndex: null,
    results: {},
    roundResult: null,
    roundNarrative: null,
    consequenceNarrative: null,
    consequenceApplied: false,
    selections: Object.fromEntries(Object.entries(state.selections).map(([stationId, selection]) => [stationId, { ...selection, actionId: null, skillId: null, riskTier: null, componentAbilityId: null }]))
  };
}
