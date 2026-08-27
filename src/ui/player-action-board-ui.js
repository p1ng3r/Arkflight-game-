import { FALLBACK_ACTIONS } from "../content/fallback-actions.js";
import { getRiskBenefit } from "../content/risk-benefits.js";
import { getMasteryTechnique } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { STATIONS } from "../event/event-schema.js";
import { planningReady, planningSecondsRemaining } from "../event/planning-state.js";
import { checkAdjustments } from "../event/round-runtime.js";
import { stationPresentation } from "./station-presentation.js";

const MODULE_ID = "arkflight-game";
let focusedStation = "engineer";
let timerHandle = null;

const AREA_LABELS = Object.freeze({ hull: "Hull", arkengine: "Arkengine", rigging: "Rigging", lifeveil: "Lifeveil", morale: "Morale" });
const AREA_ICONS = Object.freeze({ hull: "fa-shield-halved", arkengine: "fa-gear", rigging: "fa-anchor", lifeveil: "fa-shield", morale: "fa-sun" });

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function signed(value) { const n = Number(value ?? 0); return n > 0 ? `+${n}` : String(n); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value ?? 0))); }
function moduleAsset(path) { if (!path) return ""; if (/^(https?:|data:|modules\/)/.test(path)) return path; return `modules/${MODULE_ID}/${String(path).replace(/^\/+/, "")}`; }
function actorFor(stationId, state) { const id = state.assignments?.[stationId]?.actorId; return id ? game.actors?.get(id) ?? null : null; }
function statisticMod(actor, slug) {
  if (!actor || !slug) return 0;
  const statistic = actor.getStatistic?.(slug) ?? actor.skills?.[slug];
  const value = Number(statistic?.check?.mod ?? statistic?.mod);
  return Number.isFinite(value) ? value : 0;
}
function currentAction(round, stationId, state) {
  const selection = state.selections?.[stationId] ?? {};
  const fallback = FALLBACK_ACTIONS[stationId];
  const actions = [fallback, ...(round.stationActions?.[stationId] ?? [])].filter(Boolean);
  return { selection, actions, selected: actions.find((action) => action.id === selection.actionId) ?? null };
}
function currentSkill(action, selection) { return action?.skills?.find((skill) => skill.id === selection?.skillId) ?? null; }
function shipState() {
  const actor = game.arkflight?.activeShip ?? null;
  const ship = actor?.flags?.[MODULE_ID]?.ship ?? null;
  const derived = ship ? deriveShip(ship, SHIP_CATALOGS) : null;
  return { actor, ship, derived };
}
function masteryFor(stationId, state) {
  const id = state.masterySelections?.[stationId] ?? null;
  const mastery = id ? getMasteryTechnique(stationId, id) : null;
  return mastery ? { ...mastery, expended: Boolean(state.masteryUses?.[stationId]) } : null;
}
function areaCard(ship, key) {
  const state = ship?.areas?.[key]?.state ?? "stable";
  return `<div class="pa-area-card is-${esc(state)}"><span>${esc(AREA_LABELS[key])}</span><i class="fa-solid ${AREA_ICONS[key]}"></i><strong>${esc(titleCase(state))}</strong></div>`;
}
function shipStatusHtml(state) {
  const { ship } = shipState();
  const strain = ship?.resources?.strain ?? { value: 0, max: 0 };
  const momentum = clamp(state.encounter?.momentum, 0, 3);
  const strainPct = strain.max > 0 ? clamp((Number(strain.value) / Number(strain.max)) * 100, 0, 100) : 0;
  return `<section class="pa-ship-status">
    <div class="pa-status-title">SHIP STATUS</div>
    <div class="pa-momentum-card"><span>MOMENTUM</span><strong>${momentum} / 3</strong><div class="pa-pips">${[1,2,3].map((n)=>`<b class="${n<=momentum?"on":""}"></b>`).join("")}</div></div>
    <div class="pa-strain-card"><span>STRAIN</span><strong>${Number(strain.value ?? 0)} / ${Number(strain.max ?? 0)}</strong><div class="pa-strain-track"><i style="width:${strainPct}%"></i></div></div>
    ${["hull","arkengine","rigging","lifeveil","morale"].map((key)=>areaCard(ship,key)).join("")}
  </section>`;
}
function hazardsHtml(state) {
  const hazards = state.encounter?.hazards ?? [];
  return `<div class="pa-hazards"><strong>ACTIVE HAZARDS</strong>${hazards.length ? hazards.map((id)=>`<span><i class="fa-solid fa-triangle-exclamation"></i>${esc(titleCase(id))}</span>`).join("") : '<span class="none">None</span>'}</div>`;
}
function stationRow(round, stationId, state) {
  const presentation = stationPresentation(stationId) ?? { displayName: titleCase(stationId), iconClass: "fa-solid fa-circle" };
  const actor = actorFor(stationId, state);
  const { selection, selected } = currentAction(round, stationId, state);
  const skill = currentSkill(selected, selection);
  const mastery = masteryFor(stationId, state);
  const mod = statisticMod(actor, skill?.skill);
  const ready = Boolean(actor && selected && skill);
  const active = stationId === focusedStation;
  return `<button type="button" class="pa-station-row ${active?"is-active":""} ${ready?"is-ready":""}" data-pa-focus="${stationId}">
    <span class="pa-order-number">${Number(state.order?.indexOf(stationId) ?? -1)+1}</span>
    <img src="${esc(actor?.img ?? "icons/svg/mystery-man.svg")}" alt="">
    <span class="pa-station-name"><b>${esc(presentation.displayName)}</b><small>${esc(actor?.name ?? "Unassigned")}</small></span>
    <span class="pa-row-action"><em>ACTION</em><b>${esc(selected?.name ?? "Choose Action")}</b>${skill?`<small>PF2e Skill · ${esc(skill.label)} ${signed(mod)}</small>`:""}</span>
    <span class="pa-row-mastery"><em>MASTERY</em><b>${esc(mastery?.name ?? "None")}</b><small>${mastery?.expended?"EXPENDED":mastery?"READY":"—"}</small></span>
    <span class="pa-row-ready">${ready?'<i class="fa-solid fa-circle-check"></i><b>READY</b>':'<i class="fa-regular fa-circle"></i><b>SETUP</b>'}</span>
  </button>`;
}
function actionOptions(actions, selection) {
  return `<option value="">Choose action…</option>${actions.map((a)=>`<option value="${esc(a.id)}" ${a.id===selection.actionId?"selected":""}>${esc(a.name)}</option>`).join("")}`;
}
function skillOptions(action, selection, actor) {
  if (!action) return `<option value="">Choose an action first…</option>`;
  return `<option value="">Choose PF2e skill…</option>${(action.skills??[]).map((s)=>`<option value="${esc(s.id)}" ${s.id===selection.skillId?"selected":""}>${esc(s.label)} ${signed(statisticMod(actor,s.skill))} · DC ${Number(s.dc)}</option>`).join("")}`;
}
function riskButtons(skill, selection, stationId) {
  const normal = `<button type="button" class="${selection.riskTier?"":"selected"}" data-pa-risk="0" data-station="${stationId}">0</button>`;
  const bids = (skill?.riskBids ?? []).map((risk)=>`<button type="button" class="${Number(selection.riskTier)===Number(risk.tier)?"selected":""}" data-pa-risk="${Number(risk.tier)}" data-station="${stationId}" title="${esc(getRiskBenefit(risk.benefitId)?.name ?? "Heroic / Risk Bid")}">+${Number(risk.tier)}</button>`).join("");
  return normal + bids;
}
function activeDetail(round, state) {
  const stationId = STATIONS.includes(focusedStation) ? focusedStation : STATIONS[0];
  const presentation = stationPresentation(stationId) ?? { displayName: titleCase(stationId), iconClass: "fa-solid fa-circle" };
  const actor = actorFor(stationId, state);
  const { selection, actions, selected } = currentAction(round, stationId, state);
  const skill = currentSkill(selected, selection);
  const actorMod = statisticMod(actor, skill?.skill);
  const adjustments = checkAdjustments(state, stationId);
  const momentum = clamp(state.encounter?.momentum, 0, 3);
  const arkflightBonus = Number(adjustments.bonus ?? 0) + momentum;
  const totalBonus = actorMod + arkflightBonus;
  const risk = Number(selection.riskTier ?? 0);
  const baseDc = Number(skill?.dc ?? 0);
  const finalDc = skill ? Math.max(0, baseDc + risk + Number(adjustments.dc ?? 0)) : 0;
  const mastery = masteryFor(stationId, state);
  const riskBenefit = skill?.riskBids?.find((entry)=>Number(entry.tier)===risk);
  const benefit = riskBenefit ? getRiskBenefit(riskBenefit.benefitId) : null;
  return `<section class="pa-detail">
    <header><i class="${presentation.iconClass}"></i><h2>${esc(presentation.displayName)} — ${esc(actor?.name ?? "Unassigned")}</h2><span>Station ${Number(state.order?.indexOf(stationId) ?? -1)+1} of 5</span></header>
    <div class="pa-detail-grid">
      <div class="pa-action-panel">
        <label>ACTION</label>
        <select data-pa-select="action" data-station="${stationId}">${actionOptions(actions,selection)}</select>
        <h3>${esc(selected?.name ?? "Choose an Action")}</h3>
        <p>${esc(selected?.description ?? "Choose an action to see what your officer is doing in the fiction and what the station is trying to accomplish.")}</p>
        <div class="pa-action-art">${selected?`<div class="pa-action-vignette"><span>ACTION VIGNETTE</span><p>${esc(selected.description)}</p></div>`:'<div class="pa-action-vignette empty"><span>ACTION VIGNETTE</span><p>Your selected action description appears here.</p></div>'}</div>
      </div>
      <div class="pa-check-panel">
        <label>PF2e CHECK</label>
        <select data-pa-select="skill" data-station="${stationId}" ${selected?"":"disabled"}>${skillOptions(selected,selection,actor)}</select>
        <div class="pa-check-line"><span>${esc(skill?.label ?? "Character Skill")}</span><strong>${skill?signed(actorMod):"—"}</strong></div>
        <div class="pa-check-line"><span>Crew / Arkflight</span><strong>${skill?signed(arkflightBonus):"—"}</strong></div>
        <div class="pa-check-total"><span>TOTAL CHECK BONUS</span><strong>${skill?signed(totalBonus):"—"}</strong></div>
        <div class="pa-dc-line"><span>BASE DC</span><strong>${skill?baseDc:"—"}</strong></div>
        <label>RISK BID <small>(Heroic / Risk)</small></label>
        <div class="pa-risk-buttons">${riskButtons(skill,selection,stationId)}</div>
        ${benefit?`<div class="pa-risk-benefit"><b>${esc(benefit.name)}</b><span>Success: ${esc(benefit.success)}</span><span>Critical: ${esc(benefit.criticalSuccess)}</span></div>`:""}
        <div class="pa-final-dc"><span>FINAL DC</span><strong>${skill?finalDc:"—"}</strong></div>
      </div>
      <aside class="pa-mastery-panel">
        <label>MASTERY — ONCE PER EVENT</label>
        ${mastery?`<div class="pa-mastery-card ${mastery.expended?"is-expended":""}"><header><i class="fa-solid fa-star"></i><h3>${esc(mastery.name)}</h3><b>${mastery.expended?"EXPENDED":"READY"}</b></header><p>${esc(mastery.description)}</p><div><strong>TRIGGER:</strong> ${esc(mastery.triggerLabel)}</div><div><strong>EFFECT:</strong> ${esc(mastery.description)}</div><button type="button" disabled>${mastery.expended?"EXPENDED":"USE WHEN TRIGGER OPENS"}</button></div>`:'<div class="pa-mastery-card empty">No Mastery selected for this station.</div>'}
        <div class="pa-used-masteries"><label>MASTERIES USED THIS EVENT</label>${STATIONS.map((id)=>{const m=masteryFor(id,state);return m?.expended?`<span>${esc(m.name)} <b>EXPENDED</b></span>`:"";}).join("") || '<span>None yet.</span>'}</div>
      </aside>
    </div>
    <div class="pa-score-strip"><span>Critical Success <b>+2</b></span><span>Success <b>+1</b></span><span>Failure <b>−1</b></span><span>Critical Failure <b>−2</b></span></div>
  </section>`;
}
function shipAbilitiesHtml() {
  const { derived } = shipState();
  const caps = [...(derived?.capabilities ?? [])].slice(0, 4);
  const rows = caps.length ? caps : ["Hull Pattern", "Arkengine Pattern", "Vessel Systems", "Crew Support"];
  return `<section class="pa-ship-abilities"><h3>SHIP SPECIAL ABILITY CARDS</h3><div>${rows.map((name,index)=>`<article class="tone-${index%4}"><i class="fa-solid ${["fa-shield-halved","fa-gear","fa-anchor","fa-compass"][index%4]}"></i><strong>${esc(titleCase(name))}</strong><p>${caps.length?"Capability granted by Rum Runner's installed ship configuration.":"Ship-derived capability slot."}</p><small>${index===2?"PASSIVE":"SHIP ABILITY"}</small></article>`).join("")}</div></section>`;
}
function tacticsHtml(state) {
  const cards = (state.crewEdgeHand ?? []).map(getCrewEdgeCard).filter(Boolean);
  return `<section class="pa-tactics"><h3>CREW TACTICS <small>${cards.length} / 3 opportunities the crew earned</small></h3>${cards.length?cards.map((card)=>`<div><i class="fa-solid fa-diamond"></i><strong>${esc(card.name)}</strong><span>${esc(card.trigger)}</span><small>${esc(card.effect)}</small></div>`).join(""):'<p>No Crew Tactics are ready.</p>'}</section>`;
}
function orderHtml(state) {
  return `<nav class="pa-order">${state.order.map((stationId,index)=>{const p=stationPresentation(stationId);return `<button type="button" data-pa-focus="${stationId}" class="${stationId===focusedStation?"is-active":""}"><b>${index+1}</b><i class="${p?.iconClass ?? "fa-solid fa-circle"}"></i><span>${esc(p?.displayName ?? titleCase(stationId))}</span></button>`;}).join("")}</nav>`;
}
function timerText(state) {
  const seconds = planningSecondsRemaining(state);
  const min = String(Math.floor(seconds/60)).padStart(2,"0");
  const sec = String(seconds%60).padStart(2,"0");
  return `${min}:${sec}`;
}
function renderBoard(root, controller) {
  const state = controller.state;
  const event = controller.getEvent();
  const round = controller.getRound();
  if (!state || !event || !round || !["planning","locked"].includes(state.phase)) return false;
  if (!STATIONS.includes(focusedStation)) focusedStation = state.order?.[0] ?? STATIONS[0];
  const art = moduleAsset(round.image || event.image);
  const ready = planningReady(state);
  root.classList.add("arkflight-player-action-mode");
  root.innerHTML = `<section class="pa-board">
    <header class="pa-top">
      <div class="pa-round-art"><img src="${esc(art)}" alt="${esc(round.title)}"></div>
      <div class="pa-round-copy"><span>ROUND ${(state.roundIndex??0)+1}</span><h1>${esc(round.title)}</h1><p>${esc(round.situation)}</p><em>${esc(round.openingVignette ?? "")}</em><b>GOAL: ${esc(event.goal)}</b></div>
      <div class="pa-status-wrap">${shipStatusHtml(state)}${hazardsHtml(state)}</div>
    </header>
    <div class="pa-board-title"><h2>PLAYER ACTION BOARD</h2><span>Plan your crew's actions before locking in.</span><strong data-pa-timer>${timerText(state)}</strong></div>
    ${orderHtml(state)}
    <main class="pa-main">
      <section class="pa-crew"><h3>CREW STATIONS</h3>${STATIONS.map((id)=>stationRow(round,id,state)).join("")}<small>Click a station to view full details and adjust Action, PF2e Skill, Risk Bid, or review its Mastery.</small></section>
      ${activeDetail(round,state)}
    </main>
    <footer class="pa-footer">${shipAbilitiesHtml()}${tacticsHtml(state)}<section class="pa-scoring"><h3>ROUND SCORING REMINDER</h3><span>Critical Success <b>+2</b></span><span>Success <b>+1</b></span><span>Failure <b>−1</b></span><span>Critical Failure <b>−2</b></span></section><button type="button" class="pa-lock" data-pa-lock ${(!ready || state.phase!=="planning")?"disabled":""}><i class="fa-solid fa-lock"></i><b>${state.phase==="locked"?"PLAN LOCKED":"LOCK PLAN"}</b><span>${ready?"Confirm your crew's plan.":"Complete all five stations first."}</span></button></footer>
  </section>`;
  bind(root, controller);
  return true;
}
function bind(root, controller) {
  const state = controller.state;
  for (const button of root.querySelectorAll("[data-pa-focus]")) button.addEventListener("click",()=>{ focusedStation = button.dataset.paFocus; renderBoard(root,controller); });
  for (const select of root.querySelectorAll("select[data-pa-select]")) select.addEventListener("change", async()=>{
    try {
      const station = select.dataset.station;
      if (select.dataset.paSelect === "action") await controller.command({ type:"select-action", station, actionId: select.value || null });
      if (select.dataset.paSelect === "skill") await controller.command({ type:"select-skill", station, skillId: select.value || null });
    } catch (error) { console.error("Arkflight | Player Action Board selection failed",error); ui.notifications?.warn(error.message); }
  });
  for (const button of root.querySelectorAll("[data-pa-risk]")) button.addEventListener("click", async()=>{
    try { await controller.command({ type:"select-risk", station:button.dataset.station, riskTier:Number(button.dataset.paRisk)||null }); }
    catch(error){ console.error("Arkflight | Player Action Board Risk Bid failed",error); ui.notifications?.warn(error.message); }
  });
  root.querySelector("[data-pa-lock]")?.addEventListener("click", async()=>{ try { await controller.lockPlan(); } catch(error){ console.error("Arkflight | Lock plan failed",error); ui.notifications?.warn(error.message); } });
  root.querySelector(".pa-round-art img")?.addEventListener("click",()=>{
    const src = root.querySelector(".pa-round-art img")?.src;
    const ImagePopout = foundry?.applications?.apps?.ImagePopout ?? globalThis.ImagePopout;
    if (src && typeof ImagePopout === "function") new ImagePopout(src,{title:controller.getRound()?.title ?? "Arkflight Round Art",shareable:false}).render(true);
  });
  if (timerHandle) clearInterval(timerHandle);
  if (state.phase === "planning") timerHandle = setInterval(()=>{
    const node = root.querySelector("[data-pa-timer]");
    if (!node) return;
    node.textContent = timerText(controller.state);
    if (planningSecondsRemaining(controller.state)<=0) { node.classList.add("expired"); clearInterval(timerHandle); timerHandle=null; }
  },1000);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== "arkflight-event-board") return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
  const controller = game.arkflight?.controller;
  if (!root || !controller) return;
  setTimeout(()=>renderBoard(root,controller),0);
});
