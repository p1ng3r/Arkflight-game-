import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { installedSocketLayout } from "../src/ship/refit-sockets.js";
import { createRefitDraft, stageRefitComponent } from "../src/ship/refit-draft.js";
import { grantComponent } from "../src/ship/refit-state.js";

const MOD_ID = "reinforced-structural-ribbing";

function fourSlotShip(shipMods = []) {
  const hull = Object.values(SHIP_CATALOGS.hulls).find((entry) => Number(entry?.data?.baseStats?.shipModCapacity) === 4);
  assert.ok(hull, "test catalog needs a 4-slot hull");
  return createShip({ hull: { chassisId: hull.id, patternId: "" }, shipMods });
}

test("installed Ship Mods physically occupy all four available sockets", () => {
  const ship = fourSlotShip([MOD_ID, MOD_ID, MOD_ID, MOD_ID]);
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, "shipMod");
  assert.equal(layout.capacity, 4);
  assert.equal(layout.usedSlots, 4);
  assert.deepEqual(layout.occupied, [0, 1, 2, 3]);
  assert.equal(layout.overBy, 0);
  assert.equal(layout.overCapacityPlacements.length, 0);
});

test("legacy over-capacity state is visible as unslotted instead of inventing a fifth socket", () => {
  const ship = fourSlotShip([MOD_ID, MOD_ID, MOD_ID, MOD_ID, MOD_ID]);
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, "shipMod");
  assert.equal(layout.capacity, 4);
  assert.equal(layout.usedSlots, 5);
  assert.deepEqual(layout.occupied, [0, 1, 2, 3]);
  assert.equal(layout.overBy, 1);
  assert.equal(layout.overCapacityPlacements.length, 1);
  assert.equal(layout.overCapacityPlacements[0].componentId, MOD_ID);
  assert.deepEqual(layout.overCapacityPlacements[0].socketIndices, []);
});

test("staging rejects sockets already occupied by installed fittings", () => {
  let ship = fourSlotShip([MOD_ID]);
  ship = grantComponent(ship, "shipMod", MOD_ID, 1);
  const result = stageRefitComponent(ship, createRefitDraft(), SHIP_CATALOGS, {
    family: "shipMod",
    componentId: MOD_ID,
    socketIndices: [0]
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "socket-occupied");
});

test("staging rejects another Mod when all physical sockets are full", () => {
  let ship = fourSlotShip([MOD_ID, MOD_ID, MOD_ID, MOD_ID]);
  ship = grantComponent(ship, "shipMod", MOD_ID, 1);
  const result = stageRefitComponent(ship, createRefitDraft(), SHIP_CATALOGS, {
    family: "shipMod",
    componentId: MOD_ID,
    socketIndices: [3]
  });
  assert.equal(result.ok, false);
  assert.ok(["socket-occupied", "capacity-exceeded"].includes(result.reason));
});
