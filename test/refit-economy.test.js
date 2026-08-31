import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import {
  REFIT_COMPONENT_FAMILIES,
  componentQuantity,
  grantSalvageParts,
  knowsBlueprint,
  salvageParts
} from "../src/ship/refit-state.js";
import {
  acquireIntactComponent,
  availableRefitInventory,
  buildComponentFromBlueprint,
  buildComponentQuote,
  knownBlueprintEntries,
  learnBlueprint
} from "../src/ship/refit-economy.js";

const SHIP = REFIT_COMPONENT_FAMILIES.SHIP_MOD;
const ENGINE = REFIT_COMPONENT_FAMILIES.ARKENGINE_MOD;

test("blueprint construction requires knowledge before Salvage Parts are spent", () => {
  const ship = grantSalvageParts(createShip(), 10);
  const quote = buildComponentQuote(ship, ENGINE, "stormwake-injector");
  assert.equal(quote.ok, false);
  assert.equal(quote.reason, "blueprint-required");

  const result = buildComponentFromBlueprint(ship, ENGINE, "stormwake-injector");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "blueprint-required");
  assert.equal(salvageParts(result.ship), 10);
});

test("learning a blueprint is idempotent and exposes it in the known blueprint list", () => {
  const ship = createShip();
  const first = learnBlueprint(ship, ENGINE, "stormwake-injector");
  assert.equal(first.ok, true);
  assert.equal(first.learned, true);
  assert.equal(knowsBlueprint(first.ship, ENGINE, "stormwake-injector"), true);

  const second = learnBlueprint(first.ship, ENGINE, "stormwake-injector");
  assert.equal(second.ok, true);
  assert.equal(second.learned, false);
  assert.deepEqual(knownBlueprintEntries(second.ship, ENGINE).map((entry) => entry.id), ["stormwake-injector"]);
});

test("build quote uses canonical refit metadata and reports affordability", () => {
  let ship = createShip();
  ship = learnBlueprint(ship, ENGINE, "stormwake-injector").ship;
  ship = grantSalvageParts(ship, 5);

  const quote = buildComponentQuote(ship, ENGINE, "stormwake-injector");
  assert.equal(quote.ok, true);
  assert.equal(quote.partsCost, 6);
  assert.equal(quote.availableParts, 5);
  assert.equal(quote.canAfford, false);
  assert.equal(quote.timeHours, 16);
  assert.equal(quote.craftingDC, 18);
  assert.equal(quote.shipyardGold, 25);
});

test("successful blueprint construction spends Salvage Parts and creates a physical fitting", () => {
  let ship = createShip();
  ship = learnBlueprint(ship, ENGINE, "stormwake-injector").ship;
  ship = grantSalvageParts(ship, 10);

  const result = buildComponentFromBlueprint(ship, ENGINE, "stormwake-injector");
  assert.equal(result.ok, true);
  assert.equal(result.partsSpent, 6);
  assert.equal(salvageParts(result.ship), 4);
  assert.equal(componentQuantity(result.ship, ENGINE, "stormwake-injector"), 1);
  assert.deepEqual(result.ship.arkengine.modIds, []);
});

test("insufficient Salvage Parts rejects construction atomically", () => {
  let ship = createShip();
  ship = learnBlueprint(ship, SHIP, "reinforced-structural-ribbing").ship;
  ship = grantSalvageParts(ship, 3);

  const result = buildComponentFromBlueprint(ship, SHIP, "reinforced-structural-ribbing");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient-salvage-parts");
  assert.equal(result.required, 4);
  assert.equal(result.available, 3);
  assert.equal(salvageParts(result.ship), 3);
  assert.equal(componentQuantity(result.ship, SHIP, "reinforced-structural-ribbing"), 0);
});

test("intact acquired fittings bypass blueprint construction and do not spend Salvage Parts", () => {
  let ship = grantSalvageParts(createShip(), 2);
  const result = acquireIntactComponent(ship, SHIP, "reinforced-ram-prow", 2);
  assert.equal(result.ok, true);
  assert.equal(knowsBlueprint(result.ship, SHIP, "reinforced-ram-prow"), false);
  assert.equal(componentQuantity(result.ship, SHIP, "reinforced-ram-prow"), 2);
  assert.equal(salvageParts(result.ship), 2);
});

test("available refit inventory only lists physical components currently owned", () => {
  let ship = createShip();
  ship = acquireIntactComponent(ship, SHIP, "expanded-cargo-lattice", 2).ship;
  ship = acquireIntactComponent(ship, ENGINE, "pressure-lattice-tuning", 1).ship;
  ship = learnBlueprint(ship, ENGINE, "veil-projector-focusing").ship;

  const inventory = availableRefitInventory(ship);
  assert.deepEqual(inventory.shipMods.map((entry) => [entry.id, entry.quantity]), [["expanded-cargo-lattice", 2]]);
  assert.deepEqual(inventory.arkengineMods.map((entry) => [entry.id, entry.quantity]), [["pressure-lattice-tuning", 1]]);
  assert.equal(inventory.arkengineMods.some((entry) => entry.id === "veil-projector-focusing"), false);
});

test("unknown blueprint and intact component ids are rejected", () => {
  const ship = createShip();
  assert.equal(learnBlueprint(ship, ENGINE, "not-a-real-mod").reason, "unknown-component");
  assert.equal(acquireIntactComponent(ship, SHIP, "not-a-real-mod").reason, "unknown-component");
});
