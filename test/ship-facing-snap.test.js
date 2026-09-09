import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/foundry/ship-facing-snap.js", import.meta.url), "utf8");
const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("ship facing snap loads before the combat validator", () => {
  const snapIndex = moduleJson.esmodules.indexOf("src/foundry/ship-facing-snap.js");
  const combatIndex = moduleJson.esmodules.indexOf("src/foundry/combat-api.js");
  assert.ok(snapIndex >= 0);
  assert.ok(combatIndex >= 0);
  assert.ok(snapIndex < combatIndex);
});

test("ship facing snap normalizes arbitrary Foundry rotation to legal hex headings", () => {
  assert.match(source, /Math\.round\(normalized \/ 60\) \* 60/);
  assert.match(source, /changes\.rotation = snapped/);
  assert.match(source, /preUpdateToken/);
  assert.match(source, /arkflightHexSnap/);
});
