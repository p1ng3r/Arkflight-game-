import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
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

test("vessel sheet uses native Overview Hold Combat and Weapons tabs", () => {
  assert.deepEqual(SHIP_SHEET_TABS, ["overview", "hold", "combat", "weapons"]);
});

test("sheet exposes five named Ship Conditions without a universal station penalty ladder", () => {
  assert.deepEqual(AREA_STATION_PENALTIES, {
    stable: 0,
    stressed: 0,
    damaged: 0,
    critical: 0,
    disabled: 0
  });
  const ship = createShip({
    shipConditions: { hull: "battered", drive: "faltering", weapons: "malfunctioning" },
    resources: { lifeveil: { value: 70, max: 100 }, morale: { value: 45, max: 100 } }
  });
  const rows = buildAreaViews(ship);
  assert.deepEqual(rows.map((row) => row.key), ["hull", "drive", "weapons", "lifeveil", "morale"]);
  assert.deepEqual(rows.map((row) => row.stateLabel), ["Battered", "Faltering", "Malfunctioning", "Degraded", "Shaken"]);
  assert.deepEqual(rows.map((row) => row.effectLabel), ["Hardness", "Speed / Maneuverability", "Attack / Reload", "Integrity %", "Crew Resolve %"]);
  assert.equal(rows.every((row) => row.penalty === 0), true);
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
