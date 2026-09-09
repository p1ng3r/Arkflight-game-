const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";
let lastApp = null;

function isCombatStrip(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  const root = app?.element;
  return id === HUD_ID || Boolean(root?.querySelector?.(".afcs-shell"));
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function pct(value, max) {
  const current = Math.max(0, Number(value) || 0);
  const ceiling = Math.max(0, Number(max) || 0);
  return ceiling > 0 ? Math.max(0, Math.min(100, current / ceiling * 100)) : 0;
}

function usableCanvasWidth() {
  const sidebar = document.querySelector("#sidebar") ?? document.querySelector("#ui-right");
  const left = Number(sidebar?.getBoundingClientRect?.().left);
  const rightEdge = Number.isFinite(left) && left > 700 ? left : window.innerWidth;
  return Math.max(960, rightEdge - 44);
}

function fitWindow(app) {
  if (!isCombatStrip(app)) return;
  const width = Math.min(1280, usableCanvasWidth());
  const height = 126;
  const left = Math.max(18, Math.round((usableCanvasWidth() - width) / 2 + 22));
  const top = Math.max(18, window.innerHeight - height - 26);
  try { app.setPosition?.({ width, height, left, top }); }
  catch (error) { console.warn("Arkflight | combat strip final fit failed", error); }
}

function ensureCloseButton(app, strip) {
  if (strip.querySelector("[data-afcs-final-close]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "afcs-final-close";
  button.dataset.afcsFinalClose = "true";
  button.title = "Close Combat Strip";
  button.setAttribute("aria-label", "Close Combat Strip");
  button.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  button.addEventListener("click", () => app.close?.());
  strip.append(button);
}

function buildVital(label, cssClass, value, max) {
  const wrapper = document.createElement("div");
  wrapper.className = `afcs-vital ${cssClass}`;
  const safeValue = Math.max(0, Number(value) || 0);
  const safeMax = Math.max(0, Number(max) || 0);
  wrapper.innerHTML = `<label>${label}</label><div class="afcs-bar"><span style="width:${pct(safeValue, safeMax)}%"></span></div><strong>${safeValue} / ${safeMax}</strong>`;
  return wrapper;
}

function restructureStrip(app) {
  if (!isCombatStrip(app)) return;
  const root = app?.element;
  const shell = root?.querySelector?.(".afcs-shell");
  const strip = shell?.querySelector?.(".afcs-strip");
  if (!shell || !strip) return;
  lastApp = app;

  const ship = strip.querySelector(":scope > .afcs-ship");
  const controls = strip.querySelector(":scope > .afcs-controls");
  const stats = [...strip.querySelectorAll(":scope > .afcs-stat")];
  if (!ship || !controls || stats.length < 6) return;

  let center = strip.querySelector(":scope > .afcs-center");
  if (!center) {
    center = document.createElement("div");
    center.className = "afcs-center";
    const resourceRow = document.createElement("div");
    resourceRow.className = "afcs-resource-row";
    const vitalsRow = document.createElement("div");
    vitalsRow.className = "afcs-vitals-row";
    center.append(resourceRow, vitalsRow);
    strip.insertBefore(center, controls);
    for (const stat of stats) resourceRow.append(stat);
  }

  const vitalsRow = center.querySelector(".afcs-vitals-row");
  if (vitalsRow) {
    vitalsRow.replaceChildren();
    const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
    const resources = shipPayload(actor)?.resources ?? {};
    vitalsRow.append(
      buildVital("Hull", "hull", resources.hull?.value, resources.hull?.max),
      buildVital("Lifeveil", "lifeveil", resources.lifeveil?.value, resources.lifeveil?.max),
      buildVital("Morale", "morale", resources.morale?.value, resources.morale?.max)
    );
  }

  ensureCloseButton(app, strip);
  shell.dataset.afcsFinal = "true";

  requestAnimationFrame(() => requestAnimationFrame(() => fitWindow(app)));
}

Hooks.on("renderApplicationV2", restructureStrip);
Hooks.on("renderApplication", restructureStrip);
Hooks.on("updateActor", () => {
  if (lastApp?.rendered) requestAnimationFrame(() => lastApp.render?.({ force: true }));
});
window.addEventListener("resize", () => {
  if (lastApp?.rendered) requestAnimationFrame(() => fitWindow(lastApp));
});
