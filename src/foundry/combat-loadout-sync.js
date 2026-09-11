import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { reconcileCombatantState } from "../combat/combatant-loadout-sync.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const SHIP_COMBATANT_PATH = `flags.${MODULE_ID}.shipCombatant`;
const SHIP_ACTOR_UUID_PATH = `flags.${MODULE_ID}.shipActorUuid`;
const syncing = new Set();

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

// Do not require the Arkflight marker here. A perfectly valid Arkflight ship can
// already be present in Foundry combat because it was added with Foundry's normal
// combat controls. Those existing combatants are exactly the entries this bridge
// must adopt and initialize.
function hasArkflightShipActor(combatant) {
  return Boolean(shipPayload(combatant?.actor));
}

function currentState(combatant) {
  return combatant?.flags?.[MODULE_ID]?.combatState ?? null;
}

function stateChanged(before, after) {
  try { return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null); }
  catch (_error) { return true; }
}

function markerMissing(combatant) {
  return combatant?.flags?.[MODULE_ID]?.shipCombatant !== true
    || combatant?.flags?.[MODULE_ID]?.shipActorUuid !== combatant?.actor?.uuid;
}

function buildReconciledState(combatant) {
  const ship = shipPayload(combatant?.actor);
  if (!ship) return null;
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return reconcileCombatantState(ship, currentState(combatant), {
    derived,
    catalogs: SHIP_CATALOGS,
    rotation: currentState(combatant)?.mobility?.heading ?? combatant?.token?.rotation ?? 0
  });
}

/**
 * Adopt any Foundry combatant backed by an Arkflight ship Actor, stamp the
 * Arkflight combatant identity flags, and rebuild its transient combat state
 * from the Actor's authoritative derived build while preserving runtime facts.
 */
export async function syncCombatantLoadout(combatant) {
  if (!game.user?.isGM || !hasArkflightShipActor(combatant) || syncing.has(combatant.id)) return false;

  const next = buildReconciledState(combatant);
  if (!next) return false;
  const needsState = stateChanged(currentState(combatant), next);
  const needsMarker = markerMissing(combatant);
  if (!needsState && !needsMarker) return false;

  syncing.add(combatant.id);
  try {
    await combatant.update({
      [STATE_PATH]: next,
      [SHIP_COMBATANT_PATH]: true,
      [SHIP_ACTOR_UUID_PATH]: combatant.actor.uuid
    });
    console.info(`Arkflight | Adopted/synced combat build for ${combatant.name}: ${Object.keys(next.weapons ?? {}).length} weapon(s).`);
    return true;
  } catch (error) {
    console.error(`Arkflight | Failed to sync combat build for ${combatant.name}`, error);
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
  for (const combatant of game.combat.combatants ?? []) {
    if (hasArkflightShipActor(combatant)) await syncCombatantLoadout(combatant);
  }
}

function shipPayloadChanged(changes) {
  if (!changes || typeof changes !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(changes, `flags.${MODULE_ID}.ship`)) return true;
  if (Object.prototype.hasOwnProperty.call(changes, `flags.${MODULE_ID}.ship.weapons`)) return true;
  return changes.flags?.[MODULE_ID]?.ship !== undefined;
}

Hooks.once("ready", () => {
  if (!game.user?.isGM) return;
  // Run after combat-api's ready hook has installed game.arkflight.combat.
  setTimeout(() => { void syncAllCombatants(); }, 0);
});

Hooks.on("createCombatant", (combatant) => {
  if (!game.user?.isGM || !hasArkflightShipActor(combatant)) return;
  // This covers ships dragged/added through Foundry's normal combat tracker,
  // not only combatants created through Arkflight's initiative workflow.
  setTimeout(() => { void syncCombatantLoadout(combatant); }, 0);
});

Hooks.on("updateActor", (actor, changes) => {
  if (!game.user?.isGM || !shipPayload(actor) || !shipPayloadChanged(changes)) return;
  const combatant = combatantForActor(actor);
  if (combatant) void syncCombatantLoadout(combatant);
});

// Repair existing worlds immediately when the ship sheet is opened. This is
// important for combatants created before the Arkflight combat identity flags
// or combat-state weapon bridge existed.
Hooks.on("renderActorSheet", (app) => {
  if (!game.user?.isGM) return;
  const actor = app?.actor ?? app?.document ?? null;
  const combatant = combatantForActor(actor);
  if (combatant) void syncCombatantLoadout(combatant);
});

Hooks.on("renderApplicationV2", (app) => {
  if (!game.user?.isGM) return;
  const actor = app?.actor ?? app?.document ?? null;
  if (actor?.documentName !== "Actor") return;
  const combatant = combatantForActor(actor);
  if (combatant) void syncCombatantLoadout(combatant);
});
