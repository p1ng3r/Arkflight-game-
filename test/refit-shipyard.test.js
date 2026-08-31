import test from "node:test";
import assert from "node:assert/strict";
import { createShip } from "../src/ship/ship-schema.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { grantComponent, grantSalvageParts, salvageParts, componentQuantity } from "../src/ship/refit-state.js";
import { createRefitDraft } from "../src/ship/refit-draft.js";
import { queueInstallDraft, completeRefitJob } from "../src/ship/refit-work-orders.js";
import { REFIT_METHODS } from "../src/ship/refit-rules.js";

test("shipyard install is guaranteed work with Parts, labor gold, and duration", () => {
  let ship = grantComponent(createShip(), "shipMod", "reinforced-structural-ribbing", 1);
  ship = grantSalvageParts(ship, 5);
  const draft = createRefitDraft({ assignments: [{ family: "shipMod", componentId: "reinforced-structural-ribbing", socketIndices: [0] }] });
  const queued = queueInstallDraft(ship, draft, SHIP_CATALOGS, {
    method: REFIT_METHODS.SHIPYARD,
    idFactory: () => "shipyard-install-1"
  });

  assert.equal(queued.ok, true);
  assert.equal(queued.jobs[0].method, REFIT_METHODS.SHIPYARD);
  assert.equal(queued.jobs[0].partsCost, 1);
  assert.equal(queued.jobs[0].durationHours, 4);
  assert.ok(queued.jobs[0].goldCost > 0);
  assert.equal(componentQuantity(queued.ship, "shipMod", "reinforced-structural-ribbing"), 0);
  assert.equal(salvageParts(queued.ship), 4);
  assert.deepEqual(queued.ship.shipMods, []);

  const completed = completeRefitJob(queued.ship, queued.jobs[0].id, SHIP_CATALOGS, {
    result: { outcome: "shipyard", laborGold: queued.jobs[0].goldCost, elapsedHours: queued.jobs[0].durationHours }
  });
  assert.equal(completed.ok, true);
  assert.deepEqual(completed.ship.shipMods, ["reinforced-structural-ribbing"]);
  assert.equal(completed.job.result.outcome, "shipyard");
});
