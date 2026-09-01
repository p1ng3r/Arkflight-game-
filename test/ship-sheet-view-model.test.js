import test from "node:test";
import assert from "node:assert/strict";
import { createShip, AREA_STATES } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import {
  AREA_STATION_PENALTIES,
  SHIP_SHEET_TABS,
  buildAreaViews,
  buildInstalledFittings,
  buildRefitInventory,
  buildShipSheetView
} from "../src/ui/ship-sheet-view-model.js";

test("Part 12 sheet uses Overview Fittings and Refit tabs", () => {
  assert.deepEqual(SHIP_SHEET_TABS, ["overview", "fittings", "refit"]);
});

test("five persistent Areas own the visible station penalty ladder", () => {
  assert.deepEqual(AREA_STATION_PENALTIES, {
    stable: 0,
    stressed: -1,
    damaged: -3,
    critical: -5,
    disabled: -10
  });
  const ship = createShip({ areas: {
    hull: { state: AREA_STATES.STABLE },
    arkengine: { state: AREA_STATES.STRESSED },
    rigging: { state: AREA_STATES.DAMAGED },
    lifeveil: { state: AREA_STATES.CRITICAL },
    morale: { state: AREA_STATES.DISABLED }
  }});
  const rows = buildAreaViews(ship);
  assert.deepEqual(rows.map((row) => row.station), ["battlewatch", "engineer", "navigator", "veilwarden", "captain"]);
  assert.deepEqual(rows.map((row) => row.penalty), [0, -1, -3, -5, -10]);
  assert.equal(rows.some((row) => row.stationLabel === "Watchmaster"), false);
});

test("Fittings view shows only installed hardware and selected talents", () => {
  const ship = createShip({
    hull: { chassisId: "cutter", patternId: "standard" },
    arkengine: { chassisId: "lanterncoil-arkengine", patternId: "standard", modIds: ["pressure-lattice-tuning"] },
    shipMods: ["reinforced-bulkheads"],
    rooms: ["workshop"],
    progression: { level: 1, xp: 0, talentIds: ["toughness"] }
  });
  const fittings = buildInstalledFittings(ship, SHIP_CATALOGS);
  assert.equal(fittings.hull.id, "cutter");
  assert.equal(fittings.arkengine.id, "lanterncoil-arkengine");
  assert.deepEqual(fittings.arkengineMods.map((item) => item.id), ["pressure-lattice-tuning"]);
  assert.deepEqual(fittings.shipMods.map((item) => item.id), ["reinforced-bulkheads"]);
  assert.deepEqual(fittings.rooms.map((item) => item.id), ["workshop"]);
  assert.deepEqual(fittings.talents.map((item) => item.id), ["toughness"]);
  assert.equal(fittings.shipMods.length < Object.keys(SHIP_CATALOGS.shipMods).length, true);
});

test("Refit view lists physical inventory and work orders instead of full catalogs", () => {
  const ship = createShip({
    inventory: { shipMods: { "reinforced-bulkheads": 2 }, arkengineMods: { "pressure-lattice-tuning": 1 } },
    blueprints: { shipModIds: ["reinforced-bulkheads"], arkengineModIds: ["pressure-lattice-tuning"] },
    refit: { workOrders: [{ id: "wo-1", kind: "install", status: "planned" }] }
  });
  const refit = buildRefitInventory(ship, SHIP_CATALOGS);
  assert.equal(refit.shipMods.length, 1);
  assert.equal(refit.shipMods[0].quantity, 2);
  assert.equal(refit.arkengineMods.length, 1);
  assert.equal(refit.workOrders.length, 1);
});

test("sheet view consumes canonical derived stat presentation groups", () => {
  const ship = createShip({
    hull: { chassisId: "cutter", patternId: "standard" },
    arkengine: { chassisId: "lanterncoil-arkengine", patternId: "standard", modIds: [] }
  });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const view = buildShipSheetView({ ship, derived, catalogs: SHIP_CATALOGS });
  assert.equal(view.stats.primary.some((row) => row.key === "hullIntegrity"), true);
  assert.equal(view.stats.primary.some((row) => row.key === "combatSpeed"), true);
  assert.equal(view.stats.operational.some((row) => row.key === "hardness"), true);
  assert.equal(view.stats.technical.some((row) => row.key === "repairTimePercent"), true);
  assert.equal(view.compendiums.shipMods, "arkflight-game.ship-mods");
});
