import { getMasteryTechnique } from "../content/base-mastery.js";
import { stationPresentation } from "./station-presentation.js";

const BOARD_ID = "arkflight-event-board";
const STYLE_ID = "arkflight-inline-mastery-style";

function rootFor(app, element) {
  if (app?.id !== BOARD_ID) return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function stationName(id) {
  return stationPresentation(id)?.displayName ?? String(id ?? "Station").replaceAll("-", " ");
}

function areaName(id) {
  return String(id ?? "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ownerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

function canResolveWindow(state, window) {
  if (game.user?.isGM) return true;
  const actorId = state?.assignments?.[window?.stationId]?.actorId;
  const actor = actorId ? game.actors?.get(actorId) : null;
  return Boolean(actor?.testUserPermission?.(game.user, ownerLevel()) || actor?.isOwner);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .arkflight-pending-mastery-panel { margin: 14px 0; border: 1px solid #a16e28; background: linear-gradient(180deg,rgba(45,31,12,.92),rgba(17,17,14,.96)); box-shadow: inset 0 0 0 1px rgba(227,181,89,.08); padding: 12px; }
    .arkflight-pending-mastery-head { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:10px; }
    .arkflight-pending-mastery-head strong { color:#f0c86f; letter-spacing:.11em; font-size:13px; }
    .arkflight-pending-mastery-head span { color:#d8c9a5; font-size:11px; }
    .arkflight-pending-mastery-card { border:1px solid rgba(202,154,73,.48); background:rgba(6,9,11,.72); padding:10px; margin-top:8px; }
    .arkflight-pending-mastery-card header { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
    .arkflight-pending-mastery-card header i { color:#e8bb54; }
    .arkflight-pending-mastery-card header strong { color:#f0d596; font-size:14px; }
    .arkflight-pending-mastery-card header small { margin-left:auto; color:#b99c64; text-transform:uppercase; }
    .arkflight-pending-mastery-card p { margin:5px 0 8px; color:#ddd0ae; line-height:1.35; }
    .arkflight-pending-mastery-trigger { color:#b99759; font-size:10px; text-transform:uppercase; letter-spacing:.06em; }
    .arkflight-pending-mastery-fields { display:grid; grid-template-columns:repeat(2,minmax(180px,1fr)); gap:8px; margin:8px 0; }
    .arkflight-pending-mastery-fields label { display:flex; flex-direction:column; gap:4px; color:#bda66f; font-size:10px; font-weight:700; text-transform:uppercase; }
    .arkflight-pending-mastery-fields select { min-height:30px; background:#0c1012; color:#ead9ad; border:1px solid #66502d; }
    .arkflight-pending-mastery-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:9px; }
    .arkflight-pending-mastery-actions button { min-height:32px; padding:5px 12px; border:1px solid #765527; background:#141512; color:#d7c08c; font-weight:700; }
    .arkflight-pending-mastery-actions button[data-inline-mastery-use] { border-color:#b47c28; color:#f0ce82; background:#2a1d0c; }
    .arkflight-pending-mastery-waiting { color:#b9aa88; font-style:italic; font-size:11px; }
    .arkflight-round-continue[data-mastery-blocked] button { opacity:.45; pointer-events:none; }
    @media(max-width:800px){ .arkflight-pending-mastery-fields { grid-template-columns:1fr; } }
  `;
  document.head.append(style);
}

function choiceFields(window) {
  const areas = [...(window?.areas ?? window?.pressureSystems ?? [])];
  if (window.masteryId === "engineer-crosswire-the-systems") {
    const sources = areas.length ? areas : ["hull", "arkengine", "rigging", "lifeveil"];
    return `<div class="arkflight-pending-mastery-fields">
      <label>Threatened Area<select data-inline-mastery-from>${sources.map((id) => `<option value="${id}">${areaName(id)}</option>`).join("")}</select></label>
      <label>Redirect To<select data-inline-mastery-to>${["hull","arkengine","rigging","lifeveil"].map((id) => `<option value="${id}">${areaName(id)}</option>`).join("")}</select></label>
    </div>`;
  }
  if (window.masteryId === "veilwarden-stand-between") {
    const sources = areas.length ? areas : ["hull", "arkengine", "rigging"];
    return `<div class="arkflight-pending-mastery-fields"><label>Threatened Area<select data-inline-mastery-from>${sources.map((id) => `<option value="${id}">${areaName(id)}</option>`).join("")}</select></label></div>`;
  }
  return "";
}

function masteryCard(window, state) {
  const mastery = getMasteryTechnique(window.stationId, window.masteryId);
  if (!mastery) return "";
  const canResolve = canResolveWindow(state, window);
  const sourceResult = window.sourceStationId ? state.results?.[window.sourceStationId] : null;
  let context = mastery.description;
  if (window.masteryId === "captain-not-like-this" && sourceResult) {
    context = `${stationName(window.sourceStationId)} rolled ${String(sourceResult.degreeKey ?? "failure").replace(/([A-Z])/g," $1")}. ${mastery.description}`;
  }
  return `<article class="arkflight-pending-mastery-card" data-inline-mastery-card data-window-id="${window.id}" data-station-id="${window.stationId}" data-mastery-id="${window.masteryId}" data-source-station-id="${window.sourceStationId ?? ""}">
    <header><i class="fa-solid fa-star"></i><strong>${mastery.name}</strong><small>${stationName(window.stationId)}</small></header>
    <div class="arkflight-pending-mastery-trigger">Trigger: ${mastery.triggerLabel}</div>
    <p>${context}</p>
    ${choiceFields(window)}
    ${canResolve ? `<div class="arkflight-pending-mastery-actions"><button type="button" data-inline-mastery-dismiss><i class="fa-solid fa-forward"></i> Decline</button><button type="button" data-inline-mastery-use><i class="fa-solid fa-star"></i> Use Mastery</button></div>` : `<div class="arkflight-pending-mastery-waiting">Waiting for ${stationName(window.stationId)} or the GM to resolve this Mastery decision.</div>`}
  </article>`;
}

async function useWindow(controller, card) {
  const station = card.dataset.stationId;
  const masteryId = card.dataset.masteryId;
  const windowId = card.dataset.windowId;
  const sourceStationId = card.dataset.sourceStationId || null;
  const options = {};
  if (sourceStationId) options.sourceStationId = sourceStationId;
  if (masteryId === "engineer-crosswire-the-systems") {
    const fromArea = card.querySelector("[data-inline-mastery-from]")?.value;
    const toArea = card.querySelector("[data-inline-mastery-to]")?.value;
    if (!fromArea || !toArea || fromArea === toArea) throw new Error("Crosswire the Systems requires two different ship Areas.");
    options.fromArea = fromArea;
    options.toArea = toArea;
  }
  if (masteryId === "veilwarden-stand-between") {
    const fromArea = card.querySelector("[data-inline-mastery-from]")?.value;
    if (!fromArea) throw new Error("Choose the threatened Area for Stand Between.");
    options.fromArea = fromArea;
  }
  await controller.command({ type: "use-mastery", station, windowId, options });
}

async function dismissWindow(controller, card) {
  await controller.command({ type: "dismiss-mastery-window", station: card.dataset.stationId, windowId: card.dataset.windowId });
}

function installInlinePanel(root) {
  const controller = game.arkflight?.controller;
  const state = controller?.state;
  if (!root || !controller || state?.phase !== "round-result") return;
  root.querySelector("[data-inline-mastery-panel]")?.remove();
  const windows = [...(state.pendingMasteryWindows ?? [])];
  const continueWrap = root.querySelector(".arkflight-round-continue");
  if (!windows.length) {
    continueWrap?.removeAttribute("data-mastery-blocked");
    return;
  }
  const report = root.querySelector(".arkflight-round-result-panel");
  if (!report) return;
  ensureStyles();
  const panel = document.createElement("section");
  panel.className = "arkflight-pending-mastery-panel";
  panel.dataset.inlineMasteryPanel = "true";
  panel.innerHTML = `<div class="arkflight-pending-mastery-head"><strong><i class="fa-solid fa-triangle-exclamation"></i> MASTERY DECISION REQUIRED</strong><span>Resolve or decline before advancing the round.</span></div>${windows.map((window) => masteryCard(window, state)).join("")}`;
  if (continueWrap) {
    continueWrap.dataset.masteryBlocked = "true";
    report.insertBefore(panel, continueWrap);
  } else report.append(panel);

  for (const card of panel.querySelectorAll("[data-inline-mastery-card]")) {
    card.querySelector("[data-inline-mastery-use]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await useWindow(controller, card); }
      catch (error) { console.error("Arkflight | Inline Mastery use failed", error); ui.notifications?.warn(error.message); }
    });
    card.querySelector("[data-inline-mastery-dismiss]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      try { await dismissWindow(controller, card); }
      catch (error) { console.error("Arkflight | Inline Mastery dismiss failed", error); ui.notifications?.warn(error.message); }
    });
  }
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootFor(app, element);
  if (!root) return;
  queueMicrotask(() => installInlinePanel(root));
});
