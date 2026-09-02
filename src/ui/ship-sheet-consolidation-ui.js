import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";

function actorFrom(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function rootFrom(app, html) {
  const candidate = html?.[0] ?? html ?? app?.element?.[0] ?? app?.element;
  if (!(candidate instanceof HTMLElement)) return null;
  return candidate.matches?.(".arkflight-ship-shell") ? candidate : candidate.querySelector?.(".arkflight-ship-shell");
}

function fixSupplyLedger(root, actor) {
  const ship = shipFlag(actor);
  if (!ship) return;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const derivedMax = Math.max(0, Number(derived?.stats?.supplyCapacity ?? 0));
  const storedMax = Math.max(0, Number(ship?.resources?.supplies?.max ?? 0));
  const max = derivedMax > 0 ? derivedMax : storedMax;
  const value = Math.max(0, Number(ship?.resources?.supplies?.value ?? 0));
  if (max <= 0) return;

  for (const row of root.querySelectorAll(".arkflight-log-resource")) {
    const label = row.querySelector("span")?.textContent?.trim();
    if (label !== "Supplies") continue;
    const strong = row.querySelector("strong");
    if (strong) strong.textContent = `${value} / ${max}`;
  }
}

function consolidateNavigation(app, html) {
  const actor = actorFrom(app);
  const root = rootFrom(app, html);
  if (!actor || !shipFlag(actor) || !root) return;
  const nav = root.querySelector(".arkflight-sheet-tabs");
  if (!nav) return;

  for (const obsolete of nav.querySelectorAll('[data-tab="fittings"], [data-tab="refit"]')) obsolete.remove();

  if (!nav.querySelector("[data-open-shipwright]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.openShipwright = "";
    button.innerHTML = '<i class="fa-solid fa-hammer"></i> Shipwright';
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      game.arkflight?.openShipwrightWorkspace?.(actor, "workbench");
    });
    nav.append(button);
  }

  const holdButton = nav.querySelector("[data-hold-tab]");
  if (holdButton && holdButton.dataset.supplyFixWired !== "true") {
    holdButton.dataset.supplyFixWired = "true";
    holdButton.addEventListener("click", () => setTimeout(() => fixSupplyLedger(root, actor), 0));
  }

  fixSupplyLedger(root, actor);
}

Hooks.on("renderActorSheet", consolidateNavigation);
Hooks.on("renderApplicationV2", consolidateNavigation);
