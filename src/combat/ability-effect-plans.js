import { activeStationEffects } from "./station-action-state.js";
import { stationBonus } from "./station-effect-rules.js";
const matches = (e, target) => e.selection === target?.id || e.selection === target?.actorId || e.selection === target?.actor?.id;
const magnitude = (e, fallback) => stationBonus(e.shipLevel ?? fallback);
const max = (effects, field, fallback = () => 0) => Math.max(0, ...effects.map(e => Number(e[field] ?? fallback(e))));
const signed = (effects, field, fallback = () => 0) => max(effects, field, fallback) + Math.min(0, ...effects.map(e => Number(e[field] ?? fallback(e))));

export function shipAttackPlan(state, target, solution, level, weaponKeys = null) {
  const effects = activeStationEffects(state), mount = typeof solution === "string" ? solution : solution.weaponState.mount;
  const keys = weaponKeys ?? [solution.weaponState?.key];
  const order = effects.filter(e => e.actionId === "captain-issue-order" && e.selection === "battlewatch");
  const acquire = effects.filter(e => e.actionId === "battlewatch-acquire-target" && matches(e, target));
  const weaponPenalty = effects.filter(e => e.weaponKey && keys.includes(e.weaponKey));
  const coordinate = effects.filter(e => e.actionId === "captain-coordinate-assault" && matches(e, target));
  const broadside = effects.filter(e => e.actionId === "battlewatch-ready-broadside" && e.selection === mount);
  const power = effects.filter(e => e.actionId === "engineer-redistribute-power" && e.selection === "weapons");
  const salvo = weaponKeys ? effects.filter(e => e.salvoDamagePerWeapon != null) : [];
  return {
    circumstanceBonus: signed([...order, ...acquire, ...weaponPenalty], "attackBonus", e => magnitude(e, level)),
    hardnessReduction: signed(coordinate, "hardnessReduction", e => magnitude(e, level)) + max(broadside, "hardnessReduction"),
    damageBonus: max(broadside, "damageBonus", e => 2*magnitude(e, level)) + max(power, "damageBonus", e => magnitude(e, level)) + max(salvo, "salvoDamagePerWeapon") * (weaponKeys?.length ?? 0),
    reloadReduction: max(salvo, "reloadReduction"), broadside,
    consumed: [...new Set([...order, ...acquire, ...weaponPenalty, ...coordinate, ...broadside, ...power, ...salvo].map(e => e.id))]
  };
}

export function shipAttackDefensePlan(state, level) {
  const effects = activeStationEffects(state);
  const evasive = effects.filter(e => e.actionId === "navigator-evasive-maneuver");
  const spoil = effects.filter(e => e.actionId === "battlewatch-spoil-their-aim" && e.attackPenalty != null || e.actionId === "battlewatch-spoil-their-aim" && !e.hardnessBonus);
  return { acBonus: signed(evasive, "acBonus", e => magnitude(e, level)), attackPenalty: signed(spoil, "attackPenalty", e => magnitude(e, level)), consumed: [...evasive, ...spoil].map(e => e.id) };
}

export function shipDamageDefensePlan(state, level, solution, _actor) {
  const payload = _actor?.flags?.["arkflight-game"]?.ship;
  const online = !payload || Number(payload.resources?.lifeveil?.value ?? 100) >= 10;
  const effects = activeStationEffects(state).filter(e => online || !(e.station === "veilwarden" || e.actionId.startsWith("veilwarden-") || e.actionId === "engineer-redistribute-power" && e.selection === "lifeveil"));
  const type = solution.weapon.data?.damageProfile?.type ?? "damage", threat = solution.weapon.data?.systemThreat ?? "hull";
  const wardable = ["fire", "cold", "electricity", "acid", "sonic", "force"].includes(type) || threat === "lifeveil";
  const best = (candidates, valueFor) => candidates.reduce((r, e) => valueFor(e) > r.value ? { effect: e, value: valueFor(e) } : r, { effect: null, value: 0 });
  const wards = effects.filter(e => e.actionId === "veilwarden-reinforce-lifeveil" && (e.wardAllDamage || wardable) || e.actionId === "engineer-redistribute-power" && e.selection === "lifeveil" && wardable || e.actionId === "veilwarden-focus-ward" && [type, threat].includes(e.selection));
  const ward = best(wards, e => Number(e.mitigation ?? (e.actionId === "veilwarden-focus-ward" ? 3 : 2)*magnitude(e, level)));
  const emergency = best(wardable ? effects.filter(e => e.actionId === "veilwarden-emergency-ward") : [], e => Number(e.mitigation ?? 4*magnitude(e, level)));
  const brace = best(effects.filter(e => e.actionId === "captain-brace-for-impact"), e => Number(e.mitigation ?? 3*magnitude(e, level)));
  const hard = best(effects.filter(e => e.hardnessBonus), e => e.hardnessBonus);
  return { wardable, wardMitigation: ward.value+emergency.value, braceMitigation: brace.value, hardnessBonus: hard.value,
    wardConsumed: ward.effect && ward.effect.charges != null ? [ward.effect.id] : [], emergencyWardConsumed: emergency.effect ? [emergency.effect.id] : [], braceConsumed: brace.effect ? [brace.effect.id] : [], hardnessConsumed: hard.effect ? [hard.effect.id] : [] };
}

export function abilityVectorSolution(state, solution, level) {
  if (!solution?.arc) return solution;
  const effects = activeStationEffects(state).filter(e => e.actionId === "navigator-set-attack-vector" && e.selection === solution.weaponState?.mount && Number(e.heading) === Number(state.mobility.heading));
  if (!effects.length) return solution;
  const tolerance = signed(effects, "arcTolerance", e => 15*magnitude(e, level));
  const legal = Number(solution.arc.difference) <= Math.max(0, Number(solution.arc.halfWidth) + tolerance);
  return { ...solution, legal: Boolean(solution.range?.legal && legal), arc: { ...solution.arc, legal, vectorTolerance: tolerance } };
}
