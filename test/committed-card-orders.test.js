import test from "node:test";
import assert from "node:assert/strict";
import { beginCardCombat, cardAvailability } from "../src/cards/card-library.js";
import {
  getOrderQueue, startOrderRound, lockOrderPlan, beginOrderExecution,
  availableOrderResources, finishOrderTurn
} from "../src/cards/committed-orders.js";
import { createOrderController } from "../src/cards/order-controller.js";

// Test effects deliberately stay separate from the planned 105-card collection.
const make = (id, station, type = "general", costs = {}, deck = "ap") => ({
  id, name: id, stations: [station], deck, type, costs,
  ...(type === "flux" ? { cooldownRounds: 2 } : {}),
  outcomes: { criticalSuccess: "Base and boon", success: "Base", failure: "Base and drawback", criticalFailure: "Base and complication" }
});
const CARDS = [make("vent", "engineer", "flux", { supplies: 1 }), make("route", "navigator", "general", { supplies: 1 }), make("aim", "battlewatch"), make("extra-ap", "captain"), make("renew", "veilwarden", "signature", { supplies: 1 }), make("ward", "veilwarden", "general", {}, "rp")];
const OPERATORS = { captain: ["cap"], engineer: ["eng", "backup"], navigator: ["nav"], battlewatch: ["gun"], veilwarden: ["veil"] };
const eligible = (operator, station) => OPERATORS[station]?.includes(operator) === true;
const order = (abilityId, station, operatorId, kind = "card") => ({ kind, abilityId, station, operatorId });
const vent = () => order("vent", "engineer", "eng");
const route = () => order("route", "navigator", "nav");
const extra = () => order("extra-ap", "captain", "cap");
const fire = () => order("fire-battery", "battlewatch", "gun", "basic");
function newShip() {
  const hands = { ap: CARDS.filter(card => card.deck === "ap").map(card => card.id), rp: ["ward"] };
  return {
    progression: { level: 1 }, crew: { stations: { captain: "cap", engineer: "eng", navigator: "nav", battlewatch: "gun", veilwarden: "veil" } },
    resources: { supplies: { value: 3, max: 10 }, morale: { value: 60, max: 100 }, lifeveil: { value: 100, max: 100 }, hull: { value: 100, max: 100 } },
    cardDecks: { version: 1, library: structuredClone(hands), hands, runtime: null }
  };
}
function planning() { return startOrderRound(beginCardCombat(newShip(), "battle"), 1); }
function lock(ship, orders, bonus = false) { return lockOrderPlan(ship, CARDS, orders, { bonus, isEligibleOperator: eligible }); }

function world() {
  let saved = newShip();
  const context = { combatId: "battle", round: 1, phase: "planning", activeShipId: null, initiativeReady: false, user: { id: "gm", isGM: true } };
  const effects = [], writes = [];
  const drivers = {};
  for (const item of [...CARDS.map(card => ({ kind: "card", id: card.id })), { kind: "basic", id: "fire-battery" }, { kind: "basic", id: "full-thrust" }]) {
    drivers[`${item.kind}:${item.id}`] = {
      preflight: ({ selection }) => item.id === "fire-battery" && (!selection.targetId || !selection.batteryId) ? { ok: false, reason: "Choose a target and ready battery." } : { ok: true },
      execute: async ({ ship, order, selection, availableResources }) => {
        effects.push({ abilityId: order.abilityId, selection, availableResources });
        return { ship, bonusAP: order.abilityId === "extra-ap" ? 3 : 0, details: "Test effect" };
      }
    };
  }
  let failWrite = false;
  const api = createOrderController({
    cards: CARDS, drivers,
    read: async () => structuredClone(saved),
    write: async (_id, next, { expectedShip }) => {
      if (failWrite) throw new Error("Persistence rejected");
      assert.deepEqual(expectedShip, saved, "reject concurrent changes rather than overwrite them");
      saved = structuredClone(next); writes.push(saved);
    },
    getContext: () => context,
    ownsOperator: (user, operator) => operator === user.id,
    isEligibleOperator: eligible
  });
  return {
    api, context, drivers, effects, writes,
    get ship() { return saved; },
    set ship(value) { saved = structuredClone(value); },
    set failWrite(value) { failWrite = value; },
    request(extra = {}) { const q = getOrderQueue(saved); return { round: q.round, revision: q.revision, ...extra }; },
    user(id, isGM = false) { context.user = { id, isGM }; },
    async prepare(orders) {
      await api.openRound("ship");
      this.user("cap");
      await api.lockPlan("ship", this.request({ orders }));
      context.phase = "execution"; context.initiativeReady = true; context.activeShipId = "ship";
      await api.beginExecution("ship", this.request());
    }
  };
}

test("locking pays AP only and reserves base resource costs without consuming cards", () => {
  const before = planning(), after = lock(before, [vent(), route(), fire()]);
  assert.equal(getOrderQueue(after).ap.remaining, 1);
  assert.equal(getOrderQueue(after).ap.committed, 3);
  assert.equal(after.resources.supplies.value, 3);
  assert.equal(availableOrderResources(after).supplies, 1);
  assert.equal(cardAvailability(after, CARDS, "vent").ok, true);
  assert.equal(getOrderQueue(before).orders.length, 0);
  assert.throws(() => lock(after, []), /cannot be changed/);
});

test("planning rejects duplicate cards, overspending, wrong stations, RP cards and target preselection atomically", () => {
  const before = planning(), snapshot = structuredClone(before);
  for (const requests of [
    [vent(), vent()], [fire(), fire(), fire(), fire(), fire()],
    [order("vent", "navigator", "nav")], [order("ward", "veilwarden", "veil")],
    [order("vent", "engineer", "nav")], [{ ...fire(), targetId: "enemy" }],
    [{ ...fire(), costs: { supplies: 0 } }]
  ]) assert.throws(() => lock(before, requests));
  const broke = structuredClone(before); broke.resources.supplies.value = 1;
  assert.throws(() => lock(broke, [vent(), route()]), /supplies/);
  assert.deepEqual(before, snapshot);
  assert.throws(() => lockOrderPlan(before, [{ ...CARDS[0], costs: { gold: 1 } }], [vent()], { isEligibleOperator: eligible }), /resource cost/);
});

test("round retries do not refresh AP and cannot erase an unfinished turn", () => {
  const ship = lock(planning(), [fire(), fire()]);
  assert.deepEqual(startOrderRound(ship, 1), ship);
  assert.throws(() => startOrderRound(ship, 2), /Finish/);
  const finished = finishOrderTurn(beginOrderExecution(ship));
  const next = startOrderRound(finished, 2);
  assert.equal(getOrderQueue(next).ap.remaining, 4);
  assert.equal(getOrderQueue(next).phase, "planning");
  assert.equal(getOrderQueue(next).orders.length, 0);
});

test("only the Captain or GM can lock plans; initial plans precede initiative", async () => {
  const w = world();
  w.user("eng"); await assert.rejects(() => w.api.openRound("ship"), /GM/);
  w.user("gm", true); await w.api.openRound("ship");
  w.user("eng"); await assert.rejects(() => w.api.lockPlan("ship", w.request({ orders: [vent()] })), /Captain/);
  w.user("cap"); w.context.phase = "execution";
  await assert.rejects(() => w.api.lockPlan("ship", w.request({ orders: [vent()] })), /before initiative/);
  assert.equal(getOrderQueue(w.ship).phase, "planning");
  await assert.rejects(() => w.api.beginExecution("ship"), /round and revision/);
});

test("orders execute in any sequence, pay no second AP, and choose battery and target at execution", async () => {
  const w = world(); await w.prepare([vent(), fire(), route()]);
  const q = getOrderQueue(w.ship);
  w.user("gun");
  const selection = { targetId: "enemy", batteryId: "port", skill: "crafting" };
  await w.api.resolve("ship", w.request({ orderId: q.orders[1].id, selection }));
  assert.equal(getOrderQueue(w.ship).ap.remaining, 1);
  assert.deepEqual(w.effects[0].selection, selection);
  w.user("nav"); await w.api.resolve("ship", w.request({ orderId: q.orders[2].id }));
  w.user("eng"); await w.api.resolve("ship", w.request({ orderId: q.orders[0].id }));
  assert.deepEqual(w.effects.map(effect => effect.abilityId), ["fire-battery", "route", "vent"]);
  assert.equal(w.ship.resources.supplies.value, 1);
  assert.equal(getOrderQueue(w.ship).ap.remaining, 1);
  assert.equal(cardAvailability(w.ship, CARDS, "vent").ok, false);
});

test("normal costs of the current order are paid once and other reservations remain protected", async () => {
  const w = world(); await w.prepare([vent(), route()]);
  w.user("eng");
  await w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[0].id }));
  assert.equal(w.ship.resources.supplies.value, 2);
  assert.equal(w.effects[0].availableResources.supplies, 1);
  assert.equal(availableOrderResources(w.ship).supplies, 1);
});

test("impossible orders release reservations without refunds or cooldowns; invalid choices can be retried", async () => {
  const w = world(); await w.prepare([vent(), fire()]);
  const [v, f] = getOrderQueue(w.ship).orders;
  w.user("gun");
  await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: f.id })), /ready battery/);
  assert.equal(getOrderQueue(w.ship).orders[1].status, "pending");
  w.drivers["card:vent"].preflight = () => ({ ok: false, impossible: true, reason: "Required system destroyed" });
  w.user("eng");
  const result = await w.api.resolve("ship", w.request({ orderId: v.id }));
  assert.equal(result.skipped, true);
  assert.equal(getOrderQueue(w.ship).ap.remaining, 2);
  assert.equal(w.ship.resources.supplies.value, 3);
  assert.equal(availableOrderResources(w.ship).supplies, 3);
  assert.equal(cardAvailability(w.ship, CARDS, "vent").ok, true);
  assert.equal(w.effects.length, 0);
});

test("resource loss after planning skips an unexecutable order without partially paying or consuming it", async () => {
  const w = world(); await w.prepare([vent(), route()]);
  w.ship = { ...w.ship, resources: { ...w.ship.resources, supplies: { value: 1, max: 10 } } };
  w.user("eng");
  const result = await w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[0].id }));
  assert.equal(result.skipped, true);
  assert.equal(w.ship.resources.supplies.value, 1);
  assert.equal(getOrderQueue(w.ship).orders[1].status, "pending");
  assert.equal(cardAvailability(w.ship, CARDS, "vent").ok, true);
  assert.equal(getOrderQueue(w.ship).ap.remaining, 2);
  assert.equal(w.effects.length, 0);
});

test("earned AP funds additional locked plans without spending unused original AP", async () => {
  const w = world(); await w.prepare([extra()]);
  const original = getOrderQueue(w.ship).orders[0];
  await w.api.resolve("ship", w.request({ orderId: original.id }));
  assert.equal(getOrderQueue(w.ship).ap.remaining, 6);
  assert.equal(getOrderQueue(w.ship).ap.bonusAvailable, 3);
  await assert.rejects(() => w.api.lockPlan("ship", w.request({ bonus: true, orders: [fire(), fire(), fire(), fire()] })), /uncommitted AP/);
  await w.api.lockPlan("ship", w.request({ bonus: true, orders: [fire(), fire(), vent()] }));
  const q = getOrderQueue(w.ship);
  assert.deepEqual(q.orders[0], { ...original, status: "resolved" });
  assert.equal(q.ap.bonusAvailable, 0);
  assert.equal(q.ap.remaining, 3); // Original unallocated AP is still locked out.
  await assert.rejects(() => w.api.lockPlan("ship", w.request({ bonus: true, orders: [fire()] })), /uncommitted AP/);
  await assert.rejects(() => w.api.lockPlan("ship", w.request({ orders: [fire()] })), /before initiative/);
});

test("only the assigned player resolves an order; Captain takeover requires reassignment, GM can resolve directly", async () => {
  const w = world(); await w.prepare([vent(), route()]);
  const [v, r] = getOrderQueue(w.ship).orders;
  await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: v.id })), /assigned operator/);
  await assert.rejects(() => w.api.reassign("ship", w.request({ orderId: v.id, operatorId: "nav" })), /replacement/);
  await w.api.reassign("ship", w.request({ orderId: v.id, operatorId: "backup" }));
  w.user("eng"); await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: v.id })), /assigned operator/);
  w.user("backup"); await w.api.resolve("ship", w.request({ orderId: v.id }));
  w.user("gm", true); await w.api.resolve("ship", w.request({ orderId: r.id }));
  assert.equal(w.effects.length, 2);
});

test("concurrent duplicate requests execute and pay only once", async () => {
  const w = world(); await w.prepare([vent()]); w.user("eng");
  const request = w.request({ orderId: getOrderQueue(w.ship).orders[0].id });
  const results = await Promise.allSettled([w.api.resolve("ship", request), w.api.resolve("ship", request)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.match(results.find(result => result.status === "rejected").reason.message, /plan changed/);
  assert.equal(w.effects.length, 1);
  assert.equal(w.ship.resources.supplies.value, 2);
  assert.equal(getOrderQueue(w.ship).ap.earned, 0);
});

test("Captain execution requests mark the order without rolling or consuming it", async () => {
  const w = world(); await w.prepare([vent()]);
  const id = getOrderQueue(w.ship).orders[0].id;
  await w.api.requestExecution("ship", w.request({ orderId: id }));
  const requested = getOrderQueue(w.ship);
  assert.equal(requested.orders[0].requestedBy, "cap");
  assert.equal(requested.orders[0].status, "pending");
  assert.equal(w.effects.length, 0);
  assert.equal(w.ship.resources.supplies.value, 3);
  await w.api.requestExecution("ship", w.request({ orderId: id }));
  assert.equal(getOrderQueue(w.ship).revision, requested.revision);
  w.user("eng"); await w.api.resolve("ship", w.request({ orderId: id }));
  assert.equal(w.effects.length, 1);
});

test("nonfinite AP grants and missing effect implementations cannot partially resolve an order", async () => {
  const w = world(); await w.prepare([extra(), vent()]);
  const before = structuredClone(w.ship);
  w.drivers["card:extra-ap"].execute = async ({ ship }) => ({ ship, bonusAP: -1 });
  await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[0].id })), /AP amount/);
  assert.deepEqual(w.ship, before);
  w.user("eng"); delete w.drivers["card:vent"];
  await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[1].id })), /not implemented/);
  assert.deepEqual(w.ship, before);
});

test("a stale previous-round request cannot execute a new round's order", async () => {
  const w = world(); await w.prepare([vent()]);
  const stale = w.request({ orderId: getOrderQueue(w.ship).orders[0].id });
  await w.api.finishTurn("ship", w.request());
  w.user("gm", true); w.context.round = 2; w.context.phase = "planning";
  await w.api.openRound("ship");
  w.user("cap"); await w.api.lockPlan("ship", w.request({ orders: [vent()] }));
  w.context.phase = "execution";
  await w.api.beginExecution("ship", w.request());
  w.user("eng");
  await assert.rejects(() => w.api.resolve("ship", stale), /plan changed/);
  assert.equal(w.effects.length, 0);
  await w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[0].id }));
  assert.equal(cardAvailability(w.ship, CARDS, "vent").reason, "used-this-round");
});

test("other turns, missing initiative and injected dice/costs cannot execute orders", async () => {
  const w = world(); await w.prepare([vent()]); w.user("eng");
  const request = () => w.request({ orderId: getOrderQueue(w.ship).orders[0].id });
  w.context.activeShipId = "enemy";
  await assert.rejects(() => w.api.resolve("ship", request()), /ship's turn/);
  w.context.activeShipId = "ship"; w.context.initiativeReady = false;
  await assert.rejects(() => w.api.resolve("ship", request()), /initiative/);
  w.context.initiativeReady = true;
  await assert.rejects(() => w.api.resolve("ship", { ...request(), selection: { die: 20, costs: 0 } }), /authority/);
  assert.equal(w.effects.length, 0);
});

test("failed persistence or driver failure leaves costs, cooldowns, AP and queue unchanged", async () => {
  const w = world(); await w.prepare([vent()]); w.user("eng");
  const before = structuredClone(w.ship);
  const request = () => w.request({ orderId: getOrderQueue(w.ship).orders[0].id });
  w.failWrite = true;
  await assert.rejects(() => w.api.resolve("ship", request()), /Persistence rejected/);
  assert.deepEqual(w.ship, before);
  w.failWrite = false;
  w.drivers["card:vent"].execute = async ({ ship }) => { ship.resources.supplies.value = 0; throw new Error("Driver failed"); };
  await assert.rejects(() => w.api.resolve("ship", request()), /Driver failed/);
  assert.deepEqual(w.ship, before);
});

test("a combat change during an async effect does not commit its stale outcome", async () => {
  const w = world(); await w.prepare([vent()]); w.user("eng");
  const before = structuredClone(w.ship);
  w.drivers["card:vent"].execute = async ({ ship }) => { w.context.round = 2; return { ship }; };
  await assert.rejects(() => w.api.resolve("ship", w.request({ orderId: getOrderQueue(w.ship).orders[0].id })), /Combat changed/);
  assert.deepEqual(w.ship, before);
});

test("ending the turn skips pending orders, releases reservations and leaves Signatures unused", async () => {
  const w = world(); await w.prepare([order("renew", "veilwarden", "veil"), vent()]);
  await w.api.finishTurn("ship", w.request());
  assert.equal(getOrderQueue(w.ship).phase, "complete");
  assert.equal(getOrderQueue(w.ship).ap.remaining, 2);
  assert.equal(availableOrderResources(w.ship).supplies, 3);
  assert.equal(cardAvailability(w.ship, CARDS, "renew").ok, true);
  assert.equal(w.effects.length, 0);
});
