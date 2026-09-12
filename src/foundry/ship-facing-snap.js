import {
  normalizeHeading,
  resolveShipFacingRequest,
  snapShipHeading
} from "../combat/facing-input.js";

const MODULE_ID = "arkflight-game";

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function isArkflightShip(actor) {
  return Boolean(actor && shipPayload(actor));
}

function activeShipCombatant(token) {
  const combat = game.combat;
  if (!combat || !token?.id || !isArkflightShip(token.actor)) return null;
  const combatant = combat.combatants?.find((entry) => entry.tokenId === token.id && entry.actorId === token.actor?.id) ?? null;
  if (!combatant || combat.combatant?.id !== combatant.id) return null;
  return combatant;
}

// Register this before combat-api.js. Foundry rotates controlled tokens using
// Ctrl/Shift + mouse wheel in small or large degree increments. Arkflight uses
// exactly twelve legal 30° headings, so convert the intent into a legal heading
// before combat-api records cumulative facing usage.
Hooks.on("preUpdateToken", (token, changes, options) => {
  if (changes?.rotation == null || options?.arkflightCombatFacing || options?.arkflightHexSnap) return;
  if (!activeShipCombatant(token)) return;

  const requested = Number(changes.rotation);
  if (!Number.isFinite(requested)) return;

  const current = Number(token.rotation ?? token.object?.rotation ?? 0);
  const resolved = resolveShipFacingRequest(current, requested);
  if (normalizeHeading(requested) === resolved) return;

  changes.rotation = resolved;
  options.arkflightHexSnap = true;
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.hexFacing = Object.freeze({
    normalize: normalizeHeading,
    snap: snapShipHeading,
    resolveRequest: resolveShipFacingRequest
  });
});
