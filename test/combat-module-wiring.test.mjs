import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modulePath = new URL("../module.json", import.meta.url);

test("Foundry loads free Helm, salvo, area consequences, and salvo UI in dependency order", async () => {
  const manifest = JSON.parse(await readFile(modulePath, "utf8"));
  const modules = manifest.esmodules ?? [];
  const flow = modules.indexOf("src/foundry/combat-flow-usability.js");
  const salvo = modules.indexOf("src/foundry/combat-salvo-runtime.js");
  const areas = modules.indexOf("src/foundry/combat-area-consequences.js");
  const weaponStation = modules.indexOf("src/ui/weapon-combat-station-ui.js");
  const salvoUi = modules.indexOf("src/ui/weapon-salvo-ui.js");

  assert.ok(flow >= 0, "combat-flow-usability must be loaded");
  assert.ok(salvo > flow, "salvo runtime must wrap the final combat-flow API");
  assert.ok(areas > salvo, "area consequences should observe final attack events");
  assert.ok(weaponStation >= 0 && salvoUi > weaponStation, "salvo UI requires the base weapon station UI first");
});
