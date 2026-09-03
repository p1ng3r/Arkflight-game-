import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const polish = fs.readFileSync(new URL("../../src/ui/event-board-planning-polish-ui.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../../styles/event-board-station-rail-compact.css", import.meta.url), "utf8");
const moduleJson = JSON.parse(fs.readFileSync(new URL("../../module.json", import.meta.url), "utf8"));

test("planning station rail is a compact two-line command summary", () => {
  assert.match(css, /arkflight-command-summary-row/);
  assert.match(css, /grid-template-columns:minmax\(150px/);
  assert.match(css, /arkflight-planning-action/);
  assert.match(css, /arkflight-planning-skill/);
  assert.match(css, /arkflight-rail-mastery-link/);
  assert.match(css, /arkflight-planning-ready-state\{display:none/);
});

test("rail mastery is clickable and opens the same Mastery detail dialog", () => {
  assert.match(polish, /showMastery\(state, stationId\)/);
  assert.match(polish, /arkflight-rail-mastery-link/);
  assert.match(polish, /role", "link"/);
});

test("compact station rail stylesheet is loaded by the module", () => {
  assert.ok(moduleJson.styles.includes("styles/event-board-station-rail-compact.css"));
});
