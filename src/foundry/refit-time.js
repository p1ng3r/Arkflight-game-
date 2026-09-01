import { SHIP_CATALOGS } from "../content/index.js";
import { advanceRefitWorkOrders } from "../ship/refit-time.js";
import { REFIT_JOB_STATES, REFIT_METHODS } from "../ship/refit-rules.js";
import { startRefitJob } from "../ship/refit-work-orders.js";

const MODULE_ID = "arkflight-game";
let processingWorldTime = false;

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function arkflightShipActors() {
  return (game.actors?.contents ?? []).filter((actor) => actor?.type === "vehicle" && shipPayload(actor));
}

function nextPlannedCrewJob(ship) {
  return (ship?.refit?.workOrders ?? []).find((job) => job.method === REFIT_METHODS.CREW && job.status === REFIT_JOB_STATES.PLANNED) ?? null;
}

function jobLabel(job) {
  return job?.componentId || String(job?.type ?? "Ship work").replaceAll("-", " ");
}

function confirmCrewContinuation(actor, job, remainingHours) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const content = `<div class="arkflight-refit-continue-dialog"><p><strong>${foundry.utils.escapeHTML(actor.name)}</strong> finished its active crew refit with <strong>${remainingHours}h</strong> still passing.</p><p>The next crew job is <strong>${foundry.utils.escapeHTML(jobLabel(job))}</strong> (${foundry.utils.escapeHTML(String(job.type ?? "work").replaceAll("-", " "))}, ${Number(job.remainingHours ?? 0)}h remaining).</p><p>Start it now and apply the remaining time, or stop the crew refit queue here.</p></div>`;
    new DialogV2({
      window: { title: "Continue Crew Refit?" },
      content,
      buttons: [
        { action: "stop", label: "Stop Queue", icon: "fa-solid fa-hand", callback: () => resolve(false) },
        { action: "continue", label: "Start Next Job", icon: "fa-solid fa-play", default: true, callback: () => resolve(true) }
      ],
      close: () => resolve(false)
    }).render({ force: true });
  });
}

async function persistShip(actor, ship) {
  await actor.update({ [`flags.${MODULE_ID}.ship`]: ship });
}

async function persistTimeAdvance(actor, elapsedHours, { completedAt = null, notify = true } = {}) {
  let ship = shipPayload(actor);
  if (!ship) return { ok: false, reason: "not-arkflight-ship" };

  const first = advanceRefitWorkOrders(ship, elapsedHours, SHIP_CATALOGS, { completedAt, progressCrew: true, progressShipyard: true });
  if (!first.ok) return first;
  ship = first.ship;
  const progressed = [...first.progressed];
  const completed = [...first.completed];
  let crewRemaining = first.crewUnusedHours ?? 0;

  while (crewRemaining > 0) {
    const nextJob = nextPlannedCrewJob(ship);
    if (!nextJob) break;
    const allow = await confirmCrewContinuation(actor, nextJob, crewRemaining);
    if (!allow) break;

    const started = startRefitJob(ship, nextJob.id, { startedAt: new Date().toISOString() });
    if (!started.ok) return { ...started, progressed: Object.freeze(progressed), completed: Object.freeze(completed) };
    ship = started.ship;

    const continuation = advanceRefitWorkOrders(ship, crewRemaining, SHIP_CATALOGS, { completedAt, progressCrew: true, progressShipyard: false });
    if (!continuation.ok) return { ...continuation, progressed: Object.freeze(progressed), completed: Object.freeze(completed) };
    ship = continuation.ship;
    progressed.push(...continuation.progressed);
    completed.push(...continuation.completed);
    crewRemaining = continuation.crewUnusedHours ?? 0;
    if (!continuation.crewCompleted) break;
  }

  if (progressed.length) await persistShip(actor, ship);
  if (notify && completed.length) {
    const labels = completed.map((job) => jobLabel(job)).join(", ");
    ui.notifications?.info?.(`${actor.name}: Refit work completed — ${labels}.`);
  }
  if (progressed.length) {
    actor.sheet?.render?.({ force: true });
    Hooks.callAll("arkflightRefitTimeAdvanced", { actor, elapsedHours: Math.max(0, Math.trunc(Number(elapsedHours) || 0)), progressed, completed });
  }
  return Object.freeze({ ok: true, ship, elapsedHours: Math.max(0, Math.trunc(Number(elapsedHours) || 0)), progressed: Object.freeze(progressed), completed: Object.freeze(completed), crewUnusedHours: crewRemaining });
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
      const result = await persistTimeAdvance(actor, elapsedHours, { completedAt: new Date().toISOString(), notify: true });
      if (!result.ok) throw new Error(result.reason ?? "Could not advance Arkflight refit work.");
    }
  } catch (error) {
    console.error("Arkflight | Could not advance Refit work with world time", error);
    ui.notifications?.error?.(error.message ?? "Could not advance Arkflight refit work.");
  } finally {
    processingWorldTime = false;
  }
});
