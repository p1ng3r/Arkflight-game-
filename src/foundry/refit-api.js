import {
  acquireIntactComponent,
  availableRefitInventory,
  breakdownIntactComponent,
  breakdownComponentQuote,
  buildComponentFromBlueprint,
  buildComponentQuote,
  knownBlueprintEntries,
  learnBlueprint,
  refitComponentEconomyQuote,
  resaleComponentQuote
} from "../ship/refit-economy.js";
import { REFIT_COMPONENT_FAMILIES, grantSalvageParts, salvageParts, spendSalvageParts } from "../ship/refit-state.js";
import { AETHER_SCRAP_GP_VALUE, REFIT_VALUE_RATES, componentEconomyQuote } from "../ship/refit-value.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { REFIT_JOB_TYPES, REFIT_METHODS } from "../ship/refit-rules.js";
import { findAvailableRefitSocketAssignment, validateRefitSocketAssignment } from "../ship/refit-sockets.js";
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

function serviceMode(options = {}) {
  const requested = String(options.serviceMode ?? options.method ?? "crew");
  return ["crew", "dock", "shipyard"].includes(requested) ? requested : "crew";
}
function paymentMethod(options = {}) {
  return String(options.paymentMethod ?? "scrap") === "gold" ? "gold" : "scrap";
}
function underlyingMethod(options = {}) {
  return serviceMode(options) === "shipyard" ? REFIT_METHODS.SHIPYARD : REFIT_METHODS.CREW;
}
function pricedItem(item, mode, operation, payment = "scrap") {
  if (!item?.data?.refit) return item;
  const quote = componentEconomyQuote(item);
  if (!quote.ok) return item;
  const refit = item.data.refit;
  let partsCost = 0;
  if (operation === "build") partsCost = quote.fabrication.aetherScrap;
  else if (operation === "install") partsCost = payment === "gold" ? 0 : (quote.installation[mode]?.aetherScrap ?? quote.installation.crew.aetherScrap);
  return {
    ...item,
    data: {
      ...item.data,
      refit: {
        ...refit,
        build: { ...refit.build, partsCost: operation === "build" ? partsCost : refit.build?.partsCost ?? 0 },
        install: { ...refit.install, partsCost: operation === "install" ? partsCost : refit.install?.partsCost ?? 0 }
      }
    }
  };
}
function economicCatalogs(mode, operation, payment = "scrap") {
  return {
    ...SHIP_CATALOGS,
    shipMods: Object.fromEntries(Object.entries(SHIP_CATALOGS.shipMods ?? {}).map(([id, item]) => [id, pricedItem(item, mode, operation, payment)])),
    arkengineMods: Object.fromEntries(Object.entries(SHIP_CATALOGS.arkengineMods ?? {}).map(([id, item]) => [id, pricedItem(item, mode, operation, payment)])),
    weapons: Object.fromEntries(Object.entries(SHIP_CATALOGS.weapons ?? {}).map(([id, item]) => [id, pricedItem(item, mode, operation, payment)]))
  };
}
function tagService(result, mode, options = {}) {
  if (!result?.ok) return result;
  const payment = paymentMethod(options);
  const goldCost = Math.max(0, Number(options.goldCost ?? 0));
  const jobs = result.jobs ?? (result.job ? [result.job] : []);
  if (!jobs.length) return { ...result };
  let ship = result.ship;
  const tagged = jobs.map((job) => ({
    ...job,
    ...(payment === "gold" ? { goldCost } : {}),
    result: {
      ...(job.result ?? {}),
      serviceMode: mode,
      paymentMethod: payment,
      ...(payment === "gold" ? { goldCost } : {})
    }
  }));
  for (const job of tagged) ship = replaceWorkOrder(ship, job);
  return { ...result, ship, ...(result.jobs ? { jobs: tagged } : { job: tagged[0] }) };
}

function replaceWorkOrder(ship, job) {
  return {
    ...ship,
    refit: {
      ...ship.refit,
      workOrders: (ship.refit?.workOrders ?? []).map((entry) => entry.id === job.id ? job : entry)
    }
  };
}

function repairInstallSocketBeforeStart(ship, jobId) {
  const job = ship?.refit?.workOrders?.find((entry) => entry.id === jobId);
  if (!job || job.type !== REFIT_JOB_TYPES.INSTALL) return { ok: true, ship, job, repaired: false };
  const current = validateRefitSocketAssignment(ship, SHIP_CATALOGS, { family: job.componentFamily, componentId: job.componentId, socketIndices: job.socketIndices, sourceJobId: job.id });
  if (current.ok) return { ok: true, ship, job, repaired: false };
  const available = findAvailableRefitSocketAssignment(ship, SHIP_CATALOGS, { family: job.componentFamily, componentId: job.componentId });
  if (!available.ok) {
    const blockedJob = { ...job, result: { ...(job.result ?? {}), blockedReason: available.reason ?? current.reason ?? "no-legal-socket" } };
    return { ok: false, reason: blockedJob.result.blockedReason, ship: replaceWorkOrder(ship, blockedJob), job: blockedJob, blocked: true };
  }
  const repairedJob = { ...job, socketIndices: [...available.socketIndices], result: { ...(job.result ?? {}) } };
  delete repairedJob.result.blockedReason;
  return { ok: true, ship: replaceWorkOrder(ship, repairedJob), job: repairedJob, repaired: true };
}

Hooks.once("init", () => {
  if (!game.arkflight) return;
  game.arkflight.refit = Object.freeze({
    families: REFIT_COMPONENT_FAMILIES,
    economy: Object.freeze({ aetherScrapGpValue: AETHER_SCRAP_GP_VALUE, rates: REFIT_VALUE_RATES }),
    getAetherScrap(actor) { return salvageParts(shipPayload(requireShipActor(actor))); },
    getSalvageParts(actor) { return salvageParts(shipPayload(requireShipActor(actor))); },
    getInventory(actor) { return availableRefitInventory(shipPayload(requireShipActor(actor))); },
    getBlueprints(actor, family) { return knownBlueprintEntries(shipPayload(requireShipActor(actor)), family); },
    getWorkOrders(actor) { return Object.freeze([...(shipPayload(requireShipActor(actor))?.refit?.workOrders ?? [])]); },
    quoteEconomy(family, componentId) { return refitComponentEconomyQuote(family, componentId); },
    quoteBuild(actor, family, componentId, quantity = 1) { return buildComponentQuote(shipPayload(requireShipActor(actor)), family, componentId, quantity); },
    quoteBreakdown(actor, family, componentId, quantity = 1) { return breakdownComponentQuote(shipPayload(requireShipActor(actor)), family, componentId, quantity); },
    quoteResale(actor, family, componentId, quantity = 1) { return resaleComponentQuote(shipPayload(requireShipActor(actor)), family, componentId, quantity); },

    async grantAetherScrap(actor, amount) { requireGM(); const target = requireShipActor(actor); const ship = grantSalvageParts(shipPayload(target), amount); await persistShip(target, ship); return Object.freeze({ ok: true, amount: Math.max(0, Math.trunc(Number(amount) || 0)), total: salvageParts(ship), ship }); },
    async grantSalvageParts(actor, amount) { requireGM(); const target = requireShipActor(actor); const ship = grantSalvageParts(shipPayload(target), amount); await persistShip(target, ship); return Object.freeze({ ok: true, amount: Math.max(0, Math.trunc(Number(amount) || 0)), total: salvageParts(ship), ship }); },
    async spendAetherScrap(actor, amount) { const target = targetForRefit(actor); const spent = spendSalvageParts(shipPayload(target), amount); if (spent.ok) await persistShip(target, spent.ship); return spent; },
    async breakdownComponent(actor, family, componentId, quantity = 1) { const target = targetForRefit(actor); return persistResult(target, breakdownIntactComponent(shipPayload(target), family, componentId, quantity)); },
    async learnBlueprint(actor, family, componentId) { requireGM(); const target = requireShipActor(actor); return persistResult(target, learnBlueprint(shipPayload(target), family, componentId)); },
    async acquireComponent(actor, family, componentId, quantity = 1) { requireGM(); const target = requireShipActor(actor); return persistResult(target, acquireIntactComponent(shipPayload(target), family, componentId, quantity)); },
    async buildFromBlueprint(actor, family, componentId, quantity = 1) { const target = targetForRefit(actor); return persistResult(target, buildComponentFromBlueprint(shipPayload(target), family, componentId, quantity)); },
    async beginInstallDraft(actor, draft, options = {}) {
      const target = targetForRefit(actor);
      const mode = serviceMode(options);
      const payment = paymentMethod(options);
      if (payment === "gold" && mode === "crew") return { ok: false, reason: "gold-payment-requires-dock", ship: shipPayload(target), jobs: [] };
      const result = queueInstallDraft(shipPayload(target), draft, economicCatalogs(mode, "install", payment), { ...options, method: underlyingMethod(options) });
      return persistResult(target, tagService(result, mode, options));
    },
    async recordInstallFailure(actor, assignment, options = {}) { const target = targetForRefit(actor); return persistResult(target, recordCrewInstallFailure(shipPayload(target), assignment, economicCatalogs("crew", "install"), options)); },
    async recordInstallComplication(actor, assignment, options = {}) { const target = targetForRefit(actor); return persistResult(target, recordCrewInstallComplication(shipPayload(target), assignment, economicCatalogs("crew", "install"), options)); },
    async queueBuild(actor, family, componentId, options = {}) {
      const target = targetForRefit(actor); const mode = serviceMode(options);
      const result = queueBuildJob(shipPayload(target), family, componentId, economicCatalogs(mode, "build"), { ...options, method: underlyingMethod(options) });
      return persistResult(target, tagService(result, mode, options));
    },
    async queueRemove(actor, family, componentId, options = {}) { const target = targetForRefit(actor); const mode = serviceMode(options); const result = queueRemoveJob(shipPayload(target), family, componentId, SHIP_CATALOGS, { ...options, method: underlyingMethod(options) }); return persistResult(target, tagService(result, mode, options)); },
    async queueRepair(actor, options = {}) { const target = targetForRefit(actor); return persistResult(target, queueRepairJob(shipPayload(target), options)); },
    async startWork(actor, jobId, options = {}) {
      const target = targetForRefit(actor); const repaired = repairInstallSocketBeforeStart(shipPayload(target), jobId);
      if (!repaired.ok) { if (repaired.ship) await persistShip(target, repaired.ship); return repaired; }
      return persistResult(target, startRefitJob(repaired.ship, jobId, options));
    },
    async completeWork(actor, jobId, options = {}) { const target = targetForRefit(actor); return persistResult(target, completeRefitJob(shipPayload(target), jobId, SHIP_CATALOGS, options)); },
    async resolveCrewConcurrency(actor, keepJobId) { requireGM(); const target = requireShipActor(actor); return persistResult(target, resolveCrewWorkConcurrency(shipPayload(target), keepJobId)); }
  });
});
