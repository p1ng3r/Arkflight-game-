import { improveAreaState, repairPackage, repairScrapCost, repairTargetLabel, resourceRepairAmount, validRepairTarget } from "../ship/repair-rules.js";

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

Hooks.once("ready", () => {
  const base = game.arkflight?.refit;
  if (!base || base.queueRepairPackage) return;

  const extended = {
    ...base,
    repairPackages: Object.freeze(["patch", "standard", "full"]),
    quoteRepair(actor, targetType, targetKey, packageId = "patch", serviceMode = "crew") {
      const ship = shipPayload(actor);
      if (!ship || !validRepairTarget(targetType, targetKey)) return { ok: false, reason: "invalid-repair-target" };
      const pack = repairPackage(packageId);
      const partsCost = repairScrapCost(packageId, serviceMode);
      if (targetType === "resource") {
        const resource = ship.resources?.[targetKey] ?? { value: 0, max: 0 };
        const amount = resourceRepairAmount(resource.max, packageId);
        return Object.freeze({ ok: true, targetType, targetKey, targetLabel: repairTargetLabel(targetType, targetKey), packageId: pack.id, packageLabel: pack.label, partsCost, durationHours: pack.hours, craftingDC: pack.dc, current: Number(resource.value ?? 0), max: Number(resource.max ?? 0), restoreAmount: amount, after: Math.min(Number(resource.max ?? 0), Number(resource.value ?? 0) + amount) });
      }
      const currentState = ship.areas?.[targetKey]?.state ?? "stable";
      const afterState = improveAreaState(currentState, packageId);
      return Object.freeze({ ok: true, targetType, targetKey, targetLabel: repairTargetLabel(targetType, targetKey), packageId: pack.id, packageLabel: pack.label, partsCost, durationHours: pack.hours, craftingDC: pack.dc, currentState, afterState });
    },
    async queueRepairPackage(actor, targetType, targetKey, packageId = "patch", options = {}) {
      const serviceMode = ["crew", "dock", "shipyard"].includes(options.serviceMode) ? options.serviceMode : "crew";
      const quote = extended.quoteRepair(actor, targetType, targetKey, packageId, serviceMode);
      if (!quote.ok) return quote;
      if (targetType === "resource" && quote.current >= quote.max) return { ok: false, reason: "already-fully-repaired", quote };
      if (targetType === "area" && quote.currentState === quote.afterState) return { ok: false, reason: "already-stable", quote };

      const queued = await base.queueRepair(actor, {
        componentFamily: `repair:${targetType}`,
        componentId: targetKey,
        durationHours: quote.durationHours,
        craftingDC: quote.craftingDC,
        partsCost: quote.partsCost,
        method: serviceMode === "shipyard" ? "shipyard" : "crew"
      });
      if (!queued?.ok || !queued.job) return { ...queued, quote };

      const current = shipPayload(actor);
      const taggedJob = {
        ...queued.job,
        result: {
          ...(queued.job.result ?? {}),
          serviceMode,
          paymentMethod: "scrap",
          repair: {
            targetType,
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

      const next = clone(completed.ship);
      if (repair.targetType === "resource") {
        const resource = next.resources?.[repair.targetKey];
        if (!resource) return completed;
        const amount = Math.max(0, Number(repair.restoreAmount ?? 0));
        resource.value = Math.min(Number(resource.max ?? 0), Number(resource.value ?? 0) + amount);
      } else {
        next.areas ??= {};
        next.areas[repair.targetKey] = { ...(next.areas[repair.targetKey] ?? {}), state: repair.afterState ?? improveAreaState(next.areas?.[repair.targetKey]?.state, repair.packageId) };
      }
      await persistShip(actor, next);
      return { ...completed, ship: next, repairApplied: true };
    }
  };

  game.arkflight.refit = Object.freeze(extended);
});
