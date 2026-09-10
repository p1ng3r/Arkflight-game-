import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const AETHER_SCRAP_ICON = `/modules/${MODULE_ID}/assets/ui/shipwright/workbench/payment_aether_scrap.webp`;

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
    if (row.querySelector("span")?.textContent?.trim() !== "Supplies") continue;
    const strong = row.querySelector("strong");
    if (strong) strong.textContent = `${value} / ${max}`;
  }
}

function decorateHoldScrap(root) {
  if (root.querySelector("[data-arkflight-hold-scrap-icon]")) return;
  const subhead = [...root.querySelectorAll(".arkflight-log-subhead")]
    .find((entry) => entry.querySelector("span")?.textContent?.trim() === "AETHER SCRAP");
  const label = subhead?.parentElement?.querySelector(".arkflight-hold-item")?.firstElementChild;
  if (!label) return;

  label.style.display = "grid";
  label.style.gridTemplateColumns = "52px 1fr";
  label.style.gridTemplateRows = "auto auto";
  label.style.columnGap = "10px";
  label.style.alignItems = "center";

  const icon = document.createElement("img");
  icon.src = AETHER_SCRAP_ICON;
  icon.alt = "Aether Scrap";
  icon.dataset.arkflightHoldScrapIcon = "";
  icon.style.width = "48px";
  icon.style.height = "48px";
  icon.style.objectFit = "contain";
  icon.style.gridRow = "1 / span 2";
  icon.style.gridColumn = "1";
  icon.style.border = "0";
  icon.style.background = "transparent";

  const strong = label.querySelector("strong");
  const span = label.querySelector("span");
  if (strong) { strong.style.gridColumn = "2"; strong.style.gridRow = "1"; }
  if (span) { span.style.gridColumn = "2"; span.style.gridRow = "2"; }
  label.prepend(icon);
}

function polishNativeShipSheet(app, html) {
  const actor = actorFrom(app);
  const root = rootFrom(app, html);
  if (!actor || !shipFlag(actor) || !root) return;
  fixSupplyLedger(root, actor);
  decorateHoldScrap(root);
}

Hooks.on("renderApplicationV2", polishNativeShipSheet);
