import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  normalizeHeading,
  resolveShipFacingRequest,
  snapShipHeading
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

test("arbitrary headings snap to legal 30-degree preview headings", () => {
  assert.equal(normalizeHeading(-30), 330);
  assert.equal(snapShipHeading(46), 60);
  assert.equal(snapShipHeading(179), 180);
  assert.equal(snapShipHeading(14), 0);
  assert.equal(snapShipHeading(16), 30);
  assert.match(source, /changes\.rotation = resolved/);
  assert.match(source, /resolveShipFacingRequest/);
});

test("slow Ctrl-wheel requests advance one 30-degree preview step", () => {
  assert.equal(resolveShipFacingRequest(0, 5), 30);
  assert.equal(resolveShipFacingRequest(60, 65), 90);
  assert.equal(resolveShipFacingRequest(60, 55), 30);
  assert.equal(resolveShipFacingRequest(0, 355), 330);
});

test("15-degree Shift-wheel requests advance one 30-degree preview step", () => {
  assert.equal(resolveShipFacingRequest(0, 15), 30);
  assert.equal(resolveShipFacingRequest(120, 105), 90);
  assert.equal(resolveShipFacingRequest(300, 315), 330);
});

test("larger direct rotation requests snap to the nearest 30-degree heading", () => {
  assert.equal(resolveShipFacingRequest(0, 45), 60);
  assert.equal(resolveShipFacingRequest(60, 150), 150);
  assert.equal(resolveShipFacingRequest(300, 210), 210);
});
