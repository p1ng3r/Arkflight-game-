const COMPACTED = new WeakSet();

function isCombatConsole(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  const element = app?.element;
  return id === "arkflight-combat-console"
    || element?.classList?.contains?.("arkflight-combat-console")
    || Boolean(element?.querySelector?.(".afcc-shell"));
}

function applyCompactActionText(app) {
  const root = app?.element;
  if (!root?.querySelectorAll) return;
  const actions = game.arkflight?.combat?.actions ?? {};
  for (const card of root.querySelectorAll("[data-action-card]")) {
    const actionId = card.querySelector("[data-station-action]")?.dataset?.stationAction;
    const action = actionId ? actions[actionId] : null;
    const paragraph = card.querySelector("p");
    if (!action || !paragraph) continue;
    paragraph.textContent = action.summary ?? action.description ?? "";
    paragraph.title = action.description ?? action.summary ?? "";
  }
}

function compactCombatConsole(app) {
  if (!isCombatConsole(app)) return;
  applyCompactActionText(app);
  if (COMPACTED.has(app)) return;
  COMPACTED.add(app);
  try { app.setPosition?.({ width: 860, height: 480 }); }
  catch (_error) { /* CSS still provides the compact layout. */ }
}

Hooks.on("renderApplicationV2", compactCombatConsole);
Hooks.on("renderApplication", compactCombatConsole);
