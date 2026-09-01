const MODULE_ID = "arkflight-game";

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.actor ?? app?.document;
  const ship = shipPayload(actor);
  if (!ship || (!game.user?.isGM && !actor?.isOwner)) return;
  const planned = (ship.refit?.workOrders ?? []).filter((job) => job.status === "planned");
  if (!planned.length) return;
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return;
  const root = element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
  if (!root) return;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const right = root.querySelector(".arkflight-shipwright-bay-active .arkflight-bay-right") ?? root.querySelector(".arkflight-bay-right");
    if (!right || right.querySelector(".arkflight-player-start-work")) return;
    const panel = document.createElement("section");
    panel.className = "arkflight-refit-work-orders arkflight-player-start-work";
    panel.innerHTML = `<div class="arkflight-bay-section-title"><span>READY TO START</span><strong>${planned.length} planned</strong></div>`;
    for (const job of planned) {
      const row = document.createElement("div");
      row.className = "arkflight-refit-work-order";
      row.innerHTML = `<span>${String(job.type ?? "work").toUpperCase()}</span><strong>${foundry.utils.escapeHTML(job.componentId || "Ship work")}</strong><small>${Number(job.remainingHours ?? 0)}h remaining</small>`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Start Work";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await game.arkflight?.refit?.startWork?.(actor, job.id);
          if (!result?.ok) throw new Error(result?.reason ?? "Unable to start work order.");
          ui.notifications?.info?.(`${actor.name}: work started on ${job.componentId || job.type}.`);
          actor.sheet?.render?.({ force: true });
        } catch (error) {
          button.disabled = false;
          ui.notifications?.warn?.(error?.message ?? "Unable to start Arkflight work order.");
        }
      });
      row.append(button);
      panel.append(row);
    }
    const actions = right.querySelector(".arkflight-bay-actions");
    if (actions) actions.before(panel); else right.append(panel);
  }));
});
