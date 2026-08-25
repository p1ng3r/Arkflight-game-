import { activeStationId } from "../event/resolution-state.js";

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function playerOwnsActor(actor) {
  return Boolean(actor?.testUserPermission?.(game.user, "OWNER"));
}

function decoratePlayerResolution(root, controller) {
  if (!root || game.user.isGM || controller.state?.phase !== "resolution") return;
  const stationId = activeStationId(controller.state);
  if (!stationId) return;

  const actorId = controller.state.assignments?.[stationId]?.actorId ?? null;
  const actor = actorId ? game.actors.get(actorId) : null;
  const focus = root.querySelector(".arkflight-resolution-focus");
  if (!focus) return;

  const waiting = focus.querySelector(".arkflight-waiting");
  if (!playerOwnsActor(actor)) {
    if (waiting) waiting.textContent = `Waiting for ${actor?.name ?? "the assigned officer"} to resolve this station.`;
    return;
  }

  waiting?.remove();
  if (focus.querySelector("[data-ark-player-resolve]")) return;

  const help = document.createElement("p");
  help.className = "arkflight-resolution-help";
  help.textContent = `You control ${actor.name}, the officer assigned to this station.`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-primary arkflight-roll-button";
  button.dataset.arkPlayerResolve = "true";
  button.innerHTML = '<i class="fa-solid fa-dice-d20"></i> Resolve My Station';
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await controller.resolveCurrentStation();
    } catch (error) {
      console.error("Arkflight | Player station resolution failed", error);
      ui.notifications?.warn(error.message);
      button.disabled = false;
    }
  });

  focus.append(help, button);
}

export function installPlayerResolutionUI() {
  Hooks.on("renderApplicationV2", (app, element) => {
    const root = boardRoot(app, element);
    const controller = game.arkflight?.controller;
    if (!root || !controller?.state) return;
    decoratePlayerResolution(root, controller);
  });
}
