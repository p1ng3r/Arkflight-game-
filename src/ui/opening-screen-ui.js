import { BASE_MASTERY, getMasteryTechnique } from "../content/base-mastery.js";
import { STATIONS } from "../event/event-schema.js";
import { eventSetupReady } from "../event/planning-state.js";
import { stationPresentation } from "./station-presentation.js";

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function moduleAssetPath(path) {
  if (!path) return "";
  if (/^(https?:|data:|modules\/)/.test(path)) return path;
  return `modules/arkflight-game/${String(path).replace(/^\/+/, "")}`;
}

function usedActorIds(state, exceptStation) {
  return new Set(
    STATIONS
      .filter((stationId) => stationId !== exceptStation)
      .map((stationId) => state.assignments?.[stationId]?.actorId)
      .filter(Boolean)
  );
}

function actorOptions(state, stationId) {
  const selected = state.assignments?.[stationId]?.actorId ?? "";
  const used = usedActorIds(state, stationId);
  const rows = ['<option value="">— Assign Officer —</option>'];
  for (const actor of game.actors.contents
    .filter((entry) => entry.type === "character")
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (used.has(actor.id)) continue;
    rows.push(`<option value="${escapeHtml(actor.id)}" ${actor.id === selected ? "selected" : ""}>${escapeHtml(actor.name)}</option>`);
  }
  return rows.join("");
}

function masteryOptions(state, stationId) {
  const selected = state.masterySelections?.[stationId] ?? "";
  const rows = ['<option value="">— Choose Mastery —</option>'];
  for (const mastery of BASE_MASTERY[stationId] ?? []) {
    rows.push(`<option value="${escapeHtml(mastery.id)}" ${mastery.id === selected ? "selected" : ""}>${escapeHtml(mastery.name)}</option>`);
  }
  return rows.join("");
}

function actorPortrait(state, stationId) {
  const actorId = state.assignments?.[stationId]?.actorId ?? null;
  const actor = actorId ? game.actors.get(actorId) : null;
  if (!actor?.img) return '<span class="arkflight-opening-portrait empty"><i class="fa-solid fa-user"></i></span>';
  return `<img class="arkflight-opening-portrait" src="${escapeHtml(actor.img)}" alt="${escapeHtml(actor.name)}">`;
}

function masteryPreview(state, stationId) {
  const masteryId = state.masterySelections?.[stationId] ?? null;
  const mastery = getMasteryTechnique(stationId, masteryId);
  if (!mastery) return "";
  const trigger = mastery.trigger ?? titleCase(mastery.timing);
  return `
    <div class="arkflight-opening-helper-line">
      <span class="arkflight-opening-helper-label"><i class="fa-solid fa-bolt"></i> Trigger</span>
      <span>${escapeHtml(trigger)}</span>
    </div>
    <div class="arkflight-opening-helper-line">
      <span class="arkflight-opening-helper-label"><i class="fa-solid fa-wand-magic-sparkles"></i> Effect</span>
      <span>${escapeHtml(mastery.description)}</span>
    </div>`;
}

function crewRows(state) {
  return STATIONS.map((stationId) => {
    const presentation = stationPresentation(stationId);
    const actorId = state.assignments?.[stationId]?.actorId ?? null;
    const masteryId = state.masterySelections?.[stationId] ?? null;
    const ready = Boolean(actorId && masteryId);
    return `
      <section class="arkflight-opening-station-card ${ready ? "ready" : "needs-setup"} ${masteryId ? "has-mastery" : ""}" data-opening-station="${stationId}">
        <div class="arkflight-opening-station-main">
          <div class="arkflight-opening-station-name">
            <span class="arkflight-opening-station-glyph"><i class="${presentation?.iconClass ?? "fa-solid fa-circle"}"></i></span>
            <span class="arkflight-opening-station-copy"><small>STATION</small><strong>${escapeHtml(presentation?.displayName ?? titleCase(stationId))}</strong></span>
          </div>
          <div class="arkflight-opening-actor-field">
            ${actorPortrait(state, stationId)}
            <div class="arkflight-opening-field-stack">
              <span class="arkflight-opening-field-label">Officer</span>
              <select data-opening-control="actor" data-station="${stationId}" ${game.user.isGM ? "" : "disabled"}>${actorOptions(state, stationId)}</select>
            </div>
          </div>
          <div class="arkflight-opening-mastery-field">
            <div class="arkflight-opening-field-stack">
              <span class="arkflight-opening-field-label">Mastery</span>
              <select data-opening-control="mastery" data-station="${stationId}">${masteryOptions(state, stationId)}</select>
            </div>
          </div>
          <div class="arkflight-opening-row-state ${ready ? "ready" : "needs-setup"}">
            <i class="fa-solid ${ready ? "fa-circle-check" : "fa-circle-dot"}"></i>
            <span>${ready ? "READY" : "NEEDS SETUP"}</span>
          </div>
        </div>
        ${masteryId ? `<div class="arkflight-opening-mastery-preview">${masteryPreview(state, stationId)}</div>` : ""}
      </section>
    `;
  }).join("");
}

function pressureValue(state, system) {
  return Number(state.encounter?.pressure?.[system] ?? 0);
}

function stakeHtml({ css, icon, label, value }) {
  return `<div class="arkflight-opening-stake ${css}">
    <span class="arkflight-opening-stake-icon"><i class="${icon}"></i></span>
    <span class="arkflight-opening-stake-label">${label}</span>
    <strong class="arkflight-opening-stake-value">${value}</strong>
  </div>`;
}

function hazardsHtml(state) {
  const hazards = state.encounter?.hazards ?? [];
  if (!hazards.length) return '<div class="arkflight-opening-no-hazards">No active Hazards at Event start.</div>';
  return `<div class="arkflight-opening-hazard-list">${hazards.map((hazardId) => `<span class="arkflight-opening-hazard"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(titleCase(hazardId))}</span>`).join("")}</div>`;
}

function openingMarkup(controller, imageSrc) {
  const state = controller.state;
  const event = controller.getEvent();
  const round = controller.getRound();
  const ready = eventSetupReady(state);
  const image = imageSrc || moduleAssetPath(round?.image || event?.image);

  return `
    <aside class="arkflight-opening-art-column">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(event?.title)}">
      <div class="arkflight-opening-art-caption">
        <div class="round-label">ROUND 1</div>
        <h3>${escapeHtml(round?.title ?? "Round 1")}</h3>
        <p>${escapeHtml(round?.situation ?? event?.goal ?? "")}</p>
      </div>
    </aside>

    <main class="arkflight-opening-command-column">
      <div class="arkflight-opening-overline">Opening Screen</div>
      <h1 class="arkflight-opening-title">${escapeHtml(event?.title)}</h1>
      <div class="arkflight-opening-title-rule"></div>
      <div class="arkflight-opening-story">${escapeHtml(event?.openingVignette)}</div>

      <section class="arkflight-opening-muster">
        <div class="arkflight-opening-section-title">Crew Muster &amp; Station Mastery</div>
        <p class="arkflight-opening-muster-help">Assign one officer to every station and ready one once-per-Event Mastery. Select a Mastery to see exactly when it can be used.</p>
        <div class="arkflight-opening-crew-list">${crewRows(state)}</div>
        <div class="arkflight-opening-ready-message ${ready ? "ready" : ""}">${ready ? "◆ CREW & MASTERY READY — the Event may begin." : "Complete all five officer assignments and Mastery choices before Round 1."}</div>
      </section>

      ${game.user.isGM
        ? `<button type="button" class="arkflight-opening-begin" data-opening-begin ${ready ? "" : "disabled"}><i class="fa-solid fa-lock"></i> LOCK CREW &amp; MASTERY — BEGIN ROUND 1 PLANNING</button>`
        : '<div class="arkflight-waiting">Waiting for the GM to lock the crew and begin Round 1.</div>'}
    </main>

    <aside class="arkflight-opening-stakes-column">
      <section class="arkflight-opening-side-panel">
        <h3>Event Stakes</h3>
        <div class="arkflight-opening-stakes-grid">
          ${stakeHtml({ css: "momentum", icon: "fa-solid fa-compass", label: "Momentum", value: `${Number(state.encounter?.momentum ?? 0)} / 3` })}
          ${stakeHtml({ css: "hull", icon: "fa-solid fa-shield-halved", label: "Hull", value: pressureValue(state, "hull") })}
          ${stakeHtml({ css: "arkengine", icon: "fa-solid fa-gears", label: "Arkengine", value: pressureValue(state, "arkengine") })}
          ${stakeHtml({ css: "lifeveil", icon: "fa-solid fa-seedling", label: "Lifeveil", value: pressureValue(state, "lifeveil") })}
          ${stakeHtml({ css: "rigging", icon: "fa-solid fa-sailboat", label: "Rigging", value: pressureValue(state, "rigging") })}
        </div>
      </section>

      <section class="arkflight-opening-side-panel">
        <h3>Active Hazards</h3>
        ${hazardsHtml(state)}
      </section>

      <section class="arkflight-opening-side-panel">
        <h3>Round Scoring Reminder</h3>
        <div class="arkflight-opening-score-grid">
          <span class="crit-success">Critical Success</span><strong class="crit-success">+2</strong>
          <span class="success">Success</span><strong class="success">+1</strong>
          <span class="failure">Failure</span><strong class="failure">−1</strong>
          <span class="crit-failure">Critical Failure</span><strong class="crit-failure">−2</strong>
        </div>
        <div class="arkflight-opening-score-zero"><strong>0 = Narrow Success</strong><br><small>The crew made it through, but only just.</small></div>
      </section>

      <div class="arkflight-opening-compass"><i class="fa-regular fa-compass"></i></div>
    </aside>
  `;
}

async function rerenderBoard(root) {
  const app = Object.values(ui.windows ?? {}).find((entry) => entry?.id === "arkflight-event-board");
  if (app?.render) await app.render({ force: true });
  else root?.dispatchEvent?.(new Event("change", { bubbles: true }));
}

function bindOpeningControls(root, controller) {
  for (const select of root.querySelectorAll("select[data-opening-control]")) {
    select.addEventListener("change", async (event) => {
      const field = event.currentTarget;
      try {
        if (field.dataset.openingControl === "actor") {
          await controller.command({ type: "assign-actor", station: field.dataset.station, actorId: field.value || null });
        } else if (field.dataset.openingControl === "mastery") {
          await controller.command({ type: "select-mastery", station: field.dataset.station, masteryId: field.value || null });
        }
        await rerenderBoard(root);
      } catch (error) {
        console.error("Arkflight | Opening screen selection failed", error);
        ui.notifications?.warn(error.message);
      }
    });
  }

  root.querySelector("[data-opening-begin]")?.addEventListener("click", async () => {
    try {
      await controller.command({ type: "begin-planning" });
    } catch (error) {
      console.error("Arkflight | Opening screen begin failed", error);
      ui.notifications?.warn(error.message);
    }
  });
}

function decorateOpeningScreen(root, controller) {
  if (controller.state?.phase !== "opening" || controller.state?.setupLocked) {
    root.classList.remove("arkflight-opening-mode");
    return;
  }

  const opening = root.querySelector(".arkflight-opening-grid");
  if (!opening) return;
  const imageSrc = opening.querySelector(".arkflight-event-art img")?.getAttribute("src") ?? "";

  root.classList.add("arkflight-opening-mode");
  opening.classList.add("arkflight-cinematic-opening");
  opening.innerHTML = openingMarkup(controller, imageSrc);
  bindOpeningControls(root, controller);
}

export function installOpeningScreenUI() {
  Hooks.on("renderApplicationV2", (app, element) => {
    const root = boardRoot(app, element);
    const controller = game.arkflight?.controller;
    if (!root || !controller?.state) return;
    setTimeout(() => decorateOpeningScreen(root, controller), 0);
  });
}
