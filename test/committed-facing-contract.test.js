import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const state = readFileSync(new URL("../src/combat/combatant-state.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../src/combat/combat-schema.js", import.meta.url), "utf8");
const input = readFileSync(new URL("../src/combat/facing-input.js", import.meta.url), "utf8");
const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");
const fireEffects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
const salvo = readFileSync(new URL("../src/foundry/combat-salvo-runtime.js", import.meta.url), "utf8");
const stations = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
const sync = readFileSync(new URL("../src/combat/combatant-loadout-sync.js", import.meta.url), "utf8");

test("Arkflight visual ship heading uses 30-degree increments", () => {
  assert.match(schema, /SHIP_HEADING_INCREMENT = 30/);
  assert.match(schema, /normalizeShipHeading/);
  assert.match(input, /SHIP_HEADING_INCREMENT/);
  assert.match(input, /resolveShipFacingRequest/);
});

test("token rotation is preview-only and cannot accumulate facing cost", () => {
  const updateTokenStart = combatApi.indexOf('Hooks.on("updateToken"');
  const updateTokenEnd = combatApi.indexOf('Hooks.on("deleteCombat"', updateTokenStart);
  const body = combatApi.slice(updateTokenStart, updateTokenEnd);
  assert.match(body, /previewFacing\(state, heading\)/);
  assert.doesNotMatch(body, /commitFacing/);
  assert.doesNotMatch(body, /recordFacingChange/);
  assert.doesNotMatch(body, /headingStepDistance/);
});

test("meaningful gameplay events commit the current preview heading", () => {
  assert.match(combatApi, /commitFacing\(state, state\.mobility\?\.heading, "move"\)/);
  assert.match(combatApi, /commitFacing\(combatantState\(attacker\)[\s\S]*?"fire"\)/);
  assert.match(fireEffects, /commitFacing\(attackerBefore, attackerBefore\?\.mobility\?\.heading, "fire"\)/);
  assert.match(salvo, /commitFacing\(attackerBefore, attackerBefore\?\.mobility\?\.heading, "salvo"\)/);
  assert.match(stations, /FACING_COMMIT_RESOLVERS = new Set\(\["ramShip", "boardShip", "setAttackVector"\]\)/);
});

test("End Turn projects the current preview once and settles degree-based AP", () => {
  assert.match(combatApi, /facingReconciliation\(state, \{ includePreview: true \}\)/);
  assert.match(combatApi, /settleFacingCost\(current\)/);
  assert.match(state, /headingDegreeDistance/);
  assert.match(state, /usedDegrees/);
});

test("legacy mouse-event facing counters are deliberately discarded", () => {
  assert.match(sync, /v5 and earlier stored every token rotation update in maneuver\.used/);
  assert.match(sync, /maneuver: Object\.freeze\(\{ \.\.\.current\.maneuver, used: 0 \}\)/);
});
