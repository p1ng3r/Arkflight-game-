import { improveConditionState, repairPackage, repairScrapCost, repairTargetLabel, resourceRepairAmount, validRepairTarget } from "../ship/repair-rules.js";
import { setShipCondition, shipConditionProfile } from "../ship/ship-conditions.js";

const MODULE_ID = "arkflight-game";

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function clone(value) { return foundry.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value); }

function replaceJob(ship, job) {
  return {
    ...ship,
    refit: {
      ...ship.refit,
      workOrders: (ship.refit?.workOrders ?? []).map((entry) => entry.id === job.id ? job : entry)
    }
  };
}

async function persistShip(actor, ship) {
  await actor.update({ [`flags.${MODULE_ID}.ship`]: ship });
  return ship;
}

function canonicalRepairType(targetType) {
  return targetType === "area" ? "condition" : targetType;
}

Hooks.once("ready", () => {
  const base = game.arkflight?.refit;
  if (!base || base.queueRepairPackage) return;

  const extended = {
    ...base,
    repairPackages: Object.freeze(["patch", "standard", "full"]),
    quoteRepair(actor, targetType, targetKey, packageId = "patch", serviceMode = "crew") {
      const ship = shipPayload(actor);
      const type = canonicalRepairType(targetType);
      if (!ship || !validRepairTarget(type, targetKey)) return { ok: false, reason: "invalid-repair-target" };
      const pack = repairPackage(packageId);
      const partsCost = repairScrapCost(packageId, serviceMode);

      if (type === "resource") {
        const resource = ship.resources?.[targetKey] ?? { value: 0, max: targetKey === "lifeveil" ? 100 : 0 };
        const max = targetKey === "lifeveil" ? 100 : Math.max(0, Number(resource.max ?? 0));
        const amount = resourceRepairAmount(max, packageId);
        return Object.freeze({
          ok: true, targetType: type, targetKey,
          targetLabel: repairTargetLabel(type, targetKey),
          packageId: pack.id, packageLabel: pack.label,
          partsCost, durationHours: pack.hours, craftingDC: pack.dc,
          current: Number(resource.value ?? 0), max,
          restoreAmount: amount,
          after: Math.min(max, Number(resource.value ?? 0) + amount)
        });
      }

      const current = shipConditionProfile(ship, targetKey);
      const afterState = improveConditionState(targetKey, current.id, packageId);
      return Object.freeze({
        ok: true, targetType: type, targetKey,
        targetLabel: repairTargetLabel(type, targetKey),
        packageId: pack.id, packageLabel: pack.label,
        partsCost, durationHours: pack.hours, craftingDC: pack.dc,
        currentState: current.id,
        currentLabel: current.label,
        afterState
      });
    },

    async queueRepairPackage(actor, targetType, targetKey, packageId = "patch", options = {}) {
      const type = canonicalRepairType(targetType);
      const serviceMode = ["crew", "dock", "shipyard"].includes(options.serviceMode) ? options.serviceMode : "crew";
      const paymentMethod = options.paymentMethod === "gold" ? "gold" : "scrap";
      const quote = extended.quoteRepair(actor, type, targetKey, packageId, serviceMode);
      if (!quote.ok) return quote;
      if (type === "resource" && quote.current >= quote.max) return { ok: false, reason: "already-fully-repaired", quote };
      if (type === "condition" && quote.currentState === quote.afterState) return { ok: false, reason: "already-sound", quote };

      const partsCost = Math.max(0, Number(options.partsCostOverride ?? quote.partsCost));
      const goldCost = Math.max(0, Number(options.goldCost ?? 0));
      const queued = await base.queueRepair(actor, {
        componentFamily: `repair:${type}`,
        componentId: targetKey,
        durationHours: quote.durationHours,
        craftingDC: quote.craftingDC,
        partsCost,
        method: serviceMode === "shipyard" ? "shipyard" : "crew"
      });
      if (!queued?.ok || !queued.job) return { ...queued, quote };

      const current = shipPayload(actor);
      const taggedJob = {
        ...queued.job,
        ...(paymentMethod === "gold" ? { goldCost } : {}),
        result: {
          ...(queued.job.result ?? {}),
          serviceMode,
          paymentMethod,
          ...(paymentMethod === "gold" ? { goldCost } : {}),
          repair: {
            targetType: type,
            targetKey,
            targetLabel: quote.targetLabel,
            packageId: quote.packageId,
            packageLabel: quote.packageLabel,
            restoreAmount: quote.restoreAmount ?? 0,
            afterState: quote.afterState ?? null
          }
        }
      };
      const next = replaceJob(current, taggedJob);
      await persistShip(actor, next);
      return { ...queued, ship: next, job: taggedJob, quote };
    },

    async completeWork(actor, jobId, options = {}) {
      const completed = await base.completeWork(actor, jobId, options);
      if (!completed?.ok || completed.job?.type !== "repair") return completed;
      if (completed.job?.result?.repairApplied) return { ...completed, repairApplied: true };
      const repair = completed.job?.result?.repair;
      if (!repair || !validRepairTarget(repair.targetType, repair.targetKey)) return completed;

      let next = clone(completed.ship);
      if (repair.targetType === "resource") {
        const resource = next.resources?.[repair.targetKey];
        if (!resource) return completed;
        const max = repair.targetKey === "lifeveil" ? 100 : Math.max(0, Number(resource.max ?? 0));
        const amount = Math.max(0, Number(repair.restoreAmount ?? 0));
        resource.value = Math.min(max, Number(resource.value ?? 0) + amount);
        resource.max = max;
      } else {
        next = setShipCondition(next, repair.targetKey, repair.afterState ?? improveConditionState(repair.targetKey, shipConditionProfile(next, repair.targetKey).id, repair.packageId));
      }
      await persistShip(actor, next);
      return { ...completed, ship: next, repairApplied: true };
    }
  };

  game.arkflight.refit = Object.freeze(extended);
});
