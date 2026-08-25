import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_SIGNATURES } from "../content/base-signatures.js";
import { PlanningController } from "../event/planning-controller.js";
import { ArkflightEventBoard } from "../ui/event-board-app.js";

const MODULE_ID = "arkflight-game";
let controller = null;
let board = null;

function ensureBoard() {
  if (!controller) return null;
  if (!board) board = new ArkflightEventBoard(controller);
  return board;
}

function renderBoard() {
  const app = ensureBoard();
  if (app) app.render({ force: true });
}

function baseStationOptions() {
  return Object.fromEntries(Object.entries(BASE_SIGNATURES).map(([stationId, signatures]) => [
    stationId,
    { signatures: [...signatures], componentAbilities: [] }
  ]));
}

Hooks.once("init", () => {
  PlanningController.registerSetting();

  game.arkflight = {
    events: ARKFLIGHT_EVENTS,
    stationOptions: baseStationOptions(),
    get controller() { return controller; },
    openBoard() {
      renderBoard();
      return board;
    },
    async openEvent(eventId = "glassback-cinderwake") {
      if (!controller) throw new Error("Arkflight is not ready yet.");
      await controller.openEvent(eventId);
      renderBoard();
      return controller.state;
    },
    setStationOptions(stationId, options = {}) {
      const base = BASE_SIGNATURES[stationId] ?? [];
      this.stationOptions[stationId] = {
        signatures: [...(options.signatures ?? base)],
        componentAbilities: [...(options.componentAbilities ?? [])]
      };
      if (board?.rendered) board.render({ force: true });
    }
  };
});

Hooks.once("ready", () => {
  controller = new PlanningController({
    onStateChange: () => renderBoard()
  });
  controller.activateSockets();
  if (controller.state?.eventId) renderBoard();
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
        if (!game.user.isGM) {
          ui.notifications?.info("Waiting for the GM to launch an Arkflight Event.");
          return;
        }
        await game.arkflight.openEvent("glassback-cinderwake");
        return;
      }
      renderBoard();
    }
  };
});
