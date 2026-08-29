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
  if (!actor || !game.user) return false;
  if (actor.isOwner) return true;
  return Boolean(actor.testUserPermission?.(game.user, ownerLevel()));
}

function stationIsClaimedByAnotherPlayer(controller, stationId) {
  const actorId = controller.state?.assignments?.[stationId]?.actorId ?? null;
  if (!actorId) return false;
  return !ownsActor(game.actors.get(actorId));
}

function configurePlayerStationSelect(select, controller) {
  if (!select || game.user?.isGM) return;

  const stationId = select.dataset.station;
  const assignedActorId = controller.state?.assignments?.[stationId]?.actorId ?? null;
  const assignedActor = assignedActorId ? game.actors.get(assignedActorId) : null;

  if (stationIsClaimedByAnotherPlayer(controller, stationId)) {
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
  const occupiedElsewhere = new Set(
    Object.entries(controller.state?.assignments ?? {})
      .filter(([id]) => id !== stationId)
      .map(([, assignment]) => assignment?.actorId)
      .filter(Boolean)
  );

  const controlledCharacters = game.actors.contents
    .filter((actor) => actor.type === "character" && ownsActor(actor))
    .filter((actor) => actor.id === selected || !occupiedElsewhere.has(actor.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  select.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = selected ? "— Release Station —" : "— Choose Your Officer —";
  blank.selected = !selected;
  select.append(blank);

  for (const actor of controlledCharacters) {
    const option = document.createElement("option");
    option.value = actor.id;
    option.textContent = actor.name;
    option.selected = actor.id === selected;
    select.append(option);
  }

  select.disabled = false;
  select.title = controlledCharacters.length
    ? "Choose a PF2e character you control to claim this Arkflight station."
    : "You need Owner access to a PF2e character before you can claim a station.";
}

function bindPlayerStationClaim(select, controller) {
  if (!select || select.dataset.playerClaimBound === "true") return;
  select.dataset.playerClaimBound = "true";

  // Capture-phase binding deliberately owns player station claiming. The opening
  // renderer has a generic change handler that immediately rerenders for GMs;
  // doing that on a player would repaint stale state before the GM socket reply.
  select.addEventListener("change", async (event) => {
    event.stopImmediatePropagation();
    const field = event.currentTarget;
    const stationId = field.dataset.station;

    if (stationIsClaimedByAnotherPlayer(controller, stationId)) {
      ui.notifications?.warn("That Arkflight station has already been claimed by another player.");
      configurePlayerStationSelect(field, controller);
      return;
    }

    field.disabled = true;
    field.title = "Sending station claim to the GM…";

    try {
      await controller.command({
        type: "assign-actor",
        station: stationId,
        actorId: field.value || null
      });
      // Non-GM commands are authoritative only after the GM broadcasts the
      // updated planning snapshot. Do not rerender the stale local state here.
    } catch (error) {
      console.error("Arkflight | Player station claim failed", error);
      ui.notifications?.warn(error.message);
      field.disabled = false;
      configurePlayerStationSelect(field, controller);
    }
  }, true);
}

function configureOpeningPlayerClaims(root, controller) {
  for (const select of root.querySelectorAll('select[data-opening-control="actor"]')) {
    configurePlayerStationSelect(select, controller);
    bindPlayerStationClaim(select, controller);
  }
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state || game.user?.isGM) return;
  if (controller.state.phase !== "opening" || controller.state.setupLocked) return;

  // The authoritative opening renderer rebuilds its station rows after the base
  // ApplicationV2 render hook. Run after that rebuild, then own player claiming.
  setTimeout(() => configureOpeningPlayerClaims(root, controller), 30);
});
