import { COMBAT_ACTION_TIMING } from "../content/combat-actions.js";
import { purchaseManeuver, purchaseMovement, spendPoints } from "./combatant-state.js";

function safeRound(round) {
  return Math.max(1, Math.trunc(Number(round) || 1));
}

function runtime(state) {
  const value = state?.stationRuntime ?? {};
  return {
    round: Math.max(0, Math.trunc(Number(value.round) || 0)),
    used: { ...(value.used ?? {}) },
    effects: [...(value.effects ?? [])],
    temporaryApMaxBonus: Math.max(0, Math.trunc(Number(value.temporaryApMaxBonus) || 0))
  };
}

function freezeRuntime(value) {
  return Object.freeze({
    round: value.round,
    used: Object.freeze({ ...value.used }),
    effects: Object.freeze(value.effects.map((entry) => Object.freeze({ ...entry }))),
    temporaryApMaxBonus: Math.max(0, Math.trunc(Number(value.temporaryApMaxBonus) || 0))
  });
}

function withRuntime(state, value) {
  return Object.freeze({ ...state, stationRuntime: freezeRuntime(value) });
}

function withLog(state, entry) {
  return Object.freeze({
    ...state,
    log: Object.freeze([...(state?.log ?? []), Object.freeze(entry)])
  });
}

function withStrain(state, delta) {
  const amount = Number(delta) || 0;
  if (!amount) return state;
  const max = Math.max(0, Number(state?.strain?.max) || 0);
  const value = Math.max(0, Math.min(max, Number(state?.strain?.value ?? 0) + amount));
  return Object.freeze({ ...state, strain: Object.freeze({ ...state.strain, value }) });
}

function addAllowance(state, key, amount) {
  const current = state?.mobility?.[key];
  if (!current) return state;
  return Object.freeze({
    ...state,
    mobility: Object.freeze({
      ...state.mobility,
      [key]: Object.freeze({
        ...current,
        allowance: Math.max(0, Number(current.allowance ?? 0) + Math.max(0, Number(amount) || 0))
      })
    })
  });
}

function markEffect(state, action, selection, round) {
  const nextRuntime = runtime(state);
  const effect = {
    id: `${action.id}:${round}:${nextRuntime.effects.length + 1}`,
    actionId: action.id,
    station: action.station,
    name: action.name,
    timing: action.timing,
    selection: selection == null ? null : String(selection),
    createdRound: round
  };
  nextRuntime.effects.push(effect);
  return withRuntime(state, nextRuntime);
}

function markUsed(state, action, round) {
  const nextRuntime = runtime(state);
  nextRuntime.used[action.id] = round;
  nextRuntime.round = round;
  return withRuntime(state, nextRuntime);
}

function addTemporaryAP(state, amount) {
  const add = Math.max(0, Math.trunc(Number(amount) || 0));
  if (!add) return state;
  const current = state?.economy?.ap;
  if (!current) return state;
  const bonus = Math.max(0, add - 1);
  const nextRuntime = runtime(state);
  nextRuntime.temporaryApMaxBonus += bonus;
  const max = Math.max(0, Number(current.max) + bonus);
  const value = Math.min(max, Math.max(0, Number(current.value) + add));
  return withRuntime(Object.freeze({
    ...state,
    economy: Object.freeze({
      ...state.economy,
      ap: Object.freeze({ value, max })
    })
  }), nextRuntime);
}

function effectBearingAction(action) {
  return new Set([
    "issueOrder",
    "coordinateAssault",
    "redistributePower",
    "setAttackVector",
    "acquireTarget",
    "readyBroadside",
    "reinforceLifeveil",
    "focusWard",
    "braceForImpact",
    "emergencyBypass",
    "evasiveManeuver",
    "spoilTheirAim",
    "emergencyWard"
  ]).has(action?.rules?.resolver);
}

export function stationRuntimeState(state) {
  return Object.freeze(runtime(state));
}

export function activeStationEffects(state, { station = null, timing = null } = {}) {
  return Object.freeze(runtime(state).effects.filter((entry) =>
    (!station || entry.station === station)
    && (!timing || entry.timing === timing)
  ));
}

export function stationActionAvailability(state, action, { round = 1 } = {}) {
  if (!state || !action) return Object.freeze({ ok: false, reason: "missing-state-or-action" });
  const combatRound = safeRound(round);
  const rt = runtime(state);
  if (action.rules?.oncePerRound && rt.used[action.id] === combatRound) {
    return Object.freeze({ ok: false, reason: "once-per-round" });
  }
  if (action.timing === COMBAT_ACTION_TIMING.REACTION && rt.effects.some((entry) => entry.actionId === action.id)) {
    return Object.freeze({ ok: false, reason: "reaction-readied" });
  }
  if (action.rules?.costSource) return Object.freeze({ ok: true, reason: null });
  const apCost = Math.max(0, Math.trunc(Number(action.cost?.ap) || 0));
  const rpCost = Math.max(0, Math.trunc(Number(action.cost?.rp) || 0));
  if (apCost > Number(state?.economy?.ap?.value ?? 0)) return Object.freeze({ ok: false, reason: "insufficient-ap" });
  if (rpCost > Number(state?.economy?.rp?.value ?? 0)) return Object.freeze({ ok: false, reason: "insufficient-rp" });
  return Object.freeze({ ok: true, reason: null });
}

/**
 * Resolve the shared AP/RP and transient combat-state portion of a core station
 * action. Actor resource/area mutations are intentionally handled by the
 * Foundry adapter because they belong to the persistent ship Actor.
 */
export function executeStationStateAction(state, action, { round = 1, selection = null } = {}) {
  const combatRound = safeRound(round);
  const availability = stationActionAvailability(state, action, { round: combatRound });
  if (!availability.ok) throw new Error(`${action?.name ?? "Station action"} is unavailable: ${availability.reason}.`);

  const resolver = action.rules?.resolver;
  if (["fireAtTarget", "workTheGuns"].includes(resolver)) {
    throw new Error(`${action.name} uses the dedicated weapon fire-control resolver.`);
  }

  let next;
  if (resolver === "buyMovement") next = purchaseMovement(state);
  else if (resolver === "buyManeuver") next = purchaseManeuver(state);
  else {
    next = state;
    const ap = Math.max(0, Math.trunc(Number(action.cost?.ap) || 0));
    const rp = Math.max(0, Math.trunc(Number(action.cost?.rp) || 0));
    if (ap) next = spendPoints(next, "ap", ap);
    if (rp) next = spendPoints(next, "rp", rp);
  }

  if (resolver === "ventStrain") next = withStrain(next, -Math.max(1, Number(action.rules?.strainReduction) || 1));
  if (resolver === "driveCrew") next = addTemporaryAP(next, Math.max(1, Number(action.rules?.gainAP) || 1));
  if (resolver === "hardTurn") next = addAllowance(next, "maneuver", Math.max(1, Number(action.rules?.facingSteps) || 1));
  if (resolver === "overchargeArkengine") {
    next = addAllowance(next, "movement", 1);
    next = addAllowance(next, "maneuver", 1);
  }
  if (resolver === "redistributePower" && selection === "propulsion") {
    next = addAllowance(next, "movement", 1);
    next = addAllowance(next, "maneuver", 1);
  }
  if (Number(action.rules?.strain) > 0) next = withStrain(next, Number(action.rules.strain));

  if (effectBearingAction(action)) next = markEffect(next, action, selection, combatRound);
  if (action.rules?.oncePerRound) next = markUsed(next, action, combatRound);

  return withLog(next, {
    round: combatRound,
    kind: action.timing === COMBAT_ACTION_TIMING.REACTION ? "station-reaction" : "station-action",
    actionId: action.id,
    station: action.station,
    selection: selection == null ? null : String(selection),
    ap: Math.max(0, Math.trunc(Number(action.cost?.ap) || 0)),
    rp: Math.max(0, Math.trunc(Number(action.cost?.rp) || 0))
  });
}

/** Clear effects that last until the ship's next turn and restore temporary AP cap. */
export function beginStationActionTurn(state, round = 1) {
  if (!state) return state;
  const combatRound = safeRound(round);
  const rt = runtime(state);
  const temporaryBonus = rt.temporaryApMaxBonus;
  let next = state;
  if (temporaryBonus > 0 && next?.economy?.ap) {
    const max = Math.max(0, Number(next.economy.ap.max) - temporaryBonus);
    next = Object.freeze({
      ...next,
      economy: Object.freeze({
        ...next.economy,
        ap: Object.freeze({ value: Math.min(max, Number(next.economy.ap.value) || 0), max })
      })
    });
  }
  return withRuntime(next, { round: combatRound, used: {}, effects: [], temporaryApMaxBonus: 0 });
}
