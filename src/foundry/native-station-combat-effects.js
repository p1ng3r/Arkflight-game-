import {
  activeStationEffects,
  applyHardnessToDamage,
  consumeStationEffects,
  degreeOfSuccess,
  fireWeapon,
  reduceWeaponReload,
  shipWeaponAttackBonus,
  stationEffectMagnitude,
  stationEffectProfile,
  stationMitigationValue,
  weaponDamageProfile
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const ENERGY_TYPES = new Set(["fire", "cold", "electricity", "acid", "sonic", "force"]);
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may resolve Arkflight ship combat attacks.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function resolveCombatant(base, reference) {
  if (reference?.documentName === "Combatant") return reference;
  if (typeof reference === "string") {
    const direct = game.combat?.combatants?.get?.(reference)
      ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.id === reference);
    if (direct) return direct;
  }
  return base.findCombatant(reference);
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

function isHeadingCurrent(effect, state) {
  return Number(effect?.heading ?? state?.mobility?.heading ?? 0) === Number(state?.mobility?.heading ?? 0);
}

function highestMagnitude(effects, level) {
  return effects.reduce((best, effect) => Math.max(best, stationEffectMagnitude(effect, level)), 0);
}

function bestEffect(effects, valueFor) {
  let best = null;
  let value = 0;
  for (const effect of effects) {
    const candidate = Math.max(0, Number(valueFor(effect)) || 0);
    if (candidate > value) {
      best = effect;
      value = candidate;
    }
  }
  return Object.freeze({ effect: best, value });
}

function wardableDamage(type, systemThreat) {
  return ENERGY_TYPES.has(String(type ?? "").toLowerCase()) || systemThreat === "lifeveil";
}

function lifeveilOnline(actor) {
  return Math.max(0, Number(shipPayload(actor)?.resources?.lifeveil?.value) || 0) > 0;
}

function focusWardMatches(effect, type, systemThreat) {
  const selection = String(effect?.selection ?? "").toLowerCase();
  return selection && (selection === String(type ?? "").toLowerCase() || selection === String(systemThreat ?? "").toLowerCase());
}

function attackVectorSolution(attackerState, solution, attackerLevel) {
  if (!solution?.arc || !attackerState) return solution;
  const vector = activeStationEffects(attackerState).filter((effect) =>
    effect.actionId === "navigator-set-attack-vector"
    && effect.selection === solution.weaponState?.mount
    && isHeadingCurrent(effect, attackerState)
  );
  if (!vector.length) return solution;
  const tolerance = 15 * highestMagnitude(vector, attackerLevel);
  const difference = Math.max(0, Number(solution.arc.difference) || 0);
  const halfWidth = Math.max(0, Number(solution.arc.halfWidth) || 0);
  const arcLegal = Boolean(solution.arc.legal || difference <= halfWidth + tolerance);
  return Object.freeze({
    ...solution,
    legal: Boolean(solution.range?.legal && arcLegal),
    arc: Object.freeze({ ...solution.arc, legal: arcLegal, vectorTolerance: tolerance })
  });
}

function attackEffectPlan(attackerState, target, solution, attackerLevel) {
  const effects = activeStationEffects(attackerState);
  const accuracy = [];
  const consumed = [];

  const issueOrder = effects.filter((effect) => effect.actionId === "captain-issue-order" && effect.selection === "battlewatch");
  if (issueOrder.length) {
    accuracy.push(...issueOrder);
    consumed.push(...issueOrder.map((effect) => effect.id));
  }

  const acquire = effects.filter((effect) => effect.actionId === "battlewatch-acquire-target" && effectMatchesTarget(effect, target));
  if (acquire.length) {
    accuracy.push(...acquire);
    consumed.push(...acquire.map((effect) => effect.id));
  }

  const coordinate = effects.filter((effect) => effect.actionId === "captain-coordinate-assault" && effectMatchesTarget(effect, target));
  if (coordinate.length) consumed.push(...coordinate.map((effect) => effect.id));

  const broadside = effects.filter((effect) =>
    effect.actionId === "battlewatch-ready-broadside"
    && effect.selection === solution.weaponState.mount
  );
  if (broadside.length) consumed.push(...broadside.map((effect) => effect.id));

  const weaponsPower = effects.filter((effect) => effect.actionId === "engineer-redistribute-power" && effect.selection === "weapons");
  if (weaponsPower.length) consumed.push(...weaponsPower.map((effect) => effect.id));

  const circumstanceBonus = highestMagnitude(accuracy, attackerLevel);
  const hardnessReduction = highestMagnitude(coordinate, attackerLevel);
  const broadsideDamage = broadside.reduce((best, effect) => Math.max(best, 2 * stationEffectMagnitude(effect, attackerLevel)), 0);
  const powerDamage = weaponsPower.reduce((best, effect) => Math.max(best, stationEffectMagnitude(effect, attackerLevel)), 0);

  return Object.freeze({
    circumstanceBonus,
    hardnessReduction,
    damageBonus: broadsideDamage + powerDamage,
    broadside,
    consumed: Object.freeze([...new Set(consumed)])
  });
}

function attackDefensePlan(targetState, targetLevel) {
  const effects = activeStationEffects(targetState);
  const evasive = effects.filter((effect) => effect.actionId === "navigator-evasive-maneuver");
  const spoil = effects.filter((effect) => effect.actionId === "battlewatch-spoil-their-aim");
  return Object.freeze({
    acBonus: highestMagnitude(evasive, targetLevel),
    attackPenalty: highestMagnitude(spoil, targetLevel),
    consumed: Object.freeze([...evasive, ...spoil].map((effect) => effect.id))
  });
}

function damageDefensePlan(targetState, targetLevel, solution, targetActor) {
  const effects = activeStationEffects(targetState);
  const brace = effects.filter((effect) => effect.actionId === "captain-brace-for-impact");
  const emergencyWard = effects.filter((effect) => effect.actionId === "veilwarden-emergency-ward");
  const reinforce = effects.filter((effect) => effect.actionId === "veilwarden-reinforce-lifeveil");
  const focus = effects.filter((effect) => effect.actionId === "veilwarden-focus-ward");
  const lifeveilPower = effects.filter((effect) => effect.actionId === "engineer-redistribute-power" && effect.selection === "lifeveil");

  const type = solution.weapon.data?.damageProfile?.type ?? solution.weapon.data?.damageProfile?.damageType ?? "damage";
  const systemThreat = solution.weapon.data?.systemThreat ?? "hull";
  const wardable = lifeveilOnline(targetActor) && wardableDamage(type, systemThreat);
  const matchingFocus = focus.filter((effect) => focusWardMatches(effect, type, systemThreat));

  const broadCandidates = wardable ? [...reinforce, ...lifeveilPower] : [];
  const broad = bestEffect(broadCandidates, (effect) => stationMitigationValue("ward", effect.shipLevel ?? targetLevel, effect.boost));
  const focused = bestEffect(matchingFocus, (effect) => stationMitigationValue("focus-ward", effect.shipLevel ?? targetLevel, effect.boost));
  const baseWard = focused.value > broad.value ? focused : broad;
  const emergency = wardable
    ? bestEffect(emergencyWard, (effect) => stationMitigationValue("emergency-ward", effect.shipLevel ?? targetLevel, effect.boost))
    : Object.freeze({ effect: null, value: 0 });
  const bracePlan = bestEffect(brace, (effect) => stationMitigationValue("brace", effect.shipLevel ?? targetLevel, effect.boost));

  return Object.freeze({
    wardable,
    wardMitigation: baseWard.value + emergency.value,
    braceMitigation: bracePlan.value,
    wardConsumed: Object.freeze(baseWard.effect ? [baseWard.effect.id] : []),
    emergencyWardConsumed: Object.freeze(emergency.effect ? [emergency.effect.id] : []),
    braceConsumed: Object.freeze(bracePlan.effect ? [bracePlan.effect.id] : [])
  });
}

async function enhancedFireAtTarget(base, weaponKey, targetReference, attackerReference = null) {
  requireGM();
  const attacker = attackerReference ? resolveCombatant(base, attackerReference) : game.combat?.combatant ?? null;
  const target = resolveCombatant(base, targetReference);
  if (!attacker || !target) throw new Error("Choose attacker and target Arkflight ship combatants.");

  const attackerLevel = shipLevel(attacker.actor);
  const targetLevel = shipLevel(target.actor);
  const attackerBefore = base.state(attacker);
  const targetAttackState = base.state(target);
  const rawSolution = base.targetingSolution(weaponKey, target, attacker);
  const solution = attackVectorSolution(attackerBefore, rawSolution, attackerLevel);
  if (!solution.range.legal) throw new Error(`${solution.weapon.name}: target is ${solution.range.label.toLowerCase()} (${solution.distanceHexes.toFixed(1)} hex).`);
  if (!solution.arc.legal) throw new Error(`${solution.weapon.name}: target is outside the ${solution.weaponState.mount ?? "fore"} ${solution.arc.arcTemplate} firing arc.`);

  const round = game.combat?.round ?? 1;
  let attackerAfter = fireWeapon(attackerBefore, weaponKey, round);
  const offense = attackEffectPlan(attackerBefore, target, solution, attackerLevel);
  const attackDefense = attackDefensePlan(targetAttackState, targetLevel);

  const battlewatch = battlewatchActor(attacker.actor);
  const perception = perceptionModifier(battlewatch);
  if (perception == null) throw new Error(`${attacker.name} needs an assigned Battlewatch officer with PF2e Perception.`);
  const attackerDerived = deriveShip(shipPayload(attacker.actor), SHIP_CATALOGS);
  const targetDerived = deriveShip(shipPayload(target.actor), SHIP_CATALOGS);
  const baseAttackBonus = shipWeaponAttackBonus({
    battlewatchPerception: perception,
    shipWeaponAttackBonus: attackerDerived.stats.weaponAttackBonus,
    install: { upgrades: solution.weaponState.upgrades }
  });
  const stationModifier = offense.circumstanceBonus - attackDefense.attackPenalty;
  const attackBonus = baseAttackBonus + stationModifier;
  const baseAC = Math.max(0, Number(targetDerived.stats.armorClass) || 0);
  const ac = baseAC + attackDefense.acBonus;
  const attack = await new Roll("1d20 + @attackBonus", { attackBonus }).evaluate();
  const die = Number(attack.dice?.[0]?.total ?? attack.terms?.find?.((term) => term?.faces === 20)?.total ?? 0);
  const degree = degreeOfSuccess(Number(attack.total), die, ac);

  attackerAfter = consumeStationEffects(attackerAfter, offense.consumed);
  if (offense.broadside.some((effect) => stationEffectProfile(effect.shipLevel ?? attackerLevel).master)) {
    attackerAfter = reduceWeaponReload(attackerAfter, weaponKey, round, 1);
  }

  let targetAfter = consumeStationEffects(targetAttackState, attackDefense.consumed);
  let damageDefense = Object.freeze({ wardable: false, wardMitigation: 0, braceMitigation: 0, wardConsumed: [], emergencyWardConsumed: [], braceConsumed: [] });
  let damage = null;

  if (degree >= 1) {
    const profile = weaponDamageProfile(solution.weapon, { upgrades: solution.weaponState.upgrades });
    const damageRoll = await new Roll(degree === 2 ? `2 * (${profile.dice})` : profile.dice).evaluate();
    const rolled = Math.max(0, Number(damageRoll.total) || 0);
    const poweredIncoming = rolled + offense.damageBonus;
    const hardnessBase = Math.max(0, Number(targetDerived.stats.hardness) || 0);
    const hardnessEffective = Math.max(0, hardnessBase - offense.hardnessReduction);

    await game.arkflight?.shipCombatReactions?.promptDamage?.({ attacker, target, solution, incoming: poweredIncoming, hardness: hardnessEffective });

    const targetLatest = base.state(target) ?? targetAttackState;
    targetAfter = consumeStationEffects(targetLatest, attackDefense.consumed);
    damageDefense = damageDefensePlan(targetAfter, targetLevel, solution, target.actor);

    const wardAbsorbed = Math.min(poweredIncoming, damageDefense.wardMitigation);
    const afterWard = Math.max(0, poweredIncoming - wardAbsorbed);
    const hardened = applyHardnessToDamage(afterWard, hardnessEffective);
    const braceAbsorbed = Math.min(hardened.hullDamage, damageDefense.braceMitigation);
    const hullDamage = Math.max(0, hardened.hullDamage - braceAbsorbed);
    const targetShip = shipPayload(target.actor);
    const before = Math.max(0, Number(targetShip.resources?.hull?.value) || 0);
    const after = Math.max(0, before - hullDamage);
    damage = Object.freeze({
      roll: damageRoll,
      rolled,
      stationDamageBonus: offense.damageBonus,
      incoming: poweredIncoming,
      wardAbsorbed,
      hardnessBase,
      hardnessEffective,
      hardnessReduced: Math.min(hardnessBase, offense.hardnessReduction),
      absorbed: hardened.absorbed,
      braceAbsorbed,
      hullDamage,
      before,
      after,
      type: profile.type ?? "damage"
    });
    if (wardAbsorbed > 0) targetAfter = consumeStationEffects(targetAfter, [...damageDefense.wardConsumed, ...damageDefense.emergencyWardConsumed]);
    if (braceAbsorbed > 0) targetAfter = consumeStationEffects(targetAfter, damageDefense.braceConsumed);
  }

  await attacker.update({ [STATE_PATH]: attackerAfter });
  if (targetAfter !== targetAttackState) await target.update({ [STATE_PATH]: targetAfter });
  if (damage) await target.actor.update({ [`flags.${MODULE_ID}.ship.resources.hull.value`]: damage.after });

  const defense = Object.freeze({ ...attackDefense, ...damageDefense });
  const esc = foundry.utils.escapeHTML;
  const modifiers = [];
  if (offense.circumstanceBonus) modifiers.push(`+${offense.circumstanceBonus} attack`);
  if (attackDefense.attackPenalty) modifiers.push(`−${attackDefense.attackPenalty} enemy aim`);
  if (attackDefense.acBonus) modifiers.push(`+${attackDefense.acBonus} target AC`);
  if (offense.hardnessReduction) modifiers.push(`−${offense.hardnessReduction} target Hardness`);
  if (solution.arc.vectorTolerance) modifiers.push(`+${solution.arc.vectorTolerance}° arc tolerance`);
  const stationLine = modifiers.length ? `<br><strong>Station effects:</strong> ${modifiers.join(" · ")}` : "";
  const damageLine = damage
    ? `<br><strong>Hull:</strong> ${damage.incoming} − ${damage.wardAbsorbed} Ward − ${damage.absorbed} Hardness${damage.hardnessReduced ? ` (${damage.hardnessBase}→${damage.hardnessEffective})` : ""} − ${damage.braceAbsorbed} Brace = ${damage.hullDamage} Hull (${damage.before} → ${damage.after})`
    : "";
  await attack.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: battlewatch }),
    flavor: `<strong>${esc(attacker.name)} fires ${esc(solution.weapon.name)} at ${esc(target.name)}</strong><br>${solution.distanceHexes.toFixed(1)} hex · ${esc(solution.range.label)} · ${esc(solution.weaponState.mount ?? "fore")} ${esc(solution.arc.arcTemplate)} arc<br>Attack ${attack.total} vs AC ${ac}: <strong>${DEGREE_LABEL[degree]}</strong>${stationLine}${damageLine}`
  });

  if (damage) {
    await damage.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: battlewatch }),
      flavor: `<strong>${esc(solution.weapon.name)} Damage — ${esc(target.name)}</strong><br>Rolled ${damage.rolled}${offense.damageBonus ? ` + ${offense.damageBonus} station damage` : ""}${damage.wardAbsorbed ? ` − ${damage.wardAbsorbed} Ward` : ""} − ${damage.absorbed} Hardness${damage.hardnessReduced ? ` after ${damage.hardnessReduced} Hardness reduction` : ""}${damage.braceAbsorbed ? ` − ${damage.braceAbsorbed} Brace` : ""} = <strong>${damage.hullDamage} Hull</strong>`
    });
  }

  Hooks.callAll("arkflightNativeShipAttackResolved", {
    combat: game.combat,
    attacker,
    target,
    solution,
    attack,
    degree,
    damage,
    offense,
    defense,
    attackerState: attackerAfter,
    targetState: targetAfter
  });

  return Object.freeze({ state: attackerAfter, attack, attackBonus, ac, degree, solution, damage, offense, defense });
}

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  const originalStationAction = base.stationAction?.bind(base);
  game.arkflight.combat = Object.freeze({
    ...base,
    targetingSolution(weaponKey, targetReference, attackerReference = null) {
      const attacker = attackerReference ? resolveCombatant(base, attackerReference) : game.combat?.combatant ?? null;
      const raw = base.targetingSolution(weaponKey, targetReference, attackerReference);
      return attacker ? attackVectorSolution(base.state(attacker), raw, shipLevel(attacker.actor)) : raw;
    },
    fireAtTarget(weaponKey, targetReference, attackerReference = null) {
      return enhancedFireAtTarget(base, weaponKey, targetReference, attackerReference);
    },
    stationAction(actionId, options = {}, reference = null) {
      if (actionId === "battlewatch-fire-weapon") {
        if (!options.weaponKey || !options.targetId) throw new Error("Fire Weapon requires a weapon and target.");
        return enhancedFireAtTarget(base, options.weaponKey, options.targetId, reference);
      }
      return originalStationAction(actionId, options, reference);
    }
  });
});
