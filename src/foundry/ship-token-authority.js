const MODULE_ID = "arkflight-game";

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function isArkflightShip(actor) {
  return Boolean(actor && shipPayload(actor) && (actor.type === "vehicle" || shipPayload(actor)?.schemaVersion));
}

function tokenDocument(reference) {
  if (!reference) return null;
  if (reference.documentName === "Token") return reference;
  if (reference.document?.documentName === "Token") return reference.document;
  if (reference.token?.documentName === "Token") return reference.token;
  if (reference.token?.document?.documentName === "Token") return reference.token.document;
  return null;
}

function worldActorForToken(token) {
  const actorId = token?.actorId ?? token?.actor?.id ?? null;
  return actorId ? game.actors?.get(actorId) ?? null : null;
}

function syntheticShipConflict(token) {
  if (!token || token.actorLink !== false) return null;
  const syntheticActor = token.actor ?? null;
  const worldActor = worldActorForToken(token);
  if (!isArkflightShip(syntheticActor) || !isArkflightShip(worldActor)) return null;
  const tokenShip = shipPayload(syntheticActor);
  const actorShip = shipPayload(worldActor);
  const same = foundry.utils.deepEqual?.(tokenShip, actorShip)
    ?? JSON.stringify(tokenShip) === JSON.stringify(actorShip);
  if (same) return null;
  return Object.freeze({ token, syntheticActor, worldActor, tokenShip, actorShip });
}

async function ensurePrototypeLinked(actor) {
  if (!isArkflightShip(actor) || actor?.isToken) return false;
  if (actor.prototypeToken?.actorLink === true) return false;
  await actor.update({ "prototypeToken.actorLink": true });
  return true;
}

async function syncTokenToActor(reference) {
  if (!game.user?.isGM) throw new Error("Only the GM may synchronize an Arkflight ship token into its world Actor.");
  const token = tokenDocument(reference);
  if (!token) throw new Error("Arkflight ship token could not be resolved.");
  if (token.actorLink !== false) return Object.freeze({ ok: true, alreadyLinked: true, actor: token.actor ?? worldActorForToken(token), token });

  const syntheticActor = token.actor ?? null;
  const worldActor = worldActorForToken(token);
  if (!isArkflightShip(syntheticActor)) throw new Error("That token does not contain Arkflight ship state.");
  if (!worldActor) throw new Error("The world Actor backing that ship token could not be found.");

  const ship = structuredClone(shipPayload(syntheticActor));
  await worldActor.update({
    [`flags.${MODULE_ID}.isArkflightShip`]: true,
    [`flags.${MODULE_ID}.ship`]: ship,
    "prototypeToken.actorLink": true
  });
  await token.update({ actorLink: true });

  Hooks.callAll("arkflightShipTokenSynchronized", { token, actor: worldActor, ship });
  return Object.freeze({ ok: true, actor: worldActor, token, ship });
}

function findConflicts() {
  const conflicts = [];
  for (const scene of game.scenes?.contents ?? []) {
    for (const token of scene.tokens?.contents ?? []) {
      const conflict = syntheticShipConflict(token);
      if (conflict) conflicts.push(conflict);
    }
  }
  return Object.freeze(conflicts);
}

function installApi() {
  if (!game.arkflight) return;
  game.arkflight.shipTokens = Object.freeze({
    findConflicts,
    syncTokenToActor,
    ensurePrototypeLinked
  });
}

Hooks.once("init", installApi);

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;
  for (const actor of game.actors?.contents ?? []) {
    if (!isArkflightShip(actor)) continue;
    try { await ensurePrototypeLinked(actor); }
    catch (error) { console.warn(`Arkflight | Could not set linked-token default for ${actor.name}`, error); }
  }

  const conflicts = findConflicts();
  if (conflicts.length) {
    const names = [...new Set(conflicts.map((entry) => entry.worldActor?.name).filter(Boolean))];
    ui.notifications?.warn?.(`Arkflight found ${conflicts.length} unlinked ship token${conflicts.length === 1 ? "" : "s"} with independent state${names.length ? ` (${names.join(", ")})` : ""}. Open the token's ship sheet and use Sync Token → Ship Actor before continuing ship operations.`);
  }
});

Hooks.on("createActor", async (actor) => {
  if (!game.user?.isGM || !isArkflightShip(actor)) return;
  try { await ensurePrototypeLinked(actor); }
  catch (error) { console.warn(`Arkflight | Could not set linked-token default for ${actor.name}`, error); }
});

Hooks.on("updateActor", async (actor, changes) => {
  if (!game.user?.isGM || actor?.isToken || !isArkflightShip(actor)) return;
  if (actor.prototypeToken?.actorLink === true) return;
  if (!(changes?.flags?.[MODULE_ID] || changes?.prototypeToken)) return;
  try { await ensurePrototypeLinked(actor); }
  catch (error) { console.warn(`Arkflight | Could not preserve linked-token default for ${actor.name}`, error); }
});

Hooks.on("preCreateToken", (token, data) => {
  const actorId = data?.actorId ?? token?.actorId ?? null;
  const actor = actorId ? game.actors?.get(actorId) : null;
  if (!isArkflightShip(actor)) return;
  token.updateSource({ actorLink: true });
});
