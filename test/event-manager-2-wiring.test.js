import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync(new URL("../src/foundry/event-manager-2.js", import.meta.url), "utf8");
const manager = fs.readFileSync(new URL("../src/ui/event-manager-2-ui.js", import.meta.url), "utf8");
const template = fs.readFileSync(new URL("../templates/event-manager-2.hbs", import.meta.url), "utf8");

test("Event Manager 2.0 exposes package lifecycle and launch API", () => {
  assert.match(runtime, /registerPackage/);
  assert.match(runtime, /sync,/);
  assert.match(runtime, /launch,/);
  assert.match(runtime, /completeStage/);
  assert.match(runtime, /arkflightContentReady/);
});

test("Event Manager 2.0 UI lists package resources and resumes active events", () => {
  assert.match(manager, /packageForEvent/);
  assert.match(manager, /primaryAction: active \? "resume" : "launch"/);
  assert.match(template, /data-em2-action="\{\{primaryAction\}\}"/);
  assert.match(template, /Sync Content/);
});
