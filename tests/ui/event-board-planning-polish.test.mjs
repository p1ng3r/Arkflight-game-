import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../../module.json", import.meta.url), "utf8"));
const css = fs.readFileSync(new URL("../../styles/event-board-planning-restoration.css", import.meta.url), "utf8");
const compactCss = fs.readFileSync(new URL("../../styles/event-board-planning-compact-utility.css", import.meta.url), "utf8");
const polishUi = fs.readFileSync(new URL("../../src/ui/event-board-planning-polish-ui.js", import.meta.url), "utf8");

test("planning polish remains part of the authoritative Event Board runtime", () => {
  assert.ok(moduleJson.styles.includes("styles/event-board-planning-restoration.css"));
  assert.ok(moduleJson.styles.includes("styles/event-board-planning-compact-utility.css"));
  assert.ok(moduleJson.esmodules.includes("src/ui/event-board-planning-polish-ui.js"));
});

test("planning removes redundant order and score strips", () => {
  assert.match(css, /arkflight-order-bar/);
  assert.match(css, /arkflight-score-key/);
  assert.match(css, /display:none!important/);
  assert.match(polishUi, /querySelector\("\.arkflight-order-bar"\)\?\.remove/);
  assert.match(polishUi, /querySelector\("\.arkflight-score-key"\)\?\.remove/);
});

test("planning controls use readable full-width treatment", () => {
  assert.match(css, /\.arkflight-plan-select\{[^}]*width:100%!important/);
  assert.match(css, /font-size:14px!important/);
  assert.match(css, /align-items:start/);
  assert.match(css, /arkflight-action-vignette-copy/);
});

test("Mastery and Tactics use compact clickable detail links", () => {
  assert.match(compactCss, /arkflight-planning-utility-compact/);
  assert.match(compactCss, /arkflight-ability-info-link/);
  assert.match(polishUi, /showAbilityDetails/);
  assert.match(polishUi, /compactMasteries/);
  assert.match(polishUi, /compactTactics/);
});
