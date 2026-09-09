import { COMBATANT_STATE_VERSION, createCombatantState } from "./combatant-state.js";

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

/**
 * Reconcile transient Foundry combat state against the ship Actor's authoritative
 * installed loadout. Shipwright/refit owns the physical installation list;
 * combat state owns only runtime data such as reload timing.
 */
export function reconcileCombatantState(ship, currentState, {
  derived = null,
  catalogs = {},
  rotation = 0
} = {}) {
  const fresh = createCombatantState(ship, { derived, catalogs, rotation });
  if (!currentState) return fresh;

  const weapons = reconciledWeapons(fresh.weapons, currentState.weapons);
  const currentVersion = Math.trunc(Number(currentState.version) || 0);
  const schemaCurrent = currentVersion === COMBATANT_STATE_VERSION;
  const economyCurrent = validEconomy(currentState);
  const mobilityCurrent = validMobility(currentState);

  // A stale combatant from an older combat-state schema must be made playable
  // again. Preserve valid runtime tracks when possible, but repair missing/zero
  // AP and other obsolete structures from the current hull profile.
  if (!schemaCurrent || !economyCurrent || !mobilityCurrent) {
    return Object.freeze({
      ...fresh,
      turnKey: typeof currentState.turnKey === "string" ? currentState.turnKey : fresh.turnKey,
      economy: economyCurrent ? currentState.economy : fresh.economy,
      mobility: mobilityCurrent ? currentState.mobility : fresh.mobility,
      weapons,
      log: Array.isArray(currentState.log) ? Object.freeze([...currentState.log]) : fresh.log
    });
  }

  // Current-schema states retain AP, movement, heading, strain and history while
  // their weapon rows are rebuilt from whatever is physically installed now.
  return Object.freeze({
    ...currentState,
    version: COMBATANT_STATE_VERSION,
    weapons
  });
}
