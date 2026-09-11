import { getMasteryTechnique } from "../content/base-mastery.js";
import {
  SHIP_CONDITION_SYSTEMS,
  activeShipConditionViews,
  conditionProfileById,
  setShipCondition
} from "../ship/ship-conditions.js";

const MODULE_ID = "arkflight-game";
const CONDITION_LABELS = Object.freeze({ hull: "Hull", drive: "Drive", weapons: "Weapons", lifeveil: "Lifeveil", morale: "Morale" });
const STATION_SYSTEMS = Object.freeze({ captain: "morale", engineer: "drive", navigator: "drive", battlewatch: "weapons", veilwarden: "lifeveil" });

function rootElement(element, app = null) {
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return null;
}

function shipFromActor(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function activeShipActor() { return game?.arkflight?.activeShip ?? null; }
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase()); }

function reorderResourceStrip(root) {
  const strip = root.querySelector(".arkflight-resource-strip");
  if (!strip) return;
  const order = ["Hull", "Lifeveil", "Strain", "Morale", "Supplies"];
  const cards = [...strip.children];
  for (const label of order) {
    const card = cards.find((node) => node.querySelector(".arkflight-resource-label")?.textContent?.trim().endsWith(label));
    if (card) strip.append(card);
  }
}

function nextConditionId(system, currentId) {
  const rows = {
    hull: ["sound", "battered", "breached", "shattered"],
    drive: ["responsive", "sluggish", "faltering", "unresponsive"],
    weapons: ["ready", "fouled", "malfunctioning", "barely-operable"]
  }[system] ?? [];
  const index = Math.max(0, rows.indexOf(currentId));
  return rows[(index + 1) % rows.length] ?? rows[0];
}

function decorateShipReadiness(app, root) {
  if (!root?.querySelector(".arkflight-ship-shell")) return;
  const actor = app?.actor;
  const ship = shipFromActor(actor);
  if (!ship) return;

  reorderResourceStrip(root);

  const panel = root.querySelector(".arkflight-systems-panel");
  if (panel) {
    const heading = panel.querySelector(".arkflight-panel-heading h2");
    if (heading) heading.textContent = "Ship Conditions";
    const kicker = panel.querySelector(".arkflight-panel-heading .arkflight-ship-kicker");
    if (kicker) kicker.textContent = "PERSISTENT SHIP CONDITIONS";
    const help = panel.querySelector(".arkflight-panel-heading small");
    if (help) help.textContent = "Hull, Drive, and Weapons can be cycled in Shipwright Mode. Lifeveil and Morale are derived from their percentages.";

    const list = panel.querySelector(".arkflight-system-list");
    if (list) {
      list.innerHTML = "";
      for (const condition of activeShipConditionViews(ship)) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `arkflight-system-row arkflight-area-row is-${condition.id}`;
        row.dataset.arkflightArea = condition.system;
        row.disabled = !(game.user?.isGM && app?.shipwrightMode && SHIP_CONDITION_SYSTEMS.includes(condition.system));
        row.innerHTML = `<span class="arkflight-system-name">${CONDITION_LABELS[condition.system]}</span><span class="arkflight-system-state">${condition.label}</span>`;
        row.addEventListener("click", async () => {
          if (!game.user?.isGM || !app?.shipwrightMode || !SHIP_CONDITION_SYSTEMS.includes(condition.system)) return;
          const currentShip = shipFromActor(actor);
          const current = conditionProfileById(condition.system, currentShip?.shipConditions?.[condition.system]);
          const next = setShipCondition(currentShip, condition.system, nextConditionId(condition.system, current.id));
          await actor.update({ [`flags.${MODULE_ID}.ship.shipConditions`]: next.shipConditions });
        });
        list.append(row);
      }
    }
  }

  for (const card of root.querySelectorAll(".arkflight-station-card")) {
    const strong = card.querySelector("strong");
    const raw = strong?.textContent?.trim()?.toLowerCase();
    const station = raw === "watchmaster" ? "battlewatch" : raw;
    if (!station || !STATION_SYSTEMS[station]) continue;
    if (strong && raw === "watchmaster") strong.textContent = "Battlewatch";
    let responsibility = card.querySelector(".arkflight-station-responsibility");
    if (!responsibility) {
      responsibility = document.createElement("small");
      responsibility.className = "arkflight-station-responsibility";
      card.querySelector("div:last-child")?.append(responsibility);
    }
    const label = station === "battlewatch" ? "Weapons / Hull" : CONDITION_LABELS[STATION_SYSTEMS[station]];
    responsibility.textContent = `Condition: ${label}`;
  }
}

function shipStatusSnapshot() {
  const actor = activeShipActor();
  const ship = shipFromActor(actor);
  if (!ship) return null;
  return {
    name: actor.name,
    strain: ship.resources?.strain ?? { value: 0, max: 0 },
    conditions: activeShipConditionViews(ship)
  };
}

function addStatusBox(parent, label, value, className = "") {
  const box = document.createElement("div");
  box.className = `arkflight-status-box arkflight-persistent-status ${className}`.trim();
  box.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  parent.append(box);
}

function decorateEventStatus(root) {
  if (!root?.matches?.(".arkflight-event-board") && !root?.querySelector?.(".arkflight-board-shell")) return;
  const snapshot = shipStatusSnapshot();
  if (!snapshot) return;

  const status = root.querySelector(".arkflight-status-strip");
  if (status && !status.querySelector(".arkflight-persistent-status")) {
    const restart = status.querySelector("button");
    addStatusBox(status, "Strain", `${snapshot.strain.value} / ${snapshot.strain.max}`, "is-strain");
    for (const row of snapshot.conditions) addStatusBox(status, CONDITION_LABELS[row.system], row.label, `is-${row.id}`);
    if (restart) status.append(restart);
  }

  for (const summary of root.querySelectorAll(".arkflight-round-opening-state, .arkflight-round-state-summary")) {
    if (summary.querySelector(".arkflight-persistent-state-inline")) continue;
    const strain = document.createElement("span");
    strain.className = "arkflight-persistent-state-inline";
    strain.innerHTML = `Strain <strong>${snapshot.strain.value} / ${snapshot.strain.max}</strong>`;
    summary.append(strain);
    for (const row of snapshot.conditions) {
      const item = document.createElement(summary.classList.contains("arkflight-round-state-summary") ? "div" : "span");
      item.className = `arkflight-persistent-state-inline is-${row.id}`;
      item.innerHTML = `<span>${CONDITION_LABELS[row.system]}</span> <strong>${row.label}</strong>`;
      summary.append(item);
    }
  }
}

function rebuildMasterySelect(select, state) {
  const station = select.dataset.station;
  if (!station) return;
  const ids = state?.availableMasteries?.[station] ?? [];
  const selected = state?.masterySelections?.[station] ?? "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = ids.length ? "— Ready one ship Mastery —" : "— No Masteries unlocked —";
  select.replaceChildren(placeholder);
  for (const id of ids) {
    const mastery = getMasteryTechnique(station, id);
    if (!mastery) continue;
    const option = document.createElement("option");
    option.value = mastery.id;
    option.textContent = `${mastery.name} — ${mastery.description}`;
    option.title = mastery.description;
    option.selected = mastery.id === selected;
    select.append(option);
  }
}

function decorateShipDerivedMasteries(root) {
  const state = game?.arkflight?.controller?.state;
  if (!state) return;
  for (const select of root.querySelectorAll("select[data-ark-setup='mastery']")) rebuildMasterySelect(select, state);
  const help = root.querySelector(".arkflight-event-setup .arkflight-setup-help");
  if (help) help.textContent = "Lock one different officer into each station for the Event. Each station readies one Mastery unlocked by the bound ship; hull, rooms, Arkengine choices, mods, weapons, specialists, and progression can expand these choices.";
}

function replaceLegacyPlayerText(root) {
  const replacements = [
    [/Hull Pressure/gi, "Hull Strain"],
    [/Arkengine Pressure/gi, "ship Strain"],
    [/Rigging Pressure/gi, "ship Strain"],
    [/Lifeveil Pressure/gi, "Lifeveil Strain"],
    [/threatening Arkengine/gi, "stressing the ship"],
    [/threatening Rigging/gi, "stressing the ship"],
    [/system Pressure/gi, "ship Strain"],
    [/\bPressure\b/g, "Strain"],
    [/\bArea readiness\b/gi, "Ship Conditions"],
    [/\bAreas\b/g, "Ship Conditions"]
  ];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    let text = node.nodeValue;
    for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
    node.nodeValue = text;
  }
  for (const node of root.querySelectorAll("[data-station='watchmaster']")) node.dataset.station = "battlewatch";
}

function decorateEventBoard(app, element) {
  if (app?.id !== "arkflight-event-board") return;
  const root = rootElement(element, app);
  if (!root) return;
  setTimeout(() => {
    decorateEventStatus(root);
    decorateShipDerivedMasteries(root);
    replaceLegacyPlayerText(root);
    const complete = root.querySelector(".arkflight-event-complete-copy");
    if (complete) complete.textContent = "The Event has reached its conclusion. The bound ship carries Hull, Lifeveil, Strain, Morale, Ship Conditions, and other persistent Conditions forward; Momentum and Hazards remain Event state only.";
  }, 0);
}

Hooks.on("renderActorSheet", (app, html) => {
  const root = rootElement(html, app);
  if (!root?.querySelector?.(".arkflight-ship-shell")) return;
  setTimeout(() => decorateShipReadiness(app, root), 0);
});

Hooks.on("renderApplicationV2", (app, element) => decorateEventBoard(app, element));
