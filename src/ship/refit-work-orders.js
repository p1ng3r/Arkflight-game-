import { normalizeShip } from "./ship-schema.js";
import { consumeComponent, grantComponent, spendSalvageParts, knowsBlueprint } from "./refit-state.js";
import { createRefitJob, REFIT_JOB_STATES, REFIT_JOB_TYPES, REFIT_METHODS } from "./refit-rules.js";
import { validateRefitSocketAssignment } from "./refit-sockets.js";

function catalogFor(catalogs, family) {
  if (family === "shipMod") return catalogs?.shipMods ?? {};
  if (family === "arkengineMod") return catalogs?.arkengineMods ?? {};
  throw new Error(`Unknown Arkflight refit family: ${family}`);
}
function nowIso(value) { return value ?? new Date().toISOString(); }
function idFactoryDefault() { return globalThis.crypto?.randomUUID?.() ?? `refit-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function installArray(ship, family) { return family === "shipMod" ? ship.shipMods ?? [] : ship.arkengine?.modIds ?? []; }
function withInstallArray(ship, family, values) {
  return family === "shipMod"
    ? normalizeShip({ ...ship, shipMods: values })
    : normalizeShip({ ...ship, arkengine: { ...ship.arkengine, modIds: values } });
}
function addJob(ship, job) { return normalizeShip({ ...ship, refit: { ...ship.refit, workOrders: [...(ship.refit?.workOrders ?? []), job] } }); }
function replaceJob(ship, job) { return normalizeShip({ ...ship, refit: { ...ship.refit, workOrders: (ship.refit?.workOrders ?? []).map((entry) => entry.id === job.id ? job : entry) } }); }

function validateInstallAssignments(ship, assignments, catalogs) {
  const staged = { assignments: [] };
  for (const assignment of assignments) {
    const item = catalogFor(catalogs, assignment.family)?.[assignment.componentId];
    if (!item) return { ok: false, reason: "unknown-component" };
    const check = validateRefitSocketAssignment(ship, catalogs, assignment, staged);
    if (!check.ok) return check;
    staged.assignments.push(assignment);
  }
  return { ok: true };
}

export function queueInstallDraft(ship, draft, catalogs, { method = REFIT_METHODS.CREW, createdAt = null, idFactory = idFactoryDefault } = {}) {
  let next = normalizeShip(ship);
  const assignments = [...(draft?.assignments ?? [])];
  if (!assignments.length) return Object.freeze({ ok: false, reason: "empty-draft", ship: next, jobs: [] });

  const socketValidation = validateInstallAssignments(next, assignments, catalogs);
  if (!socketValidation.ok) return Object.freeze({ ...socketValidation, ship: next, jobs: [] });

  const totalParts = assignments.reduce((sum, a) => sum + Number(catalogFor(catalogs, a.family)?.[a.componentId]?.data?.refit?.install?.partsCost ?? 0), 0);
  const spent = spendSalvageParts(next, totalParts);
  if (!spent.ok) return Object.freeze({ ...spent, jobs: [] });
  next = spent.ship;
  const jobs = [];
  for (const assignment of assignments) {
    const item = catalogFor(catalogs, assignment.family)?.[assignment.componentId];
    const consumed = consumeComponent(next, assignment.family, assignment.componentId, 1);
    if (!consumed.ok) return Object.freeze({ ok: false, reason: consumed.reason, ship: normalizeShip(ship), jobs: [] });
    next = consumed.ship;
    const spec = item.data.refit;
    const job = createRefitJob({
      id: idFactory(), type: REFIT_JOB_TYPES.INSTALL, method,
      componentFamily: assignment.family, componentId: assignment.componentId,
      socketIndices: assignment.socketIndices, craftingDC: spec.install.dc,
      partsCost: spec.install.partsCost, goldCost: method === REFIT_METHODS.SHIPYARD ? spec.install.shipyardGold : 0,
      durationHours: spec.install.timeHours, reservation: { partsSpent: spec.install.partsCost, componentHeld: true }, createdAt: nowIso(createdAt)
    });
    jobs.push(job); next = addJob(next, job);
  }
  return Object.freeze({ ok: true, ship: next, jobs: Object.freeze(jobs), partsSpent: totalParts });
}

export function recordCrewInstallFailure(ship, assignment, catalogs, {
  workerActorUuid = "", outcome = "failure", elapsedHours = null, createdAt = null, idFactory = idFactoryDefault
} = {}) {
  const normalized = normalizeShip(ship);
  const item = catalogFor(catalogs, assignment?.family)?.[assignment?.componentId];
  if (!item) return { ok: false, reason: "unknown-component", ship: normalized };
  const spec = item.data?.refit?.install;
  const partsCost = Math.max(0, Math.trunc(Number(spec?.partsCost ?? 0)));
  const spent = spendSalvageParts(normalized, partsCost);
  if (!spent.ok) return spent;
  const durationHours = Math.max(0, Number(spec?.timeHours ?? 0));
  const actualHours = Math.max(0, Number(elapsedHours ?? durationHours));
  const complication = outcome === "criticalFailure";
  const job = createRefitJob({
    id: idFactory(),
    type: REFIT_JOB_TYPES.INSTALL,
    method: REFIT_METHODS.CREW,
    componentFamily: assignment.family,
    componentId: assignment.componentId,
    socketIndices: assignment.socketIndices ?? [],
    craftingDC: spec?.dc ?? 0,
    partsCost,
    durationHours,
    remainingHours: 0,
    status: complication ? REFIT_JOB_STATES.COMPLICATION : REFIT_JOB_STATES.COMPLETE,
    reservation: { partsSpent: partsCost, componentHeld: false },
    result: {
      outcome,
      workerActorUuid,
      engineeringSkill: "crafting",
      baseDurationHours: durationHours,
      elapsedHours: actualHours,
      timeMultiplier: durationHours > 0 ? actualHours / durationHours : 1,
      installed: false,
      ...(complication ? { complication: "installation-complication" } : {})
    },
    createdAt: nowIso(createdAt),
    completedAt: complication ? null : nowIso(createdAt)
  });
  return { ok: true, ship: addJob(spent.ship, job), job, partsSpent: partsCost };
}

export function recordCrewInstallComplication(ship, assignment, catalogs, options = {}) {
  return recordCrewInstallFailure(ship, assignment, catalogs, { ...options, outcome: options.outcome ?? "criticalFailure" });
}

export function queueBuildJob(ship, family, componentId, catalogs, { method = REFIT_METHODS.CREW, createdAt = null, idFactory = idFactoryDefault } = {}) {
  const normalized = normalizeShip(ship); const item = catalogFor(catalogs, family)?.[componentId];
  if (!item) return { ok: false, reason: "unknown-component", ship: normalized };
  if (item.data.refit.blueprintRequired && !knowsBlueprint(normalized, family, componentId)) return { ok: false, reason: "blueprint-required", ship: normalized };
  const spec = item.data.refit; const spent = spendSalvageParts(normalized, spec.build.partsCost); if (!spent.ok) return spent;
  const job = createRefitJob({ id: idFactory(), type: REFIT_JOB_TYPES.BUILD, method, componentFamily: family, componentId, craftingDC: spec.build.dc, partsCost: spec.build.partsCost, goldCost: method === REFIT_METHODS.SHIPYARD ? spec.build.shipyardGold : 0, durationHours: spec.build.timeHours, reservation: { partsSpent: spec.build.partsCost }, createdAt: nowIso(createdAt) });
  return { ok: true, ship: addJob(spent.ship, job), job };
}

export function queueRemoveJob(ship, family, componentId, catalogs, {
  method = REFIT_METHODS.CREW,
  socketIndices = [],
  sourceInstallJobId = "",
  createdAt = null,
  idFactory = idFactoryDefault
} = {}) {
  const normalized = normalizeShip(ship); const item = catalogFor(catalogs, family)?.[componentId];
  if (!item) return { ok: false, reason: "unknown-component", ship: normalized };
  const installed = installArray(normalized, family).filter((id) => id === componentId).length;
  const pending = (normalized.refit?.workOrders ?? []).filter((j) => j.type === REFIT_JOB_TYPES.REMOVE && j.componentFamily === family && j.componentId === componentId && ![REFIT_JOB_STATES.COMPLETE, REFIT_JOB_STATES.COMPLICATION].includes(j.status)).length;
  if (pending >= installed) return { ok: false, reason: "component-not-installed", ship: normalized };
  const spec = item.data.refit; const duration = Math.max(1, Math.ceil(spec.install.timeHours / 2));
  const job = createRefitJob({
    id: idFactory(), type: REFIT_JOB_TYPES.REMOVE, method,
    componentFamily: family, componentId,
    socketIndices,
    durationHours: duration, craftingDC: spec.install.dc,
    result: sourceInstallJobId ? { sourceInstallJobId: String(sourceInstallJobId) } : null,
    createdAt: nowIso(createdAt)
  });
  return { ok: true, ship: addJob(normalized, job), job };
}

export function queueRepairJob(ship, { componentFamily = "", componentId = "", durationHours = 8, craftingDC = 15, partsCost = 1, method = REFIT_METHODS.CREW, createdAt = null, idFactory = idFactoryDefault } = {}) {
  const normalized = normalizeShip(ship); const spent = spendSalvageParts(normalized, partsCost); if (!spent.ok) return spent;
  const job = createRefitJob({ id: idFactory(), type: REFIT_JOB_TYPES.REPAIR, method, componentFamily, componentId, durationHours, craftingDC, partsCost, reservation: { partsSpent: partsCost }, createdAt: nowIso(createdAt) });
  return { ok: true, ship: addJob(spent.ship, job), job };
}

export function startRefitJob(ship, jobId, { startedAt = null } = {}) {
  const normalized = normalizeShip(ship); const found = normalized.refit?.workOrders?.find((j) => j.id === jobId);
  if (!found) return { ok: false, reason: "job-not-found", ship: normalized };
  if (found.status !== REFIT_JOB_STATES.PLANNED) return { ok: false, reason: "job-not-planned", ship: normalized };
  const job = createRefitJob({ ...found, status: REFIT_JOB_STATES.WORKING, startedAt: nowIso(startedAt) });
  return { ok: true, ship: replaceJob(normalized, job), job };
}

export function completeRefitJob(ship, jobId, catalogs, { completedAt = null, result = { outcome: "success" } } = {}) {
  let next = normalizeShip(ship); const found = next.refit?.workOrders?.find((j) => j.id === jobId);
  if (!found) return { ok: false, reason: "job-not-found", ship: next };
  if (![REFIT_JOB_STATES.PLANNED, REFIT_JOB_STATES.WORKING].includes(found.status)) return { ok: false, reason: "job-not-active", ship: next };
  if (found.type === REFIT_JOB_TYPES.BUILD) next = grantComponent(next, found.componentFamily, found.componentId, found.quantity);
  if (found.type === REFIT_JOB_TYPES.INSTALL) {
    const socketValidation = validateRefitSocketAssignment(next, catalogs, {
      family: found.componentFamily,
      componentId: found.componentId,
      socketIndices: found.socketIndices
    });
    if (!socketValidation.ok) return { ...socketValidation, ship: next };
    next = withInstallArray(next, found.componentFamily, [...installArray(next, found.componentFamily), found.componentId]);
  }
  if (found.type === REFIT_JOB_TYPES.REMOVE) {
    const arr = [...installArray(next, found.componentFamily)]; const index = arr.indexOf(found.componentId); if (index < 0) return { ok: false, reason: "component-not-installed", ship: next };
    arr.splice(index, 1); next = grantComponent(withInstallArray(next, found.componentFamily, arr), found.componentFamily, found.componentId, 1);
  }
  const mergedResult = Object.freeze({ ...(found.result ?? {}), ...(result ?? {}) });
  const job = createRefitJob({ ...found, status: REFIT_JOB_STATES.COMPLETE, remainingHours: 0, result: mergedResult, completedAt: nowIso(completedAt) });
  next = replaceJob(next, job); return { ok: true, ship: next, job };
}
