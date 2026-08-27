function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function ensureFrameCorner(board, suffix) {
  const className = `arkflight-opening-frame-corner--${suffix}`;
  if (board.querySelector(`.${className}`)) return;

  const corner = document.createElement("span");
  corner.className = `arkflight-opening-frame-corner ${className}`;
  corner.setAttribute("aria-hidden", "true");
  board.append(corner);
}

function applyOpeningChrome(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return false;

  const board = root.querySelector(".arkflight-opening-grid.arkflight-cinematic-opening");
  if (!board) return false;

  ensureFrameCorner(board, "tl");
  ensureFrameCorner(board, "tr");
  ensureFrameCorner(board, "br");
  ensureFrameCorner(board, "bl");
  return true;
}

function queueOpeningChrome(root) {
  let tries = 0;
  const tick = () => {
    if (applyOpeningChrome(root) || tries >= 8) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  queueOpeningChrome(root);
});
