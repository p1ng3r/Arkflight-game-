import { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS } from "./glassback-cinderwake.js";
import { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS } from "./gilded-shatter.js";

export { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS };
export { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS };

const EVENT_OWNERS = new Map([
  ["glassback-cinderwake", "arkflight-game"],
  ["gilded-shatter", "arkflight-game"]
]);

// The built-ins remain lazy to preserve the existing ESM cycle safety. The
// object itself stays stable so package events can be appended at runtime.
export const ARKFLIGHT_EVENTS = Object.create(null);
Object.defineProperties(ARKFLIGHT_EVENTS, {
  "glassback-cinderwake": { enumerable: true, configurable: false, get() { return GLASSBACK_CINDERWAKE; } },
  "gilded-shatter": { enumerable: true, configurable: false, get() { return GILDED_SHATTER; } }
});

export function registerArkflightEvent(event, { owner = "external", replace = false } = {}) {
  if (!event?.id) throw new Error("Arkflight Event registration requires an event with id.");
  const existing = ARKFLIGHT_EVENTS[event.id];
  if (existing === event) return event;
  if (existing && !replace) throw new Error(`Arkflight Event is already registered: ${event.id}`);
  const descriptor = Object.getOwnPropertyDescriptor(ARKFLIGHT_EVENTS, event.id);
  if (descriptor && descriptor.configurable === false) throw new Error(`Built-in Arkflight Event cannot be replaced: ${event.id}`);
  ARKFLIGHT_EVENTS[event.id] = event;
  EVENT_OWNERS.set(event.id, owner);
  return event;
}

export function unregisterArkflightEvent(eventId, { owner = null } = {}) {
  const id = String(eventId ?? "");
  const descriptor = Object.getOwnPropertyDescriptor(ARKFLIGHT_EVENTS, id);
  if (!descriptor) return false;
  if (descriptor.configurable === false) return false;
  const currentOwner = EVENT_OWNERS.get(id) ?? null;
  if (owner && currentOwner && owner !== currentOwner) return false;
  delete ARKFLIGHT_EVENTS[id];
  EVENT_OWNERS.delete(id);
  return true;
}

export function arkflightEventOwner(eventId) { return EVENT_OWNERS.get(String(eventId ?? "")) ?? null; }
export function listArkflightEvents() { return Object.values(ARKFLIGHT_EVENTS); }
