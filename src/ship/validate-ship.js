import { deriveShip } from "./derive-ship.js";

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
  if (derived.usage.rooms > (derived.stats.roomCapacity ?? 0)) {
    errors.push(`Room capacity exceeded: ${derived.usage.rooms}/${derived.stats.roomCapacity}.`);
  }
  if (derived.usage.shipMods > (derived.stats.shipModCapacity ?? 0)) {
    errors.push(`Ship Mod capacity exceeded: ${derived.usage.shipMods}/${derived.stats.shipModCapacity}.`);
  }

  const engineCapacity = engine?.data?.modCapacity ?? derived.stats.arkengineModCapacity ?? 0;
  if (derived.usage.arkengineMods > engineCapacity) {
    errors.push(`Arkengine Mod capacity exceeded: ${derived.usage.arkengineMods}/${engineCapacity}.`);
  }

  if ((ship.cargo?.used ?? 0) > (derived.stats.cargoCapacity ?? 0)) {
    warnings.push(`Cargo exceeds capacity: ${ship.cargo.used}/${derived.stats.cargoCapacity}.`);
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    derived
  });
}
