function rootFor(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function resolveActor(controller, avatar) {
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
  if (!sheet) return;
  try {
    if (typeof sheet.bringToFront === "function") sheet.bringToFront();
    else if (typeof sheet.bringToTop === "function") sheet.bringToTop();
  } catch (error) {
    console.warn("Arkflight | Could not raise station actor sheet", error);
  }
}

async function openActorSheet(actor) {
  if (!actor) return;

  console.log("Arkflight | Opening station actor through PF2e actor.render", {
    actorId: actor.id,
    actorName: actor.name,
    actorType: actor.type
  });

  try {
    // PF2e v14 uses Actor#render() when it wants an Actor's configured sheet
    // displayed. Let the document resolve the correct registered sheet rather
    // than holding onto actor.sheet before PF2e performs that resolution.
    const result = actor.render?.();
    if (result?.then) await result;

    // Actor#render may create/resolve a fresh configured sheet. Read actor.sheet
    // only after the document-level render request has completed.
    const sheet = actor.sheet ?? null;
    if (sheet?.minimized && typeof sheet.maximize === "function") await sheet.maximize();
    bringSheetForward(sheet);

    requestAnimationFrame(() => {
      const currentSheet = actor.sheet ?? sheet;
      bringSheetForward(currentSheet);
      const element = currentSheet?.element?.[0] ?? currentSheet?.element ?? null;
      element?.focus?.({ preventScroll: true });
      console.log("Arkflight | PF2e actor render completed", {
        actorId: actor.id,
        sheetClass: currentSheet?.constructor?.name ?? null,
        rendered: currentSheet?.rendered ?? null,
        minimized: currentSheet?.minimized ?? null,
        connected: Boolean(element?.isConnected)
      });
    });
  } catch (error) {
    console.error("Arkflight | Could not open assigned actor through actor.render", error);
    ui.notifications?.warn?.(`Could not open ${actor.name}'s character sheet.`);
  }
}

function bind(root, controller) {
  if (controller.state?.phase !== "planning") return;
  if (root.dataset.portraitSheetDelegation === "true") return;

  // Claim portrait handling before the planning-polish module can bind its older
  // portrait behavior. A single portrait click opens the assigned PF2e Actor.
  root.dataset.portraitSheetDelegation = "true";
  root.dataset.portraitSheetController = "authoritative";

  root.addEventListener("click", async (event) => {
    const avatar = event.target.closest?.(".arkflight-planning-avatar");
    if (!avatar || !root.contains(avatar)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const { actor } = resolveActor(controller, avatar);
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
