import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { STATIONS } from "../event/event-schema.js";
import { planningReady, planningSecondsRemaining } from "../event/planning-state.js";
import { activeStationId } from "../event/resolution-state.js";
import { selectedResolution } from "../event/resolution-engine.js";
import { stationPresentation } from "./station-presentation.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimer(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function moduleAssetPath(path) {
  if (!path) return "";
  if (/^(https?:|data:|modules\/)/.test(path)) return path;
  return `modules/arkflight-game/${String(path).replace(/^\/+/, "")}`;
}

export class ArkflightEventBoard extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-event-board",
    classes: ["arkflight", "arkflight-event-board"],
    position: { width: 1180, height: 820 },
    window: { title: "Arkflight Event", icon: "fa-solid fa-compass" }
  };

  static PARTS = { board: { template: "modules/arkflight-game/templates/event-board.hbs" } };

  constructor(controller, options = {}) {
    super(options);
    this.controller = controller;
    this._timerInterval = null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = this.controller.state;
    const event = this.controller.getEvent();
    const round = this.controller.getRound();
    if (!state || !event || !round) return { ...context, empty: true, isGM: game.user.isGM };

    const remaining = planningSecondsRemaining(state);
    const stationOptions = game.arkflight?.stationOptions ?? {};
    const playerActors = game.actors.contents
      .filter((actor) => actor.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));

    const stations = STATIONS.map((stationId, index) => {
      const selection = state.selections[stationId];
      const fallback = FALLBACK_ACTIONS[stationId];
      const authored = round.stationActions[stationId] ?? [];
      const availableActions = [fallback, ...authored];
      const selectedAction = availableActions.find((action) => action.id === selection.actionId) ?? null;
      const selectedSkill = selectedAction?.skills?.find((skill) => skill.id === selection.skillId) ?? null;
      const riskChoices = (selectedSkill?.riskBids ?? []).map((risk) => {
        const benefit = getRiskBenefit(risk.benefitId);
        return {
          ...risk,
          name: benefit?.name ?? risk.benefitId,
          success: benefit?.success ?? "",
          criticalSuccess: benefit?.criticalSuccess ?? "",
          modifiedDc: Number(selectedSkill.dc) + Number(risk.tier),
          selected: selection.riskTier === risk.tier
        };
      });
      const configured = stationOptions[stationId] ?? {};
      const signatures = (configured.signatures ?? []).map((item) => ({ ...item, selected: item.id === selection.signatureId, expended: Boolean(state.signatureUses?.[stationId]) }));
      const componentAbilities = (configured.componentAbilities ?? []).map((item) => ({ ...item, selected: item.id === selection.componentAbilityId }));
      const result = state.results?.[stationId] ?? null;
      const assignedActorId = state.assignments?.[stationId]?.actorId ?? null;
      const assignedActor = assignedActorId ? game.actors.get(assignedActorId) : null;

      return {
        stationId,
        presentation: stationPresentation(stationId),
        orderPosition: state.order.indexOf(stationId) + 1,
        canMoveEarlier: state.order.indexOf(stationId) > 0,
        canMoveLater: state.order.indexOf(stationId) < state.order.length - 1,
        selection,
        complete: Boolean(assignedActorId && selection.actionId && selection.skillId),
        assignedActorId,
        assignedActorName: assignedActor?.name ?? null,
        actorOptions: playerActors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor.id === assignedActorId })),
        availableActions: availableActions.map((action) => ({ ...action, fallback: action.id === fallback.id, selected: action.id === selection.actionId })),
        selectedAction,
        skillChoices: (selectedAction?.skills ?? []).map((skill) => ({ ...skill, selected: skill.id === selection.skillId, heroic: (skill.riskBids?.length ?? 0) > 0 })),
        selectedSkill,
        riskChoices,
        hasRiskChoices: riskChoices.length > 0,
        signatures,
        componentAbilities,
        hasEncounterAbilities: signatures.length > 0 || componentAbilities.length > 0,
        result,
        index
      };
    });

    const order = state.order.map((stationId, index) => ({
      stationId,
      position: index + 1,
      name: stationPresentation(stationId)?.displayName ?? titleCase(stationId),
      resolved: Boolean(state.results?.[stationId]),
      active: state.phase === "resolution" && activeStationId(state) === stationId
    }));

    const activeId = activeStationId(state);
    const chosen = activeId ? selectedResolution(event, state, activeId) : null;
    const activeAssignedActorId = activeId ? state.assignments?.[activeId]?.actorId ?? null : null;
    const activeAssignedActor = activeAssignedActorId ? game.actors.get(activeAssignedActorId) : null;
    const activeResolution = chosen ? {
      stationId: activeId,
      stationName: stationPresentation(activeId)?.displayName ?? titleCase(activeId),
      actionName: chosen.action.name,
      skillLabel: chosen.skill.label,
      skillSlug: chosen.skill.skill,
      baseDc: chosen.skill.dc,
      riskTier: chosen.riskBid?.tier ?? null,
      riskName: chosen.riskBenefit?.name ?? null,
      checkBonus: chosen.checkBonus,
      dcAdjustment: chosen.dcAdjustment,
      finalDc: chosen.finalDc,
      assignedActorName: activeAssignedActor?.name ?? null
    } : null;

    const resultRows = state.order.map((stationId) => {
      const result = state.results?.[stationId];
      if (!result) return null;
      return {
        stationId,
        stationName: stationPresentation(stationId)?.displayName ?? titleCase(stationId),
        ...result,
        outcomeLabel: titleCase(result.degreeKey ?? result.outcome)
      };
    }).filter(Boolean);

    const encounter = state.encounter ?? event.startingState ?? {};
    const pressure = Object.entries(encounter.pressure ?? {}).map(([system, value]) => ({ system: titleCase(system), value }));
    const hazards = (encounter.hazards ?? []).map((id) => ({ id, name: titleCase(id) }));
    const finalRound = (state.roundIndex ?? 0) >= event.rounds.length - 1;

    return {
      ...context,
      empty: false,
      isGM: game.user.isGM,
      event,
      eventImage: moduleAssetPath(round.image || event.image),
      round,
      roundNumber: (state.roundIndex ?? 0) + 1,
      state,
      opening: state.phase === "opening",
      planning: state.phase === "planning",
      locked: state.phase === "locked",
      resolution: state.phase === "resolution",
      roundResultPhase: state.phase === "round-result",
      eventComplete: state.phase === "event-complete",
      readyToLock: planningReady(state),
      timerExpired: remaining <= 0,
      timerText: formatTimer(remaining),
      momentum: Number(encounter.momentum ?? 0),
      pressure,
      hazards,
      hasHazards: hazards.length > 0,
      stations,
      order,
      activeResolution,
      resultRows,
      roundResult: state.roundResult ?? null,
      roundNarrative: state.roundNarrative ?? null,
      consequenceNarrative: state.consequenceNarrative ?? null,
      finalRound
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#bindActions();
    this.#startTimerTicker();
  }

  async _preClose(options) {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = null;
    return super._preClose(options);
  }

  #bindActions() {
    for (const element of this.element.querySelectorAll("button[data-ark-action]")) {
      element.addEventListener("click", async (event) => {
        event.preventDefault();
        const button = event.currentTarget;
        const action = button.dataset.arkAction;
        const station = button.dataset.station;
        try {
          switch (action) {
            case "begin-planning": await this.controller.beginPlanning(); break;
            case "choose-action": await this.controller.command({ type: "select-action", station, actionId: button.dataset.actionId }); break;
            case "choose-skill": await this.controller.command({ type: "select-skill", station, skillId: button.dataset.skillId }); break;
            case "choose-risk": await this.controller.command({ type: "select-risk", station, riskTier: Number(button.dataset.riskTier) }); break;
            case "clear-risk": await this.controller.command({ type: "select-risk", station, riskTier: null }); break;
            case "move-earlier": await this.controller.command({ type: "move-order", station, direction: "earlier" }); break;
            case "move-later": await this.controller.command({ type: "move-order", station, direction: "later" }); break;
            case "choose-signature": await this.controller.command({ type: "select-signature", station, signatureId: button.dataset.signatureId }); break;
            case "choose-component-ability": await this.controller.command({ type: "select-component-ability", station, componentAbilityId: button.dataset.abilityId }); break;
            case "lock-plan": await this.controller.lockPlan(); break;
            case "begin-resolution": await this.controller.beginResolution(); break;
            case "resolve-active-station": await this.controller.resolveCurrentStation(); break;
            case "next-round": await this.controller.continueToNextRound(); break;
            case "restart-event": await this.controller.command({ type: "restart-event" }); break;
          }
        } catch (error) {
          console.error("Arkflight | Event board action failed", error);
          ui.notifications?.warn(error.message);
        }
      });
    }

    for (const select of this.element.querySelectorAll("select[data-ark-action='assign-actor']")) {
      select.addEventListener("change", async (event) => {
        const element = event.currentTarget;
        try {
          await this.controller.command({ type: "assign-actor", station: element.dataset.station, actorId: element.value || null });
        } catch (error) {
          console.error("Arkflight | Station actor assignment failed", error);
          ui.notifications?.warn(error.message);
        }
      });
    }
  }

  #startTimerTicker() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this.controller.state?.phase !== "planning") return;
    this._timerInterval = setInterval(() => {
      const seconds = planningSecondsRemaining(this.controller.state);
      const timer = this.element?.querySelector?.("[data-arkflight-timer]");
      if (timer) {
        timer.textContent = formatTimer(seconds);
        timer.classList.toggle("expired", seconds <= 0);
      }
      if (seconds <= 0) {
        const label = this.element?.querySelector?.("[data-arkflight-timer-label]");
        if (label) label.textContent = "TIME — GM MAY LOCK PLAN";
        clearInterval(this._timerInterval);
        this._timerInterval = null;
      }
    }, 1000);
  }
}
