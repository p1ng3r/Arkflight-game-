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

function currentEventState() {
  return game.arkflight?.controller?.state ?? null;
}

function currentCombatState() {
  return game.arkflight?.combat?.state ?? game.arkflight?.combatController?.state ?? null;
}

function eventIsActive() {
  return Boolean(currentEventState()?.eventId);
}

function combatIsActive() {
  const state = currentCombatState();
  if (!state) return false;
  return state.active === true || state.status === "active" || Boolean(state.combatId ?? state.sessionId);
}

function contextualDefaultSection() {
  return eventIsActive() || combatIsActive() ? "operations" : "command";
}

function commandShipSource() {
  const source = game.arkflight?.ships;
  if (!source) return { current: null, others: [] };

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
  })).filter((entry) => entry.player);

  const current = normalized.find((entry) => entry.current) ?? normalized[0] ?? null;
  return { current, others: normalized.filter((entry) => entry !== current) };
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
    world: {
      seconds: Number(game.time?.worldTime ?? 0),
      workOrderCount: activeWorkOrders.length,
      authoritativeCalendarPending: true
    },
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
    window: {
      title: "Arkflight GM Operations",
      icon: "fa-solid fa-screwdriver-wrench",
      resizable: true
    }
  };

  static PARTS = {
    operations: { template: "modules/arkflight-game/templates/gm-operations.hbs" }
  };

  constructor(options = {}) {
    super(options);
    this.activeSection = options.activeSection ?? null;
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

    const sections = PRIMARY_SECTIONS.map((section) => ({
      ...section,
      active: section.id === activeSection,
      status: section.id === "operations" && (eventActive || combatActive)
        ? "active"
        : null
    }));

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
      } : null
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

    for (const button of this.element.querySelectorAll("[data-action='resume-event']")) {
      button.addEventListener("click", () => game.arkflight?.openBoard?.());
    }

    this.element.querySelector("[data-action='open-operations']")?.addEventListener("click", () => {
      this.activeSection = "operations";
      this.render({ force: true });
    });
  }
}

export function defaultGMOperationsSection() {
  return contextualDefaultSection();
}
