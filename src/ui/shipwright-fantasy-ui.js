const MODULE_ID = "arkflight-game";
const RECENT_KEY = "__arkflightShipwrightRecentAction";

function rootFromHtml(html) {
  const node = html?.[0] ?? html;
  if (!node?.querySelector) return null;
  return node.matches?.(".arkflight-ship-shell") ? node : node.querySelector(".arkflight-ship-shell");
}

function fittingName(card) {
  return card?.querySelector(":scope > strong")?.textContent?.trim() || card?.dataset?.id || "Fitting";
}

function rememberAction(card, action) {
  if (!card?.dataset?.id) return;
  globalThis[RECENT_KEY] = {
    id: card.dataset.id,
    kind: card.dataset.fittingKind,
    name: fittingName(card),
    action,
    at: Date.now()
  };
}

function buildWorkshopBanner(root) {
  const main = root.querySelector(".arkflight-commissioning-main");
  if (!main || main.querySelector(".arkflight-workshop-banner")) return;
  const panelHeading = main.querySelector(".arkflight-panel-heading");
  if (!panelHeading) return;

  const banner = document.createElement("section");
  banner.className = "arkflight-workshop-banner";
  banner.innerHTML = `
    <img src="modules/${MODULE_ID}/assets/ui/branding/arkflight_logo_Simple.webp" alt="" aria-hidden="true">
    <div class="arkflight-workshop-banner-copy">
      <span>VOID-YARD · SHIPWRIGHT BAY</span>
      <strong>BUILD HER WITH YOUR HANDS</strong>
      <small>Choose the parts. Haul them to the hull. Seat them into brass hardpoints. Nothing becomes permanent until the refit is applied.</small>
    </div>
    <div class="arkflight-workshop-lamps" aria-label="Shipwright workflow">
      <span><i></i>SELECT</span><span><i></i>FIT</span><span><i></i>TEST</span><span><i></i>APPLY REFIT</span>
    </div>`;
  panelHeading.insertAdjacentElement("afterend", banner);
}

function decorateDock(dock) {
  if (dock.dataset.arkflightFantasy === "true") return;
  dock.dataset.arkflightFantasy = "true";

  const sockets = [...dock.querySelectorAll(".arkflight-fitting-socket")];
  sockets.forEach((socket, index) => {
    socket.dataset.hardpoint = String(index + 1).padStart(2, "0");
    const badge = document.createElement("span");
    badge.className = "arkflight-hardpoint-number";
    badge.textContent = `HARDPOINT ${String(index + 1).padStart(2, "0")}`;
    socket.prepend(badge);

    if (socket.classList.contains("is-empty")) {
      const core = document.createElement("span");
      core.className = "arkflight-empty-socket-core";
      core.setAttribute("aria-hidden", "true");
      socket.append(core);
    }
  });

  const head = dock.querySelector(".arkflight-fitting-dock-head");
  if (head && !head.querySelector(".arkflight-workshop-command")) {
    const command = document.createElement("div");
    command.className = "arkflight-workshop-command";
    command.innerHTML = `<i class="fa-solid fa-hammer"></i><span>DRAG PARTS FROM THE BENCH INTO A HARDPOINT</span>`;
    head.append(command);
  }
}

function decorateCards(root) {
  for (const card of root.querySelectorAll(".arkflight-fitting-card[data-arkflight-fitting='true']")) {
    if (card.querySelector(".arkflight-part-status")) continue;
    const status = document.createElement("span");
    status.className = `arkflight-part-status ${card.classList.contains("is-installed") ? "is-fitted" : "is-bench"}`;
    status.innerHTML = card.classList.contains("is-installed")
      ? `<i class="fa-solid fa-bolt"></i> BOLTED IN`
      : `<i class="fa-solid fa-hand"></i> PART ON BENCH`;
    card.append(status);
  }
}

function workshopFlash(root, action) {
  if (!action || Date.now() - action.at > 2400) return;
  const summary = root.querySelector(".arkflight-commissioning-summary");
  summary?.classList.add("arkflight-refit-pulse");
  globalThis.setTimeout(() => summary?.classList.remove("arkflight-refit-pulse"), 1200);

  const card = root.querySelector(`.arkflight-fitting-card[data-id="${CSS.escape(action.id)}"]`);
  card?.classList.add(action.action === "install" ? "arkflight-just-installed" : "arkflight-just-removed");
  globalThis.setTimeout(() => {
    card?.classList.remove("arkflight-just-installed", "arkflight-just-removed");
  }, 1400);

  const toast = document.createElement("div");
  toast.className = `arkflight-workshop-toast ${action.action === "install" ? "is-install" : "is-remove"}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = action.action === "install"
    ? `<i class="fa-solid fa-hammer"></i><div><span>FITTING SEATED</span><strong>${action.name}</strong><small>Bolts driven. Braces locked. Aether couplings answering.</small></div>`
    : `<i class="fa-solid fa-wrench"></i><div><span>FITTING RELEASED</span><strong>${action.name}</strong><small>Clamps opened. Couplings bled down. Part returned to the bench.</small></div>`;
  root.append(toast);
  globalThis.setTimeout(() => toast.classList.add("is-visible"), 20);
  globalThis.setTimeout(() => toast.classList.remove("is-visible"), 1450);
  globalThis.setTimeout(() => toast.remove(), 1850);
  globalThis[RECENT_KEY] = null;
}

function enhanceShipwright(root) {
  if (!root?.querySelector(".arkflight-commissioning-shell")) return;
  buildWorkshopBanner(root);
  decorateCards(root);
  for (const dock of root.querySelectorAll(".arkflight-fitting-dock")) decorateDock(dock);
  workshopFlash(root, globalThis[RECENT_KEY]);

  if (root.dataset.arkflightFantasyWired === "true") return;
  root.dataset.arkflightFantasyWired = "true";

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-arkflight-fitting='true']");
    if (!card || card.disabled) return;
    root.classList.add("arkflight-is-hauling-part");
    card.classList.add("arkflight-part-lifted");
  }, true);

  root.addEventListener("dragend", (event) => {
    root.classList.remove("arkflight-is-hauling-part");
    event.target.closest?.(".arkflight-fitting-card")?.classList.remove("arkflight-part-lifted");
  }, true);

  root.addEventListener("drop", (event) => {
    const socket = event.target.closest?.(".arkflight-fitting-socket.is-empty");
    const remove = event.target.closest?.(".arkflight-fitting-remove");
    if (!socket && !remove) return;
    let payload = null;
    try { payload = JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null"); } catch { /* ignore */ }
    if (!payload?.id) return;
    const card = root.querySelector(`.arkflight-fitting-card[data-id="${CSS.escape(payload.id)}"]`);
    rememberAction(card, remove ? "remove" : "install");
  }, true);

  root.addEventListener("click", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-arkflight-fitting='true']");
    if (!card || card.disabled) return;
    rememberAction(card, card.classList.contains("is-installed") ? "remove" : "install");
  }, true);
}

function scheduleEnhance(app, html) {
  const root = rootFromHtml(html);
  if (!root) return;
  const run = () => enhanceShipwright(root);
  run();
  globalThis.requestAnimationFrame?.(run);
  globalThis.setTimeout(run, 40);
}

Hooks.on("renderActorSheet", scheduleEnhance);
Hooks.on("renderApplication", scheduleEnhance);
