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

function eventWindowRect(root, app) {
  const rect = root?.getBoundingClientRect?.();
  return {
    left: Number(app?.position?.left ?? rect?.left ?? 0),
    top: Number(app?.position?.top ?? rect?.top ?? 0),
    width: Number(app?.position?.width ?? rect?.width ?? 1180),
    height: Number(app?.position?.height ?? rect?.height ?? 820)
  };
}

function pillRect() {
  const viewportWidth = Math.max(0, Number(globalThis.innerWidth ?? document.documentElement?.clientWidth ?? 1280));
  const width = Math.min(320, Math.max(250, viewportWidth - 48));
  return {
    width,
    height: 38,
    left: Math.max(12, Math.round((viewportWidth - width) / 2)),
    top: 10
  };
}

function setEventWindowPosition(app, root, rect) {
  if (typeof app?.setPosition === "function") app.setPosition(rect);
  else if (root) {
    if (Number.isFinite(rect.left)) root.style.left = `${rect.left}px`;
    if (Number.isFinite(rect.top)) root.style.top = `${rect.top}px`;
    if (Number.isFinite(rect.width)) root.style.width = `${rect.width}px`;
    if (Number.isFinite(rect.height)) root.style.height = `${rect.height}px`;
  }
}

function setPillState(root, app, minimized) {
  if (!root) return;
  const button = root.querySelector?.("[data-pa-window-minimize]");

  if (minimized) {
    if (!app._arkflightRestoreRect) app._arkflightRestoreRect = eventWindowRect(root, app);
    root.classList.add("pa-window-pill");
    setEventWindowPosition(app, root, pillRect());
    if (button) {
      button.title = "Restore Arkflight Event";
      button.innerHTML = '<i class="fa-solid fa-window-maximize"></i>';
    }
    return;
  }

  root.classList.remove("pa-window-pill");
  const restore = app._arkflightRestoreRect;
  app._arkflightRestoreRect = null;
  if (restore) setEventWindowPosition(app, root, restore);
  if (button) {
    button.title = "Minimize Arkflight Event";
    button.innerHTML = '<i class="fa-solid fa-window-minimize"></i>';
  }
}

function installWindowDrag(chrome, root, app) {
  if (!chrome || chrome.dataset.paWindowDragBound === "true") return;
  chrome.dataset.paWindowDragBound = "true";

  chrome.addEventListener("pointerdown", (event) => {
    if (root.classList.contains("pa-window-pill")) return;
    if (event.button !== 0 || event.target?.closest?.("button, select, input, a")) return;
    event.preventDefault();

    const rect = root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = Number(app?.position?.left ?? rect.left);
    const startTop = Number(app?.position?.top ?? rect.top);
    const width = Number(app?.position?.width ?? rect.width);
    const height = Number(app?.position?.height ?? rect.height);
    const viewportWidth = Math.max(0, Number(globalThis.innerWidth ?? document.documentElement?.clientWidth ?? width));
    const viewportHeight = Math.max(0, Number(globalThis.innerHeight ?? document.documentElement?.clientHeight ?? height));

    chrome.classList.add("is-dragging");
    chrome.setPointerCapture?.(event.pointerId);

    const onMove = (moveEvent) => {
      const maxLeft = Math.max(0, viewportWidth - Math.min(width, 180));
      const maxTop = Math.max(0, viewportHeight - 40);
      const left = Math.max(0, Math.min(maxLeft, startLeft + moveEvent.clientX - startX));
      const top = Math.max(0, Math.min(maxTop, startTop + moveEvent.clientY - startY));
      setEventWindowPosition(app, root, { left, top });
    };

    const onUp = (upEvent) => {
      chrome.classList.remove("is-dragging");
      chrome.releasePointerCapture?.(upEvent.pointerId);
      chrome.removeEventListener("pointermove", onMove);
      chrome.removeEventListener("pointerup", onUp);
      chrome.removeEventListener("pointercancel", onUp);
    };

    chrome.addEventListener("pointermove", onMove);
    chrome.addEventListener("pointerup", onUp);
    chrome.addEventListener("pointercancel", onUp);
  });
}

function installWindowChrome(root, app) {
  if (!root || !["planning", "locked"].includes(game.arkflight?.controller?.state?.phase)) return;
  const board = root.querySelector?.(".pa-board");
  if (!board) return;

  let chrome = board.querySelector("[data-pa-window-chrome]");
  if (!chrome) {
    chrome = document.createElement("header");
    chrome.className = "pa-window-chrome";
    chrome.dataset.paWindowChrome = "true";
    chrome.innerHTML = `
      <div class="pa-window-chrome-title"><i class="fa-solid fa-compass"></i><span>Arkflight Event</span></div>
      <div class="pa-window-chrome-actions">
        <button type="button" data-pa-window-minimize title="Minimize Arkflight Event"><i class="fa-solid fa-window-minimize"></i></button>
        <button type="button" data-pa-window-close title="Close Arkflight Event"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
    board.prepend(chrome);

    chrome.querySelector("[data-pa-window-minimize]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setPillState(root, app, !root.classList.contains("pa-window-pill"));
    });

    chrome.addEventListener("dblclick", (event) => {
      if (!root.classList.contains("pa-window-pill") || event.target?.closest?.("button")) return;
      event.preventDefault();
      setPillState(root, app, false);
    });

    chrome.querySelector("[data-pa-window-close]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try { await app?.close?.(); }
      catch (error) { console.warn("Arkflight | Event window close failed", error); }
    });
  }

  installWindowDrag(chrome, root, app);
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