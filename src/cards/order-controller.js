import { beginCardCombat, cardAvailability, validateCardCatalog } from "./card-library.js";
import {
  getOrderQueue, startOrderRound, lockOrderPlan, beginOrderExecution,
  pendingOrder, reassignOrderOperator, requestOrderExecution, payOrderCosts, completeOrder,
  skipOrder, finishOrderTurn, availableOrderResources, orderCostAvailability
} from "./committed-orders.js";

// An authority-side controller, not a socket endpoint. getContext must identify
// the authenticated requester; never populate its user from client-supplied data.
// Drivers prepare effects without document writes. write must atomically compare
// expectedShip and persist the whole resulting ship, or reject without changes.
export function createOrderController({ cards, drivers, read, write, getContext, ownsOperator, isEligibleOperator, baseAP = () => 4 }) {
  const catalog = structuredClone(validateCardCatalog(cards));
  for (const fn of [read, write, getContext, ownsOperator, isEligibleOperator, baseAP]) if (typeof fn !== "function") throw new Error("Provide the order controller's authority, persistence and eligibility adapters.");
  const queues = new Map();

  function captain(ship, context) {
    if (!context.user?.isGM && !ownsOperator(context.user, ship.crew?.stations?.captain)) throw new Error("Only the Captain or GM can commit or manage ship orders.");
  }

  function execution(shipId, context) {
    if (context.phase !== "execution" || context.initiativeReady !== true || context.activeShipId !== shipId) throw new Error("Wait for this ship's turn after initiative is rolled.");
  }

  function resolver(ship, order, context) {
    if (!isEligibleOperator(order.operatorId, order.station, ship)) throw new Error("The assigned operator is no longer eligible; reassign this order.");
    if (!context.user?.isGM && !ownsOperator(context.user, order.operatorId)) throw new Error("Only the assigned operator or GM can resolve this order.");
  }

  function contextKey(context) {
    return JSON.stringify([context.combatId, context.round, context.phase, context.activeShipId, context.initiativeReady, context.user?.id, context.user?.isGM]);
  }

  async function transaction(shipId, request, perform, { opening = false } = {}) {
    if (typeof shipId !== "string" || !shipId) throw new Error("Choose a ship.");
    if (!opening && (!request || !Number.isSafeInteger(request.round) || !Number.isSafeInteger(request.revision))) throw new Error("Provide the current order round and revision.");
    const before = queues.get(shipId) ?? Promise.resolve();
    const pending = before.catch(() => {}).then(async () => {
      const context = await getContext(shipId);
      if (!context.user?.id || !context.combatId || !Number.isSafeInteger(context.round) || context.round < 1) throw new Error("An authenticated user and active combat round are required.");
      const original = structuredClone(await read(shipId));
      if (!original) throw new Error("Ship not found.");
      if (!opening) {
        const queue = getOrderQueue(original);
        if (original.cardDecks.runtime.combatId !== context.combatId || queue.round !== context.round || request.round !== queue.round || request.revision !== queue.revision) throw new Error("The order plan changed; refresh before trying again.");
      }
      const originalContextKey = contextKey(context);
      const result = await perform(structuredClone(original), context);
      const freshContext = await getContext(shipId);
      if (contextKey(freshContext) !== originalContextKey) throw new Error("Combat changed while resolving this request; no order changes were saved.");
      if (result.recheck) result.recheck(freshContext);
      await write(shipId, result.ship, { expectedShip: original });
      return { ship: structuredClone(result.ship), order: result.order ?? null, skipped: result.skipped ?? false, details: result.details ?? null };
    });
    queues.set(shipId, pending);
    try { return await pending; }
    finally { if (queues.get(shipId) === pending) queues.delete(shipId); }
  }

  function selectionOf(value = {}) {
    const allowed = ["targetId", "batteryId", "weaponKeys", "assignments", "skill", "choice"];
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error("Choose execution targets, weapons or a skill; roll results and costs come from the authority.");
    for (const [key, item] of Object.entries(value)) {
      if (key === "assignments") {
        if (!Array.isArray(item) || item.length > 24 || item.some(row => !row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).length !== 2 || typeof row.weaponKey !== "string" || typeof row.targetId !== "string")) throw new Error("Invalid broadside assignments.");
      } else if (key === "weaponKeys" || (key === "choice" && Array.isArray(item))) {
        if (!Array.isArray(item) || item.length > 24 || item.some(id => typeof id !== "string")) throw new Error("Invalid execution choices.");
      } else if (typeof item !== "string") throw new Error("Invalid execution choice.");
    }
    return structuredClone(value);
  }

  return Object.freeze({
    openRound(shipId) {
      return transaction(shipId, null, (ship, context) => {
        if (!context.user.isGM || context.phase !== "planning") throw new Error("The GM opens round planning before initiative.");
        return { ship: startOrderRound(beginCardCombat(ship, context.combatId), context.round, { ap: baseAP(ship) }) };
      }, { opening: true });
    },
    lockPlan(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        if (request.bonus === true) execution(shipId, context);
        else if (context.phase !== "planning") throw new Error("Lock the Captain's initial plan before initiative.");
        return { ship: lockOrderPlan(ship, catalog, request.orders, { bonus: request.bonus === true, isEligibleOperator }) };
      });
    },
    beginExecution(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        execution(shipId, context);
        return { ship: beginOrderExecution(ship) };
      });
    },
    reassign(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        execution(shipId, context);
        return { ship: reassignOrderOperator(ship, request.orderId, request.operatorId, { isEligibleOperator }) };
      });
    },
    requestExecution(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        execution(shipId, context);
        return { ship: requestOrderExecution(ship, request.orderId, context.user.id) };
      });
    },
    resolve(shipId, request) {
      return transaction(shipId, request, async (ship, context) => {
        execution(shipId, context);
        const order = pendingOrder(ship, request.orderId);
        resolver(ship, order, context);
        const recheck = fresh => resolver(ship, order, fresh);
        if (order.kind === "card") {
          const available = cardAvailability(ship, catalog, order.abilityId);
          if (!available.ok) return { ship: skipOrder(ship, order.id, `Card unavailable: ${available.reason}`), order, skipped: true, recheck };
        }
        const driver = drivers?.[`${order.kind}:${order.abilityId}`];
        if (typeof driver?.preflight !== "function" || typeof driver?.execute !== "function") throw new Error("This order's effect driver is not implemented yet.");
        const selection = selectionOf(request.selection);
        const check = await driver.preflight({ ship: structuredClone(ship), order: structuredClone(order), selection, context });
        if (check?.ok !== true) {
          if (check?.impossible === true && typeof check.reason === "string" && check.reason.trim()) return { ship: skipOrder(ship, order.id, check.reason), order, skipped: true, recheck };
          throw new Error(check?.reason ?? "Choose a legal target, battery and skill for this order.");
        }
        const costCheck = orderCostAvailability(ship, order.id);
        if (!costCheck.ok) return { ship: skipOrder(ship, order.id, costCheck.reason), order, skipped: true, recheck };
        const paid = payOrderCosts(ship, order.id);
        const result = await driver.execute({ ship: structuredClone(paid), order: structuredClone(order), selection, context, availableResources: availableOrderResources(paid, { excludeOrderId: order.id }) });
        if (!result?.ship || typeof result.ship !== "object" || Array.isArray(result.ship)) throw new Error("The effect driver did not return a resulting ship.");
        // Drivers cannot rewrite hands, plans, cooldowns or card uses. Resolve
        // those here, with AP gained only through an explicit validated award.
        const effected = { ...paid, ...result.ship, cardDecks: paid.cardDecks };
        availableOrderResources(effected, { excludeOrderId: order.id });
        return { ship: completeOrder(effected, catalog, order.id, { bonusAP: result.bonusAP ?? 0 }), order, details: result.details, recheck };
      });
    },
    skip(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        execution(shipId, context);
        return { ship: skipOrder(ship, request.orderId, request.reason), skipped: true };
      });
    },
    finishTurn(shipId, request) {
      return transaction(shipId, request, (ship, context) => {
        captain(ship, context);
        execution(shipId, context);
        return { ship: finishOrderTurn(ship) };
      });
    }
  });
}
