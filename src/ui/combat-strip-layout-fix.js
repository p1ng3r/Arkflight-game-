import "./combat-strip-vitals-ui.js";

const HUD_ID = "arkflight-combat-console";
let lastApp = null;

function isCombatStrip(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  const root = app?.element;
  return id === HUD_ID || Boolean(root?.querySelector?.(".afcs-shell"));
}

function ensureVitalsStylesheet() {
  const href = "modules/arkflight-game/styles/combat-strip-vitals.css";
  if (document.querySelector(`link[data-arkflight-combat-vitals]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.arkflightCombatVitals = "true";
  document.head.append(link);
}

function canvasRightEdge() {
  const sidebar = document.querySelector("#sidebar") ?? document.querySelector("#ui-right");
  const left = Number(sidebar?.getBoundingClientRect?.().left);
  return Number.isFinite(left) && left > 700 ? left : window.innerWidth;
}

function fitCombatStrip(app) {
  if (!isCombatStrip(app)) return;
  const root = app?.element;
  if (!root?.querySelector) return;
  lastApp = app;
  ensureVitalsStylesheet();

  const rightEdge = canvasRightEdge();
  const leftEdge = 72;
  const gutter = 18;
  const available = Math.max(760, rightEdge - leftEdge - gutter);
  const width = Math.min(1180, available);
  const height = 146;
  const bottomGap = 82;
  const left = Math.max(leftEdge, Math.round(leftEdge + (available - width) / 2));
  const top = Math.max(24, Math.round(window.innerHeight - height - bottomGap));

  requestAnimationFrame(() => {
    try { app.setPosition?.({ width, height, left, top }); }
    catch (error) { console.warn("Arkflight combat strip layout fit failed", error); }
  });
}

Hooks.on("renderApplicationV2", fitCombatStrip);
Hooks.on("renderApplication", fitCombatStrip);
window.addEventListener("resize", () => {
  if (lastApp?.rendered) requestAnimationFrame(() => fitCombatStrip(lastApp));
});
Hooks.once("ready", ensureVitalsStylesheet);
