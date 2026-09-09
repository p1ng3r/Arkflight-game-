import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/combat-console.hbs", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/combat-console.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("canvas combat console is registered as a Foundry module, template, and stylesheet", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/combat-console-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/combat-console.css"));
  assert.match(source, /class ArkflightCombatConsole/);
  assert.match(source, /renderTokenHUD/);
  assert.match(source, /openArkflightCombatConsole/);
  assert.match(template, /Combat Console/);
  assert.match(css, /arkflight-combat-console/);
});

test("combat console exposes all five permanent combat stations", () => {
  for (const station of ["captain", "battlewatch", "navigator", "engineer", "veilwarden"]) assert.match(source, new RegExp(`id: "${station}"`));
  assert.match(template, /4 Actions \+ 1 Reaction/);
  assert.match(template, /data-station-action/);
});

test("combat console includes live targeting, weapon fire, and resource controls", () => {
  assert.match(source, /targetingSolution/);
  assert.match(source, /fireAtTarget/);
  assert.match(source, /workTheGuns/);
  assert.match(template, /data-target-select/);
  assert.match(template, /data-weapon-select/);
  assert.match(template, /Fire &amp; Apply/);
  for (const resource of ["AP", "RP", "STRAIN", "HEADING"]) assert.match(template, new RegExp(resource));
});

test("combat console can filter firing arcs by facing using canonical arc math", () => {
  assert.match(source, /weaponArcCheck/);
  assert.match(source, /toggleConsoleFacing/);
  assert.match(source, /toggleAllConsoleArcs/);
  for (const facing of ["fore", "port", "starboard", "aft"]) assert.match(source, new RegExp(`id: "${facing}"`));
  assert.match(template, /data-toggle-all-arcs/);
  assert.match(template, /data-toggle-facing/);
});
