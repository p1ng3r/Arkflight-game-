import test from "node:test";
import assert from "node:assert/strict";
import { createShip, normalizeShip, SHIP_SCHEMA_VERSION } from "../src/ship/ship-schema.js";
import {
  REFIT_COMPONENT_FAMILIES,
  salvageParts,
  grantSalvageParts,
  spendSalvageParts,
  unlockBlueprint,
  knowsBlueprint,
  componentQuantity,
  grantComponent,
  consumeComponent
} from "../src/ship/refit-state.js";
import {
  SHIP_MOD_SLOT_CLASSES,
  ARKENGINE_MOD_SLOT_CLASSES,
  defaultRefitCosts,
  refitSpec,
  createRefitJob,
  REFIT_JOB_TYPES,
  REFIT_METHODS
} from "../src/ship/refit-rules.js";

test("schema v5 creates Salvage Parts, blueprint, inventory, and refit state", () => {
  const ship = createShip();
  assert.equal(ship.schemaVersion, SHIP_SCHEMA_VERSION);
  assert.deepEqual(ship.resources.salvageParts, { value: 0 });
  assert.deepEqual(ship.blueprints, { shipModIds: [], arkengineModIds: [] });
  assert.deepEqual(ship.inventory, { shipMods: {}, arkengineMods: {} });
  assert.deepEqual(ship.refit, { workOrders: [] });
});

test("older ships migrate into the refit economy without changing installed mods", () => {
  const migrated = normalizeShip({
    schemaVersion: 4,
    shipMods: ["reinforced-structural-ribbing"],
    arkengine: { chassisId: "test", patternId: "standard", modIds: ["pressure-lattice-tuning"] },
    resources: { supplies: { value: 4, max: 10 } }
  });
  assert.equal(migrated.schemaVersion, SHIP_SCHEMA_VERSION);
  assert.deepEqual(migrated.shipMods, ["reinforced-structural-ribbing"]);
  assert.deepEqual(migrated.arkengine.modIds, ["pressure-lattice-tuning"]);
  assert.equal(migrated.resources.salvageParts.value, 0);
  assert.deepEqual(migrated.blueprints.shipModIds, []);
  assert.deepEqual(migrated.inventory.arkengineMods, {});
});

test("Salvage Parts grant and spending are non-negative and atomic", () => {
  const ship = grantSalvageParts(createShip(), 9);
  assert.equal(salvageParts(ship), 9);
  const spent = spendSalvageParts(ship, 4);
  assert.equal(spent.ok, true);
  assert.equal(salvageParts(spent.ship), 5);
  const rejected = spendSalvageParts(spent.ship, 6);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "insufficient-salvage-parts");
  assert.equal(salvageParts(rejected.ship), 5);
});

test("blueprints are knowledge while physical components are counted inventory", () => {
  let ship = createShip();
  ship = unlockBlueprint(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing");
  assert.equal(knowsBlueprint(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing"), true);
  assert.equal(componentQuantity(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing"), 0);
  ship = grantComponent(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing", 2);
  assert.equal(componentQuantity(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing"), 2);
  const consumed = consumeComponent(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing", 1);
  assert.equal(consumed.ok, true);
  assert.equal(componentQuantity(consumed.ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, "reinforced-structural-ribbing"), 1);
});

test("refit rules expose canonical typed socket families", () => {
  assert.deepEqual(SHIP_MOD_SLOT_CLASSES, ["weapon", "structural", "rigging", "lifeveil", "support", "utility"]);
  assert.deepEqual(ARKENGINE_MOD_SLOT_CLASSES, ["power", "stability", "lifeveil", "utility"]);
});

test("default refit costs and work orders normalize stable numeric fields", () => {
  const costs = defaultRefitCosts(2, 1);
  const spec = refitSpec({ family: "shipMod", slotClass: "structural", tier: 2, slotCost: 1, ...costs });
  assert.equal(spec.build.partsCost > spec.install.partsCost, true);
  const job = createRefitJob({
    id: "job-1",
    type: REFIT_JOB_TYPES.INSTALL,
    method: REFIT_METHODS.CREW,
    componentFamily: "shipMod",
    componentId: "reinforced-structural-ribbing",
    craftingDC: spec.install.dc,
    partsCost: spec.install.partsCost,
    durationHours: spec.install.timeHours
  });
  assert.equal(job.status, "planned");
  assert.equal(job.remainingHours, job.durationHours);
});
