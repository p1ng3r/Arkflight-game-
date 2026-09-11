import { COMBAT_ACTION_TIMING } from "../content/combat-actions.js";
import { purchaseManeuver, purchaseMovement, spendPoints } from "./combatant-state.js";
import { stationActionEconomy } from "./station-action-economy.js";
import {
  stationEffectCharges,
  stationEffectMagnitude,
  stationEffectProfile
} from "./station-effect-rules.js";

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

function effectBearingAction(action, selection = null) {
  const resolver = action?.rules?.resolver;
  if (resolver === "redistributePower" && selection === "propulsion") return false;
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
  ]).has(resolver);
}

function markEffect(state, action, selection, round, { shipLevel = 1 } = {}) {
  const nextRuntime = runtime(state);
  const effect = {
    id: `${action.id}:${round}:${nextRuntime.effects.length + 1}`,
    actionId: action.id,
    station: action.station,
    name: action.name,
    timing: action.timing,
    selection: selection == null ? null : String(selection),
    createdRound: round,
    shipLevel: stationEffectProfile(shipLevel).level,
    boost: 0,
    charges: stationEffectCharges(action.id, shipLevel),
    heading: Number(state?.mobility?.heading ?? 0)
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
  const nextRuntime = runtime(state);
  nextRuntime.temporaryApMaxBonus += add;
  const max = Math.max(0, Number(current.max) + add);
  const value = Math.min(max, Math.max(0, Number(current.value) + add));
  return withRuntime(Object.freeze({
    ...state,
    economy: Object.freeze({
      ...state.economy,
      ap: Object.freeze({ value, max })
    })
  }), nextRuntime);
}

function matchingIssueOrder(state, station) {
  if (!station || station === "captain") return null;
  return runtime(state).effects.find((entry) =>
    entry.actionId === "captain-issue-order"
    && entry.selection === station
    && (entry.charges == null || Number(entry.charges) > 0)
  ) ?? null;
}

function matchingEmergencyBypass(state) {
  return runtime(state).effects.find((entry) =>
    entry.actionId === "engineer-emergency-bypass"
    && (entry.charges == null || Number(entry.charges) > 0)
  ) ?? null;
}

export function stationRuntimeState(state) {
  return Object.freeze(runtime(state));
}

export function activeStationEffects(state, { station = null, timing = null } = {}) {
  return Object.freeze(runtime(state).effects.filter((entry) =>
    (entry.charges == null || Number(entry.charges) > 0)
    && (!station || entry.station === station)
    && (!timing || entry.timing === timing)
  ));
}

export function stationCommandBoost(state, station, shipLevel = 1) {
  const effect = matchingIssueOrder(state, station);
  return effect ? stationEffectMagnitude(effect, shipLevel) : 0;
}

export function consumeStationEffects(state, effectIds = []) {
  const ids = new Set(effectIds.filter(Boolean));
  if (!ids.size) return state;
  const rt = runtime(state);
  rt.effects = rt.effects.flatMap((entry) => {
    if (!ids.has(entry.id)) return [entry];
    if (entry.charges == null) return [];
    const charges = Math.max(0, Math.trunc(Number(entry.charges) || 0) - 1);
    return charges > 0 ? [{ ...entry, charges }] : [];
  });
  return withRuntime(state, rt);
}

export function stationActionAvailability(state, action, { round = 1, shipLevel = 1 } = {}) {
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
  const cost = stationActionEconomy(action, shipLevel);
  if (cost.ap > Number(state?.economy?.ap?.value ?? 0)) return Object.freeze({ ok: false, reason: "insufficient-ap" });
  if (cost.rp > Number(state?.economy?.rp?.value ?? 0)) return Object.freeze({ ok: false, reason: "insufficient-rp" });
  return Object.freeze({ ok: true, reason: null });
}

export function executeStationStateAction(state, action, {
  round = 1,
  selection = null,
  shipLevel = 1
} = {}) {
  const combatRound = safeRound(round);
  const availability = stationActionAvailability(state, action, { round: combatRound, shipLevel });
  if (!availability.ok) throw new Error(`${action?.name ?? "Station action"} is unavailable: ${availability.reason}.`);

  const resolver = action.rules?.resolver;
  if (["fireAtTarget", "reloadWeapon"].includes(resolver)) {
    throw new Error(`${action.name} uses the dedicated weapon fire-control resolver.`);
  }

  const profile = stationEffectProfile(shipLevel);
  const scaledBonus = profile.bonus;
  const cost = stationActionEconomy(action, profile.level);
  const emergencyBypass = action.station === "engineer" && action.timing === COMBAT_ACTION_TIMING.ACTION
    ? matchingEmergencyBypass(state)
    : null;

  let next;
  if (resolver === "buyMovement") {
    next = purchaseMovement(state);
  } else if (resolver === "buyManeuver") {
    next = purchaseManeuver(state);
  } else {
    next = state;
    if (cost.ap) next = spendPoints(next, "ap", cost.ap);
    if (cost.rp) next = spendPoints(next, "rp", cost.rp);
  }

  if (resolver === "ventStrain") {
    const baseReduction = Math.max(0, Number(action.rules?.baseReduction) || 0);
    next = withStrain(next, -(baseReduction + scaledBonus));
  }
  if (resolver === "driveCrew") next = addTemporaryAP(next, 1);
  if (resolver === "hardTurn") {
    next = addAllowance(next, "maneuver", Math.max(1, Number(state?.mobility?.maneuverability) || 1) + scaledBonus);
  }
  if (resolver === "overchargeArkengine") {
    next = addAllowance(next, "movement", Math.max(1, Number(state?.mobility?.speed) || 1));
    next = addAllowance(next, "maneuver", Math.max(1, Number(state?.mobility?.maneuverability) || 1));
  }
  if (resolver === "redistributePower" && selection === "propulsion") {
    next = addAllowance(next, "movement", scaledBonus);
    next = addAllowance(next, "maneuver", 1);
  }

  const strainToAdd = cost.strain;
  if (strainToAdd > 0) next = withStrain(next, strainToAdd);

  if (emergencyBypass && strainToAdd > 0) {
    next = withStrain(next, -Math.min(strainToAdd, stationEffectMagnitude(emergencyBypass, shipLevel)));
    next = consumeStationEffects(next, [emergencyBypass.id]);
  }

  if (effectBearingAction(action, selection)) next = markEffect(next, action, selection, combatRound, { shipLevel });
  if (action.rules?.oncePerRound) next = markUsed(next, action, combatRound);

  return withLog(next, {
    round: combatRound,
    kind: action.timing === COMBAT_ACTION_TIMING.REACTION ? "station-reaction" : "station-action",
    actionId: action.id,
    station: action.station,
    selection: selection == null ? null : String(selection),
    ap: cost.ap,
    rp: cost.rp,
    strain: cost.strain,
    shipLevel: profile.level,
    stationBonus: profile.bonus,
    commandBoost: 0
  });
}

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
