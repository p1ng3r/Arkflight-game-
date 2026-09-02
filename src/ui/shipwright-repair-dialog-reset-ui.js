function repairButtonFromEvent(event) {
  const target = event?.target instanceof Element ? event.target : null;
  return target?.closest?.("[data-repair-package]") ?? null;
}

// Mark only a repair button the user actually invoked. Healthy/stable package buttons
// may also be disabled, so never blanket-enable every disabled repair control.
document.addEventListener("click", (event) => {
  const button = repairButtonFromEvent(event);
  if (!button || button.disabled) return;
  button.dataset.arkflightPendingRepairDialog = "true";
}, true);

function restorePendingRepairButtons() {
  requestAnimationFrame(() => {
    for (const button of document.querySelectorAll('[data-repair-package][data-arkflight-pending-repair-dialog="true"]')) {
      delete button.dataset.arkflightPendingRepairDialog;
      if (button.isConnected) button.disabled = false;
    }
  });
}

// DialogV2 emits the normal ApplicationV2 close hook. When a repair work-order is
// cancelled or closed with X, release the originating package button immediately.
Hooks.on("closeApplicationV2", (app) => {
  const root = app?.element instanceof HTMLElement ? app.element : app?.element?.[0];
  if (!root?.querySelector?.(".arkflight-install-scroll")) return;
  restorePendingRepairButtons();
});
