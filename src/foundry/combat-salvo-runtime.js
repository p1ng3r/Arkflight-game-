import { shipAttackPlan as attackEffectPlan, shipAttackDefensePlan as attackDefensePlan, shipDamageDefensePlan as damageDefensePlan } from "../combat/ability-effect-plans.js";
import { applyAbilityLossGuards, applyAbilityStrainGuards } from "../combat/ship-ability-rules.js";
import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";
import { resolveShipStrainGain } from "./ship-strain-runtime.js";
import {
  activeStationEffects,
  applyHardnessToDamage,
  consumeStationEffects,
  commitFacing,
  coordinatedSalvoPlan,
  degreeOfSuccess,
  fireCoordinatedSalvo,
  reduceWeaponReload,
  shipWeaponAttackBonus,
  stationEffectMagnitude,
  stationEffectProfile,
  stationMitigationValue,
  weaponDamageProfile,
  weaponReloadRemaining
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

import { runShipCommand } from "./ship-ability-runtime.js";
import { systemOperationBlock } from "../ship/system-damage.js";
import { resolveSystemDamageSaves, reportSystemSaves } from "./system-damage-runtime.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const ENERGY_TYPES = new Set(["fire", "cold", "electricity", "acid", "sonic", "force"]);
const ATTACK_REACTIONS = ["navigator-evasive-maneuver", "battlewatch-spoil-their-aim"];
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function shipLevel(actor) { return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1))); }
function resolveCombatant(base, reference = null) {
  if (reference?.documentName === "Combatant") return reference;
  if (typeof reference === "string") {
    const direct = game.combat?.combatants?.get?.(reference)
      ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.id === reference);
    if (direct) return direct;
  }
  return reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
}
function battlewatchActor(shipActor) {
  const actorId = shipPayload(shipActor)?.crew?.stations?.battlewatch ?? null;
  return actorId ? game.actors?.get(actorId) ?? null : null;
}
function perceptionModifier(actor) {
  if (!actor) return null;
  const statistic = actor.getStatistic?.("perception") ?? actor.perception ?? null;
  for (const candidate of [statistic?.mod, statistic?.modifier, actor.system?.perception?.mod, actor.system?.attributes?.perception?.value]) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}
function effectMatchesTarget(effect, target) {
  return effect?.selection === target?.id || effect?.selection === target?.actorId || effect?.selection === target?.actor?.id;
}
function highestMagnitude(effects, level) {
  return effects.reduce((best, effect) => Math.max(best, stationEffectMagnitude(effect, level)), 0);
}
function bestEffect(effects, valueFor) {
  let best = null;
  let value = 0;
  for (const effect of effects) {
    const candidate = Math.max(0, Number(valueFor(effect)) || 0);
    if (candidate > value) { best = effect; value = candidate; }
  }
  return Object.freeze({ effect: best, value });
}
function wardableDamage(type, systemThreat) {
  return ENERGY_TYPES.has(String(type ?? "").toLowerCase()) || String(systemThreat ?? "").toLowerCase() === "lifeveil";
}
function lifeveilOnline(actor) { return Math.max(0, Number(shipPayload(actor)?.resources?.lifeveil?.value) || 0) >= 10; }
function focusWardMatches(effect, type, systemThreat) {
  const selection = String(effect?.selection ?? "").toLowerCase();
  return selection && (selection === String(type ?? "").toLowerCase() || selection === String(systemThreat ?? "").toLowerCase());
}

function availableReactionChoices(base, target) {
  const effects = base.state(target)?.stationRuntime?.effects ?? [];
  return ATTACK_REACTIONS.flatMap((id) => {
    const action = base.actions?.[id];
    if (!action || effects.some((effect) => effect.actionId === id)) return [];
    return base.stationActionAvailability?.(id, target)?.ok ? [{ id, action }] : [];
  });
}
async function chooseAttackReaction(base, attacker, target, label) {
  const choices = availableReactionChoices(base, target);
  if (!choices.length) return null;
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  const esc = foundry.utils.escapeHTML;
  const content = `<div class="arkflight-reaction-prompt"><p><strong>${esc(attacker.name)}</strong> declares <strong>${esc(label)}</strong> against <strong>${esc(target.name)}</strong>.</p><hr>${choices.map((choice) => `<p><strong>${esc(choice.action.name)}</strong> — ${esc(choice.action.summary ?? choice.action.description)}</p>`).join("")}</div>`;
  let id = null;
  if (DialogV2?.wait) {
    id = await DialogV2.wait({ window: { title: `Attack Reaction — ${target.name}` }, content, buttons: [
      ...choices.map((choice) => ({ action: choice.id, label: `${choice.action.name} · ${choice.action.cost?.rp ?? 1} RP`, callback: () => choice.id })),
      { action: "pass", label: "Pass", default: true, callback: () => null }
    ], close: () => null });
  }
  if (id && choices.some((choice) => choice.id === id)) await base.stationAction(id, {}, target);
  return id;
}

function compatibleSalvoSolutions(solutions) {
  if (solutions.length < 2) throw new Error("A Coordinated Salvo requires at least two weapons.");
  const first = solutions[0];
  const mount = first.weaponState.mount;
  const damageType = String(first.weapon.data?.damageProfile?.type ?? "damage").toLowerCase();
  const threat = String(first.weapon.data?.systemThreat ?? "hull").toLowerCase();
  for (const solution of solutions) {
    if (!solution.range.legal || !solution.arc.legal) throw new Error(`${solution.weapon.name} does not have a legal firing solution.`);
    if (solution.weaponState.mount !== mount) throw new Error("All salvo weapons must share one facing.");
    if (String(solution.weapon.data?.damageProfile?.type ?? "damage").toLowerCase() !== damageType) throw new Error("Salvo weapons must share one damage type.");
    if (String(solution.weapon.data?.systemThreat ?? "hull").toLowerCase() !== threat) throw new Error("Salvo weapons must share one system threat.");
  }
  return Object.freeze({ mount, damageType, threat });
}
function reduceOneReload(state, keys, amount, round) {
  const candidates = keys
    .map((key) => state.weapons?.[key])
    .filter(Boolean)
    .sort((a, b) => weaponReloadRemaining(b) - weaponReloadRemaining(a));
  const chosen = candidates[0];
  return chosen ? reduceWeaponReload(state, chosen.key, round, amount) : state;
}

export async function fireSalvoAtTarget(base, weaponKeys, targetReference, attackerReference = null) {
  const attacker = resolveCombatant(base, attackerReference);
  const target = resolveCombatant(base, targetReference);
  if (!attacker || !target) throw new Error("Choose attacker and target Arkflight ship combatants.");
  const round = Math.max(1, Number(game.combat?.round ?? 1));
  const blocked = systemOperationBlock(shipPayload(attacker.actor), "fire");
  if (blocked) throw new Error(blocked);
  const attackerBefore = base.state(attacker);
  const plan = coordinatedSalvoPlan(attackerBefore, weaponKeys, round);
  const solutions = plan.keys.map((key) => base.targetingSolution(key, target, attacker));
  const signature = compatibleSalvoSolutions(solutions);
  await chooseAttackReaction(base, attacker, target, `a ${plan.keys.length}-weapon Coordinated Salvo`);

  const targetAttackState = base.state(target);
  const attackerLevel = shipLevel(attacker.actor);
  const targetLevel = shipLevel(target.actor);
  const attackerCommitted = commitFacing(attackerBefore, attackerBefore?.mobility?.heading, "salvo");
  let attackerAfter = fireCoordinatedSalvo(attackerCommitted, plan.keys, round);
  const offense = attackEffectPlan(attackerCommitted, target, signature.mount, attackerLevel, plan.keys);
  const attackDefense = attackDefensePlan(targetAttackState, targetLevel);
  const battlewatch = battlewatchActor(attacker.actor);
  const perception = perceptionModifier(battlewatch);
  if (perception == null) throw new Error(`${attacker.name} needs an assigned Battlewatch officer with PF2e Perception.`);
  const attackerDerived = deriveShip(shipPayload(attacker.actor), SHIP_CATALOGS);
  const targetDerived = deriveShip(shipPayload(target.actor), SHIP_CATALOGS);
  const baseAttackBonus = shipWeaponAttackBonus({ battlewatchPerception: perception, shipWeaponAttackBonus: attackerDerived.stats.weaponAttackBonus, install: { upgrades: solutions[0].weaponState.upgrades } });
  const attackBonus = baseAttackBonus + offense.circumstanceBonus - attackDefense.attackPenalty;
  const ac = Math.max(0, Number(targetDerived.stats.armorClass) || 0) + attackDefense.acBonus;
  const attack = await new Roll("1d20 + @attackBonus", { attackBonus }).evaluate();
  const die = Number(attack.dice?.[0]?.total ?? attack.terms?.find?.((term) => term?.faces === 20)?.total ?? 0);
  const degree = degreeOfSuccess(Number(attack.total), die, ac);

  attackerAfter = consumeStationEffects(attackerAfter, offense.consumed);
  if (offense.reloadReduction) for (const key of plan.keys) attackerAfter = reduceWeaponReload(attackerAfter, key, round, offense.reloadReduction);
  let targetAfter = consumeStationEffects(targetAttackState, attackDefense.consumed);
  let damageDefense = Object.freeze({ wardable:false, wardMitigation:0, braceMitigation:0, wardConsumed:[], emergencyWardConsumed:[], braceConsumed:[] });
  let damage = null;

  if (degree >= 1) {
    const profiles = solutions.map((solution) => weaponDamageProfile(solution.weapon, { upgrades: solution.weaponState.upgrades }));
    const baseExpression = profiles.map((profile) => `(${profile.dice})`).join(" + ");
    const damageRoll = await new Roll(degree === 2 ? `2 * (${baseExpression})` : baseExpression).evaluate();
    const rolled = Math.max(0, Number(damageRoll.total) || 0);
    const poweredIncoming = rolled + offense.damageBonus * (degree === 2 ? 2 : 1);
    const hardnessBase = Math.max(0, Number(targetDerived.stats.hardness) || 0);
    let hardnessEffective = Math.max(0, hardnessBase - offense.hardnessReduction);
    await game.arkflight?.shipCombatReactions?.promptDamage?.({ attacker, target, solution: solutions[0], incoming: poweredIncoming, hardness: hardnessEffective });
    const targetLatest = base.state(target) ?? targetAttackState;
    targetAfter = consumeStationEffects(targetLatest, attackDefense.consumed);
    damageDefense = damageDefensePlan(targetAfter, targetLevel, solutions[0], target.actor);
    hardnessEffective += damageDefense.hardnessBonus;
    const wardAbsorbed = Math.min(poweredIncoming, damageDefense.wardMitigation);
    const afterWard = Math.max(0, poweredIncoming - wardAbsorbed);
    const hardened = applyHardnessToDamage(afterWard, hardnessEffective);
    const braceAbsorbed = Math.min(hardened.hullDamage, damageDefense.braceMitigation);
    const hullDamage = Math.max(0, hardened.hullDamage - braceAbsorbed);
    const targetShip = shipPayload(target.actor);
    const before = Math.max(0, Number(targetShip.resources?.hull?.value) || 0);
    const after = Math.max(0, before - hullDamage);
    damage = Object.freeze({ roll:damageRoll, rolled, stationDamageBonus:offense.damageBonus, incoming:poweredIncoming, wardAbsorbed, hardnessBase, hardnessEffective, hardnessReduced:Math.min(hardnessBase, offense.hardnessReduction), absorbed:hardened.absorbed, braceAbsorbed, hullDamage, before, after, type:signature.damageType });
    if (wardAbsorbed > 0) targetAfter = consumeStationEffects(targetAfter, [...damageDefense.wardConsumed, ...damageDefense.emergencyWardConsumed]);
    if (braceAbsorbed > 0) targetAfter = consumeStationEffects(targetAfter, damageDefense.braceConsumed);
    if (damageDefense.hardnessBonus && afterWard > hardnessEffective - damageDefense.hardnessBonus) targetAfter = consumeStationEffects(targetAfter, damageDefense.hardnessConsumed);
  }

  await attacker.update({ [STATE_PATH]: attackerAfter });
  if (targetAfter !== targetAttackState) await target.update({ [STATE_PATH]: targetAfter });
  if (damage) await runShipCommand(target.actor.uuid ?? target.actor.id, async () => {
    const beforeShip = shipPayload(target.actor);
    let nextShip = structuredClone(beforeShip);
    const before = Math.max(0, Number(beforeShip.resources?.hull?.value) || 0);
    const after = Math.max(0, before - damage.hullDamage);
    damage = Object.freeze({ ...damage, before, after });
    nextShip.resources.hull.value = after;
    if (degree === 2) {
      const protection = applyAbilityStrainGuards(targetAfter, 1);
      targetAfter = protection.state;
      const strain = await resolveShipStrainGain(nextShip, { amount: protection.amount, currentStrain: targetAfter.strain.value, strainMax: targetAfter.strain.max, sourceLabel: "Coordinated Salvo Critical Hit", speaker: ChatMessage.getSpeaker({ actor: target.actor }) });
      const guarded = applyAbilityLossGuards(beforeShip, strain.ship, targetAfter);
      nextShip = guarded.ship; targetAfter = { ...guarded.state, strain: strain.strain };
      await target.update({ [STATE_PATH]: targetAfter });
    }
    const systemResult = await resolveSystemDamageSaves(beforeShip, nextShip, { systems: ["hull"] });
    nextShip = systemResult.ship;
    targetAfter = reconcileCombatantState(nextShip, targetAfter, { derived: deriveShip(nextShip, SHIP_CATALOGS), catalogs: SHIP_CATALOGS, rotation: targetAfter.mobility.heading });
    await target.update({ [STATE_PATH]: targetAfter });
    await target.actor.update({ [`flags.${MODULE_ID}.ship`]: nextShip }, { arkflightAbilityTransaction: true });
    await reportSystemSaves(systemResult, target.actor);
  });

  const esc = foundry.utils.escapeHTML;
  const weaponNames = solutions.map((solution) => solution.weapon.name).join(" + ");
  const damageLine = damage ? `<br><strong>Hull:</strong> ${damage.incoming} − ${damage.wardAbsorbed} Ward − ${damage.absorbed} Hardness − ${damage.braceAbsorbed} Brace = <strong>${damage.hullDamage}</strong> Hull (${damage.before} → ${damage.after})` : "";
  await attack.toMessage({ speaker: ChatMessage.getSpeaker({ actor: battlewatch }), flavor: `<strong>${esc(attacker.name)} fires a Coordinated Salvo at ${esc(target.name)}</strong><br>${esc(weaponNames)}<br>${solutions[0].distanceHexes.toFixed(1)} hex · ${esc(solutions[0].range.label)} · ${esc(signature.mount)} facing<br>Attack ${attack.total} vs AC ${ac}: <strong>${DEGREE_LABEL[degree]}</strong>${damageLine}` });
  if (damage) await damage.roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: battlewatch }), flavor: `<strong>Coordinated Salvo Damage — ${esc(target.name)}</strong><br>${plan.keys.length} weapons combine before Ward and Hardness. Rolled ${damage.rolled}${offense.damageBonus ? ` + ${offense.damageBonus} station damage` : ""} = ${damage.incoming} incoming; <strong>${damage.hullDamage} Hull</strong> after mitigation.` });

  const result = Object.freeze({ state:attackerAfter, attack, attackBonus, ac, degree, solution:solutions[0], solutions:Object.freeze(solutions), damage, offense, defense:Object.freeze({ ...attackDefense, ...damageDefense }), salvo:Object.freeze({ weaponKeys:plan.keys, mount:signature.mount, totalAP:plan.totalAP, systemThreat:signature.threat }) });
  Hooks.callAll("arkflightNativeShipAttackResolved", { combat:game.combat, attacker, target, solution:solutions[0], attack, degree, damage, offense, defense:result.defense, attackerState:attackerAfter, targetState:targetAfter, salvo:result.salvo });
  Hooks.callAll("arkflightCoordinatedSalvoResolved", result);
  return result;
}

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  game.arkflight.combat = Object.freeze({
    ...base,
    salvoPlan(weaponKeys, reference = null) {
      const combatant = resolveCombatant(base, reference);
      if (!combatant) throw new Error("Choose an Arkflight ship Combatant.");
      return coordinatedSalvoPlan(base.state(combatant), weaponKeys, game.combat?.round ?? 1);
    },
    fireSalvoAtTarget(weaponKeys, targetReference, attackerReference = null, options = {}) {
      if (!options.resolvedByStation) {
        const target = resolveCombatant(base, targetReference);
        return base.stationAction("battlewatch-fire-weapon", { weaponKeys, targetId: target?.id }, attackerReference);
      }
      return fireSalvoAtTarget(base, weaponKeys, targetReference, attackerReference);
    }
  });
});
