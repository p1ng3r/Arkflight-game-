import { BASE_MASTERY } from "../content/base-mastery.js";
import { STATIONS } from "../event/event-schema.js";
import { stationPresentation } from "./station-presentation.js";

const OPEN_CLASS = "arkflight-arkcraft-scroll-open";

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

function arkcraftCards(stationId, selectedId = null) {
  return (BASE_MASTERY[stationId] ?? []).map((arkcraft) => `
    <button type="button" class="arkflight-arkcraft-choice ${arkcraft.id === selectedId ? "selected" : ""}" data-af-arkcraft-choice="${arkcraft.id}">
      <span class="arkflight-arkcraft-seal"><i class="fa-solid fa-star"></i></span>
      <span class="arkflight-arkcraft-copy">
        <strong>${arkcraft.name}</strong>
        <small><b>WHEN:</b> ${arkcraft.triggerLabel ?? arkcraft.timing ?? "When its trigger occurs"}</small>
        <p>${arkcraft.description}</p>
        <em>${arkcraft.id === selectedId ? "Currently Readied" : "Choose this Arkcraft Skill"}</em>
      </span>
    </button>`).join("");
}

function removeOverlay(root) {
  root?.querySelector(".arkflight-arkcraft-scroll-overlay")?.remove();
  root?.classList?.remove(OPEN_CLASS);
}

async function chooseArkcraft(root, controller, stationId, arkcraftId) {
  try {
    await controller.command({ type: "select-mastery", station: stationId, masteryId: arkcraftId });
    removeOverlay(root);
    ui.notifications?.info?.(`${displayName(stationId)} Arkcraft Skill readied.`);
  } catch (error) {
    console.error("Arkflight | Arkcraft Skill selection failed", error);
    ui.notifications?.warn?.(error.message);
  }
}

function openArkcraftScroll(root, controller, stationId) {
  const state = controller?.state;
  if (!root || !state || state.phase !== "opening" || state.setupLocked) return;
  if (!game.user?.isGM && !ownedStations(state).includes(stationId)) return;

  const current = state.masterySelections?.[stationId] ?? null;
  const data = presentation(stationId);
  removeOverlay(root);

  const overlay = document.createElement("section");
  overlay.className = "arkflight-arkcraft-scroll-overlay";
  overlay.dataset.station = stationId;
  overlay.innerHTML = `
    <div class="arkflight-arkcraft-scroll-backdrop"></div>
    <article class="arkflight-arkcraft-scroll" role="dialog" aria-modal="true" aria-label="Choose ${displayName(stationId)} Arkcraft Skill">
      <div class="arkflight-arkcraft-scroll-content">
        <header>
          <div class="arkflight-arkcraft-kicker">${displayName(stationId).toUpperCase()} · ${actorName(state, stationId)}</div>
          <h2>Choose Your Arkcraft Skill</h2>
          <p>An <strong>Arkcraft Skill</strong> is a specialized station technique used aboard an Arkflight vessel. Choose one to ready for this Event. You may return here and choose a different one until Crew Muster is locked.</p>
          <div class="arkflight-arkcraft-station-note"><strong>${displayName(stationId)}</strong> — ${data.description}<br><span>Typical PF2e skills: ${(data.typicalSkills ?? []).join(", ")}</span></div>
        </header>
        <div class="arkflight-arkcraft-rule"><span></span><i class="fa-solid fa-diamond"></i><span></span></div>
        <div class="arkflight-arkcraft-options">${arkcraftCards(stationId, current)}</div>
        <footer>
          <span><i class="fa-solid fa-circle-info"></i> Your choice remains changeable until the Event setup is locked.</span>
          <button type="button" data-af-arkcraft-close>Return to Muster</button>
        </footer>
      </div>
    </article>`;

  root.append(overlay);
  root.classList.add(OPEN_CLASS);

  for (const button of overlay.querySelectorAll("[data-af-arkcraft-choice]")) {
    button.addEventListener("click", () => chooseArkcraft(root, controller, stationId, button.dataset.afArkcraftChoice));
  }
  overlay.querySelector("[data-af-arkcraft-close]")?.addEventListener("click", () => removeOverlay(root));
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

function decorateStationHelp(row, stationId) {
  const identity = row.querySelector(".arkflight-setup-station") ?? row;
  identity.title = stationHelp(stationId);
  identity.classList.add("arkflight-station-help-target");
}

function decoratePlayerClaim(row, root, controller, stationId) {
  const state = controller.state;
  const original = row.querySelector("select[data-ark-setup='actor']");
  if (!original) return;

  const assignedActorId = state?.assignments?.[stationId]?.actorId ?? null;
  const assignedActor = assignedActorId ? game.actors.get(assignedActorId) : null;
  const claimedByMe = Boolean(assignedActor && ownsActor(assignedActor));
  const claimedByOther = Boolean(assignedActorId && !claimedByMe);

  const select = document.createElement("select");
  select.className = "arkflight-player-station-select";
  select.dataset.afStationClaim = stationId;
  select.title = claimedByOther
    ? `${displayName(stationId)} is already claimed by ${assignedActor?.name ?? "another officer"}.`
    : stationHelp(stationId);

  if (claimedByOther) {
    const option = document.createElement("option");
    option.value = assignedActorId;
    option.textContent = `${assignedActor?.name ?? "Claimed"} — Claimed`;
    option.selected = true;
    select.append(option);
    select.disabled = true;
  } else {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = claimedByMe ? "— Release Station —" : "— Choose Your Officer —";
    blank.selected = !assignedActorId;
    select.append(blank);

    for (const actor of availableOwnedCharacters(state, stationId)) {
      const option = document.createElement("option");
      option.value = actor.id;
      option.textContent = actor.name;
      option.selected = actor.id === assignedActorId;
      select.append(option);
    }
    select.disabled = ownedCharacters().length === 0;
  }

  select.addEventListener("change", async (event) => {
    const el = event.currentTarget;
    const actorId = el.value || null;
    el.disabled = true;
    try {
      await controller.command({ type: "assign-actor", station: stationId, actorId });
      if (actorId) ui.notifications?.info?.(`${displayName(stationId)} claim sent to the GM.`);
      else {
        ui.notifications?.info?.(`${displayName(stationId)} released.`);
        removeOverlay(root);
      }
    } catch (error) {
      console.error("Arkflight | Station claim failed", error);
      ui.notifications?.warn?.(error.message);
      el.disabled = false;
    }
  });

  original.replaceWith(select);
  row.classList.toggle("arkflight-player-claimable", !claimedByOther);
  row.classList.toggle("arkflight-player-owned-station", claimedByMe);
  row.classList.toggle("arkflight-player-claimed-other", claimedByOther);
}

function decorateArkcraftArea(row, root, controller, stationId) {
  const state = controller.state;
  const slot = row.querySelector(`[data-af-arkcraft-slot="${stationId}"]`);
  if (!slot) return;

  const currentId = state.masterySelections?.[stationId] ?? null;
  const current = (BASE_MASTERY[stationId] ?? []).find((entry) => entry.id === currentId);
  const canChoose = game.user?.isGM || ownedStations(state).includes(stationId);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-arkcraft-skill-link";
  button.dataset.afOpenArkcraft = stationId;
  button.disabled = !canChoose;
  button.innerHTML = current
    ? `<span><small>ARKCRAFT SKILL</small><strong>${current.name}</strong></span>`
    : canChoose
      ? `<span><small>ARKCRAFT SKILL</small><strong>Choose Arkcraft Skill</strong></span>`
      : `<span><small>ARKCRAFT SKILL</small><strong>${state.assignments?.[stationId]?.actorId ? "Officer Chooses" : "Claim Station First"}</strong></span>`;
  button.title = current?.description ?? (canChoose ? "Open this station's Arkcraft Skills." : "Claim this station before choosing an Arkcraft Skill.");
  button.addEventListener("click", () => canChoose && openArkcraftScroll(root, controller, stationId));
  slot.replaceChildren(button);
}

function decorateSetup(root, controller) {
  const state = controller?.state;
  if (!root || !state || state.phase !== "opening" || state.setupLocked) return false;

  const rows = [...root.querySelectorAll("[data-setup-station]")];
  if (rows.length !== STATIONS.length) return false;

  for (const row of rows) {
    const stationId = row.dataset.setupStation;
    decorateStationHelp(row, stationId);
    if (!game.user?.isGM) decoratePlayerClaim(row, root, controller, stationId);
    decorateArkcraftArea(row, root, controller, stationId);
  }
  return true;
}

function queueDecorate(root, controller) {
  let tries = 0;
  const tick = () => {
    if (!root?.isConnected || !controller?.state) return;
    if (decorateSetup(root, controller)) return;
    tries += 1;
    if (tries < 45) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  queueDecorate(root, controller);
});
