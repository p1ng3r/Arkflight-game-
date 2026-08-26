function rootElement(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function decorateLock(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return;
  const button = root.querySelector(".arkflight-opening-begin");
  if (!button) return;

  button.querySelector(".arkflight-opening-lock-icon")?.remove();

  const icon = document.createElement("span");
  icon.className = `arkflight-opening-lock-icon ${button.disabled ? "unlocked" : "locked"}`;
  icon.setAttribute("aria-hidden", "true");
  button.prepend(icon);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  if (!root) return;
  setTimeout(() => decorateLock(root), 90);
});
