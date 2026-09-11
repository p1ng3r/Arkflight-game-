import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";
import { combatVictoryState, shipCombatOutcome } from "../combat/combat-outcome.js";
import { deriveShip } from "../ship/derive-ship.js";
import { activeShipConditionViews } from "../ship/ship-conditions.js";
import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }

async function resolveEncounterOutcome(combatant, ship) {
  const outcome = shipCombatOutcome(ship);
  if (combatant && Boolean(combatant.defeated) !== outcome.terminal) {
    await combatant.update({ defeated: outcome.terminal });
  }

  const combat = game.combat;
  if (!combat) return Object.freeze({ outcome, victory: null });
  const entries = [...(combat.combatants ?? [])]
    .filter((entry) => shipPayload(entry.actor))
    .map((entry) => ({ id: entry.id, name: entry.name, ship: shipPayload(entry.actor) }));
  const victory = combatVictoryState(entries);

  if (outcome.terminal) {
    ui.notifications?.warn(`${combatant?.name ?? "Arkflight ship"} is wrecked and can no longer continue combat.`);
  }
  if (victory.ended) {
    const winner = victory.winnerId ? combat.combatants?.get?.(victory.winnerId) ?? [...(combat.combatants ?? [])].find((entry) => entry.id === victory.winnerId) : null;
    ui.notifications?.info(winner ? `${winner.name} wins the Arkflight combat.` : "Arkflight combat ends with no ship able to continue.");
    Hooks.callAll("arkflightCombatResolved", { combat, victory, winner, triggeringCombatant: combatant, outcome });
  }
  return Object.freeze({ outcome, victory });
}

async function applyMechanicalConsequences(actor) {
  if (!game.user?.isGM || !actor) return null;
  const ship = shipPayload(actor);
  if (!ship) return null;

  const base = game.arkflight?.combat;
  const combatant = base?.findCombatant?.(actor) ?? null;
  let next = null;
  if (combatant) {
    const state = base.state?.(combatant) ?? null;
    const derived = deriveShip(ship, SHIP_CATALOGS);
    next = reconcileCombatantState(ship, state, {
      derived,
      catalogs: SHIP_CATALOGS,
      rotation: state?.mobility?.heading ?? combatant?.token?.rotation ?? 0
    });
    if (JSON.stringify(next) !== JSON.stringify(state)) await combatant.update({ [STATE_PATH]: next });
  }

  const conditions = activeShipConditionViews(ship);
  const encounter = await resolveEncounterOutcome(combatant, ship);
  Hooks.callAll("arkflightShipConditionsApplied", {
    actor,
    combatant,
    ship,
    state: next,
    conditions,
    outcome: encounter.outcome,
    victory: encounter.victory
  });
  return { actor, combatant, ship, state: next, conditions, outcome: encounter.outcome, victory: encounter.victory };
}

Hooks.on("arkflightShipDamageStateChanged", ({ actor } = {}) => { void applyMechanicalConsequences(actor); });
