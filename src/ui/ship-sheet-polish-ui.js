const MODULE_ID = "arkflight-game";

const STATION_ART = Object.freeze({
  captain: `modules/${MODULE_ID}/assets/ui/stations/station_icon_captain.webp`,
  engineer: `modules/${MODULE_ID}/assets/ui/stations/station_icon_engineer.webp`,
  navigator: `modules/${MODULE_ID}/assets/ui/stations/station_icon_navigator.webp`,
  battlewatch: `modules/${MODULE_ID}/assets/ui/stations/station_icon_watchmaster.webp`,
  watchmaster: `modules/${MODULE_ID}/assets/ui/stations/station_icon_watchmaster.webp`,
  veilwarden: `modules/${MODULE_ID}/assets/ui/stations/station_icon_veilwarden.webp`
});

const SYSTEM_ICONS = Object.freeze({
  hull: "fa-shield-halved",
  arkengine: "fa-gears",
  lifeveil: "fa-sparkles",
  helm: "fa-compass",
  rigging: "fa-wind",
  command: "fa-flag",
  weapons: "fa-crosshairs"
});

function rootElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function isArkflightShipSheet(app, root) {
  const actor = app?.actor ?? app?.document;
  return actor?.type === "vehicle" && Boolean(root?.querySelector?.(".arkflight-ship-shell"));
}

function stationKeyFromLabel(label) {
  const key = String(label ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (key === "watchmaster" || key === "battlewatch") return "battlewatch";
  return key;
}

function decorateHeader(shell) {
  const header = shell.querySelector(".arkflight-ship-header");
  if (!header) return;
  header.dataset.arkflightPolished = "true";
}

function decorateResources(shell) {
  for (const card of shell.querySelectorAll(".arkflight-resource-card")) {
    card.classList.add("arkflight-event-panel-surface");
    const label = card.querySelector(".arkflight-resource-label")?.textContent?.trim().toLowerCase() ?? "";
    if (label.includes("hull")) card.dataset.resourceKind = "hull";
    else if (label.includes("lifeveil")) card.dataset.resourceKind = "lifeveil";
    else if (label.includes("strain")) card.dataset.resourceKind = "strain";
    else if (label.includes("supplies")) card.dataset.resourceKind = "supplies";
    else if (label.includes("morale")) card.dataset.resourceKind = "morale";
  }
  for (const card of shell.querySelectorAll(".arkflight-stat-card")) card.classList.add("arkflight-event-panel-surface");
}

function decorateSystems(shell) {
  for (const row of shell.querySelectorAll("[data-system-state]")) {
    if (row.querySelector(".arkflight-system-icon")) continue;
    const key = row.dataset.systemState;
    const name = row.querySelector(".arkflight-system-name");
    const icon = document.createElement("span");
    icon.className = "arkflight-system-icon";
    icon.innerHTML = `<i class="fa-solid ${SYSTEM_ICONS[key] ?? "fa-gear"}"></i>`;
    if (name) name.before(icon); else row.prepend(icon);
  }
}

function decorateStations(shell) {
  for (const card of shell.querySelectorAll(".arkflight-station-card")) {
    const name = card.querySelector("strong")?.textContent?.trim() ?? "";
    const key = stationKeyFromLabel(name);
    if (key === "battlewatch" && card.querySelector("strong")) card.querySelector("strong").textContent = "Battlewatch";
    const emblem = card.querySelector(".arkflight-station-emblem");
    if (!emblem || emblem.querySelector("img")) continue;
    const src = STATION_ART[key];
    if (!src) continue;
    emblem.replaceChildren();
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${key === "battlewatch" ? "Battlewatch" : name} station`;
    emblem.append(img);
    card.dataset.station = key;
  }
}

function decoratePanels(shell) {
  for (const panel of shell.querySelectorAll(".arkflight-command-panel")) panel.classList.add("arkflight-event-panel-surface");

  const systems = shell.querySelector(".arkflight-systems-panel .arkflight-panel-heading h2");
  if (systems) systems.textContent = "Ship Systems";
  const vessel = shell.querySelector(".arkflight-vessel-panel .arkflight-ship-kicker");
  if (vessel) vessel.textContent = "VESSEL RECORD";
  const stations = shell.querySelector(".arkflight-stations-panel .arkflight-ship-kicker");
  if (stations) stations.textContent = "BRIDGE WATCH";
}

function addArtHooks(shell) {
  const vesselPanel = shell.querySelector(".arkflight-vessel-panel");
  if (vesselPanel && !vesselPanel.querySelector(".arkflight-vessel-art-hook")) {
    const hook = document.createElement("div");
    hook.className = "arkflight-vessel-art-hook";
    hook.dataset.artHook = "vessel-profile";
    hook.setAttribute("aria-hidden", "true");
    vesselPanel.prepend(hook);
  }
  const systemsPanel = shell.querySelector(".arkflight-systems-panel");
  if (systemsPanel) systemsPanel.dataset.artHook = "systems";
  const stationsPanel = shell.querySelector(".arkflight-stations-panel");
  if (stationsPanel) stationsPanel.dataset.artHook = "bridge-watch";
}

function polishShipSheet(app, html) {
  const root = rootElement(html);
  if (!isArkflightShipSheet(app, root)) return;
  const shell = root.querySelector(".arkflight-ship-shell");
  if (!shell || !shell.querySelector(".arkflight-command-grid")) return;
  shell.classList.add("arkflight-ship-command-polished");
  decorateHeader(shell);
  decorateResources(shell);
  decorateSystems(shell);
  decorateStations(shell);
  decoratePanels(shell);
  addArtHooks(shell);
}

Hooks.on("renderActorSheet", polishShipSheet);
