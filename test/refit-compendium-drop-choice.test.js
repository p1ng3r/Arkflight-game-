import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const choice = readFileSync(new URL("../src/ui/refit-asset-choice.js", import.meta.url), "utf8");
const mods = readFileSync(new URL("../src/foundry/arkflight-compendiums.js", import.meta.url), "utf8");
const weapons = readFileSync(new URL("../src/foundry/weapon-compendium.js", import.meta.url), "utf8");
const view = readFileSync(new URL("../src/ui/ship-sheet-view-model.js", import.meta.url), "utf8");

test("refit compendium drops ask whether the entry is a Blueprint or Physical Part", () => {
  assert.match(choice, /What are you adding\?/);
  assert.match(choice, /Blueprint/);
  assert.match(choice, /Physical Part/);
  assert.match(mods, /chooseRefitAssetKind/);
  assert.match(mods, /acquireComponent/);
  assert.match(mods, /learnBlueprint/);
  assert.match(weapons, /chooseRefitAssetKind/);
  assert.match(weapons, /acquireComponent/);
  assert.match(weapons, /learnBlueprint/);
});

test("blueprint category icons are wired to their family asset folders", () => {
  assert.match(choice, /ship-mods\/blueprint_ship_mods\.webp/);
  assert.match(choice, /arkengine-mods\/blueprint_engine_mods\.webp/);
  assert.match(choice, /weapons\/blueprint_weapons\.webp/);
  assert.match(view, /blueprint_ship_mods\.webp/);
  assert.match(view, /blueprint_engine_mods\.webp/);
  assert.match(view, /blueprint_weapons\.webp/);
});
