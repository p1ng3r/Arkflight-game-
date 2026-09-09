import test from "node:test";
import assert from "node:assert/strict";

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import {
  activeStationEffects,
  beginStationActionTurn,
  createCombatantState,
  executeStationStateAction,
  getCombatAction,
  stationActionAvailability,
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

test("Station Bonus stays bounded at +1 / +2 / +3", () => {
  assert.equal(stationEffectProfile(1).bonus, 1);
  assert.equal(stationEffectProfile(9).bonus, 1);
  assert.equal(stationEffectProfile(10).bonus, 2);
  assert.equal(stationEffectProfile(19).bonus, 2);
  assert.equal(stationEffectProfile(20).bonus, 3);
});

test("Drive the Crew trades Strain for exactly one net temporary AP", () => {
  for (const [level, strain] of [[1, 2], [15, 1], [20, 0]]) {
    const base = combatState(level);
    const action = getCombatAction("captain-drive-the-crew");
    const next = executeStationStateAction(base, action, { round: 1, shipLevel: level });

    assert.equal(next.economy.ap.value, base.economy.ap.value + 1, `level ${level} net AP`);
    assert.equal(next.economy.ap.max, base.economy.ap.max + 1, `level ${level} temporary AP cap`);
    assert.equal(next.strain.value, base.strain.value + strain, `level ${level} strain`);
    assert.equal(stationActionAvailability(next, action, { round: 1 }).reason, "once-per-round");

    const refreshed = beginStationActionTurn(next, 2);
    assert.equal(refreshed.economy.ap.max, base.economy.ap.max);
    assert.ok(refreshed.economy.ap.value <= refreshed.economy.ap.max);
  }
});

test("Hard Turn adds Maneuverability plus Station Bonus and one Strain", () => {
  const base = combatState(1);
  const action = getCombatAction("navigator-hard-turn");
  const next = executeStationStateAction(base, action, { round: 1, shipLevel: 1 });
  const expected = base.mobility.maneuverability + 1;

  assert.equal(next.economy.ap.value, base.economy.ap.value - 1);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + expected);
  assert.equal(next.strain.value, base.strain.value + 1);
});

test("Vent Strain removes 1 + Station Bonus after paying AP", () => {
  const base = combatState(10);
  const driven = executeStationStateAction(base, getCombatAction("captain-drive-the-crew"), { round: 1, shipLevel: 10 });
  assert.equal(driven.strain.value, base.strain.value + 2);

  const vented = executeStationStateAction(driven, getCombatAction("engineer-vent-strain"), { round: 1, shipLevel: 10 });
  assert.equal(vented.strain.value, base.strain.value);
  assert.equal(vented.economy.ap.value, driven.economy.ap.value - 1);
});

test("Overcharge Arkengine grants a full extra Helm block for one AP and one Strain", () => {
  const base = combatState(1);
  const next = executeStationStateAction(base, getCombatAction("engineer-overcharge-arkengine"), { round: 1, shipLevel: 1 });

  assert.equal(next.economy.ap.value, base.economy.ap.value - 1);
  assert.equal(next.mobility.movement.allowance, base.mobility.movement.allowance + base.mobility.speed);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + base.mobility.maneuverability);
  assert.equal(next.strain.value, base.strain.value + 1);
});

test("Redistribute Power propulsion is a smaller no-Strain positioning boost", () => {
  const base = combatState(10);
  const next = executeStationStateAction(base, getCombatAction("engineer-redistribute-power"), {
    round: 1,
    shipLevel: 10,
    selection: "propulsion"
  });

  assert.equal(next.mobility.movement.allowance, base.mobility.movement.allowance + 2);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + 1);
  assert.equal(next.strain.value, base.strain.value);
  assert.equal(activeStationEffects(next, { station: "engineer" }).length, 0);
});

test("level 5 adds charges instead of another numeric modifier tier", () => {
  for (const id of [
    "captain-coordinate-assault",
    "engineer-redistribute-power",
    "veilwarden-reinforce-lifeveil",
    "veilwarden-focus-ward"
  ]) {
    assert.equal(stationEffectCharges(id, 1), 1, `${id} level 1`);
    assert.equal(stationEffectCharges(id, 5), 2, `${id} level 5`);
  }
});

test("focused ward is stronger than broad ward while emergency ward remains strongest", () => {
  assert.equal(stationMitigationValue("ward", 1), 2);
  assert.equal(stationMitigationValue("focus-ward", 1), 3);
  assert.equal(stationMitigationValue("emergency-ward", 1), 4);
  assert.equal(stationMitigationValue("brace", 1), 3);

  assert.equal(stationMitigationValue("ward", 10), 4);
  assert.equal(stationMitigationValue("focus-ward", 10), 6);
  assert.equal(stationMitigationValue("emergency-ward", 10), 8);
});

test("station Reactions spend shared RP and remain active until consumed or next ship turn", () => {
  const base = combatState();
  const action = getCombatAction("captain-brace-for-impact");
  assert.ok(base.economy.rp.value >= 1);

  const next = executeStationStateAction(base, action, { round: 1, shipLevel: 1 });
  assert.equal(next.economy.rp.value, base.economy.rp.value - 1);
  assert.equal(activeStationEffects(next, { station: "captain" }).some((effect) => effect.actionId === action.id), true);
  assert.equal(stationActionAvailability(next, action, { round: 1 }).reason, "reaction-readied");

  const refreshed = beginStationActionTurn(next, 2);
  assert.equal(activeStationEffects(refreshed, { station: "captain" }).length, 0);
});
