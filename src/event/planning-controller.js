import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_SIGNATURES } from "../content/base-signatures.js";
import {
  createPlanningState,
  startPlanning,
  assignActor,
  selectAction,
  selectSkill,
  selectRiskTier,
  selectSignature,
  selectComponentAbility,
  moveOrder,
  lockPlanning,
  restartEvent
} from "./planning-state.js";
import { initializeResolution, activeStationId } from "./resolution-state.js";
import { resolveActiveStation } from "./resolution-engine.js";
import { advanceToNextRound, encounterFromEvent } from "./round-runtime.js";

const MODULE_ID = "arkflight-game";
const SETTING_KEY = "activeEventPlanning";
const SOCKET = `module.${MODULE_ID}`;

function applyDefaultSignatures(state) {
  return {
    ...state,
    selections: Object.fromEntries(Object.entries(state.selections).map(([station, selection]) => [
      station,
      { ...selection, signatureId: selection.signatureId ?? BASE_SIGNATURES[station]?.[0]?.id ?? null }
    ]))
  };
}

function initializeEncounter(event, state) {
  return { ...state, encounter: encounterFromEvent(event), signatureUses: {} };
}

export class PlanningController {
  constructor({ onStateChange = null } = {}) {
    this.onStateChange = onStateChange;
    this.state = game.settings.get(MODULE_ID, SETTING_KEY) || null;
  }

  static registerSetting() {
    game.settings.register(MODULE_ID, SETTING_KEY, {
      name: "Active Arkflight Event Planning",
      scope: "world",
      config: false,
      type: Object,
      default: null
    });
  }

  activateSockets() {
    game.socket.on(SOCKET, async (payload) => {
      if (!payload || payload.sourceUserId === game.user.id) return;
      if (payload.type === "snapshot") {
        this.#acceptSnapshot(payload.state);
        return;
      }
      if (payload.type === "command" && game.user.isGM) {
        try {
          await this.#applyCommand(payload.command, payload.sourceUserId);
        } catch (error) {
          console.error("Arkflight | Planning command rejected", error);
          game.socket.emit(SOCKET, {
            type: "error",
            targetUserId: payload.sourceUserId,
            message: error.message,
            sourceUserId: game.user.id
          });
        }
        return;
      }
      if (payload.type === "error" && payload.targetUserId === game.user.id) {
        ui.notifications?.warn(payload.message);
      }
    });
  }

  async openEvent(eventId = "glassback-cinderwake") {
    this.#requireGM();
    const event = ARKFLIGHT_EVENTS[eventId];
    if (!event) throw new Error(`Unknown Arkflight Event: ${eventId}`);
    const round = event.rounds[0];
    let next = createPlanningState({ eventId: event.id, roundId: round.id, roundIndex: 0 });
    next = initializeEncounter(event, applyDefaultSignatures(next));
    await this.#persistAndBroadcast(next);
    return next;
  }

  async restartCurrentEvent() {
    this.#requireGM();
    const event = this.getEvent();
    if (!event) throw new Error("No Arkflight Event is active.");
    let next = restartEvent(this.state, { roundId: event.rounds[0]?.id, preserveAssignments: true });
    next = initializeEncounter(event, applyDefaultSignatures(next));
    return this.#persistAndBroadcast(next);
  }

  async command(command) {
    if (!command?.type) throw new Error("Planning command requires a type.");
    if (game.user.isGM) return this.#applyCommand(command, game.user.id);
    game.socket.emit(SOCKET, {
      type: "command",
      command,
      sourceUserId: game.user.id
    });
    return null;
  }

  async beginPlanning() { return this.command({ type: "begin-planning" }); }
  async lockPlan() { this.#requireGM(); return this.command({ type: "lock-plan" }); }
  async beginResolution() { this.#requireGM(); return this.command({ type: "begin-resolution" }); }
  async continueToNextRound() { this.#requireGM(); return this.command({ type: "next-round" }); }

  async resolveCurrentStation(actorId = null) {
    this.#requireGM();
    if (!this.state || this.state.phase !== "resolution") throw new Error("No station is waiting to resolve.");
    const stationId = activeStationId(this.state);
    const assignedActorId = stationId ? this.state.assignments?.[stationId]?.actorId ?? null : null;
    const actor = actorId
      ? game.actors.get(actorId)
      : assignedActorId
        ? game.actors.get(assignedActorId)
        : canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
    if (!actor) throw new Error(`No PF2e character is assigned to ${stationId ?? "this station"}. Assign one during planning or select a character token.`);
    const { nextState } = await resolveActiveStation({ event: this.getEvent(), state: this.state, actor });
    return this.#persistAndBroadcast(nextState);
  }

  getEvent() {
    return this.state ? ARKFLIGHT_EVENTS[this.state.eventId] ?? null : null;
  }

  getRound() {
    const event = this.getEvent();
    return event?.rounds?.[this.state?.roundIndex ?? 0] ?? null;
  }

  async #applyCommand(command, sourceUserId) {
    if (!this.state) throw new Error("No Arkflight Event is active.");
    let next = this.state;
    switch (command.type) {
      case "begin-planning":
        this.#requireGMUser(sourceUserId);
        next = startPlanning(this.state);
        break;
      case "assign-actor":
        this.#requireGMUser(sourceUserId);
        next = assignActor(this.state, command.station, command.actorId);
        break;
      case "select-action": next = selectAction(this.state, command.station, command.actionId); break;
      case "select-skill": next = selectSkill(this.state, command.station, command.skillId); break;
      case "select-risk": next = selectRiskTier(this.state, command.station, command.riskTier); break;
      case "select-signature": next = selectSignature(this.state, command.station, command.signatureId); break;
      case "select-component-ability": next = selectComponentAbility(this.state, command.station, command.componentAbilityId); break;
      case "move-order": next = moveOrder(this.state, command.station, command.direction); break;
      case "lock-plan":
        this.#requireGMUser(sourceUserId);
        next = lockPlanning(this.state);
        break;
      case "begin-resolution":
        this.#requireGMUser(sourceUserId);
        next = initializeResolution(this.state);
        break;
      case "next-round":
        this.#requireGMUser(sourceUserId);
        next = advanceToNextRound(this.getEvent(), this.state);
        break;
      case "restart-event":
        this.#requireGMUser(sourceUserId);
        next = restartEvent(this.state, { roundId: this.getEvent()?.rounds?.[0]?.id, preserveAssignments: true });
        next = initializeEncounter(this.getEvent(), applyDefaultSignatures(next));
        break;
      default:
        throw new Error(`Unknown planning command: ${command.type}`);
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

  #acceptSnapshot(next) {
    this.state = next;
    this.onStateChange?.(next);
  }

  #requireGM() {
    if (!game.user.isGM) throw new Error("Only the GM may perform that Arkflight Event action.");
  }

  #requireGMUser(userId) {
    const user = game.users.get(userId);
    if (!user?.isGM) throw new Error("Only the GM may perform that Arkflight Event action.");
  }
}

export const PLANNING_MODULE_ID = MODULE_ID;
