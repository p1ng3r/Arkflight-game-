import test from "node:test";
import assert from "node:assert/strict";
import { coordinatedSalvoPlan, fireCoordinatedSalvo } from "../src/combat/salvo-rules.js";
import { applyWeaponSystemThreat, areaMobilityPenalties, systemDamageThreshold } from "../src/combat/system-damage.js";
import { createShip } from "../src/ship/ship-schema.js";

function combatState() {
  return Object.freeze({
    economy: Object.freeze({ ap:Object.freeze({ value:4, max:4 }), rp:Object.freeze({ value:1, max:1 }) }),
    weapons: Object.freeze({
      a:Object.freeze({ key:"a", name:"A", mount:"port", fireAP:1, reloadRounds:1, readyRound:1, lastFiredRound:null }),
      b:Object.freeze({ key:"b", name:"B", mount:"port", fireAP:1, reloadRounds:1, readyRound:1, lastFiredRound:null }),
      c:Object.freeze({ key:"c", name:"C", mount:"starboard", fireAP:1, reloadRounds:1, readyRound:1, lastFiredRound:null })
    }),
    log:Object.freeze([])
  });
}

test("coordinated salvo combines same-facing weapons into one AP/reload event", () => {
  const state = combatState();
  const plan = coordinatedSalvoPlan(state, ["a","b"], 1);
  assert.equal(plan.totalAP, 2);
  assert.equal(plan.mount, "port");
  const next = fireCoordinatedSalvo(state, ["a","b"], 1);
  assert.equal(next.economy.ap.value, 2);
  assert.equal(next.weapons.a.readyRound, 3);
  assert.equal(next.weapons.b.readyRound, 3);
  assert.equal(next.log.at(-1).kind, "coordinated-salvo");
});

test("coordinated salvo rejects mixed facings before spending AP", () => {
  assert.throws(() => coordinatedSalvoPlan(combatState(), ["a","c"], 1), /same facing/i);
});

test("specialized critical system hit immediately changes maneuvering", () => {
  const ship = createShip({
    hull:{ chassisId:"brigantine" },
    resources:{ hull:{ value:160, max:160 }, lifeveil:{ value:55, max:55 }, strain:{ value:0, max:10 } }
  });
  const outcome = applyWeaponSystemThreat(ship, { weapon:{ data:{ systemThreat:"rigging" } }, degree:2, hullDamage:5 });
  assert.equal(outcome.triggered, true);
  assert.equal(outcome.state, "stressed");
  assert.equal(areaMobilityPenalties(outcome.ship).maneuverPenalty, 1);
});

test("ordinary hull crit does not double-punish unless it is a heavy hit", () => {
  const ship = createShip({
    hull:{ chassisId:"brigantine" },
    resources:{ hull:{ value:160, max:160 }, lifeveil:{ value:55, max:55 }, strain:{ value:0, max:10 } }
  });
  const threshold = systemDamageThreshold(ship);
  const light = applyWeaponSystemThreat(ship, { weapon:{ data:{ systemThreat:"hull" } }, degree:2, hullDamage:threshold-1 });
  assert.equal(light.triggered, false);
  const heavy = applyWeaponSystemThreat(ship, { weapon:{ data:{ systemThreat:"hull" } }, degree:1, hullDamage:threshold });
  assert.equal(heavy.triggered, true);
  assert.equal(heavy.state, "stressed");
  assert.equal(heavy.ship.resources.hull.baseMax, 160);
  assert.equal(heavy.ship.resources.hull.max, 144);
});
