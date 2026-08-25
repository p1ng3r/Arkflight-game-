import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_MASTERY, getMasteryTechnique } from "../content/base-mastery.js";
import {
  createPlanningState,
  startPlanning,
  assignActor,
  selectMastery,
  selectAction,
  selectSkill,
  selectRiskTier,
  selectComponentAbility,
  moveOrder,
  lockPlanning,
  restartEvent
} from "./planning-state.js";
import { initializeResolution, activeStationId } from "./resolution-state.js";
import { resolveActiveStation, rollSelectedStation, applyStationRollResult } from "./resolution-engine.js";
import { advanceToNextRound, encounterFromEvent, finalizeRound } from "./round-runtime.js";
import { applyMasteryTechnique, applyMasteryConsequenceRedirects } from "./mastery-engine.js";
import { applyCrewTactic } from "./tactics-engine.js";

const MODULE_ID = "arkflight-game";
const SETTING_KEY = "activeEventPlanning";
const SOCKET = `module.${MODULE_ID}`;

function ownerLevel() { return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3; }
function userOwnsActor(actor, user) { return Boolean(actor?.testUserPermission?.(user, ownerLevel())); }
function defaultMasterySelections() {
  return Object.fromEntries(Object.entries(BASE_MASTERY).map(([stationId, rows]) => [stationId, rows?.[0]?.id ?? null]));
}
function masteryIsReady(state, stationId, masteryId) {
  return state?.masterySelections?.[stationId] === masteryId && !state?.masteryUses?.[stationId];
}
function initializeEncounter(event, state) {
  return { ...state, encounter: encounterFromEvent(event), masteryUses: {}, pendingMasteryWindows: [] };
}
function finalMasteryWindows(event, state) {
  if (state?.phase !== "round-result" || !state.roundResult) return [];
  const windows = [];
  const lastId = state.lastResolvedStationId;
  const last = lastId ? state.results?.[lastId] : null;
  if (masteryIsReady(state, "captain", "captain-not-like-this") && ["failure", "criticalFailure"].includes(last?.degreeKey)) {
    windows.push({ id: `captain-not-like-this:${state.roundIndex}:${lastId}`, stationId: "captain", masteryId: "captain-not-like-this", sourceStationId: lastId });
  }
  const round = event?.rounds?.[state.roundIndex ?? 0];
  const outcome = round?.outcomes?.[state.roundResult.bandId];
  const pressureSystems = (outcome?.effects ?? []).filter((effect) => effect?.kind === "pressure" && Number(effect.value ?? 0) > 0).map((effect) => effect.system);
  const hazardIncoming = (outcome?.effects ?? []).some((effect) => effect?.kind === "hazard");
  if (pressureSystems.length && masteryIsReady(state, "engineer", "engineer-crosswire-the-systems")) {
    windows.push({ id: `engineer-crosswire:${state.roundIndex}`, stationId: "engineer", masteryId: "engineer-crosswire-the-systems", pressureSystems: [...new Set(pressureSystems)] });
  }
  const veilSystems = pressureSystems.filter((system) => ["hull", "arkengine", "rigging"].includes(system));
  if (veilSystems.length && masteryIsReady(state, "veilwarden", "veilwarden-stand-between")) {
    windows.push({ id: `veilwarden-stand-between:${state.roundIndex}`, stationId: "veilwarden", masteryId: "veilwarden-stand-between", pressureSystems: [...new Set(veilSystems)] });
  }
  if (hazardIncoming && masteryIsReady(state, "veilwarden", "veilwarden-seal-the-impossible")) {
    windows.push({ id: `veilwarden-seal:${state.roundIndex}`, stationId: "veilwarden", masteryId: "veilwarden-seal-the-impossible" });
  }
  return windows;
}
function finalizeWithMastery(event, state) {
  const finalized = finalizeRound(event, { ...state, pendingMasteryWindows: [] });
  return applyMasteryConsequenceRedirects(event, state, finalized);
}
function prepareAfterStationResult(event, state) {
  if (state?.phase !== "round-result") return state;
  const windows = finalMasteryWindows(event, state);
  if (windows.length) return { ...state, pendingMasteryWindows: windows };
  return finalizeWithMastery(event, state);
}
function clearMasteryWindow(state, stationId, windowId = null) {
  const rows = [...(state?.pendingMasteryWindows ?? [])];
  return { ...state, pendingMasteryWindows: rows.filter((row) => windowId ? row.id !== windowId : row.stationId !== stationId) };
}
function repairLoadedState(state) {
  if (!state?.eventId) return state;
  const event = ARKFLIGHT_EVENTS[state.eventId];
  if (!event) return state;
  let repaired = state;
  if (!Array.isArray(repaired.crewEdgeHand)) repaired = { ...repaired, crewEdgeHand: [] };
  if (!repaired.masterySelections) {
    const legacy = repaired.selections ?? {};
    const defaults = defaultMasterySelections();
    repaired = { ...repaired, masterySelections: Object.fromEntries(Object.keys(defaults).map((stationId) => [stationId, legacy?.[stationId]?.signatureId && getMasteryTechnique(stationId, legacy[stationId].signatureId) ? legacy[stationId].signatureId : defaults[stationId]])) };
  }
  if (!repaired.masteryUses) repaired = { ...repaired, masteryUses: repaired.signatureUses ?? {} };
  if (!Array.isArray(repaired.pendingMasteryWindows)) repaired = { ...repaired, pendingMasteryWindows: [] };
  if (typeof repaired.setupLocked !== "boolean") repaired = { ...repaired, setupLocked: repaired.phase !== "opening" };
  if (!repaired.encounter) repaired = { ...repaired, encounter: encounterFromEvent(event) };
  if (repaired.phase === "round-result" && repaired.roundResult && !repaired.consequenceApplied && !repaired.pendingMasteryWindows.length) repaired = finalizeWithMastery(event, repaired);
  return repaired;
}

export class PlanningController {
  constructor({ onStateChange = null } = {}) {
    this.onStateChange = onStateChange;
    this.state = repairLoadedState(game.settings.get(MODULE_ID, SETTING_KEY) || null);
  }

  static registerSetting() {
    game.settings.register(MODULE_ID, SETTING_KEY, { name: "Active Arkflight Event Planning", scope: "world", config: false, type: Object, default: null });
  }

  activateSockets() {
    game.socket.on(SOCKET, async (payload) => {
      if (!payload || payload.sourceUserId === game.user.id) return;
      if (payload.type === "snapshot") { this.#acceptSnapshot(payload.state); return; }
      if (payload.type === "command" && game.user.isGM) {
        try { await this.#applyCommand(payload.command, payload.sourceUserId); }
        catch (error) {
          console.error("Arkflight | Planning command rejected", error);
          game.socket.emit(SOCKET, { type: "error", targetUserId: payload.sourceUserId, message: error.message, sourceUserId: game.user.id });
        }
        return;
      }
      if (payload.type === "error" && payload.targetUserId === game.user.id) ui.notifications?.warn(payload.message);
    });
  }

  async openEvent(eventId = "glassback-cinderwake") {
    this.#requireGM();
    const event = ARKFLIGHT_EVENTS[eventId];
    if (!event) throw new Error(`Unknown Arkflight Event: ${eventId}`);
    const round = event.rounds[0];
    let next = createPlanningState({ eventId: event.id, roundId: round.id, roundIndex: 0, crewEdgeHand: this.state?.crewEdgeHand ?? [] });
    next = initializeEncounter(event, next);
    return this.#persistAndBroadcast(next);
  }

  async restartCurrentEvent() {
    this.#requireGM();
    const event = this.getEvent();
    if (!event) throw new Error("No Arkflight Event is active.");
    let next = restartEvent(this.state, { roundId: event.rounds[0]?.id, preserveAssignments: false, preserveCrewEdgeHand: true, preserveMastery: false });
    next = initializeEncounter(event, next);
    return this.#persistAndBroadcast(next);
  }

  async command(command) {
    if (!command?.type) throw new Error("Planning command requires a type.");
    if (game.user.isGM) return this.#applyCommand(command, game.user.id);
    game.socket.emit(SOCKET, { type: "command", command, sourceUserId: game.user.id });
    return null;
  }

  async beginPlanning() { return this.command({ type: "begin-planning" }); }
  async lockPlan() { this.#requireGM(); return this.command({ type: "lock-plan" }); }
  async beginResolution() { this.#requireGM(); return this.command({ type: "begin-resolution" }); }
  async continueToNextRound() { this.#requireGM(); return this.command({ type: "next-round" }); }

  async resolveCurrentStation(actorId = null) {
    if (!this.state || this.state.phase !== "resolution") throw new Error("No station is waiting to resolve.");
    const stationId = activeStationId(this.state);
    if (!stationId) throw new Error("No station is waiting to resolve.");
    const assignedActorId = this.state.assignments?.[stationId]?.actorId ?? null;
    const actor = actorId ? game.actors.get(actorId) : assignedActorId ? game.actors.get(assignedActorId) : null;
    if (!actor) throw new Error(`No PF2e character is assigned to ${stationId}.`);
    if (!game.user.isGM) {
      this.#requireStationControl(game.user.id, stationId);
      const { roll } = await rollSelectedStation({ event: this.getEvent(), state: this.state, actor });
      return this.command({ type: "submit-station-roll", stationId, actorId: actor.id, roll: { total: Number(roll.total), outcome: roll.outcome, messageId: roll.messageId ?? null } });
    }
    const { nextState } = await resolveActiveStation({ event: this.getEvent(), state: this.state, actor });
    return this.#persistAndBroadcast(prepareAfterStationResult(this.getEvent(), nextState));
  }

  getEvent() { return this.state ? ARKFLIGHT_EVENTS[this.state.eventId] ?? null : null; }
  getRound() { const event = this.getEvent(); return event?.rounds?.[this.state?.roundIndex ?? 0] ?? null; }

  async #applyCommand(command, sourceUserId) {
    if (!this.state) throw new Error("No Arkflight Event is active.");
    let next = this.state;
    switch (command.type) {
      case "begin-planning": {
        this.#requireGMUser(sourceUserId);
        const wasOpening = this.state.phase === "opening";
        next = startPlanning(this.state);
        if (wasOpening && masteryIsReady(next, "captain", "captain-set-the-pace")) {
          const encounter = { ...next.encounter, momentum: Math.min(3, Number(next.encounter?.momentum ?? 0) + 1), notes: [...(next.encounter?.notes ?? []), "Mastery — Set the Pace: Event begins with +1 Momentum."] };
          next = { ...next, encounter, masteryUses: { ...(next.masteryUses ?? {}), captain: { masteryId: "captain-set-the-pace", usedAt: Date.now(), roundIndex: 0 } } };
        }
        break;
      }
      case "assign-actor":
        this.#requireStationClaimPermission(sourceUserId, command.station, command.actorId);
        next = assignActor(this.state, command.station, command.actorId);
        break;
      case "select-mastery": {
        this.#requireStationControl(sourceUserId, command.station);
        const technique = getMasteryTechnique(command.station, command.masteryId);
        if (!technique) throw new Error("Choose a valid Mastery Technique for that station.");
        next = selectMastery(this.state, command.station, command.masteryId);
        break;
      }
      case "use-mastery": {
        this.#requireStationControl(sourceUserId, command.station);
        next = applyMasteryTechnique(this.state, command.station, command.options ?? {});
        next = clearMasteryWindow(next, command.station, command.windowId ?? null);
        if (next.phase === "round-result" && !next.consequenceApplied && !(next.pendingMasteryWindows?.length)) next = finalizeWithMastery(this.getEvent(), next);
        break;
      }
      case "dismiss-mastery-window":
        this.#requireStationControl(sourceUserId, command.station);
        next = clearMasteryWindow(this.state, command.station, command.windowId ?? null);
        if (next.phase === "round-result" && !next.consequenceApplied && !(next.pendingMasteryWindows?.length)) next = finalizeWithMastery(this.getEvent(), next);
        break;
      case "use-tactic":
        next = applyCrewTactic(this.state, command.tacticId, command.options ?? {});
        break;
      case "select-action": this.#requireStationControl(sourceUserId, command.station); next = selectAction(this.state, command.station, command.actionId); break;
      case "select-skill": this.#requireStationControl(sourceUserId, command.station); next = selectSkill(this.state, command.station, command.skillId); break;
      case "select-risk": this.#requireStationControl(sourceUserId, command.station); next = selectRiskTier(this.state, command.station, command.riskTier); break;
      case "select-component-ability": this.#requireStationControl(sourceUserId, command.station); next = selectComponentAbility(this.state, command.station, command.componentAbilityId); break;
      case "move-order": this.#requireStationControl(sourceUserId, command.station); next = moveOrder(this.state, command.station, command.direction); break;
      case "submit-station-roll": {
        const stationId = activeStationId(this.state);
        if (!stationId || this.state.phase !== "resolution") throw new Error("No station is waiting to resolve.");
        if (command.stationId !== stationId) throw new Error("That station is no longer active.");
        this.#requireStationControl(sourceUserId, stationId);
        const assignedActorId = this.state.assignments?.[stationId]?.actorId ?? null;
        if (!assignedActorId || command.actorId !== assignedActorId) throw new Error("The submitted roll does not belong to the assigned station officer.");
        const actor = game.actors.get(assignedActorId);
        if (!actor) throw new Error(`No PF2e character is assigned to ${stationId}.`);
        const resolved = applyStationRollResult({ event: this.getEvent(), state: this.state, actor, roll: command.roll });
        next = prepareAfterStationResult(this.getEvent(), resolved.nextState);
        break;
      }
      case "lock-plan": this.#requireGMUser(sourceUserId); next = lockPlanning(this.state); break;
      case "begin-resolution": this.#requireGMUser(sourceUserId); next = initializeResolution(this.state); break;
      case "next-round":
        this.#requireGMUser(sourceUserId);
        if (this.state.pendingMasteryWindows?.length) throw new Error("Resolve or dismiss the available Mastery window before advancing.");
        if (this.state.phase === "round-result" && this.state.roundResult && !this.state.consequenceApplied) next = finalizeWithMastery(this.getEvent(), this.state);
        next = advanceToNextRound(this.getEvent(), next);
        break;
      case "mark-rewards-granted":
        this.#requireGMUser(sourceUserId);
        if (this.state.phase !== "event-complete" || !this.state.eventRewards) throw new Error("No completed Event rewards are available to mark as granted.");
        next = { ...this.state, eventRewards: { ...this.state.eventRewards, granted: true, grantedAt: Date.now(), recipientActorId: command.actorId ?? null, recipientActorName: command.actorName ?? null, createdItemIds: [...(command.createdItemIds ?? [])], createdItemNames: [...(command.createdItemNames ?? [])] } };
        break;
      case "restart-event":
        this.#requireGMUser(sourceUserId);
        next = restartEvent(this.state, { roundId: this.getEvent()?.rounds?.[0]?.id, preserveAssignments: false, preserveCrewEdgeHand: true, preserveMastery: false });
        next = initializeEncounter(this.getEvent(), next);
        break;
      default: throw new Error(`Unknown planning command: ${command.type}`);
    }
    return this.#persistAndBroadcast(next);
  }

  async #persistAndBroadcast(next) {
    this.state = next;
    await game.settings.set(MODULE_ID, SETTING_KEY, next);
    game.socket.emit(SOCKET, { type: "snapshot", state: next, sourceUserId: game.user.id });
    this.onStateChange?.(next);
    return next;
  }
  #acceptSnapshot(next) { this.state = repairLoadedState(next); this.onStateChange?.(this.state); }
  #requireGM() { if (!game.user.isGM) throw new Error("Only the GM may perform that Arkflight Event action."); }
  #requireGMUser(userId) { const user = game.users.get(userId); if (!user?.isGM) throw new Error("Only the GM may perform that Arkflight Event action."); }
  #requireStationClaimPermission(userId, stationId, actorId) {
    const user = game.users.get(userId);
    if (!user) throw new Error("Unknown Arkflight player.");
    if (user.isGM) return;
    const existingActorId = this.state.assignments?.[stationId]?.actorId ?? null;
    if (existingActorId) {
      const existingActor = game.actors.get(existingActorId);
      if (!userOwnsActor(existingActor, user)) throw new Error("That Arkflight station has already been claimed by another player.");
    }
    if (!actorId) return;
    const actor = game.actors.get(actorId);
    if (!actor || actor.type !== "character" || !userOwnsActor(actor, user)) throw new Error("You may only claim an Arkflight station with a PF2e character you own.");
  }
  #requireStationControl(userId, stationId) {
    const user = game.users.get(userId);
    if (!user) throw new Error("Unknown Arkflight player.");
    if (user.isGM) return;
    const actorId = this.state.assignments?.[stationId]?.actorId;
    const actor = actorId ? game.actors.get(actorId) : null;
    if (!actor || !userOwnsActor(actor, user)) throw new Error("You may only control the Arkflight station assigned to a PF2e character you own.");
  }
}

export const PLANNING_MODULE_ID = MODULE_ID;
