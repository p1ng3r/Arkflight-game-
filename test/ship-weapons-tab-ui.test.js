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


test("player weapon fire resolves Battlewatch assignments stored as id uuid or name", () => {
  const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");
  assert.match(combatApi, /actor\.uuid === reference \|\| actor\.name === reference/);
  assert.match(combatApi, /const next = fireWeapon\(combatantState\(attacker\), weaponKey, game\.combat\?\.round \?\? 1\)/);
  assert.match(combatApi, /if \(!solution\.arc\.legal\) throw new Error/);
  assert.match(combatApi, /if \(!solution\.range\.legal\) throw new Error/);
});


test("legacy weapon controls do not force GM-only fire resolution", () => {
  const legacy = readFileSync(new URL("../src/ui/weapon-combat-station-ui.js", import.meta.url), "utf8");
  assert.match(legacy, /stationAction\("battlewatch-fire-weapon"/);
  assert.match(legacy, /stationAction\("battlewatch-reload-weapon"/);
  assert.match(legacy, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.doesNotMatch(legacy, /GM Fire Control/);
  assert.doesNotMatch(legacy, /combat resolution is currently GM-authoritative/);
  assert.doesNotMatch(legacy, /api\.fireAtTarget\(weaponState\.key, target\.id, combatant\)/);
});


test("native station combat effects preserve the player fire socket relay", () => {
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(effects, /if \(!game\.user\?\.isGM\) return originalStationAction\(actionId, options, reference\)/);
  assert.match(effects, /return enhancedFireAtTarget\(base, options\.weaponKey, options\.targetId, reference\)/);
  assert.match(effects, /Only the GM may resolve Arkflight ship combat attacks/);
});


test("authoritative enhanced fire resolves Battlewatch assignment by id uuid or name", () => {
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(effects, /actor\.uuid === reference \|\| actor\.name === reference/);
  assert.match(effects, /if \(!game\.user\?\.isGM\) return originalStationAction\(actionId, options, reference\)/);
  assert.match(effects, /return enhancedFireAtTarget\(base, options\.weaponKey, options\.targetId, reference\)/);
});
