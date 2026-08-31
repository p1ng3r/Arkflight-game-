import { SHIP_CATALOGS } from "../content/index.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";

const MODULE_ID = "arkflight-game";

const FAMILY_META = Object.freeze({
  shipMod: { inventory: "shipMods", installed: (ship) => ship?.shipMods ?? [], schematic: ".arkflight-bay-schematic.is-ship" },
  arkengineMod: { inventory: "arkengineMods", installed: (ship) => ship?.arkengine?.modIds ?? [], schematic: ".arkflight-bay-schematic.is-engine" }
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

function componentName(family, id) {
  const catalog = family === "shipMod" ? SHIP_CATALOGS.shipMods : SHIP_CATALOGS.arkengineMods;
  return catalog?.[id]?.name ?? id;
}

function normalizeFamily(root, ship, family) {
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

  const empty = installedList.querySelector(".arkflight-bay-empty-installed");
  if (empty && installedList.querySelector(".arkflight-fitting-card.is-installed")) empty.remove();

  decorateAuthoritativeSockets(root, stage, installedList, ship, family);
}

function decorateAuthoritativeSockets(root, stage, installedList, ship, family) {
  const meta = FAMILY_META[family];
  const schematic = stage.querySelector(meta.schematic) ?? root.querySelector(meta.schematic);
  if (!schematic) return;
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, family);
  const placementBySocket = new Map();
  for (const placement of layout.placements) {
    placement.socketIndices.forEach((index, offset) => placementBySocket.set(index, { placement, linked: offset > 0 }));
  }

  for (const socket of schematic.querySelectorAll(".arkflight-bay-socket")) {
    const index = Number(socket.dataset.socketIndex);
    const entry = placementBySocket.get(index) ?? null;
    if (entry) {
      socket.classList.remove("is-open", "is-drop-ready");
      socket.classList.add("is-occupied", "is-refit-installed");
      socket.dataset.refitInstalledId = entry.placement.componentId;
      socket.innerHTML = `<i class="fa-solid fa-lock"></i><span>${entry.linked ? "LINKED" : index + 1}</span>`;
      socket.title = `${componentName(family, entry.placement.componentId)} — ${entry.linked ? "linked occupied socket" : "installed here"}`;
      socket.disabled = false;
    } else if (!socket.classList.contains("is-refit-staged")) {
      socket.classList.remove("is-occupied", "is-refit-installed");
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

    for (const placement of layout.overCapacityPlacements) {
      const card = [...installedList.querySelectorAll(".arkflight-fitting-card")].find((entry) => entry.dataset.id === placement.componentId);
      if (!card) continue;
      card.classList.add("is-over-capacity");
      if (!card.querySelector(".arkflight-refit-overcapacity-label")) {
        const label = document.createElement("span");
        label.className = "arkflight-refit-overcapacity-label";
        label.textContent = "UNSLOTTED — OVER CAPACITY";
        card.append(label);
      }
    }
  }
}

function resync(app, html) {
  const root = shellFrom(app, html);
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  if (!root || !ship || !root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const current = shipPayload(actor) ?? ship;
    normalizeFamily(root, current, "arkengineMod");
    normalizeFamily(root, current, "shipMod");
  }));
}

Hooks.on("renderApplicationV2", resync);
Hooks.on("renderActorSheet", resync);
