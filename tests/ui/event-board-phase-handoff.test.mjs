import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const commandBarSource = fs.readFileSync(new URL("../../src/ui/player-action-command-bar-ui.js", import.meta.url), "utf8");
const planningBoardSource = fs.readFileSync(new URL("../../src/ui/player-action-board-ui.js", import.meta.url), "utf8");
const templateSource = fs.readFileSync(new URL("../../templates/event-board.hbs", import.meta.url), "utf8");

test("planning command bar yields stale planning DOM to authoritative non-planning phases", () => {
  assert.match(commandBarSource, /state\.phase !== "planning"/);
  assert.match(commandBarSource, /root\.querySelector\("\.pa-board"\)\?\.remove\(\)/);
  assert.match(commandBarSource, /root\.classList\.remove\("arkflight-player-action-mode"\)/);
  assert.match(commandBarSource, /queueAuthoritativePhaseRender/);
});

test("legacy locked phase is automatically recovered into Resolution", () => {
  assert.match(commandBarSource, /state\.phase === "locked"/);
  assert.match(commandBarSource, /controller\.beginResolution\(\)/);
});

test("lock plan requires Resolution before the planning UI yields", () => {
  assert.match(commandBarSource, /await controller\.lockPlan\(\)/);
  assert.match(commandBarSource, /controller\.state\?\.phase !== "resolution"/);
});

test("authoritative Event Board still owns the Resolution screen", () => {
  assert.match(templateSource, /\{\{#if resolution\}\}/);
  assert.match(templateSource, /arkflight-resolution-grid/);
  assert.match(templateSource, /resolve-active-station/);
  assert.match(planningBoardSource, /arkflight-player-action-mode/);
});
