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

    this.element.querySelector("[data-action='resume-event']")?.addEventListener("click", () => {
      game.arkflight?.openBoard?.();
    });
  }
}

export function defaultGMOperationsSection() {
  return contextualDefaultSection();
}
