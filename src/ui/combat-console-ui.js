import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { firingArcsVisible, firingArcWeaponVisible, redrawFiringArcs, setFiringArcsVisible, toggleWeaponFiringArc } from "./weapon-combat-station-ui.js";

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
const REFRESH_HOOKS = [
  "updateActor",
  "updateCombat",
  "updateCombatant",
  "updateToken",
  "targetToken",
  "arkflightStationActionResolved",
  "arkflightStationActionsRefreshed",
  "arkflightStationActionRemoteResult"
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

function isArkflightShip(actor) {
  return Boolean(actor?.flags?.[MODULE_ID]?.ship);
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function activeCombatant(actor) {
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.actorId === actor.id)
    ?? null;
}

function canvasTargetCombatant(targets) {
  const targetedIds = new Set([...(game.user?.targets ?? [])]
    .map((token) => token?.document?.id ?? token?.id)
    .filter(Boolean));
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
  if (action.id === "battlewatch-reload-weapon") return "1 Morale · +1 Strain";
  const parts = [];
  if (Number(action.cost?.ap) > 0) parts.push(`${action.cost.ap} AP`);
  if (Number(action.cost?.rp) > 0) parts.push(`${action.cost.rp} RP`);
  if (Number(action.rules?.strain) > 0) parts.push(`+${action.rules.strain} Strain`);
  return parts.join(" · ") || "No cost";
}

function unavailableLabel(reason) {
  return ({
    "station-unassigned": "Assign Crew",
    "not-this-ships-turn": "Wait for Turn",
    "insufficient-ap": "Not Enough AP",
    "insufficient-rp": "Not Enough RP",
    "insufficient-morale": "Not Enough Morale",
    "crew-unassigned": "Assign Crew",
    "not-assigned-crew": "Assigned Crew Only",
    "once-per-round": "Used This Round",
    "reaction-readied": "Reaction Readied",
    "combatant-required": "Combat Offline",
    "not-your-station": "Assigned Crew Only",
    "not-ship-owner": "Ship Owner Only"
  })[reason] ?? "Unavailable";
}

function choiceOptions(action, api, combatant, actor, targets, weapons) {
  const rules = action.rules ?? {};
  if (rules.chooseStation) {
    return STATIONS.filter((entry) => entry.id !== action.station)
      .map((entry) => ({ value: entry.id, label: entry.label }));
  }
  if (rules.chooseTarget) return targets.map((target) => ({ value: target.id, label: target.name }));
  if (rules.chooseWeapon) {
    let choices = weapons.filter((weapon) => !weapon.ready);
    if (rules.resolver === "workTheGuns") {
      const maxRemaining = Math.max(1, Number(rules.maxReloadRemaining) || 2);
      choices = choices.filter((weapon) => Number(weapon.remaining ?? 0) <= maxRemaining);
    }
    return choices.map((weapon) => ({ value: weapon.key, label: `${weapon.name} · Reload ${weapon.remaining}` }));
  }
  if (Array.isArray(rules.choices)) return rules.choices.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseSystem) return ["hull", "arkengine", "rigging", "lifeveil"].map((value) => ({ value, label: titleCase(value) }));
  if (Array.isArray(rules.chooseFacing)) return rules.chooseFacing.map((value) => ({ value, label: titleCase(value) }));
  if (rules.chooseFacing) return FACINGS.map((entry) => ({ value: entry.id, label: entry.label }));
  if (rules.chooseAreaOrEnergy) {
    return ["hull", "arkengine", "rigging", "lifeveil", "morale", "fire", "cold", "electricity", "acid", "sonic", "force"]
      .map((value) => ({ value, label: titleCase(value) }));
  }
  if (rules.resolver === "purgeInterference") {
    return [...(shipPayload(actor)?.conditions ?? [])].map((entry, index) => ({
      value: String(index),
      label: typeof entry === "string" ? entry : entry?.name ?? entry?.id ?? `Condition ${index + 1}`
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
    id: target.id,
    name: target.name,
    img: target.token?.texture?.src ?? target.actor?.img ?? "icons/svg/mystery-man.svg",
    armorClass: Math.max(0, Number(derived?.stats?.armorClass) || 0),
    hardness: Math.max(0, Number(derived?.stats?.hardness) || 0),
    hullValue,
    hullMax,
    hullPct: hullMax > 0 ? Math.max(0, Math.min(100, hullValue / hullMax * 100)) : 0,
    lifeveilValue: veilValue,
    lifeveilMax: veilMax,
    lifeveilPct: veilMax > 0 ? Math.max(0, Math.min(100, veilValue / veilMax * 100)) : 0,
    heading: Number(targetState?.mobility?.heading ?? target.token?.rotation ?? 0),
    rangeLabel: solution?.range?.label ?? "—",
    distance: solution ? `${Number(solution.distanceHexes).toFixed(1)} hex` : "—",
    legal: Boolean(solution?.legal),
    arcLegal: Boolean(solution?.arc?.legal),
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
      key: weaponState.key,
      id: weaponState.id,
      name: weaponState.name ?? definition?.name ?? weaponState.id,
      mount: weaponState.mount ?? "fore",
      mountLabel: titleCase(weaponState.mount ?? "fore"),
      mountIndex: Number(weaponState.mountIndex ?? 0) + 1,
      arc: titleCase(combat.arcTemplate ?? "wide"),
      fireAP: 1,
      damage: `${damage.dice ?? "—"} ${titleCase(damage.type ?? "damage")}`,
      remaining,
      ready: remaining <= 0,
      maxRange: Math.max(0, Number(combat.rangeHexes?.max) || 0)
    };
  });
}

function buildResourcePips(value, max, cap = 8) {
  const total = Math.max(0, Math.trunc(Number(max) || 0));
  const current = Math.max(0, Math.min(total, Math.trunc(Number(value) || 0)));
  const display = Math.max(0, Math.min(total, cap));
  return Array.from({ length: display }, (_, index) => ({ filled: index < current }));
}

function compactSummary(action) {
  return action.summary
    ?? action.shortDescription
    ?? action.description
    ?? "Use this station action.";
}

function buildStationActions(api, combatant, actor, station, targets, weapons, selectedWeaponKey, selectedTargetId) {
  const state = api?.state?.(combatant) ?? null;
  const selectedWeapon = weapons.find((entry) => entry.key === selectedWeaponKey) ?? null;
  return [...(api?.stationActions?.(station) ?? [])].map((action) => {
    const choices = choiceOptions(action, api, combatant, actor, targets, weapons);
    const availability = api.stationActionAvailability?.(action.id, combatant)
      ?? { ok: false, reason: "combatant-required" };
    const resolver = action.rules?.resolver;
    const control = api.stationActionControl?.(action.id, combatant)
      ?? { ok: Boolean(game.user?.isGM), reason: game.user?.isGM ? null : "not-your-station" };
    let usable = Boolean(control.ok && availability.ok);
    let buttonLabel = action.timing === "reaction" ? "Ready" : "Use";
    let reason = !control.ok ? unavailableLabel(control.reason) : (availability.ok ? "" : unavailableLabel(availability.reason));

    if (resolver === "fireAtTarget") {
      let legal = false;
      if (selectedWeapon && selectedTargetId) {
        try { legal = Boolean(api.targetingSolution(selectedWeapon.key, selectedTargetId, combatant)?.legal); }
        catch (_error) { legal = false; }
      }
      const enoughAP = Number(state?.economy?.ap?.value ?? 0) >= 1;
      usable = Boolean(control.ok && availability.ok && selectedWeapon?.ready && selectedTargetId && legal && enoughAP);
      buttonLabel = "Fire";
      if (!selectedWeapon) reason = "Choose Weapon";
      else if (!selectedTargetId) reason = "Choose Target";
      else if (!selectedWeapon.ready) reason = `Reload ${selectedWeapon.remaining}`;
      else if (!legal) reason = "Illegal Shot";
      else if (!enoughAP) reason = "Need 1 AP";
    } else if (resolver === "workTheGuns") {
      usable = Boolean(control.ok && availability.ok && choices.length > 0);
      buttonLabel = "Work the Guns";
      if (!choices.length) reason = "No weapon at Reload 2 or less";
    } else if (choices.length === 0 && (
      action.rules?.chooseStation || action.rules?.chooseTarget || action.rules?.chooseWeapon
      || action.rules?.chooseSystem || action.rules?.chooseFacing || action.rules?.chooseAreaOrEnergy
    )) {
      usable = false;
      reason = "No Valid Choice";
    }

    return {
      id: action.id,
      name: action.name,
      description: action.description,
      summary: compactSummary(action),
      timing: action.timing,
      reaction: action.timing === "reaction",
      cost: costLabel(action),
      resolver,
      choices,
      hasChoices: choices.length > 0,
      usable,
      buttonLabel: usable ? buttonLabel : reason
    };
  });
}

function groupWeapons(weapons) {
  const order = FACINGS.map((entry) => entry.id);
  return order.map((facing) => {
    const rows = weapons.filter((weapon) => weapon.mount === facing);
    return {
      id: facing,
      label: titleCase(facing),
      colorClass: `facing-${facing}`,
      weapons: rows,
      hasWeapons: rows.length > 0
    };
  }).filter((group) => group.hasWeapons);
}

function buildLogEntries(state, lastShot) {
  const entries = [];
  if (lastShot) {
    entries.push({
      icon: lastShot.hit ? "fa-solid fa-burst" : "fa-solid fa-dice-d20",
      tone: lastShot.hit ? "is-hit" : "is-miss",
      title: `${lastShot.weapon} → ${lastShot.target}`,
      detail: lastShot.hit
        ? `Attack ${lastShot.attack} · ${lastShot.degree} · Hull ${lastShot.hullDamage} (${lastShot.hullBefore} → ${lastShot.hullAfter})`
        : `Attack ${lastShot.attack} · ${lastShot.degree}`
    });
  }
  for (const entry of [...(state?.log ?? [])].slice(-8).reverse()) {
    entries.push({
      icon: entry.rp > 0 ? "fa-solid fa-bolt" : "fa-solid fa-gears",
      tone: entry.rp > 0 ? "is-reaction" : "",
      title: `${titleCase(entry.station)} — ${entry.actionName ?? entry.actionId ?? "Action"}`,
      detail: `${entry.ap ? `${entry.ap} AP` : ""}${entry.ap && entry.rp ? " · " : ""}${entry.rp ? `${entry.rp} RP` : ""}${entry.selection ? ` · ${titleCase(entry.selection)}` : ""}`
    });
  }
  return entries;
}

function redrawConsoleArcs(combatant) {
  if (!combatant?.id) return false;
  return redrawFiringArcs(combatant);
}

function toggleAllConsoleArcs(combatant) {
  if (!combatant?.id) return false;
  const next = !firingArcsVisible(combatant);
  setFiringArcsVisible(combatant, next);
  return next;
}

function clearConsoleArcs(combatant = null) {
  if (combatant?.id) {
    setFiringArcsVisible(combatant, false);
    return;
  }
  for (const entry of [...(game.combat?.combatants ?? [])]) {
    if (entry?.id && firingArcsVisible(entry)) setFiringArcsVisible(entry, false);
  }
}

export class ArkflightCombatConsole extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-combat-console",
    classes: ["arkflight", "arkflight-combat-console", "arkflight-combat-strip"],
    position: { width: 1100, height: 118 },
    window: {
      title: "Arkflight Combat Console",
      icon: "fa-solid fa-crosshairs",
      resizable: false,
      minimizable: true
    }
  };

  static PARTS = {
    console: { template: "modules/arkflight-game/templates/combat-console.hbs" }
  };

  constructor(options = {}) {
    super(options);
    this.actorId = options.actorId ?? null;
    this.selectedStation = options.selectedStation ?? "battlewatch";
    this.selectedTargetId = options.selectedTargetId ?? null;
    this.selectedWeaponKey = options.selectedWeaponKey ?? null;
    this.lastShot = null;
    this.openPanel = options.openPanel ?? null;
  }

  get actor() {
    return this.actorId ? game.actors?.get(this.actorId) ?? null : null;
  }

  setReference(reference) {
    const actor = actorFromReference(reference);
    if (!actor || !isArkflightShip(actor)) return false;
    const changed = this.actorId !== actor.id;
    this.actorId = actor.id;
    if (changed) {
      this.selectedTargetId = null;
      this.selectedWeaponKey = null;
      this.lastShot = null;
    }
    if (this.rendered) this.render({ force: true });
    return true;
  }

  open(reference = null) {
    if (reference) this.setReference(reference);
    if (!this.actor) {
      const token = canvas?.tokens?.controlled?.find((entry) => isArkflightShip(entry.actor))
        ?? canvas?.tokens?.placeables?.find((entry) => isArkflightShip(entry.actor));
      if (token) this.actorId = token.actor.id;
    }
    if (!this.actor) {
      ui.notifications?.warn("Select an Arkflight ship token first.");
      return this;
    }
    return this.render({ force: true });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const api = game.arkflight?.combat;
    const combatant = activeCombatant(actor);
    const state = combatant ? api?.state?.(combatant) : null;
    const round = Math.max(1, Number(game.combat?.round ?? 1));
    const targets = combatant ? [...(api?.targets?.(combatant) ?? [])] : [];
    const weapons = buildWeapons(state, round);

    if (!weapons.some((entry) => entry.key === this.selectedWeaponKey)) this.selectedWeaponKey = weapons[0]?.key ?? null;
    const canvasTarget = canvasTargetCombatant(targets);
    if (!targets.some((entry) => entry.id === this.selectedTargetId)) this.selectedTargetId = canvasTarget?.id ?? targets[0]?.id ?? null;
    const targetCombatant = targets.find((entry) => entry.id === this.selectedTargetId) ?? null;
    const target = targetSummary(targetCombatant, this.selectedWeaponKey, combatant);
    const battlewatchFireControl = combatant ? api?.stationActionControl?.("battlewatch-fire-weapon", combatant) ?? { ok: false } : { ok: false };
    const commonReloadControl = combatant ? api?.stationActionControl?.("common-reload-weapon", combatant) ?? { ok: false } : { ok: false };
    const commonReloadAvailability = combatant ? api?.stationActionAvailability?.("common-reload-weapon", combatant) ?? { ok: false } : { ok: false };
    const workGunsControl = combatant ? api?.stationActionControl?.("battlewatch-reload-weapon", combatant) ?? { ok: false } : { ok: false };
    const workGunsAvailability = combatant ? api?.stationActionAvailability?.("battlewatch-reload-weapon", combatant) ?? { ok: false } : { ok: false };
    const arcVisible = Boolean(combatant && firingArcsVisible(combatant));
    const undoStatus = combatant ? api?.movementUndoStatus?.(combatant) ?? {} : {};
    const stationRows = STATIONS.map((entry) => ({
      ...entry,
      active: entry.id === this.selectedStation,
      crew: combatant ? crewName(api, combatant, entry.id) : "Offline"
    }));
    const actions = state
      ? buildStationActions(api, combatant, actor, this.selectedStation, targets, weapons, this.selectedWeaponKey, this.selectedTargetId)
      : [];

    for (const weapon of weapons) {
      weapon.selected = weapon.key === this.selectedWeaponKey;
      weapon.arcVisible = Boolean(combatant && firingArcWeaponVisible(combatant, weapon.key));
      weapon.arcButtonLabel = weapon.arcVisible ? "Hide Arc" : "Show Arc";
      if (targetCombatant) {
        try {
          const solution = api.targetingSolution(weapon.key, targetCombatant, combatant);
          weapon.legal = Boolean(solution.legal);
          weapon.solution = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "IN ARC" : "OUT OF ARC"}`;
        } catch (_error) {
          weapon.legal = false;
          weapon.solution = "No firing solution";
        }
      } else {
        weapon.legal = false;
        weapon.solution = "No target";
      }
      weapon.statusLabel = weapon.ready ? "Ready" : `Reload ${weapon.remaining}`;
      weapon.canFire = Boolean(battlewatchFireControl.ok && game.combat?.combatant?.id === combatant?.id && weapon.ready && weapon.legal && Number(state?.economy?.ap?.value ?? 0) >= 1);
      weapon.canReload = Boolean(commonReloadControl.ok && commonReloadAvailability.ok && game.combat?.combatant?.id === combatant?.id && !weapon.ready && Number(state?.economy?.ap?.value ?? 0) >= 1);
      weapon.showWorkGuns = Boolean(workGunsControl.ok && game.combat?.combatant?.id === combatant?.id && !weapon.ready && Number(weapon.remaining ?? 0) <= 2);
      weapon.canWorkGuns = Boolean(weapon.showWorkGuns && workGunsAvailability.ok);
    }

    const ap = Number(state?.economy?.ap?.value ?? 0);
    const apMax = Number(state?.economy?.ap?.max ?? 0);
    const rp = Number(state?.economy?.rp?.value ?? 0);
    const rpMax = Number(state?.economy?.rp?.max ?? 0);
    const strain = Number(state?.strain?.value ?? 0);
    const strainMax = Number(state?.strain?.max ?? 0);

    return {
      ...context,
      actorId: actor?.id ?? "",
      shipName: actor?.name ?? "Arkflight Ship",
      shipImg: actor?.img ?? "",
      offline: !actor || !game.combat || !combatant || !state,
      offlineReason: !game.combat
        ? "No active Foundry combat."
        : !combatant
          ? `${actor?.name ?? "This ship"} is not in the active combat.`
          : "Arkflight combat state is not initialized.",
      stationRows,
      actions,
      hasActions: actions.length > 0,
      targets: targets.map((entry) => ({ id: entry.id, name: entry.name, selected: entry.id === this.selectedTargetId })),
      hasTargets: targets.length > 0,
      target,
      targetName: target?.name ?? "No Target",
      weapons,
      weaponGroups: groupWeapons(weapons),
      hasWeapons: weapons.length > 0,
      selectedWeaponKey: this.selectedWeaponKey,
      canFireSelected: Boolean(
        battlewatchFireControl.ok
        && combatant
        && game.combat?.combatant?.id === combatant.id
        && target?.legal
        && weapons.find((entry) => entry.key === this.selectedWeaponKey)?.ready
        && Number(state?.economy?.ap?.value ?? 0) >= 1
      ),
      arcVisible,
      arcButtonLabel: arcVisible ? "Hide Weapon Arcs" : "Show Weapon Arcs",
      canUndoMove: Boolean(game.user?.isGM && undoStatus.canUndoMove),
      canUndoFacing: Boolean(game.user?.isGM && undoStatus.canUndoFacing),
      canResetTurnPosition: Boolean(game.user?.isGM && undoStatus.canResetPosition),
      showUndoControls: Boolean(undoStatus.canResetPosition),
      resources: {
        round,
        ap,
        apMax,
        apSpent: Math.max(0, apMax - ap),
        apPips: buildResourcePips(ap, apMax, 8),
        rp,
        rpMax,
        rpSpent: Math.max(0, rpMax - rp),
        rpPips: buildResourcePips(rp, rpMax, 6),
        strain,
        strainMax,
        strainPips: buildResourcePips(strain, strainMax, 10),
        heading: Number(state?.mobility?.heading ?? 0)
      },
      activeTurn: Boolean(combatant && game.combat?.combatant?.id === combatant.id),
      currentStationLabel: stationRows.find((entry) => entry.active)?.label ?? "Battlewatch",
      lastShot: this.lastShot,
      logEntries: buildLogEntries(state, this.lastShot),
      openStations: this.openPanel === "stations",
      openWeapons: this.openPanel === "weapons",
      openLog: this.openPanel === "log",
      gm: Boolean(game.user?.isGM),
      canEndTurn: Boolean(combatant && api?.canEndTurn?.(combatant))
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;
    this.#dockStrip();

    const actor = this.actor;
    const api = game.arkflight?.combat;
    const combatant = activeCombatant(actor);

    for (const button of root.querySelectorAll("[data-toggle-panel]")) {
      button.addEventListener("click", () => {
        const panel = button.dataset.togglePanel;
        this.openPanel = this.openPanel === panel ? null : panel;
        this.render({ force: true });
      });
    }

    root.querySelector("[data-end-turn]")?.addEventListener("click", async () => {
      if (!combatant || typeof api?.endTurn !== "function") return;
      try {
        await api.endTurn(combatant);
      } catch (error) {
        console.error("Arkflight combat console end turn failed", error);
        ui.notifications?.error?.(error?.message ?? "End Turn failed.");
      }
    });

    const bindUndo = (selector, action, failureLabel) => {
      root.querySelector(selector)?.addEventListener("click", async () => {
        if (!game.user?.isGM || !combatant || typeof api?.[action] !== "function") return;
        try {
          await api[action](combatant);
          this.render({ force: true });
        } catch (error) {
          console.error(`Arkflight combat console ${failureLabel} failed`, error);
          ui.notifications?.error(error?.message ?? failureLabel);
        }
      });
    };
    bindUndo("[data-undo-move]", "undoMove", "Undo Move");
    bindUndo("[data-undo-facing]", "undoFacing", "Undo Facing");
    bindUndo("[data-reset-turn-position]", "resetTurnPosition", "Reset Turn Position");

    for (const button of root.querySelectorAll("[data-station]")) {
      button.addEventListener("click", () => {
        this.selectedStation = button.dataset.station;
        this.render({ force: true });
      });
    }

    root.querySelector("[data-target-select]")?.addEventListener("change", (event) => {
      this.selectedTargetId = event.currentTarget.value || null;
      const target = [...(api?.targets?.(combatant) ?? [])].find((entry) => entry.id === this.selectedTargetId);
      if (target) targetOnCanvas(target);
      this.render({ force: true });
    });

    root.querySelector("[data-use-canvas-target]")?.addEventListener("click", () => {
      const targets = [...(api?.targets?.(combatant) ?? [])];
      const target = canvasTargetCombatant(targets);
      if (!target) return ui.notifications?.warn("Target an Arkflight ship token on the canvas first.");
      this.selectedTargetId = target.id;
      this.render({ force: true });
    });

    root.querySelector("[data-lock-target]")?.addEventListener("click", () => {
      const target = [...(api?.targets?.(combatant) ?? [])].find((entry) => entry.id === this.selectedTargetId);
      if (!target) return ui.notifications?.warn("Choose a target ship first.");
      targetOnCanvas(target);
    });

    root.querySelector("[data-toggle-all-arcs]")?.addEventListener("click", () => {
      if (!combatant) return;
      toggleAllConsoleArcs(combatant);
      this.render({ force: true });
    });

    for (const button of root.querySelectorAll("[data-toggle-weapon-arc]")) {
      button.addEventListener("click", () => {
        if (!combatant) return;
        const weaponKey = button.dataset.toggleWeaponArc;
        if (!weaponKey) return;
        toggleWeaponFiringArc(combatant, weaponKey);
        this.render({ force: true });
      });
    }

    root.querySelector("[data-fire-selected]")?.addEventListener("click", () => this.#fireSelected(combatant));

    for (const button of root.querySelectorAll("[data-fire-weapon]")) {
      button.addEventListener("click", async () => {
        this.selectedWeaponKey = button.dataset.fireWeapon;
        await this.#fireSelected(combatant, this.selectedWeaponKey);
      });
    }

    for (const button of root.querySelectorAll("[data-work-weapon]")) {
      button.addEventListener("click", async () => {
        const key = button.dataset.workWeapon;
        if (!key) return;
        try {
          await api.stationAction("common-reload-weapon", { weaponKey: key, selection: key }, combatant);
          this.render({ force: true });
        } catch (error) {
          console.error("Arkflight combat console reload failed", error);
          ui.notifications?.error(error?.message ?? "Reload failed.");
        }
      });
    }

    for (const button of root.querySelectorAll("[data-work-guns]")) {
      button.addEventListener("click", async () => {
        const key = button.dataset.workGuns;
        if (!key) return;
        try {
          await api.stationAction("battlewatch-reload-weapon", { weaponKey: key, selection: key }, combatant);
          this.render({ force: true });
        } catch (error) {
          console.error("Arkflight combat console Work the Guns failed", error);
          ui.notifications?.error(error?.message ?? "Work the Guns failed.");
        }
      });
    }

    for (const button of root.querySelectorAll("[data-station-action]")) {
      button.addEventListener("click", async () => {
        const actionId = button.dataset.stationAction;
        const action = api?.actions?.[actionId] ?? [...(api?.stationActions?.(this.selectedStation) ?? [])].find((entry) => entry.id === actionId);
        if (!action) return;
        const card = button.closest("[data-action-card]");
        const selection = card?.querySelector("[data-action-choice]")?.value ?? null;
        try {
          button.disabled = true;
          if (action.rules?.resolver === "fireAtTarget") {
            if (!this.selectedWeaponKey || !this.selectedTargetId) throw new Error("Choose a weapon and target first.");
            await api.stationAction(actionId, { selection, weaponKey: this.selectedWeaponKey, targetId: this.selectedTargetId }, combatant);
          } else if (action.rules?.resolver === "workTheGuns") {
            const weaponKey = selection || this.selectedWeaponKey;
            if (!weaponKey) throw new Error("Choose an installed weapon first.");
            await api.stationAction(actionId, { selection: weaponKey, weaponKey }, combatant);
          } else await api.stationAction(actionId, { selection }, combatant);
          this.render({ force: true });
        } catch (error) {
          console.error("Arkflight combat console action failed", error);
          ui.notifications?.error(error?.message ?? `${action.name} failed.`);
          button.disabled = false;
        }
      });
    }
  }

  #dockStrip() {
    if (!this.positionedOnce) {
      this.positionedOnce = true;
      const width = 1100;
      const height = 118;
      const left = Math.max(16, Math.round((window.innerWidth - width) / 2));
      const top = Math.max(16, window.innerHeight - height - 84);
      try { this.setPosition?.({ width, height, left, top }); } catch (_error) { /* noop */ }
    }
  }

  async #fireSelected(combatant, key = null) {
    const api = game.arkflight?.combat;
    if (key) this.selectedWeaponKey = key;
    if (!combatant || !this.selectedWeaponKey || !this.selectedTargetId) {
      ui.notifications?.warn("Choose a ready weapon and target first.");
      return null;
    }
    try {
      const result = await api.stationAction("battlewatch-fire-weapon", {
        weaponKey: this.selectedWeaponKey,
        targetId: this.selectedTargetId,
        selection: this.selectedTargetId
      }, combatant);
      if (result?.requested) {
        this.render({ force: true });
        return result;
      }
      this.lastShot = {
        weapon: result.solution?.weapon?.name ?? "Ship Weapon",
        target: result.solution?.target?.name ?? "Target",
        attack: Number(result.attack?.total ?? 0),
        degree: ({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" })[result.degree] ?? "Resolved",
        damage: Number(result.damage?.incoming ?? 0),
        hardness: Number(result.damage?.absorbed ?? 0),
        hullDamage: Number(result.damage?.hullDamage ?? 0),
        hullBefore: result.damage?.before ?? null,
        hullAfter: result.damage?.after ?? null,
        hit: Boolean(result.damage)
      };
      redrawConsoleArcs(combatant);
      this.openPanel = "log";
      this.render({ force: true });
      return result;
    } catch (error) {
      console.error("Arkflight combat console weapon fire failed", error);
      ui.notifications?.error(error?.message ?? "Weapon fire failed.");
      return null;
    }
  }

  async close(options = {}) {
    const combatant = activeCombatant(this.actor);
    if (combatant) clearConsoleArcs(combatant);
    this.positionedOnce = false;
    return super.close(options);
  }
}

export function openArkflightCombatConsole(reference = null) {
  combatConsole ??= new ArkflightCombatConsole();
  combatConsole.open(reference);
  return combatConsole;
}

function attachTokenCombatConsoleButton(hud, html = null) {
  const token = tokenDocumentFromHud(hud);
  const actor = token?.actor ?? null;
  if (!token || !isArkflightShip(actor)) return;
  const root = hudRoot(hud, html);
  if (!root || root.querySelector("[data-arkflight-combat-console]")) return;
  const column = root.querySelector(".right") ?? root.querySelector(".col.right") ?? root.querySelector("[data-column='right']");
  if (!column) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("control-icon", "arkflight-token-combat-console");
  button.dataset.arkflightCombatConsole = "true";
  button.dataset.tooltip = "Open Arkflight Combat Strip";
  button.title = "Open Arkflight Combat Strip";
  button.setAttribute("aria-label", "Open Arkflight Combat Strip");
  button.innerHTML = '<img class="arkflight-token-combat-emblem" src="modules/arkflight-game/assets/ui/branding/emblems/arkflight_weapons_crest.webp" alt="">';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openArkflightCombatConsole(token);
  });
  column.append(button);
}

function queueRefresh() {
  if (!combatConsole?.rendered || refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    if (combatConsole?.rendered) combatConsole.render({ force: true });
  });
}

Hooks.on("renderTokenHUD", attachTokenCombatConsoleButton);
Hooks.on("controlToken", (token, controlled) => {
  if (!controlled || !combatConsole?.rendered || !isArkflightShip(token?.actor)) return;
  combatConsole.setReference(token.document ?? token);
});
for (const hook of REFRESH_HOOKS) Hooks.on(hook, queueRefresh);
Hooks.on("updateToken", () => {
  if (!combatConsole?.rendered) return;
  const combatant = activeCombatant(combatConsole.actor);
  if (combatant && firingArcsVisible(combatant)) setTimeout(() => redrawConsoleArcs(combatant), 0);
});
Hooks.on("canvasReady", queueRefresh);
Hooks.on("tearDownCanvas", () => clearConsoleArcs());
Hooks.on("deleteCombat", () => {
  clearConsoleArcs();
  queueRefresh();
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.openCombatConsole = openArkflightCombatConsole;
  game.arkflight.combatConsole = Object.freeze({
    open: openArkflightCombatConsole,
    get application() { return combatConsole; }
  });
});
