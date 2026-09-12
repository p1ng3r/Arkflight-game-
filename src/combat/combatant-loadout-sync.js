import { createCombatantState } from "./combatant-state.js";
import { normalizeShipHeading } from "./combat-schema.js";

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

function validEconomy(economy) {
  return validTrack(economy?.ap, { positiveMax: true })
    && validTrack(economy?.rp);
}

function validMobility(mobility) {
  return Boolean(
    mobility
    && finiteNumber(mobility.speed) != null
    && finiteNumber(mobility.maneuverability) != null
    && finiteNumber(mobility.heading) != null
    && mobility.movement
    && mobility.maneuver
  );
}

function migrationRound(currentState, explicitRound = null) {
  const supplied = finiteNumber(explicitRound);
  if (supplied != null && supplied > 0) return Math.max(1, Math.trunc(supplied));
  const match = /^round:(\d+)$/.exec(String(currentState?.turnKey ?? ""));
  if (match) return Math.max(1, Math.trunc(Number(match[1]) || 1));
  return 1;
}

function preserveWeaponRuntime(freshWeapon, currentWeapon, round) {
  if (!currentWeapon || currentWeapon.id !== freshWeapon.id) return freshWeapon;
  const explicitRemaining = finiteNumber(currentWeapon.reloadRemaining);
  const legacyReadyRound = finiteNumber(currentWeapon.readyRound);
  const lastFiredRound = currentWeapon.lastFiredRound == null ? null : finiteNumber(currentWeapon.lastFiredRound);

  let reloadRemaining = explicitRemaining == null ? null : Math.max(0, Math.trunc(explicitRemaining));
  if (reloadRemaining == null && legacyReadyRound != null) {
    const legacyRemaining = Math.max(0, Math.trunc(legacyReadyRound) - Math.max(1, Math.trunc(Number(round) || 1)));
    // Legacy readyRound included passive time. During migration, never require
    // more active Reload actions than the weapon's authored Reload value.
    reloadRemaining = Math.min(Math.max(0, Math.trunc(Number(freshWeapon.reloadRounds) || 0)), legacyRemaining);
  }

  return Object.freeze({
    ...freshWeapon,
    reloadRemaining: reloadRemaining ?? freshWeapon.reloadRemaining,
    lastFiredRound: currentWeapon.lastFiredRound == null
      ? null
      : (lastFiredRound == null ? freshWeapon.lastFiredRound : Math.max(1, Math.trunc(lastFiredRound)))
  });
}

function reconciledWeapons(freshWeapons, currentWeapons = {}, round = 1) {
  return Object.freeze(Object.fromEntries(
    Object.entries(freshWeapons ?? {}).map(([key, freshWeapon]) => [
      key,
      preserveWeaponRuntime(freshWeapon, currentWeapons?.[key], round)
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
  const heading = normalizeShipHeading(current.heading);
  const hasCommittedFacing = finiteNumber(current?.facing?.usedDegrees) != null;
  const committedHeading = hasCommittedFacing
    ? normalizeShipHeading(current.committedHeading ?? heading)
    : heading;
  const facing = hasCommittedFacing
    ? Object.freeze({
        usedDegrees: Math.max(0, Math.trunc(Number(current.facing.usedDegrees) || 0)),
        commits: Math.max(0, Math.trunc(Number(current.facing.commits) || 0)),
        lastReason: current.facing.lastReason == null ? null : String(current.facing.lastReason)
      })
    : fresh.facing;

  return Object.freeze({
    ...fresh,
    heading,
    committedHeading,
    facing,
    movement: Object.freeze({ ...current.movement }),
    // v5 and earlier stored every token rotation update in maneuver.used. That
    // value is intentionally discarded; v6 tracks only committed degrees.
    maneuver: Object.freeze({ ...current.maneuver, used: 0 })
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
 * combat state owns only transient facts such as spent points, preview/committed heading, reload progress, movement already taken this turn, and combat history.
 */
export function reconcileCombatantState(ship, currentState, {
  derived = null,
  catalogs = {},
  rotation = 0,
  speedPenalty = 0,
  maneuverPenalty = 0,
  round = null
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
    weapons: reconciledWeapons(fresh.weapons, currentState.weapons, migrationRound(currentState, round)),
    strain: reconcileStrain(fresh.strain, currentState.strain),
    log: Array.isArray(currentState.log) ? Object.freeze([...currentState.log]) : fresh.log
  });
}
