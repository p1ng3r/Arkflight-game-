import { deriveShip } from "./derive-ship.js";

const UNCOMMISSIONED_CAPACITY = Number.MAX_SAFE_INTEGER;

function catalogFor(catalogs, family) {
  if (family === "shipMod") return catalogs?.shipMods ?? {};
  if (family === "arkengineMod") return catalogs?.arkengineMods ?? {};
  throw new Error(`Unknown Arkflight refit family: ${family}`);
}

function installedIds(ship, family) {
  if (family === "shipMod") return [...(ship?.shipMods ?? [])];
  if (family === "arkengineMod") return [...(ship?.arkengine?.modIds ?? [])];
  return [];
}

function slotCost(catalogs, family, componentId) {
  const item = catalogFor(catalogs, family)?.[componentId];
  const value = Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1);
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

export function refitSocketCapacity(ship, catalogs, family) {
  if (!ship?.hull?.chassisId) return UNCOMMISSIONED_CAPACITY;

  const derived = deriveShip(ship, catalogs);
  if (family === "shipMod") {
    return Math.max(0, Math.trunc(Number(derived?.stats?.shipModCapacity ?? 0)));
  }

  const engine = catalogs?.arkengines?.[ship?.arkengine?.chassisId] ?? null;
  if (!engine) return 0;
  const engineCapacity = Number(engine?.data?.modCapacity);
  const fallback = Number(derived?.stats?.arkengineModCapacity ?? 0);
  const value = Number.isFinite(engineCapacity) ? engineCapacity : fallback;
  return Math.max(0, Math.trunc(Number(value ?? 0)));
}

function completedInstallJobs(ship, family) {
  const removedSources = new Set((ship?.refit?.workOrders ?? [])
    .filter((job) => job?.type === "remove" && job?.status === "complete" && job?.componentFamily === family)
    .map((job) => job?.result?.sourceInstallJobId)
    .filter(Boolean));

  return (ship?.refit?.workOrders ?? []).filter((job) =>
    job?.type === "install"
    && job?.status === "complete"
    && job?.componentFamily === family
    && job?.result?.installed !== false
    && !removedSources.has(job.id)
  );
}

function validRequestedSockets(indices, cost, capacity, occupied) {
  const unique = [...new Set((indices ?? []).map((value) => Math.max(0, Math.trunc(Number(value) || 0))))];
  return unique.length === cost
    && unique.every((index) => index < capacity && !occupied.has(index));
}

function firstFreeSockets(occupied, capacity, cost) {
  const free = [];
  for (let index = 0; index < capacity && free.length < cost; index += 1) {
    if (!occupied.has(index)) free.push(index);
  }
  return free.length === cost ? free : [];
}

export function installedSocketLayout(ship, catalogs, family) {
  const capacity = refitSocketCapacity(ship, catalogs, family);
  const ids = installedIds(ship, family);
  const jobs = completedInstallJobs(ship, family);
  const usedJobs = new Set();
  const occupied = new Set();
  const placements = [];
  let usedSlots = 0;

  for (const componentId of ids) {
    const cost = slotCost(catalogs, family, componentId);
    usedSlots += cost;

    let socketIndices = [];
    let sourceJobId = "";
    const jobIndex = jobs.findIndex((job, index) =>
      !usedJobs.has(index)
      && job.componentId === componentId
      && validRequestedSockets(job.socketIndices, cost, capacity, occupied)
    );

    if (jobIndex >= 0) {
      usedJobs.add(jobIndex);
      socketIndices = [...jobs[jobIndex].socketIndices];
      sourceJobId = jobs[jobIndex].id;
    } else {
      socketIndices = firstFreeSockets(occupied, capacity, cost);
    }

    const overCapacity = socketIndices.length !== cost;
    if (!overCapacity) for (const index of socketIndices) occupied.add(index);
    placements.push(Object.freeze({
      componentId,
      slotCost: cost,
      socketIndices: Object.freeze(socketIndices),
      overCapacity,
      sourceJobId
    }));
  }

  const finiteCapacity = capacity !== UNCOMMISSIONED_CAPACITY;
  return Object.freeze({
    family,
    capacity,
    usedSlots,
    overBy: finiteCapacity ? Math.max(0, usedSlots - capacity) : 0,
    occupied: Object.freeze([...occupied].sort((a, b) => a - b)),
    placements: Object.freeze(placements),
    overCapacityPlacements: Object.freeze(finiteCapacity ? placements.filter((entry) => entry.overCapacity) : [])
  });
}

export function validateRefitSocketAssignment(ship, catalogs, { family, componentId, socketIndices = [] } = {}, draft = null) {
  const layout = installedSocketLayout(ship, catalogs, family);
  const cost = slotCost(catalogs, family, componentId);
  const indices = [...new Set((socketIndices ?? []).map((value) => Math.max(0, Math.trunc(Number(value) || 0))))];
  if (layout.usedSlots > layout.capacity) {
    return Object.freeze({ ok: false, reason: "ship-over-capacity", capacity: layout.capacity, used: layout.usedSlots, overBy: layout.overBy });
  }
  if (indices.length !== cost) {
    return Object.freeze({ ok: false, reason: "wrong-slot-count", required: cost, provided: indices.length });
  }
  if (indices.some((index) => index >= layout.capacity)) {
    return Object.freeze({ ok: false, reason: "socket-out-of-range", capacity: layout.capacity });
  }
  const occupied = new Set(layout.occupied);
  for (const entry of draft?.assignments ?? []) {
    if (entry.family !== family) continue;
    for (const index of entry.socketIndices ?? []) occupied.add(index);
  }
  if (indices.some((index) => occupied.has(index))) {
    return Object.freeze({ ok: false, reason: "socket-occupied" });
  }
  if (layout.usedSlots + cost > layout.capacity) {
    return Object.freeze({ ok: false, reason: "capacity-exceeded", capacity: layout.capacity, used: layout.usedSlots, required: cost });
  }
  return Object.freeze({ ok: true, capacity: layout.capacity, used: layout.usedSlots, required: cost, socketIndices: Object.freeze(indices) });
}
