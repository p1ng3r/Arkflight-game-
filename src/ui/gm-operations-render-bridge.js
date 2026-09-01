const GM_OPERATIONS_ID = "arkflight-gm-operations";

/**
 * Foundry v14 ApplicationV2 emits the class-specific render hook for the
 * Arkflight GM Operations application. Older Arkflight enhancement modules
 * listen to the generic renderApplicationV2 hook. Bridge the specific hook to
 * the generic enhancement hook so Generate/Ships enhancement layers render
 * reliably without coupling them directly into the base GM Operations app.
 */
Hooks.on("renderArkflightGMOperations", (app, ...args) => {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  Hooks.callAll("renderApplicationV2", app, ...args);
});
