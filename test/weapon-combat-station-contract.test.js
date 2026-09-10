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

test("weapon fire control routes through player-authorized station relay and authoritative damage", () => {
  assert.match(source, /Fire &amp; Apply Damage/);
  assert.match(source, /stationAction\("battlewatch-fire-weapon"/);
  assert.match(source, /stationActionControl\?\.\("battlewatch-fire-weapon"/);
  assert.doesNotMatch(source, /api\.fireAtTarget\(weaponState\.key, target\.id, combatant\)/);
  assert.match(combatApi, /async function fireAtTarget/);
  assert.match(combatApi, /applyHardnessToDamage/);
  assert.match(combatApi, /ship\.resources\.hull\.value/);
  assert.match(combatApi, /target\.actor\.update/);
});


test("player reload UI exposes authoritative availability and refreshes after GM relay", () => {
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  assert.match(source, /stationActionAvailability\?\.\("battlewatch-reload-weapon"/);
  assert.match(source, /Need 1 Supply/);
  assert.match(source, /Not this ship's turn/);
  assert.match(source, /arkflightStationActionRemoteResult/);
  assert.match(stationApi, /STATION_ACTION_RESULT = "station-action-result"/);
  assert.match(stationApi, /emitStationActionResult/);
  assert.match(stationApi, /Hooks\.callAll\("arkflightStationActionRemoteResult"/);
});


test("combat balance runtime never bypasses the Battlewatch reload station relay", () => {
  const balanceRuntime = readFileSync(new URL("../src/foundry/combat-balance-runtime.js", import.meta.url), "utf8");
  const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    balanceRuntime,
    /actionId === "battlewatch-reload-weapon"[\s\S]*?scaledWorkTheGuns\(options\.weaponKey/
  );
  assert.match(
    balanceRuntime,
    /stationAction\(actionId, options = \{\}, reference = null\)[\s\S]*?return originalStationAction\(actionId, options, reference\)/
  );
  assert.match(stationApi, /reduceWeaponReload/);
  assert.match(stationApi, /resolver === "workTheGuns"[\s\S]*?profile\.bonus - 1/);
  assert.match(stationApi, /updatePersistentShipForAction/);
});
