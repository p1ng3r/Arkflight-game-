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

function commandShipSource() {
  const source = game.arkflight?.ships;
  if (!source) return { current: null, others: [], all: [] };

  let rows = [];
  if (typeof source.list === "function") rows = source.list() ?? [];
  else if (Array.isArray(source)) rows = source;
  else if (Array.isArray(source.contents)) rows = source.contents;

  const normalized = rows.map((entry) => ({
    id: entry.id ?? entry.actor?.id ?? null,
    name: entry.name ?? entry.actor?.name ?? entry.ship?.identity?.name ?? "Unnamed Vessel",
    level: entry.level ?? entry.ship?.level ?? entry.system?.details?.level?.value ?? null,
    status: entry.status ?? entry.readiness ?? "Available",
    player: entry.player !== false && entry.isNPC !== true,
    current: entry.current === true || entry.selected === true || entry.active === true
  })).filter((entry) => entry.player && entry.id);

  const current = normalized.find((entry) => entry.current) ?? normalized[0] ?? null;
  return { current, others: normalized.filter((entry) => entry !== current), all: normalized };
}

function eventCatalog(selectedEventId = null) {
  const definitions = Object.values(game.arkflight?.events ?? {});
  const selectedId = selectedEventId && definitions.some((event) => event.id === selectedEventId)
    ? selectedEventId
    : definitions[0]?.id ?? null;

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

  return {
    events,
    selected: events.find((event) => event.id === selectedId) ?? null,
    selectedId
  };
}

function buildCommandDashboard(eventState, eventDefinition, combatActive) {
  const ships = commandShipSource();
  const eventActive = Boolean(eventState?.eventId);
  const workOrders = game.arkflight?.workOrders;
  const activeWorkOrders = typeof workOrders?.listActive === "function" ? (workOrders.listActive() ?? []) : [];
  const warnings = [];

  if (typeof game.arkflight?.getGMAlerts === "function") {
    for (const alert of game.arkflight.getGMAlerts() ?? []) {
      const severity = alert.severity ?? alert.level ?? "attention";
      if (!["critical", "danger", "warning", "attention"].includes(severity)) continue;
      warnings.push({
        severity: ["critical", "danger"].includes(severity) ? "critical" : "attention",
        title: alert.title ?? "Arkflight warning",
        detail: alert.detail ?? alert.message ?? "Requires GM attention."
      });
    }
  }

  return {
    world: { seconds: Number(game.time?.worldTime ?? 0), workOrderCount: activeWorkOrders.length, authoritativeCalendarPending: true },
    currentShip: ships.current,
    otherShips: ships.others,
    hasOtherShips: ships.others.length > 0,
    operation: eventActive ? {
      type: "Voyage",
      name: eventDefinition?.name ?? eventDefinition?.title ?? eventState.eventId,
      phase: eventState.phase ?? "active",
      round: Number(eventState.roundIndex ?? 0) + 1,
      action: "resume-event"
    } : combatActive ? {
      type: "Ship Combat",
      name: "Active Ship Combat",
      phase: currentCombatState()?.status ?? "active",
      round: currentCombatState()?.round ?? null,
      action: null
    } : null,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

export class ArkflightGMOperations extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-gm-operations",
    classes: ["arkflight", "arkflight-gm-operations"],
    position: { width: 1100, height: 750 },
    window: { title: "Arkflight GM Operations", icon: "fa-solid fa-screwdriver-wrench", resizable: true }
  };

  static PARTS = { operations: { template: "modules/arkflight-game/templates/gm-operations.hbs" } };

  constructor(options = {}) {
    super(options);
    this.activeSection = options.activeSection ?? null;
    this.operationsTab = options.operationsTab ?? null;
    this.selectedEventId = options.selectedEventId ?? null;
    this.selectedShipId = options.selectedShipId ?? null;
  }

  open(options = {}) {
    if (!game.user.isGM) return null;
    if (options.section) this.activeSection = options.section;
    else if (!this.rendered) this.activeSection = contextualDefaultSection();
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

    const sections = PRIMARY_SECTIONS.map((section) => ({
      ...section,
      active: section.id === activeSection,
      status: section.id === "operations" && (eventActive || combatActive) ? "active" : null
    }));

    const ships = commandShipSource();
    if (!this.selectedShipId || !ships.all.some((ship) => ship.id === this.selectedShipId)) {
      this.selectedShipId = ships.current?.id ?? null;
    }
    const shipOptions = ships.all.map((ship) => ({ ...ship, selected: ship.id === this.selectedShipId }));

    const catalog = eventCatalog(this.selectedEventId);
    this.selectedEventId = catalog.selectedId;
    const selectedShip = shipOptions.find((ship) => ship.id === this.selectedShipId) ?? null;
    const canLaunchSelectedEvent = Boolean(catalog.selected && selectedShip && !eventActive && !combatActive);
    const launchBlockReason = eventActive
      ? "End or resume the active Voyage before launching another event."
      : combatActive
        ? "An active ship combat must be resolved before launching a Voyage."
        : !selectedShip
          ? "No current player ship is available. Select or designate a player ship first."
          : !catalog.selected
            ? "No Voyage event is available."
            : null;

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
      commandDashboard: buildCommandDashboard(eventState, eventDefinition, combatActive),
      activeEvent: eventActive ? {
        id: eventState.eventId,
        name: eventDefinition?.name ?? eventDefinition?.title ?? eventState.eventId,
        phase: eventState.phase ?? "active",
        round: Number(eventState.roundIndex ?? 0) + 1
      } : null,
      operationsTab: this.operationsTab,
      operationsActiveTab: this.operationsTab === "active",
      operationsVoyageTab: this.operationsTab === "voyage-events",
      voyageCatalog: catalog.events,
      selectedVoyageEvent: catalog.selected,
      voyageShipOptions: shipOptions,
      selectedVoyageShip: selectedShip,
      canLaunchSelectedEvent,
      launchBlockReason
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.element) return;

    for (const button of this.element.querySelectorAll("[data-gm-section]")) {
      button.addEventListener("click", () => {
        const section = button.dataset.gmSection;
        if (!SECTION_TITLES[section] || section === this.activeSection) return;
        this.activeSection = section;
        this.render({ force: true });
      });
    }

    for (const button of this.element.querySelectorAll("[data-operations-tab]")) {
      button.addEventListener("click", () => {
        const tab = button.dataset.operationsTab;
        if (!['active', 'voyage-events'].includes(tab) || tab === this.operationsTab) return;
        this.operationsTab = tab;
        this.render({ force: true });
      });
    }

    for (const button of this.element.querySelectorAll("[data-voyage-event-id]")) {
      button.addEventListener("click", () => {
        this.selectedEventId = button.dataset.voyageEventId;
        this.render({ force: true });
      });
    }

    const search = this.element.querySelector("[data-voyage-search]");
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const row of this.element.querySelectorAll("[data-voyage-event-id]")) {
        row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query);
      }
    });

    this.element.querySelector("[data-voyage-ship]")?.addEventListener("change", (event) => {
      this.selectedShipId = event.currentTarget.value || null;
      this.render({ force: true });
    });

    this.element.querySelector("[data-action='launch-voyage-event']")?.addEventListener("click", async () => {
      if (!this.selectedEventId || !this.selectedShipId || eventIsActive() || combatIsActive()) return;
      const button = this.element.querySelector("[data-action='launch-voyage-event']");
      if (button) button.disabled = true;
      try {
        game.arkflight.selectedVoyageShipId = this.selectedShipId;
        await game.arkflight.openEvent(this.selectedEventId, { shipActorId: this.selectedShipId });
        this.operationsTab = "active";
        this.render({ force: true });
      } catch (error) {
        console.error("Arkflight | Unable to launch Voyage from GM Operations", error);
        ui.notifications?.error(error?.message ?? "Unable to launch Arkflight Voyage.");
        if (button) button.disabled = false;
      }
    });

    for (const button of this.element.querySelectorAll("[data-action='resume-event']")) {
      button.addEventListener("click", () => game.arkflight?.openBoard?.());
    }

    this.element.querySelector("[data-action='open-operations']")?.addEventListener("click", () => {
      this.activeSection = "operations";
      this.operationsTab = eventIsActive() || combatIsActive() ? "active" : "voyage-events";
      this.render({ force: true });
    });
  }
}

export function defaultGMOperationsSection() { return contextualDefaultSection(); }
