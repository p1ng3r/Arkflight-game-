import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";

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

function decorate(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return;
  const actor = game.arkflight?.activeShip ?? null;
  const ship = shipPayload(actor);
  const command = root.querySelector(".arkflight-opening-command-column");
  if (!actor || !ship || !command) return;

  command.querySelector(".arkflight-bound-vessel")?.remove();
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const hull = SHIP_CATALOGS.hulls?.[ship.hull?.chassisId];
  const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId];
  const resources = ship.resources ?? {};

  const banner = document.createElement("section");
  banner.className = "arkflight-bound-vessel";
  banner.innerHTML = `
    <img src="${actor.img}" alt="${actor.name}">
    <div class="arkflight-bound-vessel-copy">
      <span>ACTIVE VOYAGE VESSEL</span>
      <strong>${actor.name}</strong>
      <small>${text(hull?.name)} · ${text(engine?.name)}</small>
    </div>
    <div class="arkflight-bound-vessel-stats">
      <div><span>Hull</span><strong>${resources.hull?.value ?? 0}/${resources.hull?.max ?? derived.stats?.hullIntegrity ?? 0}</strong></div>
      <div><span>Lifeveil</span><strong>${resources.lifeveil?.value ?? 0}/${resources.lifeveil?.max ?? derived.stats?.lifeveilCapacity ?? 0}</strong></div>
      <div><span>Strain</span><strong>${resources.strain?.value ?? 0}/${resources.strain?.max ?? derived.stats?.strainCapacity ?? 0}</strong></div>
      <div><span>Crew</span><strong>${derived.stats?.crew?.recommended ?? 0}</strong></div>
    </div>`;

  const muster = command.querySelector(".arkflight-opening-muster");
  if (muster) command.insertBefore(banner, muster);
  else command.append(banner);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  if (!root) return;
  setTimeout(() => decorate(root), 25);
});
