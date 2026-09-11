// Legacy compatibility shim.
//
// Battlewatch reload scaling now resolves inside combat-station-actions-api.js so
// player actions always pass through the station authorization/socket relay.
// This file intentionally performs no runtime overrides.

Hooks.once("ready", () => {
  // Keep the module harmless if an older module.json still imports it.
});
