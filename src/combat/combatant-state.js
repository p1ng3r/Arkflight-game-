import { COMBAT_POINT_TYPES, effectiveMobility, headingDegreeDistance, hullCombatProfile, normalizeShipHeading } from "./combat-schema.js";
import { normalizeWeaponUpgrades } from "./weapon-combat.js";
import { weaponConditionModifiers } from "../ship/ship-conditions.js";

export const COMBATANT_STATE_VERSION = 6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function track(value, max) {
  const safeMax = Math.max(0, Math.trunc(Number(max) || 0));
  return Object.freeze({ value: clamp(value, 0, safeMax), max: safeMax });
}

function requiredDerivedStats(derived) {
  const stats = derived?.stats;
  if (!stats) throw new Error("Arkflight combat state requires authoritative derived ship stats.");
  return stats;
}

function weaponInstallKey(install, index) {
  if (install && typeof install === "object" && install.instanceId) return String(install.instanceId);
  const id = typeof install === "string" ? install : install?.id;
  const facing = typeof install === "object"
    ? (install?.mount ?? install?.arc ?? null)
    : null;
  const mount = facing != null ? `${facing}:${Number(install.mountIndex) || 0}` : `slot:${index}`;
  return `${id ?? "weapon"}@${mount}`;
}

function installedWeaponStates(ship, catalogs = {}) {
  const rows = {};
  const weaponCondition = weaponConditionModifiers(ship);
  for (const [index, install] of (ship?.weapons ?? []).entries()) {
    const id = typeof install === "string" ? install : install?.id;
    if (!id) continue;
    const weapon = catalogs.weapons?.[id] ?? null;
    const combat = weapon?.data?.combat ?? {};
    const key = weaponInstallKey(install, index);
    rows[key] = Object.freeze({
      key,
      id,
      name: weapon?.name ?? id,
      mount: typeof install === "object" ? (install?.mount ?? install?.arc ?? null) : null,
      mountIndex: typeof install === "object" ? Number(install?.mountIndex) || 0 : null,
      upgrades: normalizeWeaponUpgrades(install),
      fireAP: 1,
      reloadRounds: Math.max(0, Math.trunc(Number(combat.reloadRounds) || 0) + weaponCondition.reloadPenalty),
      reloadPenalty: weaponCondition.reloadPenalty,
      reloadRemaining: 0,
      lastFiredRound: null
    });
  }
  return Object.freeze(rows);
}

export function createCombatantState(ship, { derived = null, catalogs = {}, rotation = 0, speedPenalty = 0, maneuverPenalty = 0 } = {}) {
  if (!ship?.hull?.chassisId) throw new Error("Arkflight combat requires a commissioned ship hull.");
  const stats = requiredDerivedStats(derived);
  const profile = hullCombatProfile(ship, {
    actionBonus: Number(stats.actionBonus) || 0,
    reactionBonus: Number(stats.reactionBonus) || 0
  });
  const mobility = effectiveMobility({
    combatSpeed: stats.combatSpeed,
    maneuverability: stats.maneuverability,
    speedPenalty,
    maneuverPenalty
  });
  const strainMax = Math.max(0, Number(stats.strainCapacity) || 0);
  const strainValue = clamp(ship.resources?.strain?.value, 0, strainMax);

  return Object.freeze({
    version: COMBATANT_STATE_VERSION,
    turnKey: null,
    economy: Object.freeze({
      ap: track(profile.ap, profile.ap),
      rp: track(profile.rp, profile.rp)
    }),
    mobility: Object.freeze({
      speed: mobility.speed,
      maneuverability: mobility.maneuverability,
      movement: Object.freeze({ purchases: 0, allowance: 0, used: 0 }),
      maneuver: Object.freeze({ purchases: 0, allowance: 0, used: 0 }),
      heading: normalizeShipHeading(rotation),
      committedHeading: normalizeShipHeading(rotation),
      facing: Object.freeze({ usedDegrees: 0, commits: 0, lastReason: null })
    }),
    weapons: installedWeaponStates(ship, catalogs),
    strain: Object.freeze({ value: strainValue, max: strainMax }),
    log: Object.freeze([])
  });
}

export function spendPoints(state, type, amount = 1) {
  if (![COMBAT_POINT_TYPES.AP, COMBAT_POINT_TYPES.RP].includes(type)) throw new Error(`Unknown combat point type: ${type}`);
  const required = Math.max(0, Math.trunc(Number(amount) || 0));
  const current = state?.economy?.[type];
  if (!current) throw new Error(`Combat state has no ${type.toUpperCase()} track.`);
  if (current.value < required) throw new Error(`Not enough ${type.toUpperCase()} remaining.`);
  return Object.freeze({
    ...state,
    economy: Object.freeze({ ...state.economy, [type]: track(current.value - required, current.max) })
  });
}

export function gainAP(state, amount = 1) {
  const add = Math.max(0, Math.trunc(Number(amount) || 0));
  const current = state.economy.ap;
  return Object.freeze({
    ...state,
    economy: Object.freeze({ ...state.economy, ap: track(current.value + add, current.max + add) })
  });
}

export function gainCombatStrain(state, amount = 1) {
  const add = Math.max(0, Number(amount) || 0);
  return Object.freeze({
    ...state,
    strain: Object.freeze({ ...state.strain, value: clamp(Number(state.strain?.value ?? 0) + add, 0, Number(state.strain?.max ?? 0)) })
  });
}

export function purchaseMovement(state) {
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  const current = next.mobility.movement;
  const movement = Object.freeze({
    purchases: current.purchases + 1,
    allowance: current.allowance + next.mobility.speed,
    used: current.used
  });
  return Object.freeze({ ...next, mobility: Object.freeze({ ...next.mobility, movement }) });
}

export function purchaseManeuver(state) {
  const maneuverability = Math.max(0, Math.trunc(Number(state?.mobility?.maneuverability) || 0));
  if (maneuverability <= 0) throw new Error("Maneuverability 0 cannot purchase normal facing steps.");
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  const current = next.mobility.maneuver;
  const maneuver = Object.freeze({
    purchases: current.purchases + 1,
    allowance: current.allowance + maneuverability,
    used: current.used
  });
  return Object.freeze({ ...next, mobility: Object.freeze({ ...next.mobility, maneuver }) });
}

export function recordMovement(state, spaces) {
  const add = Math.max(0, Math.trunc(Number(spaces) || 0));
  const current = state.mobility.movement;
  const used = current.used + add;
  if (used > current.allowance) throw new Error(`Movement exceeds allowance by ${used - current.allowance} hex${used - current.allowance === 1 ? "" : "es"}.`);
  return Object.freeze({
    ...state,
    mobility: Object.freeze({ ...state.mobility, movement: Object.freeze({ ...current, used }) })
  });
}

export function previewFacing(state, heading) {
  const nextHeading = normalizeShipHeading(heading);
  if (nextHeading === Number(state?.mobility?.heading ?? 0)) return state;
  return Object.freeze({
    ...state,
    mobility: Object.freeze({
      ...state.mobility,
      heading: nextHeading
    })
  });
}

export function commitFacing(state, heading = state?.mobility?.heading ?? 0, reason = "commit") {
  const targetHeading = normalizeShipHeading(heading);
  const previousHeading = normalizeShipHeading(state?.mobility?.committedHeading ?? state?.mobility?.heading ?? targetHeading);
  const deltaDegrees = headingDegreeDistance(previousHeading, targetHeading);
  const current = state?.mobility?.facing ?? {};
  const usedDegrees = Math.max(0, Math.trunc(Number(current.usedDegrees) || 0)) + deltaDegrees;
  if (deltaDegrees === 0 && targetHeading === Number(state?.mobility?.heading ?? targetHeading)) return state;
  return Object.freeze({
    ...state,
    mobility: Object.freeze({
      ...state.mobility,
      heading: targetHeading,
      committedHeading: targetHeading,
      facing: Object.freeze({
        usedDegrees,
        commits: Math.max(0, Math.trunc(Number(current.commits) || 0)) + (deltaDegrees > 0 ? 1 : 0),
        lastReason: deltaDegrees > 0 ? String(reason ?? "commit") : (current.lastReason ?? null)
      })
    })
  });
}

// Compatibility helper: callers that explicitly "record" facing are making a
// committed gameplay turn. The old numeric step argument is ignored because
// committed facing is now measured from headings, not mouse/update counts.
export function recordFacingChange(state, _steps, heading) {
  return commitFacing(state, heading, "record-facing");
}

export function weaponReloadRemaining(weaponState, _round = null) {
  return Math.max(0, Math.trunc(Number(weaponState?.reloadRemaining) || 0));
}

export function reduceWeaponReload(state, weaponKey, _round = null, amount = 1) {
  const weapon = state?.weapons?.[weaponKey];
  if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const reduction = Math.max(0, Math.trunc(Number(amount) || 0));
  if (reduction <= 0) return state;
  const remaining = weaponReloadRemaining(weapon);
  const updated = Object.freeze({ ...weapon, reloadRemaining: Math.max(0, remaining - reduction) });
  return Object.freeze({
    ...state,
    weapons: Object.freeze({ ...state.weapons, [weaponKey]: updated })
  });
}

export function fireWeapon(state, weaponKey, round) {
  const weapon = state?.weapons?.[weaponKey];
  if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  if (weaponReloadRemaining(weapon) > 0) throw new Error(`${weapon.name} is still reloading.`);
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  const reloadRemaining = Math.max(0, Math.trunc(Number(weapon.reloadRounds) || 0));
  const updated = Object.freeze({ ...weapon, reloadRemaining, lastFiredRound: combatRound });
  return Object.freeze({
    ...next,
    weapons: Object.freeze({ ...next.weapons, [weaponKey]: updated }),
    log: Object.freeze([...(next.log ?? []), Object.freeze({ round: combatRound, kind: "fire-weapon", weaponKey, ap: 1, reloadRemaining })])
  });
}

export function reloadWeapon(state, weaponKey, round) {
  const weapon = state?.weapons?.[weaponKey];
  if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  if (weaponReloadRemaining(weapon) <= 0) throw new Error(`${weapon.name} is already ready.`);
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  next = reduceWeaponReload(next, weaponKey, combatRound, 1);
  const updated = next.weapons[weaponKey];
  return Object.freeze({
    ...next,
    log: Object.freeze([...(next.log ?? []), Object.freeze({ round: combatRound, kind: "reload-weapon", weaponKey, ap: 1, reloadRemaining: updated.reloadRemaining })])
  });
}

// Compatibility alias for older callers. Battlewatch Work the Guns is now a
// separate station action and does not use this 1 AP reload primitive.
export function workTheGuns(state, weaponKey, round) {
  return reloadWeapon(state, weaponKey, round);
}

export function beginCombatantTurn(state, round) {
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  const turnKey = `round:${combatRound}`;
  if (state?.turnKey === turnKey) return state;
  return Object.freeze({
    ...state,
    turnKey,
    economy: Object.freeze({
      ap: track(state.economy.ap.max, state.economy.ap.max),
      rp: track(state.economy.rp.max, state.economy.rp.max)
    }),
    mobility: Object.freeze({
      ...state.mobility,
      movement: Object.freeze({ purchases: 0, allowance: 0, used: 0 }),
      maneuver: Object.freeze({ purchases: 0, allowance: 0, used: 0 }),
      committedHeading: normalizeShipHeading(state.mobility?.heading ?? state.mobility?.committedHeading ?? 0),
      facing: Object.freeze({ usedDegrees: 0, commits: 0, lastReason: null })
    })
  });
}

export function persistentStrainPatch(ship, combatState) {
  if (!ship?.resources?.strain) throw new Error("Ship does not have a persistent Strain resource.");
  const max = Math.max(0, Number(combatState?.strain?.max) || Number(ship.resources.strain.max) || 0);
  return {
    ...ship,
    resources: {
      ...ship.resources,
      strain: {
        ...ship.resources.strain,
        value: clamp(combatState?.strain?.value, 0, max),
        max
      }
    }
  };
}
