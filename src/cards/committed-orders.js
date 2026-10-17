import { CARD_STATIONS, advanceCardRound, cardAvailability, useShipCard, validateCardCatalog } from "./card-library.js";

// Basic order definitions stay outside equipped-card slots. Their effect drivers
// must still enforce movement limits, weapon readiness and legal targets.
export const BASIC_CARD_ORDERS = Object.freeze([
  Object.freeze({ id: "fire-battery", name: "Fire Battery", stations: Object.freeze(["battlewatch"]) }),
  Object.freeze({ id: "full-thrust", name: "Full Thrust", stations: Object.freeze(["navigator"]) }),
  Object.freeze({ id: "hard-turn", name: "Hard Turn", stations: Object.freeze(["navigator"]) }),
  Object.freeze({ id: "damage-control", name: "Damage Control", stations: Object.freeze(["engineer"]) })
]);
const COST_KEYS = ["supplies", "morale", "lifeveil", "hull"];
const PLAN_KEYS = ["kind", "abilityId", "station", "operatorId"];

function amount(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}.`);
  return value;
}

function apAmount(value) {
  amount(value, "AP amount");
  if (!Number.isSafeInteger(value)) throw new Error("AP must be a whole number.");
  return value;
}

function positiveId(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Provide ${label}.`);
  return value;
}

function queueOf(ship) {
  const queue = ship.cardDecks?.runtime?.orderQueue;
  if (!queue || queue.round !== ship.cardDecks.runtime.round) throw new Error("Start this round's order planning first.");
  return queue;
}

function withQueue(ship, queue) {
  return { ...ship, cardDecks: { ...ship.cardDecks, runtime: { ...ship.cardDecks.runtime, orderQueue: queue } } };
}

export function getOrderQueue(ship) {
  return structuredClone(queueOf(ship));
}

function definition(cards, kind, id) {
  const item = kind === "basic" ? BASIC_CARD_ORDERS.find(order => order.id === id) : kind === "card" ? cards.find(card => card.id === id && card.deck === "ap") : null;
  if (!item) throw new Error("Choose an AP card or a basic ship order.");
  return item;
}

function costsOf(source = {}) {
  if (!source || typeof source !== "object" || Array.isArray(source) || Object.keys(source).some(key => !COST_KEYS.includes(key))) throw new Error("Unknown order resource cost.");
  return Object.fromEntries(COST_KEYS.map(key => [key, amount(source[key] ?? 0, `${key} cost`)]));
}

function resourcesOf(ship) {
  return Object.fromEntries(COST_KEYS.map(key => [key, amount(ship.resources?.[key]?.value ?? 0, `${key} resource`)]));
}

function reservedCosts(queue, excludeId = null) {
  const totals = costsOf();
  for (const order of queue.orders) {
    if (order.status !== "pending" || order.id === excludeId) continue;
    for (const key of COST_KEYS) totals[key] += order.costs[key];
  }
  return totals;
}

export function availableOrderResources(ship, { excludeOrderId = null } = {}) {
  const held = reservedCosts(queueOf(ship), excludeOrderId);
  const values = resourcesOf(ship);
  return Object.fromEntries(COST_KEYS.map(key => [key, Math.max(0, values[key] - held[key])]));
}

export function startOrderRound(ship, round, { ap = 4 } = {}) {
  apAmount(ap);
  const previous = ship.cardDecks?.runtime?.orderQueue;
  if (previous) {
    if (round === previous.round) return ship; // Retries never refresh AP or a locked plan.
    if (previous.phase !== "complete") throw new Error("Finish the prior ship turn before opening another plan.");
  }
  const next = advanceCardRound(ship, round);
  return withQueue(next, {
    version: 1, round, phase: "planning", revision: 0,
    ap: { initial: ap, remaining: ap, committed: 0, earned: 0, bonusAvailable: 0 },
    orders: [], plans: []
  });
}

export function lockOrderPlan(ship, cards, requests, { bonus = false, isEligibleOperator } = {}) {
  validateCardCatalog(cards);
  const queue = getOrderQueue(ship);
  if ((!bonus && queue.phase !== "planning") || (bonus && queue.phase !== "execution")) throw new Error("This plan cannot be changed or submitted in the current phase.");
  if (!Array.isArray(requests)) throw new Error("Provide an order list.");
  if (bonus && requests.length === 0) throw new Error("An additional plan needs at least one order.");
  if (typeof isEligibleOperator !== "function") throw new Error("Check station operator eligibility before locking a plan.");
  const budget = bonus ? queue.ap.bonusAvailable : queue.ap.remaining;
  if (requests.length > budget) throw new Error("Not enough uncommitted AP for this plan.");
  const heldCards = new Set(queue.orders.filter(order => order.kind === "card" && order.status !== "skipped").map(order => order.abilityId));
  const planId = `plan-${queue.plans.length + 1}`;
  const added = [];
  for (const request of requests) {
    if (!request || Object.keys(request).some(key => !PLAN_KEYS.includes(key))) throw new Error("Lock only abilities and operators; targets and batteries are chosen during execution.");
    const { kind, abilityId, station, operatorId } = request;
    const item = definition(cards, kind, abilityId);
    if (!CARD_STATIONS.includes(station) || !item.stations.includes(station)) throw new Error("This ability is not eligible for that station.");
    positiveId(operatorId, "an operator");
    if (!isEligibleOperator(operatorId, station, ship)) throw new Error("Assign an eligible station operator.");
    if (kind === "card") {
      if (heldCards.has(abilityId)) throw new Error("A card can be committed only once per round.");
      const check = cardAvailability(ship, cards, abilityId);
      if (!check.ok) throw new Error(`Card unavailable: ${check.reason}.`);
      heldCards.add(abilityId);
    }
    added.push({ id: `r${queue.round}-order-${queue.orders.length + added.length + 1}`, planId, kind, abilityId, station, operatorId, ap: 1, costs: costsOf(item.costs), status: "pending" });
  }
  queue.orders.push(...added);
  const held = reservedCosts(queue), resources = resourcesOf(ship);
  for (const key of COST_KEYS) if (held[key] > resources[key]) throw new Error(`Not enough ${key} to reserve this plan.`);
  queue.ap.remaining -= added.length;
  queue.ap.committed += added.length;
  if (bonus) queue.ap.bonusAvailable -= added.length;
  queue.plans.push({ id: planId, bonus, orderIds: added.map(order => order.id) });
  if (!bonus) queue.phase = "locked";
  queue.revision++;
  return withQueue(ship, queue);
}

export function beginOrderExecution(ship) {
  const queue = getOrderQueue(ship);
  if (queue.phase !== "locked") throw new Error("Lock the Captain's plan before executing orders.");
  queue.phase = "execution";
  queue.revision++;
  return withQueue(ship, queue);
}

export function pendingOrder(ship, orderId) {
  const queue = queueOf(ship);
  if (queue.phase !== "execution") throw new Error("Orders execute only during the ship's execution phase.");
  const order = queue.orders.find(order => order.id === orderId);
  if (!order || order.status !== "pending") throw new Error("Choose an unresolved order.");
  return structuredClone(order);
}

export function reassignOrderOperator(ship, orderId, operatorId, { isEligibleOperator } = {}) {
  const order = pendingOrder(ship, orderId);
  if (typeof isEligibleOperator !== "function" || !isEligibleOperator(operatorId, order.station, ship)) throw new Error("Choose an eligible replacement operator.");
  positiveId(operatorId, "a replacement operator");
  const queue = getOrderQueue(ship);
  queue.orders.find(entry => entry.id === orderId).operatorId = operatorId;
  queue.revision++;
  return withQueue(ship, queue);
}

export function requestOrderExecution(ship, orderId, requesterId) {
  pendingOrder(ship, orderId);
  positiveId(requesterId, "the requesting Captain");
  const queue = getOrderQueue(ship);
  const order = queue.orders.find(entry => entry.id === orderId);
  if (order.requestedBy === requesterId) return ship;
  order.requestedBy = requesterId;
  queue.revision++;
  return withQueue(ship, queue);
}

// Own this order's base cost; other pending orders' reservations stay protected.
// A legal target/battery and any outcome-dependent extra costs are checked by
// the effect driver before committing the resulting ship.
export function orderCostAvailability(ship, orderId) {
  const order = pendingOrder(ship, orderId);
  const held = reservedCosts(queueOf(ship), orderId);
  const values = resourcesOf(ship);
  for (const key of COST_KEYS) {
    if (order.costs[key] > values[key] || held[key] > values[key] - order.costs[key]) return { ok: false, reason: `Reserved ${key} is no longer available.` };
  }
  return { ok: true };
}

export function payOrderCosts(ship, orderId) {
  const order = pendingOrder(ship, orderId);
  const check = orderCostAvailability(ship, orderId);
  if (!check.ok) throw new Error(check.reason);
  const values = resourcesOf(ship);
  const resources = structuredClone(ship.resources ?? {});
  for (const key of COST_KEYS) {
    if (order.costs[key]) resources[key] = { ...resources[key], value: values[key] - order.costs[key] };
  }
  return { ...ship, resources };
}

// Call with the effect driver's resulting ship only after successful execution.
// AP was spent at plan lock, so resolution never charges another AP.
export function completeOrder(ship, cards, orderId, { bonusAP = 0 } = {}) {
  const order = pendingOrder(ship, orderId);
  apAmount(bonusAP);
  let next = order.kind === "card" ? useShipCard(ship, cards, order.abilityId) : ship;
  const queue = getOrderQueue(next);
  queue.orders.find(entry => entry.id === orderId).status = "resolved";
  queue.ap.earned += bonusAP;
  queue.ap.remaining += bonusAP;
  queue.ap.bonusAvailable += bonusAP;
  for (const key of ["earned", "remaining", "bonusAvailable"]) apAmount(queue.ap[key]);
  queue.revision++;
  next = withQueue(next, queue);
  return next;
}

export function skipOrder(ship, orderId, reason) {
  pendingOrder(ship, orderId);
  positiveId(reason, "a skip reason");
  const queue = getOrderQueue(ship);
  const order = queue.orders.find(entry => entry.id === orderId);
  order.status = "skipped";
  order.reason = reason;
  queue.revision++;
  return withQueue(ship, queue);
}

export function finishOrderTurn(ship) {
  const queue = getOrderQueue(ship);
  if (queue.phase !== "execution") throw new Error("The ship is not executing its turn.");
  for (const order of queue.orders) if (order.status === "pending") {
    order.status = "skipped";
    order.reason = "turn-ended";
  }
  queue.phase = "complete";
  queue.revision++;
  return withQueue(ship, queue);
}
