import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const combatApi = readFileSync(new URL("../src/foundry/combat-api.js", import.meta.url), "utf8");
const helmUi = readFileSync(new URL("../src/ui/ship-helm-token-hud-ui.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/ship-helm-token-hud.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const commandTemplate = readFileSync(new URL("../templates/combat-console.hbs", import.meta.url), "utf8");
const commandCss = readFileSync(new URL("../styles/arkflight-command-hud.css", import.meta.url), "utf8");
const combatConsoleUi = readFileSync(new URL("../src/ui/combat-console-ui.js", import.meta.url), "utf8");

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
  assert.match(combatApi, /ACTIVE_HELM_MOVES/);
  assert.match(combatApi, /isArkflightHelmMovement\(token\)/);
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


test("Foundry owns the real movement ID for Helm moves", () => {
  assert.doesNotMatch(combatApi, /helmMovementId/);
  assert.doesNotMatch(combatApi, /id:\s*["'`]arkflight-helm/);
  assert.match(combatApi, /ACTIVE_HELM_MOVES\.add\(token\.id\)/);
  assert.match(combatApi, /ACTIVE_HELM_MOVES\.delete\(token\.id\)/);
  const moveCall = combatApi.match(/completed = await token\.move\([\s\S]*?\n\s*\);/)?.[0] ?? "";
  assert.ok(moveCall, "expected Arkflight token.move call");
  assert.doesNotMatch(moveCall, /\bid\s*:/);
});


test("Helm HUD stays compact and keeps Foundry token utilities behind one toggle", () => {
  assert.match(helmUi, /NATIVE_CONTROLS_OPEN/);
  assert.match(helmUi, /data-arkflight-native-controls/);
  assert.doesNotMatch(helmUi, /<small>\$\{label\}<\/small>/);
  assert.match(css, /arkflight-native-controls-open/);
  assert.match(css, /width:\s*36px/);
  assert.match(css, /arkflight-helm-utilities/);
});

test("movement recovery controls live in the command HUD and honor ship ownership", () => {
  assert.match(commandTemplate, /afch-position-menu/);
  assert.match(commandTemplate, /data-undo-move/);
  assert.match(commandTemplate, /data-undo-facing/);
  assert.match(commandTemplate, /data-reset-turn-position/);
  assert.doesNotMatch(commandTemplate, /afch-undo-controls/);
  assert.match(commandCss, /afch-position-popover/);
  assert.ok(combatConsoleUi.includes("canUndoMove: Boolean(combatant && api?.canOperate?.(combatant) && undoStatus.canUndoMove)"));
  assert.ok(combatConsoleUi.includes('if (!combatant || !api?.canOperate?.(combatant) || typeof api?.[action] !== "function") return;'));
});
