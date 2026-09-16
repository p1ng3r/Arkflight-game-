import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync(new URL("../src/foundry/event-manager-2.js", import.meta.url), "utf8");
const manager = fs.readFileSync(new URL("../src/ui/event-manager-2-ui.js", import.meta.url), "utf8");
const template = fs.readFileSync(new URL("../templates/event-manager-2.hbs", import.meta.url), "utf8");
const arkflight = fs.readFileSync(new URL("../src/foundry/arkflight.js", import.meta.url), "utf8");
const gmOperations = fs.readFileSync(new URL("../src/ui/gm-operations-app.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("Event Manager 2.0 exposes package lifecycle and launch API", () => {
  assert.match(runtime, /registerPackage/);
  assert.match(runtime, /sync,/);
  assert.match(runtime, /launch,/);
  assert.match(runtime, /completeStage/);\n  assert.match(runtime, /resetProgress/);\n  assert.match(runtime, /pkg\\.runtime\\?\\.launch/);\n  assert.match(runtime, /config\\.system = game\\.system\\.id/);
  assert.match(runtime, /arkflightContentReady/);
});

test("Event Manager 2.0 UI lists package resources and resumes active events", () => {
  assert.match(manager, /packageForEvent/);
  assert.match(manager, /primaryAction: active \? "resume" : "launch"/);
  assert.match(template, /data-em2-action="{{primaryAction}}"/);
  assert.match(template, /Sync Content/);
});

test("Foundry loads Event Manager 2.0 after Arkflight core and includes its stylesheet", () => {
  const core = manifest.esmodules.indexOf("src/foundry/arkflight.js");
  const eventManager = manifest.esmodules.indexOf("src/foundry/event-manager-2.js");
  assert.ok(core >= 0 && eventManager > core);
  assert.ok(manifest.styles.includes("styles/event-manager-2.css"));
});

test("GM entry points route into Event Manager 2.0 instead of hardcoding Glassback launch", () => {
  assert.match(arkflight, /openEventManager/);
  assert.doesNotMatch(arkflight, /try \{ await game\.arkflight\.openEvent\("glassback-cinderwake"\)/);
  assert.match(gmOperations, /open-event-manager/);
});
