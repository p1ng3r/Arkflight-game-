import test from "node:test";
import assert from "node:assert/strict";
import { BENCHMARK_SHIPS, SCENARIOS, runGauntlet, simulateBattle } from "../scripts/combat-gauntlet.mjs";

test("benchmark fixtures preserve canonical brigantine/frigate chassis values", () => {
  assert.equal(BENCHMARK_SHIPS.rumRunner.chassis, "brigantine");
  assert.equal(BENCHMARK_SHIPS.rumRunner.hullMax, 160);
  assert.equal(BENCHMARK_SHIPS.rumRunner.hardness, 4);
  assert.equal(BENCHMARK_SHIPS.rumRunner.apMax, 4);
  assert.equal(BENCHMARK_SHIPS.ironSpear.chassis, "frigate");
  assert.equal(BENCHMARK_SHIPS.ironSpear.hullMax, 190);
  assert.equal(BENCHMARK_SHIPS.ironSpear.hardness, 5);
  assert.equal(BENCHMARK_SHIPS.ironSpear.apMax, 4);
});

test("each gauntlet scenario is deterministic for a fixed seed", () => {
  for (const scenario of SCENARIOS) {
    const a = simulateBattle({ rumPolicy:"balanced", ironPolicy:"balanced", scenario, seed:12345 });
    const b = simulateBattle({ rumPolicy:"balanced", ironPolicy:"balanced", scenario, seed:12345 });
    assert.equal(a.winner, b.winner);
    assert.equal(a.rounds, b.rounds);
    assert.equal(a.rum.hull, b.rum.hull);
    assert.equal(a.iron.hull, b.iron.hull);
  }
});

test("gauntlet produces 3 scenarios x 3x3 policy matrix with bounded rates", () => {
  const report = runGauntlet({ runs:50, seed:42, maxRounds:40 });
  assert.equal(report.matchups.length, 27);
  assert.deepEqual(report.scenarios, ["broadside", "open-duel", "pursuit-objective"]);
  for (const row of report.matchups) {
    assert.equal(row.runs, 50);
    assert.equal(row.rumWins + row.ironWins + row.draws, 50);
    assert.ok(row.rumWinRate >= 0 && row.rumWinRate <= 1);
    assert.ok(row.rumWin95[0] <= row.rumWinRate && row.rumWin95[1] >= row.rumWinRate);
  }
});
