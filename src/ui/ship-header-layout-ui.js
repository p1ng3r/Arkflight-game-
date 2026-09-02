import { progressionView } from "../ship/progression.js";

const MODULE_ID = "arkflight-game";
const observedLevels = new Map();

function rootFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function actorFrom(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function ship(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }

function progressionButtonState(actor, button) {
  const currentShip = ship(actor);
  if (!currentShip || !button) return;
  const view = progressionView(currentShip);
  const key = actor.uuid ?? actor.id;
  const previous = observedLevels.get(key);
  const justLeveled = Number.isFinite(previous) && view.level > previous;
  observedLevels.set(key, view.level);
  const actionable = view.available > 0 || justLeveled;
  button.hidden = !actionable;
  button.classList.toggle("has-unspent-tp", view.available > 0);
  button.title = view.available > 0
    ? `${view.available} Talent Point${view.available === 1 ? "" : "s"} available to spend.`
    : justLeveled ? `Ship reached level ${view.level}. Review progression.` : "";
}

function enhance(app, html) {
  const root = rootFrom(app, html);
  const actor = actorFrom(app);
  if (!root || !actor || !ship(actor)) return;
  const button = root.querySelector(".arkflight-progression-launch, [data-action='arkflight-progression']");
  progressionButtonState(actor, button);
}

Hooks.on("renderActorSheet", enhance);
Hooks.on("renderApplicationV2", enhance);
