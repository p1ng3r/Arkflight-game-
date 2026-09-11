import test from "node:test";
import assert from "node:assert/strict";
import { coordinatedSalvoPlan, fireCoordinatedSalvo } from "../src/combat/salvo-rules.js";
import { applyWeaponSystemThreat, areaMobilityPenalties, systemDamageThreshold } from "../src/combat/system-damage.js";
import { createShip } from "../src/ship/ship-schema.js";
import { applyShipSystemDegradation, effectiveHullHardness, shipConditionProfile } from "../src/ship/ship-conditions.js";

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

test("weapon system threat metadata no longer directly worsens a Ship Condition", () => {
  const ship = createShip({
    hull:{ chassisId:"brigantine" },
    resources:{ hull:{ value:160, max:160 }, lifeveil:{ value:100, max:100 }, strain:{ value:0, max:10 } }
  });
  const outcome = applyWeaponSystemThreat(ship, { weapon:{ data:{ systemThreat:"rigging" } }, degree:2, hullDamage:50 });
  assert.equal(outcome.triggered, false);
  assert.equal(shipConditionProfile(outcome.ship, "drive").id, "responsive");
  assert.deepEqual(areaMobilityPenalties(outcome.ship), { speedPenalty: 0, maneuverPenalty: 0 });
  assert.equal(systemDamageThreshold(ship), Number.POSITIVE_INFINITY);
});

test("Drive and Hull consequences come only from their canonical Ship Conditions", () => {
  let ship = createShip({
    hull:{ chassisId:"brigantine" },
    resources:{ hull:{ value:160, max:160 }, lifeveil:{ value:100, max:100 }, strain:{ value:0, max:10 } }
  });
  ship = applyShipSystemDegradation(ship, "drive").ship;
  assert.equal(shipConditionProfile(ship, "drive").id, "sluggish");
  assert.deepEqual(areaMobilityPenalties(ship), { speedPenalty: 1, maneuverPenalty: 0 });

  ship = applyShipSystemDegradation(ship, "hull").ship;
  assert.equal(shipConditionProfile(ship, "hull").id, "battered");
  assert.equal(effectiveHullHardness(4, ship), 3);
  assert.deepEqual(ship.resources.hull, { value:160, max:160 });
});
