import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildStatPresentation, buildRefitInventory } from "../src/ui/ship-sheet-view-model.js";
import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";

const template = readFileSync(new URL("../templates/ship/ship-sheet.hbs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/ui/ship-sheet-app.js", import.meta.url), "utf8");

test("live ship sheet exposes only Overview Fittings and Refit primary tabs", () => {
  assert.match(template, /data-tab="overview"/);
  assert.match(template, /data-tab="fittings"/);
  assert.match(template, /data-tab="refit"/);
  assert.doesNotMatch(template, /data-tab="command"/);
  assert.doesNotMatch(template, /data-tab="shipwright"/);
  assert.doesNotMatch(template, /SHIPWRIGHT MODE/);
});

test("live ship sheet never presents Watchmaster to players", () => {
  assert.doesNotMatch(template, /Watchmaster/);
  assert.doesNotMatch(appSource, /Watchmaster/);
  assert.match(template, /Ship Areas/);
  assert.match(template, /Stations &amp; Crew/);
});

test("Fittings uses installed views and Compendium entry points instead of full catalog grids", () => {
  assert.match(template, /Installed Hardware/i);
  assert.match(template, /data-compendium-pack/);
  assert.match(template, /arkflight\.view\.fittings\.shipMods/);
  assert.match(template, /arkflight\.view\.fittings\.arkengineMods/);
  assert.doesNotMatch(template, /arkflight\.commissioning\.shipMods/);
  assert.doesNotMatch(template, /arkflight\.commissioning\.arkengineMods/);
});

test("structured operational stats are human-readable", () => {
  const rows = buildStatPresentation({
    crew: { minimum: 3, recommended: 6, maximum: 12 },
    weaponMounts: { fore: 1, port: 2 },
    resistances: { values: { fire: 10, piercing: 4 }, conditional: [] }
  }).operational;
  assert.equal(rows.find((row) => row.key === "crew")?.value, "3 / 6 / 12");
  assert.equal(rows.find((row) => row.key === "weaponMounts")?.value, "2 mount types");
  assert.equal(rows.find((row) => row.key === "resistances")?.value, "Fire 10 · Piercing 4");
});

test("Refit blueprints resolve to named catalog entries", () => {
  const ship = createShip({ blueprints: { shipModIds: ["reinforced-bulkheads"], arkengineModIds: ["pressure-lattice-tuning"] } });
  const refit = buildRefitInventory(ship, SHIP_CATALOGS);
  assert.equal(refit.blueprints.shipMods[0].name, SHIP_CATALOGS.shipMods["reinforced-bulkheads"].name);
  assert.equal(refit.blueprints.arkengineMods[0].name, SHIP_CATALOGS.arkengineMods["pressure-lattice-tuning"].name);
});
