function rootFor(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function resolveActor(root, controller, avatar) {
  const row = avatar.closest(".arkflight-planning-station-row");
  const stationId = row?.dataset.stationId
    ?? row?.querySelector("[data-arkflight-focus-station]")?.dataset.arkflightFocusStation
    ?? null;
  if (!stationId) return { actor: null, stationId: null, actorId: null };

  const actorId = controller.state?.assignments?.[stationId]?.actorId
    ?? avatar.dataset.actorId
    ?? null;
  const actor = actorId ? game.actors.get(actorId) : null;
  return { actor, stationId, actorId };
}

function bringSheetForward(sheet) {
  try {
    if (typeof sheet.bringToFront === "function") sheet.bringToFront();
    else if (typeof sheet.bringToTop === "function") sheet.bringToTop();
  } catch (error) {
    console.warn("Arkflight | Could not raise station actor sheet", error);
  }
}

async function openActorSheet(actor) {
  if (!actor) return;
  const sheet = actor.sheet;
  if (!sheet || typeof sheet.render !== "function") {
    ui.notifications?.warn?.(`Could not open ${actor.name}'s character sheet.`);
    return;
  }

  const ApplicationV2 = foundry.applications.api.ApplicationV2;
  const isV2 = Boolean(ApplicationV2 && sheet instanceof ApplicationV2);
  console.debug("Arkflight | Opening station actor sheet", {
    actorId: actor.id,
    actorName: actor.name,
    sheetClass: sheet.constructor?.name,
    applicationV2: isV2,
    renderedBefore: sheet.rendered,
    minimizedBefore: sheet.minimized
  });

  try {
    if (isV2) {
      const result = sheet.render({ force: true });
      if (result?.then) await result;
      if (sheet.minimized && typeof sheet.maximize === "function") await sheet.maximize();
      bringSheetForward(sheet);
    } else {
      const result = sheet.render(true, { focus: true });
      if (result?.then) await result;
      bringSheetForward(sheet);
    }

    requestAnimationFrame(() => {
      bringSheetForward(sheet);
      const element = sheet.element?.[0] ?? sheet.element ?? null;
      console.debug("Arkflight | Station actor sheet rendered", {
        actorId: actor.id,
        sheetClass: sheet.constructor?.name,
        rendered: sheet.rendered,
        minimized: sheet.minimized,
        connected: Boolean(element?.isConnected)
      });
    });
  } catch (error) {
    console.error("Arkflight | Could not open assigned actor sheet", error);
    ui.notifications?.warn?.(`Could not open ${actor.name}'s character sheet.`);
  }
}

function bind(root, controller) {
  if (controller.state?.phase !== "planning") return;
  if (root.dataset.portraitSheetDelegation === "true") return;

  // Claim portrait handling before the planning-polish module can bind its legacy handler.
  root.dataset.portraitSheetDelegation = "true";
  root.dataset.portraitSheetController = "authoritative";

  root.addEventListener("click", (event) => {
    const avatar = event.target.closest?.(".arkflight-planning-avatar");
    if (!avatar || !root.contains(avatar)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  root.addEventListener("dblclick", async (event) => {
    const avatar = event.target.closest?.(".arkflight-planning-avatar");
    if (!avatar || !root.contains(avatar)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const { actor } = resolveActor(root, controller, avatar);
    if (!actor) {
      ui.notifications?.warn?.("No PF2e character is assigned to this station.");
      return;
    }
    await openActorSheet(actor);
  }, true);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootFor(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  bind(root, controller);
});
