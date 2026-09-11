import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
const commandHud = readFileSync(new URL("../src/ui/arkflight-command-hud-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/combat-console.hbs", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/arkflight-command-hud.css", import.meta.url), "utf8");
const actionCss = readFileSync(new URL("../styles/arkflight-command-hud-actions.css", import.meta.url), "utf8");
const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");
const stationApi = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

const LEGACY_MODULES = [
  "src/ui/combat-console-compact-ui.js",
  "src/ui/combat-strip-layout-fix.js",
  "src/ui/combat-strip-final-ui.js",
  "src/ui/combat-flow-hud-ui.js",
  "src/ui/combat-flow-guidance-ui.js"
];

const LEGACY_STYLES = [
  "styles/combat-console.css",
  "styles/combat-console-compact.css",
  "styles/combat-strip-layout-fix.css",
  "styles/combat-strip-final.css",
  "styles/combat-flow-hud.css"
];

test("Arkflight Command HUD is the single registered canvas combat presentation", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/combat-console-ui.js"));
  assert.ok(moduleJson.esmodules.includes("src/ui/arkflight-command-hud-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/arkflight-command-hud.css"));
  assert.ok(moduleJson.styles.includes("styles/arkflight-command-hud-actions.css"));
  for (const path of LEGACY_MODULES) assert.equal(moduleJson.esmodules.includes(path), false, `${path} must stay retired`);
  for (const path of LEGACY_STYLES) assert.equal(moduleJson.styles.includes(path), false, `${path} must stay retired`);

  assert.match(source, /class ArkflightCombatConsole/);
  assert.match(source, /renderTokenHUD/);
  assert.match(source, /openArkflightCombatConsole/);
  assert.match(commandHud, /data-command-station/);
  assert.match(commandHud, /data-afch-vital/);
  assert.match(template, /afcs-commandbar/);
  assert.match(css, /afcs-commandbar/);
});

test("Command HUD exposes all five permanent combat stations with upward station drawer", () => {
  for (const station of ["captain", "battlewatch", "navigator", "engineer", "veilwarden"]) {
    assert.match(source, new RegExp(`id: "${station}"`));
  }
  assert.match(template, /data-command-station="\{\{id\}\}"/);
  assert.match(template, /data-station-action/);
  assert.match(template, /afcs-drawer-stations/);
  assert.match(css, /bottom:\s*134px/);
});

test("Command HUD permanently exposes core combat state and all five ship vitals", () => {
  for (const label of ["Round", "Action Points", "Reaction Points", "Strain", "Heading", "Facing", "Target"]) {
    assert.match(template, new RegExp(label));
  }
  for (const vital of ["hull", "lifeveil", "morale", "strain", "supplies"]) {
    assert.match(template, new RegExp(`data-afch-vital="${vital}"`));
  }
  assert.match(commandHud, /deriveShip/);
  assert.match(commandHud, /cargoCapacity/);
  assert.match(commandHud, /state\?\.strain/);
});

test("Command HUD station cards resolve exact level-based effects and expose readable rule metadata", () => {
  assert.match(commandHud, /stationEffectProfile/);
  assert.match(commandHud, /resolvedStationEffect/);
  assert.match(commandHud, /actionRuleChips/);
  assert.match(commandHud, /decorateActionCards/);
  assert.match(commandHud, /3 \* bonus/);
  assert.match(commandHud, /15 \* bonus/);
  assert.match(commandHud, /5 \* bonus/);
  assert.match(commandHud, /profile\.advanced \? 2 : 1/);
  assert.match(commandHud, /Full Rules/);
  assert.match(actionCss, /afcs-action-effect/);
  assert.match(actionCss, /afcs-rule-chips/);
  assert.match(actionCss, /afcs-action-full-rules/);
  assert.match(actionCss, /font-size:\s*12px !important/);
  assert.match(actionCss, /font-size:\s*9px/);
  assert.match(css, /font-size:\s*10\.5px/);
});

test("Command HUD keeps targeting, weapon fire, reload work, arcs, log, and token launch controls", () => {
  assert.match(source, /targetingSolution/);
  assert.match(source, /fireAtTarget/);
  assert.match(source, /workTheGuns/);
  assert.match(source, /toggleAllConsoleArcs/);
  assert.match(source, /firingArcsVisible/);
  assert.match(source, /redrawFiringArcs/);
  assert.match(source, /setFiringArcsVisible/);
  assert.match(source, /firingArcWeaponVisible/);
  assert.match(source, /toggleWeaponFiringArc/);
  for (const facing of ["fore", "port", "starboard", "aft"]) assert.match(source, new RegExp(`id: "${facing}"`));
  assert.match(template, /data-target-select/);
  assert.match(template, /data-fire-weapon/);
  assert.match(template, /data-toggle-all-arcs/);
  assert.match(template, /data-toggle-weapon-arc="\{\{key\}\}"/);
  assert.match(template, /\{\{arcButtonLabel\}\}/);
  assert.match(source, /arcButtonLabel: arcVisible \? "Hide Weapon Arcs" : "Show Weapon Arcs"/);
  assert.match(template, /\{\{arcButtonLabel\}\}/);
  assert.match(template, /Weapon Arcs/);
  assert.match(template, /afcs-drawer-log/);
  assert.match(template, /data-work-weapon="\{\{key\}\}"[^>]*>[^<]*(?:<i[^>]*><\/i>\s*)?Reload/);
  assert.match(template, /data-work-guns="\{\{key\}\}"/);
  assert.match(source, /stationAction\("common-reload-weapon"/);
  assert.match(source, /Work the Guns/);
  assert.match(source, /Open Arkflight Combat Strip/);
});

test("Command HUD can undo turn movement and facing and refund only Helm-purchase AP", () => {
  assert.match(combatApi, /TURN_START_SNAPSHOTS/);
  assert.match(combatApi, /movementUndoStatus/);
  assert.match(combatApi, /undoMove/);
  assert.match(combatApi, /undoFacing/);
  assert.match(combatApi, /resetTurnPosition/);
  assert.match(combatApi, /movementUsed/);
  assert.match(combatApi, /maneuverUsed/);
  assert.match(combatApi, /movementPurchases/);
  assert.match(combatApi, /maneuverPurchases/);
  assert.match(combatApi, /const apRefund = moveRefund \+ facingRefund/);
  assert.match(combatApi, /value: Math\.min\(apMax, apValue \+ apRefund\)/);
  assert.match(template, /data-undo-move/);
  assert.match(template, /data-undo-facing/);
  assert.match(template, /data-reset-turn-position/);
  assert.match(css, /afch-undo-controls/);
});

test("Command HUD End Turn routes through facing reconciliation before advancing initiative", () => {
  assert.match(template, /data-end-turn/);
  assert.match(template, /resources\.facingUsed/);
  assert.match(template, /resources\.facingFree/);
  assert.match(template, /resources\.facingCostLabel/);
  assert.match(source, /api\?\.facingStatus\?\.\(combatant\)/);
  assert.match(commandHud, /await api\.endTurn\(combatant\)/);
  assert.doesNotMatch(commandHud, /advanceCombatTurn/);
  assert.doesNotMatch(commandHud, /combat\.nextTurn\(\)/);
  assert.match(commandHud, /stopImmediatePropagation/);
  assert.match(commandHud, /arkflightCombatTurnChanged/);
  assert.match(commandHud, /followActiveShip/);
  assert.match(combatApi, /confirmFacingSettlement/);
  assert.match(combatApi, /applyFacingSettlement/);
  assert.match(combatApi, /facingStatus\(reference = null\)/);
  assert.match(combatApi, /preUpdateCombat/);
});


test("active ship owners can end their turn through the GM-validated combat relay", () => {
  assert.match(combatApi, /const COMBAT_SOCKET = \`module\.\$\{MODULE_ID\}\`/);
  assert.match(combatApi, /END_TURN_REQUEST/);
  assert.match(combatApi, /function canUserEndTurn/);
  assert.match(combatApi, /testUserPermission\?\.\(user, "OWNER"\)/);
  assert.match(combatApi, /game\.socket\?\.emit\?\.\(COMBAT_SOCKET/);
  assert.match(combatApi, /game\.socket\?\.on\?\.\(COMBAT_SOCKET, handleCombatSocket\)/);
  assert.match(combatApi, /async endTurn\(reference = null\)/);
  assert.match(source, /canEndTurn: Boolean\(combatant && api\?\.canEndTurn\?\.\(combatant\)\)/);
  assert.match(source, /await api\.endTurn\(combatant\)/);
  assert.match(commandHud, /api\?\.canEndTurn\?\.\(combatant\)/);
  assert.match(commandHud, /await api\.endTurn\(combatant\)/);
  assert.match(template, /\{\{#unless canEndTurn\}\}disabled\{\{\/unless\}\}/);
  assert.doesNotMatch(template, /\{\{#unless gm\}\}disabled\{\{\/unless\}\}/);
});


test("ship owners can use common actions while station actions still require assigned crew", () => {
  assert.match(source, /stationActionControl\?\.\(action\.id, combatant\)/);
  assert.match(source, /control\.ok && availability\.ok/);
  assert.match(source, /"not-your-station": "Assigned Crew Only"/);
  assert.match(source, /"not-ship-owner": "Ship Owner Only"/);
  assert.doesNotMatch(source, /reason = "GM Resolve"/);
  assert.match(stationApi, /function stationControl/);
  assert.match(stationApi, /testUserPermission\?\.\(user, "OWNER"\)/);
  assert.match(stationApi, /function userOwnsShip/);
  assert.match(stationApi, /reason: "not-ship-owner"/);
  assert.match(stationApi, /reason: "not-your-station"/);
  assert.match(stationApi, /userCanResolveShipState/);
  assert.match(stationApi, /STATION_ACTION_REQUEST/);
  assert.match(stationApi, /requestStationAction/);
  assert.match(stationApi, /handleStationActionSocket/);
  assert.match(stationApi, /canUseStationAction/);
  assert.match(source, /api\.stationAction\("battlewatch-fire-weapon"/);
  assert.match(source, /api\.stationAction\("common-reload-weapon"/);
  assert.match(source, /api\.stationAction\("battlewatch-reload-weapon"/);
  assert.match(template, /data-station="{{id}}"/);
  assert.doesNotMatch(template, /data-station="{{id}}"[^>]*disabled/);
});


test("combat console uses only the authoritative weapon arc renderer", () => {
  assert.doesNotMatch(source, /weaponArcCheck/);
  assert.doesNotMatch(source, /CONSOLE_ARCS_VISIBLE/);
  assert.doesNotMatch(source, /CONSOLE_ARC_FACINGS/);
  assert.doesNotMatch(source, /CONSOLE_ARC_GRAPHICS/);
  assert.doesNotMatch(source, /function arcLayer/);
  assert.doesNotMatch(source, /function tokenCenter/);
  assert.doesNotMatch(source, /function drawSector/);
  assert.doesNotMatch(source, /function selectedFacings/);
  assert.doesNotMatch(source, /function removeConsoleArcGraphics/);
  assert.match(source, /redrawFiringArcs/);
  assert.match(source, /setFiringArcsVisible/);
});


test("shared ship owners resolve own combat-state helpers without a GM guard", () => {
  assert.match(combatApi, /function canUserOperateCombatant/);
  assert.match(combatApi, /async function requireOwnedCombatant/);
  for (const method of ["buyMovement", "buyManeuver", "spendAP", "spendRP", "turn", "fireWeapon", "reloadWeapon"]) {
    assert.match(combatApi, new RegExp(`async ${method}\\([^]*?requireOwnedCombatant`));
  }
});


test("combat HUD exposes Maneuver defense and Moored Boarding state", () => {
  assert.match(source, /shipManeuverDC/);
  assert.match(source, /combatEngagement/);
  assert.match(template, /engagement\.moored/);
  assert.match(template, /engagement\.boarding/);
  assert.match(template, /engagement\.partnerName/);
  assert.match(source, /Moored — Break Grapple/);
});


test("combat UIs resolve capability-gated station actions against the acting combatant", () => {
  assert.match(source, /stationActions\?\.\(station, combatant\)/);
  assert.match(source, /stationActions\?\.\(this\.selectedStation, combatant\)/);
});
