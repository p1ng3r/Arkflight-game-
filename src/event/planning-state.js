import { STATIONS, PLANNING_SECONDS } from "./event-schema.js";

function emptySelection() {
  return { actionId: null, skillId: null, riskTier: null, signatureId: null, componentAbilityId: null };
}

function emptyAssignments() {
  return Object.fromEntries(STATIONS.map((station) => [station, { actorId: null }]));
}

export function createPlanningState({ eventId, roundId, roundIndex = 0, now = Date.now(), assignments = null, crewEdgeHand = [] }) {
  return {
    version: 3,
    eventId,
    roundId,
    roundIndex,
    phase: "opening",
    createdAt: now,
    planningStartedAt: null,
    planningEndsAt: null,
    lockedAt: null,
    order: [...STATIONS],
    assignments: assignments ? structuredClone(assignments) : emptyAssignments(),
    crewEdgeHand: [...crewEdgeHand],
    selections: Object.fromEntries(STATIONS.map((station) => [station, emptySelection()]))
  };
}

export function startPlanning(state, now = Date.now()) {
  if (!state || !["opening", "round-opening"].includes(state.phase)) throw new Error("Planning may only start from an opening phase.");
  return { ...state, phase: "planning", planningStartedAt: now, planningEndsAt: now + (PLANNING_SECONDS * 1000) };
}

export function planningSecondsRemaining(state, now = Date.now()) {
  if (!state?.planningEndsAt) return PLANNING_SECONDS;
  return Math.max(0, Math.ceil((state.planningEndsAt - now) / 1000));
}

export function assignActor(state, station, actorId) {
  assertStation(station);
  if (!state || !["opening", "round-opening", "planning"].includes(state.phase)) throw new Error("Station actors may only be assigned before the plan is locked.");
  return { ...state, assignments: { ...(state.assignments ?? emptyAssignments()), [station]: { actorId: actorId || null } } };
}

export function selectAction(state, station, actionId) { assertPlanning(state); assertStation(station); return updateSelection(state, station, { actionId, skillId: null, riskTier: null }); }
export function selectSkill(state, station, skillId) { assertPlanning(state); assertStation(station); if (!state.selections[station]?.actionId) throw new Error("Choose an action before choosing a skill."); return updateSelection(state, station, { skillId, riskTier: null }); }
export function selectRiskTier(state, station, riskTier) { assertPlanning(state); assertStation(station); if (!state.selections[station]?.skillId) throw new Error("Choose a skill before choosing a Risk Bid."); const normalized = riskTier === null || riskTier === 0 ? null : Number(riskTier); if (normalized !== null && ![2,5,8].includes(normalized)) throw new Error(`Unsupported Risk Bid tier: ${riskTier}`); return updateSelection(state, station, { riskTier: normalized }); }
export function selectSignature(state, station, signatureId) { assertPlanning(state); assertStation(station); return updateSelection(state, station, { signatureId: signatureId || null }); }
export function selectComponentAbility(state, station, componentAbilityId) { assertPlanning(state); assertStation(station); return updateSelection(state, station, { componentAbilityId: componentAbilityId || null }); }

export function moveOrder(state, station, direction) {
  assertPlanning(state); assertStation(station);
  const order = [...state.order]; const index = order.indexOf(station); const target = direction === "earlier" ? index - 1 : direction === "later" ? index + 1 : index;
  if (target < 0 || target >= order.length || target === index) return state;
  [order[index], order[target]] = [order[target], order[index]]; return { ...state, order };
}

export function planningReady(state) {
  if (!state || state.phase !== "planning") return false;
  return STATIONS.every((station) => Boolean(state.assignments?.[station]?.actorId && state.selections?.[station]?.actionId && state.selections?.[station]?.skillId));
}

export function lockPlanning(state, now = Date.now()) {
  assertPlanning(state);
  if (!planningReady(state)) throw new Error("Every station must have an assigned PF2e character, action, and skill before the plan can be locked.");
  return { ...state, phase: "locked", lockedAt: now };
}

export function restartEvent(state, { roundId, preserveAssignments = true, preserveCrewEdgeHand = true, now = Date.now() } = {}) {
  if (!state?.eventId) throw new Error("No Arkflight Event is active.");
  return createPlanningState({
    eventId: state.eventId,
    roundId: roundId ?? state.roundId,
    roundIndex: 0,
    now,
    assignments: preserveAssignments ? (state.assignments ?? emptyAssignments()) : null,
    crewEdgeHand: preserveCrewEdgeHand ? (state.crewEdgeHand ?? []) : []
  });
}

function updateSelection(state, station, patch) { return { ...state, selections: { ...state.selections, [station]: { ...state.selections[station], ...patch } } }; }
function assertPlanning(state) { if (!state || state.phase !== "planning") throw new Error("Selections may only change during planning."); }
function assertStation(station) { if (!STATIONS.includes(station)) throw new Error(`Unknown station: ${station}`); }
