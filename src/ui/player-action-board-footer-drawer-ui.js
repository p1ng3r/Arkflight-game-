const BOARD_ID = "arkflight-event-board";

function boardRoot(app, element) {
  if (app?.id !== BOARD_ID) return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function installFooterDrawer(app, root) {
  const footer = root?.querySelector?.(".pa-footer");
  if (!footer) return;

  let toggle = footer.querySelector("[data-pa-footer-drawer]");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pa-footer-drawer-toggle";
    toggle.dataset.paFooterDrawer = "true";
    footer.prepend(toggle);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      app._arkflightFooterCollapsed = !footer.classList.contains("pa-footer-collapsed");
      applyFooterState(app, footer, toggle);
    });
  }

  applyFooterState(app, footer, toggle);
}

function applyFooterState(app, footer, toggle) {
  const collapsed = Boolean(app?._arkflightFooterCollapsed);
  footer.classList.toggle("pa-footer-collapsed", collapsed);
  toggle.innerHTML = collapsed
    ? '<i class="fa-solid fa-chevron-up"></i><span>Show Crew Tools</span>'
    : '<i class="fa-solid fa-chevron-down"></i><span>Collapse Crew Tools</span>';
  toggle.title = collapsed
    ? "Show Ship Abilities, Crew Tactics, Round Scoring, and Lock Plan."
    : "Collapse the Crew Tools row to make more room for station planning.";
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  requestAnimationFrame(() => installFooterDrawer(app, boardRoot(app, app.element) ?? root));
});
