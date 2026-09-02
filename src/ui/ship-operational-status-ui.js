import {
  SHIP_OPERATIONAL_STATUSES,
  normalizeShipOperationalStatus,
  shipOperationalStatus
} from "../ship/operational-status.js";

const MODULE_ID = "arkflight-game";
const SERVICE_FLAG = "refitServiceMode";

function rootFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function actorFrom(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function ship(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function canManage(actor) {
  return Boolean(game.user?.isGM || actor?.isOwner);
}

function currentStatus(actor) {
  return normalizeShipOperationalStatus(ship(actor)?.operationalStatus);
}

function effectHtml(status) {
  return `<div class="arkflight-operational-status-effects">
    <p>${status.summary}</p>
    <ul>${status.effects.map((effect) => `<li>${effect}</li>`).join("")}</ul>
  </div>`;
}

function selector(actor) {
  const key = currentStatus(actor);
  const current = SHIP_OPERATIONAL_STATUSES[key];
  const wrapper = document.createElement("div");
  wrapper.className = `arkflight-operational-status is-${key}`;
  wrapper.dataset.operationalStatusRoot = "";
  wrapper.innerHTML = `<div class="arkflight-operational-status-label">VESSEL STATUS</div>
    <button type="button" class="arkflight-operational-status-current" data-operational-status-toggle aria-expanded="false">
      <i class="fa-solid ${current.icon}"></i>
      <span>${current.label}</span>
      <i class="fa-solid fa-chevron-down"></i>
    </button>
    <div class="arkflight-operational-status-menu" data-operational-status-menu hidden>
      ${Object.values(SHIP_OPERATIONAL_STATUSES).map((status) => `<button type="button" data-operational-status="${status.key}" class="${status.key === key ? "is-active" : ""}" ${canManage(actor) ? "" : "disabled"}>
        <i class="fa-solid ${status.icon}"></i>
        <span><strong>${status.label}</strong><small>${status.summary}</small></span>
      </button>`).join("")}
    </div>
    ${effectHtml(current)}`;
  return wrapper;
}

async function applyStatus(actor, value) {
  const key = normalizeShipOperationalStatus(value);
  const status = SHIP_OPERATIONAL_STATUSES[key];
  await actor.update({ [`flags.${MODULE_ID}.ship.operationalStatus`]: key });
  await actor.setFlag(MODULE_ID, SERVICE_FLAG, status.preferredRefitMode);
  ui.notifications?.info?.(`${actor.name} is now ${status.label}.`);
  actor.sheet?.render?.(false);
}

function enhance(app, html) {
  const root = rootFrom(app, html);
  const actor = actorFrom(app);
  if (!root || !actor || !ship(actor)) return;
  const host = root.querySelector("[data-operational-status-host]");
  if (!host) return;

  const node = selector(actor);
  host.replaceChildren(node);

  const toggle = node.querySelector("[data-operational-status-toggle]");
  const menu = node.querySelector("[data-operational-status-menu]");
  toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    const opening = menu.hidden;
    menu.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });

  for (const button of node.querySelectorAll("[data-operational-status]")) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!canManage(actor)) return;
      try { await applyStatus(actor, event.currentTarget.dataset.operationalStatus); }
      catch (error) {
        console.error("Arkflight | Could not update vessel operational status", error);
        ui.notifications?.error?.(error?.message ?? "Could not update vessel status.");
      }
    });
  }
}

Hooks.on("renderActorSheet", enhance);
Hooks.on("renderApplicationV2", enhance);

Hooks.once("ready", () => {
  game.arkflight = game.arkflight ?? {};
  game.arkflight.shipOperationalStatus = Object.freeze({
    statuses: SHIP_OPERATIONAL_STATUSES,
    get(actor) { return shipOperationalStatus(ship(actor)); },
    async set(actor, value) { return applyStatus(actor, value); }
  });
});
