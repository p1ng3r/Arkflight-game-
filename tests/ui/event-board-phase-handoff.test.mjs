import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../../module.json", import.meta.url), "utf8"));
const templateSource = fs.readFileSync(new URL("../../templates/event-board.hbs", import.meta.url), "utf8");
const planningStateSource = fs.readFileSync(new URL("../../src/event/planning-state.js", import.meta.url), "utf8");
const eventBoardAppSource = fs.readFileSync(new URL("../../src/ui/event-board-app.js", import.meta.url), "utf8");

const LEGACY_PLAYER_ACTION_MODULES = [
  "src/ui/player-action-board-ui.js",
  "src/ui/player-action-heroic-badge-ui.js",
  "src/ui/player-action-board-order-ui.js",
  "src/ui/player-action-board-cleanup-ui.js",
  "src/ui/player-action-board-gm-ui.js",
  "src/ui/player-action-board-responsive-fix-ui.js",
  "src/ui/player-action-board-footer-drawer-ui.js",
  "src/ui/player-action-command-bar-ui.js"
];

const LEGACY_PLAYER_ACTION_STYLES = [
  "styles/player-action-board.css",
  "styles/player-action-board-order.css",
  "styles/player-action-board-cleanup.css",
  "styles/player-action-board-gm.css",
  "styles/player-action-board-responsive.css",
  "styles/player-action-board-flow-footer.css",
  "styles/player-action-command-bar.css"
];

test("legacy player action overlay stack is not loaded by Foundry", () => {
  for (const path of LEGACY_PLAYER_ACTION_MODULES) assert.equal(moduleJson.esmodules.includes(path), false, `${path} must remain out of the live module load path`);
  for (const path of LEGACY_PLAYER_ACTION_STYLES) assert.equal(moduleJson.styles.includes(path), false, `${path} must remain out of the live style load path`);
});

test("Lock Plan enters Resolution inside the planning state authority", () => {
  assert.match(planningStateSource, /return initializeResolution\(locked\)/);
});

test("authoritative Event Board owns both Lock Plan and Resolution", () => {
  assert.match(templateSource, /data-ark-action="lock-plan"/);
  assert.match(templateSource, /\{\{#if resolution\}\}/);
  assert.match(templateSource, /arkflight-resolution-grid/);
  assert.match(templateSource, /resolve-active-station/);
  assert.match(eventBoardAppSource, /case "lock-plan": await this\.controller\.lockPlan\(\)/);
});
