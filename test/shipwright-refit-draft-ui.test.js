import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const uiPath = new URL("../src/ui/shipwright-refit-draft-ui.js", import.meta.url);
const uiSource = fs.readFileSync(uiPath, "utf8");
const cssSource = fs.readFileSync(new URL("../styles/shipwright-refit-draft.css", import.meta.url), "utf8");

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
  assert.doesNotMatch(uiSource, /\.click\(\).*install/i);
});

test("draft UI exposes projected install cost and mechanical stat deltas", () => {
  assert.match(uiSource, /refitDraftInstallParts/);
  assert.match(uiSource, /previewRefitDraft/);
  assert.match(uiSource, /Projected Install Parts/);
  assert.match(uiSource, /arkflight-refit-stat-deltas/);
});

test("legacy Apply Refit is hidden behind Reset Draft and Begin Refit", () => {
  assert.match(uiSource, /data-refit-draft-action=\"reset\"/);
  assert.match(uiSource, /data-refit-draft-action=\"begin\"/);
  assert.match(uiSource, /legacyApply\.hidden = true/);
  assert.match(cssSource, /data-bay-action="apply"/);
});
