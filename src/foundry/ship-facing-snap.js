const MODULE_ID = "arkflight-game";

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function isArkflightShip(actor) {
  return Boolean(actor && shipPayload(actor));
}

function normalizeHeading(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

function snapHexHeading(value) {
  const normalized = normalizeHeading(value);
  return (Math.round(normalized / 60) * 60) % 360;
}

function activeShipCombatant(token) {
  const combat = game.combat;
  if (!combat || !token?.id || !isArkflightShip(token.actor)) return null;
  const combatant = combat.combatants?.find((entry) => entry.tokenId === token.id && entry.actorId === token.actor?.id) ?? null;
  if (!combatant || combat.combatant?.id !== combatant.id) return null;
  return combatant;
}

// Register this before combat-api.js. Foundry commonly requests arbitrary token
// rotations; Arkflight combat uses six legal headings on a hex grid. Normalize
// the requested rotation before the existing combat validator measures maneuver
// cost, rather than rejecting the token rotation outright.
Hooks.on("preUpdateToken", (token, changes, options) => {
  if (changes?.rotation == null || options?.arkflightCombatFacing || options?.arkflightHexSnap) return;
  if (!activeShipCombatant(token)) return;

  const requested = Number(changes.rotation);
  if (!Number.isFinite(requested)) return;
  const snapped = snapHexHeading(requested);
  if (normalizeHeading(requested) === snapped) return;

  changes.rotation = snapped;
  options.arkflightHexSnap = true;
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.hexFacing = Object.freeze({
    normalize: normalizeHeading,
    snap: snapHexHeading
  });
});
