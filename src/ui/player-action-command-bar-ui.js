import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { STATIONS } from "../event/event-schema.js";
import { planningReady } from "../event/planning-state.js";

const BOARD_ID = "arkflight-event-board";
const pendingObservers = new WeakMap();

function getRoot(app, element) {
  return element instanceof HTMLElement ? element : element?.[0] ?? app?.element ?? null;
}

function readyCount(state) {
  return STATIONS.filter((stationId) => {
    const assignment = state?.assignments?.[stationId];
    const selection = state?.selections?.[stationId];
    return Boolean(assignment?.actorId && selection?.actionId && selection?.skillId);
  }).length;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tacticsDrawerHtml(state) {
  const cards = (state?.crewEdgeHand ?? []).map(getCrewEdgeCard).filter(Boolean);
  if (!cards.length) return '<div class="pa-command-empty">No Crew Tactics are ready.</div>';
  return cards.map((card) => `
    <article class="pa-command-tactic-card">
      <header><i class="fa-solid fa-diamond"></i><strong>${esc(card.name)}</strong></header>
      <div><b>Trigger:</b> ${esc(card.trigger)}</div>
      <div><b>Effect:</b> ${esc(card.effect)}</div>
    </article>`).join("");
}

function installCommandBar(root, app) {
  const controller = game.arkflight?.controller;
  const state = controller?.state;
  if (!controller || !state || !["planning", "locked"].includes(state.phase)) return true;

  const board = root?.querySelector?.(".pa-board");
  if (!board) return false;

  board.querySelector(".pa-footer")?.remove();
  board.querySelector("[data-pa-command-shell]")?.remove();

  const tacticsCount = (state.crewEdgeHand ?? []).map(getCrewEdgeCard).filter(Boolean).length;
  const count = readyCount(state);
  const ready = planningReady(state);
  const shell = document.createElement("section");
  shell.className = "pa-command-shell";
  shell.dataset.paCommandShell = "true";
  shell.innerHTML = `
    <div class="pa-command-drawer" data-pa-command-drawer hidden>
      <div class="pa-command-drawer-head"><strong>CREW TACTICS</strong><span>${tacticsCount} / 3 READY</span></div>
      <div class="pa-command-tactic-list">${tacticsDrawerHtml(state)}</div>
    </div>
    <div class="pa-command-bar">
      <button type="button" class="pa-command-tactics" data-pa-command-tactics aria-expanded="false">
        <i class="fa-solid fa-cards-blank"></i><span>TACTICS</span><b>${tacticsCount} READY</b><i class="fa-solid fa-chevron-up pa-command-chevron"></i>
      </button>
      <div class="pa-command-readiness ${ready ? "is-ready" : ""}">
        <span>CREW PLAN</span><strong>${count} / ${STATIONS.length} STATIONS READY</strong>
      </div>
      <button type="button" class="pa-command-lock" data-pa-command-lock ${(!ready && state.phase === "planning") ? "disabled" : ""}>
        <i class="fa-solid ${state.phase === "locked" ? "fa-dice-d20" : "fa-lock"}"></i>
        <span>${state.phase === "locked" ? "BEGIN RESOLUTION" : "LOCK PLAN"}</span>
        <small>${ready || state.phase === "locked" ? "Commit the crew and begin Resolution." : "Complete all five stations first."}</small>
      </button>
    </div>`;
  board.append(shell);

  shell.querySelector("[data-pa-command-tactics]")?.addEventListener("click", (event) => {
    event.preventDefault();
    const button = event.currentTarget;
    const drawer = shell.querySelector("[data-pa-command-drawer]");
    const opening = drawer.hasAttribute("hidden");
    drawer.toggleAttribute("hidden", !opening);
    button.setAttribute("aria-expanded", String(opening));
    shell.classList.toggle("is-tactics-open", opening);
  });

  shell.querySelector("[data-pa-command-lock]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!game.user?.isGM) return;
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    try {
      let phase = controller.state?.phase;
      if (phase === "planning") {
        await controller.lockPlan();
        phase = controller.state?.phase;
      }
      // Legacy recovery only: current lockPlan is atomic and enters Resolution.
      if (phase === "locked") {
        await controller.beginResolution();
        phase = controller.state?.phase;
      }
      if (phase !== "resolution") throw new Error(`Arkflight failed to enter Resolution; current phase is ${phase ?? "unknown"}.`);
      await app.render({ force: true });
    } catch (error) {
      console.error("Arkflight | Lock Plan → Resolution failed", error);
      ui.notifications?.warn(error.message);
      button.disabled = false;
    }
  });

  return true;
}

function installWhenBoardExists(root, app) {
  if (installCommandBar(root, app)) {
    pendingObservers.get(root)?.disconnect();
    pendingObservers.delete(root);
    return;
  }

  pendingObservers.get(root)?.disconnect();
  const observer = new MutationObserver(() => {
    if (!installCommandBar(root, app)) return;
    observer.disconnect();
    pendingObservers.delete(root);
  });
  observer.observe(root, { childList: true, subtree: true });
  pendingObservers.set(root, observer);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== BOARD_ID) return;
  const root = getRoot(app, element);
  if (!root) return;

  // The Player Action Board replaces the application DOM from its own render hook.
  // Observe that replacement instead of depending on hook/timer ordering. This makes
  // the compact command bar authoritative every time planning UI is created.
  installWhenBoardExists(root, app);
});
