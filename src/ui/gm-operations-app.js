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
const STATION_SKILLS = Object.freeze({
  captain: ["diplomacy", "intimidation", "society"],
  engineer: ["crafting", "arcana"],
  navigator: ["survival", "nature", "occultism"],
  battlewatch: ["perception", "athletics"],
  watchmaster: ["perception", "athletics"],
  veilwarden: ["religion", "nature", "arcana"]
});

function currentEventState() { return game.arkflight?.controller?.state ?? null; }
function currentCombatState() { return game.arkflight?.combat?.state ?? game.arkflight?.combatController?.state ?? null; }
function eventIsActive() { return Boolean(currentEventState()?.eventId); }
function combatIsActive() {
  const state = currentCombatState();
  if (!state) return false;
  return state.active === true || state.status === "active" || Boolean(state.combatId ?? state.sessionId);
}
function contextualDefaultSection() { return eventIsActive() || combatIsActive() ? "operations" : "command"; }
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function resourceRows(resources = {}) {
  return Object.entries(resources).map(([key, row]) => ({ key, name: titleCase(key), value: Number(row?.value ?? 0), max: Number(row?.max ?? 0), hasMax: Number(row?.max ?? 0) > 0 }));
}
function shipSource() {
  const rows = typeof game.arkflight?.ships?.list === "function" ? (game.arkflight.ships.list() ?? []) : [];
  const players = rows.filter((entry) => entry.player);
  const current = rows.find((entry) => entry.current) ?? players[0] ?? null;
  return { all: rows, players, current, others: players.filter((entry) => entry.id !== current?.id) };
}
function stationRows(ship) {
  return Object.entries(ship?.crew?.stations ?? {}).map(([id, actorId]) => ({
    id,
    label: titleCase(id),
    actorId: actorId || "",
    actorName: actorId ? (game.actors?.get(actorId)?.name ?? String(actorId)) : "Unassigned",
    assigned: Boolean(actorId)
  }));
}
function readinessBlocks(entry) {
  const blocks = [];
  if (!entry) return ["No ship selected."];
  if (entry.status === "Commissioning Required") blocks.push(...(entry.statusReasons?.length ? entry.statusReasons : ["Ship commissioning is incomplete."]));
  else if (!entry.validation?.ok) blocks.push(...(entry.validation?.errors ?? ["Ship validation failed."]));
  if (!entry.crew?.ready) blocks.push(`${entry.crew?.assigned ?? 0}/${entry.crew?.total ?? 0} permanent stations assigned.`);
  for (const row of (entry.damagedSystems ?? []).filter((row) => ["disabled", "destroyed"].includes(row.state))) blocks.push(`${titleCase(row.system)} is ${titleCase(row.state)}.`);
  for (const condition of entry.conditions ?? []) if (Number(condition?.severity ?? 0) >= 2) blocks.push(condition.label ?? condition.name ?? condition.id ?? "Serious persistent condition.");
  return [...new Set(blocks)];
}
function buildShipsScreen(ships, selectedId) {
  const rows = ships.all.map((entry) => ({ ...entry, selected: entry.id === selectedId, kind: entry.player ? "Player" : "NPC" }));
  const selected = rows.find((entry) => entry.id === selectedId) ?? rows.find((entry) => entry.current) ?? rows[0] ?? null;
  if (!selected) return { rows, selected: null, counts: { all: 0, player: 0, npc: 0 } };
  const blocks = readinessBlocks(selected);
  const stats = selected.derived?.stats ?? {};
  const voyageReasons = [...blocks];
  const combatReasons = [...blocks];
  if (eventIsActive()) { voyageReasons.push("A Voyage is already active."); combatReasons.push("A Voyage is already active."); }
  if (combatIsActive()) { voyageReasons.push("Ship Combat is already active."); combatReasons.push("Ship Combat is already active."); }
  if (!(typeof game.arkflight?.voyage?.openLauncher === "function" || typeof game.arkflight?.openVoyageLauncher === "function")) voyageReasons.push("Voyage launcher is not integrated on this branch yet.");
  if (!(typeof game.arkflight?.combat?.openLauncher === "function" || typeof game.arkflight?.combat?.open === "function")) combatReasons.push("Ship Combat launcher is not integrated on this branch yet.");
  return {
    rows,
    selected: {
      ...selected,
      resourcesView: resourceRows(selected.resources),
      stations: stationRows(selected.ship),
      blockers: blocks,
      hasBlockers: blocks.length > 0,
      capacity: {
        rooms: `${selected.derived?.usage?.rooms ?? 0} / ${stats.roomCapacity ?? 0}`,
        shipMods: `${selected.derived?.usage?.shipMods ?? 0} / ${stats.shipModCapacity ?? 0}`,
        arkengineMods: `${selected.derived?.usage?.arkengineMods ?? 0} / ${stats.arkengineModCapacity ?? 0}`,
        cargo: `${selected.cargo?.used ?? 0} / ${stats.cargoCapacity ?? 0}`
      },
      canShipwright: Boolean(game.arkflight?.ships?.canOpenShipwright?.()),
      canLaunchVoyage: selected.player && voyageReasons.length === 0,
      canLaunchCombat: selected.player && combatReasons.length === 0,
      voyageBlockTitle: voyageReasons.join(" • "),
      combatBlockTitle: combatReasons.join(" • ")
    },
    counts: { all: rows.length, player: rows.filter((row) => row.player).length, npc: rows.filter((row) => row.isNPC).length }
  };
}
function skillModifier(actor, slug) {
  const skill = actor?.skills?.[slug] ?? actor?.system?.skills?.[slug] ?? null;
  const value = skill?.mod ?? skill?.modifier ?? skill?.value;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function crewSkillSummary(actor, stationId) {
  const rows = (STATION_SKILLS[stationId] ?? []).map((slug) => ({ slug, mod: skillModifier(actor, slug) })).filter((row) => row.mod !== null);
  return rows.length ? rows.map((row) => `${titleCase(row.slug)} ${row.mod >= 0 ? "+" : ""}${row.mod}`).join(" · ") : "No station-skill data";
}
function crewCandidates(entry, stationId) {
  const stations = entry?.ship?.crew?.stations ?? {};
  const assignedElsewhere = new Map(Object.entries(stations).filter(([id, actorId]) => id !== stationId && actorId).map(([id, actorId]) => [actorId, id]));
  return (game.actors?.contents ?? []).filter((actor) => actor.type !== "vehicle").map((actor) => {
    const conflictStation = assignedElsewhere.get(actor.id) ?? null;
    return { id: actor.id, name: actor.name, skillSummary: crewSkillSummary(actor, stationId), conflictStation, disabled: Boolean(conflictStation) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
function chooseCrewDialog(entry, stationId) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const currentId = entry?.ship?.crew?.stations?.[stationId] ?? "";
    const selectId = `arkflight-crew-pick-${stationId}-${Date.now()}`;
    const options = [`<option value="">Unassigned</option>`, ...crewCandidates(entry, stationId).map((row) => `<option value="${foundry.utils.escapeHTML(row.id)}" ${row.id === currentId ? "selected" : ""} ${row.disabled ? "disabled" : ""}>${foundry.utils.escapeHTML(row.name)} — ${foundry.utils.escapeHTML(row.skillSummary)}${row.conflictStation ? ` — assigned: ${foundry.utils.escapeHTML(titleCase(row.conflictStation))}` : ""}</option>`)].join("");
    const content = `<div class="arkflight-gm-crew-dialog"><p><strong>${foundry.utils.escapeHTML(entry.name)}</strong> · ${foundry.utils.escapeHTML(titleCase(stationId))}</p><p class="hint">Choose a permanent officer. Officers already holding another permanent station on this ship are visible but unavailable.</p><select id="${selectId}">${options}</select></div>`;
    new DialogV2({ window: { title: `Assign ${titleCase(stationId)}` }, content, buttons: [
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => resolve(null) },
      { action: "assign", label: "Assign Officer", icon: "fa-solid fa-user-check", default: true, callback: () => resolve(document.getElementById(selectId)?.value ?? "") }
    ], close: () => resolve(null) }).render({ force: true });
  });
}
function buildCommandDashboard(eventState, eventDefinition, combatActive) {
  const ships = shipSource();
  const eventActive = Boolean(eventState?.eventId);
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
  return {
    world: { seconds: Number(game.time?.worldTime ?? 0), workOrderCount: activeWorkOrders.length, authoritativeCalendarPending: true },
    currentShip: ships.current,
    otherShips: ships.others,
    hasOtherShips: ships.others.length > 0,
    operation: eventActive ? { type: "Voyage", name: eventDefinition?.name ?? eventDefinition?.title ?? eventState.eventId, phase: eventState.phase ?? "active", round: Number(eventState.roundIndex ?? 0) + 1, action: "resume-event" }
      : combatActive ? { type: "Ship Combat", name: "Active Ship Combat", phase: currentCombatState()?.status ?? "active", round: currentCombatState()?.round ?? null, action: null } : null,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

export class ArkflightGMOperations extends HandlebarsApplication {
  static DEFAULT_OPTIONS = { id: "arkflight-gm-operations", classes: ["arkflight", "arkflight-gm-operations"], position: { width: 1100, height: 750 }, window: { title: "Arkflight GM Operations", icon: "fa-solid fa-screwdriver-wrench", resizable: true } };
  static PARTS = { operations: { template: "modules/arkflight-game/templates/gm-operations.hbs" } };

  constructor(options = {}) {
    super(options);
    this.activeSection = options.activeSection ?? null;
    this.selectedRosterShipId = options.selectedRosterShipId ?? null;
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
    const sections = PRIMARY_SECTIONS.map((section) => ({ ...section, active: section.id === activeSection, status: section.id === "operations" && (eventActive || combatActive) ? "active" : null }));
    const shipsSource = shipSource();
    if (!this.selectedRosterShipId || !shipsSource.all.some((ship) => ship.id === this.selectedRosterShipId)) this.selectedRosterShipId = shipsSource.current?.id ?? shipsSource.all[0]?.id ?? null;
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
      shipsScreen: buildShipsScreen(shipsSource, this.selectedRosterShipId),
      activeEvent: eventActive ? { id: eventState.eventId, name: eventDefinition?.name ?? eventDefinition?.title ?? eventState.eventId, phase: eventState.phase ?? "active", round: Number(eventState.roundIndex ?? 0) + 1 } : null
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.element) return;
    for (const button of this.element.querySelectorAll("[data-gm-section]")) button.addEventListener("click", () => {
      const section = button.dataset.gmSection;
      if (!SECTION_TITLES[section] || section === this.activeSection) return;
      this.activeSection = section;
      this.render({ force: true });
    });
    for (const button of this.element.querySelectorAll("[data-action='resume-event']")) button.addEventListener("click", () => game.arkflight?.openBoard?.());
    this.element.querySelector("[data-action='open-operations']")?.addEventListener("click", () => { this.activeSection = "operations"; this.render({ force: true }); });
    for (const button of this.element.querySelectorAll("[data-roster-ship-id]")) button.addEventListener("click", () => { this.selectedRosterShipId = button.dataset.rosterShipId; this.render({ force: true }); });
    this.element.querySelector("[data-action='open-ship-sheet']")?.addEventListener("click", () => { if (this.selectedRosterShipId) game.arkflight?.ships?.openSheet?.(this.selectedRosterShipId); });
    this.element.querySelector("[data-action='open-shipwright']")?.addEventListener("click", () => {
      if (!this.selectedRosterShipId) return;
      try { game.arkflight?.ships?.openShipwright?.(this.selectedRosterShipId); } catch (error) { ui.notifications?.warn(error.message); }
    });
    this.element.querySelector("[data-action='set-current-ship']")?.addEventListener("click", async () => {
      if (!this.selectedRosterShipId) return;
      try { await game.arkflight?.ships?.setCurrent?.(this.selectedRosterShipId); this.render({ force: true }); } catch (error) { ui.notifications?.warn(error.message); }
    });
    for (const button of this.element.querySelectorAll("[data-assign-station]")) button.addEventListener("click", async () => {
      const stationId = button.dataset.assignStation;
      const entry = game.arkflight?.ships?.get?.(this.selectedRosterShipId);
      if (!entry || !stationId) return;
      const actorId = await chooseCrewDialog(entry, stationId);
      if (actorId === null) return;
      try { await game.arkflight?.ships?.setStationAssignment?.(entry.id, stationId, actorId || null); this.render({ force: true }); } catch (error) { ui.notifications?.warn(error.message); }
    });
  }
}

export function defaultGMOperationsSection() { return contextualDefaultSection(); }
