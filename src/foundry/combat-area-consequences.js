import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";
import { combatVictoryState, shipCombatOutcome } from "../combat/combat-outcome.js";
import { areaMobilityPenalties } from "../combat/system-damage.js";
import { applyAreaIntegrityCaps } from "../ship/area-readiness.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function cappedShip(ship) {
  const hullBaseMax = Number(ship?.resources?.hull?.baseMax ?? ship?.resources?.hull?.max) || 0;
  const lifeveilBaseMax = Number(ship?.resources?.lifeveil?.baseMax ?? ship?.resources?.lifeveil?.max) || 0;
  return applyAreaIntegrityCaps(ship, { hullBaseMax, lifeveilBaseMax });
}

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
    const label = outcome.status === "wrecked" ? "wrecked" : "disabled";
    ui.notifications?.warn(`${combatant?.name ?? "Arkflight ship"} is ${label} and can no longer continue combat.`);
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
  const before = shipPayload(actor);
  if (!before) return null;
  const after = cappedShip(before);
  const patches = {};
  if (JSON.stringify(after.resources?.hull) !== JSON.stringify(before.resources?.hull)) patches[`flags.${MODULE_ID}.ship.resources.hull`] = after.resources.hull;
  if (JSON.stringify(after.resources?.lifeveil) !== JSON.stringify(before.resources?.lifeveil)) patches[`flags.${MODULE_ID}.ship.resources.lifeveil`] = after.resources.lifeveil;
  if (Object.keys(patches).length) await actor.update(patches);

  const base = game.arkflight?.combat;
  const combatant = base?.findCombatant?.(actor) ?? null;
  const latestShip = shipPayload(actor) ?? after;
  const penalties = areaMobilityPenalties(latestShip);
  let next = null;
  if (combatant) {
    const state = base.state?.(combatant) ?? null;
    const derived = deriveShip(latestShip, SHIP_CATALOGS);
    next = reconcileCombatantState(latestShip, state, {
      derived,
      catalogs: SHIP_CATALOGS,
      rotation: state?.mobility?.heading ?? combatant?.token?.rotation ?? 0,
      speedPenalty: penalties.speedPenalty,
      maneuverPenalty: penalties.maneuverPenalty
    });
    if (JSON.stringify(next) !== JSON.stringify(state)) await combatant.update({ [STATE_PATH]: next });
  }
  const encounter = await resolveEncounterOutcome(combatant, latestShip);
  Hooks.callAll("arkflightAreaConsequencesApplied", { actor, combatant, ship:latestShip, state:next, penalties, outcome:encounter.outcome, victory:encounter.victory });
  return { actor, combatant, ship:latestShip, state:next, penalties, outcome:encounter.outcome, victory:encounter.victory };
}

Hooks.on("arkflightShipDamageStateChanged", ({ actor } = {}) => { void applyMechanicalConsequences(actor); });
