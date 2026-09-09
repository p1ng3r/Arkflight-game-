import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../src/ui/ship-weapons-tab-ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/ship-weapons-tab.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("ship sheet weapon tab exposes targeting, arcs, attack and damage controls", () => {
  assert.match(ui, /data\.arkflightWeaponsTab/);
  assert.match(ui, /toggleFiringArcs\(combatant\)/);
  assert.match(ui, /api\.targetingSolution\(weaponState\.key, targetId, combatant\)/);
  assert.match(ui, /api\.fireAtTarget\(weaponState\.key, target\.id, combatant\)/);
  assert.match(ui, /Roll Attack &amp; Damage/);
  assert.match(ui, /Attack Roll/);
  assert.match(ui, /Damage Roll/);
  assert.match(ui, /Hardness/);
  assert.match(ui, /Hull Damage/);
});

test("weapon damage dice are posted visibly to Foundry chat", () => {
  assert.match(ui, /damage\.roll\.toMessage/);
  assert.match(ui, /ChatMessage\.getSpeaker/);
  assert.match(ui, /Damage —/);
});

test("ship sheet navigation expands to four primary buttons", () => {
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /data-arkflight-weapons-tab/);
});

test("module loads the ship weapons tab UI and stylesheet", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/ship-weapons-tab-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/ship-weapons-tab.css"));
});
