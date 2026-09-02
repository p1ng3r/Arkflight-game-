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

function primaryColumn(header) {
  let primary = header.querySelector(":scope > .arkflight-ship-primary-column");
  if (primary) return primary;

  const portrait = header.querySelector(":scope > .arkflight-ship-portrait-frame, :scope > .arkflight-ship-portrait");
  const identity = header.querySelector(":scope > .arkflight-ship-identity");
  if (!portrait || !identity) return null;

  primary = document.createElement("div");
  primary.className = "arkflight-ship-primary-column";
  const top = document.createElement("div");
  top.className = "arkflight-ship-primary-top";

  portrait.before(primary);
  primary.append(top);
  top.append(portrait, identity);
  return primary;
}

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
  if (button.dataset.arkflightHeaderProgressionWired !== "true") {
    button.dataset.arkflightHeaderProgressionWired = "true";
    button.addEventListener("click", () => observedLevels.set(key, Number(ship(actor)?.progression?.level ?? view.level)));
  }
}

function readinessColumn(header, headerActions) {
  let stack = header.querySelector(":scope > .arkflight-ship-readiness-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "arkflight-ship-readiness-stack";
    header.append(stack);
  }

  const readiness = headerActions?.querySelector(":scope > .arkflight-readiness");
  const access = headerActions?.querySelector(":scope > .arkflight-access-note");
  if (readiness && readiness.parentElement !== stack) stack.append(readiness);
  if (access && access.parentElement !== stack) stack.append(access);
  return stack;
}

function enhance(app, html) {
  const root = rootFrom(app, html);
  const actor = actorFrom(app);
  if (!root || !actor || !ship(actor)) return;
  const header = root.querySelector(".arkflight-ship-header");
  if (!header) return;

  const primary = primaryColumn(header);
  const xp = root.querySelector("[data-ship-xp]");
  if (primary && xp && xp.parentElement !== primary) primary.append(xp);

  const headerActions = header.querySelector(":scope > .arkflight-ship-header-actions");
  const readinessStack = readinessColumn(header, headerActions);

  const status = root.querySelector("[data-operational-status-root]");
  if (status && status.parentElement !== header) header.append(status);

  const levelButton = root.querySelector(".arkflight-progression-launch, [data-action='arkflight-progression']");
  progressionButtonState(actor, levelButton);
  if (levelButton && levelButton.parentElement !== readinessStack) readinessStack.append(levelButton);

  if (headerActions && headerActions.children.length === 0) headerActions.hidden = true;
  root.dataset.arkflightHeaderLayout = "true";
}

Hooks.on("renderActorSheet", enhance);
Hooks.on("renderApplicationV2", enhance);
