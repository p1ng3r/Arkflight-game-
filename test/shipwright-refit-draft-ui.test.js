import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const uiPath = new URL("../src/ui/shipwright-refit-draft-ui.js", import.meta.url);
const uiSource = fs.readFileSync(uiPath, "utf8");
const cssSource = fs.readFileSync(new URL("../styles/shipwright-refit-draft.css", import.meta.url), "utf8");
const workOrderSource = fs.readFileSync(new URL("../src/ui/shipwright-refit-work-order-ui.js", import.meta.url), "utf8");

test("Part 5 staged refit assets are loaded after the inventory and socket layers", () => {
  const draftIndex = moduleJson.esmodules.indexOf("src/ui/shipwright-refit-draft-ui.js");
  assert.ok(draftIndex > moduleJson.esmodules.indexOf("src/ui/shipwright-refit-inventory-ui.js"));
  assert.ok(draftIndex > moduleJson.esmodules.indexOf("src/ui/shipwright-arkengine-socket-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/shipwright-refit-draft.css"));
});

test("Part 5 staged refit UI source parses as valid JavaScript", () => {
  const result = spawnSync(process.execPath, ["--check", uiPath.pathname], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("valid socket click and drop are intercepted into staging instead of legacy install", () => {
  assert.match(uiSource, /stageRefitComponent/);
  assert.match(uiSource, /stopImmediatePropagation\(\)/);
  assert.match(uiSource, /root\.addEventListener\("drop"/);
});

test("draft UI exposes install cost, shipyard labor, and mechanical stat deltas", () => {
  assert.match(uiSource, /refitDraftInstallParts/);
  assert.match(uiSource, /previewRefitDraft/);
  assert.match(uiSource, /Install Parts/);
  assert.match(uiSource, /Shipyard Labor/);
  assert.match(uiSource, /arkflight-refit-stat-deltas/);
});

test("visible legacy apply control is repurposed as Crew Install and old click is intercepted", () => {
  assert.match(uiSource, /INSTALL MOD — CREW/);
  assert.match(uiSource, /INSTALL MOD — SHIPYARD/);
  assert.match(uiSource, /dataRefitDraftAction|refitDraftAction/);
  assert.match(uiSource, /arkflightRefitInstallRequested/);
  assert.match(uiSource, /event\.stopImmediatePropagation\(\)/);
  assert.match(cssSource, /data-refit-draft-action="install"/);
  assert.doesNotMatch(cssSource, /data-bay-action="apply"\][^{]*\{[^}]*display:\s*none/i);
});

test("Crew Install request is wired to PF2e Crafting resolution", () => {
  assert.match(workOrderSource, /arkflightRefitInstallRequested/);
  assert.match(workOrderSource, /skills\?\.crafting/);
  assert.match(workOrderSource, /skill\.check\.roll/);
  assert.match(workOrderSource, /beginInstallDraft/);
  assert.match(workOrderSource, /completeWork/);
  assert.match(workOrderSource, /game\.time\?\.advance/);
});

test("Shipyard Install uses guaranteed shipyard method and records labor gold", () => {
  assert.match(workOrderSource, /installStagedModAtShipyard/);
  assert.match(workOrderSource, /method: "shipyard"/);
  assert.match(workOrderSource, /laborGold: job\.goldCost/);
});
