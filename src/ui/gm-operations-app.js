const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

const PRIMARY_SECTIONS = [
  { id: "command", label: "Command", icon: "fa-solid fa-gauge-high" },
  { id: "ships", label: "Ships", icon: "fa-solid fa-ship" },
  { id: "generate", label: "Generate", icon: "fa-solid fa-wand-magic-sparkles" },
  { id: "operations", label: "Operations", icon: "fa-solid fa-compass" },
  { id: "time-work", label: "Time & Work", icon: "fa-solid fa-clock" },
  { id: "salvage", label: "Salvage", icon: "fa-solid fa-toolbox" },
  { id: "library", label: "Library", icon: "fa-solid fa-book-open" }
];
const SECTION_TITLES = Object.fromEntries(PRIMARY_SECTIONS.map((section) => [section.id, section.label]));

function currentEventState() { return game.arkflight?.controller?.state ?? null; }
function currentCombatState() { return game.arkflight?.combat?.state ?? game.arkflight?.combatController?.state ?? null; }
function eventIsActive() { return Boolean(currentEventState()?.eventId); }
function combatIsActive() {
  const state = currentCombatState();
  if (!state) return false;
  return state.active === true || state.status === "active" || Boolean(state.combatId ?? state.sessionId);
}
function contextualDefaultSection() { return eventIsActive() || combatIsActive() ? "operations" : "command"; }
function moduleAssetPath(path) {
  if (!path) return "";
  if (/^(https?:|data:|modules\/)/.test(path)) return path;
  return `modules/arkflight-game/${String(path).replace(/^\/+/, "")}`;
}
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function resourceRows(resources = {}) {
  return Object.entries(resources).map(([key, row]) => ({ key, name: titleCase(key), value: Number(row?.value ?? 0), max: Number(row?.max ?? 0), hasMax: Number(row?.max ?? 0) > 0 }));
}

function shipSource() {
  const rows = typeof game.arkflight?.ships?.list === "function" ? (game.arkflight.ships.list() ?? []) : [];
  const players = rows.filter((entry) => entry.player);
  const current = rows.find((entry) => entry.current) ?? players[0] ?? rows[0] ?? null;
  return { all: rows, players, current, others: players.filter((entry) => entry.id !== current?.id) };
}

function eventCatalog(selectedEventId = null) {
  const definitions = Object.values(game.arkflight?.events ?? {});
  const selectedId = selectedEventId && definitions.some((event) => event.id === selectedEventId) ? selectedEventId : definitions[0]?.id ?? null;
  const events = definitions.map((event) => ({
    id: event.id,
    title: event.title ?? event.name ?? event.id,
    goal: event.goal ?? "",
    image: moduleAssetPath(event.image),
    openingVignette: event.openingVignette ?? "",
    roundCount: event.rounds?.length ?? 0,
    planningMinutes: Math.round(Number(event.planningSeconds ?? 0) / 60),
    selected: event.id === selectedId
  }));
  return { events, selected: events.find((event) => event.id === selectedId) ?? null, selectedId };
}

function confirmVoyageLaunch(ship, event) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const content = `<div class="arkflight-gm-launch-confirm"><p>Launch this Voyage?</p><div class="arkflight-gm-launch-route"><strong>${foundry.utils.escapeHTML(ship.name)}</strong><i class="fa-solid fa-arrow-right"></i><strong>${foundry.utils.escapeHTML(event.title)}</strong></div><p class="hint">This ship will remain bound to the Voyage for the entire event.</p></div>`;
    new DialogV2({ window: { title: "Launch Arkflight Voyage" }, content, buttons: [
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => resolve(false) },
      { action: "launch", label: "Launch Voyage", icon: "fa-solid fa-compass", default: true, callback: () => resolve(true) }
    ], close: () => resolve(false) }).render({ force: true });
  });
}

function confirmEndVoyage(eventName, shipName) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const content = `<div class="arkflight-gm-launch-confirm"><p><strong>End the active Voyage?</strong></p><div class="arkflight-gm-launch-route"><strong>${foundry.utils.escapeHTML(shipName || "Bound Ship")}</strong><i class="fa-solid fa-xmark"></i><strong>${foundry.utils.escapeHTML(eventName || "Active Voyage")}</strong></div><p class="hint">This clears the active Voyage state for every connected player. It does not launch the queued event.</p></div>`;
    new DialogV2({ window: { title: "Manage Active Voyage" }, content, buttons: [
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-arrow-left", default: true, callback: () => resolve(false) },
      { action: "end", label: "End Voyage", icon: "fa-solid fa-stop", callback: () => resolve(true) }
    ], close: () => resolve(false) }).render({ force: true });
  });
}

function activeVoyageModel(eventState, eventDefinition, ships) {
  if (!eventState?.eventId) return null;
  const boundShip = eventState.shipActorId ? ships.all.find((ship) => ship.id === eventState.shipActorId) ?? null : null;
  const actor = eventState.shipActorId ? game.actors.get(eventState.shipActorId) : null;
  const encounter = eventState.encounter ?? eventDefinition?.startingState ?? {};
  const pressure = Object.entries(encounter.pressure ?? {}).map(([system, value]) => ({ system: titleCase(system), value: Number(value ?? 0) }));
  const hazards = (encounter.hazards ?? []).map((hazard) => ({ id: hazard, name: titleCase(hazard) }));
  return {
    id: eventState.eventId,
    name: eventDefinition?.name ?? eventDefinition?.title ?? eventState.eventId,
    phase: titleCase(eventState.phase ?? "active"),
    round: Number(eventState.roundIndex ?? 0) + 1,
    totalRounds: eventDefinition?.rounds?.length ?? 1,
    momentum: Number(encounter.momentum ?? 0),
    pressure,
    hasPressure: pressure.some((row) => row.value !== 0),
    hazards,
    hasHazards: hazards.length > 0,
    shipActorId: eventState.shipActorId ?? null,
    shipName: boundShip?.name ?? actor?.name ?? "Bound Ship",
    shipLevel: boundShip?.level ?? actor?.system?.details?.level?.value ?? null,
    shipStatus: boundShip?.status ?? "Bound",
    shipResources: resourceRows(boundShip?.resources),
    hasShipResources: Boolean(boundShip?.resources)
  };
}

function buildCommandDashboard(eventState, eventDefinition, combatActive, ships) {
  const workOrders = game.arkflight?.workOrders;
  const activeWorkOrders = typeof workOrders?.listActive === "function" ? (workOrders.listActive() ?? []) : [];
  const warnings = [];
  if (typeof game.arkflight?.getGMAlerts === "function") {
    for (const alert of game.arkflight.getGMAlerts() ?? []) {
      const severity = alert.severity ?? alert.level ?? "attention";
      if (!["critical", "danger", "warning", "attention"].includes(severity)) continue;
      warnings.push({ severity: ["critical", "danger"].includes(severity) ? "critical" : "attention", title: alert.title ?? "Arkflight warning", detail: alert.detail ?? alert.message ?? "Requires GM attention." });
    }
  }
  const eventActive = Boolean(eventState?.eventId);
  return {
    world: { seconds: Number(game.time?.worldTime ?? 0), workOrderCount: activeWorkOrders.length, authoritativeCalendarPending: true },
    currentShip: ships.current,
    otherShips: ships.others,
    hasOtherShips: ships.others.length > 0,
    operation: eventActive ? { type: "Voyage", name: eventDefinition?.title ?? eventState.eventId, phase: eventState.phase ?? "active", round: Number(eventState.roundIndex ?? 0) + 1, action: "resume-event" }
      : combatActive ? { type: "Ship Combat", name: "Active Ship Combat", phase: currentCombatState()?.status ?? "active", round: currentCombatState()?.round ?? null, action: null } : null,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

function workOrderShipIds() {
  const api = game.arkflight?.workOrders;
  const rows = typeof api?.listActive === "function" ? (api.listActive() ?? []) : [];
  return new Set(rows.map((row) => row.shipActorId ?? row.actorId).filter(Boolean));
}

function buildShipsScreen(ships, selectedId) {
  const workIds = workOrderShipIds();
  const activeVoyageShipId = currentEventState()?.shipActorId ?? null;
  const combat = currentCombatState();
  const combatShipIds = new Set([...(combat?.shipActorIds ?? []), combat?.shipActorId, combat?.friendlyShipActorId, combat?.enemyShipActorId].filter(Boolean));
  const rows = ships.all.map((entry) => {
    const damaged = (entry.damagedSystems?.length ?? 0) > 0 || (entry.conditions?.length ?? 0) > 0;
    const active = entry.id === activeVoyageShipId || combatShipIds.has(entry.id);
    const inWork = workIds.has(entry.id);
    return { ...entry, selected: entry.id === selectedId, damaged, active, inWork, kind: entry.player ? "Player" : "NPC" };
  });
  const selected = rows.find((entry) => entry.id === selectedId) ?? rows.find((entry) => entry.current) ?? rows[0] ?? null;
  if (!selected) return { rows, selected: null, counts: { all: 0, player: 0, npc: 0, damaged: 0, active: 0, inWork: 0 } };

  const validationWarnings = [
    ...(selected.validation?.errors ?? []).map((detail) => ({ severity: "critical", detail })),
    ...(selected.validation?.warnings ?? []).map((detail) => ({ severity: "attention", detail }))
  ];
  const damageWarnings = (selected.damagedSystems ?? []).map((row) => ({ severity: row.state === "destroyed" || row.state === "disabled" ? "critical" : "attention", detail: `${titleCase(row.system)} — ${titleCase(row.state)}` }));
  const stats = selected.derived?.stats ?? {};
  return {
    rows,
    selected: {
      ...selected,
      resourcesView: resourceRows(selected.resources),
      warnings: [...validationWarnings, ...damageWarnings],
      hasWarnings: validationWarnings.length + damageWarnings.length > 0,
      crewText: `${selected.crew?.assigned ?? 0} / ${selected.crew?.total ?? 0} stations`,
      capacity: {
        rooms: `${selected.derived?.usage?.rooms ?? 0} / ${stats.roomCapacity ?? 0}`,
        shipMods: `${selected.derived?.usage?.shipMods ?? 0} / ${stats.shipModCapacity ?? 0}`,
        arkengineMods: `${selected.derived?.usage?.arkengineMods ?? 0} / ${stats.arkengineModCapacity ?? 0}`,
        cargo: `${selected.cargo?.used ?? 0} / ${stats.cargoCapacity ?? 0}`
      },
      canShipwright: Boolean(game.arkflight?.ships?.canOpenShipwright?.()),
      canLaunchVoyage: selected.player && !eventIsActive() && !combatIsActive(),
      canLaunchCombat: Boolean(game.arkflight?.combat?.openLauncher || game.arkflight?.combat?.open) && !eventIsActive()
    },
    counts: {
      all: rows.length,
      player: rows.filter((row) => row.player).length,
      npc: rows.filter((row) => row.isNPC).length,
      damaged: rows.filter((row) => row.damaged).length,
      active: rows.filter((row) => row.active).length,
      inWork: rows.filter((row) => row.inWork).length
    }
  };
}

export class ArkflightGMOperations extends HandlebarsApplication {
  static DEFAULT_OPTIONS = { id: "arkflight-gm-operations", classes: ["arkflight", "arkflight-gm-operations"], position: { width: 1100, height: 750 }, window: { title: "Arkflight GM Operations", icon: "fa-solid fa-screwdriver-wrench", resizable: true } };
  static PARTS = { operations: { template: "modules/arkflight-game/templates/gm-operations.hbs" } };

  constructor(options = {}) {
    super(options);
    this.activeSection = options.activeSection ?? null;
    this.operationsTab = options.operationsTab ?? null;
    this.selectedEventId = options.selectedEventId ?? null;
    this.selectedShipId = options.selectedShipId ?? null;
    this.selectedRosterShipId = options.selectedRosterShipId ?? null;
    this.queuedEventId = options.queuedEventId ?? null;
    this.queuedShipId = options.queuedShipId ?? null;
  }

  open(options = {}) {
    if (!game.user.isGM) return null;
    if (options.section) this.activeSection = options.section;
    else if (!this.rendered) this.activeSection = contextualDefaultSection();
    if (options.shipActorId) this.selectedRosterShipId = options.shipActorId;
    return this.render({ force: true });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const eventState = currentEventState();
    const eventDefinition = eventState?.eventId ? game.arkflight?.events?.[eventState.eventId] ?? null : null;
    const eventActive = Boolean(eventState?.eventId);
    const combatActive = combatIsActive();
    const activeSection = this.activeSection ?? contextualDefaultSection();
    this.activeSection = activeSection;
    if (!this.operationsTab) this.operationsTab = eventActive || combatActive ? "active" : "voyage-events";
    if (!eventActive && this.queuedEventId) { this.selectedEventId = this.queuedEventId; this.operationsTab = "voyage-events"; }

    const sections = PRIMARY_SECTIONS.map((section) => ({ ...section, active: section.id === activeSection, status: section.id === "operations" && (eventActive || combatActive) ? "active" : null }));
    const ships = shipSource();
    if (!this.selectedRosterShipId || !ships.all.some((ship) => ship.id === this.selectedRosterShipId)) this.selectedRosterShipId = ships.current?.id ?? ships.all[0]?.id ?? null;

    if (!eventActive && this.queuedEventId && this.queuedShipId && ships.players.some((ship) => ship.id === this.queuedShipId)) this.selectedShipId = this.queuedShipId;
    if (!this.selectedShipId || !ships.players.some((ship) => ship.id === this.selectedShipId)) this.selectedShipId = ships.current?.player ? ships.current.id : ships.players[0]?.id ?? null;
    const shipOptions = ships.players.map((ship) => ({ ...ship, selected: ship.id === this.selectedShipId }));

    const catalog = eventCatalog(this.selectedEventId);
    this.selectedEventId = catalog.selectedId;
    const selectedShip = shipOptions.find((ship) => ship.id === this.selectedShipId) ?? null;
    const activeEvent = activeVoyageModel(eventState, eventDefinition, ships);
    const queuedEvent = this.queuedEventId ? eventCatalog(this.queuedEventId).selected : null;
    const canQueueSelectedEvent = Boolean(eventActive && catalog.selected && catalog.selected.id !== eventState.eventId);
    const selectedEventQueued = Boolean(this.queuedEventId && catalog.selected?.id === this.queuedEventId);
    const canLaunchSelectedEvent = Boolean(catalog.selected && selectedShip && !eventActive && !combatActive);
    const launchBlockReason = eventActive ? "A Voyage is already active. Browse another event and queue it for later." : combatActive ? "An active ship combat must be resolved before launching a Voyage." : !selectedShip ? "No current player ship is available. Select or designate a player ship first." : !catalog.selected ? "No Voyage event is available." : null;

    return {
      ...context,
      sections,
      activeSection,
      sectionTitle: SECTION_TITLES[activeSection] ?? "Command",
      command: activeSection === "command",
      ships: activeSection === "ships",
      generate: activeSection === "generate",
      operations: activeSection === "operations",
      timeWork: activeSection === "time-work",
      salvage: activeSection === "salvage",
      library: activeSection === "library",
      eventActive,
      combatActive,
      commandDashboard: buildCommandDashboard(eventState, eventDefinition, combatActive, ships),
      shipsScreen: buildShipsScreen(ships, this.selectedRosterShipId),
      activeEvent,
      operationsTab: this.operationsTab,
      operationsActiveTab: this.operationsTab === "active",
      operationsVoyageTab: this.operationsTab === "voyage-events",
      voyageCatalog: catalog.events,
      selectedVoyageEvent: catalog.selected,
      voyageShipOptions: shipOptions,
      selectedVoyageShip: selectedShip,
      canLaunchSelectedEvent,
      launchBlockReason,
      canQueueSelectedEvent,
      selectedEventQueued,
      queuedVoyageEvent: queuedEvent
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.element) return;

    for (const button of this.element.querySelectorAll("[data-gm-section]")) button.addEventListener("click", () => {
      const section = button.dataset.gmSection; if (!SECTION_TITLES[section] || section === this.activeSection) return; this.activeSection = section; this.render({ force: true });
    });
    for (const button of this.element.querySelectorAll("[data-operations-tab]")) button.addEventListener("click", () => {
      const tab = button.dataset.operationsTab; if (!["active", "voyage-events"].includes(tab) || tab === this.operationsTab) return; this.operationsTab = tab; this.render({ force: true });
    });
    for (const button of this.element.querySelectorAll("[data-voyage-event-id]")) button.addEventListener("click", () => { this.selectedEventId = button.dataset.voyageEventId; this.render({ force: true }); });

    const voyageSearch = this.element.querySelector("[data-voyage-search]");
    voyageSearch?.addEventListener("input", () => { const query = voyageSearch.value.trim().toLowerCase(); for (const row of this.element.querySelectorAll("[data-voyage-event-id]")) row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query); });
    this.element.querySelector("[data-voyage-ship]")?.addEventListener("change", (event) => { this.selectedShipId = event.currentTarget.value || null; this.render({ force: true }); });

    for (const row of this.element.querySelectorAll("[data-roster-ship-id]")) row.addEventListener("click", () => { this.selectedRosterShipId = row.dataset.rosterShipId; this.render({ force: true }); });
    const shipSearch = this.element.querySelector("[data-ship-search]");
    const shipFilter = this.element.querySelector("[data-ship-filter]");
    const applyShipFilters = () => {
      const query = shipSearch?.value.trim().toLowerCase() ?? "";
      const filter = shipFilter?.value ?? "all";
      for (const row of this.element.querySelectorAll("[data-roster-ship-id]")) {
        const matchesQuery = !query || row.textContent.toLowerCase().includes(query);
        const matchesFilter = filter === "all" || row.dataset[filter] === "true";
        row.hidden = !(matchesQuery && matchesFilter);
      }
    };
    shipSearch?.addEventListener("input", applyShipFilters);
    shipFilter?.addEventListener("change", applyShipFilters);

    this.element.querySelector("[data-action='open-ship-sheet']")?.addEventListener("click", () => { try { game.arkflight?.ships?.openSheet?.(this.selectedRosterShipId); } catch (error) { ui.notifications?.error(error.message); } });
    this.element.querySelector("[data-action='open-shipwright']")?.addEventListener("click", () => { try { game.arkflight?.ships?.openShipwright?.(this.selectedRosterShipId); } catch (error) { ui.notifications?.warn(error.message); } });
    this.element.querySelector("[data-action='set-current-ship']")?.addEventListener("click", async () => { try { await game.arkflight?.ships?.setCurrent?.(this.selectedRosterShipId); this.selectedShipId = this.selectedRosterShipId; this.render({ force: true }); } catch (error) { ui.notifications?.error(error.message); } });
    this.element.querySelector("[data-action='ship-launch-voyage']")?.addEventListener("click", () => { this.selectedShipId = this.selectedRosterShipId; this.activeSection = "operations"; this.operationsTab = eventIsActive() ? "active" : "voyage-events"; this.render({ force: true }); });
    this.element.querySelector("[data-action='ship-launch-combat']")?.addEventListener("click", () => {
      const api = game.arkflight?.combat;
      if (typeof api?.openLauncher === "function") api.openLauncher({ shipActorId: this.selectedRosterShipId });
      else if (typeof api?.open === "function") api.open({ shipActorId: this.selectedRosterShipId });
      else ui.notifications?.warn("Arkflight Ship Combat launcher is not available yet.");
    });

    this.element.querySelector("[data-action='queue-voyage-event']")?.addEventListener("click", () => {
      const active = currentEventState(); if (!active?.eventId || !this.selectedEventId || this.selectedEventId === active.eventId) return; this.queuedEventId = this.selectedEventId; this.queuedShipId = active.shipActorId ?? this.selectedShipId ?? null; ui.notifications?.info(`Queued Arkflight Voyage: ${eventCatalog(this.queuedEventId).selected?.title ?? this.queuedEventId}`); this.render({ force: true });
    });
    this.element.querySelector("[data-action='clear-queued-voyage']")?.addEventListener("click", () => { this.queuedEventId = null; this.queuedShipId = null; this.render({ force: true }); });
    this.element.querySelector("[data-action='launch-voyage-event']")?.addEventListener("click", async () => {
      if (!this.selectedEventId || !this.selectedShipId || eventIsActive() || combatIsActive()) return;
      const catalog = eventCatalog(this.selectedEventId); const ship = shipSource().players.find((entry) => entry.id === this.selectedShipId) ?? null; if (!catalog.selected || !ship) return;
      if (!await confirmVoyageLaunch(ship, catalog.selected)) return;
      try { await game.arkflight.openEvent(this.selectedEventId, { shipActorId: this.selectedShipId }); if (this.queuedEventId === this.selectedEventId) { this.queuedEventId = null; this.queuedShipId = null; } this.operationsTab = "active"; this.render({ force: true }); }
      catch (error) { console.error("Arkflight | Unable to launch Voyage from GM Operations", error); ui.notifications?.error(error?.message ?? "Unable to launch Arkflight Voyage."); }
    });
    this.element.querySelector("[data-action='end-voyage']")?.addEventListener("click", async () => {
      const active = currentEventState(); if (!active?.eventId) return; const definition = game.arkflight?.events?.[active.eventId]; const ship = active.shipActorId ? game.actors.get(active.shipActorId) : null;
      if (!await confirmEndVoyage(definition?.title ?? active.eventId, ship?.name ?? context.activeEvent?.shipName)) return;
      const finishedShipId = active.shipActorId ?? null;
      try { await game.arkflight?.endEvent?.(); if (this.queuedEventId) { this.selectedEventId = this.queuedEventId; this.queuedShipId = this.queuedShipId ?? finishedShipId; this.selectedShipId = this.queuedShipId ?? finishedShipId ?? this.selectedShipId; } this.operationsTab = "voyage-events"; this.render({ force: true }); }
      catch (error) { console.error("Arkflight | Unable to end Voyage", error); ui.notifications?.error(error?.message ?? "Unable to end Arkflight Voyage."); }
    });
    for (const button of this.element.querySelectorAll("[data-action='resume-event']")) button.addEventListener("click", () => game.arkflight?.openBoard?.());
    this.element.querySelector("[data-action='open-operations']")?.addEventListener("click", () => { this.activeSection = "operations"; this.operationsTab = eventIsActive() || combatIsActive() ? "active" : "voyage-events"; this.render({ force: true }); });
  }
}

export function defaultGMOperationsSection() { return contextualDefaultSection(); }
