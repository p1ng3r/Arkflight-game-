function rootElement(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function actorOwnedByCurrentUser(actor) {
  if (game.user.isGM) return true;
  if (!actor) return false;
  if (actor.isOwner) return true;
  const ownerLevel = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return Boolean(actor.testUserPermission?.(game.user, ownerLevel));
}

function refreshPlayerActorSelect(select) {
  if (!select || game.user.isGM) return;

  select.disabled = false;
  const selected = select.value;
  for (const option of [...select.options]) {
    if (!option.value) continue;
    const actor = game.actors.get(option.value);
    if (!actorOwnedByCurrentUser(actor)) option.remove();
  }

  if (selected && ![...select.options].some((option) => option.value === selected)) select.value = "";
  select.title = "Choose one of your PF2e characters to claim this Arkflight station for the Event.";
}

export function installPlayerSetupClaims() {
  Hooks.on("renderApplicationV2", (app, element) => {
    const root = rootElement(app, element);
    const controller = game.arkflight?.controller;
    if (!root || !controller?.state || controller.state.phase !== "opening" || controller.state.setupLocked) return;

    for (const actorSelect of root.querySelectorAll('select[data-ark-setup="actor"]')) refreshPlayerActorSelect(actorSelect);
  });
}
