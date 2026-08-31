const MODULE_ID = "arkflight-game";

function rootFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function isArkflightShip(app) {
  const actor = app?.actor ?? app?.document;
  return Boolean(actor?.flags?.[MODULE_ID]?.ship);
}

function replaceLegacyLanguage(root) {
  for (const node of root.querySelectorAll("button, small, p, span")) {
    const text = String(node.textContent ?? "").trim();
    if (!text) continue;
    if (/^apply refit$/i.test(text)) {
      node.textContent = "SAVE CORE BUILD";
      node.title = "Save hull, pattern, Arkengine, and core vessel configuration. Physical Mods use the dedicated Install Mod actions.";
      continue;
    }
    if (/changes remain staged until apply refit/i.test(text)) {
      node.textContent = "Core-build changes use Save Core Build. Physical fittings use Crew or Shipyard installation.";
    }
  }
}

function normalizeInstallActions(root) {
  const crew = root.querySelector('[data-refit-install-method="crew"]');
  if (crew) {
    crew.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i> INSTALL MOD — CREW';
    crew.title = "Assigned Engineer rolls PF2e Crafting. Parts and time are spent on every attempt; success installs the Mod.";
  }
  const shipyard = root.querySelector('[data-refit-install-method="shipyard"]');
  if (shipyard) {
    shipyard.innerHTML = '<i class="fa-solid fa-building"></i> INSTALL MOD — SHIPYARD';
  }
}

function labelWorkOrders(root) {
  for (const panel of root.querySelectorAll(".arkflight-refit-work-orders")) {
    panel.dataset.arkflightState = "work-orders";
    for (const row of panel.querySelectorAll(".arkflight-refit-work-order")) row.dataset.arkflightState = "pending";
  }
}

function applyUnifiedPresentation(app, html) {
  if (!isArkflightShip(app)) return;
  const root = rootFrom(app, html);
  if (!root) return;
  root.dataset.arkflightAlphaUnified = "true";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    replaceLegacyLanguage(root);
    normalizeInstallActions(root);
    labelWorkOrders(root);
  }));
}

Hooks.on("renderActorSheet", applyUnifiedPresentation);
Hooks.on("renderApplicationV2", applyUnifiedPresentation);
