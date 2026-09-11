import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/weapon-combat-station-ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/weapon-combat-station.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");

test("weapon combat station is loaded as a Foundry UI module and stylesheet", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/weapon-combat-station-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/weapon-combat-station.css"));
  assert.match(css, /arkflight-weapon-station/);
});

test("weapon station exposes canvas firing arcs driven by canonical arc checks", () => {
  assert.match(source, /weaponArcCheck/);
  assert.match(source, /PIXI\?\.Graphics/);
  assert.match(source, /Show Firing Arcs/);
  assert.match(source, /Hide Firing Arcs/);
  assert.match(source, /updateToken/);
});

test("weapon station supports target lock and Foundry canvas targeting", () => {
  assert.match(source, /Target Lock/);
  assert.match(source, /Use Canvas Target/);
  assert.match(source, /setTarget\(true/);
  assert.match(source, /targetingSolution/);
});

test("weapon fire stays station-authorized while only protected target mutation is relayed", () => {
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(source, /Fire &amp; Apply Damage/);
  assert.match(source, /stationAction\("battlewatch-fire-weapon"/);
  assert.match(source, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.doesNotMatch(source, /api\.fireAtTarget\(weaponState\.key, target\.id, combatant\)/);
  assert.match(effects, /TARGET_MUTATION_REQUEST/);
  assert.match(effects, /applyProtectedTargetMutation/);
  assert.match(effects, /await attacker\.update/);
  assert.match(effects, /target\.actor\.update/);
});


test("player reload UI separates common Reload from Battlewatch Work the Guns", () => {
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  assert.match(source, /stationActionAvailability\?\.\("common-reload-weapon"/);
  assert.match(source, /Reload · 1 AP/);
  assert.match(source, /Work the Guns · 1 Morale · \+1 Strain/);
  assert.match(source, /remaining <= 2/);
  assert.match(source, /arkflightStationActionRemoteResult/);
  assert.match(stationApi, /resolver === "reloadWeapon"/);
  assert.match(stationApi, /resolver === "workTheGuns"/);
  assert.match(stationApi, /maxReloadRemaining/);
  assert.match(stationApi, /reduceWeaponReload\(rawAfter, selection, round, workTheGunsRemaining\)/);
  assert.match(stationApi, /STATION_ACTION_RESULT = "station-action-result"/);
});


test("legacy gunnery runtime cannot bypass the shared-owner reload action layer", () => {
  const balanceRuntime = readFileSync(new URL("../src/foundry/combat-balance-runtime.js", import.meta.url), "utf8");
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  assert.ok(!moduleJson.esmodules.includes("src/foundry/combat-balance-runtime.js"));
  assert.doesNotMatch(balanceRuntime, /scaledWorkTheGuns/);
  assert.doesNotMatch(balanceRuntime, /Only the GM may resolve Arkflight gunnery work/);
  assert.doesNotMatch(balanceRuntime, /stationAction\(/);
  assert.match(stationApi, /reduceWeaponReload/);
  assert.match(stationApi, /resolver === "workTheGuns"[\s\S]*?maxReloadRemaining/);
  assert.match(stationApi, /updatePersistentShipForAction/);
});


test("player-owned station actions preserve the initiating user in chat", () => {
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
  assert.match(stationApi, /user: userId/);
  assert.match(stationApi, /requesterUserId: game\.user\?\.id/);
  assert.match(effects, /user: requester\?\.id \?\? requesterUserId/);
});
