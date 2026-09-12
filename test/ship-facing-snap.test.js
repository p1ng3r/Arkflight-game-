import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  normalizeHeading,
  resolveHexFacingRequest,
  snapHexHeading
} from "../src/combat/facing-input.js";

const source = readFileSync(new URL("../src/foundry/ship-facing-snap.js", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("ship facing snap loads before the combat validator", () => {
  const snapIndex = moduleJson.esmodules.indexOf("src/foundry/ship-facing-snap.js");
  const combatIndex = moduleJson.esmodules.indexOf("src/foundry/combat-api.js");
  assert.ok(snapIndex >= 0);
  assert.ok(combatIndex >= 0);
  assert.ok(snapIndex < combatIndex);
});

test("arbitrary headings still snap to legal 60-degree Arkflight facings", () => {
  assert.equal(normalizeHeading(-60), 300);
  assert.equal(snapHexHeading(46), 60);
  assert.equal(snapHexHeading(179), 180);
  assert.match(source, /changes\.rotation = resolved/);
  assert.match(source, /preUpdateToken/);
  assert.match(source, /arkflightHexSnap/);
});

test("slow Ctrl-wheel requests advance one full Arkflight facing step", () => {
  assert.equal(resolveHexFacingRequest(0, 5), 60);
  assert.equal(resolveHexFacingRequest(60, 65), 120);
  assert.equal(resolveHexFacingRequest(60, 55), 0);
  assert.equal(resolveHexFacingRequest(0, 355), 300);
});

test("small Shift-wheel requests cannot snap back to the current heading", () => {
  assert.equal(resolveHexFacingRequest(0, 15), 60);
  assert.equal(resolveHexFacingRequest(120, 105), 60);
  assert.equal(resolveHexFacingRequest(300, 315), 0);
});

test("larger direct rotation requests still snap to the nearest legal heading", () => {
  assert.equal(resolveHexFacingRequest(0, 45), 60);
  assert.equal(resolveHexFacingRequest(60, 150), 180);
  assert.equal(resolveHexFacingRequest(300, 210), 240);
});
