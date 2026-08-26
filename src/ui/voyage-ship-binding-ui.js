import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const ACTIVE_SHIP_SETTING = "activeVoyageShipUuid";
const VOYAGE_VESSEL_ICON = "modules/arkflight-game/assets/ui/stations/voyage_vessel_icon.webp";

function rootElement(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function text(value, fallback = "—") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

async function resolveActorReference(reference) {
  if (!reference) return null;
  if (reference.documentName === "Actor") return reference;
  if (typeof reference !== "string") return null;
  const direct = game.actors?.get(reference) ?? game.actors?.find((actor) => actor.uuid === reference || actor.name === reference);
  if (direct) return direct;
  try {
    const resolved = await fromUuid(reference);
    return resolved?.documentName === "Actor" ? resolved : null;
  } catch (_error) {
    return null;
  }
}

async function prefillCrew(actor) {
  const controller = game.arkflight?.controller;
  if (!controller?.state || controller.state.phase !== "opening" || controller.state.setupLocked) return;
  const stations = shipPayload(actor)?.crew?.stations ?? {};
  const used = new Set();
  for (const [station, reference] of Object.entries(stations)) {
    if (!reference) continue;
    const officer = await resolveActorReference(reference);
    if (!officer || used.has(officer.id)) continue;
    used.add(officer.id);
    try {
      await controller.command({ type: "assign-actor", station, actorId: officer.id });
    } catch (error) {
      console.warn(`Arkflight | Could not prefill ${station} from ${actor.name}`, error);
    }
  }
}

async function bindShip(actor) {
  if (!game.user.isGM || !actor) return;
  await game.settings.set(MODULE_ID, ACTIVE_SHIP_SETTING, actor.uuid);
  await prefillCrew(actor);
  ui.notifications?.info(`${actor.name} is now the active Voyage vessel.`);
  game.arkflight?.openBoard?.();
}

function vesselStats(actor) {
  const ship = shipPayload(actor);
  if (!ship) return null;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const hull = SHIP_CATALOGS.hulls?.[ship.hull?.chassisId];
  const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId];
  const resources = ship.resources ?? {};
  return {
    ship,
    derived,
    hull,
    engine,
    resources
  };
}

function decorate(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return;
  const command = root.querySelector(".arkflight-opening-command-column");
  if (!command) return;

  command.querySelector(".arkflight-bound-vessel")?.remove();

  const active = game.arkflight?.activeShip ?? null;
  const ships = [...(game.arkflight?.commissionedShips ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const data = active ? vesselStats(active) : null;
  const panel = document.createElement("section");
  panel.className = `arkflight-bound-vessel ${active ? "has-vessel" : "needs-vessel"}`;

  const selector = game.user.isGM
    ? `<div class="arkflight-vessel-picker"><span>VOYAGE VESSEL</span><select data-arkflight-vessel-select><option value="">— Select Vessel —</option>${ships.map((ship) => `<option value="${ship.uuid}" ${active?.uuid === ship.uuid ? "selected" : ""}>${ship.name}</option>`).join("")}</select></div>`
    : "";

  if (!active || !data) {
    panel.innerHTML = `
      <img class="arkflight-voyage-vessel-icon" src="${VOYAGE_VESSEL_ICON}" alt="Arkflight voyage vessel">
      <div class="arkflight-bound-vessel-copy">
        <span>ACTIVE VOYAGE VESSEL</span>
        <strong>No Vessel Selected</strong>
        <small>${ships.length ? "Choose the commissioned Arkflight vessel taking part in this Event." : "No commissioned Arkflight vessel is available."}</small>
      </div>
      ${selector}`;
  } else {
    panel.innerHTML = `
      <img class="arkflight-voyage-vessel-icon" src="${VOYAGE_VESSEL_ICON}" alt="${active.name} voyage vessel">
      <div class="arkflight-bound-vessel-copy">
        <span>ACTIVE VOYAGE VESSEL</span>
        <strong>${active.name}</strong>
        <small>${text(data.hull?.name)} · ${text(data.engine?.name)}</small>
      </div>
      ${selector}
      <div class="arkflight-bound-vessel-stats" aria-label="Selected vessel status">
        <div><span>Hull</span><strong>${data.resources.hull?.value ?? 0}/${data.resources.hull?.max ?? data.derived.stats?.hullIntegrity ?? 0}</strong></div>
        <div><span>Lifeveil</span><strong>${data.resources.lifeveil?.value ?? 0}/${data.resources.lifeveil?.max ?? data.derived.stats?.lifeveilCapacity ?? 0}</strong></div>
        <div><span>Strain</span><strong>${data.resources.strain?.value ?? 0}/${data.resources.strain?.max ?? data.derived.stats?.strainCapacity ?? 0}</strong></div>
        <div><span>Crew</span><strong>${data.derived.stats?.crew?.recommended ?? 0}</strong></div>
      </div>`;
  }

  const muster = command.querySelector(".arkflight-opening-muster");
  if (muster) command.insertBefore(panel, muster);
  else command.append(panel);

  panel.querySelector("[data-arkflight-vessel-select]")?.addEventListener("change", async (event) => {
    const uuid = event.currentTarget.value;
    if (!uuid) {
      await game.settings.set(MODULE_ID, ACTIVE_SHIP_SETTING, "");
      game.arkflight?.openBoard?.();
      return;
    }
    const actor = ships.find((ship) => ship.uuid === uuid) ?? await resolveActorReference(uuid);
    if (!actor) {
      ui.notifications?.warn("That Arkflight vessel could not be found.");
      return;
    }
    await bindShip(actor);
  });
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  if (!root) return;
  setTimeout(() => decorate(root), 50);
});
