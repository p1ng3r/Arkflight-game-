const BOARD_ID = "arkflight-event-board";

async function confirmBeginResolution() {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2?.confirm) {
    try {
      const result = await DialogV2.confirm({
        window: { title: "Begin Arkflight Resolution?" },
        content: `<div class="arkflight-gm-confirm"><p>All five stations are locked.</p><p><strong>Begin Resolution now?</strong></p><p>The crew plan will remain locked and the first station in the current resolution order will become active.</p></div>`,
        yes: { label: "Begin Resolution", icon: "fa-solid fa-dice-d20" },
        no: { label: "Review Locked Plan", icon: "fa-solid fa-eye" }
      });
      if (typeof result === "boolean") return result;
    } catch (error) {
      console.warn("Arkflight | DialogV2 confirmation failed; using browser confirmation.", error);
    }
  }
  return globalThis.confirm?.("All five stations are locked. Begin Resolution now?") ?? false;
}

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
  if (controller.state?.phase !== "resolution") throw new Error("Arkflight did not enter Resolution after GM approval.");
  await refreshEventBoard();
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
    lock.innerHTML = '<i class="fa-solid fa-dice-d20"></i><b>BEGIN RESOLUTION</b><span>GM approval required.</span>';
  } else {
    lock.title = "GM: lock all five station choices.";
    lock.classList.add("pa-gm-lock");
  }

  if (lock.dataset.paGmAuthoritativeBound) return;
  lock.dataset.paGmAuthoritativeBound = "true";

  // Capture-phase ownership is deliberate: the base Player Action Board also binds this
  // button. Stop that older listener before it can try to lock an already-locked plan.
  lock.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const phase = controller.state?.phase;
      if (phase === "resolution") {
        // A stale planning DOM can survive for a moment after the controller advances.
        // Never throw or attempt to advance again; replace it with the authoritative
        // Resolution board immediately.
        await refreshEventBoard();
        return;
      }
      if (phase === "planning") {
        await controller.lockPlan();
        if (controller.state?.phase !== "locked") return;
      } else if (phase !== "locked") {
        throw new Error(`Arkflight plan cannot advance from ${phase ?? "unknown"}.`);
      }

      if (!(await confirmBeginResolution())) return;
      await beginResolution(controller);
    } catch (error) {
      console.error("Arkflight | GM plan/resolution transition failed", error);
      ui.notifications?.warn(error.message);
    }
  }, true);
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
  setTimeout(() => {
    installGmControls(root);
    hidePlayerGmControls(root);
  }, 35);
});