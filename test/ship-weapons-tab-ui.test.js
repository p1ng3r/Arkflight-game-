import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../src/ui/ship-weapons-tab-ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/ship-weapons-tab.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("native ship Weapons tab exposes targeting arcs attacks reloads and damage", () => {
  assert.match(ui, /export function renderArkflightWeaponsTab/);
  assert.match(ui, /data-weapons-host/);
  assert.match(ui, /toggleFiringArcs\(combatant\)/);
  assert.match(ui, /api\.targetingSolution\(weaponState\.key, targetId, combatant\)/);
  assert.match(ui, /api\.stationAction\("battlewatch-fire-weapon"/);
  assert.match(ui, /api\.stationAction\("battlewatch-reload-weapon"/);
  assert.match(ui, /Roll Attack &amp; Damage/);
  assert.match(ui, /Attack Roll/);
  assert.match(ui, /Damage Roll/);
  assert.match(ui, /Hardness/);
  assert.match(ui, /Hull Damage/);
});

test("weapon damage dice remain visible in Foundry chat", () => {
  assert.match(ui, /damage\.roll\.toMessage/);
  assert.match(ui, /ChatMessage\.getSpeaker/);
  assert.match(ui, /Damage —/);
});

test("Weapons tab is native and no longer injects or hides vessel-sheet sections", () => {
  assert.match(css, /data-tab="weapons"/);
  assert.match(css, /arkflight-weapons-host/);
  assert.doesNotMatch(ui, /data-arkflight-weapons-tab/);
  assert.doesNotMatch(ui, /attachWeaponsTab/);
  assert.doesNotMatch(ui, /hideBaseSections/);
  assert.doesNotMatch(ui, /restoreWeaponsState/);
  assert.doesNotMatch(ui, /Hooks\.on\("renderActorSheet"/);
});

test("all crew can inspect Weapons but only assigned Battlewatch controls fire and reload", () => {
  assert.match(ui, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.match(ui, /stationActionControl\?\.\("battlewatch-reload-weapon"/);
  assert.match(ui, /View only — assigned Battlewatch crew controls weapons/);
  assert.match(ui, /Battlewatch Only/);
});

test("module loads the native ship Weapons UI and stylesheet", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/ship-weapons-tab-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/ship-weapons-tab.css"));
});
