const MODULE_ID = "arkflight-game";
const OPEN_TABS = new Map();
const STATIONS = Object.freeze([
  ["captain", "Captain", "fa-solid fa-compass", "morale"],
  ["battlewatch", "Battlewatch", "fa-solid fa-crosshairs", "hull"],
  ["navigator", "Navigator", "fa-solid fa-route", "rigging"],
  ["engineer", "Engineer", "fa-solid fa-gears", "arkengine"],
  ["veilwarden", "Veilwarden", "fa-solid fa-shield-halved", "lifeveil"]
]);
let refreshQueued = false;

function esc(value) {
  const text = String(value ?? "");
  return globalThis.foundry?.utils?.escapeHTML ? foundry.utils.escapeHTML(text) : text;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorFrom(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function rootFrom(app, html = null) {
  const candidate = html?.[0] ?? html ?? app?.element?.[0] ?? app?.element;
  if (!(candidate instanceof HTMLElement)) return null;
  return candidate.matches?.(".arkflight-ship-shell") ? candidate : candidate.querySelector?.(".arkflight-ship-shell");
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function combatantFor(actor) {
  return game.arkflight?.combat?.findCombatant?.(actor) ?? null;
}

function crewName(api, combatant, station, actor) {
  const crew = api?.stationActor?.(combatant, station);
  if (crew) return crew.name;
  const ref = shipFlag(actor)?.crew?.stations?.[station];
  if (!ref) return "Unassigned";
  return game.actors?.get?.(ref)?.name
    ?? game.actors?.contents?.find?.((entry) => entry.uuid === ref || entry.name === ref)?.name
    ?? String(ref);
}

function restoreCombatState(root) {
  root.querySelector(".arkflight-combat-stations-shell")?.remove();
  for (const child of root.querySelectorAll('[data-combat-stations-hidden="combat"]')) {
    child.hidden = false;
    delete child.dataset.combatStationsHidden;
  }
  for (const child of root.querySelectorAll('[data-combat-stations-hidden="already"]')) delete child.dataset.combatStationsHidden;
  root.querySelectorAll(".arkflight-sheet-tabs button").forEach((entry) => entry.classList.remove("is-combat-stations-active"));
}

function hideBaseSections(root) {
  for (const child of [...root.children]) {
    if (child.matches?.("header,.arkflight-sheet-tabs,.arkflight-readiness-banner,.arkflight-combat-stations-shell")) continue;
    child.dataset.combatStationsHidden = child.hidden ? "already" : "combat";
    child.hidden = true;
  }
}

function choiceOptions(action, api, combatant, actor) {
  const rules = action.rules ?? {};
  if (rules.chooseStation) {
    return STATIONS.filter(([id]) => id !== action.station).map(([value, label]) => ({ value, label }));
  }
  if (rules.chooseTarget) {
    return [...(api.targets?.(combatant) ?? [])].map((target) => ({ value: target.id, label: target.name }));
  }
  if (Array.isArray(rules.choices)) return rules.choices.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseSystem) {
    return ["hull", "arkengine", "rigging", "lifeveil"].map((value) => ({ value, label: titleCase(value) }));
  }
  if (Array.isArray(rules.chooseFacing)) return rules.chooseFacing.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseFacing) return ["fore", "port", "starboard", "aft"].map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseAreaOrEnergy) {
    return ["hull", "arkengine", "rigging", "lifeveil", "morale", "fire", "cold", "electricity", "acid", "sonic", "force"]
      .map((value) => ({ value, label: titleCase(value) }));
  }
  if (rules.resolver === "purgeInterference") {
    return [...(shipFlag(actor)?.conditions ?? [])].map((entry, index) => ({
      value: String(index),
      label: typeof entry === "string" ? entry : entry?.name ?? entry?.id ?? `Condition ${index + 1}`
    }));
  }
  return [];
}

function costLabel(action) {
  if (action.rules?.costSource === "weapon.fireAP") return "Weapon AP";
  const parts = [];
  if (Number(action.cost?.ap) > 0) parts.push(`${action.cost.ap} AP`);
  if (Number(action.cost?.rp) > 0) parts.push(`${action.cost.rp} RP`);
  if (Number(action.rules?.strain) > 0) parts.push(`+${action.rules.strain} Strain`);
  return parts.join(" · ") || "—";
}

function unavailableLabel(reason) {
  return ({
    "station-unassigned": "Assign Crew",
    "not-this-ships-turn": "Wait for Turn",
    "insufficient-ap": "Not Enough AP",
    "insufficient-rp": "Not Enough RP",
    "once-per-round": "Used This Round",
    "reaction-readied": "Reaction Readied",
    "combatant-required": "Combat Offline"
  })[reason] ?? "Unavailable";
}

function routeToWeapons(root) {
  const button = root.querySelector("[data-arkflight-weapons-tab]");
  if (!button) return ui.notifications?.warn("The ship Weapons tab is not available on this sheet.");
  button.click();
}

function buildActionRow({ action, api, combatant, actor, root, rerender }) {
  const row = document.createElement("article");
  row.className = `arkflight-combat-action ${action.timing === "reaction" ? "is-reaction" : "is-action"}`;
  const choices = choiceOptions(action, api, combatant, actor);
  const availability = api.stationActionAvailability?.(action.id, combatant) ?? { ok: false, reason: "combatant-required" };
  const weaponRoute = ["fireAtTarget", "workTheGuns"].includes(action.rules?.resolver);

  row.innerHTML = `<div class="arkflight-combat-action-head">
      <div><span class="arkflight-combat-timing">${action.timing === "reaction" ? "REACTION" : "ACTION"}</span><strong>${esc(action.name)}</strong></div>
      <span class="arkflight-combat-cost">${esc(costLabel(action))}</span>
    </div>
    <p>${esc(action.description)}</p>`;

  let select = null;
  if (choices.length || action.rules?.chooseTarget || action.rules?.chooseSystem || action.rules?.chooseStation || action.rules?.chooseFacing || action.rules?.chooseAreaOrEnergy) {
    select = document.createElement("select");
    select.className = "arkflight-combat-action-choice";
    if (!choices.length) select.innerHTML = '<option value="">No valid choice available</option>';
    else select.innerHTML = choices.map((entry) => `<option value="${esc(entry.value)}">${esc(entry.label)}</option>`).join("");
    select.disabled = !choices.length;
    row.append(select);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-combat-action-use";
  if (weaponRoute) {
    button.innerHTML = action.rules?.resolver === "fireAtTarget"
      ? '<i class="fa-solid fa-crosshairs"></i> Open Fire Control'
      : '<i class="fa-solid fa-rotate"></i> Open Weapon Reloads';
    button.disabled = availability.reason === "station-unassigned";
  } else {
    const choiceRequired = Boolean(select && select.disabled);
    button.disabled = !availability.ok || choiceRequired || !game.user?.isGM;
    if (!game.user?.isGM) button.innerHTML = '<i class="fa-solid fa-lock"></i> GM Resolve';
    else if (!availability.ok) button.textContent = unavailableLabel(availability.reason);
    else if (action.timing === "reaction") button.innerHTML = '<i class="fa-solid fa-bolt"></i> Ready Reaction';
    else button.innerHTML = '<i class="fa-solid fa-play"></i> Use Action';
  }
  row.append(button);

  button.addEventListener("click", async () => {
    if (weaponRoute) return routeToWeapons(root);
    try {
      button.disabled = true;
      await api.stationAction(action.id, { selection: select?.value ?? null }, combatant);
      rerender();
    } catch (error) {
      console.error("Arkflight station combat action failed", error);
      ui.notifications?.error(error?.message ?? `${action.name} failed.`);
      button.disabled = false;
    }
  });
  return row;
}

export function renderArkflightCombatStations(app, root, actor) {
  const nativeHost = root.querySelector("[data-combat-stations-host]");
  if (nativeHost) nativeHost.replaceChildren();
  else {
    restoreCombatState(root);
    hideBaseSections(root);
  }

  const nav = root.querySelector(".arkflight-sheet-tabs");
  nav?.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-combat-stations-active"));
  nav?.querySelector('[data-tab="combat"]')?.classList.add("is-active", "is-combat-stations-active");

  const shell = document.createElement("main");
  shell.className = "arkflight-combat-stations-shell";
  (nativeHost ?? root).append(shell);
  OPEN_TABS.set(actor.uuid, { app, root, actor });

  const api = game.arkflight?.combat;
  const combatant = combatantFor(actor);
  shell.innerHTML = `<header class="arkflight-combat-stations-head"><div><span>ARKFLIGHT COMBAT CREW</span><h2>Station Actions</h2></div><p>Every station has four Actions and one Reaction. All five stations spend from the vessel's shared AP/RP economy.</p></header>`;

  if (!api || !game.combat || !combatant || !api.state?.(combatant)) {
    shell.insertAdjacentHTML("beforeend", `<div class="arkflight-combat-stations-offline"><i class="fa-solid fa-circle-xmark"></i><div><strong>Combat Stations Offline</strong><span>Add ${esc(actor.name)} to Foundry combat to activate station Actions and Reactions.</span></div></div>`);
    return;
  }

  const state = api.state(combatant);
  const round = Math.max(1, Number(game.combat?.round ?? 1));
  const activeTurn = game.combat?.combatant?.id === combatant.id;
  shell.insertAdjacentHTML("beforeend", `<div class="arkflight-combat-economy">
    <span>Round <strong>${round}</strong></span>
    <span class="${activeTurn ? "is-current" : ""}">${activeTurn ? "ACTIVE SHIP TURN" : "Waiting for ship turn"}</span>
    <span>AP <strong>${Number(state.economy?.ap?.value ?? 0)} / ${Number(state.economy?.ap?.max ?? 0)}</strong></span>
    <span>RP <strong>${Number(state.economy?.rp?.value ?? 0)} / ${Number(state.economy?.rp?.max ?? 0)}</strong></span>
    <span>Strain <strong>${Number(state.strain?.value ?? 0)} / ${Number(state.strain?.max ?? 0)}</strong></span>
  </div>`);

  const grid = document.createElement("section");
  grid.className = "arkflight-combat-station-grid";
  shell.append(grid);
  const rerender = () => renderArkflightCombatStations(app, root, actor);

  for (const [station, label, icon, area] of STATIONS) {
    const card = document.createElement("section");
    card.className = `arkflight-combat-station-card station-${station}`;
    const crew = crewName(api, combatant, station, actor);
    const areaState = shipFlag(actor)?.areas?.[area]?.state ?? "stable";
    const effects = api.stationEffects?.(combatant, station) ?? [];
    card.innerHTML = `<header><div class="arkflight-combat-station-title"><i class="${icon}"></i><div><span>${esc(label)}</span><strong>${esc(crew)}</strong></div></div><div class="arkflight-combat-area-state">${esc(titleCase(area))}: <strong>${esc(titleCase(areaState))}</strong></div></header>`;
    if (effects.length) {
      card.insertAdjacentHTML("beforeend", `<div class="arkflight-combat-active-effects"><span>ACTIVE</span>${effects.map((effect) => `<strong>${esc(effect.name)}${effect.selection ? ` · ${esc(titleCase(effect.selection))}` : ""}</strong>`).join("")}</div>`);
    }
    const actions = document.createElement("div");
    actions.className = "arkflight-combat-station-action-list";
    for (const action of api.stationActions?.(station) ?? []) {
      actions.append(buildActionRow({ action, api, combatant, actor, root, rerender }));
    }
    card.append(actions);
    grid.append(card);
  }
}

function refreshOpenTabs() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    for (const [uuid, entry] of [...OPEN_TABS.entries()]) {
      if (!entry.root?.isConnected || !entry.app?._arkflightCombatStationsActive) {
        OPEN_TABS.delete(uuid);
        continue;
      }
      renderCombatTab(entry.app, entry.root, entry.actor);
    }
  });
}

Hooks.on("updateCombatant", refreshOpenTabs);
Hooks.on("updateCombat", refreshOpenTabs);
Hooks.on("updateActor", refreshOpenTabs);
Hooks.on("arkflightStationActionResolved", refreshOpenTabs);
Hooks.on("arkflightStationActionsRefreshed", refreshOpenTabs);
