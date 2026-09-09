import { deriveShip } from "./derive-ship.js";

const UNCOMMISSIONED_CAPACITY = Number.MAX_SAFE_INTEGER;
const WEAPON_SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });
const WEAPON_MOUNT_ORDER = Object.freeze(["fore", "port", "starboard", "aft"]);

function catalogFor(catalogs, family) {
  if (family === "shipMod") return catalogs?.shipMods ?? {};
  if (family === "arkengineMod") return catalogs?.arkengineMods ?? {};
  if (family === "weapon") return catalogs?.weapons ?? {};
  throw new Error(`Unknown Arkflight refit family: ${family}`);
}

function installedIds(ship, family) {
  if (family === "shipMod") return [...(ship?.shipMods ?? [])];
  if (family === "arkengineMod") return [...(ship?.arkengine?.modIds ?? [])];
  if (family === "weapon") return [...(ship?.weapons ?? [])];
  return [];
}

function installedComponentId(value) {
  return typeof value === "string" ? value : value?.id;
}

export function weaponMountSocketRows(ship, catalogs) {
  const hull = catalogs?.hulls?.[ship?.hull?.chassisId] ?? null;
  const mounts = hull?.data?.baseStats?.weaponMounts
    ?? hull?.data?.weaponMounts
    ?? hull?.weaponMounts
    ?? {};
  const rows = [];
  for (const facing of WEAPON_MOUNT_ORDER) {
    const mount = mounts?.[facing] ?? {};
    const count = Math.max(0, Math.trunc(Number(mount.count ?? mount.max ?? mount) || 0));
    for (let mountIndex = 0; mountIndex < count; mountIndex += 1) {
      rows.push(Object.freeze({ index: rows.length, facing, mountIndex, maxSize: mount.maxSize ?? "small" }));
    }
  }
  return Object.freeze(rows);
}

function weaponFitsMount(weapon, mount) {
  if (!weapon || !mount) return false;
  const size = weapon.data?.size ?? weapon.data?.mountType ?? "small";
  return (weapon.data?.allowedMounts ?? []).includes(mount.facing)
    && (WEAPON_SIZE_RANK[size] ?? 99) <= (WEAPON_SIZE_RANK[mount.maxSize] ?? 0);
}

function slotCost(catalogs, family, componentId) {
  const item = catalogFor(catalogs, family)?.[componentId];
  const value = Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1);
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

function weaponMountCapacity(ship, catalogs, derived) {
  const hull = catalogs?.hulls?.[ship?.hull?.chassisId] ?? null;
  const mounts = hull?.data?.baseStats?.weaponMounts
    ?? hull?.data?.weaponMounts
    ?? hull?.data?.weaponSockets
    ?? hull?.weaponMounts
    ?? hull?.weaponSockets
    ?? derived?.stats?.weaponMounts
    ?? derived?.stats?.weaponCapacity
    ?? 0;
  if (Array.isArray(mounts)) return mounts.length;
  if (mounts && typeof mounts === "object") {
    return Object.values(mounts).reduce((sum, row) => sum + Math.max(0, Math.trunc(Number(row?.count ?? row?.max ?? row) || 0)), 0);
  }
  return Math.max(0, Math.trunc(Number(mounts) || 0));
}

function installedWeaponSocketLayout(ship, catalogs) {
  const mounts = weaponMountSocketRows(ship, catalogs);
  const jobs = completedInstallJobs(ship, "weapon");
  const usedJobs = new Set();
  const occupied = new Set();
  const placements = [];

  for (const install of ship?.weapons ?? []) {
    const componentId = installedComponentId(install);
    const weapon = catalogs?.weapons?.[componentId] ?? null;
    let socketIndex = -1;
    let sourceJobId = "";
    if (install && typeof install === "object") {
      const facing = install.mount ?? install.arc;
      const mountIndex = Number(install.mountIndex);
      socketIndex = mounts.findIndex((row) => row.facing === facing && row.mountIndex === mountIndex);
    }
    if (socketIndex < 0) {
      const jobIndex = jobs.findIndex((job, index) => !usedJobs.has(index) && job.componentId === componentId && job.socketIndices?.length === 1 && !occupied.has(job.socketIndices[0]));
      if (jobIndex >= 0) {
        usedJobs.add(jobIndex);
        socketIndex = jobs[jobIndex].socketIndices[0];
        sourceJobId = jobs[jobIndex].id;
      }
    }
    if (socketIndex < 0) socketIndex = mounts.findIndex((mount) => !occupied.has(mount.index) && weaponFitsMount(weapon, mount));
    const overCapacity = socketIndex < 0 || socketIndex >= mounts.length || occupied.has(socketIndex) || !weaponFitsMount(weapon, mounts[socketIndex]);
    if (!overCapacity) occupied.add(socketIndex);
    placements.push(Object.freeze({ componentId, slotCost: 1, socketIndices: Object.freeze(overCapacity ? [] : [socketIndex]), overCapacity, sourceJobId, install }));
  }

  return Object.freeze({
    family: "weapon",
    capacity: mounts.length,
    usedSlots: (ship?.weapons ?? []).length,
    overBy: placements.filter((entry) => entry.overCapacity).length,
    occupied: Object.freeze([...occupied].sort((a, b) => a - b)),
    placements: Object.freeze(placements),
    overCapacityPlacements: Object.freeze(placements.filter((entry) => entry.overCapacity)),
    mounts
  });
}

export function refitSocketCapacity(ship, catalogs, family) {
  if (!ship?.hull?.chassisId) return UNCOMMISSIONED_CAPACITY;

  const derived = deriveShip(ship, catalogs);
  if (family === "shipMod") {
    return Math.max(0, Math.trunc(Number(derived?.stats?.shipModCapacity ?? 0)));
  }
  if (family === "weapon") {
    return Math.max(weaponMountCapacity(ship, catalogs, derived), ship?.weapons?.length ?? 0);
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

function pendingInstallJobs(ship, family) {
  return (ship?.refit?.workOrders ?? []).filter((job) =>
    job?.type === "install"
    && ["planned", "working", "PLANNED", "WORKING"].includes(job?.status)
    && job?.componentFamily === family
  );
}

function reservedSocketSet(ship, family, excludeJobId = "") {
  const reserved = new Set();
  for (const job of pendingInstallJobs(ship, family)) {
    if (excludeJobId && job.id === excludeJobId) continue;
    for (const value of job.socketIndices ?? []) {
      const index = Math.max(0, Math.trunc(Number(value) || 0));
      reserved.add(index);
    }
  }
  return reserved;
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
  if (family === "weapon") return installedWeaponSocketLayout(ship, catalogs);
  const capacity = refitSocketCapacity(ship, catalogs, family);
  const ids = installedIds(ship, family);
  const jobs = completedInstallJobs(ship, family);
  const usedJobs = new Set();
  const occupied = new Set();
  const placements = [];
  let usedSlots = 0;

  for (const installed of ids) {
    const componentId = installedComponentId(installed);
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

export function pendingSocketReservations(ship, family) {
  return Object.freeze([...reservedSocketSet(ship, family)].sort((a, b) => a - b));
}

/** Return the first currently legal socket assignment for a component. */
export function findAvailableRefitSocketAssignment(ship, catalogs, { family, componentId } = {}) {
  const item = catalogFor(catalogs, family)?.[componentId];
  if (!item) return Object.freeze({ ok: false, reason: "unknown-component", socketIndices: Object.freeze([]) });
  const layout = installedSocketLayout(ship, catalogs, family);
  const cost = slotCost(catalogs, family, componentId);
  const reserved = reservedSocketSet(ship, family);
  const unavailable = new Set([...layout.occupied, ...reserved]);
  if (layout.usedSlots > layout.capacity) {
    return Object.freeze({ ok: false, reason: "ship-over-capacity", capacity: layout.capacity, used: layout.usedSlots, overBy: layout.overBy, socketIndices: Object.freeze([]) });
  }
  if (layout.usedSlots + reserved.size + cost > layout.capacity) {
    return Object.freeze({ ok: false, reason: "capacity-exceeded", capacity: layout.capacity, used: layout.usedSlots + reserved.size, required: cost, socketIndices: Object.freeze([]) });
  }
  const socketIndices = family === "weapon"
    ? (layout.mounts ?? weaponMountSocketRows(ship, catalogs)).filter((mount) => !unavailable.has(mount.index) && weaponFitsMount(item, mount)).slice(0, 1).map((mount) => mount.index)
    : firstFreeSockets(unavailable, layout.capacity, cost);
  if (socketIndices.length !== cost) {
    return Object.freeze({ ok: false, reason: "no-legal-socket", capacity: layout.capacity, used: layout.usedSlots + reserved.size, required: cost, socketIndices: Object.freeze([]) });
  }
  return Object.freeze({ ok: true, capacity: layout.capacity, used: layout.usedSlots + reserved.size, required: cost, socketIndices: Object.freeze(socketIndices) });
}

export function validateRefitSocketAssignment(ship, catalogs, { family, componentId, socketIndices = [], sourceJobId = "" } = {}, draft = null) {
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
  if (family === "weapon") {
    const weapon = catalogFor(catalogs, family)?.[componentId];
    const mount = (layout.mounts ?? weaponMountSocketRows(ship, catalogs)).find((entry) => entry.index === indices[0]);
    if (!weaponFitsMount(weapon, mount)) {
      return Object.freeze({ ok: false, reason: "incompatible-weapon-mount", socketIndex: indices[0], facing: mount?.facing ?? null, maxSize: mount?.maxSize ?? null });
    }
    const shipLevel = Math.max(1, Math.trunc(Number(ship?.progression?.level) || 1));
    const minShipLevel = Math.max(1, Math.trunc(Number(weapon?.data?.minShipLevel) || 1));
    if (shipLevel < minShipLevel) return Object.freeze({ ok: false, reason: "ship-level-too-low", shipLevel, minShipLevel });
  }
  const reserved = reservedSocketSet(ship, family, sourceJobId);
  const occupied = new Set([...layout.occupied, ...reserved]);
  for (const entry of draft?.assignments ?? []) {
    if (entry.family !== family) continue;
    for (const index of entry.socketIndices ?? []) occupied.add(index);
  }
  if (indices.some((index) => occupied.has(index))) {
    return Object.freeze({ ok: false, reason: "socket-occupied" });
  }
  if (layout.usedSlots + reserved.size + cost > layout.capacity) {
    return Object.freeze({ ok: false, reason: "capacity-exceeded", capacity: layout.capacity, used: layout.usedSlots + reserved.size, required: cost });
  }
  return Object.freeze({ ok: true, capacity: layout.capacity, used: layout.usedSlots + reserved.size, required: cost, socketIndices: Object.freeze(indices) });
}
