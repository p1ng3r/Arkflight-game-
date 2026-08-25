const LOGO_PATH = "modules/arkflight-game/assets/ui/branding/arkflight_logo.webp";

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function applyOpeningBranding(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return false;

  const artColumn = root.querySelector(".arkflight-opening-art-column");
  if (!artColumn) return false;

  if (!artColumn.querySelector(".arkflight-opening-brand-logo")) {
    const logo = document.createElement("img");
    logo.className = "arkflight-opening-brand-logo";
    logo.src = LOGO_PATH;
    logo.alt = "Arkflight";
    logo.draggable = false;
    artColumn.append(logo);
  }

  for (const info of root.querySelectorAll(".arkflight-opening-mastery-info")) info.remove();

  const help = root.querySelector(".arkflight-opening-muster-help");
  if (help) {
    help.textContent = "Assign one officer to every station and ready one once-per-Event Mastery. Hover a selected Mastery to see its trigger and effect.";
  }

  return true;
}

function queueBranding(root) {
  let tries = 0;
  const tick = () => {
    if (applyOpeningBranding(root) || tries >= 8) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  queueBranding(root);
});
