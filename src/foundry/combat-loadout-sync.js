import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const syncing = new Set();

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function isArkflightCombatant(combatant) {
  return Boolean(
    combatant?.flags?.[MODULE_ID]?.shipCombatant
    && shipPayload(combatant.actor)
  );
}

function currentState(combatant) {
  return combatant?.flags?.[MODULE_ID]?.combatState ?? null;
}

function stateChanged(before, after) {
  try { return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null); }
  catch (_error) { return true; }
}

function buildReconciledState(combatant) {
  const ship = shipPayload(combatant?.actor);
  if (!ship) return null;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return reconcileCombatantState(ship, currentState(combatant), {
    derived,
    catalogs: SHIP_CATALOGS,
    rotation: combatant?.token?.rotation ?? 0
  });
}

export async function syncCombatantLoadout(combatant) {
  if (!game.user?.isGM || !isArkflightCombatant(combatant) || syncing.has(combatant.id)) return false;
  const next = buildReconciledState(combatant);
  if (!next || !stateChanged(currentState(combatant), next)) return false;

  syncing.add(combatant.id);
  try {
    await combatant.update({ [STATE_PATH]: next });
    console.info(`Arkflight | Synced combat loadout for ${combatant.name}: ${Object.keys(next.weapons ?? {}).length} weapon(s).`);
    return true;
  } catch (error) {
    console.error(`Arkflight | Failed to sync combat loadout for ${combatant.name}`, error);
    return false;
  } finally {
    syncing.delete(combatant.id);
  }
}

function combatantForActor(actor) {
  if (!actor || !game.combat) return null;
  return game.combat.combatants?.find((entry) =>
    entry.actorId === actor.id
    || entry.flags?.[MODULE_ID]?.shipActorUuid === actor.uuid
  ) ?? null;
}

async function syncAllCombatants() {
  if (!game.user?.isGM || !game.combat) return;
  for (const combatant of game.combat.combatants ?? []) await syncCombatantLoadout(combatant);
}

function shipPayloadChanged(changes) {
  if (!changes || typeof changes !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(changes, `flags.${MODULE_ID}.ship`)) return true;
  if (Object.prototype.hasOwnProperty.call(changes, `flags.${MODULE_ID}.ship.weapons`)) return true;
  return changes.flags?.[MODULE_ID]?.ship !== undefined;
}

Hooks.once("ready", () => {
  if (!game.user?.isGM) return;
  setTimeout(() => { void syncAllCombatants(); }, 0);
});

Hooks.on("createCombatant", (combatant) => {
  if (!game.user?.isGM) return;
  setTimeout(() => { void syncCombatantLoadout(combatant); }, 0);
});

Hooks.on("updateActor", (actor, changes) => {
  if (!game.user?.isGM || !shipPayload(actor) || !shipPayloadChanged(changes)) return;
  const combatant = combatantForActor(actor);
  if (combatant) void syncCombatantLoadout(combatant);
});

// This also repairs worlds that already had an Arkflight combatant before the
// current combat-state schema/loadout bridge existed. The resulting Combatant
// update triggers the open Weapons tab's normal live refresh hook.
Hooks.on("renderActorSheet", (app) => {
  if (!game.user?.isGM) return;
  const actor = app?.actor ?? app?.document ?? null;
  const combatant = combatantForActor(actor);
  if (combatant) void syncCombatantLoadout(combatant);
});
