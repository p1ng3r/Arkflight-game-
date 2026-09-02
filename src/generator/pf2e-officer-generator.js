// Compatibility entry point for older Arkflight imports.
// The officer generator was consolidated into pf2e-officer-actor-draft.js.
// Keep this shim so stale/legacy module imports do not 404 while integration
// finishes migrating all callers to the canonical filename.

export { generatePF2eOfficerActorDraft } from "./pf2e-officer-actor-draft.js";
export { generatePF2eOfficerActorDraft as generatePF2eOfficer } from "./pf2e-officer-actor-draft.js";
