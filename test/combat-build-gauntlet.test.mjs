import test from "node:test";
import assert from "node:assert/strict";
import { BUILD_PAIRINGS, runGauntlet, runMatchup, simulateBattle } from "../scripts/combat-build-gauntlet.mjs";

test("build-aware battle is deterministic for fixed build, policy, scenario, and seed", () => {
  const options = {
    rumBuild: "rum-balanced-l5",
    ironBuild: "iron-stock-l5",
    rumPolicy: "balanced",
    ironPolicy: "balanced",
    scenario: "open-duel",
    seed: 123456
  };
  const a = simulateBattle(options);
  const b = simulateBattle(options);
  assert.equal(a.winner, b.winner);
  assert.equal(a.rounds, b.rounds);
  assert.equal(a.rum.hull, b.rum.hull);
  assert.equal(a.iron.hull, b.iron.hull);
  assert.deepEqual(a.rum.areas, b.rum.areas);
  assert.deepEqual(a.iron.areas, b.iron.areas);
});

test("single build-aware matchup returns bounded rates", () => {
  const row = runMatchup({
    rumBuild: "rum-balanced-l5",
    ironBuild: "iron-stock-l5",
    scenario: "broadside",
    rumPolicy: "balanced",
    ironPolicy: "balanced",
    runs: 20,
    seed: 42
  });
  assert.equal(row.rumWins + row.ironWins + row.draws, 20);
  assert.ok(row.rumWinRate >= 0 && row.rumWinRate <= 1);
  assert.ok(row.rumWin95[0] <= row.rumWinRate);
  assert.ok(row.rumWin95[1] >= row.rumWinRate);
});

test("build-aware gauntlet uses all three scenarios and real derived profiles", () => {
  const report = runGauntlet({
    rumBuild: "rum-balanced-l5",
    ironBuild: "iron-stock-l5",
    runs: 5,
    seed: 7
  });
  assert.equal(report.matchups.length, 27);
  assert.deepEqual(report.scenarios, ["broadside", "open-duel", "pursuit-objective"]);
  assert.equal(report.profiles.rum.chassis, "brigantine");
  assert.equal(report.profiles.iron.chassis, "frigate");
  assert.ok(report.profiles.rum.ac >= 22);
  assert.ok(report.profiles.iron.ac >= 23);
  assert.ok(Array.isArray(report.audits.rum.weaknesses));
});

test("matrix pairings compare equal-level builds", () => {
  for (const pairing of BUILD_PAIRINGS) {
    const rumLevel = Number(pairing.rumBuild.match(/l(\d+)$/)?.[1]);
    const ironLevel = Number(pairing.ironBuild.match(/l(\d+)$/)?.[1]);
    assert.equal(rumLevel, ironLevel, pairing.id);
  }
});
