import { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS } from "./glassback-cinderwake.js";
import { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS } from "./gilded-shatter.js";

export { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS };
export { GILDED_SHATTER, GILDED_SHATTER_HAZARDS, GILDED_SHATTER_BLUEPRINT_TABLE, GILDED_SHATTER_DEEP_SALVAGE_OPTIONS };

// Keep the registry lazy so event modules may safely use shared reward/event
// helpers without creating an eager ESM temporal-dead-zone cycle while the
// catalog is still initializing.
export const ARKFLIGHT_EVENTS = Object.freeze({
  get "glassback-cinderwake"() { return GLASSBACK_CINDERWAKE; },
  get "gilded-shatter"() { return GILDED_SHATTER; }
});
