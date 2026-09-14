import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");
const helmUi = readFileSync(new URL("../src/ui/ship-helm-token-hud-ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/ship-helm-token-hud.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("module loads native Arkflight radial Helm HUD", () => {
  assert.ok(manifest.esmodules.includes("src/ui/ship-helm-token-hud-ui.js"));
  assert.ok(manifest.styles.includes("styles/ship-helm-token-hud.css"));
  assert.match(helmUi, /Hooks\.on\("renderTokenHUD"/);
  assert.match(helmUi, /canvas\?\.tokens\?\.hud\?\.bind/);
  assert.match(css, /arkflight-helm-ring/);
  assert.match(css, /arkflight-helm-control/);
});

test("Helm HUD exposes 30-degree turn buttons and grid-ranked movement", () => {
  assert.match(helmUi, /await api\.turn\(-1, combatant\)/);
  assert.match(helmUi, /await api\.turn\(1, combatant\)/);
  assert.match(helmUi, /Turn 30°/);
  assert.match(helmUi, /status\.geometry\?\.forward/);
  assert.match(helmUi, /status\.geometry\?\.reverse/);
  assert.match(helmUi, /Forward L/);
  assert.match(helmUi, /Forward R/);
});

test("active player ship movement is authoritative through helmMove while GM drag remains override", () => {
  assert.match(combatApi, /async function helmMove\(direction, reference = null\)/);
  assert.match(combatApi, /isArkflightHelmMovement\(movement\)/);
  assert.match(combatApi, /use the Arkflight Helm controls to move the ship/);
  assert.match(combatApi, /if \(game\.user\?\.isGM\)[\s\S]*administrative override/);
  assert.match(combatApi, /method: "hud"/);
  assert.match(combatApi, /autoRotate: false/);
});

test("normal forward movement commits heading and spends one hex of movement", () => {
  assert.match(combatApi, /commitFacing\(next, next\.mobility\?\.heading, "move"\)/);
  assert.match(combatApi, /recordMovement\(next, 1\)/);
  assert.match(combatApi, /if \(remaining <= 0\)[\s\S]*purchaseMovement\(next\)/);
});

test("Reverse Thrust is a special 1 AP one-hex astern move with undo bookkeeping", () => {
  assert.match(combatApi, /direction\.startsWith\("reverse"\)/);
  assert.match(combatApi, /next = spendPoints\(next, "ap", 1\)/);
  assert.match(combatApi, /specialMovementAP/);
  assert.match(combatApi, /commitFacing\(next, next\.mobility\?\.heading, "reverse-thrust"\)/);
  assert.match(combatApi, /specialMoveRefund/);
  assert.match(helmUi, /Reverse Thrust · 1 AP · move 1 hex astern/);
});
