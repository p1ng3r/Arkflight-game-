const MODULE_ID = "arkflight-game";

function elementFor(app, html) {
  const element = html instanceof HTMLElement
    ? html
    : html?.[0] ?? app?.element?.[0] ?? app?.element ?? null;
  return element instanceof HTMLElement ? element : null;
}

function tokenDocument(actor) {
  return actor?.token?.documentName === "Token"
    ? actor.token
    : actor?.token?.document?.documentName === "Token"
      ? actor.token.document
      : null;
}

function isSyntheticArkflightShip(actor) {
  return Boolean(actor?.isToken && actor?.flags?.[MODULE_ID]?.ship && tokenDocument(actor)?.actorLink === false);
}

function sameShipState(actor, token) {
  const worldActor = game.actors?.get(token?.actorId ?? actor?.id);
  if (!worldActor) return false;
  const tokenShip = actor?.flags?.[MODULE_ID]?.ship ?? null;
  const worldShip = worldActor?.flags?.[MODULE_ID]?.ship ?? null;
  return foundry.utils.deepEqual?.(tokenShip, worldShip)
    ?? JSON.stringify(tokenShip) === JSON.stringify(worldShip);
}

function injectAuthorityWarning(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!isSyntheticArkflightShip(actor)) return;
  const token = tokenDocument(actor);
  if (!token || sameShipState(actor, token)) return;
  const root = elementFor(app, html)?.querySelector?.(".arkflight-ship-shell")
    ?? (elementFor(app, html)?.matches?.(".arkflight-ship-shell") ? elementFor(app, html) : null);
  if (!root || root.querySelector(".arkflight-token-authority-warning")) return;

  const banner = document.createElement("section");
  banner.className = "arkflight-readiness-banner arkflight-token-authority-warning";
  banner.innerHTML = `
    <strong><i class="fa-solid fa-link-slash"></i> UNLINKED SHIP TOKEN STATE</strong>
    <div><span>This token contains Arkflight ship data that differs from its world Actor. Arkflight uses the world Actor as authoritative ship state.</span></div>`;

  if (game.user?.isGM) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "arkflight-refit-action";
    action.innerHTML = '<i class="fa-solid fa-link"></i> Sync Token → Ship Actor';
    action.title = "Copy this token's Arkflight ship state into the world Actor, then link this token to that Actor.";
    action.addEventListener("click", async () => {
      action.disabled = true;
      try {
        const result = await game.arkflight?.shipTokens?.syncTokenToActor?.(token);
        if (!result?.ok) throw new Error("Ship-token synchronization did not complete.");
        ui.notifications?.info?.(`${result.actor?.name ?? actor.name} synchronized. The token is now linked to its authoritative ship Actor.`);
        result.actor?.sheet?.render?.({ force: true });
        app.close?.();
      } catch (error) {
        console.error("Arkflight | Ship token synchronization failed", error);
        ui.notifications?.error?.(error?.message ?? "Could not synchronize the Arkflight ship token.");
        action.disabled = false;
      }
    });
    banner.append(action);
  }

  root.prepend(banner);
}

Hooks.on("renderActorSheet", (app, html) => {
  requestAnimationFrame(() => injectAuthorityWarning(app, html));
});
