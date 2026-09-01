import { normalizeShip } from "./ship-schema.js";
import { createRefitJob, REFIT_JOB_STATES, REFIT_METHODS } from "./refit-rules.js";
import { completeRefitJob } from "./refit-work-orders.js";

function safeHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.trunc(number));
}

function replaceJob(ship, job) {
  return normalizeShip({
    ...ship,
    refit: {
      ...ship.refit,
      workOrders: (ship.refit?.workOrders ?? []).map((entry) => entry.id === job.id ? job : entry)
    }
  });
}

function progressJob(next, jobId, hours, catalogs, completedAt) {
  const current = next.refit?.workOrders?.find((job) => job.id === jobId);
  if (!current || current.status !== REFIT_JOB_STATES.WORKING) {
    return { ok: true, ship: next, progress: null, completedJob: null, unusedHours: hours };
  }

  const before = safeHours(current.remainingHours);
  const applied = Math.min(before, hours);
  const remaining = Math.max(0, before - applied);
  if (remaining > 0) {
    const job = createRefitJob({ ...current, remainingHours: remaining });
    return {
      ok: true,
      ship: replaceJob(next, job),
      progress: Object.freeze({ jobId, beforeHours: before, remainingHours: remaining, completed: false }),
      completedJob: null,
      unusedHours: 0
    };
  }

  const result = completeRefitJob(next, jobId, catalogs, {
    completedAt,
    result: {
      ...(current.result ?? {}),
      outcome: current.result?.outcome ?? "time-complete",
      elapsedByWorldTime: true
    }
  });
  if (!result.ok) return { ...result, unusedHours: hours };
  return {
    ok: true,
    ship: result.ship,
    progress: Object.freeze({ jobId, beforeHours: before, remainingHours: 0, completed: true }),
    completedJob: result.job,
    unusedHours: Math.max(0, hours - applied)
  };
}

/**
 * Advance refit work by whole hours.
 * Crew work is serialized: only the first WORKING crew job progresses.
 * Shipyard work remains concurrent: every WORKING shipyard job progresses by the full elapsed time.
 * PLANNED jobs never auto-start here; the Foundry boundary may offer the GM a continuation prompt.
 */
export function advanceRefitWorkOrders(ship, elapsedHours, catalogs, {
  completedAt = null,
  progressCrew = true,
  progressShipyard = true
} = {}) {
  let next = normalizeShip(ship);
  const hours = safeHours(elapsedHours);
  if (!hours) return Object.freeze({
    ok: true,
    ship: next,
    elapsedHours: 0,
    progressed: Object.freeze([]),
    completed: Object.freeze([]),
    crewUnusedHours: 0,
    crewCompleted: false
  });

  const progressed = [];
  const completed = [];

  if (progressShipyard) {
    const shipyardIds = (next.refit?.workOrders ?? [])
      .filter((job) => job.status === REFIT_JOB_STATES.WORKING && job.method === REFIT_METHODS.SHIPYARD)
      .map((job) => job.id);

    for (const jobId of shipyardIds) {
      const result = progressJob(next, jobId, hours, catalogs, completedAt);
      if (!result.ok) return Object.freeze({ ...result, elapsedHours: hours, progressed: Object.freeze(progressed), completed: Object.freeze(completed), crewUnusedHours: 0, crewCompleted: false });
      next = result.ship;
      if (result.progress) progressed.push(result.progress);
      if (result.completedJob) completed.push(result.completedJob);
    }
  }

  let crewUnusedHours = 0;
  let crewCompleted = false;
  if (progressCrew) {
    const crewJob = (next.refit?.workOrders ?? []).find((job) => job.status === REFIT_JOB_STATES.WORKING && job.method === REFIT_METHODS.CREW);
    if (crewJob) {
      const result = progressJob(next, crewJob.id, hours, catalogs, completedAt);
      if (!result.ok) return Object.freeze({ ...result, elapsedHours: hours, progressed: Object.freeze(progressed), completed: Object.freeze(completed), crewUnusedHours: 0, crewCompleted: false });
      next = result.ship;
      if (result.progress) progressed.push(result.progress);
      if (result.completedJob) {
        completed.push(result.completedJob);
        crewCompleted = true;
        crewUnusedHours = result.unusedHours;
      }
    }
  }

  return Object.freeze({
    ok: true,
    ship: next,
    elapsedHours: hours,
    progressed: Object.freeze(progressed),
    completed: Object.freeze(completed),
    crewUnusedHours,
    crewCompleted
  });
}
