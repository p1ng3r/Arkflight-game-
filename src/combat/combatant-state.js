import { COMBAT_POINT_TYPES, effectiveMobility, hullCombatProfile, normalizeHexHeading } from "./combat-schema.js";

export const COMBATANT_STATE_VERSION = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function track(value, max) {
  const safeMax = Math.max(0, Math.trunc(Number(max) || 0));
  return Object.freeze({ value: clamp(value, 0, safeMax), max: safeMax });
}

function weaponInstallKey(install, index) {
  if (install && typeof install === "object" && install.instanceId) return String(install.instanceId);
  const id = typeof install === "string" ? install : install?.id;
  const mount = typeof install === "object" && install?.arc != null ? `${install.arc}:${Number(install.mountIndex) || 0}` : `slot:${index}`;
  return `${id ?? "weapon"}@${mount}`;
}

function installedWeaponStates(ship, catalogs = {}) {
  const rows = {};
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
      mount: typeof install === "object" ? install?.arc ?? null : null,
      mountIndex: typeof install === "object" ? Number(install?.mountIndex) || 0 : null,
      fireAP: Math.max(1, Math.trunc(Number(combat.fireAP) || 1)),
      reloadRounds: Math.max(0, Math.trunc(Number(combat.reloadRounds) || 0)),
      readyRound: 1,
      lastFiredRound: null
    });
  }
  return Object.freeze(rows);
}

export function createCombatantState(ship, { derived = null, catalogs = {}, rotation = 0, speedPenalty = 0, maneuverPenalty = 0 } = {}) {
  if (!ship?.hull?.chassisId) throw new Error("Arkflight combat requires a commissioned ship hull.");
  const stats = derived?.stats ?? {};
  const profile = hullCombatProfile(ship, {
    actionBonus: Number(stats.actionBonus) || 0,
    reactionBonus: Number(stats.reactionBonus) || 0
  });
  const mobility = effectiveMobility({
    combatSpeed: stats.combatSpeed ?? 1,
    maneuverability: stats.maneuverability ?? 1,
    speedPenalty,
    maneuverPenalty
  });
  const strainMax = Math.max(0, Number(ship.resources?.strain?.max) || Number(stats.strainCapacity) || 0);
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
      heading: normalizeHexHeading(rotation)
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
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  const current = next.mobility.maneuver;
  const maneuver = Object.freeze({
    purchases: current.purchases + 1,
    allowance: current.allowance + next.mobility.maneuverability,
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

export function recordFacingChange(state, steps, heading) {
  const add = Math.max(0, Math.trunc(Number(steps) || 0));
  const current = state.mobility.maneuver;
  const used = current.used + add;
  if (used > current.allowance) throw new Error(`Facing change exceeds Maneuver allowance by ${used - current.allowance} step${used - current.allowance === 1 ? "" : "s"}.`);
  return Object.freeze({
    ...state,
    mobility: Object.freeze({
      ...state.mobility,
      maneuver: Object.freeze({ ...current, used }),
      heading: normalizeHexHeading(heading)
    })
  });
}

export function weaponReloadRemaining(weaponState, round) {
  return Math.max(0, Math.trunc(Number(weaponState?.readyRound) || 0) - Math.trunc(Number(round) || 0));
}

export function fireWeapon(state, weaponKey, round) {
  const weapon = state?.weapons?.[weaponKey];
  if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  if (weaponReloadRemaining(weapon, combatRound) > 0) throw new Error(`${weapon.name} is still reloading.`);
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, weapon.fireAP);
  const readyRound = combatRound + weapon.reloadRounds + 1;
  const updated = Object.freeze({ ...weapon, readyRound, lastFiredRound: combatRound });
  return Object.freeze({
    ...next,
    weapons: Object.freeze({ ...next.weapons, [weaponKey]: updated }),
    log: Object.freeze([...(next.log ?? []), Object.freeze({ round: combatRound, kind: "fire-weapon", weaponKey, ap: weapon.fireAP, readyRound })])
  });
}

export function workTheGuns(state, weaponKey, round) {
  const weapon = state?.weapons?.[weaponKey];
  if (!weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  if (weaponReloadRemaining(weapon, combatRound) <= 0) throw new Error(`${weapon.name} is already ready.`);
  let next = spendPoints(state, COMBAT_POINT_TYPES.AP, 1);
  const updated = Object.freeze({ ...weapon, readyRound: Math.max(combatRound, weapon.readyRound - 1) });
  return Object.freeze({
    ...next,
    weapons: Object.freeze({ ...next.weapons, [weaponKey]: updated }),
    log: Object.freeze([...(next.log ?? []), Object.freeze({ round: combatRound, kind: "work-the-guns", weaponKey, ap: 1, readyRound: updated.readyRound })])
  });
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
      maneuver: Object.freeze({ purchases: 0, allowance: 0, used: 0 })
    })
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
