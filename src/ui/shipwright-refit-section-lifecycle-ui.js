const MODULE_ID = "arkflight-game";

function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function shipActor(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function validRefitSheet(app, root) {
  const actor = shipActor(app);
  return Boolean(root?.querySelector(".arkflight-commissioning-shell") && actor?.flags?.[MODULE_ID]?.ship);
}

function replayRefitRenderHooks(app) {
  // Shipwright bays are built lazily when a sub-section is selected. The Refit Alpha
  // decorators may therefore have run before the selected bay existed. Replaying the
  // normal actor-sheet render hooks after the bay's own RAF work has completed lets
  // every idempotent Refit layer decorate the newly-created DOM without forcing an
  // application rerender or mutating vessel state.
  const html = app?.element ?? null;
  Hooks.callAll("renderActorSheet", app, html);
}

function wire(app, html) {
  const root = rootElement(app, html);
  if (!validRefitSheet(app, root) || root.dataset.refitSectionLifecycleWired === "true") return;
  root.dataset.refitSectionLifecycleWired = "true";

  root.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-shipwright-section]");
    if (!button) return;
    const section = button.dataset.shipwrightSection;
    if (!["engine-mods", "ship-mods"].includes(section)) return;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const currentRoot = rootElement(app, app?.element);
      if (!validRefitSheet(app, currentRoot)) return;
      replayRefitRenderHooks(app);
    }));
  }, true);
}

Hooks.on("renderApplicationV2", wire);
Hooks.on("renderActorSheet", wire);
