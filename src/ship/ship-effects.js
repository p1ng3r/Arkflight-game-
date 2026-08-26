import { AREA_STATES, SHIP_AREA_KEYS, normalizeShip } from "./ship-schema.js";

const AREA_ORDER = Object.freeze([AREA_STATES.STABLE, AREA_STATES.STRESSED, AREA_STATES.DAMAGED, AREA_STATES.CRITICAL, AREA_STATES.DISABLED]);

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function assertArea(area) { if (!SHIP_AREA_KEYS.includes(area)) throw new Error(`Unknown Arkflight area: ${area}`); }

export function changeAreaState(ship, area, steps = 1) {
  assertArea(area);
  const next = normalizeShip(structuredClone(ship));
  const current = next.areas?.[area]?.state ?? AREA_STATES.STABLE;
  const index = Math.max(0, AREA_ORDER.indexOf(current));
  const target = clamp(index + Number(steps ?? 0), 0, AREA_ORDER.length - 1);
  next.areas[area] = { ...(next.areas[area] ?? {}), state: AREA_ORDER[target] };
  return next;
}

export function applyShipEffect(ship, effect = {}) {
  let next = normalizeShip(structuredClone(ship));
  switch (effect.kind) {
    case "gain-strain": {
      if (effect.area) assertArea(effect.area);
      const resource = next.resources?.strain ?? { value: 0, max: 0 };
      const max = Number(resource.max ?? 0);
      const value = Number(resource.value ?? 0) + Number(effect.value ?? 0);
      next.resources.strain = { ...resource, value: max > 0 ? clamp(value, 0, max) : Math.max(0, value) };
      return { ship: next, threatenedArea: effect.area ?? null };
    }
    case "damage-hull": {
      const resource = next.resources?.hull ?? { value: 0, max: 0 };
      next.resources.hull = { ...resource, value: clamp(Number(resource.value ?? 0) - Math.abs(Number(effect.value ?? 0)), 0, Number(resource.max ?? 0)) };
      return { ship: next, threatenedArea: "hull" };
    }
    case "damage-lifeveil": {
      const resource = next.resources?.lifeveil ?? { value: 0, max: 0 };
      next.resources.lifeveil = { ...resource, value: clamp(Number(resource.value ?? 0) - Math.abs(Number(effect.value ?? 0)), 0, Number(resource.max ?? 0)) };
      return { ship: next, threatenedArea: "lifeveil" };
    }
    case "change-morale": {
      const resource = next.resources?.morale ?? { value: 0, max: 0 };
      next.resources.morale = { ...resource, value: clamp(Number(resource.value ?? 0) + Number(effect.value ?? 0), 0, Number(resource.max ?? 0)) };
      return { ship: next, threatenedArea: "morale" };
    }
    case "degrade-area":
      return { ship: changeAreaState(next, effect.area, Math.abs(Number(effect.steps ?? 1))), threatenedArea: effect.area };
    case "recover-area":
      return { ship: changeAreaState(next, effect.area, -Math.abs(Number(effect.steps ?? 1))), threatenedArea: effect.area };
    case "add-condition": {
      if (!effect.condition?.id) throw new Error("Arkflight condition effects require condition.id");
      next.conditions = [...(next.conditions ?? []).filter((row) => row?.id !== effect.condition.id), structuredClone(effect.condition)];
      return { ship: next, threatenedArea: effect.condition.area ?? null };
    }
    case "remove-condition":
      next.conditions = [...(next.conditions ?? []).filter((row) => row?.id !== effect.conditionId)];
      return { ship: next, threatenedArea: null };
    default:
      throw new Error(`Unsupported Arkflight ship effect: ${effect.kind}`);
  }
}

export function applyShipEffects(ship, effects = []) {
  let next = normalizeShip(structuredClone(ship));
  const threatenedAreas = [];
  for (const effect of effects) {
    const result = applyShipEffect(next, effect);
    next = result.ship;
    if (result.threatenedArea && !threatenedAreas.includes(result.threatenedArea)) threatenedAreas.push(result.threatenedArea);
  }
  return { ship: next, threatenedAreas };
}
