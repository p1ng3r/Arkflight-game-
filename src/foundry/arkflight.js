import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_MASTERY } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { PlanningController } from "../event/planning-controller.js";
import { ArkflightEventBoard } from "../ui/event-board-app.js";
import { ArkflightRewardSummary } from "../ui/reward-summary-app.js";
import { ArkflightGMOperations } from "../ui/gm-operations-app.js";
import { installMasteryTacticsUI } from "../ui/mastery-tactics-ui.js";
import { installPlayerSetupClaims } from "../ui/setup-player-claims.js";
import { installPlayerResolutionUI } from "../ui/player-resolution-ui.js";
import { installMasteryOpportunityUI } from "../ui/mastery-opportunity-ui.js";
import { installOpeningScreenUI } from "../ui/opening-screen-ui.js";

const MODULE_ID = "arkflight-game";
let controller = null;
let board = null;
let rewardSummary = null;
let gmOperations = null;
let lastRoundRewardKey = null;
let lastEventRewardKey = null;
let lastEventActive = false;

function ensureBoard() {
  if (!controller) return null;
  if (!board) board = new ArkflightEventBoard(controller);
  return board;
}

function ensureGMOperations() {
  if (!game.user.isGM) return null;
  if (!gmOperations) gmOperations = new ArkflightGMOperations();
  return gmOperations;
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

function openGMOperations(options = {}) {
  if (!game.user.isGM) return null;
  return ensureGMOperations()?.open(options) ?? null;
}

function showActiveEventChoice() {
  const DialogV2 = foundry.applications.api.DialogV2;
  return new DialogV2({
    window: { title: "Arkflight Operations" },
    content: "<p>An Arkflight event is already active. Resume the Event Board or open GM Operations.</p>",
    buttons: [
      {
        action: "resume",
        label: "Resume Event",
        icon: "fa-solid fa-compass",
        default: true,
        callback: () => renderBoard()
      },
      {
        action: "operations",
        label: "Open GM Operations",
        icon: "fa-solid fa-screwdriver-wrench",
        callback: () => openGMOperations({ section: "operations" })
      }
    ]
  }).render({ force: true });
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
  installMasteryTacticsUI();
  installPlayerSetupClaims();
  installPlayerResolutionUI();
  installMasteryOpportunityUI();
  installOpeningScreenUI();

  game.arkflight = {
    events: ARKFLIGHT_EVENTS,
    stationOptions: baseStationOptions(),
    get controller() { return controller; },
    get gmOperations() { return ensureGMOperations(); },
    openBoard() { renderBoard(); return board; },
    openRewards() { showRewardSummary(); return rewardSummary; },
    openGMOperations,
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
  controller = new PlanningController({
    onStateChange: (state) => {
      const eventActive = Boolean(state?.eventId);
      if (eventActive !== lastEventActive) {
        lastEventActive = eventActive;
        ui.controls?.render();
      }
      if (board?.rendered) renderBoard();
      if (gmOperations?.rendered) gmOperations.render({ force: true });
      announceStateRewards(state);
    }
  });
  controller.activateSockets();
  lastEventActive = Boolean(controller.state?.eventId);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!controls.tokens?.tools) return;
  const eventActive = Boolean(controller?.state?.eventId);
  controls.tokens.tools.arkflightEvent = {
    name: "arkflightEvent",
    title: game.user.isGM ? "Arkflight GM Operations" : "Arkflight Event Board",
    icon: "fa-solid fa-compass",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM || eventActive,
    onChange: async () => {
      if (!controller) return;
      const active = Boolean(controller.state?.eventId);

      if (!game.user.isGM) {
        if (active) renderBoard();
        return;
      }

      if (active) {
        showActiveEventChoice();
        return;
      }

      openGMOperations();
    }
  };
});
