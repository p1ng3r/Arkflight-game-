import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { canonicalDamageTarget, improveShipCondition } from "../ship/ship-conditions.js";
import { resolveShipStrainGain } from "./ship-strain-runtime.js";
import {
  COMBAT_ACTION_TIMING,
  activeStationEffects,
  beginStationActionTurn,
  executeStationStateAction,
  getCoreCombatActionDefinitionsForStation,
  stationActionAvailability,
  stationActionEconomy,
  stationEffectMagnitude,
  reloadWeapon,
  reduceWeaponReload,
  weaponReloadRemaining,
  stationEffectProfile
} from "../combat/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const COMBAT_SOCKET = `module.${MODULE_ID}`;
const STATION_ACTION_REQUEST = "station-action-request";
const STATION_ACTION_RESULT = "station-action-result";
const ENGAGEMENT_RESOLVERS = new Set(["ramShip", "grappleShip", "breakGrapple", "boardShip"]);
const MOORED_BLOCKED_RESOLVERS = new Set(["buyMovement", "buyManeuver", "hardTurn", "overchargeArkengine", "impossibleBurn", "turnBetweenHeartbeats"]);

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function actionCapabilityAvailable(actor, action) {
  const required = action?.rules?.requiresCapability;
  if (!required) return true;
  const ship = shipPayload(actor);
  if (!ship) return false;
  try { return deriveShip(ship, SHIP_CATALOGS).capabilities.includes(required); }
  catch (_error) { return false; }
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

function assignedCrewActors(shipActor) {
  const refs = Object.values(shipPayload(shipActor)?.crew?.stations ?? {});
  const actors = refs.map((reference) => resolveCrewActor(reference)).filter(Boolean);
  return actors.filter((actor, index) => actors.findIndex((entry) => entry.id === actor.id) === index);
}

function actionCrewActor(shipActor, action, user = null) {
  if (action?.station !== "common") return stationActor(shipActor, action?.station);
  const assigned = assignedCrewActors(shipActor);
  if (!user || user?.isGM) return assigned[0] ?? shipActor ?? null;
  return assigned.find((actor) => userOwnsActor(user, actor))
    ?? (userOwnsActor(user, shipActor) ? shipActor : null);
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

function userCanUpdateDocument(user, document) {
  if (!user || !document) return false;
  if (user.isGM) return true;
  try {
    if (typeof document.canUserModify === "function") return document.canUserModify(user, "update") === true;
    return document.testUserPermission?.(user, "OWNER") === true;
  } catch (_error) {
    return false;
  }
}

function userOwnsShip(user, combatant) {
  return Boolean(combatant?.actor && userOwnsActor(user, combatant.actor));
}

function userCanResolveShipState(user, combatant) {
  if (!userOwnsShip(user, combatant) || !userCanUpdateDocument(user, combatant?.actor)) return false;
  try {
    return typeof combatant?.canUserModify !== "function"
      || combatant.canUserModify(user, "update") === true;
  } catch (_error) {
    return false;
  }
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

  if (!userOwnsShip(user, combatant)) {
    return Object.freeze({ ok: false, reason: "not-ship-owner", combatant, action, crewActor: null });
  }

  if (action.station === "common") {
    const crewActor = actionCrewActor(combatant.actor, action, user) ?? combatant.actor;
    return Object.freeze({ ok: true, reason: null, combatant, action, crewActor });
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

async function applyPersistentAction(actor, action, options, beforeState, rawAfterState) {
  const original = shipPayload(actor);
  if (!original) return Object.freeze({ ship: null, state: rawAfterState, notes: [], strainOutcome: null });
  let working = structuredClone(original);
  const notes = [];
  const resolver = action.rules?.resolver;
  const selection = actionSelection(action, options);
  const level = shipLevel(actor);
  const profile = stationEffectProfile(level);
  const cost = stationActionEconomy(action, level);

  for (const key of ["morale", "supplies", "lifeveil"]) {
    const amount = Math.max(0, Number(cost[key]) || 0);
    if (!amount) continue;
    const current = resourceValue(working, key);
    if (current < amount) throw new Error(`${action.name} requires ${amount} ${key}.`);
    const next = current - amount;
    working.resources[key] = { ...(working.resources?.[key] ?? {}), value: next };
    notes.push(`${key[0].toUpperCase()}${key.slice(1)} ${current} → ${next}`);
  }

  if (resolver === "rallyCrew") {
    const current = resourceValue(working, "morale");
    const next = Math.min(100, current + (20 * profile.bonus));
    working.resources.morale = { ...(working.resources?.morale ?? {}), value: next, max: 100 };
    notes.push(`Morale ${current} → ${next}`);
  }

  if (resolver === "emergencyRepair") {
    const target = canonicalDamageTarget(selection);
    const steps = profile.master ? 2 : 1;
    if (["hull", "drive", "weapons"].includes(target)) {
      const repaired = improveShipCondition(working, target, steps);
      working = repaired.ship;
      notes.push(`${target}: ${repaired.previous.label} → ${repaired.condition.label}`);
    } else if (target === "lifeveil") {
      const current = resourceValue(working, "lifeveil");
      const next = Math.min(100, current + 25 * steps);
      working.resources.lifeveil = { ...(working.resources?.lifeveil ?? {}), value: next, max: 100 };
      notes.push(`Lifeveil ${current}% → ${next}%`);
    } else {
      throw new Error("Emergency Repair requires Hull, Drive, Weapons, or Lifeveil.");
    }
  }

  if (resolver === "mendLifeveil") {
    const current = resourceValue(working, "lifeveil");
    const restore = 5 * profile.bonus;
    const next = Math.min(100, current + restore);
    working.resources.lifeveil = { ...(working.resources?.lifeveil ?? {}), value: next, max: 100 };
    notes.push(`Lifeveil ${current}% → ${next}%`);
  }

  if (resolver === "purgeInterference") {
    const conditions = [...(working.conditions ?? [])];
    const index = Math.trunc(Number(selection));
    if (Number.isInteger(index) && index >= 0 && index < conditions.length) {
      const [removed] = conditions.splice(index, 1);
      working.conditions = conditions;
      notes.push(`Purged ${typeof removed === "string" ? removed : removed?.name ?? removed?.id ?? "interference"}`);
    } else if (conditions.length) {
      throw new Error("Choose a ship condition to purge.");
    } else {
      notes.push("No tracked ship interference is present.");
    }
  }

  const strainGain = effectiveStrainGain(beforeState, action, level);
  const strainMax = Math.max(0, Number(beforeState?.strain?.max) || Number(rawAfterState?.strain?.max) || Number(working.resources?.strain?.max) || 0);
  let strainOutcome = null;
  let state = rawAfterState;
  if (strainGain > 0) {
    strainOutcome = await resolveShipStrainGain(working, {
      amount: strainGain,
      currentStrain: Number(beforeState?.strain?.value ?? 0),
      strainMax,
      sourceLabel: action.name,
      speaker: ChatMessage.getSpeaker({ actor })
    });
    working = structuredClone(strainOutcome.ship);
    state = Object.freeze({ ...rawAfterState, strain: strainOutcome.strain });
    notes.push(...strainOutcome.notes);
  } else {
    working.resources.strain = {
      ...(working.resources?.strain ?? {}),
      value: Math.max(0, Number(rawAfterState?.strain?.value ?? beforeState?.strain?.value ?? 0)),
      max: strainMax
    };
  }

  await actor.update({ [`flags.${MODULE_ID}.ship`]: working });
  return Object.freeze({ ship: working, state, notes: Object.freeze(notes), strainOutcome });
}

function actionCostLabel(action, actor) {
  const cost = stationActionEconomy(action, shipLevel(actor));
  const parts = [];
  if (cost.ap > 0) parts.push(`${cost.ap} AP`);
  if (cost.rp > 0) parts.push(`${cost.rp} RP`);
  if (cost.morale > 0) parts.push(`${cost.morale}% Morale`);
  if (cost.supplies > 0) parts.push(`${cost.supplies} Supplies`);
  if (cost.lifeveil > 0) parts.push(`${cost.lifeveil}% Lifeveil`);
  if (cost.strain > 0) parts.push(`+${cost.strain} Strain`);
  if (action.id === "captain-drive-the-crew") parts.unshift("Gain +1 AP");
  return parts.join(" · ") || "No cost";
}

async function postActionChat({ actor, crewActor, action, selection, notes = [], userId = game.user?.id ?? null }) {
  const esc = foundry.utils.escapeHTML;
  const profile = stationEffectProfile(shipLevel(actor));
  const choice = selection == null || selection === ""
    ? ""
    : `<span>Choice: ${esc(String(selection).replaceAll("-", " "))}</span>`;
  const notesLine = notes.length
    ? `<div class="arkflight-chat-action-notes">${notes.map((entry) => esc(entry)).join(" · ")}</div>`
    : "";
  const reactionClass = action.timing === COMBAT_ACTION_TIMING.REACTION ? " is-reaction" : "";
  await ChatMessage.create({
    user: userId,
    speaker: ChatMessage.getSpeaker({ actor: crewActor ?? actor }),
    content: `<div class="arkflight-chat-card arkflight-station-action-chat${reactionClass}">
      <div class="arkflight-chat-action-head"><strong>${esc(actor.name)} — ${esc(action.name)}</strong><span>${esc(actionCostLabel(action, actor))}</span></div>
      <div class="arkflight-chat-action-meta"><span>${esc(action.station)} · ${esc(action.timing)} · Bonus +${profile.bonus}</span>${choice}</div>
      ${notesLine}
    </div>`
  });
}

function runtimeAvailability(base, actionId, reference = null) {
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  const action = base.actions?.[actionId] ?? null;
  if (!combatant || !action) return Object.freeze({ ok: false, reason: !combatant ? "combatant-required" : "unknown-action" });
  if (action.station !== "common" && !stationActor(combatant.actor, action.station)) {
    return Object.freeze({ ok: false, reason: "station-unassigned" });
  }
  if (!actionCapabilityAvailable(combatant.actor, action)) {
    return Object.freeze({ ok: false, reason: "capability-required" });
  }
  if (action.timing === COMBAT_ACTION_TIMING.ACTION && game.combat?.combatant?.id !== combatant.id) {
    return Object.freeze({ ok: false, reason: "not-this-ships-turn" });
  }
  if (game.arkflight?.combatEngagement?.isMoored?.(combatant) && MOORED_BLOCKED_RESOLVERS.has(action.rules?.resolver)) {
    return Object.freeze({ ok: false, reason: "moored" });
  }
  const stateAvailability = stationActionAvailability(base.state(combatant), action, { round: game.combat?.round ?? 1, shipLevel: shipLevel(combatant.actor) });
  if (!stateAvailability.ok) return stateAvailability;
  return persistentCostAvailability(combatant.actor, action);
}

async function executeStationAction(base, actionId, options = {}, reference = null, {
  crewActorOverride = null,
  requesterUser = game.user,
  requesterUserId = requesterUser?.id ?? null
} = {}) {
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  if (!combatant) throw new Error("Choose an Arkflight ship Combatant.");
  const action = base.actions?.[actionId] ?? null;
  if (!action) throw new Error(`Unknown Arkflight combat action: ${actionId}`);
  const control = stationControl(base, actionId, combatant, requesterUser);
  if (!control.ok) throw new Error(`Station action unavailable: ${control.reason}.`);
  if (!userCanResolveShipState(game.user, combatant)) {
    throw new Error(`You do not have permission to update ${combatant.name}'s shared ship combat state.`);
  }
  const crewActor = crewActorOverride ?? control.crewActor ?? actionCrewActor(combatant.actor, action, requesterUser);
  if (!crewActor) {
    const label = action.station === "common" ? "assigned crew" : `${action.station} assigned`;
    throw new Error(`${combatant.name} has no ${label}.`);
  }
  if (action.timing === COMBAT_ACTION_TIMING.ACTION && game.combat?.combatant?.id !== combatant.id) {
    throw new Error(`${action.name} can be used only during ${combatant.name}'s combat turn.`);
  }
  const costCheck = persistentCostAvailability(combatant.actor, action);
  if (!costCheck.ok) throw new Error(`${action.name} is unavailable: ${costCheck.reason}.`);

  const resolver = action.rules?.resolver;
  let engagementTarget = null;
  if (ENGAGEMENT_RESOLVERS.has(resolver)) {
    const targetId = options.targetId ?? options.selection ?? null;
    if (!targetId) throw new Error(`${action.name} requires a target ship.`);
    const engagement = game.arkflight?.combatEngagement;
    if (!engagement?.preflight || !engagement?.resolve) throw new Error("Arkflight engagement runtime is unavailable.");
    const check = engagement.preflight(resolver, combatant, targetId);
    if (!check.ok) throw new Error(check.reason);
    engagementTarget = check.target;
  }
  if (resolver === "fireAtTarget") {
    if (!options.weaponKey || !options.targetId) throw new Error("Fire Weapon requires a weapon and target.");
    const fire = game.arkflight?.combat?.fireAtTarget ?? base.fireAtTarget;
    return fire(options.weaponKey, options.targetId, combatant, { requesterUserId });
  }
  if (resolver === "reloadWeapon") {
    if (!options.weaponKey) throw new Error("Reload requires an installed weapon.");
    const before = base.state(combatant);
    const round = Math.max(1, Number(game.combat?.round ?? 1));
    const state = reloadWeapon(before, options.weaponKey, round);
    const persistent = await applyPersistentAction(combatant.actor, action, options, before, state);
    const finalState = persistent.state;
    await combatant.update({ [STATE_PATH]: finalState });
    const weapon = finalState.weapons?.[options.weaponKey];
    const remaining = weaponReloadRemaining(weapon);
    const notes = [...persistent.notes];
    notes.push(`Reload action completed; ${remaining} Reload remaining.`);
    if (!options.suppressChat) await postActionChat({ actor: combatant.actor, crewActor, action, selection: options.weaponKey, notes, userId: requesterUserId });
    Hooks.callAll("arkflightStationActionResolved", {
      combat: game.combat,
      combatant,
      actor: combatant.actor,
      crewActor,
      action,
      selection: options.weaponKey,
      state: finalState,
      notes
    });
    return finalState;
  }

  const before = base.state(combatant);
  let selection = actionSelection(action, options);
  const level = shipLevel(combatant.actor);
  const profile = stationEffectProfile(level);
  const round = Math.max(1, Number(game.combat?.round ?? 1));
  let workTheGunsRemaining = null;

  if (resolver === "workTheGuns") {
    const weaponKey = options.weaponKey ?? selection;
    if (!weaponKey) throw new Error("Work the Guns requires an installed weapon.");
    const weapon = before?.weapons?.[weaponKey];
    if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
    const remaining = weaponReloadRemaining(weapon);
    if (remaining <= 0) throw new Error(`${weapon.name} is already ready.`);
    const maxRemaining = Math.max(1, Number(action.rules?.maxReloadRemaining) || 2);
    if (remaining > maxRemaining) {
      throw new Error(`Work the Guns can target only a weapon with ${maxRemaining} or fewer Reload actions remaining.`);
    }
    selection = weaponKey;
    workTheGunsRemaining = remaining;
  }

  let rawAfter = executeStationStateAction(before, action, {
    round,
    selection,
    shipLevel: level
  });
  if (resolver === "workTheGuns") {
    rawAfter = reduceWeaponReload(rawAfter, selection, round, workTheGunsRemaining);
  }
  const persistent = await applyPersistentAction(combatant.actor, action, options, before, rawAfter);
  const after = persistent.state;
  await combatant.update({ [STATE_PATH]: after });
  const notes = [...persistent.notes];

  if (ENGAGEMENT_RESOLVERS.has(resolver)) {
    const result = await game.arkflight.combatEngagement.resolve(resolver, combatant, engagementTarget, { requesterUserId });
    notes.push(...(result?.notes ?? []));
  }

  if (resolver === "issueOrder") notes.push("Applies only to the chosen station's next qualifying roll; fixed effects are not inflated.");
  if (resolver === "coordinateAssault") notes.push(`Target Hardness reduced by ${profile.bonus} for ${profile.advanced ? 2 : 1} qualifying attack${profile.advanced ? "s" : ""}.`);
  if (resolver === "driveCrew") notes.push(`Gain +1 AP this turn; spend 20% Morale; +${stationActionEconomy(action, level).strain} Strain.`);
  if (resolver === "ventStrain") notes.push(`Vents up to ${1 + profile.bonus} Strain.`);
  if (resolver === "hardTurn") notes.push(`+${Math.max(1, Number(before?.mobility?.maneuverability) || 1) + profile.bonus} maneuver allowance; pivot permitted.`);
  if (resolver === "impossibleBurn") notes.push(`Once per battle: +${Math.max(1, Math.ceil(Number(before?.mobility?.speed ?? 1) * 0.5))} movement allowance; +2 Strain.`);
  if (resolver === "turnBetweenHeartbeats") notes.push("Once per battle: +2 extraordinary 60° facing steps this turn.");
  if (resolver === "overchargeArkengine") notes.push(`+${before?.mobility?.speed ?? 0} movement and +${before?.mobility?.maneuverability ?? 0} maneuver allowance; +2 Strain.`);
  if (resolver === "redistributePower" && selection === "propulsion") notes.push(`+${profile.bonus} movement and +1 maneuver allowance; +1 Strain.`);
  if (resolver === "redistributePower" && selection === "weapons") notes.push(`Next ${profile.advanced ? 2 : 1} weapon attack${profile.advanced ? "s" : ""} gain +${profile.bonus} damage; +1 Strain.`);
  if (resolver === "redistributePower" && selection === "lifeveil") notes.push(`Next ${profile.advanced ? 2 : 1} wardable hit${profile.advanced ? "s" : ""} gain ${2 * profile.bonus} mitigation; +1 Strain.`);
  if (resolver === "setAttackVector") notes.push(`Selected facing gains ${15 * profile.bonus}° extra firing-arc tolerance while heading is unchanged.`);
  if (resolver === "workTheGuns") notes.push("Weapon immediately readied for 0 AP; spend 20% Morale; +1 Strain; once per round.");
  if (resolver === "readyBroadside") notes.push(`Spend 1 Supply; selected battery's next shot gains +${2 * profile.bonus} damage${profile.master ? " and reduces reload by 1" : ""}.`);
  if (resolver === "reinforceLifeveil") notes.push(`Spend 5% Lifeveil; next ${profile.advanced ? 2 : 1} wardable hit${profile.advanced ? "s" : ""} reduce damage by ${2 * profile.bonus}.`);
  if (resolver === "focusWard") notes.push(`Spend 10% Lifeveil; next ${profile.advanced ? 2 : 1} matching hit${profile.advanced ? "s" : ""} reduce damage by ${3 * profile.bonus}.`);
  if (action.timing === COMBAT_ACTION_TIMING.REACTION) notes.push("Reaction resolves against the current trigger and consumes shared RP.");

  if (persistent.strainOutcome?.degradation) {
    Hooks.callAll("arkflightShipDamageStateChanged", {
      actor: combatant.actor,
      combatant,
      action,
      strainResolution: persistent.strainOutcome,
      notes
    });
  }

  if (!options.suppressChat) await postActionChat({ actor: combatant.actor, crewActor, action, selection, notes, userId: requesterUserId });
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
    if (control.reason === "not-ship-owner") throw new Error("Only an Owner of this Arkflight ship may use its actions.");
    throw new Error(`Station action unavailable: ${control.reason}.`);
  }

  const availability = runtimeAvailability(base, actionId, control.combatant);
  if (!availability.ok) throw new Error(`Station action unavailable: ${availability.reason}.`);

  if (userCanResolveShipState(game.user, control.combatant)) {
    return executeStationAction(base, actionId, options, control.combatant, {
      crewActorOverride: control.crewActor,
      requesterUser: game.user,
      requesterUserId: game.user?.id ?? null
    });
  }

  const primary = activePrimaryGM();
  if (!primary) {
    throw new Error("An active GM is required only because Foundry denied direct update permission for this ship combat state.");
  }

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

function emitStationActionResult(payload = {}) {
  game.socket?.emit?.(COMBAT_SOCKET, {
    type: STATION_ACTION_RESULT,
    userId: payload.userId ?? null,
    combatId: payload.combatId ?? game.combat?.id ?? null,
    combatantId: payload.combatantId ?? null,
    actionId: payload.actionId ?? null,
    ok: Boolean(payload.ok),
    message: payload.message ?? null
  });
}

async function handleStationActionSocket(base, payload = {}) {
  if (payload?.type === STATION_ACTION_RESULT) {
    if (!payload.userId || payload.userId !== game.user?.id) return;
    if (payload.ok) ui.notifications?.info(payload.message ?? "Arkflight station action resolved.");
    else ui.notifications?.error(payload.message ?? "Arkflight station action failed.");
    Hooks.callAll("arkflightStationActionRemoteResult", payload);
    return;
  }

  if (!game.user?.isGM || payload?.type !== STATION_ACTION_REQUEST) return;
  const primary = activePrimaryGM();
  if (!primary || primary.id !== game.user.id) return;

  const requester = game.users?.get?.(payload.userId) ?? null;
  const combat = game.combats?.get?.(payload.combatId) ?? game.combat;
  const combatant = combat?.combatants?.get?.(payload.combatantId)
    ?? combat?.combatants?.find?.((entry) => entry.id === payload.combatantId)
    ?? null;
  if (!requester || !requester.active || !combat || combat.id !== payload.combatId || !combatant) return;

  const reply = (ok, message) => emitStationActionResult({
    userId: requester.id,
    combatId: combat.id,
    combatantId: combatant.id,
    actionId: payload.actionId,
    ok,
    message
  });

  const control = stationControl(base, payload.actionId, combatant, requester);
  if (!control.ok) {
    const message = control.reason === "not-your-station"
      ? `Only the player assigned to ${control.action?.station ?? "that"} station may use this action.`
      : control.reason === "not-ship-owner"
        ? "Only an Owner of this Arkflight ship may use its actions."
        : `Station action unavailable: ${control.reason}.`;
    console.warn("Arkflight | Rejected station action request", { reason: control.reason, userId: requester.id, actionId: payload.actionId });
    reply(false, message);
    return;
  }

  const availability = runtimeAvailability(base, payload.actionId, combatant);
  if (!availability.ok) {
    reply(false, `${control.action?.name ?? "Station action"} unavailable: ${availability.reason}.`);
    return;
  }

  try {
    await executeStationAction(base, payload.actionId, payload.options ?? {}, combatant, {
      crewActorOverride: control.crewActor,
      requesterUser: requester,
      requesterUserId: requester.id
    });
    reply(true, `${control.action?.name ?? "Station action"} resolved.`);
  } catch (error) {
    console.error("Arkflight | Player station action request failed", error);
    reply(false, error?.message ?? "Arkflight station action failed.");
  }
}

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  game.arkflight.combat = Object.freeze({
    ...base,
    stationActions(station, reference = null) {
      const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
      const actor = combatant?.actor ?? null;
      return Object.freeze(Object.values(base.actions ?? {})
        .filter((action) => action.station === station)
        .filter((action) => !action.rules?.requiresCapability || actionCapabilityAvailable(actor, action)));
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
