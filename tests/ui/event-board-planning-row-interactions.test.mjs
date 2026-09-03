import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui = fs.readFileSync("src/ui/event-board-planning-polish-ui.js", "utf8");
const css = fs.readFileSync("styles/event-board-station-rail-compact.css", "utf8");

test("planning removes the redundant top mastery panel", () => {
  assert.match(ui, /querySelector\("\.arkflight-mastery-panel"\)\?\.remove\(\)/);
});

test("station mastery is a sibling button with its own popup handler", () => {
  assert.match(ui, /document\.createElement\("button"\)/);
  assert.match(ui, /className = "arkflight-rail-mastery-link"/);
  assert.match(ui, /row\.insertBefore\(masteryButton/);
  assert.match(ui, /await showMastery\(state, stationId\)/);
});

test("portrait double click opens the assigned actor sheet", () => {
  assert.match(ui, /state\.assignments\?\.\[stationId\]\?\.actorId/);
  assert.match(ui, /addEventListener\("dblclick"/);
  assert.match(ui, /openActorSheet\(actor\)/);
});

test("planning portraits remain circular and larger without increasing row height", () => {
  assert.match(css, /\.arkflight-command-summary-row\{min-height:62px/);
  assert.match(css, /\.arkflight-planning-avatar\{width:52px!important;height:52px!important;border-radius:50%!important;overflow:hidden!important/);
  assert.match(css, /object-fit:cover!important;border-radius:50%!important;transform:none!important/);
});
