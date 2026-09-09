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
  stationActionAvailability
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

function improveAreaState(value) {
  const index = AREA_ORDER.indexOf(value);
  if (index <= 0) return AREA_STATES.STABLE;
  return AREA_ORDER[index - 1];
}

function actionSelection(action, options = {}) {
  return options.selection ?? options.targetId ?? options.station ?? options.facing ?? options.system ?? options.choice ?? null;
}

async function updatePersistentShipForAction(actor, action, options, beforeState, afterState) {
  const ship = shipPayload(actor);
  if (!ship) return [];
  const patches = {};
  const notes = [];
  const resolver = action.rules?.resolver;
  const selection = actionSelection(action, options);

  if (Number(beforeState?.strain?.value ?? 0) !== Number(afterState?.strain?.value ?? 0)) {
    patches[`flags.${MODULE_ID}.ship.resources.strain.value`] = Number(afterState.strain.value);
    notes.push(`Strain ${Number(beforeState?.strain?.value ?? 0)} → ${Number(afterState.strain.value)}`);
  }

  if (resolver === "rallyCrew") {
    const currentArea = ship.areas?.morale?.state ?? AREA_STATES.STABLE;
    if (currentArea !== AREA_STATES.STABLE) {
      const nextArea = improveAreaState(currentArea);
      patches[`flags.${MODULE_ID}.ship.areas.morale.state`] = nextArea;
      notes.push(`Morale area ${currentArea} → ${nextArea}`);
    } else {
      const current = Math.max(0, Number(ship.resources?.morale?.value) || 0);
      const max = Math.max(current, Number(ship.resources?.morale?.max) || 0);
      const next = Math.min(max, current + 1);
      patches[`flags.${MODULE_ID}.ship.resources.morale.value`] = next;
      notes.push(`Morale ${current} → ${next}`);
    }
  }

  if (resolver === "emergencyRepair") {
    const system = SHIP_AREA_KEYS.includes(selection) && selection !== "morale" ? selection : null;
    if (!system) throw new Error("Emergency Repair requires a Hull, Arkengine, Rigging, or Lifeveil area.");
    const current = ship.areas?.[system]?.state ?? AREA_STATES.STABLE;
    const next = improveAreaState(current);
    patches[`flags.${MODULE_ID}.ship.areas.${system}.state`] = next;
    notes.push(`${system} area ${current} → ${next}`);
  }

  if (resolver === "mendLifeveil") {
    const current = Math.max(0, Number(ship.resources?.lifeveil?.value) || 0);
    const max = Math.max(current, Number(ship.resources?.lifeveil?.max) || 0);
    const next = Math.min(max, current + 5);
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
      notes.push("No tracked ship interference was present; the purge is held as a combat countermeasure.");
    }
  }

  if (Object.keys(patches).length) await actor.update(patches);
  return notes;
}

function actionCostLabel(action) {
  if (action.rules?.costSource === "weapon.fireAP") return "Weapon AP";
  const parts = [];
  if (Number(action.cost?.ap) > 0) parts.push(`${action.cost.ap} AP`);
  if (Number(action.cost?.rp) > 0) parts.push(`${action.cost.rp} RP`);
  if (Number(action.rules?.strain) > 0) parts.push(`+${action.rules.strain} Strain`);
  return parts.join(" · ") || "No cost";
}

async function postActionChat({ actor, crewActor, action, selection, notes = [] }) {
  const esc = foundry.utils.escapeHTML;
  const selectionLine = selection == null || selection === ""
    ? ""
    : `<br><strong>Choice:</strong> ${esc(String(selection).replaceAll("-", " "))}`;
  const notesLine = notes.length ? `<br><strong>Effect:</strong> ${notes.map((entry) => esc(entry)).join(" · ")}` : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: crewActor ?? actor }),
    content: `<div class="arkflight-chat-card arkflight-station-action-chat"><strong>${esc(actor.name)} — ${esc(action.name)}</strong><br><em>${esc(action.station)} ${action.timing}</em> · ${esc(actionCostLabel(action))}${selectionLine}${notesLine}<hr><p>${esc(action.description)}</p></div>`
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
  return stationActionAvailability(base.state(combatant), action, { round: game.combat?.round ?? 1 });
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

  const resolver = action.rules?.resolver;
  if (resolver === "fireAtTarget") {
    if (!options.weaponKey || !options.targetId) throw new Error("Fire Weapon requires a weapon and target; use the Weapons tab fire-control panel.");
    return base.fireAtTarget(options.weaponKey, options.targetId, combatant);
  }
  if (resolver === "workTheGuns") {
    if (!options.weaponKey) throw new Error("Work the Guns requires an installed weapon; use the Weapons tab fire-control panel.");
    return base.workTheGuns(options.weaponKey, combatant);
  }

  const before = base.state(combatant);
  const selection = actionSelection(action, options);
  const after = executeStationStateAction(before, action, {
    round: game.combat?.round ?? 1,
    selection
  });
  await combatant.update({ [STATE_PATH]: after });
  const notes = await updatePersistentShipForAction(combatant.actor, action, options, before, after);

  if (resolver === "driveCrew") notes.push("The ship gains one net additional AP this turn.");
  if (resolver === "hardTurn") notes.push(`+${Number(action.rules?.facingSteps ?? 2)} maneuver allowance this turn.`);
  if (resolver === "overchargeArkengine") notes.push("+1 movement and +1 maneuver allowance this turn.");
  if (resolver === "redistributePower" && selection === "propulsion") notes.push("+1 movement and +1 maneuver allowance this turn.");
  if (action.timing === COMBAT_ACTION_TIMING.REACTION) notes.push("Reaction readied until this ship's next turn or until consumed by its trigger.");

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
