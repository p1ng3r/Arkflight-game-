import { SHIP_CATALOGS } from "../content/index.js";
import { advanceRefitWorkOrders } from "../ship/refit-time.js";

const MODULE_ID = "arkflight-game";
let processingWorldTime = false;

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function arkflightShipActors() {
  return (game.actors?.contents ?? []).filter((actor) => actor?.type === "vehicle" && shipPayload(actor));
}

async function persistTimeAdvance(actor, elapsedHours, { completedAt = null, notify = true } = {}) {
  const ship = shipPayload(actor);
  if (!ship) return { ok: false, reason: "not-arkflight-ship" };
  const result = advanceRefitWorkOrders(ship, elapsedHours, SHIP_CATALOGS, { completedAt });
  if (!result.ok || !result.progressed.length) return result;

  await actor.update({ [`flags.${MODULE_ID}.ship`]: result.ship });
  if (notify && result.completed.length) {
    const labels = result.completed.map((job) => job.componentId || job.type).join(", ");
    ui.notifications?.info?.(`${actor.name}: Refit work completed — ${labels}.`);
  }
  actor.sheet?.render?.({ force: true });
  Hooks.callAll("arkflightRefitTimeAdvanced", { actor, elapsedHours: result.elapsedHours, progressed: result.progressed, completed: result.completed });
  return result;
}

Hooks.once("init", () => {
  if (!game.arkflight) return;
  const existing = game.arkflight.refit ?? {};
  game.arkflight.refit = Object.freeze({
    ...existing,
    async advanceWorkTime(actor, elapsedHours, options = {}) {
      if (!game.user?.isGM) throw new Error("Only the GM can advance Arkflight refit work during Refit Alpha.");
      return persistTimeAdvance(actor, elapsedHours, options);
    }
  });
});

Hooks.on("updateWorldTime", async (_worldTime, delta) => {
  if (!game.user?.isGM || processingWorldTime) return;
  const elapsedHours = Math.floor(Math.max(0, Number(delta ?? 0)) / 3600);
  if (elapsedHours < 1) return;

  processingWorldTime = true;
  try {
    for (const actor of arkflightShipActors()) {
      await persistTimeAdvance(actor, elapsedHours, { completedAt: new Date().toISOString(), notify: true });
    }
  } catch (error) {
    console.error("Arkflight | Could not advance Refit work with world time", error);
    ui.notifications?.error?.(error.message ?? "Could not advance Arkflight refit work.");
  } finally {
    processingWorldTime = false;
  }
});
