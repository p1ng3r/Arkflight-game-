import { deriveShip } from "./derive-ship.js";
import { allocateWeaponMounts } from "./weapon-mounts.js";

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

  const weaponMounts = allocateWeaponMounts(ship, catalogs);
  if (!weaponMounts.ok) errors.push(...weaponMounts.errors);

  if ((ship.cargo?.used ?? 0) > (derived.stats.cargoCapacity ?? 0)) {
    warnings.push(`Cargo exceeds capacity: ${ship.cargo.used}/${derived.stats.cargoCapacity}.`);
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    derived,
    weaponMounts
  });
}
