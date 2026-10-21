import test from "node:test";
import assert from "node:assert/strict";
import { buildCardCombatTestFleet } from "../src/content/card-combat-test-ships.js";
import { deriveShip } from "../src/ship/derive-ship.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { weaponDamageProfile } from "../src/combat/weapon-combat.js";
import { CARD_SKILLS, createPlaytestSession } from "../src/cards/card-playtest-session.js";
import { equipDemoShip, initializeDemo, nextDemoStep, runDemoStep, assertDemoStartAllowed } from "../src/cards/guided-combat-demo.js";

const adapters = { user: { id: "gm", isGM: true }, rank: () => 1, ownsOperator: () => false, isEligibleOperator: () => true };
export function fixture() {
  const entries = buildCardCombatTestFleet({ rng: () => .5 }).map(spec => {
    const ship = equipDemoShip(spec.ship, spec.id);
    ship.crew.stations = Object.fromEntries(Object.keys(CARD_SKILLS).map(st => [st, `npc:${spec.id}:${st}`]));
    const weapons = ship.weapons.map((w, i) => { const definition = SHIP_CATALOGS.weapons[w.id], c = definition.data.combat; return { key: w.instanceId ?? String(i), name: definition.name, mount: w.mount, arcTemplate: c.arcTemplate, dice: weaponDamageProfile(definition, w).dice, minRange: c.rangeHexes.min, maxRange: c.rangeHexes.max, reloadRounds: c.reloadRounds, potency: 0 }; });
    return { id: spec.id, name: spec.name, team: spec.team, ship, stats: deriveShip(ship, SHIP_CATALOGS).stats, weapons };
  });
  const state = createPlaytestSession(entries, { id: "guided-test", rng: () => .5 });
  const starts = [[-3, 1, 0], [-3, 4, 0], [0, -2, 3], [0, 0, 3]];
  Object.values(state.ships).forEach((s, i) => Object.assign(s.cardPlay.motion, Object.fromEntries(["q", "r", "heading"].map((k, j) => [k, starts[i][j]]))));
  return initializeDemo(state, Object.fromEntries(entries.map(e => [e.id, e.id])));
}
test("the guided encounter runs three real rounds, one command/inspection per click", async () => {
  let state = fixture(), count = 0;
  while (state.guidedDemo.status === "running" && count++ < 180) {
    const previous = structuredClone(state), expected = nextDemoStep(state);
    try { state = await runDemoStep(state, adapters); } catch (error) { error.message += ` (step ${count}, round ${state.round}, ${expected.title}, phase ${state.phase})`; throw error; }
    assert.equal(state.revision, previous.revision + 1);
    assert.equal(state.guidedDemo.step, previous.guidedDemo.step + 1);
    assert.equal(state.guidedDemo.last.title, expected.title);
  }
  assert.equal(state.guidedDemo.status, "complete", `Stopped at ${state.guidedDemo.last.title}`);
  assert.equal(state.round, 4, "Round 4 planning is reached but never executed");
  assert.ok(state.guidedDemo.checks.every(c => c.passed), JSON.stringify(state.guidedDemo.checks));
  assert.ok(state.guidedDemo.history.some(s => s.kind === "coverage" && s.selection.assignments?.length === 2), "split broadside is demonstrated");
  assert.ok(state.guidedDemo.history.some(s => s.kind === "reaction" && s.lines.some(l => l.includes("defenses prevented"))));
  assert.ok(count > 40 && count < 180);
});
test("viewing the next step is read-only, and no step runs by itself", () => {
  const state = fixture(), before = structuredClone(state);
  assert.deepEqual(nextDemoStep(state), nextDemoStep(state)); assert.deepEqual(state, before);
});
test("fixed test rolls replay the same results without changing source ships", async () => {
  const first = fixture(), copy = structuredClone(first), a = await runDemoStep(first, adapters), b = await runDemoStep(first, adapters);
  assert.deepEqual(a, b); assert.deepEqual(first, copy);
  const source = buildCardCombatTestFleet({ rng: () => .5 })[0].ship, before = structuredClone(source);
  equipDemoShip(source, "wayfarer"); assert.deepEqual(source, before);
});
test("players, paused starts, and running encounters cannot be taken over", async () => {
  assert.throws(() => assertDemoStartAllowed({ isGM: false }, null, false), /Only the GM/);
  assert.throws(() => assertDemoStartAllowed(adapters.user, null, true), /Unpause/);
  assert.throws(() => assertDemoStartAllowed(adapters.user, { id: "campaign", phase: "execution" }, false), /End the running/);
  assert.throws(() => assertDemoStartAllowed(adapters.user, null, false, true), /active Foundry/);
  await assert.rejects(() => runDemoStep(fixture(), { ...adapters, user: { id: "player" } }), /Only the GM/);
  const state = fixture(); state.guidedDemo.status = "stopped"; assert.equal(nextDemoStep(state), null);
  await assert.rejects(() => runDemoStep(state, adapters), /Start or reset/);
});
