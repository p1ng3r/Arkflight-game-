import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { shipWeaponAttackBonus, weaponDamageProfile } from "../combat/index.js";
import { firingArcsVisible, redrawFiringArcs, toggleFiringArcs } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });
const OPEN_TABS = new Map();
let refreshQueued = false;

function esc(value) {
  const text = String(value ?? "");
  return globalThis.foundry?.utils?.escapeHTML ? foundry.utils.escapeHTML(text) : text;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value) {
  const number = Number(value ?? 0);
  return `${number >= 0 ? "+" : ""}${number}`;
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

function combatantForActor(actor) {
  return game.arkflight?.combat?.findCombatant?.(actor) ?? null;
}

function battlewatchActor(actor) {
  const reference = shipFlag(actor)?.crew?.stations?.battlewatch ?? null;
  if (!reference) return null;
  return game.actors?.get?.(reference)
    ?? game.actors?.contents?.find?.((entry) => entry.uuid === reference || entry.name === reference)
    ?? null;
}

function perceptionModifier(actor) {
  if (!actor) return null;
  const statistic = actor.getStatistic?.("perception") ?? actor.perception ?? null;
  for (const candidate of [statistic?.mod, statistic?.modifier, actor.system?.perception?.mod, actor.system?.attributes?.perception?.value]) {
    const number = Number(candidate);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function attackProfile(actor, weaponState) {
  const battlewatch = battlewatchActor(actor);
  const perception = perceptionModifier(battlewatch);
  const ship = shipFlag(actor);
  if (!ship || perception == null) return { battlewatch, perception, bonus: null };
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return {
    battlewatch,
    perception,
    bonus: shipWeaponAttackBonus({
      battlewatchPerception: perception,
      shipWeaponAttackBonus: derived.stats?.weaponAttackBonus ?? 0,
      install: { upgrades: weaponState?.upgrades ?? {} }
    })
  };
}

function targetProfile(combatant) {
  const actor = combatant?.actor;
  const ship = shipFlag(actor);
  if (!actor || !ship) return null;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return {
    name: combatant.name ?? actor.name,
    armorClass: Math.max(0, Number(derived.stats?.armorClass) || 0),
    hardness: Math.max(0, Number(derived.stats?.hardness) || 0),
    hull: Math.max(0, Number(ship.resources?.hull?.value) || 0),
    hullMax: Math.max(0, Number(ship.resources?.hull?.max ?? derived.stats?.hullIntegrity) || 0)
  };
}

function canvasTargetCombatant(targets) {
  const targetedIds = new Set([...(game.user?.targets ?? [])].map((token) => token?.document?.id ?? token?.id).filter(Boolean));
  return targets.find((entry) => targetedIds.has(entry.tokenId)) ?? null;
}

function targetOnCanvas(combatant) {
  const tokenObject = combatant?.token?.object;
  if (!tokenObject?.setTarget) return false;
  tokenObject.setTarget(true, { releaseOthers: true });
  return true;
}

function restoreHoldState(root) {
  root.querySelector(".arkflight-hold-log-shell")?.remove();
  for (const child of root.querySelectorAll('[data-hold-hidden="hold"]')) {
    child.hidden = false;
    delete child.dataset.holdHidden;
  }
  for (const child of root.querySelectorAll('[data-hold-hidden="already"]')) delete child.dataset.holdHidden;
}

function restoreWeaponsState(root) {
  root.querySelector(".arkflight-sheet-weapons-shell")?.remove();
  for (const child of root.querySelectorAll('[data-weapons-hidden="weapons"]')) {
    child.hidden = false;
    delete child.dataset.weaponsHidden;
  }
  for (const child of root.querySelectorAll('[data-weapons-hidden="already"]')) delete child.dataset.weaponsHidden;
  root.querySelectorAll(".arkflight-sheet-tabs button").forEach((entry) => entry.classList.remove("is-weapons-active"));
}

function restoreBaseSheet(root) {
  restoreHoldState(root);
  restoreWeaponsState(root);
}

function hideBaseSections(root) {
  for (const child of [...root.children]) {
    if (child.matches?.("header,.arkflight-sheet-tabs,.arkflight-readiness-banner,.arkflight-sheet-weapons-shell")) continue;
    child.dataset.weaponsHidden = child.hidden ? "already" : "weapons";
    child.hidden = true;
  }
}

function lastShotHtml(last) {
  if (!last?.result) return "";
  const { result, targetName, weaponName } = last;
  const damage = result.damage;
  return `<section class="arkflight-weapon-last-shot ${damage ? "is-hit" : "is-miss"}">
    <div class="arkflight-weapon-last-shot-title"><span>LAST SHOT</span><strong>${esc(weaponName)} → ${esc(targetName)}</strong></div>
    <div class="arkflight-weapon-result-grid">
      <div><span>Attack Roll</span><strong>${Number(result.attack?.total ?? 0)}</strong><small>${signed(result.attackBonus)} vs AC ${Number(result.ac ?? 0)}</small></div>
      <div><span>Result</span><strong>${esc(DEGREE_LABEL[result.degree] ?? "Resolved")}</strong><small>${damage ? "Hit" : "No Hull damage"}</small></div>
      ${damage ? `<div><span>Damage Roll</span><strong>${Number(damage.incoming ?? 0)}</strong><small>${esc(titleCase(damage.type))}</small></div>
      <div><span>Hardness</span><strong>−${Number(damage.absorbed ?? 0)}</strong><small>${Number(damage.hardness ?? 0)} structural Hardness</small></div>
      <div><span>Hull Damage</span><strong>${Number(damage.hullDamage ?? 0)}</strong><small>${Number(damage.before ?? 0)} → ${Number(damage.after ?? 0)}</small></div>` : ""}
    </div>
    <small class="arkflight-weapon-chat-note"><i class="fa-solid fa-message"></i> Attack result sent to Foundry Chat${damage ? "; damage dice posted as a separate roll." : "."}</small>
  </section>`;
}

async function postDamageRoll(actor, result, weaponName, targetName) {
  const damage = result?.damage;
  if (!damage?.roll?.toMessage) return;
  await damage.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>${esc(weaponName)} Damage — ${esc(targetName)}</strong><br>${Number(damage.incoming)} ${esc(titleCase(damage.type))} − ${Number(damage.absorbed)} Hardness = <strong>${Number(damage.hullDamage)} Hull</strong> (${Number(damage.before)} → ${Number(damage.after)})`
  });
}

function renderWeaponsTab(app, root, actor) {
  restoreBaseSheet(root);
  hideBaseSections(root);

  const nav = root.querySelector(".arkflight-sheet-tabs");
  nav?.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-active", "is-hold-active", "is-weapons-active"));
  const tabButton = nav?.querySelector("[data-arkflight-weapons-tab]");
  tabButton?.classList.add("is-active", "is-weapons-active");

  const shell = document.createElement("main");
  shell.className = "arkflight-sheet-weapons-shell";
  const station = document.createElement("section");
  station.className = "arkflight-weapon-station arkflight-weapon-station-sheet";
  shell.append(station);
  root.append(shell);
  OPEN_TABS.set(actor.uuid, { app, root, actor });

  const api = game.arkflight?.combat;
  const combatant = combatantForActor(actor);
  station.innerHTML = `<div class="arkflight-weapon-station-head">
    <div><span>BATTLEWATCH FIRE CONTROL</span><h3>Weapons</h3></div>
    <small>Choose a target, verify range and firing arc, then resolve the attack and damage from this vessel sheet.</small>
  </div>`;

  if (!api || !game.combat || !combatant) {
    station.insertAdjacentHTML("beforeend", `<div class="arkflight-weapon-offline"><i class="fa-solid fa-circle-xmark"></i><div><strong>Fire Control Offline</strong><span>Add ${esc(actor.name)} to Foundry combat to enable live range, firing arcs, target selection, attack rolls, and damage.</span></div></div>`);
    return;
  }

  const state = api.state?.(combatant);
  const targets = [...(api.targets?.(combatant) ?? [])];
  const weapons = Object.values(state?.weapons ?? {});
  const round = Math.max(1, Number(game.combat?.round ?? 1));

  const toolbar = document.createElement("div");
  toolbar.className = "arkflight-weapon-toolbar";
  toolbar.innerHTML = `<div class="arkflight-weapon-combat-state">
    <span>Round <strong>${round}</strong></span>
    <span>AP <strong>${state?.economy?.ap?.value ?? 0}/${state?.economy?.ap?.max ?? 0}</strong></span>
    <span>Heading <strong>${state?.mobility?.heading ?? 0}°</strong></span>
    <span>Battlewatch <strong>${esc(battlewatchActor(actor)?.name ?? "Unassigned")}</strong></span>
  </div>`;
  const toolbarActions = document.createElement("div");
  toolbarActions.className = "arkflight-weapon-toolbar-actions";
  const arcButton = document.createElement("button");
  arcButton.type = "button";
  const updateArcLabel = () => { arcButton.innerHTML = firingArcsVisible(combatant) ? '<i class="fa-solid fa-eye-slash"></i> Hide Arcs' : '<i class="fa-solid fa-eye"></i> Show Arcs'; };
  updateArcLabel();
  arcButton.addEventListener("click", () => { toggleFiringArcs(combatant); updateArcLabel(); });
  toolbarActions.append(arcButton);
  toolbar.append(toolbarActions);
  station.append(toolbar);

  station.insertAdjacentHTML("beforeend", `<div class="arkflight-weapon-arc-key"><span class="is-fore">Fore</span><span class="is-port">Port</span><span class="is-starboard">Starboard</span><span class="is-aft">Aft</span><small>Arcs are drawn from the ship token using current heading and each installed weapon's maximum range.</small></div>`);

  if (!weapons.length) {
    station.insertAdjacentHTML("beforeend", '<p class="arkflight-weapon-empty">No weapons are installed on this ship.</p>');
    return;
  }

  const targetBar = document.createElement("div");
  targetBar.className = "arkflight-weapon-target-lock";
  const targetLabel = document.createElement("label");
  targetLabel.innerHTML = '<span><i class="fa-solid fa-crosshairs"></i> Target</span>';
  const targetSelect = document.createElement("select");
  if (targets.length) targetSelect.innerHTML = targets.map((target) => `<option value="${target.id}">${esc(target.name)}</option>`).join("");
  else {
    targetSelect.innerHTML = '<option value="">No other Arkflight ships in combat</option>';
    targetSelect.disabled = true;
  }
  targetLabel.append(targetSelect);
  targetBar.append(targetLabel);

  const useCanvasTarget = document.createElement("button");
  useCanvasTarget.type = "button";
  useCanvasTarget.innerHTML = '<i class="fa-solid fa-bullseye"></i> Use Canvas Target';
  useCanvasTarget.disabled = !targets.length;
  targetBar.append(useCanvasTarget);
  station.append(targetBar);

  const initialTarget = targets.find((target) => target.id === app._arkflightWeaponTargetId)
    ?? canvasTargetCombatant(targets)
    ?? targets[0]
    ?? null;
  if (initialTarget) {
    targetSelect.value = initialTarget.id;
    app._arkflightWeaponTargetId = initialTarget.id;
  }

  const targetReadout = document.createElement("div");
  targetReadout.className = "arkflight-weapon-target-profile";
  station.append(targetReadout);

  if (app._arkflightLastWeaponResult) station.insertAdjacentHTML("beforeend", lastShotHtml(app._arkflightLastWeaponResult));

  const list = document.createElement("div");
  list.className = "arkflight-weapon-list";
  station.append(list);
  const updateRows = [];

  const updateTargetReadout = () => {
    const target = targets.find((entry) => entry.id === targetSelect.value) ?? null;
    if (!target) {
      targetReadout.innerHTML = '<span class="arkflight-weapon-empty">No target selected.</span>';
      return;
    }
    const profile = targetProfile(target);
    if (!profile) return;
    targetReadout.innerHTML = `<div><span>Target</span><strong>${esc(profile.name)}</strong></div><div><span>AC</span><strong>${profile.armorClass}</strong></div><div><span>Hardness</span><strong>${profile.hardness}</strong></div><div><span>Hull</span><strong>${profile.hull} / ${profile.hullMax}</strong></div>`;
  };

  for (const weaponState of weapons) {
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id] ?? null;
    if (!weapon) continue;
    const combat = weapon.data?.combat ?? {};
    const damage = weaponDamageProfile(weapon, { upgrades: weaponState.upgrades });
    const attack = attackProfile(actor, weaponState);
    const remaining = Math.max(0, Number(weaponState.readyRound ?? 0) - round);
    const row = document.createElement("article");
    row.className = "arkflight-weapon-control-row";
    row.innerHTML = `<div class="arkflight-weapon-identity"><strong>${esc(weaponState.name)}</strong><span>${titleCase(weaponState.mount ?? "fore")} Mount ${Number(weaponState.mountIndex ?? 0) + 1} · ${titleCase(combat.arcTemplate ?? "wide")} arc</span></div>
      <div class="arkflight-weapon-stats"><strong>Attack ${attack.bonus == null ? "—" : signed(attack.bonus)}</strong> · <strong>Damage ${esc(damage.dice ?? "—")} ${esc(titleCase(damage.type))}</strong> · ${Number(weaponState.fireAP ?? 1)} AP · Reload ${Number(weaponState.reloadRounds ?? 0)} · Range ${combat.rangeHexes?.min ?? "—"}/${combat.rangeHexes?.optimalMin ?? "—"}–${combat.rangeHexes?.optimalMax ?? "—"}/${combat.rangeHexes?.max ?? "—"}</div>
      <div class="arkflight-weapon-solution" data-weapon-solution>Choose a target.</div><div class="arkflight-weapon-row-actions"></div>`;

    const solutionNode = row.querySelector("[data-weapon-solution]");
    const actions = row.querySelector(".arkflight-weapon-row-actions");
    const fireButton = document.createElement("button");
    fireButton.type = "button";
    fireButton.className = "arkflight-weapon-fire";
    actions.append(fireButton);

    if (remaining > 0) {
      const workButton = document.createElement("button");
      workButton.type = "button";
      workButton.innerHTML = '<i class="fa-solid fa-rotate"></i> Work the Guns · 1 AP';
      workButton.disabled = !game.user?.isGM || Number(state?.economy?.ap?.value ?? 0) < 1;
      workButton.addEventListener("click", async () => {
        try {
          await api.workTheGuns(weaponState.key, combatant);
          renderWeaponsTab(app, root, actor);
        } catch (error) { ui.notifications?.error(error?.message ?? "Work the Guns failed."); }
      });
      actions.append(workButton);
    }

    const update = () => {
      const targetId = targetSelect.value;
      const enoughAP = Number(state?.economy?.ap?.value ?? 0) >= Number(weaponState.fireAP ?? 1);
      let legal = false;
      if (!targetId) {
        solutionNode.textContent = "No target selected.";
        solutionNode.className = "arkflight-weapon-solution is-illegal";
      } else {
        try {
          const solution = api.targetingSolution(weaponState.key, targetId, combatant);
          legal = Boolean(solution.legal);
          solutionNode.textContent = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "IN ARC" : `OUT OF ARC by ${Math.max(0, solution.arc.difference - solution.arc.halfWidth).toFixed(0)}°`}`;
          solutionNode.className = `arkflight-weapon-solution ${legal ? "is-legal" : "is-illegal"}`;
        } catch (error) {
          solutionNode.textContent = error?.message ?? "Target solution unavailable.";
          solutionNode.className = "arkflight-weapon-solution is-illegal";
        }
      }

      fireButton.disabled = !game.user?.isGM || attack.bonus == null || remaining > 0 || !enoughAP || !legal;
      if (!game.user?.isGM) fireButton.innerHTML = '<i class="fa-solid fa-lock"></i> GM Fire Control';
      else if (attack.bonus == null) fireButton.innerHTML = '<i class="fa-solid fa-user-xmark"></i> Assign Battlewatch';
      else if (remaining > 0) fireButton.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Reload ${remaining}`;
      else if (!enoughAP) fireButton.innerHTML = `<i class="fa-solid fa-bolt"></i> Need ${weaponState.fireAP} AP`;
      else if (!legal) fireButton.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Range / Arc';
      else fireButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Roll Attack &amp; Damage';
    };

    fireButton.addEventListener("click", async () => {
      const target = targets.find((entry) => entry.id === targetSelect.value);
      if (!target) return ui.notifications?.warn("Select a target ship first.");
      try {
        app._arkflightWeaponTargetId = target.id;
        const result = await api.fireAtTarget(weaponState.key, target.id, combatant);
        app._arkflightLastWeaponResult = { result, weaponName: weaponState.name, targetName: target.name };
        await postDamageRoll(actor, result, weaponState.name, target.name);
        redrawFiringArcs(combatant);
        renderWeaponsTab(app, root, actor);
      } catch (error) {
        console.error("Arkflight ship-sheet weapon fire failed", error);
        ui.notifications?.error(error?.message ?? "Weapon fire failed.");
      }
    });

    updateRows.push(update);
    list.append(row);
  }

  const refreshSolutions = () => {
    app._arkflightWeaponTargetId = targetSelect.value || null;
    const target = targets.find((entry) => entry.id === targetSelect.value) ?? null;
    if (target) targetOnCanvas(target);
    updateTargetReadout();
    updateRows.forEach((update) => update());
  };

  targetSelect.addEventListener("change", refreshSolutions);
  useCanvasTarget.addEventListener("click", () => {
    const target = canvasTargetCombatant(targets);
    if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first.");
    targetSelect.value = target.id;
    refreshSolutions();
  });

  refreshSolutions();
  if (firingArcsVisible(combatant)) redrawFiringArcs(combatant);
}

function attachWeaponsTab(app, html) {
  const actor = actorFrom(app);
  const root = rootFrom(app, html);
  if (!actor || !shipFlag(actor) || !root) return;
  const nav = root.querySelector(".arkflight-sheet-tabs");
  if (!nav || root.dataset.arkflightWeaponsTabAttached === "true") return;
  root.dataset.arkflightWeaponsTabAttached = "true";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-weapons-tab-button";
  button.dataset.arkflightWeaponsTab = "";
  button.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Weapons';
  nav.insertBefore(button, nav.querySelector('[data-tab="fittings"]') ?? nav.querySelector("[data-open-shipwright]") ?? null);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    app._arkflightWeaponsActive = true;
    renderWeaponsTab(app, root, actor);
  });

  for (const other of [...nav.querySelectorAll("[data-tab], [data-hold-tab]")]) {
    other.addEventListener("click", () => {
      app._arkflightWeaponsActive = false;
      OPEN_TABS.delete(actor.uuid);
      restoreWeaponsState(root);
    }, { capture: true });
  }

  if (app._arkflightWeaponsActive) requestAnimationFrame(() => renderWeaponsTab(app, root, actor));
}

function refreshOpenTabs() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    for (const [uuid, entry] of [...OPEN_TABS.entries()]) {
      if (!entry.root?.isConnected || !entry.app?._arkflightWeaponsActive) {
        OPEN_TABS.delete(uuid);
        continue;
      }
      renderWeaponsTab(entry.app, entry.root, entry.actor);
    }
  });
}

Hooks.on("renderActorSheet", attachWeaponsTab);
Hooks.on("renderApplicationV2", attachWeaponsTab);
Hooks.on("updateToken", refreshOpenTabs);
Hooks.on("updateCombatant", refreshOpenTabs);
Hooks.on("updateCombat", refreshOpenTabs);
