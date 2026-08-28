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

function installHeaderTools(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return false;
  const header = applicationHeader(root);
  if (!header) return false;

  // Players must never receive GM authoring controls.
  if (!game.user?.isGM) {
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

    const close = findCloseControl(header);
    if (close?.parentElement === header) header.insertBefore(tools, close);
    else {
      const controls = close?.parentElement ?? header.querySelector(".window-controls, .window-header-controls, .header-controls");
      if (controls) controls.insertBefore(tools, close ?? controls.firstChild);
      else header.append(tools);
    }
  }

  // Keep the header button state synchronized if the tuner is closed from its own X.
  const panel = root.querySelector("[data-af-tuner]");
  const layoutButton = tools.querySelector('[data-af-gm-tool="layout"]');
  if (panel && layoutButton) {
    layoutButton.classList.toggle("active", !panel.hidden);
    layoutButton.setAttribute("aria-pressed", panel.hidden ? "false" : "true");
  }

  return true;
}

function queueHeaderTools(root) {
  let tries = 0;
  const tick = () => {
    if (installHeaderTools(root) || tries >= 30) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = eventBoardRoot(app, element);
  if (root) queueHeaderTools(root);
});
