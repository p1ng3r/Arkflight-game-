import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("retired Area and direct system-damage modules stay removed", () => {
  assert.equal(existsSync(new URL("src/ship/area-readiness.js", root)), false);
  assert.equal(existsSync(new URL("src/combat/system-damage.js", root)), false);
  assert.equal(existsSync(new URL("src/foundry/combat-area-consequences.js", root)), false);
  assert.equal(existsSync(new URL("src/ui/refit-alpha-cleanup-ui.js", root)), false);
  assert.equal(existsSync(new URL("src/foundry/combat-balance-runtime.js", root)), false);
  assert.equal(existsSync(new URL("src/ui/ship-sheet-polish-ui.js", root)), false);
  assert.equal(existsSync(new URL("styles/ship-sheet-polish.css", root)), false);
  assert.equal(existsSync(new URL("scripts/combat-gauntlet.mjs", root)), false);
  assert.equal(existsSync(new URL("src/ship/strain-rules.js", root)), true);
  assert.equal(existsSync(new URL("src/foundry/combat-condition-consequences.js", root)), true);
});

test("manifest loads the canonical Ship Condition consequence runtime", () => {
  const manifest = JSON.parse(read("module.json"));
  assert.ok(manifest.esmodules.includes("src/foundry/combat-condition-consequences.js"));
  assert.equal(manifest.esmodules.includes("src/foundry/combat-area-consequences.js"), false);
});

test("schema and sheet APIs do not re-export retired Area state", () => {
  const schema = read("src/ship/ship-schema.js");
  const view = read("src/ui/ship-sheet-view-model.js");
  assert.doesNotMatch(schema, /\bAREA_STATES\b|\bSHIP_AREA_KEYS\b|\bSHIP_SYSTEM_KEYS\b|\bSYSTEM_STATES\b/);
  assert.doesNotMatch(view, /\bAREA_STATION_PENALTIES\b|\bbuildAreaViews\b|areas:\s*conditions/);
});

test("Event UI does not rewrite authored text after render", () => {
  const source = read("src/ui/unified-ship-state-ui.js");
  assert.doesNotMatch(source, /replaceLegacyPlayerText|createTreeWalker/);
});


test("legacy combat gauntlet command stays retired", () => {
  const pkg = JSON.parse(read("package.json"));
  const manifest = JSON.parse(read("module.json"));
  assert.equal("combat:gauntlet:legacy" in (pkg.scripts ?? {}), false);
  assert.equal(manifest.esmodules.includes("src/ui/refit-alpha-cleanup-ui.js"), false);
  assert.equal(manifest.esmodules.includes("src/ui/ship-sheet-polish-ui.js"), false);
  assert.equal(manifest.styles.includes("styles/ship-sheet-polish.css"), false);
});
