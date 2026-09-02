const BOARD_ID = "arkflight-event-board";

function getRoot(app, element) {
  return element instanceof HTMLElement ? element : element?.[0] ?? app?.element ?? null;
}

function eventBoardApp() {
  return Object.values(ui?.windows ?? {}).find((entry) => entry?.id === BOARD_ID) ?? null;
}

async function refreshEventBoard() {
  const board = eventBoardApp();
  if (!board?.render) return;
  await board.render({ force: true });
}

async function beginResolution(controller) {
  if (controller.state?.phase !== "locked") throw new Error(`Cannot begin Arkflight Resolution from ${controller.state?.phase ?? "unknown"} phase.`);
  await controller.beginResolution();
  if (controller.state?.phase !== "resolution") throw new Error("Arkflight did not enter Resolution after the plan was locked.");
  await refreshEventBoard();
}

function installWindowChrome(root, app) {
  if (!root || !["planning", "locked"].includes(game.arkflight?.controller?.state?.phase)) return;
  const board = root.querySelector?.(".pa-board");
  if (!board || board.querySelector("[data-pa-window-chrome]")) return;

  const chrome = document.createElement("header");
  chrome.className = "pa-window-chrome";
  chrome.dataset.paWindowChrome = "true";
  chrome.innerHTML = `
    <div class="pa-window-chrome-title"><i class="fa-solid fa-compass"></i><span>Arkflight Event</span></div>
    <div class="pa-window-chrome-actions">
      <button type="button" data-pa-window-minimize title="Minimize Arkflight Event"><i class="fa-solid fa-window-minimize"></i></button>
      <button type="button" data-pa-window-close title="Close Arkflight Event"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  board.prepend(chrome);

  chrome.querySelector("[data-pa-window-minimize]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      if (typeof app?.minimize === "function") await app.minimize();
      else root.classList.toggle("pa-window-collapsed");
    } catch (error) {
      console.warn("Arkflight | Event window minimize failed", error);
    }
  });

  chrome.querySelector("[data-pa-window-close]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try { await app?.close?.(); }
    catch (error) { console.warn("Arkflight | Event window close failed", error); }
  });
}

function installAuthoritativeLockDelegation(root) {
  if (!root || !game.user?.isGM || root.dataset.paGmRootBound === "true") return;
  root.dataset.paGmRootBound = "true";

  // Bind once to the application root so the control survives every local
  // Player Action Board DOM rebuild. The older board renderer replaces the
  // Lock Plan button frequently, so a listener attached to the button itself
  // can disappear before the GM clicks it.
  root.addEventListener("click", async (event) => {
    const lock = event.target?.closest?.(".pa-lock");
    if (!lock || !root.contains(lock)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const controller = game.arkflight?.controller;
    if (!controller) return;

    try {
      const phase = controller.state?.phase;
      if (phase === "resolution") {
        await refreshEventBoard();
        return;
      }
      if (phase === "planning") {
        await controller.lockPlan();
        if (controller.state?.phase !== "locked") throw new Error("Arkflight plan did not enter the locked phase.");
      } else if (phase !== "locked") {
        throw new Error(`Arkflight plan cannot advance from ${phase ?? "unknown"}.`);
      }

      // Lock Plan is the commitment point. For the GM it now advances directly
      // into Resolution instead of leaving the board stranded on a hidden
      // intermediate locked state.
      await beginResolution(controller);
    } catch (error) {
      console.error("Arkflight | GM plan/resolution transition failed", error);
      ui.notifications?.warn(error.message);
    }
  }, true);
}

function installGmControls(root) {
  if (!root || !game.user?.isGM) return;
  const controller = game.arkflight?.controller;
  const state = controller?.state;
  if (!controller || !state || !["planning", "locked"].includes(state.phase)) return;

  const hazards = root.querySelector(".pa-hazards");
  if (hazards && !hazards.querySelector("[data-pa-gm-restart]")) {
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "pa-gm-restart";
    restart.dataset.paGmRestart = "true";
    restart.innerHTML = '<i class="fa-solid fa-rotate-left"></i><span>Restart Event</span>';
    restart.title = "Restart this Event from Round 1.";
    restart.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ok = globalThis.confirm?.("Restart this Arkflight Event from Round 1?") ?? true;
      if (!ok) return;
      try {
        await controller.command({ type: "restart-event" });
      } catch (error) {
        console.error("Arkflight | Restart Event failed", error);
        ui.notifications?.warn(error.message);
      }
    });
    hazards.append(restart);
  }

  const lock = root.querySelector(".pa-lock");
  if (!lock) return;

  if (state.phase === "locked") {
    lock.disabled = false;
    lock.classList.add("pa-begin-resolution");
    lock.innerHTML = '<i class="fa-solid fa-dice-d20"></i><b>BEGIN RESOLUTION</b><span>Continue into station resolution.</span>';
  } else {
    lock.title = "Lock all five station choices and begin Resolution.";
    lock.classList.add("pa-gm-lock");
  }
}

function hidePlayerGmControls(root) {
  if (!root || game.user?.isGM) return;
  const lock = root.querySelector(".pa-lock");
  if (!lock) return;
  lock.disabled = true;
  lock.classList.add("pa-player-waiting");
  lock.innerHTML = '<i class="fa-solid fa-hourglass-half"></i><b>WAITING FOR GM</b><span>The GM locks the crew plan and begins Resolution.</span>';
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== BOARD_ID) return;
  const root = getRoot(app, element);
  if (!root) return;

  installAuthoritativeLockDelegation(root);
  setTimeout(() => {
    installWindowChrome(root, app);
    installGmControls(root);
    hidePlayerGmControls(root);
  }, 35);
});