import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
const commandHud = readFileSync(new URL("../src/ui/arkflight-command-hud-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/combat-console.hbs", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/arkflight-command-hud.css", import.meta.url), "utf8");
const actionCss = readFileSync(new URL("../styles/arkflight-command-hud-actions.css", import.meta.url), "utf8");
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
  for (const label of ["Round", "Action Points", "Reaction Points", "Strain", "Heading", "Target"]) {
    assert.match(template, new RegExp(label));
  }
  for (const vital of ["hull", "lifeveil", "morale", "strain", "supplies"]) {
    assert.match(template, new RegExp(`data-afch-vital="${vital}"`));
  }
  assert.match(commandHud, /deriveShip/);
  assert.match(commandHud, /supplyCapacity/);
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
});

test("Command HUD keeps targeting, weapon fire, reload work, arcs, log, and token launch controls", () => {
  assert.match(source, /targetingSolution/);
  assert.match(source, /fireAtTarget/);
  assert.match(source, /workTheGuns/);
  assert.match(source, /toggleAllConsoleArcs/);
  assert.match(source, /firingArcsVisible/);
  assert.match(source, /redrawFiringArcs/);
  assert.match(source, /setFiringArcsVisible/);
  for (const facing of ["fore", "port", "starboard", "aft"]) assert.match(source, new RegExp(`id: "${facing}"`));
  assert.match(template, /data-target-select/);
  assert.match(template, /data-fire-weapon/);
  assert.match(template, /data-toggle-all-arcs/);
  assert.match(template, /Show Weapon Arcs/);
  assert.match(template, /Weapon Arcs/);
  assert.match(template, /afcs-drawer-log/);
  assert.match(source, /Open Arkflight Combat Strip/);
});

test("Command HUD End Turn advances Foundry initiative and follows the active Arkflight ship", () => {
  assert.match(template, /data-end-turn/);
  assert.match(commandHud, /combat\.nextTurn\(\)/);
  assert.match(commandHud, /waitForCombatAdvance/);
  assert.match(commandHud, /nextTurnCoordinates/);
  assert.match(commandHud, /combat\.update\(\{ round: fallback\.round, turn: fallback\.turn \}\)/);
  assert.match(commandHud, /stopImmediatePropagation/);
  assert.match(commandHud, /app\.setReference\?\.\(next\.actor\)/);
  assert.match(commandHud, /arkflightCombatTurnChanged/);
  assert.match(commandHud, /followActiveShip/);
});
