import { activeSystemFaults, systemIntegrity } from "../ship/system-damage.js";
import { faultDescription } from "../content/system-faults.js";
import { lifeveilCondition, moraleCondition, shipConditionProfile } from "../ship/ship-conditions.js";
import { SHIP_ABILITIES } from "../content/station-abilities.js";
import { normalizeAbilityLoadouts } from "../ship/ability-loadouts.js";
import { shipAbilityBonus, shipAbilityDC } from "../combat/ship-ability-rules.js";
const MODULE_ID = "arkflight-game";
const OPEN_TABS = new Map();
const STATIONS = Object.freeze([
  ["captain", "Captain", "fa-solid fa-compass", "morale"],
  ["battlewatch", "Battlewatch", "fa-solid fa-crosshairs", "hull"],
  ["navigator", "Navigator", "fa-solid fa-route", "drive"],
  ["engineer", "Engineer", "fa-solid fa-gears", "arkengine"],
  ["veilwarden", "Veilwarden", "fa-solid fa-shield-halved", "lifeveil"]
  , ["reactions", "Shared Reactions", "fa-solid fa-bolt", "hull"]
  , ["common", "Basic Ship Controls", "fa-solid fa-ship", "hull"]
]);
let refreshQueued = false;

function esc(value) {
  const text = String(value ?? "");
  return globalThis.foundry?.utils?.escapeHTML ? foundry.utils.escapeHTML(text) : text;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function stationConditionText(ship, system) {
  if (system === "lifeveil") {
    const condition = lifeveilCondition(ship?.resources?.lifeveil?.value ?? 0);
    return `Lifeveil: ${condition.label} (${condition.value}%)`;
  }
  if (system === "morale") {
    const condition = moraleCondition(ship?.resources?.morale?.value ?? 0);
    return `Morale: ${condition.label} (${condition.value}%)`;
  }
  if (["hull", "drive", "arkengine"].includes(system)) {
    const integrity = systemIntegrity(ship, system);
    return `${titleCase(system)}: ${integrity.label} (${Math.round(integrity.percent)}%)`;
  }
  const condition = shipConditionProfile(ship, system);
  if (system === "weapons") {
    const hull = shipConditionProfile(ship, "hull");
    return `Weapons: ${condition.label} · Hull: ${hull.label}`;
  }
  return `${titleCase(system)}: ${condition.label}`;
}

function combatantFor(actor) {
  return game.arkflight?.combat?.findCombatant?.(actor) ?? null;
}

function crewName(api, combatant, station, actor) {
  if (["common", "reactions"].includes(station)) return "Any ship crew player";
  const crew = api?.stationActor?.(combatant, station);
  if (crew) return crew.name;
  const ref = shipFlag(actor)?.crew?.stations?.[station];
  if (!ref) return "Unassigned";
  return game.actors?.get?.(ref)?.name
    ?? game.actors?.contents?.find?.((entry) => entry.uuid === ref || entry.name === ref)?.name
    ?? String(ref);
}

function choiceOptions(action, api, combatant, actor) {
  const rules = action.rules ?? {};
  if (rules.chooseStation) {
    return STATIONS.filter(([id]) => id !== action.station && !["common", "reactions"].includes(id)).map(([value, label]) => ({ value, label }));
  }
  if (rules.chooseWeapon) return Object.values(api.state(combatant)?.weapons ?? {}).filter(w => w.reloadRemaining > 0).map(w => ({ value: w.key, label: `${w.name} · Reload ${w.reloadRemaining}` }));
  if (rules.chooseTarget) {
    return [...(api.targets?.(combatant) ?? [])].map((target) => ({ value: target.id, label: target.name }));
  }
  if (Array.isArray(rules.choices)) return rules.choices.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseSystem) {
    return [...activeSystemFaults(shipFlag(actor)).map(f => ({ value: `fault:${f.id}`, label: `Patch ${f.name} (${faultDescription(f)})` })), ...["hull", "drive", "weapons", "lifeveil"].map((value) => ({ value, label: titleCase(value) }))];
  }
  if (Array.isArray(rules.chooseFacing)) return rules.chooseFacing.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseFacing) return ["fore", "port", "starboard", "aft"].map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseAreaOrEnergy) {
    return ["hull", "drive", "weapons", "lifeveil", "morale", "fire", "cold", "electricity", "acid", "sonic", "force"]
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
  for (const [key, label] of [["morale", "% Morale"], ["lifeveil", "% Lifeveil"], ["supplies", " Supplies"]]) if (action.rules?.[key]) parts.push(`${action.rules[key]}${label}`);
  return parts.join(" · ") || "—";
}

function unavailableLabel(reason) {
  return ({
    "station-unassigned": "Assign Crew",
    "not-this-ships-turn": "Wait for Turn",
    "insufficient-ap": "Not Enough AP",
    "insufficient-rp": "Not Enough RP",
    "hull-wrecked": "Hull Wrecked",
    "drive-disabled": "Drive Disabled",
    "arkengine-disabled": "Arkengine Disabled",
    "lifeveil-collapsed": "Lifeveil Collapsed",
    "morale-broken": "Morale Broken",
    "insufficient-morale": "Not Enough Morale",
    "crew-unassigned": "Assign Crew",
    "not-assigned-crew": "Assigned Crew Only",
    "once-per-round": "Used This Round",
    "reaction-readied": "Reaction Readied",
    "combatant-required": "Combat Offline",
    "not-your-station": "Assigned Crew Only",
    "not-ship-owner": "Ship Owner Only"
    , "ability-not-equipped": "Equip This Ability"
    , "requires-grapple": "Requires Grapple"
    , "once-per-battle": "Signature Used"
    , "cooldown": "Recovering"
    , "automatic-reload": "Automatic Reload"
  })[reason] ?? "Unavailable";
}

function routeToWeapons(root) {
  const button = root.querySelector('[data-tab="weapons"]');
  if (!button) return ui.notifications?.warn("The ship Weapons tab is not available on this sheet.");
  button.click();
}

function buildActionRow({ action, api, combatant, actor, root, rerender }) {
  const row = document.createElement("article");
  row.className = `arkflight-combat-action ${action.timing === "reaction" ? "is-reaction" : "is-action"}`;
  const choices = choiceOptions(action, api, combatant, actor);
  const availability = api.stationActionAvailability?.(action.id, combatant) ?? { ok: false, reason: "combatant-required" };
  const control = api.stationActionControl?.(action.id, combatant)
    ?? { ok: Boolean(game.user?.isGM), reason: game.user?.isGM ? null : "not-your-station" };
  const weaponRoute = action.rules?.resolver === "fireAtTarget";

  row.innerHTML = `<div class="arkflight-combat-action-head">
      <div><span class="arkflight-combat-timing">${esc(action.tier?.toUpperCase() ?? (action.timing === "reaction" ? "REACTION" : "BASIC"))}${action.timing === "reaction" ? " · REACTION" : ""}</span><strong>${esc(action.name)}</strong></div>
      <span class="arkflight-combat-cost">${esc(costLabel(action))}</span>
    </div>
    <p>${esc(action.description)}</p>`;
  if (action.outcomes) row.insertAdjacentHTML("beforeend", `<details><summary>Roll outcomes</summary>${["Critical Success", "Success", "Failure", "Critical Failure"].map((name, i) => `<p><strong>${name}:</strong> ${esc(action.outcomes[i])}</p>`).join("")}</details>`);
  if (availability.readyRound) row.insertAdjacentHTML("beforeend", `<p><strong>Ready in Round ${Number(availability.readyRound)}</strong></p>`);

  let select = null;
  if (choices.length || action.rules?.chooseWeapon || action.rules?.chooseTarget || action.rules?.chooseSystem || action.rules?.chooseStation || action.rules?.chooseFacing || action.rules?.chooseAreaOrEnergy) {
    select = document.createElement("select");
    select.className = "arkflight-combat-action-choice";
    if (!choices.length) select.innerHTML = '<option value="">No valid choice available</option>';
    else select.innerHTML = choices.map((entry) => `<option value="${esc(entry.value)}">${esc(entry.label)}</option>`).join("");
    select.disabled = !choices.length;
    row.append(select);
    if (action.rules?.multipleRoutes && Number(shipFlag(actor)?.progression?.level ?? 1) >= 10) {
      select.multiple = true; select.size = 3; select.options[0].selected = true;
      row.insertAdjacentHTML("beforeend", "<small>Choose up to two different routes.</small>");
    }
  }

  let push = null;
  if (action.rules?.ability) {
    const label = document.createElement("label");
    push = document.createElement("input"); push.type = "checkbox"; label.append(push);
    const station = action.rules.originStation ?? action.station;
    const resource = ({captain:"5% Morale",engineer:"1 Strain",navigator:"1 Supply",veilwarden:"5% Lifeveil",battlewatch:`${2*shipAbilityBonus(shipFlag(actor)?.progression?.level)} Hull`})[station] ?? "1 Strain";
    label.append(document.createTextNode(` Push It: +2 to check; ${resource} (double on critical failure)`)); row.append(label);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-combat-action-use";
  if (weaponRoute) {
    button.innerHTML = action.rules?.resolver === "fireAtTarget"
      ? '<i class="fa-solid fa-crosshairs"></i> Open Fire Control'
      : '<i class="fa-solid fa-burst"></i> Open Work the Guns';
    button.disabled = availability.reason === "station-unassigned";
  } else {
    const choiceRequired = Boolean(select && select.disabled);
    button.disabled = !control.ok || !availability.ok || choiceRequired;
    if (!control.ok) button.textContent = unavailableLabel(control.reason);
    else if (!availability.ok) button.textContent = unavailableLabel(availability.reason);
    else if (action.timing === "reaction") button.innerHTML = '<i class="fa-solid fa-bolt"></i> Ready Reaction';
    else button.innerHTML = '<i class="fa-solid fa-play"></i> Use Action';
  }
  row.append(button);

  button.addEventListener("click", async () => {
    if (weaponRoute) return routeToWeapons(root);
    try {
      button.disabled = true;
      const selection = select?.multiple ? [...select.selectedOptions].map(o => o.value) : select?.value ?? null;
      await api.stationAction(action.id, { selection, push: push?.checked ?? false }, combatant);
      rerender();
    } catch (error) {
      console.error("Arkflight station combat action failed", error);
      ui.notifications?.error(error?.message ?? `${action.name} failed.`);
      button.disabled = false;
    }
  });
  return row;
}

function renderAbilityLibrary(shell, actor, api, rerender) {
  const library = normalizeAbilityLoadouts(shipFlag(actor));
  const panel = document.createElement("details"); panel.className = "arkflight-ability-library";
  panel.innerHTML = `<summary>Ability Library · ${library.learningCredits} leveling choices banked</summary><p>Ship-owned abilities. Equip two Regular, one Surge and one Signature per station; choose four shared reactions. Loadouts are locked during combat.</p>`;
  const locked = Boolean(game.combat?.started && [...(game.combat.combatants ?? [])].some(c => c.actorId === actor.id));
  for (const [group, learned] of Object.entries(library.learned)) {
    const field = document.createElement("fieldset"), legend = document.createElement("legend"); legend.textContent = titleCase(group); field.append(legend);
    const inputs = [];
    for (const id of learned) {
      const a = SHIP_ABILITIES[id]; if (!a) continue;
      const label = document.createElement("label"), input = document.createElement("input"); input.type = "checkbox"; input.value = id;
      input.checked = library.equipped[group].includes(id); input.disabled = locked;
      label.append(input, document.createTextNode(` ${a.name} · ${a.tier}`)); field.append(label); inputs.push(input);
    }
    const save = document.createElement("button"); save.textContent = "Save Loadout"; save.type = "button"; save.disabled = locked || !api?.equipAbilities;
    save.addEventListener("click", async () => { try { save.disabled = true; await api.equipAbilities(actor, group, inputs.filter(i => i.checked).map(i => i.value)); rerender(); } catch(e) { ui.notifications.error(e.message); save.disabled = locked; } });
    field.append(save); panel.append(field);
  }
  const choices = Object.values(SHIP_ABILITIES).filter(a => a.station !== "common" && !library.learned[a.station]?.includes(a.id) && Number(a.rules.minLevel ?? 1) <= Number(shipFlag(actor)?.progression?.level ?? 1));
  for (const choice of choices) {
    const learn = document.createElement("button"); learn.type = "button"; learn.textContent = `Learn ${choice.name} · 1 leveling choice`; learn.disabled = locked || library.learningCredits < 1;
    learn.addEventListener("click", async () => { try { learn.disabled = true; await api.learnAbility(actor, choice.id); rerender(); } catch(e) { ui.notifications.error(e.message); } }); panel.append(learn);
  }
  if (!choices.length) panel.insertAdjacentHTML("beforeend", "<p>All current starter abilities are learned. Leveling choices remain banked for future ability additions.</p>");
  shell.append(panel);
}

export function renderArkflightCombatStations(app, root, actor) {
  const nativeHost = root.querySelector("[data-combat-stations-host]");
  if (!nativeHost) return false;
  nativeHost.replaceChildren();

  const nav = root.querySelector(".arkflight-sheet-tabs");
  nav?.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-combat-stations-active"));
  nav?.querySelector('[data-tab="combat"]')?.classList.add("is-active", "is-combat-stations-active");

  const shell = document.createElement("main");
  shell.className = "arkflight-combat-stations-shell";
  nativeHost.append(shell);
  OPEN_TABS.set(actor.uuid, { app, root, actor });

  const api = game.arkflight?.combat;
  const combatant = combatantFor(actor);
  shell.innerHTML = `<header class="arkflight-combat-stations-head"><div><span>ARKFLIGHT COMBAT CREW</span><h2>Station Abilities</h2></div><p>Two Regular, one Surge, one Signature per station. Shared reactions use RP; ship abilities use AP.</p></header>`;
  renderAbilityLibrary(shell, actor, api, () => renderArkflightCombatStations(app, root, actor));

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
    <span>Ship Bonus <strong>+${shipAbilityBonus(shipFlag(actor)?.progression?.level)}</strong> · Ability DC <strong>${shipAbilityDC(shipFlag(actor)?.progression?.level)}</strong></span>
  </div>`);

  const grid = document.createElement("section");
  grid.className = "arkflight-combat-station-grid";
  shell.append(grid);
  const rerender = () => renderArkflightCombatStations(app, root, actor);

  for (const [station, label, icon, area] of STATIONS) {
    const card = document.createElement("section");
    card.className = `arkflight-combat-station-card station-${station}`;
    const crew = crewName(api, combatant, station, actor);
    const conditionText = stationConditionText(shipFlag(actor), area);
    const effects = api.stationEffects?.(combatant, station) ?? [];
    card.innerHTML = `<header><div class="arkflight-combat-station-title"><i class="${icon}"></i><div><span>${esc(label)}</span><strong>${esc(crew)}</strong></div></div><div class="arkflight-combat-area-state"><strong>${esc(conditionText)}</strong></div></header>`;
    if (effects.length) {
      card.insertAdjacentHTML("beforeend", `<div class="arkflight-combat-active-effects"><span>ACTIVE</span>${effects.map((effect) => `<strong>${esc(effect.name)}${effect.selection ? ` · ${esc(titleCase(effect.selection))}` : ""}</strong>`).join("")}</div>`);
    }
    const actions = document.createElement("div");
    actions.className = "arkflight-combat-station-action-list";
    for (const action of api.stationActions?.(station, combatant) ?? []) {
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
      if (!entry.root?.isConnected || entry.app?.activeTab !== "combat") {
        OPEN_TABS.delete(uuid);
        continue;
      }
      entry.app.render?.({ force: true });
    }
  });
}

Hooks.on("updateCombatant", refreshOpenTabs);
Hooks.on("updateCombat", refreshOpenTabs);
Hooks.on("updateActor", refreshOpenTabs);
Hooks.on("arkflightStationActionResolved", refreshOpenTabs);
Hooks.on("arkflightStationActionsRefreshed", refreshOpenTabs);
