import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildInstalledFittings, buildStatPresentation, buildRefitInventory } from "../src/ui/ship-sheet-view-model.js";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { SHIP_CATALOGS } from "../src/content/index.js";

const template = readFileSync(new URL("../templates/ship/ship-sheet.hbs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/ui/ship-sheet-app.js", import.meta.url), "utf8");

test("live ship sheet exposes only Overview Fittings and Refit primary tabs", () => {
  assert.match(template, /data-tab="overview"/); assert.match(template, /data-tab="fittings"/); assert.match(template, /data-tab="refit"/);
  assert.doesNotMatch(template, /data-tab="command"/); assert.doesNotMatch(template, /data-tab="shipwright"/); assert.doesNotMatch(template, /SHIPWRIGHT MODE/);
});

test("live ship sheet never presents Watchmaster to players", () => {
  assert.doesNotMatch(template, /Watchmaster/); assert.doesNotMatch(appSource, /Watchmaster/); assert.match(template, /Ship Areas/); assert.match(template, /Stations &amp; Crew/);
});

test("Fittings uses installed views and Compendium entry points instead of full catalog grids", () => {
  assert.match(template, /Installed Hardware/i); assert.match(template, /data-compendium-pack/); assert.match(template, /arkflight\.view\.fittings\.shipMods/); assert.match(template, /arkflight\.view\.fittings\.arkengineMods/);
  assert.doesNotMatch(template, /arkflight\.commissioning\.shipMods/); assert.doesNotMatch(template, /arkflight\.commissioning\.arkengineMods/);
});

test("structured operational stats are human-readable", () => {
  const rows = buildStatPresentation({ crew: { minimum: 3, recommended: 6, maximum: 12 }, weaponMounts: { fore: 1, port: 2 }, resistances: { values: { fire: 10, piercing: 4 }, conditional: [] } }).operational;
  assert.equal(rows.find((row) => row.key === "crew")?.value, "3 / 6 / 12"); assert.equal(rows.find((row) => row.key === "weaponMounts")?.value, "2 mount types"); assert.equal(rows.find((row) => row.key === "resistances")?.value, "Fire 10 · Piercing 4");
});

test("Hull cargo establishes a real Supply capacity", () => {
  const ship = createShip({ hull: { chassisId: "brigantine", patternId: "standard" }, arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] } });
  const derived = deriveShip(ship, SHIP_CATALOGS);
  assert.equal(derived.stats.cargoCapacity, 40);
  assert.equal(derived.stats.supplyCapacity, 400);
});

test("duplicate installed fittings are grouped for readable presentation", () => {
  const shipModId = Object.keys(SHIP_CATALOGS.shipMods)[0];
  const ship = createShip({ shipMods: [shipModId, shipModId, shipModId] });
  const fittings = buildInstalledFittings(ship, SHIP_CATALOGS);
  assert.equal(fittings.shipMods.length, 1);
  assert.equal(fittings.shipMods[0].quantity, 3);
});

test("Refit blueprints resolve to named catalog entries", () => {
  const shipModId = Object.keys(SHIP_CATALOGS.shipMods)[0]; const arkengineModId = Object.keys(SHIP_CATALOGS.arkengineMods)[0];
  assert.ok(shipModId); assert.ok(arkengineModId);
  const ship = createShip({ blueprints: { shipModIds: [shipModId], arkengineModIds: [arkengineModId] } });
  const refit = buildRefitInventory(ship, SHIP_CATALOGS);
  assert.equal(refit.blueprints.shipMods[0].name, SHIP_CATALOGS.shipMods[shipModId].name); assert.equal(refit.blueprints.arkengineMods[0].name, SHIP_CATALOGS.arkengineMods[arkengineModId].name);
});

test("Refit summary counts only active work orders while retaining completed history", () => {
  const ship = createShip({ refit: { workOrders: [
    { id: "planned", type: "build", method: "crew", componentFamily: "shipMod", componentId: "x", status: "planned" },
    { id: "working", type: "remove", method: "crew", componentFamily: "shipMod", componentId: "x", status: "working" },
    { id: "complete", type: "build", method: "crew", componentFamily: "shipMod", componentId: "x", status: "complete" }
  ] } });
  const refit = buildRefitInventory(ship, SHIP_CATALOGS);
  assert.equal(refit.workOrders.length, 2);
  assert.equal(refit.history.length, 1);
});

test("new Refit tab exposes build install remove and start controls", () => {
  assert.match(template, /data-refit-build/); assert.match(template, /data-refit-install/); assert.match(template, /data-refit-remove/); assert.match(template, /data-refit-start/);
  assert.match(appSource, /arkflightRefitInstallRequested/);
});
