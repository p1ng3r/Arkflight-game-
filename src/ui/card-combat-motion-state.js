// Pure presentation deltas. These never roll dice or change encounter state.
const runtime = ship => ship?.cardDecks?.runtime ?? {};
const queue = ship => runtime(ship).orderQueue ?? {};
const attackKey = attack => JSON.stringify(attack ?? null);

function appendedLogs(before = [], after = []) {
  // The encounter retains only its last 100 entries. Find the surviving overlap.
  for (let count = Math.min(before.length, after.length); count > 0; count--) {
    if (JSON.stringify(before.slice(-count)) === JSON.stringify(after.slice(0, count))) return after.slice(count);
  }
  return before.length ? [] : after;
}

export function combatMotionEvents(before, after) {
  if (!before || !after || before.id !== after.id || after.revision !== before.revision + 1 || after.phase === "complete") return [];
  const events = [];
  for (const [shipId, ship] of Object.entries(after.ships ?? {})) {
    const old = before.ships?.[shipId];
    if (!old) continue;
    const previous = queue(old), current = queue(ship);
    if (after.round === before.round && (current.plans?.length ?? 0) > (previous.plans?.length ?? 0)) {
      events.push({ kind: "lock", shipId, orders: (current.orders ?? []).filter(order => !(previous.orders ?? []).some(row => row.id === order.id)) });
    }
    for (const pool of ["ap", "rp"]) {
      const prior = pool === "ap" ? previous.ap?.remaining : old.cardPlay?.rp;
      const value = pool === "ap" ? current.ap?.remaining : ship.cardPlay?.rp;
      if (Number.isFinite(prior) && Number.isFinite(value) && prior !== value) events.push({ kind: "pool", shipId, pool, delta: value - prior });
    }
    for (const [resource, track] of Object.entries(ship.resources ?? {})) {
      const prior = old.resources?.[resource];
      if (Number.isFinite(prior?.value) && Number.isFinite(track.value) && prior.value !== track.value) events.push({ kind: "resource", shipId, resource, delta: track.value - prior.value, from: prior.value, max: track.max });
    }
    for (const cardId of runtime(ship).spentSignatures ?? []) {
      if (!(runtime(old).spentSignatures ?? []).includes(cardId)) events.push({ kind: "signature", shipId, cardId });
    }
    for (const [cardId, readyRound] of Object.entries(runtime(old).readyRound ?? {})) {
      if (readyRound > before.round && (runtime(ship).readyRound?.[cardId] ?? readyRound) <= after.round) events.push({ kind: "ready", shipId, cardId });
    }
    const a = old.cardPlay?.motion, b = ship.cardPlay?.motion;
    if (a && b && (a.q !== b.q || a.r !== b.r)) events.push({ kind: "move", shipId });
  }
  const active = after.phase === "execution" ? after.turnOrder?.[after.turnIndex] : null;
  const priorActive = before.phase === "execution" ? before.turnOrder?.[before.turnIndex] : null;
  if (active && active !== priorActive) events.push({ kind: "turn", shipId: active });
  for (const entry of appendedLogs(before.log, after.log)) {
    if (entry.targets?.length && entry.result) events.push({ kind: "fire", shipId: entry.shipId, targets: entry.targets });
    else if (entry.shipId && entry.result) events.push({ kind: "outcome", shipId: entry.shipId, cardId: entry.label, result: entry.result.reaction ?? entry.result, attack: entry.result.attackerId ? entry.result : null });
  }
  if (after.pendingAttack && attackKey(after.pendingAttack) !== attackKey(before.pendingAttack)) events.push({ kind: "incoming", shipId: after.pendingAttack.targetId });
  return events;
}

export function createMotionTracker() {
  let previous = null;
  return {
    observe(state) {
      if (!state) { previous = null; return []; }
      if (previous?.id === state.id && state.revision <= previous.revision) return [];
      const events = combatMotionEvents(previous, state);
      previous = structuredClone(state);
      return events;
    },
    reset() { previous = null; }
  };
}

export function effectiveMotion(preference, reduced = false) {
  return reduced || !["full", "subtle", "off"].includes(preference) ? "off" : preference;
}

export function cardCooldown(ship, card, round) {
  const state = runtime(ship), ready = state.readyRound?.[card.id] ?? 0;
  const remaining = Math.max(0, ready - round);
  return { remaining, readyRound: ready, progress: remaining ? Math.max(0, Math.min(100, 100 * (1 - remaining / Math.max(1, card.cooldownRounds)))) : 100, spent: (state.spentSignatures ?? []).includes(card.id) };
}
