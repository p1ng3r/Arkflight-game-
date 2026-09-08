import { normalizeShip } from "./ship-schema.js";

const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });
const MOUNT_ORDER = Object.freeze(["fore", "port", "starboard", "aft"]);

function weaponId(install) {
  return typeof install === "string" ? install : install?.id;
}

function installMount(install) {
  if (!install || typeof install !== "object") return null;
  const facing = install.mount ?? install.arc;
  const mountIndex = Number(install.mountIndex);
  if (!facing || !Number.isInteger(mountIndex) || mountIndex < 0) return null;
  return { facing, mountIndex };
}

function weaponFitsSlot(weapon, slot) {
  if (!weapon || !slot) return false;
  const allowed = weapon.data?.allowedMounts ?? [];
  const weaponSize = weapon.data?.size ?? weapon.data?.mountType ?? "small";
  return allowed.includes(slot.facing)
    && (SIZE_RANK[weaponSize] ?? 99) <= (SIZE_RANK[slot.maxSize] ?? 0);
}

function rawMountSlots(ship, catalogs = {}) {
  const hull = catalogs.hulls?.[ship?.hull?.chassisId] ?? null;
  const mounts = hull?.data?.baseStats?.weaponMounts ?? {};
  const rows = [];
  for (const facing of MOUNT_ORDER) {
    const mount = mounts?.[facing];
    const count = Math.max(0, Math.trunc(Number(mount?.count) || 0));
    for (let mountIndex = 0; mountIndex < count; mountIndex += 1) {
      rows.push({ facing, mountIndex, maxSize: mount?.maxSize ?? "small" });
    }
  }
  return rows;
}

function occupiedMountKeys(ship, catalogs, slots) {
  const occupied = new Set();
  const slotByKey = new Map(slots.map((slot) => [`${slot.facing}:${slot.mountIndex}`, slot]));

  // Modern installs reserve their authored mount exactly.
  for (const install of ship?.weapons ?? []) {
    const assigned = installMount(install);
    if (!assigned) continue;
    const key = `${assigned.facing}:${assigned.mountIndex}`;
    if (slotByKey.has(key)) occupied.add(key);
  }

  // Legacy string installs never had mount data. Reserve the first legal slot so
  // quick-loading a new weapon does not casually overlap them.
  for (const install of ship?.weapons ?? []) {
    if (install && typeof install === "object") continue;
    const weapon = catalogs.weapons?.[weaponId(install)] ?? null;
    if (!weapon) continue;
    const slot = slots.find((candidate) => {
      const key = `${candidate.facing}:${candidate.mountIndex}`;
      return !occupied.has(key) && weaponFitsSlot(weapon, candidate);
    });
    if (slot) occupied.add(`${slot.facing}:${slot.mountIndex}`);
  }
  return occupied;
}

export function weaponMountSlots(ship, catalogs = {}) {
  const slots = rawMountSlots(ship, catalogs);
  const occupied = occupiedMountKeys(ship, catalogs, slots);
  return Object.freeze(slots.map((slot) => Object.freeze({
    ...slot,
    occupied: occupied.has(`${slot.facing}:${slot.mountIndex}`)
  })));
}

export function findAvailableWeaponMount(ship, catalogs = {}, weaponIdValue) {
  const weapon = catalogs.weapons?.[weaponIdValue] ?? null;
  if (!weapon) return Object.freeze({ ok: false, reason: "unknown-weapon", weaponId: weaponIdValue });

  const hull = catalogs.hulls?.[ship?.hull?.chassisId] ?? null;
  if (!hull) return Object.freeze({ ok: false, reason: "hull-required", weaponId: weaponIdValue, weapon });

  const shipLevel = Math.max(1, Math.trunc(Number(ship?.progression?.level) || 1));
  const minShipLevel = Math.max(1, Math.trunc(Number(weapon.data?.minShipLevel) || 1));
  if (shipLevel < minShipLevel) {
    return Object.freeze({ ok: false, reason: "ship-level-too-low", shipLevel, minShipLevel, weaponId: weaponIdValue, weapon });
  }

  const slots = weaponMountSlots(ship, catalogs);
  const slot = slots.find((candidate) => !candidate.occupied && weaponFitsSlot(weapon, candidate));
  if (!slot) {
    return Object.freeze({
      ok: false,
      reason: "no-compatible-mount",
      weaponId: weaponIdValue,
      weapon,
      allowedMounts: Object.freeze([...(weapon.data?.allowedMounts ?? [])]),
      weaponSize: weapon.data?.size ?? weapon.data?.mountType ?? "small"
    });
  }

  return Object.freeze({ ok: true, weaponId: weaponIdValue, weapon, slot });
}

function defaultInstanceId() {
  return globalThis.crypto?.randomUUID?.() ?? `weapon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function quickInstallWeapon(ship, catalogs = {}, weaponIdValue, { instanceIdFactory = defaultInstanceId } = {}) {
  const match = findAvailableWeaponMount(ship, catalogs, weaponIdValue);
  if (!match.ok) return Object.freeze({ ...match, ship: normalizeShip(ship) });

  const { weapon, slot } = match;
  const install = Object.freeze({
    id: weapon.id,
    instanceId: String(instanceIdFactory()),
    mount: slot.facing,
    // Combat/validation currently read `arc` as the physical mount facing.
    // Keep it during the combat refactor while also carrying the explicit mount.
    arc: slot.facing,
    mountIndex: slot.mountIndex,
    firingArc: weapon.data?.combat?.arcTemplate ?? "wide",
    upgrades: Object.freeze({ potency: 0, impact: 0, properties: Object.freeze([]) })
  });

  const next = normalizeShip({
    ...ship,
    weapons: [...(ship?.weapons ?? []), install]
  });

  return Object.freeze({ ok: true, ship: next, weapon, install, slot });
}
