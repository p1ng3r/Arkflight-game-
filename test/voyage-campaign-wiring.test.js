import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const voyageApi = readFileSync(new URL("../src/foundry/voyage-travel-api.js", import.meta.url), "utf8");
const expeditionApi = readFileSync(new URL("../src/foundry/expedition-api.js", import.meta.url), "utf8");
const voyageUi = readFileSync(new URL("../src/ui/gm-operations-voyage-ui.js", import.meta.url), "utf8");

test("Foundry loads strategic Voyage and Expedition runtimes before GM Voyage UI", () => {
  const modules = moduleJson.esmodules;
  const route = modules.indexOf("src/foundry/voyage-travel-api.js");
  const expedition = modules.indexOf("src/foundry/expedition-api.js");
  const ui = modules.indexOf("src/ui/gm-operations-voyage-ui.js");
  assert.ok(route >= 0 && route < ui);
  assert.ok(expedition >= 0 && expedition < ui);
});

test("strategic Voyage runtime persists route progress and advances Foundry world time by leg", () => {
  assert.match(voyageApi, /activeStrategicRoute/);
  assert.match(voyageApi, /strategicRoutePlan/);
  assert.match(voyageApi, /game\.time\?\.advance/);
  assert.match(voyageApi, /arkflightVoyageLegAdvanced/);
  assert.match(voyageApi, /finish or abandon|Finish or abandon/);
});

test("GM Voyage UI exposes route planning and light Expedition preparation", () => {
  assert.match(voyageUi, /Plot Galactic Passage/);
  assert.match(voyageUi, /Advance Next Hex/);
  assert.match(voyageUi, /Route Condition/);
  assert.match(voyageUi, /Prepare Away Mission/);
  assert.match(voyageUi, /We Brought One/);
  assert.match(voyageUi, /Ship Specialists/);
});

test("Expedition runtime exposes Event-queryable mission context", () => {
  assert.match(expeditionApi, /activeExpedition/);
  assert.match(expeditionApi, /hasSpecialist/);
  assert.match(expeditionApi, /hasEquipment/);
  assert.match(expeditionApi, /requirementStatus/);
  assert.match(expeditionApi, /useFlexibleEquipment/);
});
