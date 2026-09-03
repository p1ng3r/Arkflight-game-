function eventBoardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function applicationShell(root) {
  if (!root) return null;
  return root.matches?.(".application") ? root : root.closest?.(".application") ?? root.parentElement?.closest?.(".application") ?? root;
}

function applicationHeader(root) {
  const shell = applicationShell(root);
  return shell?.querySelector?.(":scope > .window-header")
    ?? shell?.querySelector?.(".window-header")
    ?? root?.querySelector?.(".window-header")
    ?? null;
}

function findCloseControl(header) {
  return header?.querySelector?.('[data-action="close"]')
    ?? header?.querySelector?.('.header-control.close')
    ?? header?.querySelector?.('.window-control.close')
    ?? header?.querySelector?.('button.close')
    ?? null;
}

function findMinimizeControl(header) {
  return header?.querySelector?.('[data-action="minimize"]')
    ?? header?.querySelector?.('.header-control.minimize')
    ?? header?.querySelector?.('.window-control.minimize')
    ?? header?.querySelector?.('button.minimize')
    ?? header?.querySelector?.('[data-arkflight-event-minimize]')
    ?? null;
}

function findAbandonControl(header) {
  return header?.querySelector?.('[data-arkflight-abandon-event]') ?? null;
}

function insertBeforeWindowControls(header, node) {
  const minimize = findMinimizeControl(header);
  const close = findCloseControl(header);
  const anchor = minimize ?? close;
  if (anchor?.parentElement === header) {
    header.insertBefore(node, anchor);
    return;
  }
  const controls = anchor?.parentElement ?? header.querySelector(".window-controls, .window-header-controls, .header-controls");
  if (controls) controls.insertBefore(node, anchor ?? controls.firstChild);
  else header.append(node);
}

function toggleLayoutTuner(root, button) {
  const internalToggle = root.querySelector?.("[data-af-tuner-toggle]");
  const panel = root.querySelector?.("[data-af-tuner]");
  if (!internalToggle || !panel) {
    ui.notifications?.warn?.("Arkflight layout tuner is not ready yet.");
    return;
  }
  internalToggle.click();
  const open = !panel.hidden;
  button?.classList?.toggle("active", open);
  button?.setAttribute?.("aria-pressed", open ? "true" : "false");
}

function ensureMinimizeControl(header, app) {
  const existing = findMinimizeControl(header);
  if (existing) return existing;
  const close = findCloseControl(header);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-event-window-control arkflight-event-minimize";
  button.dataset.arkflightEventMinimize = "true";
  button.title = "Minimize Arkflight Event";
  button.setAttribute("aria-label", "Minimize Arkflight Event");
  button.innerHTML = '<i class="fa-solid fa-minus"></i>';
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      if (typeof app?.minimize === "function") await app.minimize();
      else if (typeof app?.toggleMinimize === "function") await app.toggleMinimize();
      else ui.notifications?.warn?.("Foundry did not expose a minimize action for this Event window.");
    } catch (error) {
      console.error("Arkflight | Event Board minimize failed", error);
      ui.notifications?.warn?.(error.message);
    }
  });
  if (close?.parentElement === header) header.insertBefore(button, close);
  else {
    const controls = close?.parentElement ?? header.querySelector(".window-controls, .window-header-controls, .header-controls");
    if (controls) controls.insertBefore(button, close ?? controls.firstChild);
    else header.append(button);
  }
  return button;
}

function ensureAbandonControl(header, app) {
  if (!game.user?.isGM || !game.arkflight?.controller?.state?.eventId) {
    findAbandonControl(header)?.remove();
    return null;
  }
  const existing = findAbandonControl(header);
  if (existing) return existing;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-abandon-event-button arkflight-abandon-event-header";
  button.dataset.arkflightAbandonEvent = "true";
  button.title = "Abandon this Voyage Event";
  button.innerHTML = '<i class="fa-solid fa-trash-can"></i><span>Abandon Event</span>';
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const abandon = game.arkflight?.abandonEvent;
      if (typeof abandon !== "function") throw new Error("Arkflight abandon control is not ready yet.");
      if (await abandon()) await app?.close?.();
    } catch (error) {
      console.error("Arkflight | Event Board abandon failed", error);
      ui.notifications?.warn?.(error.message);
    }
  });
  insertBeforeWindowControls(header, button);
  return button;
}

function installHeaderTools(root, app) {
  const header = applicationHeader(root);
  if (!header) return false;

  // These controls belong to the Event application itself. They must survive
  // Opening, Planning, Resolution, Round Report, and Event Complete renders.
  ensureMinimizeControl(header, app);
  ensureAbandonControl(header, app);

  // The layout tuner is opening-only. Do not remove the normal GM event controls
  // just because the board has advanced to another phase.
  const opening = root?.classList?.contains("arkflight-opening-mode");
  if (!game.user?.isGM || !opening) {
    header.querySelector?.(".arkflight-gm-header-tools")?.remove();
    return true;
  }

  let tools = header.querySelector(".arkflight-gm-header-tools");
  if (!tools) {
    tools = document.createElement("div");
    tools.className = "arkflight-gm-header-tools";
    tools.setAttribute("aria-label", "Arkflight GM tools");

    const layout = document.createElement("button");
    layout.type = "button";
    layout.className = "arkflight-gm-header-tool";
    layout.dataset.afGmTool = "layout";
    layout.title = "GM UI layout tools";
    layout.setAttribute("aria-pressed", "false");
    layout.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i><span>UI Layout</span>';
    layout.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleLayoutTuner(root, layout);
    });

    tools.append(layout);
    insertBeforeWindowControls(header, tools);
  }

  const panel = root.querySelector("[data-af-tuner]");
  const layoutButton = tools.querySelector('[data-af-gm-tool="layout"]');
  if (panel && layoutButton) {
    layoutButton.classList.toggle("active", !panel.hidden);
    layoutButton.setAttribute("aria-pressed", panel.hidden ? "false" : "true");
  }

  return true;
}

function queueHeaderTools(root, app) {
  let tries = 0;
  const tick = () => {
    if (installHeaderTools(root, app) || tries >= 30) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = eventBoardRoot(app, element);
  if (root) queueHeaderTools(root, app);
});
