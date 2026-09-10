import { effectiveMobility } from "../combat/combat-schema.js";
import { applyWeaponSystemThreat, areaMobilityPenalties, weaponSystemThreat } from "../combat/system-damage.js";
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
function patchMobility(state, ship) {
  if (!state?.mobility) return state;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const penalties = areaMobilityPenalties(ship);
  const mobility = effectiveMobility({ combatSpeed:derived.stats.combatSpeed, maneuverability:derived.stats.maneuverability, speedPenalty:penalties.speedPenalty, maneuverPenalty:penalties.maneuverPenalty });
  if (state.mobility.speed === mobility.speed && state.mobility.maneuverability === mobility.maneuverability) return state;
  return Object.freeze({ ...state, mobility:Object.freeze({ ...state.mobility, speed:mobility.speed, maneuverability:mobility.maneuverability }) });
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
  let next = null;
  if (combatant) {
    const state = base.state?.(combatant);
    next = patchMobility(state, latestShip);
    if (next !== state) await combatant.update({ [STATE_PATH]: next });
  }
  const penalties = areaMobilityPenalties(latestShip);
  Hooks.callAll("arkflightAreaConsequencesApplied", { actor, combatant, ship:latestShip, state:next, penalties });
  return { actor, combatant, ship:latestShip, state:next, penalties };
}

Hooks.on("arkflightShipDamageStateChanged", ({ actor } = {}) => { void applyMechanicalConsequences(actor); });

// Critical specialized system hits are handled by combat-flow-usability. This
// adds the second route: a single exceptionally heavy normal hit can also damage
// the weapon's threatened Area, so systemThreat is meaningful even without a crit.
Hooks.on("arkflightNativeShipAttackResolved", ({ target, solution, degree, damage } = {}) => {
  if (!game.user?.isGM || !target?.actor || !damage || Number(degree) >= 2 || Number(damage.hullDamage) <= 0) return;
  setTimeout(async () => {
    const actor = target.actor;
    const before = shipPayload(actor);
    if (!before) return;
    const outcome = applyWeaponSystemThreat(before, { weapon:solution?.weapon, degree, hullDamage:damage.hullDamage });
    if (!outcome.triggered || !outcome.degraded) return;
    const threat = weaponSystemThreat(solution?.weapon);
    const patches = { [`flags.${MODULE_ID}.ship.areas.${threat}.state`]: outcome.state };
    if (threat === "hull") patches[`flags.${MODULE_ID}.ship.resources.hull`] = outcome.ship.resources.hull;
    if (threat === "lifeveil") patches[`flags.${MODULE_ID}.ship.resources.lifeveil`] = outcome.ship.resources.lifeveil;
    await actor.update(patches);
    ui.notifications?.warn(`${actor.name}: heavy ${threat} hit — ${outcome.previousState} → ${outcome.state}.`);
    Hooks.callAll("arkflightShipDamageStateChanged", { actor, target, solution, degree, damage, notes:[`${threat} ${outcome.previousState} → ${outcome.state}`], heavySystemHit:true });
  }, 0);
});
