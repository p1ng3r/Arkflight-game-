import {
  AREA_STATES,
  SHIP_AREA_KEYS
} from "../ship/ship-schema.js";
import {
  COMBAT_ACTION_TIMING,
  activeStationEffects,
  beginStationActionTurn,
  executeStationStateAction,
  getCoreCombatActionDefinitionsForStation,
  stationActionAvailability,
  stationActionEconomy,
  stationActionRulesText,
  stationActionStrainArea,
  stationEffectMagnitude,
  stationEffectProfile
} from "../combat/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const COMBAT_SOCKET = `module.${MODULE_ID}`;
const STATION_ACTION_REQUEST = "station-action-request";
const AREA_ORDER = Object.freeze([
  AREA_STATES.STABLE,
  AREA_STATES.STRESSED,
  AREA_STATES.DAMAGED,
  AREA_STATES.CRITICAL,
  AREA_STATES.DISABLED
]);

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may resolve Arkflight ship combat actions.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function assignedStationReference(actor, station) {
  return shipPayload(actor)?.crew?.stations?.[station] ?? null;
}

function resolveCrewActor(reference) {
  if (!reference) return null;
  if (reference?.documentName === "Actor") return reference;
  return game.actors?.get?.(reference)
    ?? game.actors?.contents?.find?.((actor) => actor.uuid === reference || actor.name === reference)
    ?? null;
}

function stationActor(shipActor, station) {
  return resolveCrewActor(assignedStationReference(shipActor, station));
}

function activePrimaryGM() {
  return [...(game.users ?? [])]
    .filter((user) => user?.active && user?.isGM)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function userOwnsActor(user, actor) {
  if (!user || !actor) return false;
  if (user.isGM) return true;
  try { return actor.testUserPermission?.(user, "OWNER") === true; }
  catch (_error) { return false; }
}

function stationControl(base, actionId, reference = null, user = game.user) {
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  const action = base.actions?.[actionId] ?? null;
  if (!combatant || !action) {
    return Object.freeze({
      ok: false,
      reason: !combatant ? "combatant-required" : "unknown-action",
      combatant,
      action,
      crewActor: null
    });
  }

  const crewActor = stationActor(combatant.actor, action.station);
  if (!crewActor) return Object.freeze({ ok: false, reason: "station-unassigned", combatant, action, crewActor: null });
  if (!userOwnsActor(user, crewActor)) {
    return Object.freeze({ ok: false, reason: "not-your-station", combatant, action, crewActor });
  }
  return Object.freeze({ ok: true, reason: null, combatant, action, crewActor });
}

function sanitizeStationOptions(options = {}) {
  return Object.freeze({
    selection: options.selection ?? null,
    targetId: options.targetId ?? null,
    station: options.station ?? null,
    facing: options.facing ?? null,
    system: options.system ?? null,
    choice: options.choice ?? null,
    weaponKey: options.weaponKey ?? null
  });
}

function improveAreaState(value, steps = 1) {
  let index = AREA_ORDER.indexOf(value);
  if (index < 0) index = 0;
  index = Math.max(0, index - Math.max(1, Math.trunc(Number(steps) || 1)));
  return AREA_ORDER[index] ?? AREA_STATES.STABLE;
}

function degradeAreaState(value) {
  let index = AREA_ORDER.indexOf(value);
  if (index < 0) index = 0;
  return AREA_ORDER[Math.min(AREA_ORDER.length - 1, index + 1)] ?? AREA_STATES.DISABLED;
}

function actionSelection(action, options = {}) {
  return options.selection ?? options.targetId ?? options.station ?? options.facing ?? options.system ?? options.choice ?? null;
}

function resourceValue(ship, key) {
  return Math.max(0, Number(ship?.resources?.[key]?.value) || 0);
}

function persistentCostAvailability(actor, action) {
  const ship = shipPayload(actor);
  if (!ship) return Object.freeze({ ok: false, reason: "ship-required" });
  const cost = stationActionEconomy(action, shipLevel(actor));
  for (const key of ["morale", "supplies", "lifeveil"]) {
    if (cost[key] > resourceValue(ship, key)) return Object.freeze({ ok: false, reason: `insufficient-${key}` });
  }
  return Object.freeze({ ok: true, reason: null });
}

function effectiveStrainGain(beforeState, action, level) {
  let gain = stationActionEconomy(action, level).strain;
  if (gain <= 0) return 0;
  if (action.station === "engineer" && action.timing === COMBAT_ACTION_TIMING.ACTION) {
    const bypass = [...(beforeState?.stationRuntime?.effects ?? [])].find((effect) =>
      effect.actionId === "engineer-emergency-bypass"
      && (effect.charges == null || Number(effect.charges) > 0)
    );
    if (bypass) gain = Math.max(0, gain - Math.min(gain, stationEffectMagnitude(bypass, level)));
  }
  return gain;
}

function resolveStrainThreshold(actor, action, beforeState, afterState) {
  const level = shipLevel(actor);
  const gain = effectiveStrainGain(beforeState, action, level);
  const max = Math.max(0, Number(beforeState?.strain?.max) || Number(afterState?.strain?.max) || 0);
  const raw = Math.max(0, Number(beforeState?.strain?.value) || 0) + gain;
  const area = stationActionStrainArea(action);
  if (gain <= 0 || max <= 0 || raw < max || !area) return Object.freeze({ state: afterState, threshold: null });

  const ship = shipPayload(actor);
  const currentArea = ship?.areas?.[area]?.state ?? AREA_STATES.STABLE;
  const nextArea = degradeAreaState(currentArea);
  const overflow = Math.max(0, raw - max);
  const state = Object.freeze({
    ...afterState,
    strain: Object.freeze({ ...afterState.strain, value: overflow, max })
  });
  return Object.freeze({
    state,
    threshold: Object.freeze({ area, currentArea, nextArea, overflow, max })
  });
}

async function updatePersistentShipForAction(actor, action, options, beforeState, afterState, threshold = null) {
  const ship = shipPayload(actor);
  if (!ship) return [];
  const patches = {};
  const notes = [];
  const resolver = action.rules?.resolver;
  const selection = actionSelection(action, options);
  const level = shipLevel(actor);
  const profile = stationEffectProfile(level);
  const cost = stationActionEconomy(action, level);

  for (const key of ["morale", "supplies", "lifeveil"]) {
    const amount = cost[key];
    if (!amount) continue;
    const current = resourceValue(ship, key);
    if (current < amount) throw new Error(`${action.name} requires ${amount} ${key}.`);
    const next = current - amount;
    patches[`flags.${MODULE_ID}.ship.resources.${key}.value`] = next;
    notes.push(`${key[0].toUpperCase()}${key.slice(1)} ${current} → ${next}`);
  }

  if (Number(beforeState?.strain?.value ?? 0) !== Number(afterState?.strain?.value ?? 0)) {
    patches[`flags.${MODULE_ID}.ship.resources.strain.value`] = Number(afterState.strain.value);
    notes.push(`Strain ${Number(beforeState?.strain?.value ?? 0)} → ${Number(afterState.strain.value)}`);
  }

  if (threshold) {
    patches[`flags.${MODULE_ID}.ship.areas.${threshold.area}.state`] = threshold.nextArea;
    notes.push(`Strain Limit: ${threshold.area} ${threshold.currentArea} → ${threshold.nextArea}; ${threshold.overflow} Strain overflow remains.`);
  }

  if (resolver === "rallyCrew") {
    const currentArea = ship.areas?.morale?.state ?? AREA_STATES.STABLE;
    if (currentArea !== AREA_STATES.STABLE) {
      const nextArea = improveAreaState(currentArea, 1);
      patches[`flags.${MODULE_ID}.ship.areas.morale.state`] = nextArea;
      notes.push(`Morale area ${currentArea} → ${nextArea}`);
      if (profile.master) {
        const current = resourceValue(ship, "morale");
        const max = Math.max(current, Number(ship.resources?.morale?.max) || 0);
        const next = Math.min(max, current + profile.bonus);
        patches[`flags.${MODULE_ID}.ship.resources.morale.value`] = next;
        notes.push(`Morale ${current} → ${next}`);
      }
    } else {
      const current = resourceValue(ship, "morale");
      const max = Math.max(current, Number(ship.resources?.morale?.max) || 0);
      const next = Math.min(max, current + profile.bonus);
      patches[`flags.${MODULE_ID}.ship.resources.morale.value`] = next;
      notes.push(`Morale ${current} → ${next}`);
    }
  }

  if (resolver === "emergencyRepair") {
    const system = SHIP_AREA_KEYS.includes(selection) && selection !== "morale" ? selection : null;
    if (!system) throw new Error("Emergency Repair requires a Hull, Arkengine, Rigging, or Lifeveil area.");
    const current = ship.areas?.[system]?.state ?? AREA_STATES.STABLE;
    const steps = profile.master ? 2 : 1;
    const next = improveAreaState(current, steps);
    patches[`flags.${MODULE_ID}.ship.areas.${system}.state`] = next;
    notes.push(`${system} area ${current} → ${next}`);
  }

  if (resolver === "mendLifeveil") {
    const current = resourceValue(ship, "lifeveil");
    const max = Math.max(current, Number(ship.resources?.lifeveil?.max) || 0);
    const restore = 5 * profile.bonus;
    const next = Math.min(max, current + restore);
    patches[`flags.${MODULE_ID}.ship.resources.lifeveil.value`] = next;
    notes.push(`Lifeveil ${current} → ${next}`);
  }

  if (resolver === "purgeInterference") {
    const conditions = [...(ship.conditions ?? [])];
    const index = Math.trunc(Number(selection));
    if (Number.isInteger(index) && index >= 0 && index < conditions.length) {
      const [removed] = conditions.splice(index, 1);
      patches[`flags.${MODULE_ID}.ship.conditions`] = conditions;
      notes.push(`Purged ${typeof removed === "string" ? removed : removed?.name ?? removed?.id ?? "interference"}`);
    } else if (conditions.length) {
      throw new Error("Choose a ship condition to purge.");
    } else {
      notes.push("No tracked ship interference is present.");
    }
  }

  if (Object.keys(patches).length) await actor.update(patches);
  return notes;
}

function actionCostLabel(action, actor) {
  if (action.rules?.costSource === "weapon.fireAP") return "Weapon AP";
  const cost = stationActionEconomy(action, shipLevel(actor));
  const parts = [];
  if (cost.ap > 0) parts.push(`${cost.ap} AP`);
  if (cost.rp > 0) parts.push(`${cost.rp} RP`);
  if (cost.morale > 0) parts.push(`${cost.morale} Morale`);
  if (cost.supplies > 0) parts.push(`${cost.supplies} Supplies`);
  if (cost.lifeveil > 0) parts.push(`${cost.lifeveil} Lifeveil`);
  if (cost.strain > 0) parts.push(`+${cost.strain} Strain`);
  if (action.id === "captain-drive-the-crew") parts.unshift("Gain +1 AP");
  return parts.join(" · ") || "No cost";
}

async function postActionChat({ actor, crewActor, action, selection, notes = [] }) {
  const esc = foundry.utils.escapeHTML;
  const selectionLine = selection == null || selection === ""
    ? ""
    : `<br><strong>Choice:</strong> ${esc(String(selection).replaceAll("-", " "))}`;
  const notesLine = notes.length ? `<br><strong>Effect:</strong> ${notes.map((entry) => esc(entry)).join(" · ")}` : "";
  const profile = stationEffectProfile(shipLevel(actor));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: crewActor ?? actor }),
    content: `<div class="arkflight-chat-card arkflight-station-action-chat"><strong>${esc(actor.name)} — ${esc(action.name)}</strong><br><em>${esc(action.station)} ${action.timing}</em> · ${esc(actionCostLabel(action, actor))} · Station Bonus +${profile.bonus}${selectionLine}${notesLine}<hr><p>${esc(stationActionRulesText(action))}</p></div>`
  });
}

function runtimeAvailability(base, actionId, reference = null) {
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  const action = base.actions?.[actionId] ?? null;
  if (!combatant || !action) return Object.freeze({ ok: false, reason: !combatant ? "combatant-required" : "unknown-action" });
  const crew = stationActor(combatant.actor, action.station);
  if (!crew) return Object.freeze({ ok: false, reason: "station-unassigned" });
  if (action.timing === COMBAT_ACTION_TIMING.ACTION && game.combat?.combatant?.id !== combatant.id) {
    return Object.freeze({ ok: false, reason: "not-this-ships-turn" });
  }
  const stateAvailability = stationActionAvailability(base.state(combatant), action, { round: game.combat?.round ?? 1, shipLevel: shipLevel(combatant.actor) });
  if (!stateAvailability.ok) return stateAvailability;
  return persistentCostAvailability(combatant.actor, action);
}

async function executeAuthoritative(base, actionId, options = {}, reference = null) {
  requireGM();
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  if (!combatant) throw new Error("Choose an Arkflight ship Combatant.");
  const action = base.actions?.[actionId] ?? null;
  if (!action) throw new Error(`Unknown Arkflight combat action: ${actionId}`);
  const crewActor = stationActor(combatant.actor, action.station);
  if (!crewActor) throw new Error(`${combatant.name} has no ${action.station} assigned.`);
  if (action.timing === COMBAT_ACTION_TIMING.ACTION && game.combat?.combatant?.id !== combatant.id) {
    throw new Error(`${action.name} can be used only during ${combatant.name}'s combat turn.`);
  }
  const costCheck = persistentCostAvailability(combatant.actor, action);
  if (!costCheck.ok) throw new Error(`${action.name} is unavailable: ${costCheck.reason}.`);

  const resolver = action.rules?.resolver;
  if (resolver === "fireAtTarget") {
    if (!options.weaponKey || !options.targetId) throw new Error("Fire Weapon requires a weapon and target.");
    const fire = game.arkflight?.combat?.fireAtTarget ?? base.fireAtTarget;
    return fire(options.weaponKey, options.targetId, combatant);
  }
  if (resolver === "workTheGuns") {
    if (!options.weaponKey) throw new Error("Reload requires an installed weapon.");
    const result = await base.workTheGuns(options.weaponKey, combatant);
    const state = base.state(combatant);
    const notes = await updatePersistentShipForAction(combatant.actor, action, options, state, state);
    if (notes.length) await postActionChat({ actor: combatant.actor, crewActor, action, selection: options.weaponKey, notes });
    return result;
  }

  const before = base.state(combatant);
  const selection = actionSelection(action, options);
  const level = shipLevel(combatant.actor);
  const profile = stationEffectProfile(level);
  const rawAfter = executeStationStateAction(before, action, {
    round: game.combat?.round ?? 1,
    selection,
    shipLevel: level
  });
  const strainResolution = resolveStrainThreshold(combatant.actor, action, before, rawAfter);
  const after = strainResolution.state;
  await combatant.update({ [STATE_PATH]: after });
  const notes = await updatePersistentShipForAction(combatant.actor, action, options, before, after, strainResolution.threshold);

  if (resolver === "issueOrder") notes.push("Applies only to the chosen station's next qualifying roll; fixed effects are not inflated.");
  if (resolver === "coordinateAssault") notes.push(`Target Hardness reduced by ${profile.bonus} for ${profile.advanced ? 2 : 1} qualifying attack${profile.advanced ? "s" : ""}.`);
  if (resolver === "driveCrew") notes.push(`Gain +1 AP this turn; spend 1 Morale; +${stationActionEconomy(action, level).strain} Strain.`);
  if (resolver === "ventStrain") notes.push(`Vents up to ${1 + profile.bonus} Strain.`);
  if (resolver === "hardTurn") notes.push(`+${Math.max(1, Number(before?.mobility?.maneuverability) || 1) + profile.bonus} maneuver allowance; pivot permitted.`);
  if (resolver === "overchargeArkengine") notes.push(`+${before?.mobility?.speed ?? 0} movement and +${before?.mobility?.maneuverability ?? 0} maneuver allowance; +2 Strain.`);
  if (resolver === "redistributePower" && selection === "propulsion") notes.push(`+${profile.bonus} movement and +1 maneuver allowance; +1 Strain.`);
  if (resolver === "redistributePower" && selection === "weapons") notes.push(`Next ${profile.advanced ? 2 : 1} weapon attack${profile.advanced ? "s" : ""} gain +${profile.bonus} damage; +1 Strain.`);
  if (resolver === "redistributePower" && selection === "lifeveil") notes.push(`Next ${profile.advanced ? 2 : 1} wardable hit${profile.advanced ? "s" : ""} gain ${2 * profile.bonus} mitigation; +1 Strain.`);
  if (resolver === "setAttackVector") notes.push(`Selected facing gains ${15 * profile.bonus}° extra firing-arc tolerance while heading is unchanged.`);
  if (resolver === "readyBroadside") notes.push(`Spend 1 Supply; selected battery's next shot gains +${2 * profile.bonus} damage${profile.master ? " and reduces reload by 1" : ""}.`);
  if (resolver === "reinforceLifeveil") notes.push(`Spend 5 Lifeveil; next ${profile.advanced ? 2 : 1} wardable hit${profile.advanced ? "s" : ""} reduce damage by ${2 * profile.bonus}.`);
  if (resolver === "focusWard") notes.push(`Spend 10 Lifeveil; next ${profile.advanced ? 2 : 1} matching hit${profile.advanced ? "s" : ""} reduce damage by ${3 * profile.bonus}.`);
  if (action.timing === COMBAT_ACTION_TIMING.REACTION) notes.push("Reaction resolves against the current trigger and consumes shared RP.");

  if (strainResolution.threshold) {
    ui.notifications?.warn(`${combatant.name}: Strain Limit reached — ${strainResolution.threshold.area} ${strainResolution.threshold.currentArea} → ${strainResolution.threshold.nextArea}.`);
    Hooks.callAll("arkflightShipDamageStateChanged", { actor: combatant.actor, combatant, action, strainThreshold: strainResolution.threshold, notes });
  }

  await postActionChat({ actor: combatant.actor, crewActor, action, selection, notes });
  Hooks.callAll("arkflightStationActionResolved", {
    combat: game.combat,
    combatant,
    actor: combatant.actor,
    crewActor,
    action,
    selection,
    state: after,
    notes
  });
  return Object.freeze({ combatant, actor: combatant.actor, crewActor, action, selection, state: after, notes: Object.freeze([...notes]) });
}

async function requestStationAction(base, actionId, options = {}, reference = null) {
  const control = stationControl(base, actionId, reference);
  if (!control.ok) {
    if (control.reason === "not-your-station") throw new Error(`Only the player assigned to ${control.action?.station ?? "that"} station may use this action.`);
    throw new Error(`Station action unavailable: ${control.reason}.`);
  }

  const availability = runtimeAvailability(base, actionId, control.combatant);
  if (!availability.ok) throw new Error(`Station action unavailable: ${availability.reason}.`);

  if (game.user?.isGM) return executeAuthoritative(base, actionId, options, control.combatant);

  const primary = activePrimaryGM();
  if (!primary) throw new Error("An active GM is required to resolve Arkflight combat actions.");

  game.socket?.emit?.(COMBAT_SOCKET, {
    type: STATION_ACTION_REQUEST,
    userId: game.user.id,
    combatId: game.combat?.id ?? null,
    combatantId: control.combatant.id,
    actionId,
    options: sanitizeStationOptions(options)
  });
  return Object.freeze({ requested: true, combatant: control.combatant, action: control.action });
}

async function handleStationActionSocket(base, payload = {}) {
  if (!game.user?.isGM || payload?.type !== STATION_ACTION_REQUEST) return;
  const primary = activePrimaryGM();
  if (!primary || primary.id !== game.user.id) return;

  const requester = game.users?.get?.(payload.userId) ?? null;
  const combat = game.combats?.get?.(payload.combatId) ?? game.combat;
  const combatant = combat?.combatants?.get?.(payload.combatantId)
    ?? combat?.combatants?.find?.((entry) => entry.id === payload.combatantId)
    ?? null;
  if (!requester || !requester.active || !combat || combat.id !== payload.combatId || !combatant) return;

  const control = stationControl(base, payload.actionId, combatant, requester);
  if (!control.ok) {
    console.warn("Arkflight | Rejected station action request", { reason: control.reason, userId: requester.id, actionId: payload.actionId });
    return;
  }

  const availability = runtimeAvailability(base, payload.actionId, combatant);
  if (!availability.ok) return;

  try {
    await executeAuthoritative(base, payload.actionId, payload.options ?? {}, combatant);
  } catch (error) {
    console.error("Arkflight | Player station action request failed", error);
  }
}

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  game.arkflight.combat = Object.freeze({
    ...base,
    stationActions(station) {
      return getCoreCombatActionDefinitionsForStation(station);
    },
    stationActor(reference, station) {
      const combatant = base.findCombatant(reference);
      return combatant ? stationActor(combatant.actor, station) : null;
    },
    stationEffects(reference = null, station = null) {
      const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
      return combatant ? activeStationEffects(base.state(combatant), { station }) : Object.freeze([]);
    },
    stationActionAvailability(actionId, reference = null) {
      return runtimeAvailability(base, actionId, reference);
    },
    stationActionControl(actionId, reference = null) {
      return stationControl(base, actionId, reference);
    },
    canUseStationAction(actionId, reference = null) {
      const control = stationControl(base, actionId, reference);
      return control.ok;
    },
    stationAction(actionId, options = {}, reference = null) {
      return requestStationAction(base, actionId, options, reference);
    }
  });
  game.socket?.on?.(COMBAT_SOCKET, (payload) => handleStationActionSocket(base, payload));
});

Hooks.on("arkflightCombatTurnChanged", async ({ combatant, state, round }) => {
  if (!game.user?.isGM || !combatant || !state) return;
  const next = beginStationActionTurn(state, round);
  await combatant.update({ [STATE_PATH]: next });
  Hooks.callAll("arkflightStationActionsRefreshed", { combatant, state: next, round });
});
