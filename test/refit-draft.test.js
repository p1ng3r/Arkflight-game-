import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { acquireIntactComponent } from "../src/ship/refit-economy.js";
import {
  createRefitDraft,
  stageRefitComponent,
  removeDraftAssignment,
  resetRefitDraft,
  proposedShipFromDraft,
  previewRefitDraft,
  refitDraftInstallParts,
  availableDraftQuantity
} from "../src/ship/refit-draft.js";

function vessel() {
  return createShip({
    hull: { chassisId: "cutter", patternId: "standard" },
    arkengine: { chassisId: "lanterncoil-arkengine", patternId: "standard", modIds: [] }
  });
}

test("staging uses physical inventory but does not consume or install it", () => {
  const ship = acquireIntactComponent(vessel(), "shipMod", "reinforced-structural-ribbing", 1).ship;
  const original = structuredClone(ship);
  const draft = createRefitDraft({ actorUuid: "Actor.test" });
  const result = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "shipMod",
    componentId: "reinforced-structural-ribbing",
    socketIndices: [0]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(ship, original);
  assert.deepEqual(ship.shipMods, []);
  assert.equal(ship.inventory.shipMods["reinforced-structural-ribbing"], 1);
  assert.equal(result.draft.assignments.length, 1);
  assert.equal(availableDraftQuantity(ship, result.draft, "shipMod", "reinforced-structural-ribbing"), 0);
});

test("a draft cannot stage more copies than the ship physically owns", () => {
  const ship = acquireIntactComponent(vessel(), "arkengineMod", "pressure-lattice-tuning", 1).ship;
  let draft = createRefitDraft();
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "arkengineMod",
    componentId: "pressure-lattice-tuning",
    socketIndices: [0]
  }).draft;

  const second = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "arkengineMod",
    componentId: "pressure-lattice-tuning",
    socketIndices: [1]
  });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "component-not-available");
});

test("draft sockets cannot be double-booked", () => {
  let ship = acquireIntactComponent(vessel(), "shipMod", "expanded-cargo-lattice", 1).ship;
  ship = acquireIntactComponent(ship, "shipMod", "reinforced-structural-ribbing", 1).ship;
  let draft = createRefitDraft();
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "shipMod",
    componentId: "expanded-cargo-lattice",
    socketIndices: [2]
  }).draft;

  const collision = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "shipMod",
    componentId: "reinforced-structural-ribbing",
    socketIndices: [2]
  });
  assert.equal(collision.ok, false);
  assert.equal(collision.reason, "draft-socket-occupied");
});

test("proposed ship composes staged Ship and Arkengine mods into canonical installed paths", () => {
  let ship = acquireIntactComponent(vessel(), "shipMod", "expanded-cargo-lattice", 1).ship;
  ship = acquireIntactComponent(ship, "arkengineMod", "pressure-lattice-tuning", 1).ship;
  let draft = createRefitDraft();
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, { family: "shipMod", componentId: "expanded-cargo-lattice", socketIndices: [0] }).draft;
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, { family: "arkengineMod", componentId: "pressure-lattice-tuning", socketIndices: [1] }).draft;

  const proposed = proposedShipFromDraft(ship, draft);
  assert.deepEqual(ship.shipMods, []);
  assert.deepEqual(ship.arkengine.modIds, []);
  assert.deepEqual(proposed.shipMods, ["expanded-cargo-lattice"]);
  assert.deepEqual(proposed.arkengine.modIds, ["pressure-lattice-tuning"]);
});

test("mechanical preview reports staged stat deltas without mutating authoritative ship", () => {
  const ship = acquireIntactComponent(vessel(), "shipMod", "reinforced-structural-ribbing", 1).ship;
  const staged = stageRefitComponent(ship, createRefitDraft(), SHIP_CATALOGS, {
    family: "shipMod",
    componentId: "reinforced-structural-ribbing",
    socketIndices: [0]
  }).draft;

  const preview = previewRefitDraft(ship, staged, SHIP_CATALOGS);
  assert.equal(preview.deltas.hullIntegrity.delta, 20);
  assert.equal(preview.deltas.maneuverability.delta, -1);
  assert.deepEqual(ship.shipMods, []);
});

test("draft projected install cost sums canonical install Parts", () => {
  let ship = acquireIntactComponent(vessel(), "shipMod", "expanded-cargo-lattice", 1).ship;
  ship = acquireIntactComponent(ship, "arkengineMod", "pressure-lattice-tuning", 1).ship;
  let draft = createRefitDraft();
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, { family: "shipMod", componentId: "expanded-cargo-lattice", socketIndices: [0] }).draft;
  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, { family: "arkengineMod", componentId: "pressure-lattice-tuning", socketIndices: [1] }).draft;
  assert.equal(refitDraftInstallParts(draft, SHIP_CATALOGS), 2);
});

test("removing and resetting staged assignments never change ship state", () => {
  const ship = acquireIntactComponent(vessel(), "shipMod", "expanded-cargo-lattice", 1).ship;
  let draft = stageRefitComponent(ship, createRefitDraft(), SHIP_CATALOGS, {
    family: "shipMod", componentId: "expanded-cargo-lattice", socketIndices: [0]
  }).draft;
  draft = removeDraftAssignment(draft, "shipMod", 0);
  assert.equal(draft.assignments.length, 0);

  draft = stageRefitComponent(ship, draft, SHIP_CATALOGS, {
    family: "shipMod", componentId: "expanded-cargo-lattice", socketIndices: [0]
  }).draft;
  draft = resetRefitDraft(draft);
  assert.equal(draft.assignments.length, 0);
  assert.deepEqual(ship.shipMods, []);
  assert.equal(ship.inventory.shipMods["expanded-cargo-lattice"], 1);
});
