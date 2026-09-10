import test from "node:test";
import assert from "node:assert/strict";
import { BENCHMARK_SHIPS, runGauntlet, simulateBattle } from "../scripts/combat-gauntlet.mjs";

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

test("single battle is deterministic for a fixed seed", () => {
  const a = simulateBattle({ rumPolicy:"balanced", ironPolicy:"balanced", seed:12345 });
  const b = simulateBattle({ rumPolicy:"balanced", ironPolicy:"balanced", seed:12345 });
  assert.equal(a.winner, b.winner);
  assert.equal(a.rounds, b.rounds);
  assert.equal(a.rum.hull, b.rum.hull);
  assert.equal(a.iron.hull, b.iron.hull);
  assert.deepEqual(a.rum.stats, b.rum.stats);
});

test("gauntlet produces the full 3x3 policy matrix and bounded rates", () => {
  const report = runGauntlet({ runs:100, seed:42, maxRounds:40 });
  assert.equal(report.matchups.length, 9);
  for (const row of report.matchups) {
    assert.equal(row.runs, 100);
    assert.equal(row.rumWins + row.ironWins + row.draws, 100);
    assert.ok(row.rumWinRate >= 0 && row.rumWinRate <= 1);
    assert.ok(row.rumWin95[0] <= row.rumWinRate && row.rumWin95[1] >= row.rumWinRate);
  }
});
