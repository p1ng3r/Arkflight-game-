import { BASE_MASTERY } from "../content/base-mastery.js";
import { STATIONS } from "../event/event-schema.js";
import { stationPresentation } from "./station-presentation.js";

const OPEN_CLASS = "arkflight-mastery-scroll-open";

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function ownerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

function ownsActor(actor) {
  return Boolean(actor?.isOwner || actor?.testUserPermission?.(game.user, ownerLevel()));
}

function ownedStations(state) {
  if (game.user?.isGM) return [];
  return STATIONS.filter((stationId) => {
    const actorId = state?.assignments?.[stationId]?.actorId;
    if (!actorId) return false;
    return ownsActor(game.actors.get(actorId));
  });
}

function displayName(stationId) {
  return stationPresentation(stationId)?.displayName ?? stationId;
}

function actorName(state, stationId) {
  const actorId = state?.assignments?.[stationId]?.actorId;
  return actorId ? game.actors.get(actorId)?.name ?? "Assigned Officer" : "Assigned Officer";
}

function masteryCards(stationId, selectedId = null) {
  return (BASE_MASTERY[stationId] ?? []).map((mastery) => `
    <button type="button" class="arkflight-mastery-scroll-choice ${mastery.id === selectedId ? "selected" : ""}" data-af-mastery-choice="${mastery.id}">
      <span class="arkflight-mastery-scroll-seal"><i class="fa-solid fa-star"></i></span>
      <span class="arkflight-mastery-scroll-copy">
        <strong>${mastery.name}</strong>
        <small><b>WHEN:</b> ${mastery.triggerLabel ?? mastery.timing ?? "When its trigger occurs"}</small>
        <p>${mastery.description}</p>
        <em>Ready this Mastery</em>
      </span>
    </button>`).join("");
}

function removeOverlay(root) {
  root?.querySelector(".arkflight-mastery-scroll-overlay")?.remove();
  root?.classList?.remove(OPEN_CLASS);
}

async function chooseMastery(root, controller, stationId, masteryId) {
  try {
    await controller.command({ type: "select-mastery", station: stationId, masteryId });
    removeOverlay(root);
    ui.notifications?.info?.(`${displayName(stationId)} Mastery readied.`);
  } catch (error) {
    console.error("Arkflight | Mastery scroll selection failed", error);
    ui.notifications?.warn?.(error.message);
  }
}

function openScroll(root, controller, stationId, { force = false } = {}) {
  const state = controller?.state;
  if (!root || !state || state.phase !== "opening" || state.setupLocked) return;
  if (!game.user?.isGM && !ownedStations(state).includes(stationId)) return;

  const current = state.masterySelections?.[stationId] ?? null;
  if (current && !force) return;

  removeOverlay(root);
  const overlay = document.createElement("section");
  overlay.className = "arkflight-mastery-scroll-overlay";
  overlay.dataset.station = stationId;
  overlay.innerHTML = `
    <div class="arkflight-mastery-scroll-backdrop"></div>
    <article class="arkflight-mastery-scroll" role="dialog" aria-modal="true" aria-label="Choose ${displayName(stationId)} Mastery">
      <div class="arkflight-mastery-scroll-roll arkflight-mastery-scroll-roll--top"></div>
      <header>
        <div class="arkflight-mastery-scroll-kicker">${displayName(stationId).toUpperCase()} · ${actorName(state, stationId)}</div>
        <h2>Choose Your Mastery</h2>
        <p><strong>Mastery</strong> is a once-per-Event station technique granted by the ship. Ready one now. When its trigger occurs during the Event, Arkflight will surface the opportunity to use it. Once used, it is expended for that Event.</p>
      </header>
      <div class="arkflight-mastery-scroll-rule"><span></span><i class="fa-solid fa-diamond"></i><span></span></div>
      <div class="arkflight-mastery-scroll-options">${masteryCards(stationId, current)}</div>
      <footer>
        <span><i class="fa-solid fa-circle-info"></i> Pick the technique that best fits how you want to support the crew this Event.</span>
        <button type="button" data-af-mastery-scroll-close>Choose Later</button>
      </footer>
      <div class="arkflight-mastery-scroll-roll arkflight-mastery-scroll-roll--bottom"></div>
    </article>`;

  root.append(overlay);
  root.classList.add(OPEN_CLASS);

  for (const button of overlay.querySelectorAll("[data-af-mastery-choice]")) {
    button.addEventListener("click", () => chooseMastery(root, controller, stationId, button.dataset.afMasteryChoice));
  }
  overlay.querySelector("[data-af-mastery-scroll-close]")?.addEventListener("click", () => removeOverlay(root));
}

function decoratePlayerSetup(root, controller) {
  const state = controller?.state;
  if (!root || !state || state.phase !== "opening" || state.setupLocked || game.user?.isGM) return;

  const mine = ownedStations(state);
  for (const row of root.querySelectorAll("[data-setup-station]")) {
    const stationId = row.dataset.setupStation;
    const masterySelect = row.querySelector("select[data-ark-setup='mastery']");
    if (!masterySelect) continue;

    masterySelect.hidden = true;
    masterySelect.disabled = true;

    let button = row.querySelector("[data-af-open-mastery-scroll]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "arkflight-mastery-scroll-open-button";
      button.dataset.afOpenMasteryScroll = "";
      row.append(button);
    }

    const currentId = state.masterySelections?.[stationId] ?? null;
    const current = (BASE_MASTERY[stationId] ?? []).find((entry) => entry.id === currentId);
    const owned = mine.includes(stationId);
    button.disabled = !owned;
    button.innerHTML = current
      ? `<i class="fa-solid fa-star"></i><span><small>MASTERY READIED</small><strong>${current.name}</strong></span>`
      : owned
        ? `<i class="fa-solid fa-scroll"></i><span><small>YOUR STATION</small><strong>Choose Mastery</strong></span>`
        : `<i class="fa-solid fa-lock"></i><span><small>OTHER OFFICER</small><strong>Mastery Choice</strong></span>`;
    button.title = current?.description ?? (owned ? "Open your three Mastery choices." : "This Mastery belongs to the officer assigned to this station.");
    button.onclick = () => owned && openScroll(root, controller, stationId, { force: true });
  }

  const pending = mine.find((stationId) => !state.masterySelections?.[stationId]);
  if (pending && !root.querySelector(".arkflight-mastery-scroll-overlay")) openScroll(root, controller, pending);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  requestAnimationFrame(() => decoratePlayerSetup(root, controller));
});
