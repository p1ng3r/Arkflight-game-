import { normalizeShip } from "./ship-schema.js";

export const REFIT_COMPONENT_FAMILIES = Object.freeze({
  SHIP_MOD: "shipMod",
  ARKENGINE_MOD: "arkengineMod"
});

function normalizeQuantity(value = 1) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function inventoryKey(family) {
  if (family === REFIT_COMPONENT_FAMILIES.SHIP_MOD) return "shipMods";
  if (family === REFIT_COMPONENT_FAMILIES.ARKENGINE_MOD) return "arkengineMods";
  throw new Error(`Unknown Arkflight refit component family: ${family}`);
}

function blueprintKey(family) {
  if (family === REFIT_COMPONENT_FAMILIES.SHIP_MOD) return "shipModIds";
  if (family === REFIT_COMPONENT_FAMILIES.ARKENGINE_MOD) return "arkengineModIds";
  throw new Error(`Unknown Arkflight refit component family: ${family}`);
}

export function salvageParts(ship) {
  return Math.max(0, Math.trunc(Number(ship?.resources?.salvageParts?.value) || 0));
}

export function setSalvageParts(ship, value) {
  const normalized = normalizeShip(ship);
  return normalizeShip({
    ...normalized,
    resources: {
      ...normalized.resources,
      salvageParts: { value: normalizeQuantity(value) }
    }
  });
}

export function grantSalvageParts(ship, amount) {
  const quantity = normalizeQuantity(amount);
  return setSalvageParts(ship, salvageParts(ship) + quantity);
}

export function spendSalvageParts(ship, amount) {
  const quantity = normalizeQuantity(amount);
  const available = salvageParts(ship);
  if (quantity > available) {
    return Object.freeze({ ok: false, reason: "insufficient-salvage-parts", required: quantity, available, ship: normalizeShip(ship) });
  }
  return Object.freeze({ ok: true, spent: quantity, ship: setSalvageParts(ship, available - quantity) });
}

export function knownBlueprints(ship, family) {
  const normalized = normalizeShip(ship);
  return Object.freeze([...(normalized.blueprints?.[blueprintKey(family)] ?? [])]);
}

export function knowsBlueprint(ship, family, componentId) {
  return knownBlueprints(ship, family).includes(String(componentId));
}

export function unlockBlueprint(ship, family, componentId) {
  const normalized = normalizeShip(ship);
  const key = blueprintKey(family);
  const id = String(componentId ?? "").trim();
  if (!id) throw new Error("Arkflight blueprint unlock requires a component id.");
  const next = [...new Set([...(normalized.blueprints[key] ?? []), id])];
  return normalizeShip({ ...normalized, blueprints: { ...normalized.blueprints, [key]: next } });
}

export function componentQuantity(ship, family, componentId) {
  const normalized = normalizeShip(ship);
  const key = inventoryKey(family);
  return normalizeQuantity(normalized.inventory?.[key]?.[String(componentId)] ?? 0);
}

export function grantComponent(ship, family, componentId, quantity = 1) {
  const normalized = normalizeShip(ship);
  const key = inventoryKey(family);
  const id = String(componentId ?? "").trim();
  if (!id) throw new Error("Arkflight component grant requires a component id.");
  const amount = normalizeQuantity(quantity);
  const current = componentQuantity(normalized, family, id);
  return normalizeShip({
    ...normalized,
    inventory: {
      ...normalized.inventory,
      [key]: { ...normalized.inventory[key], [id]: current + amount }
    }
  });
}

export function consumeComponent(ship, family, componentId, quantity = 1) {
  const normalized = normalizeShip(ship);
  const key = inventoryKey(family);
  const id = String(componentId ?? "").trim();
  const amount = normalizeQuantity(quantity);
  const available = componentQuantity(normalized, family, id);
  if (amount > available) {
    return Object.freeze({ ok: false, reason: "insufficient-components", required: amount, available, ship: normalized });
  }
  const nextCounts = { ...normalized.inventory[key] };
  const remaining = available - amount;
  if (remaining > 0) nextCounts[id] = remaining;
  else delete nextCounts[id];
  return Object.freeze({
    ok: true,
    consumed: amount,
    ship: normalizeShip({ ...normalized, inventory: { ...normalized.inventory, [key]: nextCounts } })
  });
}
