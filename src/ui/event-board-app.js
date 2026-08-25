import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { STATIONS } from "../event/event-schema.js";
import { planningReady, planningSecondsRemaining } from "../event/planning-state.js";
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
    window: {
      title: "Arkflight Event",
      icon: "fa-solid fa-compass"
    }
  };

  static PARTS = {
    board: {
      template: "modules/arkflight-game/templates/event-board.hbs"
    }
  };

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
    if (!state || !event || !round) {
      return { ...context, empty: true, isGM: game.user.isGM };
    }

    const remaining = planningSecondsRemaining(state);
    const stationOptions = game.arkflight?.stationOptions ?? {};
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

      return {
        stationId,
        presentation: stationPresentation(stationId),
        orderPosition: state.order.indexOf(stationId) + 1,
        canMoveEarlier: state.order.indexOf(stationId) > 0,
        canMoveLater: state.order.indexOf(stationId) < state.order.length - 1,
        selection,
        complete: Boolean(selection.actionId && selection.skillId),
        availableActions: availableActions.map((action) => ({
          ...action,
          fallback: action.id === fallback.id,
          selected: action.id === selection.actionId
        })),
        selectedAction,
        skillChoices: (selectedAction?.skills ?? []).map((skill) => ({
          ...skill,
          selected: skill.id === selection.skillId,
          heroic: (skill.riskBids?.length ?? 0) > 0
        })),
        selectedSkill,
        riskChoices,
        hasRiskChoices: riskChoices.length > 0,
        signatures: (configured.signatures ?? []).map((item) => ({ ...item, selected: item.id === selection.signatureId })),
        componentAbilities: (configured.componentAbilities ?? []).map((item) => ({ ...item, selected: item.id === selection.componentAbilityId })),
        index
      };
    });

    const order = state.order.map((stationId, index) => ({
      stationId,
      position: index + 1,
      name: stationPresentation(stationId)?.displayName ?? titleCase(stationId)
    }));

    return {
      ...context,
      empty: false,
      isGM: game.user.isGM,
      event,
      eventImage: moduleAssetPath(event.image),
      round,
      roundNumber: (state.roundIndex ?? 0) + 1,
      state,
      opening: state.phase === "opening",
      planning: state.phase === "planning",
      locked: state.phase === "locked",
      resolution: state.phase === "resolution",
      readyToLock: planningReady(state),
      timerExpired: remaining <= 0,
      timerText: formatTimer(remaining),
      momentum: event.startingState?.momentum ?? 0,
      pressure: Object.entries(event.startingState?.pressure ?? {}).map(([system, value]) => ({ system: titleCase(system), value })),
      stations,
      order
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
    for (const element of this.element.querySelectorAll("[data-ark-action]")) {
      element.addEventListener("click", async (event) => {
        event.preventDefault();
        const button = event.currentTarget;
        const action = button.dataset.arkAction;
        const station = button.dataset.station;
        try {
          switch (action) {
            case "begin-planning":
              await this.controller.beginPlanning();
              break;
            case "choose-action":
              await this.controller.command({ type: "select-action", station, actionId: button.dataset.actionId });
              break;
            case "choose-skill":
              await this.controller.command({ type: "select-skill", station, skillId: button.dataset.skillId });
              break;
            case "choose-risk":
              await this.controller.command({ type: "select-risk", station, riskTier: Number(button.dataset.riskTier) });
              break;
            case "clear-risk":
              await this.controller.command({ type: "select-risk", station, riskTier: null });
              break;
            case "move-earlier":
              await this.controller.command({ type: "move-order", station, direction: "earlier" });
              break;
            case "move-later":
              await this.controller.command({ type: "move-order", station, direction: "later" });
              break;
            case "choose-signature":
              await this.controller.command({ type: "select-signature", station, signatureId: button.dataset.signatureId });
              break;
            case "choose-component-ability":
              await this.controller.command({ type: "select-component-ability", station, componentAbilityId: button.dataset.abilityId });
              break;
            case "lock-plan":
              await this.controller.lockPlan();
              break;
            case "begin-resolution":
              await this.controller.beginResolution();
              break;
          }
        } catch (error) {
          console.error("Arkflight | Event board action failed", error);
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
