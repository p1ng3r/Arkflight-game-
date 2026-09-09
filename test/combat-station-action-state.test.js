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
  stationActionAvailability
} from "../src/combat/index.js";

function rumRunner() {
  return createShip({
    hull: { chassisId: "brigantine", patternId: "standard" },
    arkengine: { chassisId: "tidewake-arkengine", patternId: "standard", modIds: [] },
    progression: { level: 1, xp: 0, talentIds: [], arkcraftUpgrades: {} }
  });
}

function combatState() {
  const ship = rumRunner();
  return createCombatantState(ship, {
    derived: deriveShip(ship, SHIP_CATALOGS),
    catalogs: SHIP_CATALOGS,
    rotation: 0
  });
}

test("Drive the Crew creates one net temporary AP and one Strain", () => {
  const base = combatState();
  const action = getCombatAction("captain-drive-the-crew");
  const next = executeStationStateAction(base, action, { round: 1 });

  assert.equal(next.economy.ap.value, base.economy.ap.value + 1);
  assert.equal(next.economy.ap.max, base.economy.ap.max + 1);
  assert.equal(next.strain.value, base.strain.value + 1);
  assert.equal(stationActionAvailability(next, action, { round: 1 }).reason, "once-per-round");

  const refreshed = beginStationActionTurn(next, 2);
  assert.equal(refreshed.economy.ap.max, base.economy.ap.max);
  assert.ok(refreshed.economy.ap.value <= refreshed.economy.ap.max);
});

test("Hard Turn buys two maneuver steps and adds Rigging strain pressure", () => {
  const base = combatState();
  const action = getCombatAction("navigator-hard-turn");
  const next = executeStationStateAction(base, action, { round: 1 });

  assert.equal(next.economy.ap.value, base.economy.ap.value - 1);
  assert.equal(next.mobility.maneuver.allowance, base.mobility.maneuver.allowance + 2);
  assert.equal(next.strain.value, base.strain.value + 1);
});

test("Vent Strain removes one combat Strain after paying AP", () => {
  const base = combatState();
  const hardTurn = executeStationStateAction(base, getCombatAction("navigator-hard-turn"), { round: 1 });
  const vented = executeStationStateAction(hardTurn, getCombatAction("engineer-vent-strain"), { round: 1 });

  assert.equal(vented.strain.value, base.strain.value);
  assert.equal(vented.economy.ap.value, base.economy.ap.value - 2);
});

test("station Reactions spend shared RP and remain readied until the next ship turn", () => {
  const base = combatState();
  const action = getCombatAction("captain-brace-for-impact");
  assert.ok(base.economy.rp.value >= 1);

  const next = executeStationStateAction(base, action, { round: 1 });
  assert.equal(next.economy.rp.value, base.economy.rp.value - 1);
  assert.equal(activeStationEffects(next, { station: "captain" }).some((effect) => effect.actionId === action.id), true);
  assert.equal(stationActionAvailability(next, action, { round: 1 }).reason, "reaction-readied");

  const refreshed = beginStationActionTurn(next, 2);
  assert.equal(activeStationEffects(refreshed, { station: "captain" }).length, 0);
});
