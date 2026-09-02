import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";

function actionIsHeroic(action) {
  return Boolean((action?.skills ?? []).some((skill) => (skill?.riskBids?.length ?? 0) > 0));
}

function actionMapFor(stationId) {
  const controller = game.arkflight?.controller;
  const round = controller?.getRound?.();
  if (!round || !stationId) return new Map();
  const fallback = FALLBACK_ACTIONS[stationId];
  const actions = [fallback, ...(round.stationActions?.[stationId] ?? [])].filter(Boolean);
  return new Map(actions.map((action) => [String(action.id), action]));
}

function decorateHeroicActionSelects(root) {
  if (!root) return;
  for (const select of root.querySelectorAll?.('.pa-detail select[data-pa-select="action"]') ?? []) {
    const stationId = select.dataset.station;
    const actions = actionMapFor(stationId);
    for (const option of select.options ?? []) {
      if (!option.value) continue;
      const action = actions.get(String(option.value));
      if (!action) continue;
      const prefix = actionIsHeroic(action) ? "★ HEROIC — " : "";
      const expected = `${prefix}${action.name ?? option.textContent ?? "Action"}`;
      if (option.textContent !== expected) option.textContent = expected;
    }
    select.title = "★ HEROIC marks an action with at least one PF2e skill that supports a Risk Bid.";
  }
}

function eventBoardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = eventBoardRoot(app, element);
  if (!root) return;
  // The player-action-board renderer also runs on this hook. Defer one frame so
  // its rebuilt planning UI exists before we label the native action select.
  requestAnimationFrame(() => decorateHeroicActionSelects(eventBoardRoot(app, app.element) ?? root));
});
