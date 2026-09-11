import test from "node:test";
import assert from "node:assert/strict";
import { coordinatedSalvoPlan, fireCoordinatedSalvo } from "../src/combat/salvo-rules.js";

function combatState() {
  return Object.freeze({
    economy: Object.freeze({
      ap: Object.freeze({ value: 4, max: 4 }),
      rp: Object.freeze({ value: 1, max: 1 })
    }),
    weapons: Object.freeze({
      a: Object.freeze({ key: "a", name: "A", mount: "port", fireAP: 1, reloadRounds: 1, readyRound: 1, lastFiredRound: null }),
      b: Object.freeze({ key: "b", name: "B", mount: "port", fireAP: 1, reloadRounds: 1, readyRound: 1, lastFiredRound: null }),
      c: Object.freeze({ key: "c", name: "C", mount: "starboard", fireAP: 1, reloadRounds: 1, readyRound: 1, lastFiredRound: null })
    }),
    log: Object.freeze([])
  });
}

test("coordinated salvo combines same-facing weapons into one firing event", () => {
  const state = combatState();
  const plan = coordinatedSalvoPlan(state, ["a", "b"], 1);
  assert.equal(plan.totalAP, 2);
  assert.equal(plan.mount, "port");

  const next = fireCoordinatedSalvo(state, ["a", "b"], 1);
  assert.equal(next.economy.ap.value, 2);
  assert.equal(next.weapons.a.readyRound, 3);
  assert.equal(next.weapons.b.readyRound, 3);
  assert.equal(next.log.at(-1).kind, "coordinated-salvo");
});

test("coordinated salvo rejects mixed facings before spending AP", () => {
  assert.throws(() => coordinatedSalvoPlan(combatState(), ["a", "c"], 1), /same facing/i);
});
