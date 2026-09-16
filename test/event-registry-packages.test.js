import test from "node:test";
import assert from "node:assert/strict";
import { ARKFLIGHT_EVENTS, arkflightEventOwner, registerArkflightEvent, unregisterArkflightEvent } from "../src/content/events/index.js";

test("Event Manager 2.0 can add and remove package events without replacing the registry object", () => {
  const registry = ARKFLIGHT_EVENTS;
  const event = Object.freeze({ id: "event-manager-package-test", title: "Package Test Event" });

  registerArkflightEvent(event, { owner: "package:test-suite" });
  assert.equal(ARKFLIGHT_EVENTS, registry);
  assert.equal(ARKFLIGHT_EVENTS[event.id], event);
  assert.equal(arkflightEventOwner(event.id), "package:test-suite");

  assert.equal(unregisterArkflightEvent(event.id, { owner: "package:wrong-owner" }), false);
  assert.equal(ARKFLIGHT_EVENTS[event.id], event);

  assert.equal(unregisterArkflightEvent(event.id, { owner: "package:test-suite" }), true);
  assert.equal(ARKFLIGHT_EVENTS[event.id], undefined);
});
