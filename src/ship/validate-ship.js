import { deriveShip } from "./derive-ship.js";

const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });

function validateWeaponInstalls(ship, catalogs, hull, errors, warnings) {
  const installs = ship.weapons ?? [];
  const mounts = hull?.data?.baseStats?.weaponMounts ?? {};
  const occupied = new Set();

  for (const install of installs) {
    const id = typeof install === "string" ? install : install?.id;
    const weapon = catalogs.weapons?.[id];
    if (!weapon) {
      errors.push(`Unknown weapon: ${id || "<empty>"}.`);
      continue;
    }

    if (typeof install === "string") {
      warnings.push(`${weapon.name} has no assigned weapon mount yet.`);
      continue;
    }

    const arc = install?.arc;
    const mountIndex = Number(install?.mountIndex);
    const mount = mounts?.[arc];
    if (!mount || !Number.isInteger(mountIndex) || mountIndex < 0 || mountIndex >= Number(mount.count ?? 0)) {
      errors.push(`${weapon.name} is assigned to an invalid ${arc || "unknown"} mount.`);
      continue;
    }

    const key = `${arc}:${mountIndex}`;
    if (occupied.has(key)) {
      errors.push(`Multiple weapons are assigned to ${arc} mount ${mountIndex + 1}.`);
      continue;
    }
    occupied.add(key);

    if (!(weapon.data?.arcs ?? []).includes(arc)) {
      errors.push(`${weapon.name} cannot fire from the ${arc} arc.`);
    }

    const weaponSize = weapon.data?.size ?? "small";
    const maxSize = mount.maxSize ?? "small";
    if ((SIZE_RANK[weaponSize] ?? 99) > (SIZE_RANK[maxSize] ?? 0)) {
      errors.push(`${weapon.name} (${weaponSize}) is too large for ${arc} mount ${mountIndex + 1} (${maxSize} max).`);
    }
  }
}

export function validateShip(ship, catalogs = {}) {
  const errors = [];
  const warnings = [];
  const hull = catalogs.hulls?.[ship.hull?.chassisId];
  const engine = catalogs.arkengines?.[ship.arkengine?.chassisId];

  if (!hull) errors.push(`Unknown hull chassis: ${ship.hull?.chassisId || "<empty>"}`);
  if (!engine) errors.push(`Unknown Arkengine chassis: ${ship.arkengine?.chassisId || "<empty>"}`);

  if (hull && engine) {
    const allowed = hull.data?.allowedArkengines ?? [];
    if (allowed.length && !allowed.includes(engine.id)) {
      errors.push(`${engine.name} is not compatible with ${hull.name}.`);
    }
  }

  const derived = deriveShip(ship, catalogs);
  const districtScale = hull?.data?.districtScale === true;
  const roomCapacity = derived.stats.roomCapacity;
  const shipModCapacity = derived.stats.shipModCapacity;

  if (!districtScale && Number.isFinite(roomCapacity) && derived.usage.rooms > roomCapacity) {
    errors.push(`Room capacity exceeded: ${derived.usage.rooms}/${roomCapacity}.`);
  }
  if (!districtScale && Number.isFinite(shipModCapacity) && derived.usage.shipMods > shipModCapacity) {
    errors.push(`Ship Mod capacity exceeded: ${derived.usage.shipMods}/${shipModCapacity}.`);
  }

  const engineCapacity = engine?.data?.modCapacity ?? derived.stats.arkengineModCapacity ?? 0;
  if (Number.isFinite(engineCapacity) && derived.usage.arkengineMods > engineCapacity) {
    errors.push(`Arkengine Mod capacity exceeded: ${derived.usage.arkengineMods}/${engineCapacity}.`);
  }

  if ((ship.cargo?.used ?? 0) > (derived.stats.cargoCapacity ?? 0)) {
    warnings.push(`Cargo exceeds capacity: ${ship.cargo.used}/${derived.stats.cargoCapacity}.`);
  }

  if (hull) validateWeaponInstalls(ship, catalogs, hull, errors, warnings);

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    derived
  });
}
