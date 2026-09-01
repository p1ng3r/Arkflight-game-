import { STATIONS, PLANNING_SECONDS } from "./event-schema.js";

function emptySelection() { return { actionId: null, skillId: null, riskTier: null, componentAbilityId: null }; }
function emptyAssignments() { return Object.fromEntries(STATIONS.map((station) => [station, { actorId: null }])); }
function emptyMasterySelections() { return Object.fromEntries(STATIONS.map((station) => [station, null])); }

export function createPlanningState({ eventId, roundId, roundIndex = 0, now = Date.now(), assignments = null, masterySelections = null, crewEdgeHand = [], shipActorId = null }) {
  return {
    version: 5,
    eventId, roundId, roundIndex,
    shipActorId: shipActorId || null,
    phase: "opening",
    createdAt: now,
    planningStartedAt: null,
    planningEndsAt: null,
    lockedAt: null,
    setupLocked: false,
    order: [...STATIONS],
    assignments: assignments ? structuredClone(assignments) : emptyAssignments(),
    masterySelections: masterySelections ? structuredClone(masterySelections) : emptyMasterySelections(),
    masteryUses: {},
    reopenedStations: {},
    crewEdgeHand: [...crewEdgeHand],
    selections: Object.fromEntries(STATIONS.map((station) => [station, emptySelection()]))
  };
}

export function eventSetupReady(state) {
  if (!state) return false;
  const actors = STATIONS.map((station) => state.assignments?.[station]?.actorId ?? null);
  if (actors.some((actorId) => !actorId)) return false;
  if (new Set(actors).size !== actors.length) return false;
  return STATIONS.every((station) => Boolean(state.masterySelections?.[station]));
}

export function startPlanning(state, now = Date.now()) {
  if (!state || !["opening", "round-opening"].includes(state.phase)) throw new Error("Planning may only start from an opening phase.");
  if (state.phase === "opening" && !eventSetupReady(state)) throw new Error("Assign a different PF2e officer to every station and ready one Mastery Technique for each station before Round 1 begins.");
  return { ...state, setupLocked: state.phase === "opening" ? true : Boolean(state.setupLocked), phase: "planning", planningStartedAt: now, planningEndsAt: now + (PLANNING_SECONDS * 1000), reopenedStations: {} };
}

export function planningSecondsRemaining(state, now = Date.now()) {
  if (!state?.planningEndsAt) return PLANNING_SECONDS;
  return Math.max(0, Math.ceil((state.planningEndsAt - now) / 1000));
}

export function assignActor(state, station, actorId) {
  assertStation(station);
  if (!state || state.phase !== "opening" || state.setupLocked) throw new Error("Station officers are locked for the Event once Round 1 begins.");
  if (actorId) {
    const duplicate = STATIONS.find((other) => other !== station && state.assignments?.[other]?.actorId === actorId);
    if (duplicate) throw new Error("That PF2e character is already assigned to another Arkflight station for this Event.");
  }
  return { ...state, assignments: { ...(state.assignments ?? emptyAssignments()), [station]: { actorId: actorId || null } } };
}

export function selectMastery(state, station, masteryId) {
  assertStation(station);
  if (!state || state.phase !== "opening" || state.setupLocked) throw new Error("Mastery is chosen during Event Setup before Round 1 begins.");
  return { ...state, masterySelections: { ...(state.masterySelections ?? emptyMasterySelections()), [station]: masteryId || null } };
}

export function selectAction(state, station, actionId) { assertStation(station); assertSelectionOpen(state, station); return updateSelection(state, station, { actionId, skillId: null, riskTier: null }); }
export function selectSkill(state, station, skillId) { assertStation(station); assertSelectionOpen(state, station); if (!state.selections[station]?.actionId) throw new Error("Choose an action before choosing a skill."); return updateSelection(state, station, { skillId, riskTier: null }); }
export function selectRiskTier(state, station, riskTier) { assertStation(station); assertSelectionOpen(state, station); if (!state.selections[station]?.skillId) throw new Error("Choose a skill before choosing a Risk Bid."); const normalized = riskTier === null || riskTier === 0 ? null : Number(riskTier); if (normalized !== null && ![2,5,8].includes(normalized)) throw new Error(`Unsupported Risk Bid tier: ${riskTier}`); return updateSelection(state, station, { riskTier: normalized }); }
export function selectComponentAbility(state, station, componentAbilityId) { assertStation(station); assertSelectionOpen(state, station); return updateSelection(state, station, { componentAbilityId: componentAbilityId || null }); }

export function moveOrder(state, station, direction) {
  assertPlanning(state); assertStation(station);
  const order = [...state.order]; const index = order.indexOf(station); const target = direction === "earlier" ? index - 1 : direction === "later" ? index + 1 : index;
  if (target < 0 || target >= order.length || target === index) return state;
  [order[index], order[target]] = [order[target], order[index]]; return { ...state, order };
}

export function planningReady(state) {
  if (!state || state.phase !== "planning" || !state.setupLocked) return false;
  return STATIONS.every((station) => Boolean(state.assignments?.[station]?.actorId && state.selections?.[station]?.actionId && state.selections?.[station]?.skillId));
}

export function lockPlanning(state, now = Date.now()) {
  assertPlanning(state);
  if (!planningReady(state)) throw new Error("Every station must have an action and PF2e skill before the plan can be locked.");
  return { ...state, phase: "locked", lockedAt: now };
}

export function restartEvent(state, { roundId, preserveAssignments = true, preserveCrewEdgeHand = true, preserveMastery = true, now = Date.now() } = {}) {
  if (!state?.eventId) throw new Error("No Arkflight Event is active.");
  return createPlanningState({ eventId: state.eventId, roundId: roundId ?? state.roundId, roundIndex: 0, now, assignments: preserveAssignments ? (state.assignments ?? emptyAssignments()) : null, masterySelections: preserveMastery ? (state.masterySelections ?? emptyMasterySelections()) : null, crewEdgeHand: preserveCrewEdgeHand ? (state.crewEdgeHand ?? []) : [], shipActorId: state.shipActorId ?? null });
}

function updateSelection(state, station, patch) { return { ...state, selections: { ...state.selections, [station]: { ...state.selections[station], ...patch } } }; }
function assertSelectionOpen(state, station) {
  if (state?.phase === "planning") return;
  if (["locked", "resolution"].includes(state?.phase) && state?.reopenedStations?.[station] && !state?.results?.[station]) return;
  throw new Error("Selections may only change during planning unless a Mastery Technique has reopened this station's plan.");
}
function assertPlanning(state) { if (!state || state.phase !== "planning") throw new Error("Selections may only change during planning."); }
function assertStation(station) { if (!STATIONS.includes(station)) throw new Error(`Unknown station: ${station}`); }
