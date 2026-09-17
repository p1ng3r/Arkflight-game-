import test from "node:test";
import assert from "node:assert/strict";
import { rewardPackage, rewardRows } from "../src/event/reward-engine.js";

test("reward packages carry PF2e XP and Ship XP", () => {
  const rewards = rewardPackage({ pf2eXp: 160, shipXp: 300, aetherScrap: 4 });
  assert.equal(rewards.pf2eXp, 160);
  assert.equal(rewards.shipXp, 300);
  const rows = rewardRows(rewards);
  assert.ok(rows.some((row) => row.type === "pf2e-xp" && row.label.includes("160")));
  assert.ok(rows.some((row) => row.type === "ship-xp" && row.label.includes("300")));
});
