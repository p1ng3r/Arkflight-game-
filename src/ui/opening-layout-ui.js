function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

const LOGO_PATH = "modules/arkflight-game/assets/ui/branding/arkflight_logo_Simple.webp";

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

const PANEL_NAMES = ["stakes", "hazards", "scoring"];

function ensurePanelChrome(panel) {
  if (!panel || panel.querySelector(":scope > .arkflight-nine-slice")) return;

  const chrome = document.createElement("span");
  chrome.className = "arkflight-nine-slice";
  chrome.setAttribute("aria-hidden", "true");

  for (const part of PANEL_PARTS) {
    const piece = document.createElement("span");
    piece.className = `arkflight-nine-slice__${part}`;
    piece.dataset.afFramePart = part;
    chrome.append(piece);
  }

  panel.prepend(chrome);
}

function ensureOpeningLogo(artColumn) {
  if (!artColumn) return false;
  let logo = artColumn.querySelector(".arkflight-opening-brand-logo");
  if (!logo) {
    logo = document.createElement("img");
    logo.className = "arkflight-opening-brand-logo";
    logo.alt = "Arkflight";
    logo.draggable = false;
    artColumn.append(logo);
  }
  if (logo.getAttribute("src") !== LOGO_PATH) logo.src = LOGO_PATH;
  return true;
}

function openingVignetteText() {
  const controller = game.arkflight?.controller;
  const event = controller?.getEvent?.();
  return String(event?.openingVignette ?? "").trim();
}

function moveOpeningVignette(root) {
  const artColumn = root.querySelector(".arkflight-opening-art-column");
  if (!artColumn) return false;

  let story = root.querySelector(".arkflight-opening-command-column .arkflight-opening-story")
    ?? artColumn.querySelector(".arkflight-opening-art-vignette .arkflight-opening-story");

  if (!story) {
    const text = openingVignetteText();
    if (!text) return false;
    story = document.createElement("div");
    story.className = "arkflight-opening-story";
    story.textContent = text;
  }

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
  if (overlay.parentElement !== artColumn) {
    if (caption) artColumn.insertBefore(overlay, caption);
    else artColumn.append(overlay);
  }

  return true;
}

function applyOpeningLayout(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return false;

  const board = root.querySelector(".arkflight-opening-grid.arkflight-cinematic-opening");
  const artColumn = root.querySelector(".arkflight-opening-art-column");
  const commandColumn = root.querySelector(".arkflight-opening-command-column");
  const sidePanels = [...root.querySelectorAll(".arkflight-opening-stakes-column .arkflight-opening-side-panel")];
  if (!board || !artColumn || !commandColumn || sidePanels.length < 3) return false;

  board.classList.add("arkflight-opening-layout-v2");
  commandColumn.classList.add("arkflight-opening-command-interactive");
  ensureOpeningLogo(artColumn);
  moveOpeningVignette(root);

  sidePanels.slice(0, 3).forEach((panel, index) => {
    panel.classList.add("arkflight-nine-slice-panel");
    panel.dataset.afPanel = PANEL_NAMES[index];
    ensurePanelChrome(panel);
  });

  const begin = root.querySelector(".arkflight-opening-begin");
  if (begin) begin.dataset.afAsset = "begin-button";

  for (const corner of root.querySelectorAll(".arkflight-opening-frame-corner")) {
    corner.dataset.afAsset = [...corner.classList].find((name) => name.startsWith("arkflight-opening-frame-corner--"))?.split("--")[1] ?? "corner";
  }

  return true;
}

function queueOpeningLayout(root) {
  let tries = 0;
  const tick = () => {
    if (applyOpeningLayout(root) || tries >= 30) return;
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
