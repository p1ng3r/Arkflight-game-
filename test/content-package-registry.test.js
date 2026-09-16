import test from "node:test";
import assert from "node:assert/strict";
import { ContentPackageRegistry, defineContentPackage } from "../src/content/packages/content-package-registry.js";

const EVENT = Object.freeze({ id: "test-event", title: "Test Event" });

function packageDefinition(id = "test-package") {
  return {
    id,
    title: "Test Package",
    content: { events: [EVENT] },
    adventure: { entryPoint: EVENT.id, stages: [{ id: "opening", label: "Opening", eventId: EVENT.id }] }
  };
}

test("content package normalizes event and adventure metadata", () => {
  const pkg = defineContentPackage(packageDefinition());
  assert.equal(pkg.id, "test-package");
  assert.equal(pkg.adventure.entryPoint, "test-event");
  assert.equal(pkg.content.events[0].event, EVENT);
  assert.equal(pkg.adventure.stages[0].id, "opening");
  assert.ok(Object.isFrozen(pkg));
});

test("registry registers and unregisters package-owned events", () => {
  const calls = [];
  const registry = new ContentPackageRegistry({
    registerEvent: (event, options) => calls.push(["register", event.id, options.owner]),
    unregisterEvent: (eventId, options) => calls.push(["unregister", eventId, options.owner])
  });
  registry.register(packageDefinition(), { source: "test-module" });
  assert.equal(registry.packageForEvent("test-event")?.id, "test-package");
  assert.equal(registry.source("test-package"), "test-module");
  assert.deepEqual(calls[0], ["register", "test-event", "package:test-package"]);
  assert.equal(registry.unregister("test-package"), true);
  assert.deepEqual(calls[1], ["unregister", "test-event", "package:test-package"]);
});

test("registry rejects event ownership collisions", () => {
  const registry = new ContentPackageRegistry();
  registry.register(packageDefinition("first-package"));
  assert.throws(() => registry.register(packageDefinition("second-package")), /already owned/);
});
