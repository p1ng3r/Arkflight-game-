import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const cleanupPath = new URL("../src/ui/refit-alpha-cleanup-ui.js", import.meta.url);
const cleanupSource = fs.readFileSync(cleanupPath, "utf8");
const unifiedCss = fs.readFileSync(new URL("../styles/refit-alpha-unified.css", import.meta.url), "utf8");
const diagnostics = fs.readFileSync(new URL("../src/foundry/refit-diagnostics.js", import.meta.url), "utf8");
const portrait = fs.readFileSync(new URL("../src/ui/ship-portrait-ui.js", import.meta.url), "utf8");
const workOrder = fs.readFileSync(new URL("../src/ui/shipwright-refit-work-order-ui.js", import.meta.url), "utf8");
const time = fs.readFileSync(new URL("../src/foundry/refit-time.js", import.meta.url), "utf8");

test("final Refit Alpha presentation assets load last", () => {
  assert.equal(moduleJson.styles.at(-1), "styles/refit-alpha-unified.css");
  assert.equal(moduleJson.esmodules.at(-1), "src/ui/refit-alpha-cleanup-ui.js");
});

test("final cleanup UI parses and removes ambiguous Apply Refit language", () => {
  const parsed = spawnSync(process.execPath, ["--check", cleanupPath.pathname], { encoding: "utf8" });
  assert.equal(parsed.status, 0, parsed.stderr || parsed.stdout);
  assert.match(cleanupSource, /SAVE CORE BUILD/);
  assert.match(cleanupSource, /INSTALL MOD — CREW/);
  assert.match(cleanupSource, /INSTALL MOD — SHIPYARD/);
});

test("unified presentation reserves cyan amber and red for consistent states", () => {
  assert.match(unifiedCss, /--arkflight-ui-cyan/);
  assert.match(unifiedCss, /--arkflight-ui-amber/);
  assert.match(unifiedCss, /--arkflight-ui-red/);
  assert.match(unifiedCss, /is-refit-staged/);
  assert.match(unifiedCss, /is-category-incompatible/);
});

test("Alpha diagnostics expose the final readiness audit", () => {
  assert.match(diagnostics, /alphaReady/);
  assert.match(diagnostics, /General time API loaded/);
  assert.match(diagnostics, /Crew installation path available/);
  assert.match(diagnostics, /Shipyard installation path available/);
  assert.match(diagnostics, /Portrait\/token separation supported/);
});

test("final Alpha retains crew shipyard time and separate portrait paths", () => {
  assert.match(workOrder, /method === "shipyard"/);
  assert.match(workOrder, /skill\.check\.roll/);
  assert.match(time, /updateWorldTime/);
  assert.match(time, /advanceWorkTime/);
  assert.match(portrait, /actor\.update\(\{ img:/);
  assert.doesNotMatch(portrait, /prototypeToken\.texture\.src\s*:/);
});
