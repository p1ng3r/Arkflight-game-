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
  const leftEdge = 82;
  const gutter = 22;
  const available = Math.max(720, rightEdge - leftEdge - gutter);
  const width = Math.min(980, available);
  const stationsOpen = Boolean(root.querySelector(".afcs-drawer-stations.is-open"));
  const weaponsOpen = Boolean(root.querySelector(".afcs-drawer-weapons.is-open"));
  const logOpen = Boolean(root.querySelector(".afcs-drawer-log.is-open"));
  const height = logOpen ? 390 : (stationsOpen || weaponsOpen) ? 540 : 170;
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
