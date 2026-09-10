import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gmApp = readFileSync(new URL("../src/ui/gm-operations-app.js", import.meta.url), "utf8");
const gmTemplate = readFileSync(new URL("../templates/gm-operations.hbs", import.meta.url), "utf8");
const gmCss = readFileSync(new URL("../styles/gm-operations.css", import.meta.url), "utf8");
const combatConsole = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");
const combatCss = readFileSync(new URL("../styles/arkflight-command-hud.css", import.meta.url), "utf8");

test("GM Operations uses the Arkflight engineer crest instead of the old compass icon", () => {
  assert.match(gmApp, /arkflight_engineer_crest\.webp/);
  assert.match(gmTemplate, /arkflight-gm-nav-emblem/);
  assert.match(gmCss, /arkflight-gm-nav-emblem/);
});

test("token HUD combat launcher uses the Arkflight combat weapons crest", () => {
  assert.match(combatConsole, /arkflight_weapons_crest\.webp/);
  assert.match(combatConsole, /arkflight-token-combat-emblem/);
  assert.match(combatCss, /arkflight-token-combat-emblem/);
  assert.doesNotMatch(combatConsole, /fa-solid fa-gauge-high fa-fw/);
});
