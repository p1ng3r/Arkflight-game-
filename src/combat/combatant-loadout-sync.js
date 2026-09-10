import { createCombatantState } from "./combatant-state.js";

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validTrack(track, { positiveMax = false } = {}) {
  const value = finiteNumber(track?.value);
  const max = finiteNumber(track?.max);
  if (value == null || max == null || max < 0) return false;
  if (positiveMax && max <= 0) return false;
  return value >= 0 && value <= max;
}

function validEconomy(state) {
  return validTrack(state?.economy?.ap, { positiveMax: true })
    && validTrack(state?.economy?.rp);
}

function validMobility(state) {
  const mobility = state?.mobility;
  return Boolean(
    mobility
    && finiteNumber(mobility.speed) != null
    && finiteNumber(mobility.maneuverability) != null
    && finiteNumber(mobility.heading) != null
    && mobility.movement
    && mobility.maneuver
  );
}

function preserveWeaponRuntime(freshWeapon, currentWeapon) {
  if (!currentWeapon || currentWeapon.id !== freshWeapon.id) return freshWeapon;
  const readyRound = finiteNumber(currentWeapon.readyRound);
  const lastFiredRound = currentWeapon.lastFiredRound == null ? null : finiteNumber(currentWeapon.lastFiredRound);
  return Object.freeze({
    ...freshWeapon,
    readyRound: readyRound == null ? freshWeapon.readyRound : Math.max(1, Math.trunc(readyRound)),
    lastFiredRound: currentWeapon.lastFiredRound == null
      ? null
      : (lastFiredRound == null ? freshWeapon.lastFiredRound : Math.max(1, Math.trunc(lastFiredRound)))
  });
}

function reconciledWeapons(freshWeapons, currentWeapons = {}) {
  return Object.freeze(Object.fromEntries(
    Object.entries(freshWeapons ?? {}).map(([key, freshWeapon]) => [
      key,
      preserveWeaponRuntime(freshWeapon, currentWeapons?.[key])
    ])
  ));
}

function reconcileTrack(freshTrack, currentTrack) {
  if (!validTrack(currentTrack)) return freshTrack;
  const spent = Math.max(0, Number(currentTrack.max) - Number(currentTrack.value));
  const max = Number(freshTrack.max);
  return Object.freeze({ value: Math.max(0, max - spent), max });
}

function reconcileEconomy(fresh, current) {
  if (!validEconomy(current)) return fresh;
  return Object.freeze({
    ap: reconcileTrack(fresh.ap, current.ap),
    rp: reconcileTrack(fresh.rp, current.rp)
  });
}

function reconcileMobility(fresh, current) {
  if (!validMobility(current)) return fresh;
  return Object.freeze({
    ...fresh,
    heading: current.heading,
    movement: Object.freeze({ ...current.movement }),
    maneuver: Object.freeze({ ...current.maneuver })
  });
}

function reconcileStrain(fresh, current) {
  const currentValue = finiteNumber(current?.value);
  if (currentValue == null) return fresh;
  const max = Math.max(0, finiteNumber(fresh?.max) ?? 0);
  // Strain is transient combat progress. A refit may change its capacity, but
  // reconciliation must never replace the amount already accumulated with the
  // Actor's freshly hydrated persistent value. Only clamp when capacity shrinks.
  return Object.freeze({ value: Math.min(Math.max(0, currentValue), max), max });
}

/**
 * Reconcile transient Foundry combat state against the ship Actor's authoritative
 * derived build. Shipwright/refit owns physical installation and build facts;
 * combat state owns only transient facts such as spent points, heading, reload
 * timing, movement already taken this turn, and combat history.
 */
export function reconcileCombatantState(ship, currentState, {
  derived = null,
  catalogs = {},
  rotation = 0,
  speedPenalty = 0,
  maneuverPenalty = 0
} = {}) {
  const fresh = createCombatantState(ship, {
    derived,
    catalogs,
    rotation,
    speedPenalty,
    maneuverPenalty
  });
  if (!currentState) return fresh;

  return Object.freeze({
    ...fresh,
    turnKey: typeof currentState.turnKey === "string" ? currentState.turnKey : fresh.turnKey,
    economy: reconcileEconomy(fresh.economy, currentState.economy),
    mobility: reconcileMobility(fresh.mobility, currentState.mobility),
    weapons: reconciledWeapons(fresh.weapons, currentState.weapons),
    strain: reconcileStrain(fresh.strain, currentState.strain),
    log: Array.isArray(currentState.log) ? Object.freeze([...currentState.log]) : fresh.log
  });
}
