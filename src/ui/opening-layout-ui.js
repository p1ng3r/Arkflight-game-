function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

const PANEL_PARTS = [
  "corner-top-left",
  "corner-top-right",
  "corner-bottom-left",
  "corner-bottom-right",
  "edge-top",
  "edge-bottom",
  "edge-left",
  "edge-right"
];

function ensurePanelChrome(panel) {
  if (!panel || panel.querySelector(":scope > .arkflight-nine-slice")) return;

  const chrome = document.createElement("span");
  chrome.className = "arkflight-nine-slice";
  chrome.setAttribute("aria-hidden", "true");

  for (const part of PANEL_PARTS) {
    const piece = document.createElement("span");
    piece.className = `arkflight-nine-slice__${part}`;
    chrome.append(piece);
  }

  panel.prepend(chrome);
}

function moveOpeningVignette(root) {
  const artColumn = root.querySelector(".arkflight-opening-art-column");
  const story = root.querySelector(".arkflight-opening-command-column .arkflight-opening-story");
  if (!artColumn || !story) return false;

  let overlay = artColumn.querySelector(".arkflight-opening-art-vignette");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "arkflight-opening-art-vignette";
    const label = document.createElement("div");
    label.className = "arkflight-opening-art-vignette-label";
    label.textContent = "Opening Vignette";
    overlay.append(label);
  }

  if (story.parentElement !== overlay) overlay.append(story);

  const caption = artColumn.querySelector(".arkflight-opening-art-caption");
  if (caption) artColumn.insertBefore(overlay, caption);
  else artColumn.append(overlay);

  return true;
}

function applyOpeningLayout(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return false;

  const board = root.querySelector(".arkflight-opening-grid.arkflight-cinematic-opening");
  const commandColumn = root.querySelector(".arkflight-opening-command-column");
  const sidePanels = root.querySelectorAll(".arkflight-opening-stakes-column .arkflight-opening-side-panel");
  if (!board || !commandColumn || sidePanels.length < 3) return false;

  board.classList.add("arkflight-opening-layout-v2");
  commandColumn.classList.add("arkflight-opening-command-interactive");
  moveOpeningVignette(root);

  for (const panel of sidePanels) {
    panel.classList.add("arkflight-nine-slice-panel");
    ensurePanelChrome(panel);
  }

  return true;
}

function queueOpeningLayout(root) {
  let tries = 0;
  const tick = () => {
    if (applyOpeningLayout(root) || tries >= 14) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  queueOpeningLayout(root);
});
