import { SHIP_ABILITIES } from "../content/station-abilities.js";
import { normalizeAbilityLoadouts, abilityEquipped } from "../ship/ability-loadouts.js";
import { isFaultRepairSelection, repairSystemFault, systemFaultModifiers, systemOperationBlock } from "../ship/system-damage.js";
import { improveShipCondition } from "../ship/ship-conditions.js";
import { applyFreeHelmAllowance } from "./helm-rules.js";
import { degreeOfSuccess } from "./check-resolution.js";

export const shipAbilityBonus = level => Math.ceil(Math.max(1, Math.min(20, Number(level) || 1)) / 4);
export const shipAbilityDC = level => 9 + shipAbilityBonus(level);
export const PUSH_RESOURCES = Object.freeze({ captain: "morale", engineer: "strain", navigator: "supplies", veilwarden: "lifeveil", battlewatch: "hull" });
const clone = v => structuredClone(v);
const half = n => Math.ceil(n / 2);
const initialRuntime = state => ({ round: 0, turnRound: Number(String(state.turnKey ?? "").split(":")[1]) || 0, used: {}, battleUsed: {}, readyRounds: {}, effects: [], temporaryApMaxBonus: 0, ...clone(state.stationRuntime ?? {}) });

export function abilityAvailability(ship, state, id, round = 1, { push = false } = {}) {
  const a = SHIP_ABILITIES[id];
  if (!a || !state) return { ok: false, reason: "combatant-required" };
  if (!abilityEquipped(ship, id)) return { ok: false, reason: "ability-not-equipped" };
  const blocked = systemOperationBlock(ship, a);
  if (blocked) return { ok: false, reason: blocked };
  const rt = initialRuntime(state);
  if (a.tier === "signature" && rt.battleUsed[id]) return { ok: false, reason: "once-per-battle" };
  if (Number(rt.readyRounds[id] ?? 0) > round) return { ok: false, reason: "cooldown", readyRound: rt.readyRounds[id] };
  if (rt.used[id] === round) return { ok: false, reason: "once-per-round" };
  if (a.cost.ap > Number(state.economy?.ap?.value ?? 0)) return { ok: false, reason: "insufficient-ap" };
  if (a.cost.rp > Number(state.economy?.rp?.value ?? 0)) return { ok: false, reason: "insufficient-rp" };
  for (const key of ["morale", "supplies", "lifeveil"]) {
    const extra = push && PUSH_RESOURCES[a.rules.originStation ?? a.station] === key ? key === "supplies" ? 1 : 5 : 0;
    if (Number(a.rules[key] ?? 0) + extra > Number(ship.resources?.[key]?.value ?? 0)) return { ok: false, reason: `insufficient-${key}` };
  }
  const hullPush = push && PUSH_RESOURCES[a.rules.originStation ?? a.station] === "hull" ? 2 * shipAbilityBonus(ship.progression?.level) : 0;
  if (hullPush && Number(ship.resources?.hull?.value ?? 0) <= hullPush) return { ok: false, reason: "insufficient-hull" };
  return { ok: true, reason: null };
}

export function abilityRollModifiers(state, station, level, { push = false, ship = null } = {}) {
  const faults = systemFaultModifiers(ship);
  const faultPenalty = (faults.stations[station] ?? 0) + (faults.stats.allStationBonus ?? 0);
  const effects = state.stationRuntime?.effects ?? [];
  const orders = effects.filter(e => e.actionId === "captain-issue-order" && e.selection === station);
  const bonus = Math.max(0, ...orders.map(e => Number(e.attackBonus ?? shipAbilityBonus(e.shipLevel ?? level))));
  const penalty = Math.min(0, ...orders.map(e => Number(e.attackBonus ?? 0)));
  const echoes = effects.filter(e => e.abilityEcho && e.station === station);
  const high = echoes.some(e => e.abilityEcho === "higher"), low = echoes.some(e => e.abilityEcho === "lower");
  return { modifier: shipAbilityBonus(level) + bonus + penalty + faultPenalty + (push ? 2 : 0), rollTwice: high === low ? null : high ? "higher" : "lower", consumed: [...orders, ...echoes].map(e => e.id) };
}

export function abilityDegree(die, modifier, level) {
  return degreeOfSuccess(Number(die) + Number(modifier), Number(die), shipAbilityDC(level));
}

export function applyAbilityStrainGuards(state, amount, station = null) {
  const guards = (state.stationRuntime?.effects ?? []).filter(e => e.resourceGuard === "strain" || e.actionId === "engineer-emergency-bypass" && station === "engineer");
  const guard = guards.sort((a, b) => Number(b.guardAmount ?? b.mitigation) - Number(a.guardAmount ?? a.mitigation))[0];
  if (!amount || !guard) return { state, amount };
  const next = clone(state);
  next.stationRuntime.effects = next.stationRuntime.effects.filter(e => e.id !== guard.id);
  return { state: next, amount: Math.max(0, amount - Number(guard.guardAmount ?? guard.mitigation ?? 1)) };
}

export function applyAbilityLossGuards(before, after, state) {
  const ship = clone(after), next = clone(state);
  for (const key of ["morale", "lifeveil"]) {
    const loss = Math.max(0, Number(before.resources?.[key]?.value ?? 0) - Number(ship.resources?.[key]?.value ?? 0));
    const guards = next.stationRuntime?.effects?.filter(e => e.resourceGuard === key) ?? [];
    if (!loss || !guards.length) continue;
    const guard = guards.reduce((best, e) => Number(e.guardAmount) > Number(best?.guardAmount ?? 0) ? e : best, null);
    ship.resources[key].value += Math.min(loss, guard.guardAmount);
    next.stationRuntime.effects = next.stationRuntime.effects.filter(e => e.id !== guard.id);
  }
  return { ship, state: next };
}

/** All dice are supplied by the trusted Foundry adapter; this pure function is testable. */
export function resolveShipAbility({ ship: inputShip, state: inputState, id, degree, die = 1, recoveryDice = [], selection = null, round = 1, push = false, rollEffectIds = [] }) {
  const a = SHIP_ABILITIES[id];
  const availability = abilityAvailability(inputShip, inputState, id, round, { push });
  if (!availability.ok) throw new Error(`${a?.name ?? id}: ${availability.reason}`);
  if (![-1, 0, 1, 2].includes(degree)) throw new Error("Invalid ability degree.");
  let ship = clone(inputShip), state = clone(applyFreeHelmAllowance(inputState));
  ship.abilities = normalizeAbilityLoadouts(ship);
  state.stationRuntime = initialRuntime(state);
  const rt = state.stationRuntime, b = shipAbilityBonus(ship.progression?.level), level = Number(ship.progression?.level ?? 1);
  const good = degree >= 1, critical = degree === 2, bad = degree === -1;
  const notes = [], requestedStrain = { amount: 0 }, effectCount = () => rt.effects.length;
  const effect = (actionId, fields, charges = 1, persistent = a.tier === "signature") => {
    const e = { id: `${id}:${round}:${effectCount() + 1}`, actionId, station: a.rules.originStation ?? a.station, name: a.name, timing: a.timing, selection, createdRound: round, shipLevel: level, boost: 0, charges, expiresRound: persistent ? null : round + 1, expiresTurn: persistent ? null : Number(rt.turnRound) + 1, signature: persistent, heading: state.mobility.heading, ...fields };
    rt.effects.push(e); return e;
  };
  const change = (key, amount, protect = true) => {
    const resource = ship.resources[key];
    if (!resource) throw new Error(`Missing ${key} resource.`);
    const previous = Number(resource.value ?? 0), max = Number(resource.max ?? (key === "morale" || key === "lifeveil" ? 100 : previous));
    let loss = -Math.min(0, amount);
    const guard = rt.effects.filter(e => e.resourceGuard === key).sort((x, y) => Number(y.guardAmount) - Number(x.guardAmount))[0];
    if (protect && loss && guard) { loss -= Math.min(loss, Number(guard.guardAmount)); rt.effects = rt.effects.filter(e => e.id !== guard.id); amount = -loss; }
    resource.value = Math.max(0, Math.min(max, previous + amount));
    notes.push(`${key}: ${previous} → ${resource.value}`);
  };
  const strain = amount => {
    const guarded = applyAbilityStrainGuards(state, amount, a.rules.originStation ?? a.station);
    rt.effects = guarded.state.stationRuntime.effects;
    requestedStrain.amount += guarded.amount;
  };
  const movement = (amount, maneuver = 0) => { state.mobility.movement.allowance += amount; state.mobility.maneuver.allowance += maneuver; notes.push(`+${amount} movement; +${maneuver} maneuver steps`); };
  const numericDie = Math.trunc(Number(die));
  if (a.rules.recoveryDie && (!Number.isFinite(numericDie) || numericDie < 1 || numericDie > a.rules.recoveryDie)) throw new Error("Invalid recovery die.");
  const recover = amount => good ? amount : half(amount);
  const targetRequired = a.rules.chooseTarget;
  if (targetRequired && !selection) throw new Error("Choose a target.");
  if (a.rules.chooseFacing && !(Array.isArray(a.rules.chooseFacing) ? a.rules.chooseFacing : ["fore", "port", "starboard", "aft"]).includes(selection)) throw new Error("Choose a legal facing.");
  if (a.rules.chooseStation && (!Object.keys(ship.abilities.equipped).includes(selection) || ["captain", "reactions"].includes(selection))) throw new Error("Choose another station.");
  if (a.rules.chooseSystem && !["hull", "drive", "weapons", "lifeveil"].includes(selection) && !isFaultRepairSelection(ship, selection)) throw new Error("Choose an active fault or legal repair system.");
  state.economy.ap.value -= a.cost.ap;
  state.economy.rp.value -= a.cost.rp;
  if (a.rules.supplies) change("supplies", -a.rules.supplies, false);
  if (id === "veilwarden-healing-lifeveil" || id === "veilwarden-emergency-ward") change("lifeveil", -a.rules.lifeveil, false);
  if (push) {
    const key = PUSH_RESOURCES[a.rules.originStation ?? a.station], multiplier = bad ? 2 : 1;
    if (key === "strain") strain(multiplier); else change(key, -multiplier*(key === "hull" ? 2*b : key === "supplies" ? 1 : 5), false);
    notes.push(`Push It: +2 to ability check; ${key} cost${bad ? " doubled" : ""}`);
  }
  switch (id) {
    case "captain-issue-order": effect(id, { attackBonus: bad ? -1 : good ? b : half(b) }, critical ? 2 : 1); break;
    case "captain-rally-crew":
      if (bad) change("morale", -5); else { change("morale", Math.min(40, recover(numericDie * b))); if (critical) effect(id, { resourceGuard: "morale", guardAmount: 5 }); } break;
    case "captain-coordinate-assault": effect(id, { hardnessReduction: bad ? -1 : b + (critical ? 1 : 0) }, good ? 2 : 1); break;
    case "captain-drive-the-crew": {
      change("morale", -({2:5,1:20,0:25,"-1":30})[degree], false); strain(2);
      state.economy.ap.value += 3; state.economy.ap.max += 2; rt.temporaryApMaxBonus += 2; break;
    }
    case "engineer-vent-strain":
      if (bad) strain(1); else { const amount = recover(numericDie + b); state.strain.value = Math.max(0, state.strain.value - amount); ship.resources.strain.value = state.strain.value; notes.push(`Vent ${amount} Strain`); if (critical) effect(id, { resourceGuard: "strain", guardAmount: 1 }); } break;
    case "engineer-overcharge-arkengine": movement(state.mobility.speed, state.mobility.maneuverability); strain(3 - degree); break;
    case "engineer-redistribute-power": {
      const routes = Array.isArray(selection) ? selection : String(selection ?? "").split(",").filter(Boolean);
      const allowed = level >= 10 ? 2 : 1;
      if (!routes.length || routes.length > allowed || new Set(routes).size !== routes.length || routes.some(r => !["propulsion", "weapons", "lifeveil"].includes(r))) throw new Error("Choose eligible different power routes.");
      if (critical) { const extra = ["propulsion", "weapons", "lifeveil"].find(r => !routes.includes(r)); if (extra) routes.push(extra); }
      for (const route of routes) {
        if (route === "propulsion") movement(good ? b : half(b), 1);
        else effect(id, { selection: route, damageBonus: route === "weapons" ? good ? b : half(b) : 0, mitigation: route === "lifeveil" ? good ? 2 * b : b : 0, power: true }, 2);
      }
      strain(bad ? 2 : 1); break;
    }
    case "engineer-full-synchronization":
      movement(half(state.mobility.speed), 1); strain(2);
      effect("engineer-redistribute-power", { selection: "weapons", damageBonus: good ? 2*b : b, power: true }, critical ? 3 : bad ? 1 : 2, true);
      effect("engineer-redistribute-power", { selection: "lifeveil", mitigation: good ? 4*b : 2*b, power: true }, critical ? 3 : bad ? 1 : 2, true); break;
    case "navigator-charted-course": movement(half(state.mobility.speed), critical ? 2 : good ? 1 : 0); if (bad) change("supplies", -1); break;
    case "navigator-set-attack-vector": {
      const normal = Math.min(45, 15*b); effect(id, { arcTolerance: bad ? -15 : critical ? Math.min(60, normal+15) : good ? normal : half(normal), charges: null }); break;
    }
    case "navigator-slip-the-net":
      if (!state.engagement?.mooredTo) throw new Error("Slip the Net requires a grapple.");
      state.abilityBreakGrapple = state.engagement.mooredTo; movement(critical ? state.mobility.speed : good ? half(state.mobility.speed) : 0); if (bad) change("supplies", -1); break;
    case "navigator-turn-between-heartbeats":
      movement(critical ? state.mobility.speed+b : good ? state.mobility.speed : half(state.mobility.speed), 6); state.mobility.extraordinaryMovement = true; if (bad) change("supplies", -2); break;
    case "battlewatch-acquire-target": effect(id, { attackBonus: bad ? -1 : good ? b : half(b) }, critical ? 2 : 1); break;
    case "battlewatch-ready-broadside":
      if (bad) change("hull", -2*b); else effect(id, { damageBonus: good ? 2*b : b, hardnessReduction: critical ? 1 : 0 }); break;
    case "battlewatch-reload-weapon": {
      const weapon = state.weapons[selection];
      if (!weapon || weapon.reloadRemaining <= 0) throw new Error("Choose a reloading weapon.");
      weapon.reloadRemaining = Math.max(0, weapon.reloadRemaining + (bad ? 1 : critical ? -2 : -1));
      if (degree === 0) effect(id, { selection, weaponKey: selection, attackBonus: -1 }, 1, true);
      notes.push(`${weapon.name}: Reload ${weapon.reloadRemaining}`); break;
    }
    case "battlewatch-devastating-salvo": effect(id, { salvoDamagePerWeapon: good ? 2*b : b, reloadReduction: critical ? 1 : 0 }, 1, true); if (bad) change("hull", -2*b); break;
    case "veilwarden-mend-lifeveil":
      if (bad) change("lifeveil", -b); else { change("lifeveil", recover(numericDie*b)); if (critical) effect(id, { resourceGuard: "lifeveil", guardAmount: b }); } break;
    case "veilwarden-healing-lifeveil":
      if (bad) change("lifeveil", -5); else { change("hull", recover(numericDie*b)); if (critical) effect(id, { hardnessBonus: 1 }); } break;
    case "veilwarden-reinforce-lifeveil": {
      change("lifeveil", -(critical ? 5 : bad ? 15 : 10), false);
      const mitigation = 3 * Math.max(1, Math.floor(level/5));
      if (!bad) effect(id, { mitigation: good ? mitigation : half(mitigation), wardAllDamage: true, charges: null }); break;
    }
    case "veilwarden-renewal-wave": {
      const amount = recover(Math.max(5, numericDie)*b); change("hull", amount); change("lifeveil", amount);
      if (critical || bad) effect(id, { station: "veilwarden", abilityEcho: critical ? "higher" : "lower" }, 1, false); break;
    }
    case "engineer-emergency-repair": {
      if (bad) { change("supplies", -1); break; }
      if (isFaultRepairSelection(ship, selection)) {
        const repaired = repairSystemFault(ship, selection.slice(6));
        ship = repaired.ship; notes.push(`Cleared ${repaired.fault.name}; integrity unchanged`); break;
      }
      const baseSteps = level >= 15 ? 2 : 1;
      if (selection === "lifeveil") {
        if (recoveryDice.length !== 2 || recoveryDice.some(d => d < 1 || d > 10)) throw new Error("Emergency Repair requires two d10 results.");
        const amount = (recoveryDice[0]+recoveryDice[1]+5) * baseSteps;
        change("lifeveil", good ? amount + (critical ? 5 : 0) : half(amount));
      } else ship = improveShipCondition(ship, selection, (degree === 0 ? 1 : baseSteps) + (critical ? 1 : 0)).ship;
      break;
    }
    case "captain-brace-for-impact":
      if (bad) change("morale", -5); else effect(id, { mitigation: good ? 3*b : half(3*b) });
      if (critical) effect(id, { resourceGuard: "morale", guardAmount: 5 }); break;
    case "engineer-emergency-bypass":
      if (bad) strain(1); else effect(id, { mitigation: good ? b : half(b), guardAmount: good ? b : half(b) });
      if (critical) effect(id, { resourceGuard: "strain", guardAmount: 1 }); break;
    case "navigator-evasive-maneuver": effect(id, { acBonus: bad ? -1 : good ? b : half(b) }); strain(1); if (critical) movement(0, 1); if (bad) change("supplies", -1); break;
    case "battlewatch-spoil-their-aim": effect(id, { attackPenalty: bad ? -1 : good ? b : half(b) }); if (critical) effect(id, { nextDefensiveHardness: 1, hardnessBonus: 1 }); if (bad) change("hull", -b); break;
    case "veilwarden-emergency-ward":
      if (bad) change("lifeveil", -5); else effect(id, { mitigation: good ? 4*b : half(4*b) });
      if (critical) effect(id, { resourceGuard: "lifeveil", guardAmount: b }); break;
    default: throw new Error(`No ability resolver for ${id}`);
  }
  // Consume only old check modifiers, never effects created by this ability.
  for (const effectId of rollEffectIds) {
    const old = rt.effects.find(e => e.id === effectId);
    if (!old) continue;
    if (old.charges == null || old.charges <= 1) rt.effects = rt.effects.filter(e => e.id !== effectId); else old.charges--;
  }
  rt.used[id] = round;
  if (a.tier === "surge") rt.readyRounds[id] = round + 3;
  if (a.tier === "signature") rt.battleUsed[id] = true;
  rt.round = round;
  state.log ??= [];
  state.log.push({ round, kind: "ship-ability", actionId: id, degree, selection, ap: a.cost.ap, rp: a.cost.rp, push, strain: requestedStrain.amount });
  return { ship, state, degree, strainGain: requestedStrain.amount, notes, breakGrapple: state.abilityBreakGrapple ?? null };
}
