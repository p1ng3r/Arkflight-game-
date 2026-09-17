import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const paths = [
  "../src/combat/combatant-state.js",
  "../src/combat/salvo-rules.js",
  "../src/foundry/combat-station-actions-api.js",
  "../src/foundry/combat-salvo-runtime.js",
  "../src/ui/weapon-combat-station-ui.js",
  "../src/ui/ship-weapons-tab-ui.js",
  "../src/ui/combat-console-ui.js",
  "../src/ui/gm-operations-combat-ui.js"
];

test("weapon Reload is active work, never a passive ready-round timer", () => {
  for (const path of paths) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /readyRound/, `${path} must not restore passive reload timing`);
  }
});

test("core combat state stores explicit Reload remaining", () => {
  const source = readFileSync(new URL("../src/combat/combatant-state.js", import.meta.url), "utf8");
  assert.match(source, /reloadRemaining/);
  assert.match(source, /weaponReloadRemaining/);
  assert.match(source, /beginCombatantTurn/);
});
