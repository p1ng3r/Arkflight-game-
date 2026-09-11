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
import { resolveShipStrainGain } from "./ship-strain-runtime.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const COMBAT_SOCKET = `module.${MODULE_ID}`;
const TARGET_EFFECT_REQUEST = "attack-target-effect-consume-request";
const TARGET_EFFECT_RESULT = "attack-target-effect-consume-result";
const ENERGY_TYPES = new Set(["fire", "cold", "electricity", "acid", "sonic", "force"]);
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function activePrimaryGM() {
  return [...(game.users ?? [])]
    .filter((user) => user?.active && user?.isGM)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function userOwnsActor(user, actor) {
  if (!user || !actor) return false;
  if (user.isGM) return true;
  try { return actor.testUserPermission?.(user, "OWNER") === true; }
  catch (_error) { return false; }
}

function userCanUpdateDocument(user, document) {
  if (!user || !document) return false;
  if (user.isGM) return true;
  try {
    if (typeof document.canUserModify === "function") return document.canUserModify(user, "update") === true;
    return document.testUserPermission?.(user, "OWNER") === true;
  } catch (_error) {
    return false;
  }
}

function userCanResolveShipState(user, combatant) {
  if (!combatant?.actor || !userOwnsActor(user, combatant.actor) || !userCanUpdateDocument(user, combatant.actor)) return false;
  try {
    return typeof combatant?.canUserModify !== "function"
      || combatant.canUserModify(user, "update") === true;
  } catch (_error) {
    return false;
  }
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
  const reference = shipPayload(shipActor)?.crew?.stations?.battlewatch ?? null;
  if (!reference) return null;
  if (reference?.documentName === "Actor") return reference;
  return game.actors?.get?.(reference)
    ?? game.actors?.contents?.find?.((actor) => actor.uuid === reference || actor.name === reference)
    ?? null;
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

async function enhancedFireAtTarget(base, weaponKey, targetReference, attackerReference = null, {
  requesterUserId = game.user?.id ?? null
} = {}) {
  const attacker = attackerReference ? resolveCombatant(base, attackerReference) : game.combat?.combatant ?? null;
  const target = resolveCombatant(base, targetReference);
  if (!attacker || !target) throw new Error("Choose attacker and target Arkflight ship combatants.");

  const requester = game.users?.get?.(requesterUserId) ?? game.user;
  const battlewatch = battlewatchActor(attacker.actor);
  if (!requester?.isGM) {
    if (!userOwnsActor(requester, attacker.actor)) throw new Error("You must own the firing ship.");
    if (!battlewatch || !userOwnsActor(requester, battlewatch)) throw new Error("Only the assigned Battlewatch owner may fire this ship's weapons.");
  }
  if (!userCanResolveShipState(game.user, attacker)) {
    throw new Error(`You do not have permission to update ${attacker.name}'s firing state.`);
  }

  const canMutateTargetLocally = userCanResolveShipState(game.user, target);
  const primaryGM = canMutateTargetLocally ? null : activePrimaryGM();

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
  if (attackDefense.consumed.length && !canMutateTargetLocally && !primaryGM) {
    throw new Error("An active GM is required to consume this target's attack-defense effect.");
  }

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

  const targetAttackEffectIds = [...attackDefense.consumed];
  let targetAfter = targetAttackState;
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
    const damageCalculationState = consumeStationEffects(targetLatest, attackDefense.consumed);
    targetAfter = targetLatest;
    damageDefense = damageDefensePlan(damageCalculationState, targetLevel, solution, target.actor);

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
    // Ward and Brace effects are not consumed yet. They are recorded on the
    // damage ChatMessage and consumed only when an authorized user applies it.
  }

  await attacker.update({ [STATE_PATH]: attackerAfter });

  let targetEffectMutationRequested = false;
  if (targetAttackEffectIds.length && canMutateTargetLocally) {
    const latestTargetState = base.state(target) ?? targetAfter ?? targetAttackState;
    const nextTargetState = consumeStationEffects(latestTargetState, targetAttackEffectIds);
    if (nextTargetState !== latestTargetState) await target.update({ [STATE_PATH]: nextTargetState });
    targetAfter = nextTargetState;
  } else if (targetAttackEffectIds.length) {
    if (!primaryGM) throw new Error("An active GM is required to consume this target's attack-defense effect.");
    targetEffectMutationRequested = true;
    game.socket?.emit?.(COMBAT_SOCKET, {
      type: TARGET_EFFECT_REQUEST,
      userId: requester?.id ?? requesterUserId,
      combatId: game.combat?.id ?? null,
      attackerId: attacker.id,
      targetId: target.id,
      effectIds: targetAttackEffectIds
    });
  }

  const defense = Object.freeze({ ...attackDefense, ...damageDefense });
  const esc = foundry.utils.escapeHTML;
  const modifiers = [];
  if (offense.circumstanceBonus) modifiers.push(`+${offense.circumstanceBonus} attack`);
  if (attackDefense.attackPenalty) modifiers.push(`−${attackDefense.attackPenalty} enemy aim`);
  if (attackDefense.acBonus) modifiers.push(`+${attackDefense.acBonus} target AC`);
  if (offense.hardnessReduction) modifiers.push(`−${offense.hardnessReduction} target Hardness`);
  if (solution.arc.vectorTolerance) modifiers.push(`+${solution.arc.vectorTolerance}° arc tolerance`);

  const shotClass = degree === 2 ? "is-critical" : degree >= 1 ? "is-hit" : "is-miss";
  const effectChips = [
    ...modifiers,
    ...(damage?.wardAbsorbed ? [`Ward −${damage.wardAbsorbed}`] : []),
    ...(damage ? [`Hardness −${damage.absorbed}`] : []),
    ...(damage?.braceAbsorbed ? [`Brace −${damage.braceAbsorbed}`] : [])
  ];
  const effectLine = effectChips.length
    ? `<div class="arkflight-chat-shot-effects">${effectChips.map((entry) => `<span class="arkflight-chat-chip">${esc(entry)}</span>`).join("")}</div>`
    : "";
  const damageLine = damage
    ? `<div class="arkflight-chat-shot-damage"><span>${damage.incoming} incoming → ${damage.hullDamage} after mitigation</span><strong class="arkflight-chat-damage-final">${damage.hullDamage} Hull</strong><span>${damage.before} → ${damage.after}</span></div>`
    : "";
  const compactFlavor = `<div class="arkflight-chat-card arkflight-attack-chat ${shotClass}">
    <div class="arkflight-chat-shot-head"><strong>${esc(solution.weapon.name)} → ${esc(target.name)}</strong><span>${esc(attacker.name)}</span></div>
    <div class="arkflight-chat-shot-meta"><span>${solution.distanceHexes.toFixed(1)} hex</span><span>${esc(solution.range.label)}</span><span>${esc(solution.weaponState.mount ?? "fore")} · ${esc(solution.arc.arcTemplate)}</span></div>
    <div class="arkflight-chat-shot-result"><strong>Attack ${attack.total} vs AC ${ac}</strong><span class="arkflight-chat-outcome">${esc(DEGREE_LABEL[degree])}</span></div>
    ${effectLine}${damageLine}
  </div>`;

  if (damage) {
    const damageEffectIds = [
      ...(damage.wardAbsorbed > 0 ? [...damageDefense.wardConsumed, ...damageDefense.emergencyWardConsumed] : []),
      ...(damage.braceAbsorbed > 0 ? damageDefense.braceConsumed : [])
    ];
    const damageEffectSnapshots = activeStationEffects(base.state(target) ?? targetAfter ?? targetAttackState)
      .filter((effect) => damageEffectIds.includes(effect.id))
      .map((effect) => ({ ...effect }));

    // A successful attack produces one combined chat message. The damage roll
    // remains visible for dice transparency; attack/AC/mitigation live in its
    // compact flavor block instead of creating a second full roll card.
    await damage.roll.toMessage({
      user: requester?.id ?? requesterUserId,
      speaker: ChatMessage.getSpeaker({ actor: battlewatch }),
      flavor: compactFlavor,
      flags: {
        [MODULE_ID]: {
          shipDamage: {
            combatId: game.combat?.id ?? null,
            attackerId: attacker.id,
            targetId: target.id,
            targetActorId: target.actor?.id ?? null,
            targetName: target.name,
            weaponName: solution.weapon.name,
            degree,
            systemThreat: solution.weapon.data?.systemThreat ?? "hull",
            hullDamage: damage.hullDamage,
            effectIds: damageEffectIds,
            effectSnapshots: damageEffectSnapshots
          }
        }
      }
    });
  } else {
    await attack.toMessage({
      user: requester?.id ?? requesterUserId,
      speaker: ChatMessage.getSpeaker({ actor: battlewatch }),
      flavor: compactFlavor
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
    targetState: targetAfter,
    targetEffectMutationRequested
  });

  return Object.freeze({ state: attackerAfter, attack, attackBonus, ac, degree, solution, damage, offense, defense, targetEffectMutationRequested });
}

function damageApplicationRecord(actor, messageId) {
  return actor?.flags?.[MODULE_ID]?.chatDamageApplications?.[messageId] ?? null;
}

function canApplyShipDamage(user, actor, combatant) {
  if (!user || !actor) return false;
  if (user.isGM) return true;
  if (!userOwnsActor(user, actor) || !userCanUpdateDocument(user, actor)) return false;
  try {
    return typeof combatant?.canUserModify !== "function"
      || combatant.canUserModify(user, "update") === true;
  } catch (_error) {
    return false;
  }
}

function restoreConsumedEffects(state, effects = []) {
  if (!state || !effects.length) return state;
  const runtime = state.stationRuntime ?? {};
  const current = [...(runtime.effects ?? [])];
  const ids = new Set(current.map((effect) => effect.id));
  for (const effect of effects) {
    if (effect?.id && !ids.has(effect.id)) {
      current.push({ ...effect });
      ids.add(effect.id);
    }
  }
  return Object.freeze({
    ...state,
    stationRuntime: Object.freeze({
      ...runtime,
      used: Object.freeze({ ...(runtime.used ?? {}) }),
      effects: Object.freeze(current.map((effect) => Object.freeze({ ...effect })))
    })
  });
}

function damageTargetFromFlag(flag = {}) {
  const combat = game.combats?.get?.(flag.combatId) ?? game.combat ?? null;
  const combatant = combat?.combatants?.get?.(flag.targetId)
    ?? combat?.combatants?.find?.((entry) => entry.id === flag.targetId)
    ?? null;
  const actor = combatant?.actor ?? game.actors?.get?.(flag.targetActorId) ?? null;
  return Object.freeze({ combat, combatant, actor });
}

function appliedDamageAmount(baseDamage, mode) {
  const value = Math.max(0, Math.trunc(Number(baseDamage) || 0));
  if (mode === "half") return Math.floor(value / 2);
  if (mode === "double") return value * 2;
  return value;
}

function damageConsequenceSnapshot(ship) {
  return Object.freeze({
    hull: structuredClone(ship?.resources?.hull ?? null),
    lifeveil: structuredClone(ship?.resources?.lifeveil ?? null),
    morale: structuredClone(ship?.resources?.morale ?? null),
    strain: structuredClone(ship?.resources?.strain ?? null),
    shipConditions: structuredClone(ship?.shipConditions ?? {})
  });
}

function damageSnapshotMatches(ship, snapshot) {
  if (!snapshot) return false;
  return JSON.stringify(damageConsequenceSnapshot(ship)) === JSON.stringify(snapshot);
}

async function resolveDeferredDamageConsequences(ship, flag, amount, actor = null) {
  let next = structuredClone(ship);
  const notes = [];
  const beforeHull = Math.max(0, Number(next.resources?.hull?.value) || 0);
  const requestedAfter = Math.max(0, beforeHull - amount);
  next.resources ??= {};
  next.resources.hull = { ...(next.resources.hull ?? {}), value: requestedAfter };

  // Normal weapon hits only damage Hull. Critical hits add one point of
  // ship-wide Strain; Strain is the universal route into Ship Conditions.
  if (Number(flag.degree) === 2) {
    const outcome = await resolveShipStrainGain(next, {
      amount: 1,
      currentStrain: next.resources?.strain?.value ?? 0,
      strainMax: next.resources?.strain?.max ?? 0,
      sourceLabel: `${flag.weaponName ?? "Weapon"} Critical Hit`,
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : null
    });
    next = structuredClone(outcome.ship);
    notes.push("Critical hit: +1 Strain.");
    notes.push(...outcome.notes);
  }

  return Object.freeze({ ship: next, notes: Object.freeze(notes) });
}

async function applyShipDamageMessage(message, mode = "apply") {
  const flag = message?.flags?.[MODULE_ID]?.shipDamage ?? null;
  if (!flag) return;
  const { combatant, actor } = damageTargetFromFlag(flag);
  if (!actor || !combatant) throw new Error("Arkflight damage target is no longer available.");
  if (!canApplyShipDamage(game.user, actor, combatant)) {
    throw new Error(`You do not have permission to apply damage to ${actor.name}.`);
  }
  if (damageApplicationRecord(actor, message.id)) {
    throw new Error("This Arkflight damage message has already been applied.");
  }

  const ship = shipPayload(actor);
  if (!ship) throw new Error(`${actor.name} has no Arkflight ship state.`);
  const beforeSnapshot = damageConsequenceSnapshot(ship);
  const beforeHull = Math.max(0, Number(ship.resources?.hull?.value) || 0);
  const amount = appliedDamageAmount(flag.hullDamage, mode);
  const consequence = await resolveDeferredDamageConsequences(ship, flag, amount, actor);
  const afterSnapshot = damageConsequenceSnapshot(consequence.ship);
  const afterHull = Math.max(0, Number(consequence.ship.resources?.hull?.value) || 0);

  const beforeState = game.arkflight?.combat?.state?.(combatant) ?? null;
  const effectIds = Array.isArray(flag.effectIds) ? flag.effectIds.filter(Boolean) : [];
  const afterState = beforeState && effectIds.length ? consumeStationEffects(beforeState, effectIds) : beforeState;
  const snapshots = Array.isArray(flag.effectSnapshots) ? flag.effectSnapshots.map((effect) => ({ ...effect })) : [];

  if (afterState && afterState !== beforeState) await combatant.update({ [STATE_PATH]: afterState });
  await actor.update({
    [`flags.${MODULE_ID}.ship.resources.hull`]: consequence.ship.resources?.hull ?? ship.resources?.hull,
    [`flags.${MODULE_ID}.ship.resources.lifeveil`]: consequence.ship.resources?.lifeveil ?? ship.resources?.lifeveil,
    [`flags.${MODULE_ID}.ship.resources.morale`]: consequence.ship.resources?.morale ?? ship.resources?.morale,
    [`flags.${MODULE_ID}.ship.resources.strain`]: consequence.ship.resources?.strain ?? ship.resources?.strain,
    [`flags.${MODULE_ID}.ship.shipConditions`]: consequence.ship.shipConditions ?? ship.shipConditions,
    [`flags.${MODULE_ID}.chatDamageApplications.${message.id}`]: {
      beforeHull,
      afterHull,
      amount,
      mode,
      degree: Number(flag.degree ?? 0),
      systemThreat: flag.systemThreat ?? "hull",
      beforeSnapshot,
      afterSnapshot,
      effectSnapshots: snapshots,
      consequenceNotes: [...consequence.notes],
      appliedBy: game.user?.id ?? null
    }
  });

  const damage = Object.freeze({ hullDamage: amount, before: beforeHull, after: afterHull });
  Hooks.callAll("arkflightChatDamageApplied", { message, combatant, actor, amount, mode, beforeHull, afterHull, degree: Number(flag.degree ?? 0), systemThreat: flag.systemThreat ?? "hull", notes: consequence.notes });
  Hooks.callAll("arkflightShipDamageStateChanged", { actor, target: combatant, degree: Number(flag.degree ?? 0), damage, notes: consequence.notes, chatDamage: true });
  ui.notifications?.info?.(`${actor.name}: ${amount} Hull damage applied (${beforeHull} → ${afterHull}).`);
}

async function undoShipDamageMessage(message) {
  const flag = message?.flags?.[MODULE_ID]?.shipDamage ?? null;
  if (!flag) return;
  const { combatant, actor } = damageTargetFromFlag(flag);
  if (!actor || !combatant) throw new Error("Arkflight damage target is no longer available.");
  if (!canApplyShipDamage(game.user, actor, combatant)) {
    throw new Error(`You do not have permission to undo damage on ${actor.name}.`);
  }

  const record = damageApplicationRecord(actor, message.id);
  if (!record) throw new Error("This Arkflight damage message has not been applied.");
  const currentShip = shipPayload(actor);
  if (!damageSnapshotMatches(currentShip, record.afterSnapshot)) {
    throw new Error("Ship damage state changed after this result was applied; undo it manually to avoid overwriting later changes.");
  }

  const currentState = game.arkflight?.combat?.state?.(combatant) ?? null;
  const restoredState = restoreConsumedEffects(currentState, record.effectSnapshots ?? []);
  if (restoredState && restoredState !== currentState) await combatant.update({ [STATE_PATH]: restoredState });

  const beforeSnapshot = record.beforeSnapshot;
  await actor.update({
    [`flags.${MODULE_ID}.ship.resources.hull`]: beforeSnapshot?.hull,
    [`flags.${MODULE_ID}.ship.resources.lifeveil`]: beforeSnapshot?.lifeveil,
    [`flags.${MODULE_ID}.ship.resources.morale`]: beforeSnapshot?.morale,
    [`flags.${MODULE_ID}.ship.resources.strain`]: beforeSnapshot?.strain,
    [`flags.${MODULE_ID}.ship.shipConditions`]: beforeSnapshot?.shipConditions,
    [`flags.${MODULE_ID}.chatDamageApplications.-=${message.id}`]: null
  });

  Hooks.callAll("arkflightChatDamageUndone", { message, combatant, actor, record });
  Hooks.callAll("arkflightShipDamageStateChanged", { actor, target: combatant, undoChatDamage: true, notes: ["Chat damage transaction undone."] });
  ui.notifications?.info?.(`${actor.name}: Arkflight chat damage undone.`);
}

function renderShipDamageControls(message, html) {
  const flag = message?.flags?.[MODULE_ID]?.shipDamage ?? null;
  if (!flag || !(html instanceof HTMLElement)) return;

  const existing = html.querySelector(".arkflight-ship-damage-controls");
  existing?.remove();

  const { combatant, actor } = damageTargetFromFlag(flag);
  if (!actor || !combatant) return;
  const authorized = canApplyShipDamage(game.user, actor, combatant);
  const record = damageApplicationRecord(actor, message.id);

  const controls = document.createElement("div");
  controls.className = "arkflight-ship-damage-controls";

  if (record) {
    const status = document.createElement("strong");
    status.className = "arkflight-damage-applied";
    status.textContent = `Applied ${record.amount} Hull · ${flag.targetName ?? actor.name}`;
    controls.append(status);

    const undo = document.createElement("button");
    undo.type = "button";
    undo.dataset.arkflightDamageAction = "undo";
    undo.textContent = "Undo";
    undo.disabled = !authorized;
    controls.append(undo);
  } else {
    const base = Math.max(0, Math.trunc(Number(flag.hullDamage) || 0));
    for (const [mode, label] of [
      ["apply", `Apply ${base}`],
      ["half", `Half ${Math.floor(base / 2)}`],
      ["double", `Double ${base * 2}`]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.arkflightDamageAction = mode;
      button.textContent = label;
      button.disabled = !authorized;
      button.title = authorized
        ? `Apply this Arkflight damage result to ${flag.targetName ?? actor.name}.`
        : `Only a GM or Owner of ${flag.targetName ?? actor.name} may apply this damage.`;
      controls.append(button);
    }
  }

  controls.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("[data-arkflight-damage-action]");
    if (!button || button.disabled) return;
    button.disabled = true;
    try {
      if (button.dataset.arkflightDamageAction === "undo") await undoShipDamageMessage(message);
      else await applyShipDamageMessage(message, button.dataset.arkflightDamageAction);
      renderShipDamageControls(message, html);
    } catch (error) {
      console.error("Arkflight | Chat damage action failed", error);
      ui.notifications?.error?.(error?.message ?? "Arkflight chat damage action failed.");
      button.disabled = false;
    }
  });

  const host = html.querySelector(".arkflight-attack-chat")
    ?? html.querySelector(".message-content, .chat-message-content, .message-header")
    ?? html;
  host.append(controls);
}

async function applyProtectedTargetEffects(base, payload = {}) {
  if (payload?.type === TARGET_EFFECT_RESULT) {
    if (payload.userId === game.user?.id && payload.ok === false) {
      ui.notifications?.error(payload.message ?? "Arkflight could not consume the target's attack-defense effect.");
    }
    return;
  }

  if (!game.user?.isGM || payload?.type !== TARGET_EFFECT_REQUEST) return;
  const primary = activePrimaryGM();
  if (!primary || primary.id !== game.user.id) return;

  const requester = game.users?.get?.(payload.userId) ?? null;
  const combat = game.combats?.get?.(payload.combatId) ?? game.combat;
  const attacker = combat?.combatants?.get?.(payload.attackerId)
    ?? combat?.combatants?.find?.((entry) => entry.id === payload.attackerId)
    ?? null;
  const target = combat?.combatants?.get?.(payload.targetId)
    ?? combat?.combatants?.find?.((entry) => entry.id === payload.targetId)
    ?? null;

  const reply = (ok, message) => game.socket?.emit?.(COMBAT_SOCKET, {
    type: TARGET_EFFECT_RESULT,
    userId: payload.userId ?? null,
    combatId: combat?.id ?? payload.combatId ?? null,
    attackerId: payload.attackerId ?? null,
    targetId: payload.targetId ?? null,
    ok,
    message
  });

  if (!requester?.active || !combat || !attacker || !target || combat.id !== payload.combatId) {
    reply(false, "Target attack-defense effect could not resolve its combatants.");
    return;
  }
  const battlewatch = battlewatchActor(attacker.actor);
  if (!userOwnsActor(requester, attacker.actor) || !battlewatch || !userOwnsActor(requester, battlewatch)) {
    reply(false, "Requester no longer controls the firing ship's Battlewatch.");
    return;
  }

  try {
    const effectIds = Array.isArray(payload.effectIds) ? payload.effectIds.filter((id) => typeof id === "string") : [];
    const currentTargetState = base.state(target);
    if (currentTargetState && effectIds.length) {
      const nextTargetState = consumeStationEffects(currentTargetState, effectIds);
      if (nextTargetState !== currentTargetState) await target.update({ [STATE_PATH]: nextTargetState });
    }
    reply(true, "Target attack-defense effect consumed.");
  } catch (error) {
    console.error("Arkflight | Protected target effect consumption failed", error);
    reply(false, error?.message ?? "Protected target effect consumption failed.");
  }
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
    fireAtTarget(weaponKey, targetReference, attackerReference = null, options = {}) {
      return enhancedFireAtTarget(base, weaponKey, targetReference, attackerReference, options);
    },
    stationAction(actionId, options = {}, reference = null) {
      return originalStationAction(actionId, options, reference);
    }
  });
  game.socket?.on?.(COMBAT_SOCKET, (payload) => applyProtectedTargetEffects(base, payload));
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  renderShipDamageControls(message, html);
});
