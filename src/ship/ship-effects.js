import { resolveStrainContribution } from "./area-readiness.js";
import { applyShipSystemDegradation, canonicalDamageTarget, improveShipCondition } from "./ship-conditions.js";
import { normalizeShip } from "./ship-schema.js";

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

function recoverLegacyTarget(ship, rawTarget, steps = 1) {
  const target = canonicalDamageTarget(rawTarget);
  if (["hull", "drive", "weapons"].includes(target)) return improveShipCondition(ship, target, steps).ship;
  const next = normalizeShip(structuredClone(ship));
  if (target === "lifeveil") {
    const current = Math.max(0, Number(next.resources?.lifeveil?.value) || 0);
    next.resources.lifeveil = { ...(next.resources.lifeveil ?? {}), value: clamp(current + 25 * steps, 0, 100), max: 100 };
    return next;
  }
  if (target === "morale") {
    const current = Math.max(0, Number(next.resources?.morale?.value) || 0);
    next.resources.morale = { ...(next.resources.morale ?? {}), value: clamp(current + 20 * steps, 0, 100), max: 100 };
    return next;
  }
  throw new Error(`Unknown Arkflight Ship Condition target: ${rawTarget}`);
}

export function changeAreaState(ship, area, steps = 1) {
  // Compatibility bridge: old authored "Area" effects now worsen/improve the
  // equivalent Ship Condition or percentage resource.
  if (Number(steps) < 0) return recoverLegacyTarget(ship, area, Math.abs(Number(steps)));
  return applyShipSystemDegradation(ship, canonicalDamageTarget(area)).ship;
}

export function applyShipEffect(ship, effect = {}) {
  let next = normalizeShip(structuredClone(ship));
  switch (effect.kind) {
    case "gain-strain": {
      const delta = Number(effect.value ?? 0);
      const resource = next.resources?.strain ?? { value: 0, max: 0 };
      if (delta > 0) {
        const resolved = resolveStrainContribution(next, {
          amount: delta,
          strainLimit: resource.max,
          suppressFlatCheck: Boolean(effect.suppressFlatCheck),
          alreadyDegraded: Boolean(effect.alreadyDegraded)
        });
        return { ship: resolved.ship, affectedSystem: null, threatenedArea: null, strainResolution: resolved };
      }
      next.resources.strain = { ...resource, value: Math.max(0, Number(resource.value ?? 0) + delta) };
      return { ship: next, affectedSystem: null, threatenedArea: null };
    }
    case "damage-hull": {
      const resource = next.resources?.hull ?? { value: 0, max: 0 };
      next.resources.hull = { ...resource, value: clamp(Number(resource.value ?? 0) - Math.abs(Number(effect.value ?? 0)), 0, Number(resource.max ?? 0)) };
      return { ship: next, affectedSystem: "hull", threatenedArea: "hull" };
    }
    case "damage-lifeveil": {
      const resource = next.resources?.lifeveil ?? { value: 0, max: 100 };
      next.resources.lifeveil = { ...resource, max: 100, value: clamp(Number(resource.value ?? 0) - Math.abs(Number(effect.value ?? 0)), 0, 100) };
      return { ship: next, affectedSystem: "lifeveil", threatenedArea: "lifeveil" };
    }
    case "change-morale": {
      const resource = next.resources?.morale ?? { value: 0, max: 100 };
      next.resources.morale = { ...resource, max: 100, value: clamp(Number(resource.value ?? 0) + Number(effect.value ?? 0), 0, 100) };
      return { ship: next, affectedSystem: "morale", threatenedArea: "morale" };
    }
    case "degrade-system":
    case "degrade-area": {
      const target = canonicalDamageTarget(effect.system ?? effect.area);
      const degraded = applyShipSystemDegradation(next, target, { chosenTarget: effect.chosenTarget });
      return { ship: degraded.ship, affectedSystem: degraded.target, threatenedArea: degraded.target, degradation: degraded };
    }
    case "recover-system":
    case "recover-area": {
      const target = canonicalDamageTarget(effect.system ?? effect.area);
      const recovered = recoverLegacyTarget(next, target, Math.max(1, Math.abs(Number(effect.steps ?? 1))));
      return { ship: recovered, affectedSystem: target, threatenedArea: target };
    }
    case "add-condition": {
      if (!effect.condition?.id) throw new Error("Arkflight condition effects require condition.id");
      next.conditions = [...(next.conditions ?? []).filter((row) => row?.id !== effect.condition.id), structuredClone(effect.condition)];
      return { ship: next, affectedSystem: effect.condition.system ?? null, threatenedArea: effect.condition.system ?? null };
    }
    case "remove-condition":
      next.conditions = [...(next.conditions ?? []).filter((row) => row?.id !== effect.conditionId)];
      return { ship: next, affectedSystem: null, threatenedArea: null };
    default:
      throw new Error(`Unsupported Arkflight ship effect: ${effect.kind}`);
  }
}

export function applyShipEffects(ship, effects = []) {
  let next = normalizeShip(structuredClone(ship));
  const affectedSystems = [];
  for (const effect of effects) {
    const result = applyShipEffect(next, effect);
    next = result.ship;
    const system = result.affectedSystem ?? result.threatenedArea;
    if (system && !affectedSystems.includes(system)) affectedSystems.push(system);
  }
  // threatenedAreas is retained as a compatibility alias for older event code.
  return { ship: next, affectedSystems, threatenedAreas: affectedSystems };
}
