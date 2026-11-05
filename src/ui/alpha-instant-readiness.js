import {alphaActionBlockReason} from "../alpha/combat.js";

/** Shared presentation predicate; authoritative commands still validate every action. */
export function usableInstant(s, ship, card, api) {
  const attack = s?.attacks?.[s.attackIndex];
  return Boolean(
    ship && card && s.phase === 'response' &&
    attack?.targetId === ship.id && !attack.responses[ship.id] &&
    !s.pendingCrewAction && !s.pendingDiscard && !s.pendingCardChoice &&
    !s.complications.choices.some(c => c.status === 'pending') &&
    ship.resources.hull.value > 0 && card.timing === 'instant' &&
    ship.ap >= card.ap && api.canOperate(ship.id, card.stations[0]) &&
    (card.id !== 'shield' || ship.resources.lifeveil.value >= 5) &&
    !alphaActionBlockReason(s, ship.id, card) &&
    !(s.guidedTest?.status === 'running' && !s.guidedTest.manual)
  );
}
