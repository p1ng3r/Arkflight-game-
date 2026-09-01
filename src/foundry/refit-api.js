import {
  acquireIntactComponent,
  availableRefitInventory,
  buildComponentFromBlueprint,
  buildComponentQuote,
  knownBlueprintEntries,
  learnBlueprint
} from "../ship/refit-economy.js";
import { REFIT_COMPONENT_FAMILIES, grantSalvageParts, salvageParts } from "../ship/refit-state.js";
import { SHIP_CATALOGS } from "../content/index.js";
import {
  queueInstallDraft,
  queueBuildJob,
  queueRemoveJob,
  queueRepairJob,
  startRefitJob,
  completeRefitJob,
  recordCrewInstallComplication,
  recordCrewInstallFailure,
  resolveCrewWorkConcurrency
} from "../ship/refit-work-orders.js";

const MODULE_ID = "arkflight-game";
function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function requireShipActor(actor) { if (!actor?.update || !shipPayload(actor)) throw new Error("Choose an Arkflight ship Vehicle Actor."); return actor; }
function requireRefitAuthority(actor) { if (!game.user?.isGM && !actor?.isOwner) throw new Error("You are not authorized to manage this ship's refit work."); return actor; }
function requireGM() { if (!game.user?.isGM) throw new Error("Only the GM can grant or create Arkflight refit assets."); }
async function persistShip(actor, ship) { await actor.update({ [`flags.${MODULE_ID}.ship`]: ship }); return ship; }
async function persistResult(actor, result) { if (result?.ok && result.ship) await persistShip(actor, result.ship); return result; }
function targetForRefit(actor) { return requireRefitAuthority(requireShipActor(actor)); }

Hooks.once("init", () => {
  if (!game.arkflight) return;
  game.arkflight.refit = Object.freeze({
    families: REFIT_COMPONENT_FAMILIES,
    getSalvageParts(actor) { return salvageParts(shipPayload(requireShipActor(actor))); },
    getInventory(actor) { return availableRefitInventory(shipPayload(requireShipActor(actor))); },
    getBlueprints(actor, family) { return knownBlueprintEntries(shipPayload(requireShipActor(actor)), family); },
    getWorkOrders(actor) { return Object.freeze([...(shipPayload(requireShipActor(actor))?.refit?.workOrders ?? [])]); },
    quoteBuild(actor, family, componentId, quantity = 1) { return buildComponentQuote(shipPayload(requireShipActor(actor)), family, componentId, quantity); },

    async grantSalvageParts(actor, amount) { requireGM(); const target = requireShipActor(actor); const ship = grantSalvageParts(shipPayload(target), amount); await persistShip(target, ship); return Object.freeze({ ok: true, amount: Math.max(0, Math.trunc(Number(amount) || 0)), total: salvageParts(ship), ship }); },
    async learnBlueprint(actor, family, componentId) { requireGM(); const target = requireShipActor(actor); return persistResult(target, learnBlueprint(shipPayload(target), family, componentId)); },
    async acquireComponent(actor, family, componentId, quantity = 1) { requireGM(); const target = requireShipActor(actor); return persistResult(target, acquireIntactComponent(shipPayload(target), family, componentId, quantity)); },
    async buildFromBlueprint(actor, family, componentId, quantity = 1) { const target = targetForRefit(actor); return persistResult(target, buildComponentFromBlueprint(shipPayload(target), family, componentId, quantity)); },
    async beginInstallDraft(actor, draft, options = {}) { const target = targetForRefit(actor); return persistResult(target, queueInstallDraft(shipPayload(target), draft, SHIP_CATALOGS, options)); },
    async recordInstallFailure(actor, assignment, options = {}) { const target = targetForRefit(actor); return persistResult(target, recordCrewInstallFailure(shipPayload(target), assignment, SHIP_CATALOGS, options)); },
    async recordInstallComplication(actor, assignment, options = {}) { const target = targetForRefit(actor); return persistResult(target, recordCrewInstallComplication(shipPayload(target), assignment, SHIP_CATALOGS, options)); },
    async queueBuild(actor, family, componentId, options = {}) { const target = targetForRefit(actor); return persistResult(target, queueBuildJob(shipPayload(target), family, componentId, SHIP_CATALOGS, options)); },
    async queueRemove(actor, family, componentId, options = {}) { const target = targetForRefit(actor); return persistResult(target, queueRemoveJob(shipPayload(target), family, componentId, SHIP_CATALOGS, options)); },
    async queueRepair(actor, options = {}) { const target = targetForRefit(actor); return persistResult(target, queueRepairJob(shipPayload(target), options)); },
    async startWork(actor, jobId, options = {}) { const target = targetForRefit(actor); return persistResult(target, startRefitJob(shipPayload(target), jobId, options)); },
    async completeWork(actor, jobId, options = {}) { const target = targetForRefit(actor); return persistResult(target, completeRefitJob(shipPayload(target), jobId, SHIP_CATALOGS, options)); },
    async resolveCrewConcurrency(actor, keepJobId) { requireGM(); const target = requireShipActor(actor); return persistResult(target, resolveCrewWorkConcurrency(shipPayload(target), keepJobId)); }
  });
});
