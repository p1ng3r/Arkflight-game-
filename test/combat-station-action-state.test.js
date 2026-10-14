import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import {
  STATION_BONUS_DEFINITION,
  activeStationEffects,
  beginStationActionTurn,
  createCombatantState,
  executeStationStateAction,
  getCombatAction,
  stationActionAvailability,
  stationActionEconomy,
  stationActionStrainArea,
  stationEffectCharges,
  stationEffectProfile,
  stationMitigationValue
} from "../src/combat/index.js";

function rumRunner(level = 1) {
  return createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] },
    progression: { level, xp: 0, talentIds: [], arkcraftUpgrades: {} }
  });
}

function combatState(level = 1) {
  const ship = rumRunner(level);
  return createCombatantState(ship, {
    derived: deriveShip(ship, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS,
    rotation: 0
  });
}

test("Hard Turn adds Maneuverability plus Station Bonus and one Strain", () => {
  const base = combatState(1);
  const action = getCombatAction("navigator-hard-turn");
  const next = executeStationStateAction(base, action, { round: 1, shipLevel: 1 });
  const expected = base.mobility.maneuverability + 1;

  assert.equal(next.economy.ap.value, base.economy.ap.value - 1);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + expected);
  assert.equal(next.strain.value, base.strain.value + 1);
});

test("retired manual Reload is unavailable through legacy state APIs", () => {
  assert.equal(stationActionAvailability(combatState(), getCombatAction("common-reload-weapon"), { round: 1 }).ok, false);
});
