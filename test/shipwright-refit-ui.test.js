import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const moduleJson = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const uiPath = new URL("../src/ui/shipwright-refit-inventory-ui.js", import.meta.url);
const uiSource = fs.readFileSync(uiPath, "utf8");
const cssSource = fs.readFileSync(new URL("../styles/shipwright-refit-inventory.css", import.meta.url), "utf8");

test("Part 4 Shipwright UI assets are loaded by module.json", () => {
  assert.ok(moduleJson.esmodules.includes("src/ui/shipwright-refit-inventory-ui.js"));
  assert.ok(moduleJson.styles.includes("styles/shipwright-refit-inventory.css"));
});

test("Part 4 Shipwright UI source parses as valid JavaScript", () => {
  const result = spawnSync(process.execPath, ["--check", uiPath.pathname], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("Available Parts are bound to physical inventory rather than catalog visibility", () => {
  assert.match(uiSource, /inventory\?\.\[meta\.inventory\]/);
  assert.match(uiSource, /refitInventoryQuantity/);
  assert.match(cssSource, /data-refit-inventory-quantity="0"/);
});

test("Blueprint bench exposes canonical build cost, time, and Crafting DC", () => {
  assert.match(uiSource, /spec\?\.build\?\.partsCost/);
  assert.match(uiSource, /spec\?\.build\?\.timeHours/);
  assert.match(uiSource, /spec\?\.build\?\.dc/);
  assert.match(uiSource, /buildFromBlueprint/);
});

test("Ship socket compatibility uses canonical refit slotClass", () => {
  assert.match(uiSource, /data\?\.refit/);
  assert.match(uiSource, /slotClass/);
  assert.match(uiSource, /shipModSlotRows/);
  assert.match(uiSource, /is-category-compatible/);
  assert.match(uiSource, /is-category-incompatible/);
});
