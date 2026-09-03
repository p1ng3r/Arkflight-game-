import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { STATIONS } from "../event/event-schema.js";
import { planningReady } from "../event/planning-state.js";

const BOARD_ID = "arkflight-event-board";
const boardObservers = new WeakMap();
const phaseRepairs = new WeakSet();
const commandBarInstalls = new WeakSet();

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

function disconnectObserver(root) {
  boardObservers.get(root)?.disconnect();
  boardObservers.delete(root);
}

function queueAuthoritativePhaseRender(root, app, controller) {
  if (!root || !app || !controller || phaseRepairs.has(app)) return;
  phaseRepairs.add(app);

  root.querySelector(".pa-board")?.remove();
  root.classList.remove("arkflight-player-action-mode");
  disconnectObserver(root);

  setTimeout(async () => {
    try {
      await app.render({ force: true });
    } catch (error) {
      console.error("Arkflight | Could not restore authoritative Event Board phase UI", error);
      ui.notifications?.warn(error.message);
    } finally {
      phaseRepairs.delete(app);
    }
  }, 0);
}

function repairPhaseIfNeeded(root, app, controller) {
  const state = controller?.state;
  if (!state) return false;

  if (state.phase === "locked") {
    if (phaseRepairs.has(app)) return true;
    phaseRepairs.add(app);
    root.querySelector(".pa-board")?.remove();
    root.classList.remove("arkflight-player-action-mode");
    disconnectObserver(root);
    setTimeout(async () => {
      try {
        if (controller.state?.phase === "locked") await controller.beginResolution();
        await app.render({ force: true });
      } catch (error) {
        console.error("Arkflight | Legacy locked phase recovery failed", error);
        ui.notifications?.warn(error.message);
      } finally {
        phaseRepairs.delete(app);
      }
    }, 0);
    return true;
  }

  if (state.phase !== "planning") {
    disconnectObserver(root);
    if (root.querySelector(".pa-board") || root.classList.contains("arkflight-player-action-mode")) {
      queueAuthoritativePhaseRender(root, app, controller);
    }
    return true;
  }

  return false;
}

function installCommandBar(root, app) {
  const controller = game.arkflight?.controller;
  const state = controller?.state;
  if (!controller || !state) return true;
  if (repairPhaseIfNeeded(root, app, controller)) return true;

  const board = root?.querySelector?.(".pa-board");
  if (!board) return false;

  // Direct station-focus renders rebuild .pa-board with innerHTML. If the current
  // board already owns a command shell, leave it alone; otherwise restore it.
  if (board.querySelector("[data-pa-command-shell]")) return true;
  if (commandBarInstalls.has(root)) return true;
  commandBarInstalls.add(root);

  try {
    board.querySelector(".pa-footer")?.remove();

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
        <button type="button" class="pa-command-lock" data-pa-command-lock ${!ready ? "disabled" : ""}>
          <i class="fa-solid fa-lock"></i>
          <span>LOCK PLAN</span>
          <small>${ready ? "Commit the crew and begin Resolution." : "Complete all five stations first."}</small>
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
        await controller.lockPlan();
        const phase = controller.state?.phase;
        if (phase === "locked") await controller.beginResolution();
        if (controller.state?.phase !== "resolution") throw new Error(`Arkflight failed to enter Resolution; current phase is ${controller.state?.phase ?? "unknown"}.`);
        queueAuthoritativePhaseRender(root, app, controller);
      } catch (error) {
        console.error("Arkflight | Lock Plan → Resolution failed", error);
        ui.notifications?.warn(error.message);
        button.disabled = false;
      }
    });

    return true;
  } finally {
    commandBarInstalls.delete(root);
  }
}

function ensurePersistentObserver(root, app) {
  if (boardObservers.has(root)) return;

  const observer = new MutationObserver(() => {
    const controller = game.arkflight?.controller;
    if (!controller?.state) return;
    if (controller.state.phase !== "planning") {
      repairPhaseIfNeeded(root, app, controller);
      return;
    }
    const board = root.querySelector?.(".pa-board");
    if (!board || board.querySelector("[data-pa-command-shell]")) return;
    installCommandBar(root, app);
  });

  observer.observe(root, { childList: true, subtree: true });
  boardObservers.set(root, observer);
}

function installWhenBoardExists(root, app) {
  const controller = game.arkflight?.controller;
  if (repairPhaseIfNeeded(root, app, controller)) return;

  ensurePersistentObserver(root, app);
  installCommandBar(root, app);
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== BOARD_ID) return;
  const root = getRoot(app, element);
  if (!root) return;

  installWhenBoardExists(root, app);
});
