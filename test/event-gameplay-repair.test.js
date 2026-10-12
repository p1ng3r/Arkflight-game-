import test from 'node:test';
import assert from 'node:assert/strict';
import { ARKFLIGHT_EVENTS } from '../src/content/events/index.js';
import { getRiskBenefit } from '../src/content/risk-benefits.js';
import { cloneEncounter } from '../src/event/encounter-state.js';
import { applyEarnedRiskBenefit, finalizeRound, advanceToNextRound, encounterFromEvent, consumeCheckAdjustments } from '../src/event/round-runtime.js';
import { applyCrewTactic } from '../src/event/tactics-engine.js';
import { applyMasteryTechnique } from '../src/event/mastery-engine.js';
import { applyStationRollResult, selectedResolution } from '../src/event/resolution-engine.js';
import { activeHazards, hazardCheckAdjustment, hazardOrderErrors, riskBlockReason, availableStationActions } from '../src/event/hazard-rules.js';
import { applyRiskChoice } from '../src/event/risk-choices.js';
import { resolveSavedRiskAwardsAutomatically } from '../src/event/risk-awards.js';
import { applyShipEffects } from '../src/ship/ship-effects.js';

const glass = ARKFLIGHT_EVENTS['glassback-cinderwake'];
const gilded = ARKFLIGHT_EVENTS['gilded-shatter'];
const order = ['captain', 'engineer', 'navigator', 'battlewatch', 'veilwarden'];
function state(event = glass) {
  return { createdAt: 1, eventId: event.id, phase: 'resolution', roundIndex: 0, order: [...order], activeOrderIndex: 1,
    results: { captain: { degreeKey: 'success' } }, encounter: encounterFromEvent(event), pendingShipEffects: [], selections: {}, crewEdgeHand: [], masteryUses: {} };
}
function earn(s, id, critical = false, parameters = {}) {
  return applyEarnedRiskBenefit(s, { stationId: 'captain', riskBid: { parameters }, riskBenefit: getRiskBenefit(id) }, critical ? 'criticalSuccess' : 'success', ARKFLIGHT_EVENTS[s.eventId] ?? glass);
}
function endRound(s, bandId = 'failure') {
  return finalizeRound(glass, { ...s, phase: 'round-result', roundResult: { score: -1, bandId, momentumDelta: -1 } });
}
function strain(s) { return s.pendingShipEffects.filter(e => e.kind === 'gain-strain').reduce((a,e) => a + e.value, 0); }
test('Momentum rewards execute both degrees and respect the cap', () => {
  assert.equal(earn(state(), 'momentum-1').encounter.momentum, 1);
  assert.equal(earn(state(), 'momentum-2', true).encounter.momentum, 2);
  assert.equal(earn(state(), 'momentum-2', true).encounter.checkBonuses.engineer, 2);
  assert.equal(earn(state(), 'momentum-3', true).encounter.checkBonuses.veilwarden, 1);
  assert.equal(earn({ ...state(), encounter: cloneEncounter({ momentum: 3 }) }, 'momentum-1').encounter.momentum, 3);
  assert.equal(endRound(earn(state(), 'momentum-1', true)).encounter.momentum, 1);
});

test('stronger DC reward applies its DC and critical Momentum', () => {
  const next = earn(state(), 'dc-next-2', true);
  assert.equal(next.encounter.dcAdjustments.engineer, -3);
  assert.equal(next.encounter.momentum, 1);
});

test('shared Strain guards reduce the actual round consequence', () => {
  assert.equal(strain(endRound(earn(state(), 'pressure-guard-1'))), 1);
  assert.equal(strain(endRound(earn(state(), 'pressure-guard-1', true))), 0);
  assert.equal(strain(endRound(earn(state(), 'pressure-guard-2'))), 0);
});

test('Brace Against the Shear blocks Hazard upkeep Strain without consuming round-outcome protection', () => {
  const s = state(gilded);
  s.encounter.hazards = ['gravity-shear', 'gilded-mass'];
  const guarded = earn(s, 'hazard-strain-guard-1', true);
  assert.equal(guarded.encounter.hazardStrainGuard, 2);
  const done = finalizeRound(gilded, { ...guarded, phase: 'round-result', roundResult: { score: -1, bandId: 'failure', momentumDelta: 0 } });
  const strainEffects = done.pendingShipEffects.filter(effect => effect.kind === 'gain-strain');
  assert.equal(strain(strainEffects.length ? { pendingShipEffects: strainEffects } : { pendingShipEffects: [] }), 1);
  assert.ok(strainEffects.every(effect => !String(effect.source ?? '').includes('left active at round end')));
  assert.equal(done.encounter.hazardStrainGuard, 0);
});

test('single-source protection does not swallow later hazard upkeep', () => {
  const s = state(); s.encounter.hazards = ['ember-current']; s.crewEdgeHand = ['protect-the-system'];
  const guarded = applyCrewTactic(s, 'protect-the-system');
  assert.deepEqual(guarded.crewEdgeHand, []);
  assert.equal(strain(endRound(guarded)), 1);
  assert.equal(strain(endRound(applyCrewTactic({ ...s, crewEdgeHand: ['brace-for-it'] }, 'brace-for-it'))), 1);
});

test('critical Unbreakable protects the whole round, then expires', () => {
  const s = state(); s.encounter.hazards = ['ember-current'];
  const done = endRound(earn(s, 'pressure-guard-3', true));
  assert.equal(strain(done), 0);
  assert.equal(advanceToNextRound(glass, done).encounter.guardAllRoundStrain, undefined);
});

test('cannot waste a defensive tactic after round consequence', () => {
  assert.throws(() => applyCrewTactic({ ...endRound(state()), crewEdgeHand: ['protect-the-system'] }, 'protect-the-system'), /already been applied/);
});

test('hazard catalogs affect only the appropriate station and source is visible', () => {
  const s = state(); s.encounter.hazards = ['ember-current'];
  assert.equal(hazardCheckAdjustment(glass, s, 'veilwarden').dc, 1);
  assert.equal(hazardCheckAdjustment(glass, s, 'captain').dc, 0);
  const action = glass.rounds[0].stationActions.veilwarden[0];
  s.selections.veilwarden = { actionId: action.id, skillId: action.skills[0].id };
  const chosen = selectedResolution(glass, s, 'veilwarden', { shipRollBonus: 0 });
  assert.equal(chosen.finalDc, 19);
  assert.match(chosen.dcAdjustmentSources.join(), /Ember Current/);
});

test('suppression and sanctuary bypass hazard DCs', () => {
  const s = state(); s.encounter.hazards = ['ember-current']; s.encounter.hazardShelters.veilwarden = true;
  assert.equal(hazardCheckAdjustment(glass, s, 'veilwarden').dc, 0);
  s.encounter.hazardShelters = {}; s.encounter.suppressedHazards = ['ember-current'];
  assert.deepEqual(activeHazards(glass, s), []);
});

test('hazard order and Risk restrictions enforce the authored rule', () => {
  const s = state(); s.encounter.hazards = ['glassback-turn'];
  assert.equal(hazardOrderErrors(glass, s).length, 1);
  assert.match(riskBlockReason(glass, s, 'captain', 8), /Glassback Turn/);
  s.order = ['captain','navigator','engineer','battlewatch','veilwarden'];
  assert.deepEqual(hazardOrderErrors(glass, s), []);
  s.encounter.riskOverrides.captain = true;
  assert.equal(riskBlockReason(glass, s, 'captain', 8), null);
});

test('hazards created at round end do not also charge upkeep immediately', () => {
  const done = endRound(state());
  assert.equal(strain(done), 2);
  assert.ok(done.encounter.hazards.includes('collapsing-spars'));
  assert.equal(strain(finalizeRound(glass, done)), 2);
});

test('emergency action appears only while hazard is active and Success clears it', () => {
  const s = state(); s.encounter.hazards = ['collapsing-spars']; s.activeOrderIndex = 3;
  const action = availableStationActions(glass, s, 'battlewatch').find(a => a.id === 'battlewatch.clear-the-fall');
  assert.ok(action);
  s.selections.battlewatch = { actionId: action.id, skillId: action.skills[0].id };
  const { nextState } = applyStationRollResult({ event: glass, state: s, actor: { id: 'officer', name: 'Officer' }, roll: { total: 22, outcome: 'success' }, shipRollBonus: 0 });
  assert.ok(!nextState.encounter.hazards.includes('collapsing-spars'));
  assert.ok(!availableStationActions(glass, nextState, 'battlewatch').some(a => a.id === action.id));
});

test('success degree-lift does not improve a failure; critical version does', () => {
  const action = glass.rounds[0].stationActions.engineer[0];
  const s = state(); s.selections.engineer = { actionId: action.id, skillId: action.skills[0].id };
  const resolve = critical => applyStationRollResult({ event: glass, state: earn(s, 'degree-lift', critical), actor: { id: 'e', name: 'Engineer' }, roll: { total: 10, outcome: 'failure' }, shipRollBonus: 0 }).nextState.results.engineer.degreeKey;
  assert.equal(resolve(false), 'failure'); assert.equal(resolve(true), 'success');
});

test('Mastery and Tactics retain each others encounter effects', () => {
  const s = earn(state(), 'momentum-1', true);
  s.setupLocked = true; s.masterySelections = { engineer: 'engineer-heart-without-rest' }; s.crewEdgeHand = ['hold-together'];
  const next = applyCrewTactic(applyMasteryTechnique(s, 'engineer'), 'hold-together');
  assert.equal(next.encounter.momentumLossGuard, 1);
  assert.equal(next.encounter.generalStrainGuard, 3);
  assert.equal(s.encounter.generalStrainGuard, 0);
});

test('earned target rewards resolve automatically and never block the next roll', () => {
  const next = earn(state(), 'order-followup', true);
  assert.equal(next.encounter.pendingRiskAwards.length, 0);
  assert.equal(next.order[1], 'engineer');
  assert.equal(next.encounter.checkBonuses.engineer, 3);
  assert.equal(next.encounter.dcAdjustments.engineer, -1);
  assert.equal(next.encounter.riskAwardHistory[0].automaticallyResolved, true);
});

test('condition stabilization applies automatically without a blocking GM prompt', () => {
  const s = earn(state(), 'condition-stabilize', true);
  assert.equal(s.encounter.pendingRiskAwards.length, 0);
  assert.ok(s.pendingShipEffects.some(effect => effect.kind === 'recover-most-severe-condition' && effect.steps === 2));
  assert.doesNotThrow(() => endRound(s));
});

test('automatic condition stabilization improves the most severe ship condition', () => {
  const result = applyShipEffects({
    resources: { hull: { value: 10, max: 10 }, strain: { value: 0, max: 10 } },
    shipConditions: { hull: 'breached', drive: 'faltering', weapons: 'ready' }
  }, [{ kind: 'recover-most-severe-condition', steps: 1 }]);
  assert.equal(result.ship.shipConditions.hull, 'battered');
  assert.equal(result.ship.shipConditions.drive, 'faltering');
});

test('targeted suppression affects a check once and round suppression returns next round', () => {
  const s = state(); s.encounter.hazards = ['ember-current']; s.activeOrderIndex = 4; s.results.engineer = {}; s.results.navigator = {}; s.results.battlewatch = {};
  const once = earn(s, 'hazard-suppress-1');
  assert.equal(hazardCheckAdjustment(glass, once, 'veilwarden').dc, 0);
  assert.equal(hazardCheckAdjustment(glass, consumeCheckAdjustments(once, 'veilwarden'), 'veilwarden').dc, 1);
  const suppressed = earn(state(gilded), 'hazard-suppress-2', true);
  assert.equal(suppressed.pendingShipEffects.at(-1).value, -1);
  const done = finalizeRound(gilded, { ...suppressed, phase: 'round-result', roundResult: { score: 3, bandId: 'strong-success', momentumDelta: 1 } });
  assert.ok(advanceToNextRound(gilded, done).encounter.hazards.includes('gravity-shear'));
});

test('chosen order cannot duplicate or omit stations', () => {
  const s = state();
  const award = { benefitId: 'order-swap', degreeKey: 'success', stationId: 'captain', name: 'Tactical Reorder' };
  assert.throws(() => applyRiskChoice(s, award, { order: ['engineer','engineer'] }), /exactly once/);
});

test('every Risk benefit used in shipped events resolves automatically without a GM queue', () => {
  for (const event of Object.values(ARKFLIGHT_EVENTS)) for (const round of event.rounds) for (const actions of Object.values(round.stationActions)) for (const action of actions) for (const skill of action.skills) for (const bid of skill.riskBids) {
    for (const critical of [false, true]) {
      const next = earn(state(event), bid.benefitId, critical, bid.parameters);
      assert.ok(next.encounter);
      assert.equal(next.encounter.pendingRiskAwards.length, 0, `${event.id}: ${bid.benefitId}`);
      assert.equal(next.encounter.riskAwardHistory.at(-1)?.automaticallyResolved, true, `${event.id}: ${bid.benefitId}`);
      assert.doesNotThrow(() => JSON.stringify(next));
    }
  }
});

test('saved rewards from the earlier GM queue migrate to automatic resolution', () => {
  const s = state();
  s.encounter.pendingRiskAwards = [{ benefitId: 'order-followup', name: 'Ride the Wake', stationId: 'captain', degreeKey: 'success', roundIndex: 0 }];
  const migrated = resolveSavedRiskAwardsAutomatically(s, glass);
  assert.equal(migrated.encounter.pendingRiskAwards.length, 0);
  assert.equal(migrated.encounter.checkBonuses.engineer, 2);
  assert.equal(migrated.encounter.riskAwardHistory.at(-1).migrated, true);
});

test('saved See It Coming rewards migrate to the current Hazard Strain guard', () => {
  const s = state(gilded);
  s.encounter.pendingRiskAwards = [{ benefitId: 'hazard-reveal-1', name: 'See It Coming', stationId: 'captain', degreeKey: 'criticalSuccess', roundIndex: 0 }];
  const migrated = resolveSavedRiskAwardsAutomatically(s, gilded);
  assert.equal(migrated.encounter.pendingRiskAwards.length, 0);
  assert.equal(migrated.encounter.hazardStrainGuard, 2);
  assert.equal(migrated.encounter.riskAwardHistory.at(-1).migrated, true);
});

test('controller automatically resolves a final-station reward before applying the round consequence', async () => {
  const { PlanningController } = await import('../src/event/planning-controller.js');
  const previousGame = globalThis.game;
  const actor = { id: 'v', name: 'Veilwarden', testUserPermission: () => true };
  const s = state(gilded); s.activeOrderIndex = 4; s.setupLocked = true;
  s.assignments = { veilwarden: { actorId: 'v' } };
  for (const id of order.slice(0,4)) s.results[id] = { degreeKey: 'success' };
  const action = gilded.rounds[0].stationActions.veilwarden.find(a => a.skills.some(skill => skill.riskBids.some(b => b.benefitId === 'lifeveil-ward')));
  const skill = action.skills.find(skill => skill.riskBids.some(b => b.benefitId === 'lifeveil-ward'));
  s.selections.veilwarden = { actionId: action.id, skillId: skill.id, riskTier: 5 };
  const writes = []; const effects = [];
  globalThis.game = { user: { id: 'gm', isGM: true }, users: { get: () => ({ id: 'gm', isGM: true }) },
    actors: { get: () => actor }, settings: { get: () => s, set: async (_m,_k,value) => { writes.push(value); } }, socket: { emit() {} } };
  try {
    const controller = new PlanningController({ applyShipEffects: async rows => effects.push(...rows) });
    await controller.command({ type: 'submit-station-roll', stationId: 'veilwarden', actorId: 'v', roll: { total: 25, outcome: 'success' } });
    assert.equal(controller.state.phase, 'round-result');
    assert.equal(controller.state.encounter.pendingRiskAwards.length, 0);
    assert.equal(controller.state.encounter.riskAwardHistory.at(-1).automaticallyResolved, true);
    // Hazard upkeep also opens the applicable defensive Mastery window.
    while (controller.state.pendingMasteryWindows?.length) {
      const window = controller.state.pendingMasteryWindows[0];
      await controller.command({ type: 'dismiss-mastery-window', station: window.stationId, windowId: window.id });
    }
    assert.equal(controller.state.consequenceApplied, true);
    assert.ok(controller.state.encounter.riskAwardHistory.some(award => award.automaticallyResolved));
  } finally { globalThis.game = previousGame; }
});
