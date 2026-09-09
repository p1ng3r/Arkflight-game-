import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/combat-console.hbs", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/combat-console.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("canvas combat strip is registered as a Foundry module, template, and stylesheet", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/combat-console-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/combat-console.css"));
  assert.match(source, /class ArkflightCombatConsole/);
  assert.match(source, /renderTokenHUD/);
  assert.match(source, /openArkflightCombatConsole/);
  assert.match(template, /afcs-strip/);
  assert.match(css, /arkflight-combat-console/);
});

test("combat strip exposes all five permanent combat stations through a slide-out drawer", () => {
  for (const station of ["captain", "battlewatch", "navigator", "engineer", "veilwarden"]) assert.match(source, new RegExp(`id: "${station}"`));
  assert.match(template, /data-toggle-panel="stations"/);
  assert.match(template, /data-station-action/);
  assert.match(template, /afcs-drawer-stations/);
});

test("combat strip includes AP spend visibility, targeting, weapon fire, and hidden log drawer", () => {
  assert.match(source, /targetingSolution/);
  assert.match(source, /fireAtTarget/);
  assert.match(source, /workTheGuns/);
  assert.match(source, /apSpent/);
  assert.match(source, /rpSpent/);
  assert.match(template, /data-target-select/);
  assert.match(template, /data-fire-weapon/);
  assert.match(template, /afcs-drawer-log/);
  assert.match(template, /Spent \{\{resources\.apSpent\}\}/);
  for (const resource of ["AP", "RP", "Strain", "Heading"]) assert.match(template, new RegExp(resource));
});

test("combat strip keeps canonical all-arc rendering and token-HUD launch controls", () => {
  assert.match(source, /weaponArcCheck/);
  assert.match(source, /toggleAllConsoleArcs/);
  for (const facing of ["fore", "port", "starboard", "aft"]) assert.match(source, new RegExp(`id: "${facing}"`));
  assert.match(template, /data-toggle-all-arcs/);
  assert.match(source, /Open Arkflight Combat Strip/);
});
