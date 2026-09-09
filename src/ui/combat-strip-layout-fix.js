const HUD_ID = "arkflight-combat-console";
let lastApp = null;

function isCombatStrip(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  const root = app?.element;
  return id === HUD_ID || Boolean(root?.querySelector?.(".afcs-shell"));
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

  const rightEdge = canvasRightEdge();
  const leftEdge = 76;
  const gutter = 24;
  const available = Math.max(760, rightEdge - leftEdge - gutter);
  const width = Math.min(1040, available);
  const anyDrawer = Boolean(root.querySelector(".afcs-drawer.is-open"));
  const logDrawer = Boolean(root.querySelector(".afcs-drawer-log.is-open"));
  const height = logDrawer ? 410 : anyDrawer ? 560 : 145;
  const bottomGap = 82;
  const left = Math.max(leftEdge, Math.round(leftEdge + (available - width) / 2));
  const top = Math.max(36, Math.round(window.innerHeight - height - bottomGap));

  try { app.setPosition?.({ width, height, left, top }); }
  catch (error) { console.warn("Arkflight combat strip layout fit failed", error); }
}

Hooks.on("renderApplicationV2", fitCombatStrip);
Hooks.on("renderApplication", fitCombatStrip);
window.addEventListener("resize", () => {
  if (lastApp?.rendered) requestAnimationFrame(() => fitCombatStrip(lastApp));
});
