import { SHIP_CATALOGS } from "../content/index.js";
import { weaponArcCheck } from "../combat/weapon-targeting.js";
import { weaponReloadRemaining } from "../combat/index.js";

const MODULE_ID = "arkflight-game";
const DEG_TO_RAD = Math.PI / 180;
const ARC_VISIBLE = new Set();
const ARC_GRAPHICS = new Map();
const ARC_WEAPON_KEYS = new Map();
const ARC_FILL_ALPHA = 0.16;
const ARC_STROKE_ALPHA = 0.92;
const ARC_STROKE_WIDTH = 3;
const MOUNT_COLORS = Object.freeze({
  fore: 0x8bd5e2,
  starboard: 0xd7b16b,
  aft: 0xc6756c,
  port: 0x9b8fd6,
  deck: 0xe8edf2
});
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

function rootElement(app, html = null) {
  if (html?.querySelector) return html;
  if (html?.[0]?.querySelector) return html[0];
  const element = app?.element;
  if (element?.querySelector) return element;
  if (element?.[0]?.querySelector) return element[0];
  return null;
}

function esc(value) {
  const text = String(value ?? "");
  return globalThis.foundry?.utils?.escapeHTML ? foundry.utils.escapeHTML(text) : text;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stationActionBlockerLabel(reason) {
  const labels = {
    "not-this-ships-turn": "Not this ship's turn",
    "insufficient-ap": "Need 1 AP",
    "insufficient-supplies": "Need 1 Supply",
    "insufficient-morale": "Need 20% Morale",
    "once-per-round": "Used this round",
    "crew-unassigned": "No crew assigned",
    "not-assigned-crew": "Assigned crew only",
    "not-ship-owner": "Ship owner only",
    "station-unassigned": "Battlewatch unassigned",
    "not-your-station": "Battlewatch only",
    "missing-state-or-action": "Combat state unavailable"
  };
  return labels[reason] ?? titleCase(reason || "Unavailable");
}

function isArkflightShip(actor) {
  return Boolean(actor?.flags?.[MODULE_ID]?.ship);
}

function displayedCombatant() {
  const api = game.arkflight?.combat;
  const current = game.combat?.combatant ?? null;
  if (api?.isArkflightCombatant?.(current)) return current;
  return [...(game.combat?.combatants ?? [])].find((entry) => api?.isArkflightCombatant?.(entry)) ?? null;
}

function combatantForActor(actor) {
  return game.arkflight?.combat?.findCombatant?.(actor) ?? null;
}

function tokenCenter(combatant) {
  const objectCenter = combatant?.token?.object?.center;
  if (objectCenter) return { x: Number(objectCenter.x), y: Number(objectCenter.y) };
  const token = combatant?.token;
  const gridSize = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return {
    x: Number(token?.x ?? 0) + Number(token?.width ?? 1) * gridSize / 2,
    y: Number(token?.y ?? 0) + Number(token?.height ?? 1) * gridSize / 2
  };
}

function graphicsLayer() {
  return canvas?.interface ?? canvas?.controls ?? canvas?.stage ?? null;
}

function removeArcGraphics(combatantId) {
  const graphics = ARC_GRAPHICS.get(combatantId);
  if (!graphics) return;
  try { graphics.parent?.removeChild?.(graphics); } catch (_error) { /* visual cleanup only */ }
  try { graphics.destroy?.({ children: true }); } catch (_error) { /* visual cleanup only */ }
  ARC_GRAPHICS.delete(combatantId);
}

function clearArcGraphics() {
  for (const id of [...ARC_GRAPHICS.keys()]) removeArcGraphics(id);
}

function drawSector(graphics, { x, y, radius, center, halfWidth, color }) {
  if (!(radius > 0)) return;
  const start = (center - halfWidth - 90) * DEG_TO_RAD;
  const end = (center + halfWidth - 90) * DEG_TO_RAD;
  const modern = typeof graphics.fill === "function" && typeof graphics.stroke === "function";

  if (modern) {
    if (halfWidth >= 179.5 && typeof graphics.circle === "function") {
      graphics.circle(x, y, radius);
    } else {
      graphics.moveTo(x, y);
      graphics.arc(x, y, radius, start, end);
      graphics.lineTo(x, y);
      graphics.closePath?.();
    }
    graphics.fill({ color, alpha: ARC_FILL_ALPHA });
    graphics.stroke({ color, width: ARC_STROKE_WIDTH, alpha: ARC_STROKE_ALPHA });
    return;
  }

  graphics.lineStyle?.(ARC_STROKE_WIDTH, color, ARC_STROKE_ALPHA);
  graphics.beginFill?.(color, ARC_FILL_ALPHA);
  if (halfWidth >= 179.5 && typeof graphics.drawCircle === "function") graphics.drawCircle(x, y, radius);
  else {
    graphics.moveTo?.(x, y);
    graphics.arc?.(x, y, radius, start, end);
    graphics.lineTo?.(x, y);
  }
  graphics.endFill?.();
}

function combatWeaponKeys(combatant) {
  const state = game.arkflight?.combat?.state?.(combatant);
  return Object.values(state?.weapons ?? {}).map((weaponState) => weaponState.key).filter(Boolean);
}

export function firingArcsVisible(combatant) {
  return Boolean(combatant?.id && ARC_VISIBLE.has(combatant.id));
}

export function firingArcWeaponVisible(combatant, weaponKey) {
  if (!combatant?.id || !weaponKey || !ARC_VISIBLE.has(combatant.id)) return false;
  const selected = ARC_WEAPON_KEYS.get(combatant.id);
  return !selected || selected.has(weaponKey);
}

export function redrawFiringArcs(combatant) {
  if (!combatant?.id) return false;
  removeArcGraphics(combatant.id);
  if (!ARC_VISIBLE.has(combatant.id)) return false;

  const api = game.arkflight?.combat;
  const state = api?.state?.(combatant);
  const layer = graphicsLayer();
  const GraphicsClass = globalThis.PIXI?.Graphics;
  if (!state || !layer?.addChild || !GraphicsClass) return false;

  const center = tokenCenter(combatant);
  const pixelsPerHex = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  const graphics = new GraphicsClass();
  graphics.eventMode = "none";
  graphics.label = `Arkflight firing arcs — ${combatant.name ?? combatant.id}`;
  graphics.zIndex = 5;

  const selectedWeaponKeys = ARC_WEAPON_KEYS.get(combatant.id);
  for (const weaponState of Object.values(state.weapons ?? {})) {
    if (selectedWeaponKeys && !selectedWeaponKeys.has(weaponState.key)) continue;
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id];
    const combat = weapon?.data?.combat;
    const maxRange = Math.max(0, Number(combat?.rangeHexes?.max) || 0);
    if (!combat || maxRange <= 0) continue;
    const arc = weaponArcCheck({
      heading: state.mobility?.heading ?? 0,
      mount: weaponState.mount ?? "fore",
      arcTemplate: combat.arcTemplate ?? "wide",
      bearing: 0
    });
    drawSector(graphics, {
      ...center,
      radius: maxRange * pixelsPerHex,
      center: arc.center,
      halfWidth: arc.halfWidth,
      color: MOUNT_COLORS[weaponState.mount] ?? MOUNT_COLORS.fore
    });
  }

  layer.addChild(graphics);
  ARC_GRAPHICS.set(combatant.id, graphics);
  return true;
}

export function setFiringArcsVisible(combatant, visible) {
  if (!combatant?.id) return false;
  if (visible) {
    ARC_VISIBLE.add(combatant.id);
    ARC_WEAPON_KEYS.delete(combatant.id);
  } else {
    ARC_VISIBLE.delete(combatant.id);
    ARC_WEAPON_KEYS.delete(combatant.id);
  }
  return redrawFiringArcs(combatant);
}

export function setWeaponFiringArcVisible(combatant, weaponKey, visible) {
  if (!combatant?.id || !weaponKey) return false;
  const allKeys = combatWeaponKeys(combatant);
  if (!allKeys.includes(weaponKey)) return false;

  let selected = ARC_WEAPON_KEYS.get(combatant.id);
  if (!selected) {
    selected = ARC_VISIBLE.has(combatant.id) ? new Set(allKeys) : new Set();
    ARC_WEAPON_KEYS.set(combatant.id, selected);
  }

  if (visible) selected.add(weaponKey);
  else selected.delete(weaponKey);

  if (selected.size > 0) ARC_VISIBLE.add(combatant.id);
  else ARC_VISIBLE.delete(combatant.id);

  return redrawFiringArcs(combatant);
}

export function toggleWeaponFiringArc(combatant, weaponKey) {
  const next = !firingArcWeaponVisible(combatant, weaponKey);
  setWeaponFiringArcVisible(combatant, weaponKey, next);
  return next;
}

export function toggleFiringArcs(combatant) {
  const next = !firingArcsVisible(combatant);
  setFiringArcsVisible(combatant, next);
  return next;
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

function weaponStatText(weaponState, weapon) {
  const combat = weapon?.data?.combat ?? {};
  const range = combat.rangeHexes ?? {};
  const damage = weapon?.data?.damageProfile ?? {};
  return `${damage.dice ?? "—"} ${titleCase(damage.type)} · 1 AP · Reload ${weaponState.reloadRounds ?? 0} · Range ${range.min ?? "—"} / ${range.optimalMin ?? "—"}–${range.optimalMax ?? "—"} / ${range.max ?? "—"}`;
}

function notifyFireResult(result, targetName, weaponName) {
  if (result?.damage) {
    ui.notifications?.info(`${weaponName} hit ${targetName}: ${result.damage.hullDamage} Hull damage applied after ${result.damage.absorbed} Hardness.`);
    return;
  }
  ui.notifications?.info(`${weaponName}: ${DEGREE_LABEL[result?.degree] ?? "Attack resolved"}; no Hull damage applied.`);
}

function buildShipWeaponStation(app, actor) {
  const section = document.createElement("section");
  section.className = "arkflight-weapon-station";
  const api = game.arkflight?.combat;
  const combatant = combatantForActor(actor);

  section.innerHTML = `
    <div class="arkflight-weapon-station-head">
      <div><span>BATTLEWATCH FIRE CONTROL</span><h3>Weapons Station</h3></div>
      <small>Targeting, range, firing arcs, attack rolls, Hardness, and Hull damage resolve from the live combat state.</small>
    </div>`;

  if (!api || !game.combat || !combatant) {
    section.insertAdjacentHTML("beforeend", `<div class="arkflight-weapon-offline"><i class="fa-solid fa-circle-xmark"></i><div><strong>Fire Control Offline</strong><span>Add ${esc(actor.name)} to Foundry combat to select targets and fire installed weapons.</span></div></div>`);
    return section;
  }

  const state = api.state?.(combatant);
  const targets = [...(api.targets?.(combatant) ?? [])];
  const weapons = Object.values(state?.weapons ?? {});
  const round = Math.max(1, Number(game.combat?.round ?? 1));
  const toolbar = document.createElement("div");
  toolbar.className = "arkflight-weapon-toolbar";
  toolbar.innerHTML = `<div class="arkflight-weapon-combat-state"><span>Round <strong>${round}</strong></span><span>AP <strong>${state?.economy?.ap?.value ?? 0}/${state?.economy?.ap?.max ?? 0}</strong></span><span>Heading <strong>${state?.mobility?.heading ?? 0}°</strong></span></div>`;

  const controls = document.createElement("div");
  controls.className = "arkflight-weapon-toolbar-actions";
  const arcButton = document.createElement("button");
  arcButton.type = "button";
  arcButton.dataset.arkflightFiringArcs = "true";
  const setArcLabel = () => { arcButton.innerHTML = firingArcsVisible(combatant) ? '<i class="fa-solid fa-eye-slash"></i> Hide Firing Arcs' : '<i class="fa-solid fa-eye"></i> Show Firing Arcs'; };
  setArcLabel();
  arcButton.addEventListener("click", () => { toggleFiringArcs(combatant); setArcLabel(); });
  controls.append(arcButton);
  toolbar.append(controls);
  section.append(toolbar);

  if (!weapons.length) {
    section.insertAdjacentHTML("beforeend", '<p class="arkflight-weapon-empty">No weapons are installed on this ship.</p>');
    return section;
  }

  const targetBar = document.createElement("div");
  targetBar.className = "arkflight-weapon-target-lock";
  const targetLabel = document.createElement("label");
  targetLabel.innerHTML = '<span><i class="fa-solid fa-crosshairs"></i> Target Lock</span>';
  const targetSelect = document.createElement("select");
  targetSelect.dataset.arkflightTargetLock = "true";
  if (targets.length) targetSelect.innerHTML = targets.map((target) => `<option value="${target.id}">${esc(target.name)}</option>`).join("");
  else {
    targetSelect.innerHTML = '<option value="">No target ships in combat</option>';
    targetSelect.disabled = true;
  }
  targetLabel.append(targetSelect);
  targetBar.append(targetLabel);

  const canvasTargetButton = document.createElement("button");
  canvasTargetButton.type = "button";
  canvasTargetButton.innerHTML = '<i class="fa-solid fa-bullseye"></i> Use Canvas Target';
  canvasTargetButton.disabled = !targets.length;
  targetBar.append(canvasTargetButton);
  section.append(targetBar);

  const canvasTarget = canvasTargetCombatant(targets);
  const savedTarget = targets.find((target) => target.id === app._arkflightWeaponTargetId) ?? null;
  const initialTarget = savedTarget ?? canvasTarget ?? targets[0] ?? null;
  if (initialTarget) {
    targetSelect.value = initialTarget.id;
    app._arkflightWeaponTargetId = initialTarget.id;
  }

  const list = document.createElement("div");
  list.className = "arkflight-weapon-list";
  const updateRows = [];

  for (const weaponState of weapons) {
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id] ?? null;
    const combat = weapon?.data?.combat ?? {};
    const remaining = weaponReloadRemaining(weaponState);
    const row = document.createElement("article");
    row.className = "arkflight-weapon-control-row";
    row.innerHTML = `
      <div class="arkflight-weapon-identity"><strong>${esc(weaponState.name)}</strong><span>${titleCase(weaponState.mount ?? "fore")} mount ${Number(weaponState.mountIndex ?? 0) + 1} · ${titleCase(combat.arcTemplate ?? "wide")} arc</span></div>
      <div class="arkflight-weapon-stats">${esc(weaponStatText(weaponState, weapon))}</div>
      <div class="arkflight-weapon-solution" data-arkflight-weapon-solution>Choose a target.</div>
      <div class="arkflight-weapon-row-actions"></div>`;

    const solutionNode = row.querySelector("[data-arkflight-weapon-solution]");
    const actions = row.querySelector(".arkflight-weapon-row-actions");
    const fireButton = document.createElement("button");
    fireButton.type = "button";
    fireButton.className = "arkflight-weapon-fire";
    actions.append(fireButton);

    if (remaining > 0) {
      const reloadButton = document.createElement("button");
      reloadButton.type = "button";
      const reloadControl = api.stationActionControl?.("common-reload-weapon", combatant) ?? { ok: Boolean(game.user?.isGM), reason: null };
      const reloadAvailability = api.stationActionAvailability?.("common-reload-weapon", combatant) ?? { ok: true, reason: null };
      const reloadBlocker = !reloadControl.ok ? reloadControl.reason : !reloadAvailability.ok ? reloadAvailability.reason : null;
      reloadButton.disabled = Boolean(reloadBlocker);
      reloadButton.innerHTML = reloadBlocker
        ? `<i class="fa-solid fa-lock"></i> ${esc(stationActionBlockerLabel(reloadBlocker))}`
        : '<i class="fa-solid fa-rotate"></i> Reload · 1 AP';
      reloadButton.title = reloadBlocker
        ? `Reload unavailable: ${stationActionBlockerLabel(reloadBlocker)}.`
        : "Common action: spend 1 AP to reduce this weapon's remaining Reload by 1.";
      reloadButton.addEventListener("click", async () => {
        try {
          const result = await api.stationAction("common-reload-weapon", { weaponKey: weaponState.key, selection: weaponState.key }, combatant);
          if (!result?.requested) app.render(false);
        } catch (error) { ui.notifications?.error(error?.message ?? "Reload failed."); }
      });
      actions.append(reloadButton);

      if (remaining <= 2) {
        const workButton = document.createElement("button");
        workButton.type = "button";
        const workControl = api.stationActionControl?.("battlewatch-reload-weapon", combatant) ?? { ok: Boolean(game.user?.isGM), reason: null };
        const workAvailability = api.stationActionAvailability?.("battlewatch-reload-weapon", combatant) ?? { ok: true, reason: null };
        const workBlocker = !workControl.ok ? workControl.reason : !workAvailability.ok ? workAvailability.reason : null;
        workButton.disabled = Boolean(workBlocker);
        workButton.innerHTML = workBlocker
          ? `<i class="fa-solid fa-lock"></i> Work the Guns · ${esc(stationActionBlockerLabel(workBlocker))}`
          : '<i class="fa-solid fa-burst"></i> Work the Guns · 20% Morale · +1 Strain';
        workButton.title = workBlocker
          ? `Work the Guns unavailable: ${stationActionBlockerLabel(workBlocker)}.`
          : "Battlewatch, once per round: spend 20% Morale and gain 1 Strain to immediately ready this weapon for 0 AP.";
        workButton.addEventListener("click", async () => {
          try {
            const result = await api.stationAction("battlewatch-reload-weapon", { weaponKey: weaponState.key, selection: weaponState.key }, combatant);
            if (!result?.requested) app.render(false);
          } catch (error) { ui.notifications?.error(error?.message ?? "Work the Guns failed."); }
        });
        actions.append(workButton);
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
          legal = solution.legal;
          solutionNode.textContent = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "Inside firing arc" : `Outside arc by ${Math.max(0, solution.arc.difference - solution.arc.halfWidth).toFixed(0)}°`}`;
          solutionNode.className = `arkflight-weapon-solution ${legal ? "is-legal" : "is-illegal"}`;
        } catch (error) {
          solutionNode.textContent = error?.message ?? "Target solution unavailable.";
          solutionNode.className = "arkflight-weapon-solution is-illegal";
        }
      }

      const fireControl = api.stationActionControl?.("battlewatch-fire-weapon", combatant) ?? { ok: Boolean(game.user?.isGM) };
      fireButton.disabled = !fireControl.ok || remaining > 0 || !enoughAP || !legal;
      if (!fireControl.ok) fireButton.innerHTML = '<i class="fa-solid fa-lock"></i> Battlewatch Only';
      else if (remaining > 0) fireButton.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Reload ${remaining}`;
      else if (!enoughAP) fireButton.innerHTML = '<i class="fa-solid fa-bolt"></i> Need 1 AP';
      else if (!legal) fireButton.innerHTML = '<i class="fa-solid fa-ban"></i> Target Illegal';
      else fireButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Fire &amp; Roll Damage';
    };

    fireButton.addEventListener("click", async () => {
      const target = targets.find((entry) => entry.id === targetSelect.value);
      if (!target) return ui.notifications?.warn("Select a target ship first.");
      try {
        const result = await api.stationAction("battlewatch-fire-weapon", {
          weaponKey: weaponState.key,
          targetId: target.id,
          selection: target.id
        }, combatant);
        if (result?.requested) {
          app.render(false);
          return;
        }
        notifyFireResult(result, target.name, weaponState.name);
        redrawFiringArcs(combatant);
        app.render(false);
      } catch (error) {
        console.error("Arkflight weapon fire failed", error);
        ui.notifications?.error(error?.message ?? "Weapon fire failed.");
      }
    });

    updateRows.push(update);
    list.append(row);
  }

  const updateAll = () => updateRows.forEach((update) => update());
  targetSelect.addEventListener("change", () => {
    app._arkflightWeaponTargetId = targetSelect.value || null;
    const target = targets.find((entry) => entry.id === targetSelect.value);
    if (target) targetOnCanvas(target);
    updateAll();
  });
  canvasTargetButton.addEventListener("click", () => {
    const target = canvasTargetCombatant(targets);
    if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first.");
    targetSelect.value = target.id;
    app._arkflightWeaponTargetId = target.id;
    updateAll();
  });

  section.append(list);
  updateAll();
  const battlewatchControl = api.stationActionControl?.("battlewatch-fire-weapon", combatant) ?? { ok: Boolean(game.user?.isGM) };
  if (!battlewatchControl.ok) section.insertAdjacentHTML("beforeend", '<p class="arkflight-weapon-authority"><i class="fa-solid fa-lock"></i> Fire control is Battlewatch-only. Reload is a common action available to ship Owners.</p>');
  return section;
}

function enhanceShipSheet(app, html = null) {
  if (!isArkflightShip(app?.actor)) return;
  const root = rootElement(app, html);
  if (!root) return;
  const weaponSection = [...root.querySelectorAll(".arkflight-fitting-section")].find((details) => details.querySelector("summary > span")?.textContent?.trim() === "Weapons");
  if (!weaponSection || weaponSection.querySelector(".arkflight-weapon-station")) return;
  weaponSection.append(buildShipWeaponStation(app, app.actor));
}

function enhanceGMWeaponConsole(app) {
  const root = rootElement(app);
  if (!root) return;
  const consoleNode = root.querySelector(".arkflight-gm-weapon-console");
  if (!consoleNode) return;
  const combatant = displayedCombatant();
  if (!combatant) return;
  const targets = [...(game.arkflight?.combat?.targets?.(combatant) ?? [])];
  const head = consoleNode.querySelector(".arkflight-gm-weapon-console-head");
  if (head && !head.querySelector("[data-arkflight-firing-arcs]")) {
    const actions = document.createElement("div");
    actions.className = "arkflight-weapon-gm-head-actions";
    const arcs = document.createElement("button");
    arcs.type = "button";
    arcs.dataset.arkflightFiringArcs = "true";
    const label = () => { arcs.innerHTML = firingArcsVisible(combatant) ? '<i class="fa-solid fa-eye-slash"></i> Hide Firing Arcs' : '<i class="fa-solid fa-eye"></i> Show Firing Arcs'; };
    label();
    arcs.addEventListener("click", () => { toggleFiringArcs(combatant); label(); });
    const useTarget = document.createElement("button");
    useTarget.type = "button";
    useTarget.innerHTML = '<i class="fa-solid fa-bullseye"></i> Use Canvas Target';
    useTarget.disabled = !targets.length;
    useTarget.addEventListener("click", () => {
      const target = canvasTargetCombatant(targets);
      if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first.");
      for (const select of consoleNode.querySelectorAll("[data-weapon-target]")) {
        select.value = target.id;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    actions.append(arcs, useTarget);
    head.append(actions);
  }

  for (const select of consoleNode.querySelectorAll("[data-weapon-target]")) {
    if (select.dataset.arkflightCanvasTargetWired === "true") continue;
    select.dataset.arkflightCanvasTargetWired = "true";
    select.addEventListener("change", () => {
      const target = targets.find((entry) => entry.id === select.value);
      if (target) targetOnCanvas(target);
    });
  }
  for (const button of consoleNode.querySelectorAll("[data-fire-weapon]")) {
    if (button.textContent?.trim() === "Fire Weapon") button.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Fire &amp; Roll Damage';
    button.title = "Resolve attack, damage, target Hardness, and Hull reduction automatically.";
  }
}

function refreshVisibleFiringArcs() {
  const active = new Map([...(game.combat?.combatants ?? [])].map((entry) => [entry.id, entry]));
  for (const id of [...ARC_VISIBLE]) {
    const combatant = active.get(id);
    if (combatant) redrawFiringArcs(combatant);
    else {
      ARC_VISIBLE.delete(id);
      ARC_WEAPON_KEYS.delete(id);
      removeArcGraphics(id);
    }
  }
}

Hooks.on("renderArkflightShipSheet", (app, html) => enhanceShipSheet(app, html));
Hooks.on("renderActorSheet", (app, html) => enhanceShipSheet(app, html));
Hooks.on("renderArkflightGMOperations", (app) => enhanceGMWeaponConsole(app));
Hooks.on("renderApplicationV2", (app) => enhanceGMWeaponConsole(app));
Hooks.on("updateToken", () => setTimeout(refreshVisibleFiringArcs, 0));
Hooks.on("updateCombatant", () => setTimeout(refreshVisibleFiringArcs, 0));
Hooks.on("updateCombat", () => setTimeout(refreshVisibleFiringArcs, 0));
Hooks.on("arkflightStationActionRemoteResult", (payload) => {
  if (!["common-reload-weapon", "battlewatch-reload-weapon"].includes(payload?.actionId)) return;
  for (const app of Object.values(ui.windows ?? {})) {
    const actor = app?.actor ?? app?.document?.actor ?? (app?.document?.documentName === "Actor" ? app.document : null);
    const combatant = actor ? combatantForActor(actor) : null;
    if (combatant?.id === payload.combatantId) app.render?.(false);
  }
});
Hooks.on("deleteCombat", () => { ARC_VISIBLE.clear(); clearArcGraphics(); });
Hooks.on("canvasReady", () => refreshVisibleFiringArcs());
Hooks.on("tearDownCanvas", () => clearArcGraphics());