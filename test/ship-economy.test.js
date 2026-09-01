import test from "node:test";
import assert from "node:assert/strict";

import {
  SHIP_ECONOMY,
  calculateCargoUsage,
  dailySupplyConsumption,
  salvageCargoUsage,
  supplyCargoUsage,
  zeroSupplyDayConsequences
} from "../src/ship/ship-economy.js";

test("daily Supplies are one per ten crew with minimum one for a crewed ship", () => {
  assert.equal(dailySupplyConsumption(0), 0);
  assert.equal(dailySupplyConsumption(1), 1);
  assert.equal(dailySupplyConsumption(10), 1);
  assert.equal(dailySupplyConsumption(11), 2);
  assert.equal(dailySupplyConsumption(20), 2);
  assert.equal(dailySupplyConsumption(21), 3);
});

test("Supplies and Salvage Parts use the locked ten-to-one Cargo conversion", () => {
  assert.equal(SHIP_ECONOMY.suppliesPerCargo, 10);
  assert.equal(SHIP_ECONOMY.salvagePartsPerCargo, 10);
  assert.equal(supplyCargoUsage(10), 1);
  assert.equal(supplyCargoUsage(25), 2.5);
  assert.equal(salvageCargoUsage(10), 1);
  assert.equal(salvageCargoUsage(3), 0.3);
});

test("uninstalled Mods use slot cost and weapons use authored Cargo value", () => {
  const usage = calculateCargoUsage({
    supplies: 20,
    salvageParts: 10,
    ordinaryCargo: 3,
    shipModInventory: { rib: 2 },
    arkengineModInventory: { cooler: 1 },
    weaponInventory: { ballista: 2 },
    catalogs: {
      shipMods: { rib: { data: { refit: { slotCost: 1 } } } },
      arkengineMods: { cooler: { data: { refit: { slotCost: 2 } } } },
      weapons: { ballista: { data: { cargo: 2 } } }
    }
  });

  assert.deepEqual(usage.breakdown, {
    supplies: 2,
    salvageParts: 1,
    shipMods: 2,
    arkengineMods: 2,
    weapons: 4,
    ordinaryCargo: 3
  });
  assert.equal(usage.used, 14);
});

test("installed hardware is not counted by Cargo calculator", () => {
  const usage = calculateCargoUsage({
    supplies: 0,
    salvageParts: 0,
    ordinaryCargo: 0,
    shipModInventory: {},
    arkengineModInventory: {},
    weaponInventory: {}
  });
  assert.equal(usage.used, 0);
});

test("zero Supplies costs one Morale each day and one Strain every second day", () => {
  assert.deepEqual(zeroSupplyDayConsequences(1), { days: 1, moraleLoss: 1, strainGain: 0 });
  assert.deepEqual(zeroSupplyDayConsequences(2), { days: 2, moraleLoss: 2, strainGain: 1 });
  assert.deepEqual(zeroSupplyDayConsequences(5), { days: 5, moraleLoss: 5, strainGain: 2 });
});
