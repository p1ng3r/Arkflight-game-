import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";

const EVENT_BOARD_ID = "arkflight-event-board";
const HEROIC_PREFIX = "★ HEROIC — ";

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
  if (!stationId) return false;

  const actions = new Map(actionsForStation(stationId).map((action) => [action.id, action]));
  let changed = false;
  for (const option of select.options ?? []) {
    if (!option.value) continue;
    const action = actions.get(option.value);
    if (!action) continue;

    const base = String(action.name ?? option.textContent ?? "Action")
      .replace(/^★\s*HEROIC\s*[—-]\s*/i, "");
    const nextLabel = isHeroicAction(action) ? `${HEROIC_PREFIX}${base}` : base;
    if (option.textContent !== nextLabel) {
      option.textContent = nextLabel;
      changed = true;
    }
  }
  return changed;
}

function relabelAll(root) {
  let found = 0;
  for (const select of root?.querySelectorAll?.('select[data-pa-select="action"]') ?? []) {
    found += 1;
    relabelActionSelect(select);
  }
  return found;
}

function scheduleRelabel(root) {
  // Multiple Arkflight UI layers replace the Event Board DOM after the base
  // ApplicationV2 render hook. A short bounded polling window survives those
  // swaps without using MutationObserver (which previously caused a freeze).
  let passes = 0;
  const maxPasses = 30;
  const timer = setInterval(() => {
    passes += 1;
    relabelAll(root);
    if (passes >= maxPasses || !root.isConnected) clearInterval(timer);
  }, 100);

  // Also run immediately so already-rendered/resumed boards update at once.
  relabelAll(root);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== EVENT_BOARD_ID) return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
  if (!root) return;
  scheduleRelabel(root);
});
