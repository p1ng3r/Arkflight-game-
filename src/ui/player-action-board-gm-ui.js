const BOARD_ID = "arkflight-event-board";

async function confirmBeginResolution() {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2?.confirm) {
    try {
      return await DialogV2.confirm({
        window: { title: "Begin Arkflight Resolution?" },
        content: `<div class="arkflight-gm-confirm"><p>All five stations are locked.</p><p><strong>Begin Resolution now?</strong></p><p>The crew plan will remain locked and the first station in the current resolution order will become active.</p></div>`,
        yes: { label: "Begin Resolution", icon: "fa-solid fa-dice-d20" },
        no: { label: "Review Locked Plan", icon: "fa-solid fa-eye" }
      });
    } catch (error) {
      console.warn("Arkflight | DialogV2 confirmation failed; using browser confirmation.", error);
    }
  }
  return globalThis.confirm?.("All five stations are locked. Begin Resolution now?") ?? false;
}

function getRoot(app, element) {
  return element instanceof HTMLElement ? element : element?.[0] ?? app?.element ?? null;
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
    restart.title = "Restart this Event from Round 1 while preserving current crew assignments and Mastery selections.";
    restart.addEventListener("click", async () => {
      const ok = globalThis.confirm?.("Restart this Arkflight Event from Round 1? Current crew assignments and Mastery selections will be preserved.") ?? true;
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
    lock.onclick = async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!(await confirmBeginResolution())) return;
      try {
        await controller.beginResolution();
      } catch (error) {
        console.error("Arkflight | Begin Resolution failed", error);
        ui.notifications?.warn(error.message);
      }
    };
    return;
  }

  // During Planning only the GM may lock the plan. The board's original listener still performs the lock.
  lock.title = "GM: lock all five station choices.";
  lock.classList.add("pa-gm-lock");

  // Capture the successful lock transition and immediately ask the GM whether to begin Resolution.
  if (!lock.dataset.paGmConfirmBound) {
    lock.dataset.paGmConfirmBound = "true";
    lock.addEventListener("click", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (controller.state?.phase !== "locked") return;
      if (!(await confirmBeginResolution())) return;
      try {
        await controller.beginResolution();
      } catch (error) {
        console.error("Arkflight | Begin Resolution after lock failed", error);
        ui.notifications?.warn(error.message);
      }
    });
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
  setTimeout(() => {
    installGmControls(root);
    hidePlayerGmControls(root);
  }, 35);
});
