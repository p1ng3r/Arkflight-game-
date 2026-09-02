const EVENT_BOARD_ID = "arkflight-event-board";

function isHeroicAction(action) {
  return Boolean((action?.skills ?? []).some((skill) => (skill?.riskBids?.length ?? 0) > 0));
}

function actionsForStation(stationId) {
  const controller = game.arkflight?.controller;
  const round = controller?.getRound?.();
  if (!round || !stationId) return [];
  const fallback = globalThis.game?.arkflight?.controller ? null : null;
  // The custom Player Action Board already populated these option values from
  // fallback + authored actions. Resolve labels from the same live event data.
  const authored = round.stationActions?.[stationId] ?? [];
  const all = [...authored];
  try {
    const selectedIds = [...document.querySelectorAll(`select[data-pa-select="action"][data-station="${CSS.escape(stationId)}"] option`)]
      .map((option) => option.value)
      .filter(Boolean);
    for (const id of selectedIds) {
      if (all.some((action) => action?.id === id)) continue;
      const fallbackAction = globalThis.game?.arkflight?.controller?.getRound ? null : null;
      // Fallback actions are not required for Heroic labeling unless they
      // themselves carry risk bids; unresolved IDs are left unchanged.
      if (fallbackAction) all.unshift(fallbackAction);
    }
  } catch (_error) {}
  return all;
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
    option.textContent = isHeroicAction(action) ? `★ HEROIC — ${base}` : base;
  }
}

function relabelAll(root) {
  for (const select of root?.querySelectorAll?.('select[data-pa-select="action"]') ?? []) relabelActionSelect(select);
}

function installObserver(root) {
  if (!root || root.dataset.arkflightHeroicObserver === "1") return;
  root.dataset.arkflightHeroicObserver = "1";
  const observer = new MutationObserver(() => relabelAll(root));
  observer.observe(root, { childList: true, subtree: true });
  relabelAll(root);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== EVENT_BOARD_ID) return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
  if (!root) return;
  requestAnimationFrame(() => installObserver(root));
});
