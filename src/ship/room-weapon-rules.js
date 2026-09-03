import { COMPONENT_TYPES } from "./component-rules.js";

export const ROOM_PURPOSES = Object.freeze([
  "capacity",
  "crewSupport",
  "recoveryRepair",
  "stationUnlock",
  "voyageEvent",
  "combatSupport",
  "luxuryFlavor"
]);

function unique(values = []) {
  return [...new Set((values ?? []).filter(Boolean))];
}

export function roomGameplayPurposes(room) {
  if (!room || room.type !== COMPONENT_TYPES.ROOM) return Object.freeze([]);
  const purposes = [];
  const tags = new Set([...(room.tags ?? []), ...(room.traits ?? []), room.data?.roomType].filter(Boolean));
  const capabilities = room.capabilities ?? [];
  const unlocks = room.unlocks ?? {};

  if (["cargo", "storage", "logistics", "habitation"].some((tag) => tags.has(tag))) purposes.push("capacity");
  if (["rest", "habitation", "food", "morale", "social", "luxury", "diplomacy"].some((tag) => tags.has(tag))) purposes.push("crewSupport");
  if (["repair", "recovery", "medical", "crafting", "industrial", "forge", "maintenance"].some((tag) => tags.has(tag))) purposes.push("recoveryRepair");
  if ((unlocks.signatures?.length ?? 0) || (unlocks.actions?.length ?? 0) || (unlocks.masteries?.length ?? 0) || (unlocks.combatActions?.length ?? 0) || Object.keys(unlocks.stations ?? {}).length) purposes.push("stationUnlock");
  if (capabilities.length || ["research", "navigation", "occult", "ritual", "containment", "salvage", "survival", "planning", "briefing"].some((tag) => tags.has(tag))) purposes.push("voyageEvent");
  if (["military", "armory", "boarding", "watch", "weapons"].some((tag) => tags.has(tag))) purposes.push("combatSupport");
  if (["luxury", "social/luxury"].some((tag) => tags.has(tag))) purposes.push("luxuryFlavor");

  return Object.freeze(unique(purposes));
}

export function validateRoomPurpose(room) {
  const purposes = roomGameplayPurposes(room);
  return Object.freeze({
    ok: room?.type === COMPONENT_TYPES.ROOM && purposes.length > 0,
    purposes,
    reason: purposes.length ? null : "Installed Rooms must have at least one explicit gameplay purpose."
  });
}

export const WEAPON_REQUIRED_FIELDS = Object.freeze([
  "crewRequired",
  "allowedMounts",
  "combat",
  "mountType",
  "damageProfile",
  "systemThreat",
  "cargo"
]);

export function validateWeaponDefinition(weapon) {
  if (!weapon || weapon.type !== COMPONENT_TYPES.WEAPON) {
    return Object.freeze({ ok: false, missing: [...WEAPON_REQUIRED_FIELDS] });
  }
  const data = weapon.data ?? {};
  const missing = WEAPON_REQUIRED_FIELDS.filter((field) => {
    const value = data[field];
    if (field === "allowedMounts") return !Array.isArray(value) || value.length === 0;
    if (field === "combat" || field === "damageProfile") return !value || typeof value !== "object";
    return value === undefined || value === null || value === "";
  });
  const combat = data.combat ?? {};
  if (!(Number.isInteger(combat.fireAP) && combat.fireAP >= 1)) missing.push("combat.fireAP");
  if (!(Number.isInteger(combat.reloadRounds) && combat.reloadRounds >= 0)) missing.push("combat.reloadRounds");
  if (!combat.arcTemplate) missing.push("combat.arcTemplate");
  const range = combat.rangeHexes;
  if (!range || !Number.isFinite(Number(range.min)) || !Number.isFinite(Number(range.max)) || Number(range.max) < Number(range.min)) missing.push("combat.rangeHexes");
  return Object.freeze({ ok: missing.length === 0, missing: Object.freeze([...new Set(missing)]) });
}

export function weaponCrewPenalty(requiredCrew, availableCrew) {
  const required = Math.max(0, Math.trunc(Number(requiredCrew) || 0));
  const available = Math.max(0, Math.trunc(Number(availableCrew) || 0));
  const missing = Math.max(0, required - available);
  return missing > 0 ? -missing : 0;
}

export function weaponCanOperate(requiredCrew, availableCrew) {
  const required = Math.max(0, Math.trunc(Number(requiredCrew) || 0));
  const available = Math.max(0, Math.trunc(Number(availableCrew) || 0));
  if (required === 0) return true;
  return available > 0;
}

export function weaponInventoryCargo(weapon, quantity = 1) {
  const cargo = Math.max(0, Number(weapon?.data?.cargo ?? 0));
  const count = Math.max(0, Math.trunc(Number(quantity) || 0));
  return cargo * count;
}

export function weaponPhysicalState({ installed = false, destroyed = false, damaged = false } = {}) {
  if (destroyed) return Object.freeze({ id: "destroyed", recoverable: false, occupiesCargo: false, occupiesMount: false });
  if (installed) return Object.freeze({ id: damaged ? "installed-damaged" : "installed", recoverable: true, occupiesCargo: false, occupiesMount: true });
  return Object.freeze({ id: damaged ? "inventory-damaged" : "inventory", recoverable: true, occupiesCargo: true, occupiesMount: false });
}
