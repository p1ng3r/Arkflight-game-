import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const unifiedCss = fs.readFileSync(new URL("../styles/refit-alpha-unified.css", import.meta.url), "utf8");
const diagnostics = fs.readFileSync(new URL("../src/foundry/refit-diagnostics.js", import.meta.url), "utf8");
const portrait = fs.readFileSync(new URL("../src/ui/ship-portrait-ui.js", import.meta.url), "utf8");
const workOrder = fs.readFileSync(new URL("../src/ui/shipwright-refit-work-order-ui.js", import.meta.url), "utf8");
const draftUi = fs.readFileSync(new URL("../src/ui/shipwright-refit-draft-ui.js", import.meta.url), "utf8");
const time = fs.readFileSync(new URL("../src/foundry/refit-time.js", import.meta.url), "utf8");

test("final Refit Alpha presentation assets load without a post-render cleanup shim", () => {
  const unifiedIndex = moduleJson.styles.indexOf("styles/refit-alpha-unified.css");
  assert.ok(unifiedIndex >= 0);
  assert.ok(unifiedIndex > moduleJson.styles.indexOf("styles/shipwright-refit-draft.css"));
  assert.equal(moduleJson.esmodules.includes("src/ui/refit-alpha-cleanup-ui.js"), false);
});

test("owning Refit modules provide canonical build and installation language", () => {
  assert.match(workOrder, /SAVE CORE BUILD/);
  assert.match(workOrder, /Core-build changes use Save Core Build/);
  assert.match(draftUi, /INSTALL MOD — CREW/);
  assert.match(draftUi, /INSTALL MOD — SHIPYARD/);
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
