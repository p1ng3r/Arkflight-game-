import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { shipWeaponAttackBonus, weaponDamageProfile, weaponReloadRemaining } from "../combat/index.js";
import { firingArcsVisible, redrawFiringArcs, toggleFiringArcs } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";
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
  const targetedIds = new Set([...(game.user?.targets ?? [])]
    .map((token) => token?.document?.id ?? token?.id)
    .filter(Boolean));
  return targets.find((entry) => targetedIds.has(entry.tokenId)) ?? null;
}

function targetOnCanvas(combatant) {
  const object = combatant?.token?.object;
  if (!object?.setTarget) return false;
  object.setTarget(true, { releaseOthers: true });
  return true;
}

function permissionLabel(api, combatant) {
  const control = api?.stationActionControl?.("battlewatch-fire-weapon", combatant);
  if (control?.ok) return "Battlewatch control authorized";
  if (control?.reason === "station-unassigned") return "Assign Battlewatch";
  if (control?.reason === "not-your-station") return "View only — assigned Battlewatch crew controls weapons";
  return "View only";
}

async function postDamageRoll(actor, result, weaponName, targetName) {
  const damage = result?.damage;
  if (!damage?.roll?.toMessage) return;
  await damage.roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>${esc(weaponName)} Damage — ${esc(targetName)}</strong><br>${Number(damage.incoming)} ${esc(titleCase(damage.type))} − ${Number(damage.absorbed)} Hardness = <strong>${Number(damage.hullDamage)} Hull</strong> (${Number(damage.before)} → ${Number(damage.after)})`
  });
}

function lastShotHtml(last) {
  if (!last?.result || last.result.requested) return "";
  const { result, targetName, weaponName } = last;
  const damage = result.damage;
  return `<section class="arkflight-weapon-last-shot ${damage ? "is-hit" : "is-miss"}">
    <div class="arkflight-weapon-last-shot-title"><span>LAST SHOT</span><strong>${esc(weaponName)} → ${esc(targetName)}</strong></div>
    <div class="arkflight-weapon-result-grid">
      <div><span>Attack Roll</span><strong>${Number(result.attack?.total ?? 0)}</strong><small>${signed(result.attackBonus)} vs AC ${Number(result.ac ?? 0)}</small></div>
      <div><span>Result</span><strong>${esc(({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" })[result.degree] ?? "Resolved")}</strong><small>${damage ? "Hit" : "No Hull damage"}</small></div>
      ${damage ? `<div><span>Damage Roll</span><strong>${Number(damage.incoming ?? 0)}</strong><small>${esc(titleCase(damage.type))}</small></div>
      <div><span>Hardness</span><strong>−${Number(damage.absorbed ?? 0)}</strong><small>Structural reduction</small></div>
      <div><span>Hull Damage</span><strong>${Number(damage.hullDamage ?? 0)}</strong><small>${Number(damage.before ?? 0)} → ${Number(damage.after ?? 0)}</small></div>` : ""}
    </div>
  </section>`;
}

export function renderArkflightWeaponsTab(app, root, actor) {
  const host = root.querySelector("[data-weapons-host]");
  if (!host) return false;
  host.replaceChildren();
  OPEN_TABS.set(actor.uuid, { app, root, actor });

  const api = game.arkflight?.combat;
  const combatant = combatantForActor(actor);
  const shell = document.createElement("main");
  shell.className = "arkflight-sheet-weapons-shell arkflight-native-weapons";
  host.append(shell);

  shell.innerHTML = `<section class="arkflight-weapon-station arkflight-weapon-station-sheet">
    <div class="arkflight-weapon-station-head">
      <div><span>BATTLEWATCH FIRE CONTROL</span><h3>Weapons</h3></div>
      <small>Ship Owners may Reload for 1 AP. Battlewatch controls firing and may use Work the Guns as a once-per-round special action.</small>
    </div>
  </section>`;
  const station = shell.querySelector(".arkflight-weapon-station");

  if (!api || !game.combat || !combatant || !api.state?.(combatant)) {
    station.insertAdjacentHTML("beforeend", `<div class="arkflight-weapon-offline"><i class="fa-solid fa-circle-xmark"></i><div><strong>Fire Control Offline</strong><span>Add ${esc(actor.name)} to Foundry combat to enable live range, arcs, attacks, and reload control.</span></div></div>`);
    return true;
  }

  const state = api.state(combatant);
  const targets = [...(api.targets?.(combatant) ?? [])];
  const weapons = Object.values(state?.weapons ?? {});
  const round = Math.max(1, Number(game.combat?.round ?? 1));
  const battlewatchControl = api.stationActionControl?.("battlewatch-fire-weapon", combatant) ?? { ok: Boolean(game.user?.isGM) };
  const reloadControl = api.stationActionControl?.("common-reload-weapon", combatant) ?? { ok: Boolean(game.user?.isGM) };
  const reloadAvailability = api.stationActionAvailability?.("common-reload-weapon", combatant) ?? { ok: true };
  const workGunsControl = api.stationActionControl?.("battlewatch-reload-weapon", combatant) ?? battlewatchControl;
  const workGunsAvailability = api.stationActionAvailability?.("battlewatch-reload-weapon", combatant) ?? { ok: true };

  station.insertAdjacentHTML("beforeend", `<div class="arkflight-weapon-toolbar">
    <div class="arkflight-weapon-combat-state">
      <span>Round <strong>${round}</strong></span>
      <span>AP <strong>${state?.economy?.ap?.value ?? 0}/${state?.economy?.ap?.max ?? 0}</strong></span>
      <span>Heading <strong>${state?.mobility?.heading ?? 0}°</strong></span>
      <span>Battlewatch <strong>${esc(battlewatchActor(actor)?.name ?? "Unassigned")}</strong></span>
      <span class="${battlewatchControl.ok ? "is-authorized" : "is-view-only"}">${esc(permissionLabel(api, combatant))}</span>
    </div>
    <div class="arkflight-weapon-toolbar-actions"><button type="button" data-native-weapon-arcs></button></div>
  </div>
  <div class="arkflight-weapon-arc-key"><span class="is-fore">Fore</span><span class="is-port">Port</span><span class="is-starboard">Starboard</span><span class="is-aft">Aft</span><small>Arc display is informational and may be viewed by any player.</small></div>`);

  const arcButton = station.querySelector("[data-native-weapon-arcs]");
  const updateArcLabel = () => {
    arcButton.innerHTML = firingArcsVisible(combatant)
      ? '<i class="fa-solid fa-eye-slash"></i> Hide Arcs'
      : '<i class="fa-solid fa-eye"></i> Show Arcs';
  };
  updateArcLabel();
  arcButton.addEventListener("click", () => {
    toggleFiringArcs(combatant);
    updateArcLabel();
  });

  if (!weapons.length) {
    station.insertAdjacentHTML("beforeend", '<p class="arkflight-weapon-empty">No weapons are installed on this ship.</p>');
    return true;
  }

  const targetBar = document.createElement("div");
  targetBar.className = "arkflight-weapon-target-lock";
  targetBar.innerHTML = `<label><span><i class="fa-solid fa-crosshairs"></i> Target</span><select data-native-weapon-target></select></label>
    <button type="button" data-native-canvas-target><i class="fa-solid fa-bullseye"></i> Use Canvas Target</button>`;
  station.append(targetBar);

  const targetSelect = targetBar.querySelector("[data-native-weapon-target]");
  const canvasTargetButton = targetBar.querySelector("[data-native-canvas-target]");
  if (targets.length) targetSelect.innerHTML = targets.map((target) => `<option value="${target.id}">${esc(target.name)}</option>`).join("");
  else {
    targetSelect.innerHTML = '<option value="">No other Arkflight ships in combat</option>';
    targetSelect.disabled = true;
    canvasTargetButton.disabled = true;
  }

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
  const rowUpdates = [];

  for (const weaponState of weapons) {
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id];
    if (!weapon) continue;
    const combat = weapon.data?.combat ?? {};
    const damage = weaponDamageProfile(weapon, { upgrades: weaponState.upgrades });
    const attack = attackProfile(actor, weaponState);
    const remaining = weaponReloadRemaining(weaponState);
    const row = document.createElement("article");
    row.className = "arkflight-weapon-control-row";
    row.innerHTML = `<div class="arkflight-weapon-identity"><strong>${esc(weaponState.name)}</strong><span>${titleCase(weaponState.mount ?? "fore")} Mount ${Number(weaponState.mountIndex ?? 0) + 1} · ${titleCase(combat.arcTemplate ?? "wide")} arc</span></div>
      <div class="arkflight-weapon-stats"><strong>Attack ${attack.bonus == null ? "—" : signed(attack.bonus)}</strong> · <strong>Damage ${esc(damage.dice ?? "—")} ${esc(titleCase(damage.type))}</strong> · 1 AP · Reload ${Number(weaponState.reloadRounds ?? 0)} · Range ${combat.rangeHexes?.min ?? "—"}/${combat.rangeHexes?.optimalMin ?? "—"}–${combat.rangeHexes?.optimalMax ?? "—"}/${combat.rangeHexes?.max ?? "—"}</div>
      <div class="arkflight-weapon-solution" data-native-weapon-solution>Choose a target.</div>
      <div class="arkflight-weapon-row-actions"></div>`;

    const solutionNode = row.querySelector("[data-native-weapon-solution]");
    const actions = row.querySelector(".arkflight-weapon-row-actions");
    const fireButton = document.createElement("button");
    fireButton.type = "button";
    fireButton.className = "arkflight-weapon-fire";
    actions.append(fireButton);

    let reloadButton = null;
    let workGunsButton = null;
    if (remaining > 0) {
      reloadButton = document.createElement("button");
      reloadButton.type = "button";
      reloadButton.innerHTML = '<i class="fa-solid fa-rotate"></i> Reload · 1 AP';
      reloadButton.title = "Common action: reduce this weapon's remaining Reload by 1.";
      reloadButton.addEventListener("click", async () => {
        try {
          reloadButton.disabled = true;
          await api.stationAction("common-reload-weapon", { weaponKey: weaponState.key, selection: weaponState.key }, combatant);
          app.render?.({ force: true });
        } catch (error) {
          ui.notifications?.error(error?.message ?? "Reload failed.");
          reloadButton.disabled = false;
        }
      });
      actions.append(reloadButton);

      if (remaining <= 2) {
        workGunsButton = document.createElement("button");
        workGunsButton.type = "button";
        workGunsButton.innerHTML = '<i class="fa-solid fa-burst"></i> Work the Guns · 20% Morale · +1 Strain';
        workGunsButton.title = "Battlewatch, once per round: immediately ready this weapon for 0 AP.";
        workGunsButton.addEventListener("click", async () => {
          try {
            workGunsButton.disabled = true;
            await api.stationAction("battlewatch-reload-weapon", { weaponKey: weaponState.key, selection: weaponState.key }, combatant);
            app.render?.({ force: true });
          } catch (error) {
            ui.notifications?.error(error?.message ?? "Work the Guns failed.");
            workGunsButton.disabled = false;
          }
        });
        actions.append(workGunsButton);
      }
    }

    const update = () => {
      const targetId = targetSelect.value;
      const enoughAP = Number(state?.economy?.ap?.value ?? 0) >= 1;
      let legal = false;
      if (!targetId) {
        solutionNode.textContent = "No target selected.";
        solutionNode.className = "arkflight-weapon-solution is-illegal";
      } else {
        try {
          const solution = api.targetingSolution(weaponState.key, targetId, combatant);
          legal = Boolean(solution.legal);
          solutionNode.textContent = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "IN ARC" : "OUT OF ARC"}`;
          solutionNode.className = `arkflight-weapon-solution ${legal ? "is-legal" : "is-illegal"}`;
        } catch (error) {
          solutionNode.textContent = error?.message ?? "Target solution unavailable.";
          solutionNode.className = "arkflight-weapon-solution is-illegal";
        }
      }

      fireButton.disabled = !battlewatchControl.ok || attack.bonus == null || remaining > 0 || !enoughAP || !legal;
      if (!battlewatchControl.ok) fireButton.innerHTML = '<i class="fa-solid fa-eye"></i> Battlewatch Only';
      else if (attack.bonus == null) fireButton.innerHTML = '<i class="fa-solid fa-user-xmark"></i> Assign Battlewatch';
      else if (remaining > 0) fireButton.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Reload ${remaining}`;
      else if (!enoughAP) fireButton.innerHTML = '<i class="fa-solid fa-bolt"></i> Need 1 AP';
      else if (!legal) fireButton.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Range / Arc';
      else fireButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Roll Attack &amp; Damage';

      if (reloadButton) {
        reloadButton.disabled = !reloadControl.ok || !reloadAvailability.ok || Number(state?.economy?.ap?.value ?? 0) < 1;
        if (!reloadControl.ok) reloadButton.title = "Reload is available to Users with OWNER permission on this ship.";
        else if (!reloadAvailability.ok) reloadButton.title = `Reload unavailable: ${reloadAvailability.reason ?? "unavailable"}.`;
      }
      if (workGunsButton) {
        workGunsButton.disabled = !workGunsControl.ok || !workGunsAvailability.ok;
        if (!workGunsControl.ok) workGunsButton.title = "Only the assigned Battlewatch player or GM may use Work the Guns.";
        else if (!workGunsAvailability.ok) workGunsButton.title = `Work the Guns unavailable: ${workGunsAvailability.reason ?? "unavailable"}.`;
      }
    };

    fireButton.addEventListener("click", async () => {
      const target = targets.find((entry) => entry.id === targetSelect.value);
      if (!target) return ui.notifications?.warn("Select a target ship first.");
      try {
        fireButton.disabled = true;
        app._arkflightWeaponTargetId = target.id;
        const result = await api.stationAction("battlewatch-fire-weapon", {
          weaponKey: weaponState.key,
          targetId: target.id,
          selection: target.id
        }, combatant);
        if (result && !result.requested) {
          app._arkflightLastWeaponResult = { result, weaponName: weaponState.name, targetName: target.name };
          await postDamageRoll(actor, result, weaponState.name, target.name);
        }
        redrawFiringArcs(combatant);
        app.render?.({ force: true });
      } catch (error) {
        console.error("Arkflight native ship Weapons tab fire failed", error);
        ui.notifications?.error(error?.message ?? "Weapon fire failed.");
        fireButton.disabled = false;
      }
    });

    rowUpdates.push(update);
    list.append(row);
  }

  const refresh = () => {
    app._arkflightWeaponTargetId = targetSelect.value || null;
    const target = targets.find((entry) => entry.id === targetSelect.value) ?? null;
    if (target) targetOnCanvas(target);
    const profile = target ? targetProfile(target) : null;
    targetReadout.innerHTML = profile
      ? `<div><span>Target</span><strong>${esc(profile.name)}</strong></div><div><span>AC</span><strong>${profile.armorClass}</strong></div><div><span>Hardness</span><strong>${profile.hardness}</strong></div><div><span>Hull</span><strong>${profile.hull} / ${profile.hullMax}</strong></div>`
      : '<span class="arkflight-weapon-empty">No target selected.</span>';
    rowUpdates.forEach((update) => update());
  };

  targetSelect.addEventListener("change", refresh);
  canvasTargetButton.addEventListener("click", () => {
    const target = canvasTargetCombatant(targets);
    if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first.");
    targetSelect.value = target.id;
    refresh();
  });

  refresh();
  if (firingArcsVisible(combatant)) redrawFiringArcs(combatant);
  return true;
}

function refreshOpenTabs() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    for (const [uuid, entry] of [...OPEN_TABS.entries()]) {
      if (!entry.root?.isConnected || entry.app?.activeTab !== "weapons") {
        OPEN_TABS.delete(uuid);
        continue;
      }
      entry.app.render?.({ force: true });
    }
  });
}

for (const hook of ["updateCombatant", "updateCombat", "updateActor", "targetToken", "arkflightStationActionResolved", "arkflightStationActionsRefreshed"]) {
  Hooks.on(hook, refreshOpenTabs);
}
