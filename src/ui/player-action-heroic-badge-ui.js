import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";

const EVENT_BOARD_ID = "arkflight-event-board";

function isHeroicAction(action) {
  return Boolean((action?.skills ?? []).some((skill) => (skill?.riskBids?.length ?? 0) > 0));
}

function actionsForStation(stationId) {
  const controller = game.arkflight?.controller;
  const round = controller?.getRound?.();
  if (!round || !stationId) return [];
  return [FALLBACK_ACTIONS[stationId], ...(round.stationActions?.[stationId] ?? [])].filter(Boolean);
}

function relabelActionSelect(select) {
  const stationId = select?.dataset?.station;
  if (!stationId) return;
  const actions = new Map(actionsForStation(stationId).map((action) => [action.id, action]));
  for (const option of select.options ?? []) {
    if (!option.value) continue;
    const action = actions.get(option.value);
    if (!action) continue;
    const base = String(action.name ?? option.textContent ?? "Action").replace(/^★\s*HEROIC\s*[—-]\s*/i, "");
    const nextLabel = isHeroicAction(action) ? `★ HEROIC — ${base}` : base;
    if (option.textContent !== nextLabel) option.textContent = nextLabel;
  }
}

function relabelAll(root) {
  for (const select of root?.querySelectorAll?.('select[data-pa-select="action"]') ?? []) relabelActionSelect(select);
}

function scheduleRelabel(root) {
  // Player Action Board swaps the base Event Board DOM shortly after render.
  // Use bounded passes instead of a MutationObserver so changing option text
  // can never trigger an infinite mutation/relabel loop and freeze Foundry.
  for (const delay of [0, 50, 150]) setTimeout(() => relabelAll(root), delay);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== EVENT_BOARD_ID) return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
  if (!root) return;
  scheduleRelabel(root);
});
