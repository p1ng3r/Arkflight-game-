const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";

function isCombatStrip(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  return id === HUD_ID || Boolean(app?.element?.querySelector?.(".afcs-shell"));
}

function safeResource(resource, fallbackMax = 0) {
  const value = Math.max(0, Number(resource?.value) || 0);
  const max = Math.max(0, Number(resource?.max) || fallbackMax || 0);
  const pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  return { value, max, pct };
}

function vitalMarkup(label, icon, value, tone) {
  return `
    <div class="afcs-vital is-${tone}" title="${label}: ${value.value} / ${value.max}">
      <div class="afcs-vital-head"><i class="${icon}"></i><span>${label}</span><strong>${value.value}/${value.max}</strong></div>
      <div class="afcs-vital-track"><i style="--afcs-vital-pct:${value.pct}%"></i></div>
    </div>`;
}

function decorateVitals(app) {
  if (!isCombatStrip(app)) return;
  const root = app?.element;
  const strip = root?.querySelector?.(".afcs-strip");
  const actor = app?.actor ?? null;
  const ship = actor?.flags?.[MODULE_ID]?.ship ?? null;
  if (!strip || !ship) return;

  const hull = safeResource(ship.resources?.hull);
  const lifeveil = safeResource(ship.resources?.lifeveil);
  const morale = safeResource(ship.resources?.morale, 100);

  let vitals = strip.querySelector(".afcs-vitals");
  if (!vitals) {
    vitals = document.createElement("div");
    vitals.className = "afcs-vitals";
    const round = strip.querySelector(".afcs-stat");
    strip.insertBefore(vitals, round ?? strip.querySelector(".afcs-controls") ?? null);
  }
  vitals.innerHTML = [
    vitalMarkup("Hull", "fa-solid fa-shield-halved", hull, "hull"),
    vitalMarkup("Lifeveil", "fa-solid fa-droplet", lifeveil, "lifeveil"),
    vitalMarkup("Morale", "fa-solid fa-flag", morale, "morale")
  ].join("");

  requestAnimationFrame(() => fitWindowToVisibleStrip(app));
}

function fitWindowToVisibleStrip(app) {
  if (!isCombatStrip(app)) return;
  const root = app?.element;
  const strip = root?.querySelector?.(".afcs-strip");
  if (!root || !strip) return;

  const header = root.querySelector(".window-header");
  const stripRect = strip.getBoundingClientRect();
  const headerHeight = Math.ceil(header?.getBoundingClientRect?.().height || 30);
  const width = Math.ceil(stripRect.width);
  const collapsedHeight = Math.ceil(stripRect.height) + headerHeight + 2;
  const hasDrawer = Boolean(root.querySelector(".afcs-drawer.is-open"));

  root.classList.toggle("afcs-has-drawer", hasDrawer);
  if (!hasDrawer) {
    try { app.setPosition?.({ width, height: collapsedHeight }); }
    catch (_error) { /* visual CSS still removes excess chrome */ }
  }
}

Hooks.on("renderApplicationV2", decorateVitals);
Hooks.on("renderApplication", decorateVitals);
