import { SHIP_CATALOGS } from "../content/index.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";

const MODULE_ID = "arkflight-game";

const FAMILY_META = Object.freeze({
  shipMod: { inventory: "shipMods", installed: (ship) => ship?.shipMods ?? [], schematic: ".arkflight-bay-schematic.is-ship", noun: "MOD" },
  arkengineMod: { inventory: "arkengineMods", installed: (ship) => ship?.arkengine?.modIds ?? [], schematic: ".arkflight-bay-schematic.is-engine", noun: "ENGINE MOD" }
});

function shellFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function shipActor(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function physicalCount(ship, family, id) {
  const meta = FAMILY_META[family];
  return Math.max(0, Math.trunc(Number(ship?.inventory?.[meta?.inventory]?.[id] ?? 0)));
}

function authoritativeInstalled(ship, family, id) {
  const meta = FAMILY_META[family];
  return Boolean(meta?.installed(ship)?.includes(id));
}

function setInstalledPresentation(card, installed) {
  card.classList.toggle("is-installed", installed);
  const state = card.querySelector(".arkflight-fitting-state");
  if (state) state.textContent = installed ? "INSTALLED" : "READY TO FIT";
  if (!installed) card.disabled = false;
}

function cloneAvailableCard(source, count) {
  const clone = source.cloneNode(true);
  clone.classList.remove("is-installed", "is-located", "is-bay-selected", "is-over-capacity");
  clone.disabled = false;
  clone.hidden = false;
  clone.dataset.refitInventoryQuantity = String(count);
  clone.dataset.refitPhysicalClone = "true";
  const state = clone.querySelector(".arkflight-fitting-state");
  if (state) state.textContent = "READY TO FIT";
  clone.querySelector(".arkflight-refit-overcapacity-label")?.remove();
  return clone;
}

function componentCatalog(family) {
  return family === "shipMod" ? SHIP_CATALOGS.shipMods : SHIP_CATALOGS.arkengineMods;
}

function componentName(family, id) {
  return componentCatalog(family)?.[id]?.name ?? id;
}

function componentSlotClass(family, id) {
  return componentCatalog(family)?.[id]?.data?.refit?.slotClass ?? "general";
}

function pendingRemoval(ship, family, placement) {
  return (ship?.refit?.workOrders ?? []).find((job) => {
    if (job?.type !== "remove" || job?.componentFamily !== family || job?.componentId !== placement.componentId) return false;
    if (!["planned", "working"].includes(job.status)) return false;
    if (placement.sourceJobId && job?.result?.sourceInstallJobId) return job.result.sourceInstallJobId === placement.sourceJobId;
    const a = [...(job.socketIndices ?? [])].sort((x, y) => x - y).join(",");
    const b = [...(placement.socketIndices ?? [])].sort((x, y) => x - y).join(",");
    return a && a === b;
  }) ?? null;
}

function socketLabel(placement) {
  if (placement.overCapacity || !placement.socketIndices.length) return "UNSLOTTED";
  return placement.socketIndices.map((index) => `S${index + 1}`).join(" + ");
}

async function beginRemoval(actor, family, placement, button) {
  if (!actor || !game.user?.isGM || button.disabled) return;
  button.disabled = true;
  try {
    const queued = await game.arkflight?.refit?.queueRemove?.(actor, family, placement.componentId, {
      method: "crew",
      socketIndices: [...placement.socketIndices],
      sourceInstallJobId: placement.sourceJobId ?? ""
    });
    if (!queued?.ok || !queued.job) {
      ui?.notifications?.warn?.(`Could not remove ${componentName(family, placement.componentId)}: ${queued?.reason ?? "unknown error"}.`);
      return;
    }
    const started = await game.arkflight?.refit?.startWork?.(actor, queued.job.id);
    if (!started?.ok) {
      ui?.notifications?.warn?.(`Removal was queued but could not start: ${started?.reason ?? "unknown error"}.`);
      return;
    }
    ui?.notifications?.info?.(`${componentName(family, placement.componentId)} removal started — ${started.job.remainingHours}h remaining.`);
    actor.sheet?.render?.(false);
  } catch (error) {
    console.error("Arkflight | Could not begin fitting removal", error);
    ui?.notifications?.error?.(error?.message ?? "Could not begin fitting removal.");
  } finally {
    button.disabled = false;
  }
}

function renderAuthoritativeInstalledList(root, stage, legacyInstalledList, actor, ship, family, layout) {
  const section = stage.querySelector(".arkflight-bay-installed-section") ?? root.querySelector(".arkflight-bay-installed-section");
  if (!section) return;

  legacyInstalledList.hidden = true;
  let list = section.querySelector(".arkflight-refit-installed-authority");
  if (!list) {
    list = document.createElement("div");
    list.className = "arkflight-refit-installed-authority";
    section.append(list);
  }
  list.replaceChildren();

  if (!layout.placements.length) {
    const empty = document.createElement("div");
    empty.className = "arkflight-bay-empty-installed";
    empty.innerHTML = `<i class="fa-solid fa-wrench"></i><span>No fittings seated yet.</span>`;
    list.append(empty);
    return;
  }

  layout.placements.forEach((placement, placementIndex) => {
    const tone = (placement.socketIndices[0] ?? placementIndex) % 4;
    const pending = pendingRemoval(ship, family, placement);
    const row = document.createElement("article");
    row.className = `arkflight-refit-installed-row tone-${tone}${placement.overCapacity ? " is-over-capacity" : ""}${pending ? " is-removing" : ""}`;
    row.dataset.componentId = placement.componentId;
    row.innerHTML = `
      <div class="arkflight-refit-installed-icon" aria-hidden="true"><i class="fa-solid fa-screwdriver-wrench"></i></div>
      <div class="arkflight-refit-installed-copy">
        <strong>${componentName(family, placement.componentId)}</strong>
        <span>${componentSlotClass(family, placement.componentId)} · ${placement.slotCost} ${placement.slotCost === 1 ? "slot" : "slots"} · ${socketLabel(placement)}</span>
        ${placement.overCapacity ? `<em>UNSLOTTED — OVER CAPACITY</em>` : pending ? `<em>REMOVAL IN PROGRESS — ${pending.remainingHours}h</em>` : ""}
      </div>
      <button type="button" class="arkflight-refit-remove-button" ${pending ? "disabled" : ""} title="${pending ? "Removal already in progress" : `Remove ${componentName(family, placement.componentId)}`}">
        <i class="fa-solid fa-arrow-right-from-bracket"></i><span>${pending ? "REMOVING" : `REMOVE ${FAMILY_META[family].noun}`}</span>
      </button>`;
    row.querySelector(".arkflight-refit-remove-button")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginRemoval(actor, family, placement, event.currentTarget);
    });
    list.append(row);
  });
}

function normalizeFamily(root, actor, ship, family) {
  const stage = root.querySelector(`.arkflight-fitting-card[data-fitting-kind='${family}']`)?.closest(".arkflight-commission-stage");
  if (!stage) return;
  const available = stage.querySelector(".arkflight-bay-available");
  const installedList = stage.querySelector(".arkflight-bay-installed");
  if (!available || !installedList) return;

  available.querySelectorAll(".arkflight-fitting-card[data-refit-physical-clone='true']").forEach((card) => card.remove());

  const originals = [...stage.querySelectorAll(".arkflight-fitting-card:not([data-refit-physical-clone='true'])")]
    .filter((card) => card.dataset.fittingKind === family);

  for (const card of originals) {
    const id = card.dataset.id;
    const installed = authoritativeInstalled(ship, family, id);
    const count = physicalCount(ship, family, id);

    setInstalledPresentation(card, installed);
    card.classList.remove("is-over-capacity");
    card.querySelector(".arkflight-refit-overcapacity-label")?.remove();
    if (installed) {
      if (card.parentElement !== installedList) installedList.append(card);
      card.hidden = false;
      card.dataset.refitInventoryQuantity = "0";
    } else {
      if (card.parentElement !== available) available.append(card);
      card.dataset.refitInventoryQuantity = String(count);
      card.hidden = count <= 0;
    }

    if (installed && count > 0) available.append(cloneAvailableCard(card, count));
  }

  const layout = decorateAuthoritativeSockets(root, stage, ship, family);
  renderAuthoritativeInstalledList(root, stage, installedList, actor, ship, family, layout);
}

function decorateAuthoritativeSockets(root, stage, ship, family) {
  const meta = FAMILY_META[family];
  const schematic = stage.querySelector(meta.schematic) ?? root.querySelector(meta.schematic);
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, family);
  if (!schematic) return layout;
  const placementBySocket = new Map();
  for (const placement of layout.placements) {
    placement.socketIndices.forEach((index, offset) => placementBySocket.set(index, { placement, linked: offset > 0 }));
  }

  for (const socket of schematic.querySelectorAll(".arkflight-bay-socket")) {
    const index = Number(socket.dataset.socketIndex);
    const entry = placementBySocket.get(index) ?? null;
    if (entry) {
      const tone = index % 4;
      socket.classList.remove("is-open", "is-drop-ready", "tone-0", "tone-1", "tone-2", "tone-3");
      socket.classList.add("is-occupied", "is-refit-installed", `tone-${tone}`);
      socket.dataset.refitInstalledId = entry.placement.componentId;
      socket.innerHTML = `<i class="fa-solid fa-screwdriver-wrench arkflight-refit-socket-mod-icon"></i><span>${entry.linked ? "LINK" : index + 1}</span>`;
      socket.title = `${componentName(family, entry.placement.componentId)} — ${entry.linked ? "linked occupied socket" : `installed in socket ${index + 1}`}`;
      socket.disabled = false;
    } else if (!socket.classList.contains("is-refit-staged")) {
      socket.classList.remove("is-occupied", "is-refit-installed", "tone-0", "tone-1", "tone-2", "tone-3");
      socket.classList.add("is-open");
      delete socket.dataset.refitInstalledId;
      socket.innerHTML = `<i class="fa-solid fa-plus"></i><span>${index + 1}</span>`;
    }
  }

  stage.querySelector(".arkflight-refit-overcapacity-warning")?.remove();
  if (layout.overBy > 0) {
    const warning = document.createElement("div");
    warning.className = "arkflight-refit-overcapacity-warning";
    const names = layout.overCapacityPlacements.map((entry) => componentName(family, entry.componentId));
    warning.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><div><strong>OVER CAPACITY — ${layout.usedSlots} / ${layout.capacity}</strong><span>${layout.overBy} fitting ${layout.overBy === 1 ? "slot is" : "slots are"} unslotted. Remove or reconfigure ${names.length ? names.join(", ") : "installed fittings"} before installing anything else.</span></div>`;
    const capacity = stage.querySelector(".arkflight-bay-capacity") ?? stage.querySelector(".arkflight-bay-three-panel");
    capacity?.after(warning);
  }
  return layout;
}

function resync(app, html) {
  const root = shellFrom(app, html);
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  if (!root || !ship || !root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const current = shipPayload(actor) ?? ship;
    normalizeFamily(root, actor, current, "arkengineMod");
    normalizeFamily(root, actor, current, "shipMod");
  }));
}

Hooks.on("renderApplicationV2", resync);
Hooks.on("renderActorSheet", resync);
