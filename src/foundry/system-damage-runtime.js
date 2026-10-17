import { SYSTEM_KEYS, SYSTEM_LABELS, activeSystemFaults, damageSystemIntegrity, systemSaveEligible, systemSaveProfile, resolveSystemSave } from "../ship/system-damage.js";
import { SYSTEM_FAULT_TABLES, faultDescription } from "../content/system-faults.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";
import { runShipCommand } from "./ship-ability-runtime.js";

export function systemDamageRoundKey(context = null) {
  if (context) return String(context);
  const combat = globalThis.game?.combat;
  return combat ? `combat:${combat.id ?? "active"}:${Number(combat.round ?? 1)}` : `damage:${globalThis.crypto.randomUUID()}`;
}

/** Call only for explicit damage, never for resource costs or fault acquisition.
 * Returns the transaction to persist; chat is posted separately after persistence. */
export async function resolveSystemDamageSaves(before, after, { systems = [], roundKey = systemDamageRoundKey() } = {}) {
  let ship = structuredClone(after);
  const reports = [];
  for (const system of [...new Set(systems)]) {
    if (!SYSTEM_KEYS.includes(system)) throw new Error(`Unknown damage system: ${system}`);
    if (!systemSaveEligible(before, ship, system, roundKey)) continue;
    const profile = systemSaveProfile(ship, system, { catalogs: SHIP_CATALOGS, derived: deriveShip(ship, SHIP_CATALOGS) });
    const roll = await new Roll("1d20 + @bonus", { bonus: profile.modifier }).evaluate();
    const die = Number(roll.dice[0].total), total = die + profile.modifier;
    const success = die === 20 || die !== 1 && total >= profile.dc;
    const faults = activeSystemFaults(ship, system), faultRolls = [], tableRolls = [];
    if (!success && faults.length < 12) {
      // Draw without replacement: duplicates are rerolled and never stacked.
      for (let i = 0; i < 100; i++) {
        const d12 = await new Roll("1d12").evaluate();
        const value = Number(d12.dice[0].total);
        faultRolls.push(value); tableRolls.push(d12);
        if (!faults.some(f => f.id === SYSTEM_FAULT_TABLES[system][value - 1]?.id)) break;
      }
    }
    const result = resolveSystemSave(ship, system, { roundKey, die, faultRolls, profile });
    ship = result.ship;
    reports.push({ ...result, ship: undefined, profile, roll, tableRolls });
  }
  return { ship, reports, roundKey };
}

export async function reportSystemSaves(result, actor) {
  const esc = globalThis.foundry?.utils?.escapeHTML ?? (v => String(v));
  for (const report of result.reports) {
    const consequence = report.success ? "System holds." : report.fault ? `${report.fault.name}: ${faultDescription(report.fault)}` : "All twelve faults are already active; no duplicate added.";
    await report.roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<strong>${esc(SYSTEM_LABELS[report.system])} save</strong> — ${report.total} vs DC ${report.dc}: ${report.success ? "Success" : "Failure"}<br>${esc(consequence)}` });
    for (const roll of report.tableRolls) await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${esc(SYSTEM_LABELS[report.system])} fault table (duplicate results reroll)` });
  }
}

/** GM damage entry for all five systems; normal combat/event adapters use the same resolver. */
export function applyActorSystemDamage(actor, system, amount) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only the GM may apply system damage.");
  return runShipCommand(actor.uuid ?? actor.id, async () => {
    const before = actor.flags?.["arkflight-game"]?.ship;
    if (!before) throw new Error("Choose an Arkflight ship.");
    const result = await resolveSystemDamageSaves(before, damageSystemIntegrity(before, system, amount), { systems: [system] });
    await actor.update({ "flags.arkflight-game.ship": result.ship }, { arkflightAbilityTransaction: true });
    const base = game.arkflight?.combat, combatant = base?.findCombatant?.(actor), state = combatant && base.state(combatant);
    if (state) await combatant.update({ "flags.arkflight-game.combatState": reconcileCombatantState(result.ship, state, { derived: deriveShip(result.ship, SHIP_CATALOGS), catalogs: SHIP_CATALOGS, rotation: state.mobility.heading }) });
    await reportSystemSaves(result, actor);
    Hooks.callAll("arkflightShipDamageStateChanged", { actor, system, amount });
    return result;
  });
}
