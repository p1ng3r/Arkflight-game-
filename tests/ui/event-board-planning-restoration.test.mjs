import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../../src/ui/event-board-app.js", import.meta.url), "utf8");
const moduleManifest = JSON.parse(fs.readFileSync(new URL("../../module.json", import.meta.url), "utf8"));
const cssSource = fs.readFileSync(new URL("../../styles/event-board-planning-restoration.css", import.meta.url), "utf8");

test("authoritative Event Board restores left rail and selected station detail during planning", () => {
  assert.match(appSource, /#restorePlanningBoardLayout\(\)/);
  assert.match(appSource, /arkflight-planning-station-rail/);
  assert.match(appSource, /arkflight-planning-detail/);
  assert.match(appSource, /data-arkflight-focus-station|arkflightFocusStation/);
  assert.match(appSource, /arkflight-action-vignette-label/);
  assert.match(appSource, /arkflight-planning-mastery-card/);
});

test("planning restoration remains visual-only and Lock Plan stays controller-owned", () => {
  assert.match(appSource, /case "lock-plan": await this\.controller\.lockPlan\(\)/);
  assert.doesNotMatch(appSource, /player-action-board-ui/);
  assert.doesNotMatch(appSource, /player-action-command-bar-ui/);
});

test("restored planning stylesheet is loaded without legacy player-action styles", () => {
  assert.ok(moduleManifest.styles.includes("styles/event-board-planning-restoration.css"));
  assert.match(cssSource, /grid-template-columns:minmax\(360px,.82fr\) minmax\(0,1.18fr\)/);
  assert.match(cssSource, /arkflight-board-footer/);
  for (const legacy of moduleManifest.styles) assert.doesNotMatch(legacy, /player-action-board|player-action-command-bar/);
  for (const legacy of moduleManifest.esmodules) assert.doesNotMatch(legacy, /player-action-board|player-action-command-bar/);
});
