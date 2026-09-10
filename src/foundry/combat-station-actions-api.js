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
  stationEffectProfile
} from "../combat/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
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

function improveAreaState(value, steps = 1) {
  let index = AREA_ORDER.indexOf(value);
  if (index < 0) index = 0;
  index = Math.max(0, index - Math.max(1, Math.trunc(Number(steps) || 1)));
  return AREA_ORDER[index] ?? AREA_STATES.STABLE;
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

async function updatePersistentShipForAction(actor, action, options, beforeState, afterState) {
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

async function execute(base, actionId, options = {}, reference = null) {
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
    if (!options.weaponKey) throw new Error("Work the Guns requires an installed weapon.");
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
  const after = executeStationStateAction(before, action, {
    round: game.combat?.round ?? 1,
    selection,
    shipLevel: level
  });
  await combatant.update({ [STATE_PATH]: after });
  const notes = await updatePersistentShipForAction(combatant.actor, action, options, before, after);

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
    stationAction(actionId, options = {}, reference = null) {
      return execute(base, actionId, options, reference);
    }
  });
});

Hooks.on("arkflightCombatTurnChanged", async ({ combatant, state, round }) => {
  if (!game.user?.isGM || !combatant || !state) return;
  const next = beginStationActionTurn(state, round);
  await combatant.update({ [STATE_PATH]: next });
  Hooks.callAll("arkflightStationActionsRefreshed", { combatant, state: next, round });
});
