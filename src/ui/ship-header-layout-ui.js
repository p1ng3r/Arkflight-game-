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

function portraitStack(header) {
  let stack = header.querySelector(":scope > .arkflight-ship-portrait-stack");
  if (stack) return stack;
  const portrait = header.querySelector(":scope > .arkflight-ship-portrait-frame, :scope > .arkflight-ship-portrait");
  if (!portrait) return null;
  stack = document.createElement("div");
  stack.className = "arkflight-ship-portrait-stack";
  portrait.before(stack);
  stack.append(portrait);
  return stack;
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

function actionStack(header, identity, headerActions) {
  let stack = header.querySelector(":scope > .arkflight-ship-readiness-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "arkflight-ship-readiness-stack";
    identity?.insertAdjacentElement("afterend", stack);
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

  const stack = portraitStack(header);
  const xp = root.querySelector("[data-ship-xp]");
  if (stack && xp && xp.parentElement !== stack) stack.append(xp);

  const identity = header.querySelector(":scope > .arkflight-ship-identity");
  const headerActions = header.querySelector(":scope > .arkflight-ship-header-actions");
  const readinessStack = actionStack(header, identity, headerActions);
  const status = root.querySelector("[data-operational-status-root]");
  if (readinessStack && status && status.parentElement !== header) readinessStack.insertAdjacentElement("afterend", status);

  const levelButton = root.querySelector(".arkflight-progression-launch, [data-action='arkflight-progression']");
  progressionButtonState(actor, levelButton);
  root.dataset.arkflightHeaderLayout = "true";
}

Hooks.on("renderActorSheet", enhance);
Hooks.on("renderApplicationV2", enhance);
