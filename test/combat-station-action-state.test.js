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

test("Station Bonus stays bounded at +1 / +2 / +3 and has a player-facing definition", () => {
  assert.equal(stationEffectProfile(1).bonus, 1);
  assert.equal(stationEffectProfile(9).bonus, 1);
  assert.equal(stationEffectProfile(10).bonus, 2);
  assert.equal(stationEffectProfile(19).bonus, 2);
  assert.equal(stationEffectProfile(20).bonus, 3);
  assert.match(STATION_BONUS_DEFINITION, /levels 1–9/);
  assert.match(STATION_BONUS_DEFINITION, /levels 10–19/);
  assert.match(STATION_BONUS_DEFINITION, /level 20/);
});

test("station action economy gives powerful actions meaningful secondary costs", () => {
  assert.deepEqual(stationActionEconomy(getCombatAction("captain-drive-the-crew"), 1), {
    ap: 0, rp: 0, morale: 20, supplies: 0, lifeveil: 0, strain: 2
  });
  assert.equal(stationActionEconomy(getCombatAction("engineer-emergency-repair"), 1).supplies, 2);
  assert.deepEqual(stationActionEconomy(getCombatAction("common-reload-weapon"), 1), {
    ap: 1, rp: 0, morale: 0, supplies: 0, lifeveil: 0, strain: 0
  });
  assert.deepEqual(stationActionEconomy(getCombatAction("battlewatch-reload-weapon"), 1), {
    ap: 0, rp: 0, morale: 20, supplies: 0, lifeveil: 0, strain: 1
  });
  assert.equal(stationActionEconomy(getCombatAction("battlewatch-ready-broadside"), 1).supplies, 1);
  assert.equal(stationActionEconomy(getCombatAction("veilwarden-reinforce-lifeveil"), 1).lifeveil, 5);
  assert.equal(stationActionEconomy(getCombatAction("veilwarden-focus-ward"), 1).lifeveil, 10);
  assert.equal(stationActionEconomy(getCombatAction("veilwarden-emergency-ward"), 1).lifeveil, 5);
  assert.equal(stationActionEconomy(getCombatAction("engineer-overcharge-arkengine"), 1).strain, 2);
  assert.equal(stationActionEconomy(getCombatAction("engineer-redistribute-power"), 1).strain, 1);
  assert.equal(stationActionStrainArea(getCombatAction("captain-drive-the-crew")), "morale");
  assert.equal(stationActionStrainArea(getCombatAction("engineer-overcharge-arkengine")), "arkengine");
  assert.equal(stationActionStrainArea(getCombatAction("navigator-hard-turn")), "rigging");
  assert.equal(stationActionStrainArea(getCombatAction("battlewatch-reload-weapon")), "morale");
});

test("Drive the Crew spends no AP up front and grants exactly one temporary AP", () => {
  for (const [level, strain] of [[1, 2], [15, 1], [20, 0]]) {
    const base = combatState(level);
    const action = getCombatAction("captain-drive-the-crew");
    const next = executeStationStateAction(base, action, { round: 1, shipLevel: level });

    assert.equal(next.economy.ap.value, base.economy.ap.value + 1, `level ${level} AP`);
    assert.equal(next.economy.ap.max, base.economy.ap.max + 1, `level ${level} temporary AP cap`);
    assert.equal(next.strain.value, base.strain.value + strain, `level ${level} strain`);
    assert.equal(stationActionAvailability(next, action, { round: 1, shipLevel: level }).reason, "once-per-round");

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

test("Overcharge Arkengine grants a full extra Helm block for one AP and two Strain", () => {
  const base = combatState(1);
  const next = executeStationStateAction(base, getCombatAction("engineer-overcharge-arkengine"), { round: 1, shipLevel: 1 });

  assert.equal(next.economy.ap.value, base.economy.ap.value - 1);
  assert.equal(next.mobility.movement.allowance, base.mobility.movement.allowance + base.mobility.speed);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + base.mobility.maneuverability);
  assert.equal(next.strain.value, base.strain.value + 2);
});

test("Redistribute Power propulsion adds one Strain for flexible power routing", () => {
  const base = combatState(10);
  const next = executeStationStateAction(base, getCombatAction("engineer-redistribute-power"), {
    round: 1,
    shipLevel: 10,
    selection: "propulsion"
  });

  assert.equal(next.mobility.movement.allowance, base.mobility.movement.allowance + 2);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + 1);
  assert.equal(next.strain.value, base.strain.value + 1);
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
  assert.equal(stationActionAvailability(next, action, { round: 1, shipLevel: 1 }).reason, "reaction-readied");

  const refreshed = beginStationActionTurn(next, 2);
  assert.equal(activeStationEffects(refreshed, { station: "captain" }).length, 0);
});


test("Work the Guns costs 0 AP, adds 1 Strain, and locks after one use in a round", () => {
  const base = combatState(1);
  const action = getCombatAction("battlewatch-reload-weapon");
  const next = executeStationStateAction(base, action, { round: 1, selection: "test-weapon", shipLevel: 1 });

  assert.equal(next.economy.ap.value, base.economy.ap.value);
  assert.equal(next.strain.value, base.strain.value + 1);
  assert.equal(stationActionAvailability(next, action, { round: 1, shipLevel: 1 }).reason, "once-per-round");

  const refreshed = beginStationActionTurn(next, 2);
  assert.equal(stationActionAvailability(refreshed, action, { round: 2, shipLevel: 1 }).ok, true);
});


test("Mythic movement abilities remain spent across later combat rounds", () => {
  const base = combatState(20);
  const burn = getCombatAction("navigator-impossible-burn");
  const turned = getCombatAction("navigator-turn-between-heartbeats");

  const burned = executeStationStateAction(base, burn, { round: 1, shipLevel: 20 });
  assert.equal(burned.economy.ap.value, base.economy.ap.value);
  assert.equal(burned.mobility.movement.allowance, base.mobility.movement.allowance + Math.ceil(base.mobility.speed * 0.5));
  assert.equal(burned.strain.value, base.strain.value + 2);
  assert.equal(stationActionAvailability(burned, burn, { round: 1, shipLevel: 20 }).reason, "once-per-battle");

  const refreshed = beginStationActionTurn(burned, 2);
  assert.equal(stationActionAvailability(refreshed, burn, { round: 2, shipLevel: 20 }).reason, "once-per-battle");

  const heartbeat = executeStationStateAction(refreshed, turned, { round: 2, shipLevel: 20 });
  assert.equal(heartbeat.mobility.maneuver.allowance, refreshed.mobility.maneuver.allowance + 2);
  assert.equal(stationActionAvailability(heartbeat, turned, { round: 2, shipLevel: 20 }).reason, "once-per-battle");
});
