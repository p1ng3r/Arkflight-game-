import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_MASTERY } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { PlanningController } from "../event/planning-controller.js";
import { ArkflightEventBoard } from "../ui/event-board-app.js";
import { ArkflightRewardSummary } from "../ui/reward-summary-app.js";
import { installMasteryTacticsUI } from "../ui/mastery-tactics-ui.js";
import { installPlayerSetupClaims } from "../ui/setup-player-claims.js";
import { installPlayerResolutionUI } from "../ui/player-resolution-ui.js";
import { installMasteryOpportunityUI } from "../ui/mastery-opportunity-ui.js";
import { installOpeningScreenUI } from "../ui/opening-screen-ui.js";
import {
  isArkflightShip,
  markVehicleAsArkflightShip,
  registerArkflightShipSheet
} from "../ui/ship-sheet-app.js";

const MODULE_ID = "arkflight-game";
let controller = null;
let board = null;
let rewardSummary = null;
let lastRoundRewardKey = null;
let lastEventRewardKey = null;

function ensureBoard() {
  if (!controller) return null;
  if (!board) board = new ArkflightEventBoard(controller);
  return board;
}

function decorateEventCompleteBoard() {
  if (!controller?.state || controller.state.phase !== "event-complete" || !board?.element) return;
  const ending = controller.state.eventEnding;
  if (!ending) return;
  const panel = board.element.querySelector(".arkflight-round-result-panel");
  if (!panel) return;
  panel.innerHTML = "";
  const kicker = document.createElement("div");
  kicker.className = "arkflight-kicker";
  kicker.textContent = "CLOSING CINEMATIC";
  const title = document.createElement("h2");
  title.textContent = ending.label || "Event Complete";
  const vignette = document.createElement("article");
  vignette.className = "arkflight-round-vignette arkflight-event-ending-vignette";
  const paragraph = document.createElement("p");
  paragraph.textContent = ending.vignette || "";
  vignette.append(paragraph);
  panel.append(kicker, title, vignette);
  if (game.user.isGM) {
    const actions = document.createElement("div");
    actions.className = "arkflight-round-continue";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "arkflight-primary";
    button.innerHTML = '<i class="fa-solid fa-trophy"></i> Open Rewards';
    button.addEventListener("click", () => showRewardSummary());
    actions.append(button);
    panel.append(actions);
  }
}

function renderBoard() {
  const app = ensureBoard();
  if (!app) return null;
  const rendered = app.render({ force: true });
  if (controller?.state?.phase === "event-complete") setTimeout(decorateEventCompleteBoard, 75);
  return rendered;
}

function showRewardSummary() {
  if (!controller) return;
  if (!rewardSummary) rewardSummary = new ArkflightRewardSummary(controller);
  rewardSummary.render({ force: true });
}

function baseStationOptions() {
  return Object.fromEntries(Object.entries(BASE_MASTERY).map(([stationId, masteries]) => [stationId, { masteries: [...masteries], signatures: [], componentAbilities: [] }]));
}

function announceStateRewards(state) {
  if (!state) return;
  if (state.phase === "round-result" && state.consequenceApplied) {
    const key = `${state.eventId}:${state.roundId}:${state.roundResult?.bandId}:${state.roundMomentumBefore}:${state.roundMomentumAfter}`;
    if (key !== lastRoundRewardKey) {
      lastRoundRewardKey = key;
      const before = Number(state.roundMomentumBefore ?? state.encounter?.momentum ?? 0);
      const award = Number(state.roundMomentumAward ?? state.roundResult?.momentumDelta ?? 0);
      const after = Number(state.roundMomentumAfter ?? state.encounter?.momentum ?? 0);
      const tacticNames = (state.roundRewards?.awardedEdgeCards ?? []).map((id) => getCrewEdgeCard(id)?.name).filter(Boolean);
      const tacticText = tacticNames.length ? ` Crew Tactic earned: ${tacticNames.join(", ")}.` : "";
      ui.notifications?.info(`Arkflight Momentum: ${before} ${award >= 0 ? "+" : ""}${award} → ${after}.${tacticText}`);
    }
  }
  if (state.phase === "event-complete" && state.eventEnding) {
    const key = `${state.eventId}:${state.eventEnding.id ?? state.eventEnding.label}`;
    if (key !== lastEventRewardKey) {
      lastEventRewardKey = key;
      setTimeout(() => { decorateEventCompleteBoard(); showRewardSummary(); }, 175);
    }
  }
}

Hooks.once("init", () => {
  PlanningController.registerSetting();
  registerArkflightShipSheet();
  installMasteryTacticsUI();
  installPlayerSetupClaims();
  installPlayerResolutionUI();
  installMasteryOpportunityUI();
  installOpeningScreenUI();

  game.arkflight = {
    events: ARKFLIGHT_EVENTS,
    stationOptions: baseStationOptions(),
    get controller() { return controller; },
    openBoard() { renderBoard(); return board; },
    openRewards() { showRewardSummary(); return rewardSummary; },
    isShip(actor) { return isArkflightShip(actor); },
    async markVehicleAsShip(actor) { return markVehicleAsArkflightShip(actor); },
    async openEvent(eventId = "glassback-cinderwake") {
      if (!controller) throw new Error("Arkflight is not ready yet.");
      await controller.openEvent(eventId);
      renderBoard();
      return controller.state;
    },
    setStationOptions(stationId, options = {}) {
      const base = BASE_MASTERY[stationId] ?? [];
      this.stationOptions[stationId] = { masteries: [...(options.masteries ?? base)], signatures: [], componentAbilities: [...(options.componentAbilities ?? [])] };
      if (board?.rendered) board.render({ force: true });
    }
  };
});

Hooks.once("ready", () => {
  controller = new PlanningController({ onStateChange: (state) => { renderBoard(); announceStateRewards(state); } });
  controller.activateSockets();
  if (controller.state?.eventId) { renderBoard(); announceStateRewards(controller.state); }
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!controls.tokens?.tools) return;
  controls.tokens.tools.arkflightEvent = {
    name: "arkflightEvent",
    title: "Arkflight Event Board",
    icon: "fa-solid fa-compass",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: true,
    onChange: async () => {
      if (!controller) return;
      if (!controller.state?.eventId) {
        if (!game.user.isGM) { ui.notifications?.info("Waiting for the GM to launch an Arkflight Event."); return; }
        await game.arkflight.openEvent("glassback-cinderwake");
        return;
      }
      renderBoard();
    }
  };
});
