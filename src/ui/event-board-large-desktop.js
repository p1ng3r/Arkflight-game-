const TARGET_WIDTH = 1720;
const TARGET_HEIGHT = 940;
const HORIZONTAL_MARGIN = 96;
const VERTICAL_MARGIN = 110;
const MIN_WIDTH = 1100;
const MIN_HEIGHT = 760;
const LARGE_WIDTH = 1380;
const LARGE_HEIGHT = 820;

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function desiredBoardRect() {
  const viewportWidth = Math.max(0, Number(globalThis.innerWidth ?? document.documentElement?.clientWidth ?? TARGET_WIDTH));
  const viewportHeight = Math.max(0, Number(globalThis.innerHeight ?? document.documentElement?.clientHeight ?? TARGET_HEIGHT));

  const width = Math.max(MIN_WIDTH, Math.min(TARGET_WIDTH, viewportWidth - HORIZONTAL_MARGIN));
  const height = Math.max(MIN_HEIGHT, Math.min(TARGET_HEIGHT, viewportHeight - VERTICAL_MARGIN));
  const left = Math.max(24, Math.round((viewportWidth - width) / 2));
  const top = Math.max(24, Math.round((viewportHeight - height) / 2));

  return { width, height, left, top };
}

function applyBoardScaleClass(root, rect) {
  if (!root?.classList) return;
  const large = rect.width >= LARGE_WIDTH && rect.height >= LARGE_HEIGHT;
  root.classList.toggle("arkflight-large-desktop", large);
  root.classList.toggle("arkflight-compact-desktop", !large);
}

function applyBoardSize(app, root) {
  const rect = desiredBoardRect();
  const key = `${rect.width}x${rect.height}@${rect.left},${rect.top}`;
  applyBoardScaleClass(root, rect);
  if (root?.dataset?.arkflightLargeDesktop === key) return;

  try {
    if (typeof app.setPosition === "function") {
      app.setPosition(rect);
    } else if (root) {
      root.style.setProperty("width", `${rect.width}px`, "important");
      root.style.setProperty("height", `${rect.height}px`, "important");
      root.style.setProperty("left", `${rect.left}px`, "important");
      root.style.setProperty("top", `${rect.top}px`, "important");
    }
    if (root?.dataset) root.dataset.arkflightLargeDesktop = key;
  } catch (error) {
    console.warn("Arkflight | Could not apply large desktop Event Board sizing", error);
  }
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  requestAnimationFrame(() => applyBoardSize(app, root));
});

window.addEventListener("resize", () => {
  const app = Object.values(ui?.windows ?? {}).find((entry) => entry?.id === "arkflight-event-board");
  const root = app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
  if (!app || !root) return;
  delete root.dataset.arkflightLargeDesktop;
  applyBoardSize(app, root);
});
