import { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS } from "./glassback-cinderwake.js";

export { GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS };

// Keep the registry lazy so event modules may safely use shared reward/event
// helpers without creating an eager ESM temporal-dead-zone cycle while the
// catalog is still initializing.
export const ARKFLIGHT_EVENTS = Object.freeze({
  get "glassback-cinderwake"() { return GLASSBACK_CINDERWAKE; }
});
