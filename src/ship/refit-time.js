import { normalizeShip } from "./ship-schema.js";
import { createRefitJob, REFIT_JOB_STATES } from "./refit-rules.js";
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

/**
 * Advance every WORKING refit job concurrently by the same number of whole hours.
 * PLANNED jobs never auto-start. COMPLETE and COMPLICATION jobs never progress.
 * Jobs that reach zero complete through the canonical work-order completion boundary.
 */
export function advanceRefitWorkOrders(ship, elapsedHours, catalogs, { completedAt = null } = {}) {
  let next = normalizeShip(ship);
  const hours = safeHours(elapsedHours);
  if (!hours) return Object.freeze({ ok: true, ship: next, elapsedHours: 0, progressed: Object.freeze([]), completed: Object.freeze([]) });

  const workingIds = (next.refit?.workOrders ?? [])
    .filter((job) => job.status === REFIT_JOB_STATES.WORKING)
    .map((job) => job.id);

  const progressed = [];
  const completed = [];

  for (const jobId of workingIds) {
    const current = next.refit?.workOrders?.find((job) => job.id === jobId);
    if (!current || current.status !== REFIT_JOB_STATES.WORKING) continue;

    const before = safeHours(current.remainingHours);
    const remaining = Math.max(0, before - hours);
    if (remaining > 0) {
      const job = createRefitJob({ ...current, remainingHours: remaining });
      next = replaceJob(next, job);
      progressed.push(Object.freeze({ jobId, beforeHours: before, remainingHours: remaining, completed: false }));
      continue;
    }

    const result = completeRefitJob(next, jobId, catalogs, {
      completedAt,
      result: {
        ...(current.result ?? {}),
        outcome: current.result?.outcome ?? "time-complete",
        elapsedByWorldTime: true
      }
    });
    if (!result.ok) return Object.freeze({ ...result, elapsedHours: hours, progressed: Object.freeze(progressed), completed: Object.freeze(completed) });
    next = result.ship;
    progressed.push(Object.freeze({ jobId, beforeHours: before, remainingHours: 0, completed: true }));
    completed.push(result.job);
  }

  return Object.freeze({ ok: true, ship: next, elapsedHours: hours, progressed: Object.freeze(progressed), completed: Object.freeze(completed) });
}
