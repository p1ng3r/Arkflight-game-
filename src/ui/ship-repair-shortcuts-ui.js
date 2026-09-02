const MODULE_ID = "arkflight-game";
const pendingRepairTargets = new Map();

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function rootFrom(app, html) {
  const candidate = html?.[0] ?? html ?? app?.element?.[0] ?? app?.element;
  if (!(candidate instanceof HTMLElement)) return null;
  return candidate.matches?.(".arkflight-ship-shell") ? candidate : candidate.querySelector?.(".arkflight-ship-shell");
}

function styleOnce() {
  if (document.getElementById("arkflight-repair-shortcut-style")) return;
  const style = document.createElement("style");
  style.id = "arkflight-repair-shortcut-style";
  style.textContent = `
    .arkflight-repair-shortcut{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;min-width:24px;margin-left:6px;border:1px solid #8b6a34;border-radius:4px;background:#17130d;color:#e7c66f;cursor:pointer;box-shadow:none;padding:0;vertical-align:middle}
    .arkflight-repair-shortcut:hover,.arkflight-repair-shortcut:focus{color:#fff1b4;border-color:#d5a64e;box-shadow:0 0 8px rgba(213,166,78,.35);outline:none}
    .arkflight-repair-shortcut i{font-size:12px;pointer-events:none}
    .arkflight-resource-label{display:flex;align-items:center;gap:4px}
    .arkflight-area-heading{display:flex;align-items:center;gap:6px}
    .arkflight-area-heading .arkflight-repair-shortcut{margin-left:auto}
    .arkflight-repair-focus{outline:2px solid #d5a64e!important;outline-offset:3px;box-shadow:0 0 16px rgba(213,166,78,.45)!important;animation:arkflight-repair-pulse 1.2s ease-out 2}
    @keyframes arkflight-repair-pulse{0%{box-shadow:0 0 0 rgba(213,166,78,0)}45%{box-shadow:0 0 22px rgba(213,166,78,.7)}100%{box-shadow:0 0 8px rgba(213,166,78,.25)}}
  `;
  document.head.append(style);
}

function openRepair(actor, targetType, targetKey) {
  if (!actor || !shipFlag(actor)) return;
  pendingRepairTargets.set(actor.uuid, { targetType, targetKey });
  const opener = game.arkflight?.openShipwrightWorkspace;
  if (!opener) return ui.notifications?.warn?.("Shipwright Workspace is not available yet.");
  opener(actor);
}

function makeShortcut(actor, targetType, targetKey, title) {
  const shortcut = document.createElement("span");
  shortcut.className = "arkflight-repair-shortcut";
  shortcut.setAttribute("role", "button");
  shortcut.setAttribute("tabindex", "0");
  shortcut.setAttribute("aria-label", title);
  shortcut.title = title;
  shortcut.innerHTML = '<i class="fa-solid fa-hammer"></i>';
  const activate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openRepair(actor, targetType, targetKey);
  };
  shortcut.addEventListener("click", activate);
  shortcut.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") activate(event);
  });
  return shortcut;
}

function decorateResourceShortcuts(root, actor, ship) {
  for (const card of root.querySelectorAll(".arkflight-resource-card")) {
    const label = card.querySelector(".arkflight-resource-label");
    if (!label || label.querySelector(".arkflight-repair-shortcut")) continue;
    const text = label.textContent?.trim().toLowerCase() ?? "";
    let key = null;
    if (text.includes("hull")) key = "hull";
    else if (text.includes("lifeveil")) key = "lifeveil";
    if (!key) continue;
    const resource = ship.resources?.[key];
    const value = Number(resource?.value ?? 0);
    const max = Number(resource?.max ?? 0);
    if (!(max > 0 && value < max)) continue;
    label.append(makeShortcut(actor, "resource", key, `Repair ${key === "hull" ? "Hull Integrity" : "Lifeveil"}`));
  }
}

function decorateAreaShortcuts(root, actor, ship) {
  const areaCards = [...root.querySelectorAll(".arkflight-area-card")];
  for (const card of areaCards) {
    const heading = card.querySelector(".arkflight-area-heading");
    if (!heading || heading.querySelector(".arkflight-repair-shortcut")) continue;
    const label = heading.querySelector("strong")?.textContent?.trim().toLowerCase() ?? "";
    const key = label === "hull" ? "hull"
      : label === "arkengine" ? "arkengine"
      : label === "rigging" ? "rigging"
      : label === "lifeveil" ? "lifeveil"
      : label === "morale" ? "morale"
      : null;
    if (!key) continue;
    const state = String(ship.areas?.[key]?.state ?? "stable").toLowerCase();
    if (state === "stable") continue;
    heading.append(makeShortcut(actor, "area", key, `Repair ${label}`));
  }

  for (const row of root.querySelectorAll(".arkflight-area-row[data-arkflight-area]")) {
    if (row.querySelector(".arkflight-repair-shortcut")) continue;
    const key = row.dataset.arkflightArea;
    const state = String(ship.areas?.[key]?.state ?? "stable").toLowerCase();
    if (state === "stable") continue;
    row.append(makeShortcut(actor, "area", key, `Repair ${key}`));
  }
}

function decorateShipSheet(app, html) {
  const actor = app?.actor ?? app?.document;
  const ship = shipFlag(actor);
  const root = rootFrom(app, html);
  if (!actor || !ship || !root) return;
  styleOnce();
  decorateResourceShortcuts(root, actor, ship);
  decorateAreaShortcuts(root, actor, ship);
}

function focusPendingRepair(app, html) {
  const actor = app?.actor;
  const pending = actor?.uuid ? pendingRepairTargets.get(actor.uuid) : null;
  if (!pending) return;
  const candidate = html?.[0] ?? html ?? app?.element;
  const root = candidate?.matches?.(".arkflight-workspace-shell") ? candidate : candidate?.querySelector?.(".arkflight-workspace-shell");
  if (!root) return;

  let attempts = 0;
  const seek = () => {
    attempts += 1;
    let panel = root.querySelector(".arkflight-rf-panel");
    if (!panel) {
      const repairsButton = root.querySelector("[data-repairs-fabrication]");
      if (repairsButton) repairsButton.click();
      panel = root.querySelector(".arkflight-rf-panel");
    }

    const selector = `[data-repair-target-type="${pending.targetType}"][data-repair-target-key="${pending.targetKey}"]`;
    const repairButton = root.querySelector(selector);
    const target = repairButton?.closest?.(".arkflight-repair-target");
    if (target) {
      pendingRepairTargets.delete(actor.uuid);
      target.classList.add("arkflight-repair-focus");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => target.classList.remove("arkflight-repair-focus"), 2600);
      return;
    }
    if (attempts < 40) setTimeout(seek, 75);
    else pendingRepairTargets.delete(actor.uuid);
  };
  setTimeout(seek, 0);
}

Hooks.on("renderActorSheet", (app, html) => setTimeout(() => decorateShipSheet(app, html), 0));
Hooks.on("renderApplicationV2", (app, html) => focusPendingRepair(app, html));

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.openShipwrightRepair = openRepair;
});
