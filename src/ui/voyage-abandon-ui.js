const MODULE_ID = "arkflight-game";
const PLANNING_SETTING = "activeEventPlanning";
const ACTIVE_SHIP_SETTING = "activeVoyageShipUuid";
const HISTORY_SETTING = "abandonedEventHistory";
const SOCKET = `module.${MODULE_ID}`;
const MAX_HISTORY = 50;

function eventState() {
  return game.arkflight?.controller?.state ?? null;
}

function eventTitle(state) {
  const definition = state?.eventId ? game.arkflight?.events?.[state.eventId] ?? null : null;
  return definition?.title ?? definition?.name ?? state?.eventId ?? "Arkflight Voyage";
}

function historyEntries() {
  const stored = game.settings?.get(MODULE_ID, HISTORY_SETTING) ?? {};
  return Array.isArray(stored?.entries) ? [...stored.entries] : [];
}

async function confirmAbandon(state) {
  const DialogV2 = foundry.applications.api.DialogV2;
  const title = foundry.utils.escapeHTML(eventTitle(state));
  const choice = await DialogV2.wait({
    window: { title: "Abandon Arkflight Event" },
    content: `<div class="arkflight-abandon-confirm"><p><strong>Abandon ${title}?</strong></p><p>This archives a short history record, clears the active Voyage session and its event-specific ship binding, and removes the saved station assignments for this run.</p><p><strong>Already-applied ship damage, rewards, or other persistent consequences are not rolled back.</strong> Permanent crew assignments on the ship are not changed.</p></div>`,
    buttons: [
      { action: "cancel", label: "Keep Event", icon: "fa-solid fa-xmark", default: true },
      { action: "abandon", label: "Abandon Event", icon: "fa-solid fa-trash-can" }
    ]
  });
  return choice === "abandon";
}

async function abandonEvent({ confirm = true } = {}) {
  if (!game.user?.isGM) throw new Error("Only the GM may abandon an Arkflight Voyage Event.");
  const controller = game.arkflight?.controller;
  const state = controller?.state ?? null;
  if (!state?.eventId) {
    ui.notifications?.info("No Arkflight Voyage Event is active.");
    return false;
  }
  if (confirm && !(await confirmAbandon(state))) return false;

  const ship = game.arkflight?.activeShip ?? null;
  const archive = {
    eventId: state.eventId,
    eventTitle: eventTitle(state),
    phase: state.phase ?? null,
    roundId: state.roundId ?? null,
    roundIndex: Number.isFinite(Number(state.roundIndex)) ? Number(state.roundIndex) : null,
    shipUuid: ship?.uuid ?? game.settings?.get(MODULE_ID, ACTIVE_SHIP_SETTING) ?? null,
    shipName: ship?.name ?? null,
    abandonedAt: Date.now(),
    abandonedByUserId: game.user.id
  };
  const entries = [...historyEntries(), archive].slice(-MAX_HISTORY);
  await game.settings.set(MODULE_ID, HISTORY_SETTING, { entries });

  controller.state = null;
  await game.settings.set(MODULE_ID, PLANNING_SETTING, null);
  await game.settings.set(MODULE_ID, ACTIVE_SHIP_SETTING, "");
  game.socket?.emit(SOCKET, { type: "snapshot", state: null, sourceUserId: game.user.id });
  controller.onStateChange?.(null);

  ui.notifications?.info(`${archive.eventTitle} abandoned. Voyage session cleared.`);
  return true;
}

function addGMOperationsButton(app) {
  if (!game.user?.isGM || !eventState()?.eventId) return;
  if (app?.id !== "arkflight-gm-operations" && app?.options?.id !== "arkflight-gm-operations") return;
  if (app.activeSection !== "operations") return;
  const root = app.element;
  const active = root?.querySelector?.(".arkflight-gm-active-operation");
  if (!active || active.querySelector("[data-arkflight-abandon-event]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-abandon-event-button";
  button.dataset.arkflightAbandonEvent = "true";
  button.innerHTML = '<i class="fa-solid fa-trash-can"></i> Abandon Event';
  button.addEventListener("click", async () => {
    if (await abandonEvent()) app.render({ force: true });
  });
  active.append(button);
}

function addEventBoardButton(app) {
  if (!game.user?.isGM || !eventState()?.eventId) return;
  if (app?.id !== "arkflight-event-board" && app?.options?.id !== "arkflight-event-board") return;
  const root = app.element;
  if (!root) return;
  const shell = root.matches?.(".application") ? root : root.closest?.(".application") ?? root;
  const header = shell.querySelector?.(":scope > .window-header") ?? shell.querySelector?.(".window-header");
  if (!header || header.querySelector("[data-arkflight-abandon-event]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-abandon-event-button arkflight-abandon-event-header";
  button.dataset.arkflightAbandonEvent = "true";
  button.title = "Abandon this Voyage Event";
  button.innerHTML = '<i class="fa-solid fa-trash-can"></i><span>Abandon Event</span>';
  button.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (await abandonEvent()) await app.close?.();
  });
  const close = header.querySelector?.('[data-action="close"]') ?? header.querySelector?.(".window-control.close");
  if (close?.parentElement === header) header.insertBefore(button, close);
  else header.append(button);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, HISTORY_SETTING, {
    name: "Abandoned Arkflight Event History",
    scope: "world",
    config: false,
    type: Object,
    default: { entries: [] }
  });
});

Hooks.once("ready", () => {
  if (!game.arkflight) return;
  game.arkflight.abandonEvent = abandonEvent;
  game.arkflight.getAbandonedEventHistory = () => historyEntries();
});

Hooks.on("renderApplicationV2", (app) => {
  addGMOperationsButton(app);
  addEventBoardButton(app);
});
Hooks.on("renderArkflightGMOperations", (app) => addGMOperationsButton(app));
