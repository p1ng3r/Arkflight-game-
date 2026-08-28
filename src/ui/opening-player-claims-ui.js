function rootElement(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function ownerLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
}

function ownsActor(actor) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  return Boolean(actor.testUserPermission?.(game.user, ownerLevel()));
}

function configurePlayerStationSelect(select, controller) {
  if (!select || game.user?.isGM) return;

  const stationId = select.dataset.station;
  const assignedActorId = controller.state?.assignments?.[stationId]?.actorId ?? null;
  const assignedActor = assignedActorId ? game.actors.get(assignedActorId) : null;
  const claimedByOther = Boolean(assignedActorId && !ownsActor(assignedActor));

  if (claimedByOther) {
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = assignedActorId;
    option.textContent = `${assignedActor?.name ?? "Claimed"} — Claimed`;
    option.selected = true;
    select.append(option);
    select.disabled = true;
    select.title = "This station is already claimed by another player.";
    return;
  }

  const selected = assignedActorId ?? "";
  select.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = selected ? "— Release Station —" : "— Choose Your Officer —";
  blank.selected = !selected;
  select.append(blank);

  const occupiedElsewhere = new Set(
    Object.entries(controller.state?.assignments ?? {})
      .filter(([id]) => id !== stationId)
      .map(([, assignment]) => assignment?.actorId)
      .filter(Boolean)
  );

  for (const actor of game.actors.contents
    .filter((entry) => entry.type === "character" && ownsActor(entry))
    .filter((entry) => entry.id === selected || !occupiedElsewhere.has(entry.id))
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const option = document.createElement("option");
    option.value = actor.id;
    option.textContent = actor.name;
    option.selected = actor.id === selected;
    select.append(option);
  }

  select.disabled = false;
  select.title = "Choose a PF2e character you control to claim this Arkflight station.";
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state || game.user?.isGM) return;
  if (controller.state.phase !== "opening" || controller.state.setupLocked) return;

  setTimeout(() => {
    for (const select of root.querySelectorAll('select[data-opening-control="actor"]')) {
      configurePlayerStationSelect(select, controller);
    }
  }, 20);
});
