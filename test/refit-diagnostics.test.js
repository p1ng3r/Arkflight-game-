import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const diagnosticsPath = new URL("../src/foundry/refit-diagnostics.js", import.meta.url);
const diagnosticsSource = fs.readFileSync(diagnosticsPath, "utf8");

test("Foundry Refit diagnostics are loaded by module.json", () => {
  assert.ok(moduleJson.esmodules.includes("src/foundry/refit-diagnostics.js"));
});

test("Foundry Refit diagnostics source parses as valid JavaScript", () => {
  const result = spawnSync(process.execPath, ["--check", diagnosticsPath.pathname], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("Refit diagnostics audit the Part 1-6 integration boundaries", () => {
  assert.match(diagnosticsSource, /SHIP_SCHEMA_VERSION/);
  assert.match(diagnosticsSource, /salvageParts/);
  assert.match(diagnosticsSource, /blueprints/);
  assert.match(diagnosticsSource, /inventory/);
  assert.match(diagnosticsSource, /workOrders/);
  assert.match(diagnosticsSource, /arkengine\?\.modIds/);
  assert.match(diagnosticsSource, /deriveShip/);
  assert.match(diagnosticsSource, /game\.arkflight\.refitDiagnostics/);
});
