import { getMasteryTechnique } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { STATIONS } from "../event/event-schema.js";
import { eventSetupReady } from "../event/planning-state.js";
import { stationPresentation } from "./station-presentation.js";

const STYLE_ID = "arkflight-mastery-tactics-style";

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .arkflight-event-setup { margin-top: 16px; border-top: 1px solid rgba(195,155,82,.45); padding-top: 12px; }
    .arkflight-event-setup h3, .arkflight-utility-strip h3 { margin: 0; font-size: 15px; letter-spacing: .07em; text-transform: uppercase; }
    .arkflight-event-setup .arkflight-setup-help { margin: 4px 0 10px; opacity: .78; font-size: 12px; }
    .arkflight-setup-grid { display: grid; gap: 7px; }
    .arkflight-setup-row { display: grid; grid-template-columns: 140px minmax(180px,1fr) minmax(240px,1.25fr); gap: 8px; align-items: center; padding: 7px 8px; background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.08); border-radius: 5px; }
    .arkflight-setup-station { font-weight: 700; display:flex; gap:7px; align-items:center; }
    .arkflight-setup-row select { width:100%; min-height:30px; }
    .arkflight-setup-ready { margin-top:9px; font-size:12px; font-weight:700; }
    .arkflight-setup-ready.ready { color:#d8b35d; }
    .arkflight-setup-ready.not-ready { color:#c98c79; }
    .arkflight-utility-strip { display:grid; grid-template-columns: 1.15fr 1fr; gap:10px; margin:8px 0 10px; }
    .arkflight-mastery-panel, .arkflight-tactics-panel { border:1px solid rgba(195,155,82,.35); background:rgba(5,7,10,.42); padding:8px 10px; border-radius:6px; }
    .arkflight-utility-head { display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:7px; }
    .arkflight-utility-head small { opacity:.7; }
    .arkflight-mastery-chips, .arkflight-tactic-chips { display:flex; flex-wrap:wrap; gap:6px; }
    .arkflight-mastery-chip, .arkflight-tactic-chip { border:1px solid rgba(195,155,82,.34); background:rgba(0,0,0,.24); padding:5px 7px; border-radius:5px; font-size:11px; line-height:1.25; }
    button.arkflight-mastery-chip, button.arkflight-tactic-chip { cursor:pointer; color:inherit; text-align:left; }
    button.arkflight-mastery-chip:hover, button.arkflight-tactic-chip:hover { border-color:#d8b35d; box-shadow:0 0 0 1px rgba(216,179,93,.15) inset; }
    .arkflight-mastery-chip strong, .arkflight-tactic-chip strong { display:block; font-size:11px; }
    .arkflight-mastery-chip span, .arkflight-tactic-chip span { display:block; opacity:.72; margin-top:2px; }
    .arkflight-tactic-chip em { display:inline-block; margin-top:3px; font-size:9px; text-transform:uppercase; letter-spacing:.08em; opacity:.65; font-style:normal; }
    .arkflight-mastery-chip.ready strong::before { content:'◆★ '; color:#d8b35d; }
    .arkflight-mastery-chip.expended { opacity:.46; filter:saturate(.45); }
    .arkflight-mastery-chip.expended strong::before { content:'◇ '; }
    .arkflight-mastery-chip.expended span { text-transform:uppercase; letter-spacing:.05em; }
    .arkflight-tactic-empty { opacity:.55; font-size:11px; padding:5px 0; }
    .arkflight-mastery-dialog p { margin:0 0 8px; }
    .arkflight-mastery-dialog select { width:100%; margin-top:4px; }
    .arkflight-mastery-preview { padding:8px; border:1px solid rgba(195,155,82,.35); background:rgba(0,0,0,.18); border-radius:5px; }
    @media (max-width: 900px) { .arkflight-utility-strip { grid-template-columns:1fr; } .arkflight-setup-row { grid-template-columns:1fr; } }
  `;
  document.head.append(style);
}

function actorOptions(state, stationId) {
  const selected = state.assignments?.[stationId]?.actorId ?? "";
  const used = new Set(STATIONS.filter((station) => station !== stationId).map((station) => state.assignments?.[station]?.actorId).filter(Boolean));
  const options = ['<option value="">— Assign PF2e Character —</option>'];
  for (const actor of game.actors.contents.filter((entry) => entry.type === "character").sort((a,b) => a.name.localeCompare(b.name))) {
    if (used.has(actor.id)) continue;
    options.push(`<option value="${actor.id}" ${actor.id === selected ? "selected" : ""}>${actor.name}</option>`);
  }
  return options.join("");
}

function decorateEventSetup(root, controller) {
  const state = controller.state;
  if (state?.phase !== "opening" || state.setupLocked) return;
  const vignette = root.querySelector(".arkflight-vignette");
  if (!vignette || vignette.querySelector(".arkflight-event-setup")) return;

  const setup = document.createElement("section");
  setup.className = "arkflight-event-setup";
  setup.innerHTML = `
    <h3><i class="fa-solid fa-users-gear"></i> Crew Muster & Arkcraft Skills</h3>
    <p class="arkflight-setup-help">Lock one different officer into each station for the entire Event. Each assigned officer also chooses one Arkcraft Skill to ready before Round 1.</p>
    <div class="arkflight-setup-grid">
      ${STATIONS.map((stationId) => {
        const presentation = stationPresentation(stationId);
        return `<div class="arkflight-setup-row" data-setup-station="${stationId}">
          <div class="arkflight-setup-station"><i class="${presentation?.iconClass ?? "fa-solid fa-circle"}"></i> ${presentation?.displayName ?? stationId}</div>
          <select data-ark-setup="actor" data-station="${stationId}" ${game.user.isGM ? "" : "disabled"}>${actorOptions(state, stationId)}</select>
          <div class="arkflight-arkcraft-slot" data-af-arkcraft-slot="${stationId}"></div>
        </div>`;
      }).join("")}
    </div>
    <div class="arkflight-setup-ready ${eventSetupReady(state) ? "ready" : "not-ready"}">${eventSetupReady(state) ? "◆ CREW & ARKCRAFT READY — Round 1 may begin." : "Complete all five officer assignments and Arkcraft Skill choices before Round 1."}</div>
  `;

  const begin = vignette.querySelector("[data-ark-action='begin-planning']");
  if (begin) vignette.insertBefore(setup, begin);
  else vignette.append(setup);
  if (begin) {
    begin.disabled = !eventSetupReady(state);
    begin.title = eventSetupReady(state) ? "Lock Crew & Arkcraft Skills and begin Round 1 planning" : "Complete Crew Muster & Arkcraft Skills first";
    begin.innerHTML = '<i class="fa-solid fa-lock"></i> Lock Crew & Arkcraft Skills — Begin Round 1 Planning 3:00';
  }

  for (const select of setup.querySelectorAll("select[data-ark-setup='actor']")) {
    select.addEventListener("change", async (event) => {
      const el = event.currentTarget;
      try {
        await controller.command({ type: "assign-actor", station: el.dataset.station, actorId: el.value || null });
      } catch (error) {
        console.error("Arkflight | Event Setup officer selection failed", error);
        ui.notifications?.warn(error.message);
      }
    });
  }
}

function unresolvedOptions(state, allowed = null) {
  const allowedSet = allowed ? new Set(allowed) : null;
  return (state.order ?? []).filter((stationId) => !state.results?.[stationId] && (!allowedSet || allowedSet.has(stationId)));
}

function stationSelectHtml(state, name = "targetStationId", allowed = null) {
  const rows = unresolvedOptions(state, allowed);
  return `<select name="${name}">${rows.map((stationId) => `<option value="${stationId}">${stationPresentation(stationId)?.displayName ?? stationId}</option>`).join("")}</select>`;
}

function hazardSelectHtml(state) {
  return `<select name="hazardId">${(state.encounter?.hazards ?? []).map((id) => `<option value="${id}">${String(id).replaceAll("-", " ")}</option>`).join("")}</select>`;
}

async function inputDialog({ title, description, content, okLabel = "Use" }) {
  const DialogV2 = foundry.applications.api.DialogV2;
  return DialogV2.input({
    window: { title },
    classes: ["arkflight", "arkflight-mastery-dialog"],
    modal: true,
    rejectClose: false,
    content: `<div class="arkflight-mastery-dialog"><p>${description}</p>${content ?? ""}</div>`,
    ok: { label: okLabel, icon: "fa-solid fa-check" }
  });
}

async function confirmDialog(title, description, label = "Use Mastery") {
  return foundry.applications.api.DialogV2.confirm({
    window: { title },
    classes: ["arkflight", "arkflight-mastery-dialog"],
    content: `<p>${description}</p>`,
    modal: true,
    rejectClose: false,
    yes: { label, icon: "fa-solid fa-star" },
    no: { label: "Cancel" }
  });
}

async function masteryOptionsForUse(controller, stationId, mastery) {
  const state = controller.state;
  if (mastery.id === "navigator-read-the-way-ahead") {
    const event = controller.getEvent();
    const nextRound = event?.rounds?.[Number(state.roundIndex ?? 0) + 1];
    if (!nextRound) {
      const ok = await confirmDialog(mastery.name, `${mastery.description} There is no later round in this Event. Use it anyway?`);
      return ok ? {} : null;
    }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: mastery.name },
      classes: ["arkflight", "arkflight-mastery-dialog"],
      content: `<div class="arkflight-mastery-preview"><strong>Next Round — ${nextRound.title}</strong><p>${nextRound.openingVignette || nextRound.situation || "No preview authored."}</p></div><p>This will EXPEND the Mastery Technique.</p>`,
      modal: true,
      rejectClose: false,
      yes: { label: "Read the Way Ahead" },
      no: { label: "Cancel" }
    });
    return ok ? {} : null;
  }

  if (mastery.target === "unresolved-station") {
    const fd = await inputDialog({ title: mastery.name, description: mastery.description, content: `<label>Choose station${stationSelectHtml(state)}</label>`, okLabel: "Use Mastery" });
    return fd ? { targetStationId: fd.targetStationId } : null;
  }
  if (mastery.target === "engineer-or-navigator") {
    const fd = await inputDialog({ title: mastery.name, description: mastery.description, content: `<label>Choose station${stationSelectHtml(state, "targetStationId", ["engineer", "navigator"])}</label>`, okLabel: "Use Mastery" });
    return fd ? { targetStationId: fd.targetStationId } : null;
  }
  if (mastery.target === "active-hazard") {
    if (!(state.encounter?.hazards ?? []).length) throw new Error("There is no active Hazard to target.");
    const fd = await inputDialog({ title: mastery.name, description: mastery.description, content: `<label>Choose Hazard${hazardSelectHtml(state)}</label>`, okLabel: "Use Mastery" });
    return fd ? { hazardId: fd.hazardId } : null;
  }
  if (mastery.target === "two-unresolved-stations") {
    const fd = await inputDialog({ title: mastery.name, description: mastery.description, content: `<label>First station${stationSelectHtml(state, "firstStationId")}</label><label>Second station${stationSelectHtml(state, "secondStationId")}</label>`, okLabel: "Swap Stations" });
    return fd ? { firstStationId: fd.firstStationId, secondStationId: fd.secondStationId } : null;
  }
  const ok = await confirmDialog(mastery.name, `${mastery.description}<br><strong>Once used, this Mastery is EXPENDED for the Event.</strong>`);
  return ok ? {} : null;
}

async function tacticOptionsForUse(controller, tactic) {
  const state = controller.state;
  const targetIds = ["clear-opening", "ride-the-momentum", "one-more-push", "steady-hands", "take-the-better-line", "measured-gamble"];
  if (targetIds.includes(tactic.id)) {
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `<strong>${tactic.theater.toUpperCase()}</strong><br><strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}`, content: `<label>Choose station${stationSelectHtml(state)}</label>`, okLabel: "Spend Tactic" });
    return fd ? { targetStationId: fd.targetStationId } : null;
  }
  if (tactic.id === "not-yet") {
    if (!(state.encounter?.hazards ?? []).length) throw new Error("There is no active Hazard to target.");
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `<strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}`, content: `<label>Choose Hazard${hazardSelectHtml(state)}</label>`, okLabel: "Spend Tactic" });
    return fd ? { hazardId: fd.hazardId } : null;
  }
  if (["brace-for-it", "protect-the-system"].includes(tactic.id)) {
    const areas = ["hull", "arkengine", "rigging", "lifeveil", "morale"];
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `<strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}`, content: `<label>Choose Area<select name="area">${areas.map((id) => `<option value="${id}">${id}</option>`).join("")}</select></label>`, okLabel: "Spend Tactic" });
    return fd ? { area: fd.area } : null;
  }
  if (tactic.id === "change-of-course") {
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `<strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}`, content: `<label>Move station${stationSelectHtml(state)}</label><label>New position<select name="targetIndex">${(state.order ?? []).map((_, index) => `<option value="${index}">${index + 1}</option>`).join("")}</select></label>`, okLabel: "Spend Tactic" });
    return fd ? { targetStationId: fd.targetStationId, targetIndex: Number(fd.targetIndex) } : null;
  }
  if (tactic.id === "second-chance") {
    const failed = Object.entries(state.results ?? {}).filter(([, result]) => ["failure", "criticalFailure"].includes(result?.degreeKey));
    if (!failed.length) throw new Error("No failed station result is available to reroll.");
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `<strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}`, content: `<label>Reroll station<select name="targetStationId">${failed.map(([id]) => `<option value="${id}">${stationPresentation(id)?.displayName ?? id}</option>`).join("")}</select></label>`, okLabel: "Spend Tactic & Reroll" });
    return fd ? { targetStationId: fd.targetStationId } : null;
  }
  if (tactic.id === "crew-instinct") {
    const fd = await inputDialog({ title: `Crew Tactic — ${tactic.name}`, description: `${tactic.effect} Enter the five station ids in desired order, separated by commas.`, content: `<input name="order" value="${(state.order ?? []).join(",")}">`, okLabel: "Spend Tactic" });
    return fd ? { order: String(fd.order ?? "").split(",").map((id) => id.trim()).filter(Boolean) } : null;
  }
  const ok = await confirmDialog(`Crew Tactic — ${tactic.name}`, `<strong>${tactic.theater.toUpperCase()}</strong><br><strong>Trigger:</strong> ${tactic.trigger}<br>${tactic.effect}<br><br>This Tactic is discarded after use.`, "Spend Tactic");
  return ok ? {} : null;
}

function activeTacticTheater(state) {
  if (state.phase === "planning" || state.phase === "round-opening") return "planning";
  if (state.phase === "resolution") return "resolution";
  if (state.phase === "round-result") return state.eventResultPreview ? "event-result" : "resolution";
  return null;
}

function decorateUtilityStrip(root, controller) {
  const state = controller.state;
  if (!state || state.phase === "opening") return;
  if (root.querySelector(".arkflight-utility-strip")) return;
  const header = root.querySelector(".arkflight-event-header");
  if (!header) return;

  const strip = document.createElement("section");
  strip.className = "arkflight-utility-strip";
  const masteryChips = STATIONS.map((stationId) => {
    const masteryId = state.masterySelections?.[stationId];
    const mastery = getMasteryTechnique(stationId, masteryId);
    if (!mastery) return "";
    const expended = Boolean(state.masteryUses?.[stationId]);
    const tag = expended ? "div" : "button";
    return `<${tag} ${expended ? "" : 'type="button"'} class="arkflight-mastery-chip ${expended ? "expended" : "ready"}" ${expended ? "" : `data-use-mastery="${stationId}"`} title="${mastery.description}"><strong>${stationPresentation(stationId)?.displayName ?? stationId}: ${mastery.name}</strong><span>${expended ? "EXPENDED" : "ONCE PER EVENT · READY"}</span></${tag}>`;
  }).join("");

  const theater = activeTacticTheater(state);
  const tactics = [...(state.crewEdgeHand ?? [])].map((id) => getCrewEdgeCard(id)).filter((tactic) => tactic && tactic.theater === theater);
  const tacticChips = tactics.length ? tactics.map((tactic) => `<button type="button" class="arkflight-tactic-chip" data-use-tactic="${tactic.id}" title="${tactic.trigger} ${tactic.effect}"><strong>◆ ${tactic.name}</strong><span>${tactic.trigger}</span><em>${tactic.theater}</em></button>`).join("") : `<div class="arkflight-tactic-empty">No ${theater ? theater.replace("-", " ") : "playable"} Crew Tactics are Ready.</div>`;

  strip.innerHTML = `
    <div class="arkflight-mastery-panel"><div class="arkflight-utility-head"><h3>Station Mastery</h3><small>This is what my officer can do.</small></div><div class="arkflight-mastery-chips">${masteryChips}</div></div>
    <div class="arkflight-tactics-panel"><div class="arkflight-utility-head"><h3>Crew Tactics</h3><small>${theater ? theater.toUpperCase() : "NO ACTIVE THEATER"}</small></div><div class="arkflight-tactic-chips">${tacticChips}</div></div>
  `;
  header.insertAdjacentElement("afterend", strip);

  for (const button of strip.querySelectorAll("[data-use-mastery]")) {
    button.addEventListener("click", async () => {
      const stationId = button.dataset.useMastery;
      const mastery = getMasteryTechnique(stationId, controller.state.masterySelections?.[stationId]);
      try {
        const options = await masteryOptionsForUse(controller, stationId, mastery);
        if (options === null) return;
        await controller.command({ type: "use-mastery", station: stationId, options });
        ui.notifications?.info(`${mastery.name} used — ${stationPresentation(stationId)?.displayName ?? stationId} Mastery is now EXPENDED.`);
      } catch (error) {
        console.error("Arkflight | Mastery use failed", error);
        ui.notifications?.warn(error.message);
      }
    });
  }

  for (const button of strip.querySelectorAll("[data-use-tactic]")) {
    button.addEventListener("click", async () => {
      const tactic = getCrewEdgeCard(button.dataset.useTactic);
      try {
        const options = await tacticOptionsForUse(controller, tactic);
        if (options === null) return;
        await controller.command({ type: "use-tactic", tacticId: tactic.id, options });
        ui.notifications?.info(`Crew Tactic spent: ${tactic.name}.`);
      } catch (error) {
        console.error("Arkflight | Crew Tactic use failed", error);
        ui.notifications?.warn(error.message);
      }
    });
  }
}

export function installMasteryTacticsUI() {
  ensureStyles();
  Hooks.on("renderApplicationV2", (app, element) => {
    const root = boardRoot(app, element);
    const controller = game.arkflight?.controller;
    if (!root || !controller?.state) return;
    decorateEventSetup(root, controller);
    decorateUtilityStrip(root, controller);
  });
}
