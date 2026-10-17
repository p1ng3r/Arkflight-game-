import test from "node:test";
import assert from "node:assert/strict";
import { SHIP_ABILITIES, STARTER_STATION_ABILITIES } from "../src/content/station-abilities.js";
import { normalizeAbilityLoadouts, equipShipAbilities } from "../src/ship/ability-loadouts.js";
import { abilityDegree, resolveShipAbility, abilityAvailability, applyAbilityLossGuards, applyAbilityStrainGuards } from "../src/combat/ship-ability-rules.js";
import { beginCombatantTurn, fireWeapon } from "../src/combat/combatant-state.js";
import { beginStationActionTurn, consumeStationEffects } from "../src/combat/station-action-state.js";
import { shipAttackPlan, shipDamageDefensePlan, abilityVectorSolution } from "../src/combat/ability-effect-plans.js";
import { runShipCommand } from "../src/foundry/ship-ability-runtime.js";

function fixture(level = 5) {
  const ship = { progression: { level }, resources: { hull: { value: 100, max: 196 }, lifeveil: { value: 40, max: 100 }, morale: { value: 60, max: 100 }, strain: { value: 8, max: 20 }, supplies: { value: 10, max: 20 } }, shipConditions: { hull: "battered", drive: "sluggish", weapons: "fouled" } };
  ship.abilities = normalizeAbilityLoadouts(ship);
  return { ship, state: { turnKey: "round:1", economy: { ap: { value: 4, max: 4 }, rp: { value: 1, max: 1 } }, strain: { value: 8, max: 20 }, mobility: { speed: 4, maneuverability: 2, heading: 0, movement: { purchases: 0, allowance: 4, used: 0 }, maneuver: { purchases: 0, allowance: 2, used: 0 }, facing: { usedDegrees: 0, commits: 0 } }, weapons: { w: { key: "w", name: "Cannon", mount: "starboard", reloadRounds: 2, reloadRemaining: 1, lastFiredRound: 0 } }, engagement: { mooredTo: "enemy" }, log: [] } };
}
const run = (id, degree = 1, extra = {}) => resolveShipAbility({ ...fixture(), id, degree, die: 4, selection: "enemy", round: 1, ...extra });

test("every implemented ability resolves four outcomes and spends the correct shared points", () => {
  for (const a of Object.values(SHIP_ABILITIES)) for (const degree of [-1, 0, 1, 2]) {
    const f = fixture();
    if (a.station === "reactions") f.ship.abilities.equipped.reactions = [a.id, ...f.ship.abilities.equipped.reactions.filter(id => id !== a.id)].slice(0, 4);
    const selection = a.rules.chooseStation ? "engineer" : a.rules.chooseFacing ? "starboard" : a.rules.chooseWeapon ? "w" : a.rules.multipleRoutes ? ["weapons"] : a.rules.chooseSystem ? "hull" : "enemy";
    const r = resolveShipAbility({ ...f, id: a.id, degree, die: 4, selection, round: 1 });
    assert.equal(r.state.economy.ap.value, a.id === "captain-drive-the-crew" ? 6 : 4 - a.cost.ap, a.id);
    assert.equal(r.state.economy.rp.value, 1 - a.cost.rp, a.id);
    assert.equal(f.state.economy.ap.value, 4, "input is immutable");
  }
});

test("ship checks have 10/50/35/5 outcome distribution at every level band", () => {
  for (const [level, bonus] of [[1,1],[5,2],[9,3],[13,4],[17,5]]) {
    const counts = {2:0,1:0,0:0,"-1":0};
    for (let die = 1; die <= 20; die++) counts[abilityDegree(die, bonus, level)]++;
    assert.deepEqual(counts, {2:2,1:10,0:7,"-1":1});
  }
});

test("Rally recovery is rolled; its critical failure damages Morale", () => {
  assert.equal(run("captain-rally-crew", 1, { die: 7 }).ship.resources.morale.value, 74);
  assert.equal(run("captain-rally-crew", 0, { die: 7 }).ship.resources.morale.value, 67);
  assert.equal(run("captain-rally-crew", -1).ship.resources.morale.value, 55);
});

test("Signature renewal keeps a reliable floor and shares its recovery roll", () => {
  const r = run("veilwarden-renewal-wave", 1, { die: 1 });
  assert.equal(r.ship.resources.hull.value, 110);
  assert.equal(r.ship.resources.lifeveil.value, 50);
  const failed = run("veilwarden-renewal-wave", -1, { die: 7 });
  assert.equal(failed.ship.resources.hull.value, 107);
  assert.equal(failed.ship.resources.lifeveil.value, 47);
  assert.equal(failed.state.stationRuntime.effects[0].abilityEcho, "lower");
});

test("cooldowns survive turn refresh and become available in Round 4", () => {
  let r = run("captain-coordinate-assault");
  let state = beginStationActionTurn(beginCombatantTurn(r.state, 2), 2);
  assert.equal(abilityAvailability(r.ship, state, "captain-coordinate-assault", 2).readyRound, 4);
  state = beginStationActionTurn(beginCombatantTurn(state, 4), 4);
  assert.equal(abilityAvailability(r.ship, state, "captain-coordinate-assault", 4).ok, true);
});

test("Signature power charges persist across turns until spent", () => {
  const r = run("engineer-full-synchronization", 2);
  const refreshed = beginStationActionTurn(beginCombatantTurn(r.state, 2), 2);
  assert.equal(refreshed.stationRuntime.effects.length, 2);
  assert.equal(refreshed.stationRuntime.effects[0].charges, 3);
  const consumed = consumeStationEffects(refreshed, [refreshed.stationRuntime.effects[0].id]);
  assert.equal(consumed.stationRuntime.effects[0].charges, 2);
  assert.equal(abilityAvailability(r.ship, refreshed, "engineer-full-synchronization", 2).reason, "once-per-battle");
});

test("Drive gives net +2 AP, costs 5 Morale on a critical, and refreshes to base AP", () => {
  const r = run("captain-drive-the-crew", 2);
  assert.equal(r.ship.resources.morale.value, 55);
  assert.equal(r.state.economy.ap.value, 6);
  assert.equal(beginStationActionTurn(r.state, 1), r.state, "duplicate turn hook cannot remove temporary AP");
  const next = beginStationActionTurn(beginCombatantTurn(r.state, 2), 2);
  assert.deepEqual(next.economy.ap, { value: 4, max: 4 });
});

test("a reaction before the next ship turn cannot preserve Drive's temporary AP or expired protection", () => {
  const drive = run("captain-drive-the-crew");
  const reaction = resolveShipAbility({ ship: drive.ship, state: drive.state, id: "navigator-evasive-maneuver", degree: 1, round: 2 });
  assert.equal(reaction.state.stationRuntime.round, 2);
  assert.equal(reaction.state.stationRuntime.turnRound, 1);
  const next = beginStationActionTurn(beginCombatantTurn(reaction.state, 2), 2);
  assert.deepEqual(next.economy.ap, { value: 4, max: 4 });
  assert.equal(next.stationRuntime.effects.length, 0);
  assert.equal(beginStationActionTurn(next, 2), next);
});

test("weapons reload automatically once per turn and skip no AP", () => {
  const f = fixture(); f.state.weapons.w.reloadRemaining = 0;
  const fired = fireWeapon(f.state, "w", 1);
  const turn2 = beginCombatantTurn(fired, 2);
  assert.equal(turn2.weapons.w.reloadRemaining, 1);
  assert.equal(turn2.economy.ap.value, 4);
  assert.equal(beginCombatantTurn(turn2, 2), turn2);
  assert.equal(beginCombatantTurn(turn2, 3).weapons.w.reloadRemaining, 0);
});

test("negative vectors actually narrow a firing arc", () => {
  const r = run("navigator-set-attack-vector", -1, { selection: "starboard" });
  const solution = { arc: { legal: true, difference: 40, halfWidth: 45 }, range: { legal: true }, weaponState: { mount: "starboard" } };
  assert.equal(abilityVectorSolution(r.state, solution, 5).legal, false);
});

test("Reinforce protects physical hits and all qualifying hits without consuming turn protection", () => {
  const r = run("veilwarden-reinforce-lifeveil");
  const plan = shipDamageDefensePlan(r.state, 5, { weapon: { data: { damageProfile: { type: "piercing" } } } });
  assert.equal(plan.wardMitigation, 3);
  assert.deepEqual(plan.wardConsumed, []);
});

test("Vent's critical protection works on weapon-hit Strain while Bypass remains Engineer-specific", () => {
  const r = run("engineer-vent-strain", 2);
  const hit = applyAbilityStrainGuards(r.state, 1);
  assert.equal(hit.amount, 0);
  assert.equal(hit.state.stationRuntime.effects.length, 0);
  assert.equal(applyAbilityStrainGuards(hit.state, 1).amount, 1);
  r.state.stationRuntime.effects = [{ id: "bypass", actionId: "engineer-emergency-bypass", mitigation: 2 }];
  assert.equal(applyAbilityStrainGuards(r.state, 1).amount, 1);
  assert.equal(applyAbilityStrainGuards(r.state, 3, "engineer").amount, 1);
});

test("critical recovery guards cannot pay an ability's resource cost or its own Push cost", () => {
  const r = run("veilwarden-mend-lifeveil", 2);
  const healing = resolveShipAbility({ ship: r.ship, state: r.state, id: "veilwarden-healing-lifeveil", degree: 1, die: 1, round: 1, push: true });
  assert.equal(healing.ship.resources.lifeveil.value, r.ship.resources.lifeveil.value - 10);
  assert.ok(healing.state.stationRuntime.effects.some(e => e.resourceGuard === "lifeveil"));
});

test("Full Synchronization stacks damage with broadside; salvo bonus scales with participating weapons", () => {
  const r = run("engineer-full-synchronization");
  r.state.stationRuntime.effects.push({ id:"salvo", actionId:"battlewatch-devastating-salvo", charges:1, salvoDamagePerWeapon:4 });
  const plan = shipAttackPlan(r.state, { id:"enemy" }, "starboard", 5, ["w","x"]);
  assert.equal(plan.damageBonus, 12);
});

test("learning milestones and reaction reserve are stable; loadouts cannot change in combat", () => {
  const f = fixture(); assert.equal(f.ship.abilities.learningCredits, 1);
  const normalized = normalizeAbilityLoadouts(f.ship);
  assert.equal(normalized.learningCredits, 1);
  assert.equal(normalized.equipped.reactions.length, 4);
  assert.ok(normalized.learned.reactions.includes("captain-brace-for-impact"));
  assert.ok(!normalized.equipped.reactions.includes("captain-brace-for-impact"));
  assert.throws(() => equipShipAbilities(f.ship, "captain", STARTER_STATION_ABILITIES.captain, { inCombat:true }), /locked/);
});

test("resource loss protection is consumed once and never heals unrelated damage", () => {
  const r = run("captain-rally-crew", 2);
  const after = structuredClone(r.ship); after.resources.morale.value -= 20;
  const guarded = applyAbilityLossGuards(r.ship, after, r.state);
  assert.equal(guarded.ship.resources.morale.value, r.ship.resources.morale.value - 15);
  assert.equal(guarded.state.stationRuntime.effects.length, 0);
});

test("serialized commands read updated state before a second attempt", async () => {
  const events = [];
  const first = runShipCommand("test", async () => { events.push(1); await Promise.resolve(); events.push(2); });
  const second = runShipCommand("test", async () => events.push(3));
  await Promise.all([first,second]); assert.deepEqual(events,[1,2,3]);
});
