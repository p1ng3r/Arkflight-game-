const GM_OPERATIONS_ID = "arkflight-gm-operations";
const STATIONS = Object.freeze([
  ["captain", "Captain"],
  ["engineer", "Engineer"],
  ["navigator", "Navigator"],
  ["battlewatch", "Battlewatch"],
  ["veilwarden", "Veilwarden"]
]);

function eventTitle(eventId, definition) {
  return definition?.title ?? definition?.name ?? eventId;
}

function eventSummary(definition) {
  return definition?.summary
    ?? definition?.description
    ?? definition?.opening?.vignette
    ?? definition?.openingVignette
    ?? "Arkflight Voyage Event";
}

function currentShip() {
  return game.arkflight?.ships?.getCurrent?.() ?? null;
}

function launchBlockers(ship) {
  if (!ship) return ["No Current Ship is designated."];
  const blockers = [];
  if (ship.status === "Commissioning Required") blockers.push("Current Ship requires commissioning.");
  if (!ship.validation?.ok) blockers.push(...(ship.validation?.errors ?? ["Current Ship validation failed."]));
  if (!ship.crew?.ready) blockers.push(`${ship.crew?.assigned ?? 0}/${ship.crew?.total ?? 0} permanent stations assigned.`);
  if (game.arkflight?.controller?.state?.eventId) blockers.push("A Voyage Event is already active.");
  return [...new Set(blockers)];
}

function routeFormValues(panel) {
  const destination = panel.querySelector("[data-voyage-destination]")?.value ?? "";
  const distanceHexes = Number(panel.querySelector("[data-voyage-distance]")?.value ?? 1);
  const hexMultiplier = Number(panel.querySelector("[data-voyage-condition]")?.value ?? 1);
  const knownRoute = Boolean(panel.querySelector("[data-voyage-known]")?.checked);
  const establishedCommercialRoute = Boolean(panel.querySelector("[data-voyage-established]")?.checked);
  return { destination, distanceHexes, hexMultiplier, knownRoute, establishedCommercialRoute };
}

function routeDaysLabel(value) {
  const days = Math.max(0, Number(value) || 0);
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  return `${days.toFixed(days % 1 ? 1 : 0)} day${days === 1 ? "" : "s"}`;
}

function buildRoutePlanner(app, ship) {
  const api = game.arkflight?.voyageTravel;
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-voyage-route";
  const route = api?.get?.() ?? null;

  if (route?.active) {
    const remaining = api?.remainingDays?.(route) ?? 0;
    const leg = route.segments?.[route.currentLeg] ?? null;
    panel.innerHTML = `
      <div class="arkflight-gm-card-heading">
        <div><div class="arkflight-gm-kicker">STRATEGIC ROUTE</div><h2>${foundry.utils.escapeHTML(route.destination || "Uncharted Destination")}</h2></div>
        <i class="fa-solid fa-route"></i>
      </div>
      <div class="arkflight-gm-metric-row"><span>Vessel</span><strong>${foundry.utils.escapeHTML(route.shipName ?? "Arkflight Ship")}</strong></div>
      <div class="arkflight-gm-metric-row"><span>Arkengine</span><strong>Tier ${route.engineTier} · ${foundry.utils.escapeHTML(route.engineName ?? "Arkengine")} · ${routeDaysLabel(route.daysPerHex)}/hex</strong></div>
      <div class="arkflight-gm-metric-row"><span>Progress</span><strong>${route.currentLeg} / ${route.distanceHexes} hexes · ${routeDaysLabel(remaining)} remaining</strong></div>
      <div class="arkflight-gm-metric-row"><span>Next Leg</span><strong>${leg ? routeDaysLabel(leg.days) : "Complete"}</strong></div>
      <p class="arkflight-gm-muted">Advancing a leg advances Foundry world time. Voyage Events may interrupt the route; finish the active Event before advancing again.</p>`;

    const actions = document.createElement("div");
    actions.className = "arkflight-gm-command-actions";
    const advance = document.createElement("button");
    advance.type = "button";
    advance.className = "arkflight-gm-primary";
    advance.innerHTML = '<i class="fa-solid fa-forward-step"></i> Advance Next Hex';
    advance.addEventListener("click", async () => {
      advance.disabled = true;
      try {
        const result = await api.advanceLeg();
        ui.notifications?.info(result.completed
          ? `Arrived at ${result.route.destination}.`
          : `Voyage advanced one strategic hex (${routeDaysLabel(result.segment.days)}).`);
        app.render({ force: true });
      } catch (error) {
        ui.notifications?.warn(error?.message ?? "Unable to advance the strategic route.");
        advance.disabled = false;
      }
    });
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancel Route';
    cancel.addEventListener("click", async () => {
      await api.cancel();
      app.render({ force: true });
    });
    actions.append(advance, cancel);
    panel.append(actions);
    return panel;
  }

  panel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">STRATEGIC ROUTE</div><h2>Plot Galactic Passage</h2></div>
      <i class="fa-solid fa-route"></i>
    </div>
    <div class="arkflight-gm-voyage-route-form">
      <label><span>Destination</span><input type="text" data-voyage-destination placeholder="Destination name"></label>
      <label><span>Galactic Hexes</span><input type="number" min="1" max="100" step="1" value="1" data-voyage-distance></label>
      <label><span>Route Condition</span><select data-voyage-condition>
        <option value="0.75">Favorable current ×0.75</option>
        <option value="1" selected>Clear passage ×1</option>
        <option value="1.5">Difficult void ×1.5</option>
        <option value="2">Severe hazard ×2</option>
      </select></label>
      <label class="arkflight-gm-voyage-check"><input type="checkbox" data-voyage-known> Known route</label>
      <label class="arkflight-gm-voyage-check"><input type="checkbox" data-voyage-established> Established commercial route</label>
    </div>
    <div class="arkflight-gm-metric-row"><span>Travel Preview</span><strong data-voyage-preview>Enter a route.</strong></div>
    <p class="arkflight-gm-muted">Travel speed comes from the installed Arkengine's authored days per galactic hex. Tier remains the engine's technology/power class; it is not a fixed speed formula.</p>`;

  const preview = () => {
    const target = panel.querySelector("[data-voyage-preview]");
    if (!target || !ship?.actor || !api?.plan) return;
    try {
      const plan = api.plan(ship.actor, routeFormValues(panel));
      const trader = plan.timeMultiplier < 1 ? " · Trader route −20%" : "";
      target.textContent = `${plan.distanceHexes} hex${plan.distanceHexes === 1 ? "" : "es"} · ${routeDaysLabel(plan.daysPerHex)}/hex · ${routeDaysLabel(plan.totalDays)} total${trader}`;
    } catch (error) {
      target.textContent = error?.message ?? "Route unavailable.";
    }
  };
  for (const input of panel.querySelectorAll("input, select")) input.addEventListener("input", preview);
  preview();

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-command-actions";
  const start = document.createElement("button");
  start.type = "button";
  start.className = "arkflight-gm-primary";
  start.disabled = !ship?.actor;
  start.innerHTML = '<i class="fa-solid fa-play"></i> Start Route';
  start.addEventListener("click", async () => {
    start.disabled = true;
    try {
      await api.start(ship.actor, routeFormValues(panel));
      app.render({ force: true });
    } catch (error) {
      ui.notifications?.warn(error?.message ?? "Unable to start strategic route.");
      start.disabled = false;
    }
  });
  actions.append(start);
  panel.append(actions);
  return panel;
}

function crewCandidates(ship, stationId) {
  const stations = ship?.ship?.crew?.stations ?? {};
  const assignedElsewhere = new Map(
    Object.entries(stations)
      .filter(([id, actorId]) => id !== stationId && actorId)
      .map(([id, actorId]) => [actorId, id])
  );
  return (game.actors?.contents ?? [])
    .filter((actor) => actor.type !== "vehicle")
    .map((actor) => ({
      id: actor.id,
      name: actor.name,
      conflictStation: assignedElsewhere.get(actor.id) ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildCrewAssignments(app, ship) {
  const section = document.createElement("section");
  section.className = "arkflight-gm-voyage-crew";

  const heading = document.createElement("div");
  heading.className = "arkflight-gm-section-heading";
  heading.innerHTML = `<div><div class="arkflight-gm-kicker">PERMANENT CREW</div><h3>Station Assignments</h3></div><span>${Number(ship?.crew?.assigned ?? 0)} / ${Number(ship?.crew?.total ?? 5)} assigned</span>`;
  section.append(heading);

  const grid = document.createElement("div");
  grid.className = "arkflight-gm-station-grid arkflight-gm-voyage-station-grid";
  const stations = ship?.ship?.crew?.stations ?? {};

  for (const [stationId, label] of STATIONS) {
    const row = document.createElement("label");
    row.className = `arkflight-gm-station-row arkflight-gm-voyage-station-row${stations[stationId] ? "" : " unassigned"}`;

    const title = document.createElement("span");
    title.className = "arkflight-gm-voyage-station-label";
    title.innerHTML = `<strong>${label}</strong><small>${stations[stationId] ? "Assigned" : "Choose officer"}</small>`;

    const select = document.createElement("select");
    select.className = "arkflight-gm-voyage-crew-select";
    select.dataset.assignVoyageStation = stationId;
    select.setAttribute("aria-label", `Assign ${label}`);

    const unassigned = document.createElement("option");
    unassigned.value = "";
    unassigned.textContent = "Unassigned";
    select.append(unassigned);

    for (const candidate of crewCandidates(ship, stationId)) {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = candidate.conflictStation
        ? `${candidate.name} — assigned to ${candidate.conflictStation}`
        : candidate.name;
      option.disabled = Boolean(candidate.conflictStation);
      option.selected = candidate.id === stations[stationId];
      select.append(option);
    }

    select.addEventListener("change", async () => {
      select.disabled = true;
      try {
        await game.arkflight?.ships?.setStationAssignment?.(ship.id, stationId, select.value || null);
        app.render({ force: true });
      } catch (error) {
        console.error("Arkflight crew assignment failed", error);
        ui.notifications?.warn(error?.message ?? `Unable to assign ${label}.`);
        select.disabled = false;
      }
    });

    row.append(title, select);
    grid.append(row);
  }

  section.append(grid);
  return section;
}

async function launchEvent(app, eventId) {
  const ship = currentShip();
  const blockers = launchBlockers(ship);
  if (blockers.length) {
    ui.notifications?.warn(blockers.join(" "));
    return;
  }
  try {
    await game.arkflight.openEvent(eventId, ship.actor ?? ship.id);
    app.activeSection = "operations";
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight Voyage launch failed", error);
    ui.notifications?.error(error?.message ?? "Unable to launch Arkflight Voyage Event.");
  }
}

function buildEventLibrary(app) {
  const wrapper = document.createElement("div");
  wrapper.className = "arkflight-gm-voyage-library";

  const ship = currentShip();
  const blockers = launchBlockers(ship);

  const shipPanel = document.createElement("article");
  shipPanel.className = "arkflight-gm-panel";
  shipPanel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">VOYAGE VESSEL</div><h2>${foundry.utils.escapeHTML(ship?.name ?? "No Current Ship")}</h2></div>
      <i class="fa-solid fa-ship"></i>
    </div>`;

  const shipStatus = document.createElement("div");
  shipStatus.className = "arkflight-gm-metric-row";
  shipStatus.innerHTML = `<span>Status</span><strong>${foundry.utils.escapeHTML(ship?.status ?? "Unavailable")}</strong>`;
  shipPanel.append(shipStatus);

  if (ship) shipPanel.append(buildCrewAssignments(app, ship));

  if (blockers.length) {
    const gate = document.createElement("div");
    gate.className = "arkflight-gm-launch-blockers";
    const heading = document.createElement("strong");
    heading.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Voyage launch blocked';
    gate.append(heading);
    for (const blocker of blockers) {
      const row = document.createElement("span");
      row.textContent = blocker;
      gate.append(row);
    }
    shipPanel.append(gate);
  }
  wrapper.append(shipPanel);
  wrapper.append(buildRoutePlanner(app, ship));

  const events = Object.entries(game.arkflight?.events ?? {});
  for (const [eventId, definition] of events) {
    const card = document.createElement("article");
    card.className = "arkflight-gm-panel arkflight-gm-voyage-event-card";

    const heading = document.createElement("div");
    heading.className = "arkflight-gm-card-heading";
    heading.innerHTML = `<div><div class="arkflight-gm-kicker">VOYAGE EVENT</div><h2>${foundry.utils.escapeHTML(eventTitle(eventId, definition))}</h2></div><i class="fa-solid fa-compass"></i>`;
    card.append(heading);

    const summary = document.createElement("p");
    summary.className = "arkflight-gm-muted";
    summary.textContent = eventSummary(definition);
    card.append(summary);

    const details = document.createElement("div");
    details.className = "arkflight-gm-metric-row";
    const rounds = definition?.rounds?.length ?? definition?.roundCount ?? null;
    details.innerHTML = `<span>Event ID</span><strong>${foundry.utils.escapeHTML(eventId)}${rounds ? ` · ${rounds} rounds` : ""}</strong>`;
    card.append(details);

    const actions = document.createElement("div");
    actions.className = "arkflight-gm-command-actions";
    const launch = document.createElement("button");
    launch.type = "button";
    launch.className = "arkflight-gm-primary";
    launch.disabled = blockers.length > 0;
    launch.title = blockers.join(" • ");
    launch.innerHTML = '<i class="fa-solid fa-play"></i> Launch Event';
    launch.addEventListener("click", () => launchEvent(app, eventId));
    actions.append(launch);
    card.append(actions);

    wrapper.append(card);
  }

  if (!events.length) {
    const empty = document.createElement("article");
    empty.className = "arkflight-gm-panel arkflight-gm-empty-state";
    empty.innerHTML = '<i class="fa-solid fa-compass"></i><h2>No Voyage Events</h2><p>No authored Arkflight events are registered.</p>';
    wrapper.append(empty);
  }

  return wrapper;
}

function enhanceOperations(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "operations") return;
  const root = app.element;
  if (!root) return;

  const activeEvent = game.arkflight?.controller?.state?.eventId;
  if (activeEvent) return;

  const placeholder = [...root.querySelectorAll(".arkflight-gm-empty-state")]
    .find((node) => node.querySelector("h2")?.textContent?.trim() === "No active Voyage");
  if (!placeholder) return;
  placeholder.replaceWith(buildEventLibrary(app));
}

async function gmSceneControlAction() {
  const eventId = game.arkflight?.controller?.state?.eventId ?? null;
  if (!game.user.isGM) {
    if (!eventId) ui.notifications?.info("Waiting for the GM to launch an Arkflight Event.");
    else game.arkflight?.openBoard?.();
    return;
  }

  if (!eventId) {
    game.arkflight?.openGMOperations?.({ section: "operations" });
    return;
  }

  const DialogV2 = foundry.applications.api.DialogV2;
  const choice = await DialogV2.wait({
    window: { title: "Arkflight Voyage" },
    content: "<p>An Arkflight Voyage Event is already active.</p>",
    buttons: [
      { action: "resume", label: "Resume Event", icon: "fa-solid fa-play", default: true },
      { action: "operations", label: "Open GM Operations", icon: "fa-solid fa-screwdriver-wrench" },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" }
    ]
  });
  if (choice === "resume") game.arkflight?.openBoard?.();
  else if (choice === "operations") game.arkflight?.openGMOperations?.({ section: "operations" });
}

Hooks.on("renderArkflightGMOperations", (app) => enhanceOperations(app));
Hooks.on("renderApplicationV2", (app) => enhanceOperations(app));

Hooks.on("getSceneControlButtons", (controls) => {
  const tool = controls?.tokens?.tools?.arkflightEvent;
  if (!tool) return;
  tool.title = "Arkflight GM Operations / Event Board";
  tool.onChange = gmSceneControlAction;
});
