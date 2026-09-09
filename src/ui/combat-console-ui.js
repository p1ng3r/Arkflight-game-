import { SHIP_CATALOGS } from "../content/index.js";
import { weaponArcCheck } from "../combat/weapon-targeting.js";
import { deriveShip } from "../ship/derive-ship.js";
import { setFiringArcsVisible } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

const STATIONS = Object.freeze([
  { id: "captain", label: "Captain", icon: "fa-solid fa-compass" },
  { id: "battlewatch", label: "Battlewatch", icon: "fa-solid fa-crosshairs" },
  { id: "navigator", label: "Navigator", icon: "fa-solid fa-route" },
  { id: "engineer", label: "Engineer", icon: "fa-solid fa-gears" },
  { id: "veilwarden", label: "Veilwarden", icon: "fa-solid fa-shield-halved" }
]);
const FACINGS = Object.freeze([
  { id: "fore", label: "Fore", color: 0x8bd5e2 },
  { id: "port", label: "Port", color: 0x9b8fd6 },
  { id: "starboard", label: "Starboard", color: 0xd7b16b },
  { id: "aft", label: "Aft", color: 0xc6756c }
]);
const DEG_TO_RAD = Math.PI / 180;
const CONSOLE_ARCS_VISIBLE = new Set();
const CONSOLE_ARC_FACINGS = new Map();
const CONSOLE_ARC_GRAPHICS = new Map();
const REFRESH_HOOKS = [
  "updateActor", "updateCombat", "updateCombatant", "updateToken", "targetToken",
  "arkflightStationActionResolved", "arkflightStationActionsRefreshed"
];
let combatConsole = null;
let refreshQueued = false;

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function actorFromReference(reference) {
  if (reference?.documentName === "Actor") return reference;
  if (reference?.documentName === "Combatant") return reference.actor ?? null;
  if (reference?.documentName === "Token") return reference.actor ?? null;
  if (reference?.document?.documentName === "Token") return reference.document.actor ?? reference.actor ?? null;
  if (reference?.actor?.documentName === "Actor") return reference.actor;
  if (typeof reference === "string") return game.actors?.get(reference) ?? null;
  return null;
}
function tokenDocumentFromHud(hud) {
  const candidate = hud?.object?.document ?? hud?.object ?? hud?.document ?? null;
  if (candidate?.documentName === "Token") return candidate;
  if (candidate?.document?.documentName === "Token") return candidate.document;
  return null;
}
function hudRoot(hud, html = null) {
  if (html?.querySelector) return html;
  if (html?.[0]?.querySelector) return html[0];
  const element = hud?.element;
  if (element?.querySelector) return element;
  if (element?.[0]?.querySelector) return element[0];
  return null;
}
function isArkflightShip(actor) { return Boolean(actor?.flags?.[MODULE_ID]?.ship); }
function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function activeCombatant(actor) {
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.actorId === actor.id)
    ?? null;
}
function canvasTargetCombatant(targets) {
  const targetedIds = new Set([...(game.user?.targets ?? [])]
    .map((token) => token?.document?.id ?? token?.id).filter(Boolean));
  return targets.find((entry) => targetedIds.has(entry.tokenId)) ?? null;
}
function targetOnCanvas(combatant) {
  const tokenObject = combatant?.token?.object;
  if (!tokenObject?.setTarget) return false;
  tokenObject.setTarget(true, { releaseOthers: true });
  return true;
}
function crewName(api, combatant, station) {
  return api?.stationActor?.(combatant, station)?.name ?? "Unassigned";
}
function costLabel(action) {
  if (action.rules?.costSource === "weapon.fireAP") return "Weapon AP";
  const parts = [];
  if (Number(action.cost?.ap) > 0) parts.push(`${action.cost.ap} AP`);
  if (Number(action.cost?.rp) > 0) parts.push(`${action.cost.rp} RP`);
  if (Number(action.rules?.strain) > 0) parts.push(`+${action.rules.strain} Strain`);
  return parts.join(" · ") || "No cost";
}
function unavailableLabel(reason) {
  return ({
    "station-unassigned": "Assign Crew", "not-this-ships-turn": "Wait for Turn",
    "insufficient-ap": "Not Enough AP", "insufficient-rp": "Not Enough RP",
    "once-per-round": "Used This Round", "reaction-readied": "Reaction Readied",
    "combatant-required": "Combat Offline"
  })[reason] ?? "Unavailable";
}
function choiceOptions(action, api, combatant, actor, targets, weapons) {
  const rules = action.rules ?? {};
  if (rules.chooseStation) return STATIONS.filter((entry) => entry.id !== action.station).map((entry) => ({ value: entry.id, label: entry.label }));
  if (rules.chooseTarget) return targets.map((target) => ({ value: target.id, label: target.name }));
  if (rules.chooseWeapon) return weapons.map((weapon) => ({ value: weapon.key, label: weapon.name }));
  if (Array.isArray(rules.choices)) return rules.choices.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseSystem) return ["hull", "arkengine", "rigging", "lifeveil"].map((value) => ({ value, label: titleCase(value) }));
  if (Array.isArray(rules.chooseFacing)) return rules.chooseFacing.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseFacing) return FACINGS.map((entry) => ({ value: entry.id, label: entry.label }));
  if (rules.chooseAreaOrEnergy) return ["hull", "arkengine", "rigging", "lifeveil", "morale", "fire", "cold", "electricity", "acid", "sonic", "force"].map((value) => ({ value, label: titleCase(value) }));
  if (rules.resolver === "purgeInterference") {
    return [...(shipPayload(actor)?.conditions ?? [])].map((entry, index) => ({
      value: String(index), label: typeof entry === "string" ? entry : entry?.name ?? entry?.id ?? `Condition ${index + 1}`
    }));
  }
  return [];
}
function targetSummary(target, selectedWeaponKey, attacker) {
  if (!target) return null;
  const ship = shipPayload(target.actor);
  const derived = ship ? deriveShip(ship, SHIP_CATALOGS) : null;
  const targetState = game.arkflight?.combat?.state?.(target) ?? null;
  let solution = null;
  if (selectedWeaponKey && attacker) {
    try { solution = game.arkflight?.combat?.targetingSolution?.(selectedWeaponKey, target, attacker) ?? null; }
    catch (_error) { solution = null; }
  }
  const hullValue = Math.max(0, Number(ship?.resources?.hull?.value) || 0);
  const hullMax = Math.max(0, Number(ship?.resources?.hull?.max ?? derived?.stats?.hullIntegrity) || 0);
  const veilValue = Math.max(0, Number(ship?.resources?.lifeveil?.value) || 0);
  const veilMax = Math.max(0, Number(ship?.resources?.lifeveil?.max ?? derived?.stats?.lifeveilCapacity) || 0);
  return {
    id: target.id, name: target.name,
    img: target.token?.texture?.src ?? target.actor?.img ?? "icons/svg/mystery-man.svg",
    armorClass: Math.max(0, Number(derived?.stats?.armorClass) || 0),
    hardness: Math.max(0, Number(derived?.stats?.hardness) || 0),
    hullValue, hullMax, hullPct: hullMax > 0 ? Math.max(0, Math.min(100, hullValue / hullMax * 100)) : 0,
    lifeveilValue: veilValue, lifeveilMax: veilMax,
    lifeveilPct: veilMax > 0 ? Math.max(0, Math.min(100, veilValue / veilMax * 100)) : 0,
    heading: Number(targetState?.mobility?.heading ?? target.token?.rotation ?? 0),
    rangeLabel: solution?.range?.label ?? "—",
    distance: solution ? `${Number(solution.distanceHexes).toFixed(1)} hex` : "—",
    legal: Boolean(solution?.legal), arcLegal: Boolean(solution?.arc?.legal),
    solutionText: solution
      ? `${Number(solution.distanceHexes).toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "IN ARC" : "OUT OF ARC"}`
      : "Choose a weapon for a firing solution."
  };
}
function buildWeapons(state, round) {
  return Object.values(state?.weapons ?? {}).map((weaponState) => {
    const definition = SHIP_CATALOGS.weapons?.[weaponState.id] ?? null;
    const combat = definition?.data?.combat ?? {};
    const damage = definition?.data?.damageProfile ?? {};
    const remaining = Math.max(0, Number(weaponState.readyRound ?? 0) - round);
    return {
      key: weaponState.key, id: weaponState.id,
      name: weaponState.name ?? definition?.name ?? weaponState.id,
      mount: weaponState.mount ?? "fore", mountLabel: titleCase(weaponState.mount ?? "fore"),
      mountIndex: Number(weaponState.mountIndex ?? 0) + 1,
      arc: titleCase(combat.arcTemplate ?? "wide"),
      fireAP: Math.max(1, Number(weaponState.fireAP ?? combat.fireAP ?? 1)),
      damage: `${damage.dice ?? "—"} ${titleCase(damage.type ?? "damage")}`,
      remaining, ready: remaining <= 0,
      maxRange: Math.max(0, Number(combat.rangeHexes?.max) || 0)
    };
  });
}
function buildStationActions(api, combatant, actor, station, targets, weapons, selectedWeaponKey, selectedTargetId) {
  const state = api?.state?.(combatant) ?? null;
  const selectedWeapon = weapons.find((entry) => entry.key === selectedWeaponKey) ?? null;
  return [...(api?.stationActions?.(station) ?? [])].map((action) => {
    const choices = choiceOptions(action, api, combatant, actor, targets, weapons);
    const availability = api.stationActionAvailability?.(action.id, combatant) ?? { ok: false, reason: "combatant-required" };
    const resolver = action.rules?.resolver;
    let usable = Boolean(game.user?.isGM && availability.ok);
    let buttonLabel = action.timing === "reaction" ? "Ready Reaction" : "Use Action";
    let reason = availability.ok ? "" : unavailableLabel(availability.reason);
    if (resolver === "fireAtTarget") {
      let legal = false;
      if (selectedWeapon && selectedTargetId) {
        try { legal = Boolean(api.targetingSolution(selectedWeapon.key, selectedTargetId, combatant)?.legal); }
        catch (_error) { legal = false; }
      }
      const enoughAP = Number(state?.economy?.ap?.value ?? 0) >= Number(selectedWeapon?.fireAP ?? 99);
      usable = Boolean(game.user?.isGM && availability.ok && selectedWeapon?.ready && selectedTargetId && legal && enoughAP);
      buttonLabel = "Fire Selected";
      if (!selectedWeapon) reason = "Choose Weapon";
      else if (!selectedTargetId) reason = "Choose Target";
      else if (!selectedWeapon.ready) reason = `Reloading ${selectedWeapon.remaining}`;
      else if (!legal) reason = "Target Illegal";
      else if (!enoughAP) reason = `Need ${selectedWeapon.fireAP} AP`;
    } else if (resolver === "workTheGuns") {
      usable = Boolean(game.user?.isGM && availability.ok && selectedWeapon && !selectedWeapon.ready && Number(state?.economy?.ap?.value ?? 0) >= 1);
      buttonLabel = "Work Selected Gun";
      if (!selectedWeapon) reason = "Choose Weapon";
      else if (selectedWeapon.ready) reason = "Weapon Ready";
    } else if (choices.length === 0 && (action.rules?.chooseStation || action.rules?.chooseTarget || action.rules?.chooseWeapon || action.rules?.chooseSystem || action.rules?.chooseFacing || action.rules?.chooseAreaOrEnergy)) {
      usable = false; reason = "No Valid Choice";
    }
    if (!game.user?.isGM) { usable = false; reason = "GM Resolve"; }
    return {
      id: action.id, name: action.name, description: action.description,
      timing: action.timing, reaction: action.timing === "reaction", cost: costLabel(action), resolver,
      choices, hasChoices: choices.length > 0, usable, buttonLabel: usable ? buttonLabel : reason
    };
  });
}
function arcLayer() { return canvas?.interface ?? canvas?.controls ?? canvas?.stage ?? null; }
function tokenCenter(combatant) {
  const center = combatant?.token?.object?.center;
  if (center) return { x: Number(center.x), y: Number(center.y) };
  const token = combatant?.token;
  const grid = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return { x: Number(token?.x ?? 0) + Number(token?.width ?? 1) * grid / 2, y: Number(token?.y ?? 0) + Number(token?.height ?? 1) * grid / 2 };
}
function removeConsoleArcGraphics(id) {
  const graphics = CONSOLE_ARC_GRAPHICS.get(id);
  if (!graphics) return;
  try { graphics.parent?.removeChild?.(graphics); } catch (_error) { /* cleanup */ }
  try { graphics.destroy?.({ children: true }); } catch (_error) { /* cleanup */ }
  CONSOLE_ARC_GRAPHICS.delete(id);
}
function selectedFacings(combatant) {
  if (!combatant?.id) return new Set();
  if (!CONSOLE_ARC_FACINGS.has(combatant.id)) CONSOLE_ARC_FACINGS.set(combatant.id, new Set(FACINGS.map((entry) => entry.id)));
  return CONSOLE_ARC_FACINGS.get(combatant.id);
}
function drawSector(graphics, { x, y, radius, center, halfWidth, color }) {
  if (!(radius > 0)) return;
  const start = (center - halfWidth - 90) * DEG_TO_RAD;
  const end = (center + halfWidth - 90) * DEG_TO_RAD;
  const modern = typeof graphics.fill === "function" && typeof graphics.stroke === "function";
  if (modern) {
    graphics.moveTo(x, y); graphics.arc(x, y, radius, start, end); graphics.lineTo(x, y); graphics.closePath?.();
    graphics.fill({ color, alpha: 0.16 }); graphics.stroke({ color, width: 3, alpha: 0.92 }); return;
  }
  graphics.lineStyle?.(3, color, 0.92); graphics.beginFill?.(color, 0.16);
  graphics.moveTo?.(x, y); graphics.arc?.(x, y, radius, start, end); graphics.lineTo?.(x, y); graphics.endFill?.();
}
function redrawConsoleArcs(combatant) {
  if (!combatant?.id) return false;
  removeConsoleArcGraphics(combatant.id);
  if (!CONSOLE_ARCS_VISIBLE.has(combatant.id)) return false;
  const state = game.arkflight?.combat?.state?.(combatant);
  const layer = arcLayer();
  const GraphicsClass = globalThis.PIXI?.Graphics;
  if (!state || !layer?.addChild || !GraphicsClass) return false;
  setFiringArcsVisible(combatant, false);
  const center = tokenCenter(combatant);
  const pixelsPerHex = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  const facings = selectedFacings(combatant);
  const graphics = new GraphicsClass();
  graphics.eventMode = "none"; graphics.label = `Arkflight combat console arcs — ${combatant.name ?? combatant.id}`; graphics.zIndex = 6;
  for (const weaponState of Object.values(state.weapons ?? {})) {
    const mount = weaponState.mount ?? "fore";
    if (!facings.has(mount)) continue;
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id];
    const combat = weapon?.data?.combat;
    const maxRange = Math.max(0, Number(combat?.rangeHexes?.max) || 0);
    if (!combat || maxRange <= 0) continue;
    const arc = weaponArcCheck({ heading: state.mobility?.heading ?? 0, mount, arcTemplate: combat.arcTemplate ?? "wide", bearing: 0 });
    drawSector(graphics, { ...center, radius: maxRange * pixelsPerHex, center: arc.center, halfWidth: arc.halfWidth, color: FACINGS.find((entry) => entry.id === mount)?.color ?? 0x8bd5e2 });
  }
  layer.addChild(graphics); CONSOLE_ARC_GRAPHICS.set(combatant.id, graphics); return true;
}
function toggleAllConsoleArcs(combatant) {
  if (!combatant?.id) return false;
  const next = !CONSOLE_ARCS_VISIBLE.has(combatant.id);
  if (next) { CONSOLE_ARCS_VISIBLE.add(combatant.id); CONSOLE_ARC_FACINGS.set(combatant.id, new Set(FACINGS.map((entry) => entry.id))); }
  else CONSOLE_ARCS_VISIBLE.delete(combatant.id);
  redrawConsoleArcs(combatant); return next;
}
function toggleConsoleFacing(combatant, facing) {
  if (!combatant?.id || !FACINGS.some((entry) => entry.id === facing)) return false;
  const facings = selectedFacings(combatant);
  if (!CONSOLE_ARCS_VISIBLE.has(combatant.id)) { CONSOLE_ARCS_VISIBLE.add(combatant.id); facings.clear(); facings.add(facing); }
  else if (facings.has(facing)) { facings.delete(facing); if (!facings.size) CONSOLE_ARCS_VISIBLE.delete(combatant.id); }
  else facings.add(facing);
  redrawConsoleArcs(combatant); return CONSOLE_ARCS_VISIBLE.has(combatant.id) && facings.has(facing);
}
function clearConsoleArcs(combatant = null) {
  if (combatant?.id) { CONSOLE_ARCS_VISIBLE.delete(combatant.id); CONSOLE_ARC_FACINGS.delete(combatant.id); removeConsoleArcGraphics(combatant.id); return; }
  for (const id of [...CONSOLE_ARC_GRAPHICS.keys()]) removeConsoleArcGraphics(id);
  CONSOLE_ARCS_VISIBLE.clear(); CONSOLE_ARC_FACINGS.clear();
}

export class ArkflightCombatConsole extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-combat-console", classes: ["arkflight", "arkflight-combat-console"],
    position: { width: 980, height: 560 },
    window: { title: "Arkflight Combat Console", icon: "fa-solid fa-crosshairs", resizable: true, minimizable: true }
  };
  static PARTS = { console: { template: "modules/arkflight-game/templates/combat-console.hbs" } };
  constructor(options = {}) {
    super(options);
    this.actorId = options.actorId ?? null; this.selectedStation = options.selectedStation ?? "battlewatch";
    this.selectedTargetId = options.selectedTargetId ?? null; this.selectedWeaponKey = options.selectedWeaponKey ?? null; this.lastShot = null;
  }
  get actor() { return this.actorId ? game.actors?.get(this.actorId) ?? null : null; }
  setReference(reference) {
    const actor = actorFromReference(reference);
    if (!actor || !isArkflightShip(actor)) return false;
    const changed = this.actorId !== actor.id; this.actorId = actor.id;
    if (changed) { this.selectedTargetId = null; this.selectedWeaponKey = null; this.lastShot = null; }
    if (this.rendered) this.render({ force: true }); return true;
  }
  open(reference = null) {
    if (reference) this.setReference(reference);
    if (!this.actor) {
      const token = canvas?.tokens?.controlled?.find((entry) => isArkflightShip(entry.actor)) ?? canvas?.tokens?.placeables?.find((entry) => isArkflightShip(entry.actor));
      if (token) this.actorId = token.actor.id;
    }
    if (!this.actor) { ui.notifications?.warn("Select an Arkflight ship token first."); return this; }
    return this.render({ force: true });
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor; const api = game.arkflight?.combat; const combatant = activeCombatant(actor);
    const state = combatant ? api?.state?.(combatant) : null; const round = Math.max(1, Number(game.combat?.round ?? 1));
    const targets = combatant ? [...(api?.targets?.(combatant) ?? [])] : []; const weapons = buildWeapons(state, round);
    if (!weapons.some((entry) => entry.key === this.selectedWeaponKey)) this.selectedWeaponKey = weapons[0]?.key ?? null;
    const canvasTarget = canvasTargetCombatant(targets);
    if (!targets.some((entry) => entry.id === this.selectedTargetId)) this.selectedTargetId = canvasTarget?.id ?? targets[0]?.id ?? null;
    const targetCombatant = targets.find((entry) => entry.id === this.selectedTargetId) ?? null;
    const target = targetSummary(targetCombatant, this.selectedWeaponKey, combatant);
    const facings = combatant ? selectedFacings(combatant) : new Set(); const arcVisible = Boolean(combatant?.id && CONSOLE_ARCS_VISIBLE.has(combatant.id));
    const stationRows = STATIONS.map((entry) => ({ ...entry, active: entry.id === this.selectedStation, crew: combatant ? crewName(api, combatant, entry.id) : "Offline" }));
    const actions = state ? buildStationActions(api, combatant, actor, this.selectedStation, targets, weapons, this.selectedWeaponKey, this.selectedTargetId) : [];
    for (const weapon of weapons) {
      weapon.selected = weapon.key === this.selectedWeaponKey;
      if (targetCombatant) {
        try { const solution = api.targetingSolution(weapon.key, targetCombatant, combatant); weapon.legal = Boolean(solution.legal); weapon.solution = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "IN ARC" : "OUT OF ARC"}`; }
        catch (_error) { weapon.legal = false; weapon.solution = "No firing solution"; }
      } else { weapon.legal = false; weapon.solution = "No target"; }
    }
    const selectedWeapon = weapons.find((entry) => entry.key === this.selectedWeaponKey) ?? null;
    return {
      ...context, actorId: actor?.id ?? "", shipName: actor?.name ?? "Arkflight Ship", shipImg: actor?.img ?? "",
      offline: !actor || !game.combat || !combatant || !state,
      offlineReason: !game.combat ? "No active Foundry combat." : !combatant ? `${actor?.name ?? "This ship"} is not in the active combat.` : "Arkflight combat state is not initialized.",
      stationRows, actions, hasActions: actions.length > 0,
      targets: targets.map((entry) => ({ id: entry.id, name: entry.name, selected: entry.id === this.selectedTargetId })), hasTargets: targets.length > 0,
      target, weapons, hasWeapons: weapons.length > 0, selectedWeaponKey: this.selectedWeaponKey,
      canFireSelected: Boolean(game.user?.isGM && combatant && game.combat?.combatant?.id === combatant.id && target?.legal && selectedWeapon?.ready && Number(state?.economy?.ap?.value ?? 0) >= Number(selectedWeapon?.fireAP ?? 99)),
      arcVisible, arcButtonLabel: arcVisible ? "Hide All Arcs" : "Show All Arcs",
      facings: FACINGS.map((entry) => ({ ...entry, active: arcVisible && facings.has(entry.id) })),
      resources: { round, ap: Number(state?.economy?.ap?.value ?? 0), apMax: Number(state?.economy?.ap?.max ?? 0), rp: Number(state?.economy?.rp?.value ?? 0), rpMax: Number(state?.economy?.rp?.max ?? 0), strain: Number(state?.strain?.value ?? 0), strainMax: Number(state?.strain?.max ?? 0), heading: Number(state?.mobility?.heading ?? 0) },
      activeTurn: Boolean(combatant && game.combat?.combatant?.id === combatant.id), lastShot: this.lastShot, gm: Boolean(game.user?.isGM)
    };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element; if (!root) return;
    const actor = this.actor; const api = game.arkflight?.combat; const combatant = activeCombatant(actor);
    for (const button of root.querySelectorAll("[data-station]")) button.addEventListener("click", () => { this.selectedStation = button.dataset.station; this.render({ force: true }); });
    root.querySelector("[data-target-select]")?.addEventListener("change", (event) => {
      this.selectedTargetId = event.currentTarget.value || null;
      const target = [...(api?.targets?.(combatant) ?? [])].find((entry) => entry.id === this.selectedTargetId); if (target) targetOnCanvas(target); this.render({ force: true });
    });
    root.querySelector("[data-use-canvas-target]")?.addEventListener("click", () => {
      const targets = [...(api?.targets?.(combatant) ?? [])]; const target = canvasTargetCombatant(targets);
      if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first."); this.selectedTargetId = target.id; this.render({ force: true });
    });
    root.querySelector("[data-lock-target]")?.addEventListener("click", () => {
      const target = [...(api?.targets?.(combatant) ?? [])].find((entry) => entry.id === this.selectedTargetId);
      if (!target) return ui.notifications?.warn("Choose a target ship first."); targetOnCanvas(target);
    });
    root.querySelector("[data-weapon-select]")?.addEventListener("change", (event) => { this.selectedWeaponKey = event.currentTarget.value || null; this.render({ force: true }); });
    root.querySelector("[data-toggle-all-arcs]")?.addEventListener("click", () => { if (!combatant) return; toggleAllConsoleArcs(combatant); this.render({ force: true }); });
    for (const button of root.querySelectorAll("[data-toggle-facing]")) button.addEventListener("click", () => { if (!combatant) return; toggleConsoleFacing(combatant, button.dataset.toggleFacing); this.render({ force: true }); });
    root.querySelector("[data-fire-selected]")?.addEventListener("click", () => this.#fireSelected(combatant));
    for (const button of root.querySelectorAll("[data-station-action]")) {
      button.addEventListener("click", async () => {
        const actionId = button.dataset.stationAction;
        const action = api?.actions?.[actionId] ?? [...(api?.stationActions?.(this.selectedStation) ?? [])].find((entry) => entry.id === actionId);
        if (!action) return;
        const card = button.closest("[data-action-card]"); const selection = card?.querySelector("[data-action-choice]")?.value ?? null;
        try {
          button.disabled = true;
          if (action.rules?.resolver === "fireAtTarget") await this.#fireSelected(combatant);
          else if (action.rules?.resolver === "workTheGuns") { if (!this.selectedWeaponKey) throw new Error("Choose an installed weapon first."); await api.workTheGuns(this.selectedWeaponKey, combatant); }
          else await api.stationAction(actionId, { selection }, combatant);
          this.render({ force: true });
        } catch (error) { console.error("Arkflight combat console action failed", error); ui.notifications?.error(error?.message ?? `${action.name} failed.`); button.disabled = false; }
      });
    }
  }
  async #fireSelected(combatant) {
    const api = game.arkflight?.combat;
    if (!combatant || !this.selectedWeaponKey || !this.selectedTargetId) { ui.notifications?.warn("Choose a ready weapon and target first."); return null; }
    try {
      const result = await api.fireAtTarget(this.selectedWeaponKey, this.selectedTargetId, combatant);
      this.lastShot = {
        weapon: result.solution?.weapon?.name ?? "Ship Weapon", target: result.solution?.target?.name ?? "Target", attack: Number(result.attack?.total ?? 0),
        degree: ({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" })[result.degree] ?? "Resolved",
        damage: Number(result.damage?.incoming ?? 0), hardness: Number(result.damage?.absorbed ?? 0), hullDamage: Number(result.damage?.hullDamage ?? 0),
        hullBefore: result.damage?.before ?? null, hullAfter: result.damage?.after ?? null, hit: Boolean(result.damage)
      };
      redrawConsoleArcs(combatant); this.render({ force: true }); return result;
    } catch (error) { console.error("Arkflight combat console weapon fire failed", error); ui.notifications?.error(error?.message ?? "Weapon fire failed."); return null; }
  }
  async close(options = {}) { const combatant = activeCombatant(this.actor); if (combatant) clearConsoleArcs(combatant); return super.close(options); }
}

export function openArkflightCombatConsole(reference = null) {
  combatConsole ??= new ArkflightCombatConsole(); combatConsole.open(reference); return combatConsole;
}
function attachTokenCombatConsoleButton(hud, html = null) {
  const token = tokenDocumentFromHud(hud); const actor = token?.actor ?? null;
  if (!token || !isArkflightShip(actor)) return;
  const root = hudRoot(hud, html); if (!root || root.querySelector("[data-arkflight-combat-console]")) return;
  const column = root.querySelector(".right") ?? root.querySelector(".col.right") ?? root.querySelector("[data-column='right']"); if (!column) return;
  const button = document.createElement("button");
  button.type = "button"; button.classList.add("control-icon", "arkflight-token-combat-console"); button.dataset.arkflightCombatConsole = "true";
  button.dataset.tooltip = "Open Arkflight Combat Console"; button.title = "Open Arkflight Combat Console"; button.setAttribute("aria-label", "Open Arkflight Combat Console");
  button.innerHTML = '<i class="fa-solid fa-gauge-high fa-fw"></i>';
  button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openArkflightCombatConsole(token); }); column.append(button);
}
function queueRefresh() {
  if (!combatConsole?.rendered || refreshQueued) return; refreshQueued = true;
  requestAnimationFrame(() => { refreshQueued = false; if (combatConsole?.rendered) combatConsole.render({ force: true }); });
}
Hooks.on("renderTokenHUD", attachTokenCombatConsoleButton);
Hooks.on("controlToken", (token, controlled) => { if (!controlled || !combatConsole?.rendered || !isArkflightShip(token?.actor)) return; combatConsole.setReference(token.document ?? token); });
for (const hook of REFRESH_HOOKS) Hooks.on(hook, queueRefresh);
Hooks.on("updateToken", () => { if (!combatConsole?.rendered) return; const combatant = activeCombatant(combatConsole.actor); if (combatant && CONSOLE_ARCS_VISIBLE.has(combatant.id)) setTimeout(() => redrawConsoleArcs(combatant), 0); });
Hooks.on("canvasReady", queueRefresh);
Hooks.on("tearDownCanvas", () => clearConsoleArcs());
Hooks.on("deleteCombat", () => { clearConsoleArcs(); queueRefresh(); });
Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.openCombatConsole = openArkflightCombatConsole;
  game.arkflight.combatConsole = Object.freeze({ open: openArkflightCombatConsole, get application() { return combatConsole; } });
});
