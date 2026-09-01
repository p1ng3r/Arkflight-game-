import test from "node:test";
import assert from "node:assert/strict";

import {
  canUseStationAction,
  crewOperatingCount,
  crewStaffingPenalty,
  stationAssignmentState,
  totalPersonsAboard
} from "../src/ship/crew-rules.js";

test("under minimum crew applies -1 circumstance penalty per missing operator", () => {
  assert.deepEqual(
    crewStaffingPenalty({ operatingCrew: 5, minimum: 8, totalAboard: 5, maximum: 12 }),
    {
      operatingCrew: 5,
      totalAboard: 5,
      minimum: 8,
      maximum: 12,
      underMinimumBy: 3,
      overMaximumBy: 0,
      circumstancePenalty: -3,
      operatingNormally: false,
      overcrowded: false
    }
  );
});

test("meeting minimum removes under-crewed penalty", () => {
  const result = crewStaffingPenalty({ operatingCrew: 8, minimum: 8, totalAboard: 8, maximum: 12 });
  assert.equal(result.circumstancePenalty, 0);
  assert.equal(result.operatingNormally, true);
});

test("over maximum occupancy applies -1 circumstance penalty per person over maximum", () => {
  const result = crewStaffingPenalty({ operatingCrew: 8, minimum: 6, totalAboard: 15, maximum: 12 });
  assert.equal(result.overMaximumBy, 3);
  assert.equal(result.circumstancePenalty, -3);
  assert.equal(result.overcrowded, true);
});

test("under-minimum and overcrowding penalties stack when both apply", () => {
  const result = crewStaffingPenalty({ operatingCrew: 4, minimum: 6, totalAboard: 9, maximum: 8 });
  assert.equal(result.underMinimumBy, 2);
  assert.equal(result.overMaximumBy, 1);
  assert.equal(result.circumstancePenalty, -3);
});

test("officers crew hands and specialists operate ship while passengers only add occupancy", () => {
  assert.equal(crewOperatingCount({ officers: 5, crewHands: 6, specialists: 2, passengers: 9 }), 13);
  assert.equal(totalPersonsAboard({ officers: 5, crewHands: 6, specialists: 2, passengers: 9 }), 22);
});

test("one primary assignment per canonical station determines ordinary action access", () => {
  const stations = {
    captain: "Actor.captain",
    engineer: "Actor.engineer",
    navigator: null,
    battlewatch: "Actor.gunner",
    veilwarden: null
  };
  const state = stationAssignmentState(stations);
  assert.equal(state.captain.staffed, true);
  assert.equal(state.navigator.staffed, false);
  assert.equal(state.navigator.normalActionsAvailable, false);
  assert.equal(canUseStationAction(stations, "navigator"), false);
  assert.equal(canUseStationAction(stations, "navigator", { substituteAuthorized: true }), true);
  assert.equal(canUseStationAction(stations, "captain"), true);
});
