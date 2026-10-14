import test from "node:test";
import assert from "node:assert/strict";
import { COMBAT_ACTIONS, COMBAT_STATIONS, getCoreCombatActionDefinitionsForStation } from "../src/combat/index.js";
import { SHIP_ABILITIES } from "../src/content/station-abilities.js";

test("each station has two Regulars, one Surge and one Signature", () => {
  for (const station of COMBAT_STATIONS) {
    const entries = getCoreCombatActionDefinitionsForStation(station);
    assert.equal(entries.length, 4);
    assert.deepEqual(entries.map(a => a.tier), ["regular", "regular", "surge", "signature"]);
    assert.ok(entries.every(a => a.cost.ap === 1 && a.cost.rp === 0));
  }
});

test("shared reactions are separate from station menus and consume RP", () => {
  const reactions = Object.values(SHIP_ABILITIES).filter(a => a.station === "reactions");
  assert.equal(reactions.length, 5);
  assert.ok(reactions.every(a => a.cost.rp === 1 && a.cost.ap === 0));
});

test("Fire, Hard Turn and engagement actions are shared basic controls for one AP", () => {
  for (const id of ["battlewatch-fire-weapon", "navigator-hard-turn", "navigator-ram-ship", "navigator-grapple-ship", "navigator-break-grapple", "captain-board-ship"]) {
    assert.equal(COMBAT_ACTIONS[id].station, "common");
    assert.equal(COMBAT_ACTIONS[id].cost.ap, 1);
    assert.equal(COMBAT_ACTIONS[id].cost.rp, 0);
  }
  assert.equal(COMBAT_ACTIONS["navigator-ram-ship"].rules.requiresMovementThisTurn, true);
  assert.equal(COMBAT_ACTIONS["captain-board-ship"].rules.requiresMoored, true);
});

test("manual Reload and replaced station abilities remain retired compatibility IDs", () => {
  for (const id of ["common-reload-weapon", "navigator-move", "navigator-maneuver", "veilwarden-focus-ward", "veilwarden-purge-interference", "navigator-impossible-burn"]) assert.equal(COMBAT_ACTIONS[id].rules.retired, true);
  assert.equal(COMBAT_ACTIONS["battlewatch-reload-weapon"].tier, "surge");
  assert.equal(COMBAT_ACTIONS["engineer-emergency-repair"].station, "common");
  assert.equal(COMBAT_ACTIONS["engineer-emergency-repair"].tier, "signature");
});
