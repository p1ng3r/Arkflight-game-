import { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS } from "./glassback-cinderwake.js";
import { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS } from "./gilded-shatter.js";

export { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS };
export { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS };

const EVENT_OWNERS = new Map();

// Keep the public registry object stable because the PlanningController and
// existing UI hold a direct reference to it. Event Manager 2.0 mutates this
// object through the registration functions below instead of replacing it.
export const ARKFLIGHT_EVENTS = Object.create(null);

export function registerArkflightEvent(event, { owner = "external", replace = false } = {}) {
  if (!event?.id) throw new Error("Arkflight Event registration requires an event with id.");
  const existing = ARKFLIGHT_EVENTS[event.id];
  if (existing === event) return event;
  if (existing && !replace) throw new Error(`Arkflight Event is already registered: ${event.id}`);
  ARKFLIGHT_EVENTS[event.id] = event;
  EVENT_OWNERS.set(event.id, owner);
  return event;
}

export function unregisterArkflightEvent(eventId, { owner = null } = {}) {
  const id = String(eventId ?? "");
  if (!ARKFLIGHT_EVENTS[id]) return false;
  const currentOwner = EVENT_OWNERS.get(id) ?? null;
  if (owner && currentOwner && owner !== currentOwner) return false;
  delete ARKFLIGHT_EVENTS[id];
  EVENT_OWNERS.delete(id);
  return true;
}

export function arkflightEventOwner(eventId) { return EVENT_OWNERS.get(String(eventId ?? "")) ?? null; }
export function listArkflightEvents() { return Object.values(ARKFLIGHT_EVENTS); }

registerArkflightEvent(GLASSBACK_CINDERWAKE, { owner: "arkflight-game" });
registerArkflightEvent(GILDED_SHATTER, { owner: "arkflight-game" });
