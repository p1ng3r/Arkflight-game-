function hullValue(ship) {
  return Math.max(0, Number(ship?.resources?.hull?.value) || 0);
}

/**
 * Resolve whether a ship can continue an Arkflight combat encounter.
 *
 * Hull 0 is the universal terminal state. Ship Conditions such as Unresponsive
 * Drive or Barely Operable Weapons create severe tactical problems but do not
 * automatically remove the vessel from combat.
 */
export function shipCombatOutcome(ship) {
  if (!ship) return Object.freeze({ status: "invalid", terminal: true, reason: "missing-ship" });
  if (hullValue(ship) <= 0) return Object.freeze({ status: "wrecked", terminal: true, reason: "hull-zero" });
  return Object.freeze({ status: "active", terminal: false, reason: null });
}

/** Resolve an encounter once at most one ship remains combat-capable. */
export function combatVictoryState(entries = []) {
  const rows = [...entries].map((entry, index) => {
    const ship = entry?.ship ?? entry;
    return Object.freeze({
      id: entry?.id ?? entry?.name ?? `ship-${index + 1}`,
      outcome: shipCombatOutcome(ship)
    });
  });
  const active = rows.filter((row) => !row.outcome.terminal);
  if (rows.length < 2 || active.length > 1) {
    return Object.freeze({ ended: false, winnerId: null, active: Object.freeze(active), entries: Object.freeze(rows) });
  }
  return Object.freeze({
    ended: true,
    winnerId: active.length === 1 ? active[0].id : null,
    active: Object.freeze(active),
    entries: Object.freeze(rows)
  });
}
