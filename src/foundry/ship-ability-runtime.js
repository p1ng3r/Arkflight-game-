import { isFaultRepairSelection } from "../ship/system-damage.js";
import { SHIP_ABILITIES } from "../content/station-abilities.js";
import { abilityRollModifiers, abilityDegree, abilityAvailability, resolveShipAbility, applyAbilityLossGuards, shipAbilityDC } from "../combat/ship-ability-rules.js";
import { resolveShipStrainGain } from "./ship-strain-runtime.js";
import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";

const QUEUES = new Map();
export async function runShipCommand(key, command) {
  const before = QUEUES.get(key) ?? Promise.resolve();
  const pending = before.catch(() => {}).then(command);
  QUEUES.set(key, pending);
  try { return await pending; } finally { if (QUEUES.get(key) === pending) QUEUES.delete(key); }
}

export async function executeFoundryShipAbility(base, combatant, id, options = {}, crewActor = null, requesterUserId = game.user?.id ?? null) {
  const action = SHIP_ABILITIES[id];
  if (!action) throw new Error(`Unknown ship ability: ${id}`);
  const level = Number(combatant.actor.flags["arkflight-game"].ship.progression?.level ?? 1);
  const source = combatant.actor.flags["arkflight-game"].ship;
  const before = base.state(combatant), round = Math.max(1, Number(game.combat?.round ?? 1));
  const check = abilityAvailability(source, before, id, round, options);
  if (!check.ok) throw new Error(`${action.name}: ${check.reason}`);
  let selection = options.selection ?? options.weaponKey ?? options.targetId ?? options.facing ?? options.system ?? options.station;
  if (action.rules.chooseTarget && !base.targets(combatant).some(t => t.id === selection)) throw new Error("Choose a legal target ship.");
  if (action.rules.chooseSystem && !["hull", "drive", "weapons", "lifeveil"].includes(selection) && !isFaultRepairSelection(source, selection)) throw new Error("Choose a legal repair system.");
  if (action.rules.chooseFacing && !(Array.isArray(action.rules.chooseFacing) ? action.rules.chooseFacing : ["fore", "port", "starboard", "aft"]).includes(selection)) throw new Error("Choose a legal facing.");
  if (action.rules.chooseStation && !source.crew?.stations?.[selection]) throw new Error("Assign the selected station first.");
  if (action.rules.resolver === "workTheGuns" && (!before.weapons?.[selection] || before.weapons[selection].reloadRemaining <= 0)) throw new Error("Choose a reloading weapon.");
  if (action.rules.resolver === "slipTheNet" && !game.arkflight.combatEngagement?.isMoored(combatant)) throw new Error("Ship is not grappled.");
  if (action.rules.multipleRoutes) {
    const choices = Array.isArray(selection) ? selection : String(selection ?? "").split(",").filter(Boolean);
    const max = level >= 10 ? 2 : 1;
    if (!choices.length || choices.length > max || new Set(choices).size !== choices.length || choices.some(c => !action.rules.choices.includes(c))) throw new Error("Choose different eligible power routes.");
    selection = choices;
  }
  const modifier = abilityRollModifiers(before, action.rules.originStation ?? action.station, level, { ...options, ship: source });
  const expression = modifier.rollTwice ? modifier.rollTwice === "higher" ? "2d20kh" : "2d20kl" : "1d20";
  const roll = await new Roll(`${expression} + @bonus`, { bonus: modifier.modifier }).evaluate();
  const die = Number(roll.dice[0].total), degree = abilityDegree(die, modifier.modifier, level);
  let effectDie = 1, recoveryDice = [], strengthRoll = null;
  if (action.rules.recoveryDie && (id !== "engineer-emergency-repair" || selection === "lifeveil") && (degree !== -1 || id === "veilwarden-renewal-wave")) {
    strengthRoll = await new Roll(id === "engineer-emergency-repair" ? "2d10" : `1d${action.rules.recoveryDie}`).evaluate();
    effectDie = Number(strengthRoll.dice[0].total);
    recoveryDice = strengthRoll.dice[0].results?.filter(r => r.active !== false).map(r => Number(r.result)) ?? [];
  }
  const enriched = { ...before, engagement: game.arkflight.combatEngagement?.state(combatant) ?? {} };
  let result = resolveShipAbility({ ship: source, state: enriched, id, degree, die: id === "engineer-emergency-repair" ? 1 : effectDie, recoveryDice, selection, round, push: options.push === true, rollEffectIds: modifier.consumed });
  if (result.strainGain) {
    const outcome = await resolveShipStrainGain(result.ship, { amount: result.strainGain, currentStrain: result.state.strain.value, strainMax: result.state.strain.max, sourceLabel: action.name, speaker: ChatMessage.getSpeaker({ actor: combatant.actor }) });
    const guarded = applyAbilityLossGuards(result.ship, outcome.ship, result.state);
    result.ship = guarded.ship; result.state = { ...guarded.state, strain: outcome.strain };
    result.notes.push(...outcome.notes);
  }
  if (result.breakGrapple) {
    await game.arkflight.combatEngagement.breakAutomatically(combatant, result.breakGrapple);
    delete result.state.abilityBreakGrapple;
    result.state.engagement = {};
  }
  result.state = reconcileCombatantState(result.ship, result.state, {
    derived: deriveShip(result.ship, SHIP_CATALOGS), catalogs: SHIP_CATALOGS,
    rotation: result.state.mobility.heading, round
  });
  await combatant.actor.update({ "flags.arkflight-game.ship": result.ship }, { arkflightAbilityTransaction: true });
  await combatant.update({ "flags.arkflight-game.combatState": result.state });
  const names = {2:"Critical Success",1:"Success",0:"Failure","-1":"Critical Failure"};
  const esc = foundry.utils.escapeHTML;
  await roll.toMessage({ user: requesterUserId, speaker: ChatMessage.getSpeaker({ actor: crewActor ?? combatant.actor }), flavor: `<strong>${esc(action.name)}</strong> — ${esc(combatant.name)}<br>${roll.total} vs DC ${shipAbilityDC(level)}: <strong>${names[degree]}</strong><br>${esc(action.outcomes[2-degree])}<br>${result.notes.map(esc).join("<br>")}` });
  if (strengthRoll) await strengthRoll.toMessage({ user: requesterUserId, speaker: ChatMessage.getSpeaker({ actor: combatant.actor }), flavor: `${esc(action.name)} — recovery strength` });
  Hooks.callAll("arkflightStationActionResolved", { combatant, actor: combatant.actor, action, state: result.state, degree, notes: result.notes });
  return result;
}
