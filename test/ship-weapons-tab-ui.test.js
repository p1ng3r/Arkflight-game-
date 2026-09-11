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

test("shared ship owners can Reload while Battlewatch retains firing and Work the Guns", () => {
  assert.match(ui, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.match(ui, /stationActionControl\?\.\("common-reload-weapon"/);
  assert.match(ui, /stationActionControl\?\.\("battlewatch-reload-weapon"/);
  assert.match(ui, /Reload · 1 AP/);
  assert.match(ui, /Work the Guns · 1 Morale · \+1 Strain/);
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
  assert.match(legacy, /stationAction\("common-reload-weapon"/);
  assert.match(legacy, /stationAction\("battlewatch-reload-weapon"/);
  assert.match(legacy, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.doesNotMatch(legacy, /GM Fire Control/);
  assert.doesNotMatch(legacy, /combat resolution is currently GM-authoritative/);
  assert.doesNotMatch(legacy, /api\.fireAtTarget\(weaponState\.key, target\.id, combatant\)/);
});


test("native station combat effects let owners fire locally and relay only protected target mutation", () => {
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(effects, /userCanResolveShipState\(game\.user, attacker\)/);
  assert.match(effects, /TARGET_MUTATION_REQUEST = "attack-target-mutation-request"/);
  assert.match(effects, /canMutateTargetLocally/);
  assert.match(effects, /game\.socket\?\.emit\?\.\(COMBAT_SOCKET/);
  assert.doesNotMatch(effects, /Only the GM may resolve Arkflight ship combat attacks/);
});


test("enhanced fire keeps Battlewatch ownership while player authors the roll", () => {
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(effects, /actor\.uuid === reference \|\| actor\.name === reference/);
  assert.match(effects, /Only the assigned Battlewatch owner may fire this ship's weapons/);
  assert.match(effects, /user: requester\?\.id \?\? requesterUserId/);
  assert.match(effects, /speaker: ChatMessage\.getSpeaker\(\{ actor: battlewatch \}\)/);
});


test("Reload and Work the Guns resolve locally for shared ship owners", () => {
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  const consoleUi = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
  assert.match(stationApi, /userOwnsShip/);
  assert.match(stationApi, /userCanResolveShipState/);
  assert.match(stationApi, /if \(userCanResolveShipState\(game\.user, control\.combatant\)\)/);
  assert.match(stationApi, /resolver === "reloadWeapon"[\s\S]*?reloadWeapon\(before, options\.weaponKey, round\)/);
  assert.match(stationApi, /resolver === "workTheGuns"[\s\S]*?maxReloadRemaining/);
  assert.match(stationApi, /STATION_ACTION_REQUEST/);
  assert.match(consoleUi, /stationAction\("common-reload-weapon"/);
  assert.match(consoleUi, /stationAction\("battlewatch-reload-weapon"/);
  assert.match(consoleUi, /buttonLabel = "Work the Guns"/);
});
