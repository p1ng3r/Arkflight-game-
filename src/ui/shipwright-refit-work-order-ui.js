const MODULE_ID = "arkflight-game";

function rootForActor(actor) {
  const element = actor?.sheet?.element?.[0] ?? actor?.sheet?.element ?? null;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function workOrderSummary(jobs = []) {
  const hours = jobs.reduce((sum, job) => sum + Number(job.durationHours ?? 0), 0);
  const parts = jobs.reduce((sum, job) => sum + Number(job.partsCost ?? 0), 0);
  return `${jobs.length} ${jobs.length === 1 ? "work order" : "work orders"} created · ${parts} Parts reserved · ${hours} total work-hours`;
}

Hooks.on("arkflightRefitDraftReady", async ({ actor, draft }) => {
  if (!actor || !draft?.assignments?.length) return;
  if (!game.user?.isGM) {
    ui.notifications?.warn?.("Only the GM can begin a refit until crew work-order permissions are enabled.");
    return;
  }

  try {
    const result = await game.arkflight?.refit?.beginInstallDraft?.(actor, draft, { method: "crew" });
    if (!result?.ok) {
      const detail = result?.reason === "insufficient-salvage-parts"
        ? `Need ${result.required} Salvage Parts; only ${result.available} are available.`
        : `Could not begin refit: ${result?.reason ?? "unknown error"}.`;
      ui.notifications?.warn?.(detail);
      return;
    }

    // The Part 5 reset control owns the in-window draft Map. Triggering it after
    // persistence prevents a committed draft from becoming a ghost draft on rerender.
    rootForActor(actor)?.querySelector?.('[data-refit-draft-action="reset"]')?.click();
    ui.notifications?.info?.(`Refit begun. ${workOrderSummary(result.jobs)}`);
    actor.sheet?.render?.({ force: true });
    Hooks.callAll("arkflightRefitWorkOrdersCreated", { actor, jobs: result.jobs, result });
  } catch (error) {
    console.error("Arkflight | Could not begin persistent refit work orders", error);
    ui.notifications?.error?.(error.message ?? "Could not begin refit.");
  }
});

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.actor ?? app?.document;
  const ship = actor?.flags?.[MODULE_ID]?.ship;
  if (!ship?.refit?.workOrders?.length) return;
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return;
  const root = element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
  if (!root) return;
  requestAnimationFrame(() => {
    const right = root.querySelector(".arkflight-shipwright-bay-active .arkflight-bay-right") ?? root.querySelector(".arkflight-bay-right");
    if (!right || right.querySelector(".arkflight-refit-work-orders")) return;
    const active = ship.refit.workOrders.filter((job) => !["complete"].includes(job.status));
    if (!active.length) return;
    const panel = document.createElement("section");
    panel.className = "arkflight-refit-work-orders";
    panel.innerHTML = `<div class="arkflight-bay-section-title"><span>WORK ORDERS</span><strong>${active.length} active</strong></div>${active.map((job) => `<div class="arkflight-refit-work-order"><span>${String(job.type).toUpperCase()}</span><strong>${job.componentId || "Ship repair"}</strong><small>${job.status} · ${job.remainingHours}h · ${job.partsCost} Parts reserved</small></div>`).join("")}`;
    const actions = right.querySelector(".arkflight-bay-actions");
    if (actions) actions.before(panel); else right.append(panel);
  });
});
