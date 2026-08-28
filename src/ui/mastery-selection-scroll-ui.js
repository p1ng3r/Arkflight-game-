import { BASE_MASTERY } from "../content/base-mastery.js";
import { STATIONS } from "../event/event-schema.js";
import { stationPresentation } from "./station-presentation.js";

const OPEN_CLASS = "arkflight-mastery-scroll-open";
const promptedClaims = new Set();

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

function ownedCharacters() {
  return game.actors.contents
    .filter((actor) => actor.type === "character" && ownsActor(actor))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ownedStations(state) {
  if (game.user?.isGM) return [];
  return STATIONS.filter((stationId) => {
    const actorId = state?.assignments?.[stationId]?.actorId;
    return Boolean(actorId && ownsActor(game.actors.get(actorId)));
  });
}

function presentation(stationId) {
  return stationPresentation(stationId) ?? { displayName: stationId, description: "Arkflight station.", typicalSkills: [] };
}

function displayName(stationId) {
  return presentation(stationId).displayName;
}

function stationHelp(stationId) {
  const data = presentation(stationId);
  const skills = data.typicalSkills?.length ? data.typicalSkills.join(", ") : "varies by Event";
  return `${data.description}\n\nTypical PF2e skills: ${skills}`;
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
        <em>${mastery.id === selectedId ? "Currently Readied — choose again to confirm" : "Ready this Mastery"}</em>
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
  const data = presentation(stationId);
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
        <p><strong>Mastery</strong> is a once-per-Event station technique granted by the ship. Ready one now. When its trigger occurs, Arkflight will surface the opportunity to use it. Once used, it is expended for that Event.</p>
        <div class="arkflight-mastery-scroll-station-note"><strong>${displayName(stationId)}</strong> — ${data.description}<br><span>Typical skills: ${(data.typicalSkills ?? []).join(", ")}</span></div>
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

function availableOwnedCharacters(state, stationId) {
  const currentActorId = state?.assignments?.[stationId]?.actorId ?? null;
  const occupiedElsewhere = new Set(
    STATIONS.filter((id) => id !== stationId)
      .map((id) => state?.assignments?.[id]?.actorId)
      .filter(Boolean)
  );
  return ownedCharacters().filter((actor) => actor.id === currentActorId || !occupiedElsewhere.has(actor.id));
}

async function claimStation(controller, stationId) {
  const state = controller.state;
  const currentActorId = state?.assignments?.[stationId]?.actorId ?? null;
  const currentActor = currentActorId ? game.actors.get(currentActorId) : null;
  if (currentActorId && !ownsActor(currentActor)) {
    ui.notifications?.warn?.(`${displayName(stationId)} is already claimed by another officer.`);
    return;
  }

  const actors = availableOwnedCharacters(state, stationId);
  if (!actors.length && !currentActorId) {
    ui.notifications?.warn?.("You need ownership of a PF2e character before you can claim an Arkflight station.");
    return;
  }

  const options = [
    ...(currentActorId ? ['<option value="">Release this station</option>'] : []),
    ...actors.map((actor) => `<option value="${actor.id}" ${actor.id === currentActorId ? "selected" : ""}>${actor.name}</option>`)
  ].join("");

  const result = await foundry.applications.api.DialogV2.input({
    window: { title: `Claim ${displayName(stationId)}` },
    classes: ["arkflight", "arkflight-station-claim-dialog"],
    modal: true,
    rejectClose: false,
    content: `<div class="arkflight-station-claim-copy"><p>${presentation(stationId).description}</p><p><strong>Typical skills:</strong> ${(presentation(stationId).typicalSkills ?? []).join(", ")}</p></div><label>Officer<select name="actorId">${options}</select></label>`,
    ok: { label: currentActorId ? "Update Station" : "Claim Station", icon: "fa-solid fa-user-check" }
  });
  if (!result) return;

  try {
    await controller.command({ type: "assign-actor", station: stationId, actorId: result.actorId || null });
    if (result.actorId) ui.notifications?.info?.(`${displayName(stationId)} claim sent to the GM.`);
  } catch (error) {
    console.error("Arkflight | Station claim failed", error);
    ui.notifications?.warn?.(error.message);
  }
}

function decorateStationHelp(row, stationId) {
  const identity = row.querySelector(".arkflight-setup-station") ?? row;
  identity.title = stationHelp(stationId);
  identity.classList.add("arkflight-station-help-target");
}

function decoratePlayerClaim(row, controller, stationId) {
  const state = controller.state;
  const actorSelect = row.querySelector("select[data-ark-setup='actor']");
  if (!actorSelect) return;
  actorSelect.hidden = true;
  actorSelect.disabled = true;

  const assignedActorId = state?.assignments?.[stationId]?.actorId ?? null;
  const assignedActor = assignedActorId ? game.actors.get(assignedActorId) : null;
  const claimedByMe = Boolean(assignedActor && ownsActor(assignedActor));
  const claimedByOther = Boolean(assignedActorId && !claimedByMe);

  let button = row.querySelector("[data-af-claim-station]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "arkflight-station-claim-button";
    button.dataset.afClaimStation = "";
    actorSelect.insertAdjacentElement("afterend", button);
  }

  button.disabled = claimedByOther;
  button.innerHTML = claimedByOther
    ? `<i class="fa-solid fa-lock"></i><span><small>OFFICER</small><strong>${assignedActor?.name ?? "Claimed"}</strong></span>`
    : claimedByMe
      ? `<i class="fa-solid fa-user-check"></i><span><small>YOUR STATION</small><strong>${assignedActor?.name ?? "Officer"}</strong></span>`
      : `<i class="fa-solid fa-hand"></i><span><small>OFFICER</small><strong>Claim Station</strong></span>`;
  button.title = claimedByOther ? `${displayName(stationId)} is already claimed.` : `Claim or change ${displayName(stationId)}.\n\n${stationHelp(stationId)}`;
  button.onclick = () => !claimedByOther && claimStation(controller, stationId);

  row.classList.toggle("arkflight-player-claimable", !claimedByOther);
  row.classList.toggle("arkflight-player-owned-station", claimedByMe);
  row.classList.toggle("arkflight-player-claimed-other", claimedByOther);
}

function decorateMasteryArea(row, root, controller, stationId) {
  const state = controller.state;
  const masterySelect = row.querySelector("select[data-ark-setup='mastery']");
  if (!masterySelect) return;
  masterySelect.hidden = true;
  masterySelect.disabled = true;

  let button = row.querySelector("[data-af-open-mastery-scroll]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "arkflight-mastery-scroll-open-button";
    button.dataset.afOpenMasteryScroll = "";
    masterySelect.insertAdjacentElement("afterend", button);
  }

  const currentId = state.masterySelections?.[stationId] ?? null;
  const current = (BASE_MASTERY[stationId] ?? []).find((entry) => entry.id === currentId);
  const canChoose = game.user?.isGM || ownedStations(state).includes(stationId);
  button.disabled = !canChoose;
  button.innerHTML = current
    ? `<i class="fa-solid fa-star"></i><span><small>MASTERY</small><strong>${current.name}</strong></span>`
    : canChoose
      ? `<i class="fa-solid fa-scroll"></i><span><small>MASTERY</small><strong>Choose Mastery</strong></span>`
      : `<i class="fa-solid fa-lock"></i><span><small>MASTERY</small><strong>${state.assignments?.[stationId]?.actorId ? "Officer Chooses" : "Claim Station First"}</strong></span>`;
  button.title = current?.description ?? (canChoose ? "Open the three Mastery choices for this station." : "The assigned officer chooses this station's Mastery.");
  button.onclick = () => canChoose && openScroll(root, controller, stationId, { force: true });
}

function decorateSetup(root, controller) {
  const state = controller?.state;
  if (!root || !state || state.phase !== "opening" || state.setupLocked) return;

  const mine = ownedStations(state);
  for (const row of root.querySelectorAll("[data-setup-station]")) {
    const stationId = row.dataset.setupStation;
    decorateStationHelp(row, stationId);
    if (!game.user?.isGM) decoratePlayerClaim(row, controller, stationId);
    decorateMasteryArea(row, root, controller, stationId);
  }

  if (game.user?.isGM) return;
  for (const stationId of mine) {
    const key = `${state.eventId}:${stationId}`;
    if (promptedClaims.has(key)) continue;
    promptedClaims.add(key);
    if (!root.querySelector(".arkflight-mastery-scroll-overlay")) {
      openScroll(root, controller, stationId, { force: true });
      break;
    }
  }
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  requestAnimationFrame(() => decorateSetup(root, controller));
});
