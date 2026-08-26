import { COMBAT_ACTION_TYPES, COMBAT_FACINGS, COMBAT_RANGES, hullCombatProfile } from "./combat-schema.js";
import { getCombatAction } from "./combat-actions.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function economyTrack(value, max) {
  return Object.freeze({ value: clamp(value, 0, max), max });
}

export function createCombatState(ship, options = {}) {
  if (!ship?.hull?.chassisId) throw new Error("Arkflight combat requires a commissioned ship hull.");
  const profile = hullCombatProfile(ship, options);
  const strainMax = Math.max(0, Number(ship.resources?.strain?.max) || 0);
  const strainValue = clamp(ship.resources?.strain?.value, 0, strainMax);

  return Object.freeze({
    version: 1,
    round: 1,
    facing: options.facing ?? "fore",
    range: options.range ?? "near",
    economy: Object.freeze({
      actions: economyTrack(profile.actions, profile.actions),
      reactions: economyTrack(profile.reactions, profile.reactions)
    }),
    strain: Object.freeze({ value: strainValue, max: strainMax }),
    pushedAreas: Object.freeze([]),
    log: Object.freeze([])
  });
}

export function resetCombatRound(state, { actionBonus = 0, reactionBonus = 0 } = {}) {
  const actionMax = Math.max(1, Number(state?.economy?.actions?.max ?? 1) + Number(actionBonus || 0));
  const reactionMax = Math.max(0, Number(state?.economy?.reactions?.max ?? 0) + Number(reactionBonus || 0));
  return Object.freeze({
    ...state,
    round: Number(state?.round ?? 0) + 1,
    economy: Object.freeze({
      actions: economyTrack(actionMax, actionMax),
      reactions: economyTrack(reactionMax, reactionMax)
    }),
    pushedAreas: Object.freeze([])
  });
}

export function canSpendCombatPoints(state, type, amount = 1) {
  const key = type === COMBAT_ACTION_TYPES.REACTION ? "reactions" : "actions";
  const required = Math.max(0, Number(amount) || 0);
  return Number(state?.economy?.[key]?.value ?? 0) >= required;
}

export function spendCombatPoints(state, type, amount = 1) {
  const key = type === COMBAT_ACTION_TYPES.REACTION ? "reactions" : "actions";
  const required = Math.max(0, Number(amount) || 0);
  if (!canSpendCombatPoints(state, type, required)) throw new Error(`Not enough ${key} remaining.`);
  const track = state.economy[key];
  return Object.freeze({
    ...state,
    economy: Object.freeze({
      ...state.economy,
      [key]: economyTrack(track.value - required, track.max)
    })
  });
}

export function gainCombatActions(state, amount = 1) {
  const add = Math.max(0, Number(amount) || 0);
  const track = state.economy.actions;
  return Object.freeze({
    ...state,
    economy: Object.freeze({
      ...state.economy,
      actions: economyTrack(track.value + add, track.max + add)
    })
  });
}

export function gainCombatStrain(state, amount = 1, pushedArea = null) {
  const add = Math.max(0, Number(amount) || 0);
  const nextStrain = clamp(Number(state?.strain?.value ?? 0) + add, 0, Number(state?.strain?.max ?? 0));
  const pushedAreas = pushedArea ? [...(state.pushedAreas ?? []), pushedArea] : [...(state.pushedAreas ?? [])];
  return Object.freeze({
    ...state,
    strain: Object.freeze({ ...state.strain, value: nextStrain }),
    pushedAreas: Object.freeze(pushedAreas)
  });
}

export function changeFacing(state, steps = 1) {
  const index = COMBAT_FACINGS.indexOf(state?.facing);
  if (index < 0) throw new Error(`Unknown combat facing: ${state?.facing}`);
  const normalized = Number(steps) || 0;
  const next = ((index + normalized) % COMBAT_FACINGS.length + COMBAT_FACINGS.length) % COMBAT_FACINGS.length;
  return Object.freeze({ ...state, facing: COMBAT_FACINGS[next] });
}

export function changeRange(state, steps = 1) {
  const index = COMBAT_RANGES.indexOf(state?.range);
  if (index < 0) throw new Error(`Unknown combat range: ${state?.range}`);
  const next = clamp(index + (Number(steps) || 0), 0, COMBAT_RANGES.length - 1);
  return Object.freeze({ ...state, range: COMBAT_RANGES[next] });
}

export function executeCombatAction(state, actionId) {
  const action = getCombatAction(actionId);
  if (!action) throw new Error(`Unknown Arkflight combat action: ${actionId}`);

  let next = spendCombatPoints(state, action.type, action.cost);
  if (action.strainCost) next = gainCombatStrain(next, action.strainCost, action.pushedArea);

  if (action.effect.kind === "change-facing") next = changeFacing(next, action.effect.steps ?? 1);
  if (action.effect.kind === "gain-actions") next = gainCombatActions(next, action.effect.value ?? 1);

  return Object.freeze({
    ...next,
    log: Object.freeze([
      ...(next.log ?? []),
      Object.freeze({ round: next.round, actionId: action.id, station: action.station, area: action.area, type: action.type, cost: action.cost, strainCost: action.strainCost })
    ])
  });
}

export function persistentStrainPatch(ship, combatState) {
  if (!ship?.resources?.strain) throw new Error("Ship does not have a persistent Strain resource.");
  return {
    ...ship,
    resources: {
      ...ship.resources,
      strain: {
        ...ship.resources.strain,
        value: clamp(combatState?.strain?.value, 0, Number(ship.resources.strain.max) || 0)
      }
    }
  };
}
