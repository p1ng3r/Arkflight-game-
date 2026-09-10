import "../foundry/combat-flow-usability.js";
import "./combat-flow-hud-ui.js";
import { firingArcsVisible, toggleFiringArcs } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";
const userMoved = new WeakSet();
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

function canvasRightEdge() {
  const sidebar = document.querySelector("#sidebar") ?? document.querySelector("#ui-right");
  const left = Number(sidebar?.getBoundingClientRect?.().left);
  return Number.isFinite(left) && left > 700 ? left : window.innerWidth;
}

function desiredGeometry() {
  const rightEdge = canvasRightEdge();
  const leftPad = 28;
  const rightPad = 28;
  const available = Math.max(760, rightEdge - leftPad - rightPad);
  const width = Math.min(1280, available);
  const height = 132;
  const left = Math.max(18, Math.round((rightEdge - width) / 2));
  const top = Math.max(18, Math.round(window.innerHeight - height - 116));
  return { width, height, left, top };
}

function fitWindow(app, { forcePosition = false } = {}) {
  if (!isCombatStrip(app)) return;
  const geometry = desiredGeometry();
  if (userMoved.has(app) && !forcePosition) {
    const rect = app.element?.getBoundingClientRect?.();
    if (!rect) return;
    const maxLeft = Math.max(8, canvasRightEdge() - geometry.width - 8);
    const maxTop = Math.max(8, window.innerHeight - geometry.height - 108);
    const left = Math.max(8, Math.min(maxLeft, rect.left));
    const top = Math.max(8, Math.min(maxTop, rect.top));
    try { app.setPosition?.({ width: geometry.width, height: geometry.height, left, top }); }
    catch (error) { console.warn("Arkflight | combat HUD clamp failed", error); }
    return;
  }
  try { app.setPosition?.(geometry); }
  catch (error) { console.warn("Arkflight | combat HUD fit failed", error); }
}

function ensureCloseButton(app, strip) {
  if (strip.querySelector("[data-afcs-final-close]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "afcs-final-close";
  button.dataset.afcsFinalClose = "true";
  button.title = "Close Combat HUD";
  button.setAttribute("aria-label", "Close Combat HUD");
  button.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    app.close?.();
  });
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

function combatantForApp(app) {
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.actorId === actor.id)
    ?? null;
}

function populateVitals(app, strip) {
  const vitalsRow = strip.querySelector(".afcs-vitals-row");
  if (!vitalsRow) return;
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  const resources = shipPayload(actor)?.resources ?? {};
  const combatant = combatantForApp(app);
  const state = combatant ? game.arkflight?.combat?.state?.(combatant) : null;
  const strainValue = state?.strain?.value ?? resources.strain?.value;
  const strainMax = state?.strain?.max ?? resources.strain?.max;
  vitalsRow.replaceChildren(
    buildVital("Hull", "hull", resources.hull?.value, resources.hull?.max),
    buildVital("Lifeveil", "lifeveil", resources.lifeveil?.value, resources.lifeveil?.max),
    buildVital("Morale", "morale", resources.morale?.value, resources.morale?.max),
    buildVital("Strain", "strain", strainValue, strainMax),
    buildVital("Supplies", "supplies", resources.supply?.value ?? resources.supplies?.value, resources.supply?.max ?? resources.supplies?.max)
  );
}

function syncArcButtons(root, combatant) {
  const visible = firingArcsVisible(combatant);
  for (const button of root.querySelectorAll("[data-toggle-all-arcs]")) {
    button.classList.toggle("is-active", visible);
    button.setAttribute("aria-pressed", String(visible));
    button.innerHTML = `<i class="fa-solid fa-wave-square"></i> ${visible ? "Hide Arcs" : "Show Arcs"}`;
  }
}

function bindArcButtons(app, root) {
  const combatant = combatantForApp(app);
  syncArcButtons(root, combatant);
  for (const button of root.querySelectorAll("[data-toggle-all-arcs]")) {
    if (button.dataset.afcsUnifiedArcs === "true") continue;
    button.dataset.afcsUnifiedArcs = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = combatantForApp(app);
      const state = current ? game.arkflight?.combat?.state?.(current) : null;
      if (!current || !state) return ui.notifications?.warn("This Arkflight ship must be in active Foundry combat to show weapon arcs.");
      if (!Object.keys(state.weapons ?? {}).length) return ui.notifications?.warn(`${current.name} has no installed combat weapons to display.`);
      toggleFiringArcs(current);
      syncArcButtons(root, current);
    }, { capture: true });
  }
}

function enableDrag(app, strip) {
  const handle = strip.querySelector(":scope > .afcs-ship");
  if (!handle || handle.dataset.afcsDragReady === "true") return;
  handle.dataset.afcsDragReady = "true";
  handle.classList.add("afcs-drag-handle");
  handle.title = "Drag Arkflight combat HUD";
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, input, select, textarea, a")) return;
    const rect = app.element?.getBoundingClientRect?.();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    userMoved.add(app);
    handle.classList.add("is-dragging");
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    const pointerId = event.pointerId;
    try { handle.setPointerCapture?.(pointerId); } catch (_error) { /* optional */ }
    const move = (moveEvent) => {
      const maxLeft = Math.max(8, canvasRightEdge() - rect.width - 8);
      const maxTop = Math.max(8, window.innerHeight - rect.height - 108);
      const left = Math.max(8, Math.min(maxLeft, startLeft + moveEvent.clientX - startX));
      const top = Math.max(8, Math.min(maxTop, startTop + moveEvent.clientY - startY));
      try { app.setPosition?.({ left, top }); } catch (_error) { /* convenience */ }
    };
    const stop = () => {
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      try { handle.releasePointerCapture?.(pointerId); } catch (_error) { /* optional */ }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
}

function enhanceStrip(app) {
  if (!isCombatStrip(app)) return;
  const root = app?.element;
  const shell = root?.querySelector?.(".afcs-shell");
  const strip = shell?.querySelector?.(".afcs-strip");
  if (!root || !shell || !strip) return;
  lastApp = app;
  shell.dataset.afcsFinal = "true";
  populateVitals(app, strip);
  ensureCloseButton(app, strip);
  enableDrag(app, strip);
  bindArcButtons(app, root);
  requestAnimationFrame(() => fitWindow(app, { forcePosition: !userMoved.has(app) }));
}

Hooks.on("renderApplicationV2", enhanceStrip);
Hooks.on("renderApplication", enhanceStrip);
Hooks.on("updateActor", () => { if (lastApp?.rendered) requestAnimationFrame(() => lastApp.render?.({ force: true })); });
window.addEventListener("resize", () => { if (lastApp?.rendered) requestAnimationFrame(() => fitWindow(lastApp)); });
