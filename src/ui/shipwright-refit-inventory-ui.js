import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { shipModSlotRows } from "../ship/ship-mod-slots.js";

const MODULE_ID = "arkflight-game";

const FAMILY_META = Object.freeze({
  "engine-mods": { family: "arkengineMod", catalog: "arkengineMods", inventory: "arkengineMods", blueprints: "arkengineModIds", label: "Arkengine" },
  "ship-mods": { family: "shipMod", catalog: "shipMods", inventory: "shipMods", blueprints: "shipModIds", label: "Ship" }
});

const SLOT_META = Object.freeze({
  generic: { label: "General", icon: "fa-circle-dot" },
  flexible: { label: "Flexible", icon: "fa-screwdriver-wrench" },
  weapon: { label: "Weapon", icon: "fa-crosshairs" },
  structural: { label: "Structural", icon: "fa-shield" },
  rigging: { label: "Rigging", icon: "fa-anchor" },
  lifeveil: { label: "Lifeveil", icon: "fa-shield-halved" },
  support: { label: "Support", icon: "fa-boxes-stacked" },
  utility: { label: "Utility", icon: "fa-gear" }
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

function quantity(ship, meta, id) {
  return Math.max(0, Math.trunc(Number(ship?.inventory?.[meta.inventory]?.[id] ?? 0)));
}

function knownBlueprints(ship, meta) {
  return [...(ship?.blueprints?.[meta.blueprints] ?? [])];
}

function salvageParts(ship) {
  return Math.max(0, Math.trunc(Number(ship?.resources?.salvageParts?.value ?? 0)));
}

function fittingStage(root, key) {
  return [...root.querySelectorAll(".arkflight-commission-stage")].find((stage) => stage.dataset.shipwrightPanel === key) ?? null;
}

function refitSpec(item) {
  return item?.data?.refit ?? null;
}

function slotClass(item) {
  return String(refitSpec(item)?.slotClass ?? "utility");
}

function slotCompatible(socketType, item) {
  if (!item) return true;
  if (["generic", "flexible"].includes(socketType)) return true;
  return socketType === slotClass(item);
}

function addCardBadges(card, item, count) {
  card.querySelectorAll(".arkflight-refit-badge-row").forEach((node) => node.remove());
  const spec = refitSpec(item);
  if (!spec) return;
  const row = document.createElement("div");
  row.className = "arkflight-refit-badge-row";
  const slot = SLOT_META[spec.slotClass] ?? SLOT_META.utility;
  row.innerHTML = `<span class="arkflight-refit-slot-badge is-${spec.slotClass}"><i class="fa-solid ${slot.icon}"></i>${slot.label}</span><span class="arkflight-refit-quantity">×${count}</span><span class="arkflight-refit-install-cost">Install ${spec.install.partsCost} Parts</span>`;
  const benefit = card.querySelector(".arkflight-benefit-block");
  if (benefit) benefit.before(row); else card.append(row);
}

function decorateAvailableCards(root, key, ship) {
  const meta = FAMILY_META[key];
  const stage = fittingStage(root, key);
  const available = stage?.querySelector(".arkflight-bay-available");
  if (!meta || !available) return;
  const catalog = SHIP_CATALOGS[meta.catalog] ?? {};

  for (const card of available.querySelectorAll(".arkflight-fitting-card")) {
    const id = card.dataset.id;
    const item = catalog[id];
    const count = quantity(ship, meta, id);
    card.dataset.refitInventoryQuantity = String(count);
    card.dataset.refitSlotClass = slotClass(item);
    card.hidden = count <= 0;
    card.classList.toggle("is-refit-owned", count > 0);
    if (count > 0) addCardBadges(card, item, count);
  }
}

function blueprintCard(item, family, parts) {
  const spec = refitSpec(item);
  const wrapper = document.createElement("article");
  wrapper.className = "arkflight-refit-blueprint-card";
  wrapper.dataset.id = item.id;
  wrapper.dataset.family = family;
  const affordable = parts >= Number(spec?.build?.partsCost ?? 0);
  const slot = SLOT_META[spec?.slotClass] ?? SLOT_META.utility;
  wrapper.innerHTML = `
    <div class="arkflight-refit-blueprint-title"><i class="fa-solid fa-scroll"></i><div><strong>${item.name}</strong><small>${slot.label} fitting · Tier ${spec?.tier ?? 1}</small></div></div>
    <p>${item.description ?? ""}</p>
    <div class="arkflight-refit-blueprint-costs">
      <span><i class="fa-solid fa-box-open"></i>${spec?.build?.partsCost ?? 0} Parts</span>
      <span><i class="fa-solid fa-clock"></i>${spec?.build?.timeHours ?? 0}h</span>
      <span><i class="fa-solid fa-hammer"></i>DC ${spec?.build?.dc ?? 0}</span>
    </div>
    <button type="button" class="arkflight-refit-build-button" ${affordable ? "" : "disabled"}><i class="fa-solid fa-hammer"></i>${affordable ? "Build Component" : "Need More Salvage"}</button>`;
  return wrapper;
}

function addEconomyTabs(app, root, key, ship) {
  const meta = FAMILY_META[key];
  const stage = fittingStage(root, key);
  const left = stage?.querySelector(".arkflight-bay-stockpile");
  const available = stage?.querySelector(".arkflight-bay-available");
  if (!meta || !left || !available || left.dataset.refitEconomyTabs === "true") return;
  left.dataset.refitEconomyTabs = "true";

  const parts = salvageParts(ship);
  const controls = document.createElement("div");
  controls.className = "arkflight-refit-economy-controls";
  controls.innerHTML = `
    <div class="arkflight-refit-parts"><i class="fa-solid fa-toolbox"></i><span>Salvage Parts</span><strong>${parts}</strong></div>
    <div class="arkflight-refit-bench-tabs" role="tablist">
      <button type="button" class="is-active" data-refit-view="available"><i class="fa-solid fa-box-open"></i>Available</button>
      <button type="button" data-refit-view="blueprints"><i class="fa-solid fa-scroll"></i>Blueprints</button>
    </div>`;

  const blueprints = document.createElement("div");
  blueprints.className = "arkflight-refit-blueprints";
  blueprints.hidden = true;
  const catalog = SHIP_CATALOGS[meta.catalog] ?? {};
  for (const id of knownBlueprints(ship, meta)) {
    const item = catalog[id];
    if (item) blueprints.append(blueprintCard(item, meta.family, parts));
  }
  if (!blueprints.children.length) {
    blueprints.innerHTML = `<div class="arkflight-refit-empty"><i class="fa-solid fa-scroll"></i><strong>No known blueprints</strong><span>Blueprint rewards and discoveries will appear here.</span></div>`;
  }

  const head = left.querySelector(".arkflight-bay-stockpile-head");
  head?.insertAdjacentElement("afterend", controls);
  available.insertAdjacentElement("afterend", blueprints);

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-refit-view]");
    if (!button) return;
    for (const entry of controls.querySelectorAll("[data-refit-view]")) entry.classList.toggle("is-active", entry === button);
    const view = button.dataset.refitView;
    available.hidden = view !== "available";
    blueprints.hidden = view !== "blueprints";
  });

  blueprints.addEventListener("click", async (event) => {
    const button = event.target.closest(".arkflight-refit-build-button");
    const card = event.target.closest(".arkflight-refit-blueprint-card");
    if (!button || !card || button.disabled) return;
    if (!game.user?.isGM) {
      ui.notifications?.warn?.("Only the GM can complete blueprint construction until crew work orders are enabled.");
      return;
    }
    try {
      button.disabled = true;
      const result = await game.arkflight?.refit?.buildFromBlueprint?.(shipActor(app), card.dataset.family, card.dataset.id, 1);
      if (!result?.ok) throw new Error(result?.reason ?? "Construction could not be completed.");
      ui.notifications?.info?.(`${catalog[card.dataset.id]?.name ?? "Component"} built and added to Available Parts.`);
      app.render?.({ force: true });
    } catch (error) {
      button.disabled = false;
      ui.notifications?.warn?.(error.message);
    }
  });
}

function shipSocketTypes(ship) {
  let derived;
  try { derived = deriveShip(ship, SHIP_CATALOGS); } catch { return []; }
  const rows = shipModSlotRows(ship, SHIP_CATALOGS, derived);
  const types = [];
  for (const row of rows) for (let i = 0; i < Number(row.max ?? 0); i += 1) types.push(row.id);
  return types;
}

function decorateShipSockets(root, ship) {
  const schematic = root.querySelector(".arkflight-bay-schematic.is-ship");
  if (!schematic) return;
  const sockets = [...schematic.querySelectorAll(".arkflight-bay-socket")];
  const types = shipSocketTypes(ship);
  sockets.forEach((socket, index) => {
    const type = types[index] ?? "generic";
    const meta = SLOT_META[type] ?? SLOT_META.generic;
    for (const className of [...socket.classList]) if (className.startsWith("is-ship-socket-")) socket.classList.remove(className);
    socket.dataset.socketType = type;
    socket.dataset.socketRole = meta.label;
    socket.classList.add(`is-ship-socket-${type}`);
    let marker = socket.querySelector(".arkflight-ship-socket-marker");
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "arkflight-ship-socket-marker";
      socket.append(marker);
    }
    marker.innerHTML = `<i class="fa-solid ${meta.icon}"></i><small>${meta.label}</small>`;
    socket.setAttribute("aria-label", `${meta.label} ship mod socket ${index + 1}`);
  });
}

function selectedShipMod(root) {
  if (root.dataset.baySelectedKind !== "shipMod") return null;
  return SHIP_CATALOGS.shipMods?.[root.dataset.baySelectedId] ?? null;
}

function paintShipCompatibility(root, item) {
  for (const socket of root.querySelectorAll(".arkflight-bay-schematic.is-ship .arkflight-bay-socket")) {
    socket.classList.remove("is-category-compatible", "is-category-incompatible");
    if (!item || socket.classList.contains("is-occupied")) continue;
    const compatible = slotCompatible(socket.dataset.socketType, item);
    socket.classList.toggle("is-category-compatible", compatible);
    socket.classList.toggle("is-category-incompatible", !compatible);
  }
}

function dragPayload(event) {
  try { return JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null"); }
  catch { return null; }
}

function wireShipCompatibility(root) {
  if (root.dataset.refitShipSocketWired === "true") return;
  root.dataset.refitShipSocketWired = "true";

  root.addEventListener("click", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-ship .arkflight-bay-socket");
    if (socket && !socket.classList.contains("is-occupied")) {
      const item = selectedShipMod(root);
      if (item && !slotCompatible(socket.dataset.socketType, item)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const label = SLOT_META[socket.dataset.socketType]?.label ?? "This";
        ui.notifications?.warn?.(`${label} socket is not compatible with that Ship fitting.`);
        return;
      }
    }
    queueMicrotask(() => paintShipCompatibility(root, selectedShipMod(root)));
  }, true);

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-fitting-kind='shipMod']");
    if (!card || card.classList.contains("is-installed")) return;
    paintShipCompatibility(root, SHIP_CATALOGS.shipMods?.[card.dataset.id]);
  }, true);

  root.addEventListener("dragover", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-ship .arkflight-bay-socket");
    if (!socket || socket.classList.contains("is-occupied")) return;
    const payload = dragPayload(event);
    if (payload?.kind !== "shipMod") return;
    const item = SHIP_CATALOGS.shipMods?.[payload.id];
    paintShipCompatibility(root, item);
    if (item && !slotCompatible(socket.dataset.socketType, item)) event.stopImmediatePropagation();
  }, true);

  root.addEventListener("drop", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-ship .arkflight-bay-socket");
    if (!socket || socket.classList.contains("is-occupied")) return;
    const payload = dragPayload(event);
    if (payload?.kind !== "shipMod") return;
    const item = SHIP_CATALOGS.shipMods?.[payload.id];
    if (item && !slotCompatible(socket.dataset.socketType, item)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const label = SLOT_META[socket.dataset.socketType]?.label ?? "This";
      ui.notifications?.warn?.(`${label} socket rejects that Ship fitting.`);
    }
  }, true);

  root.addEventListener("dragend", () => paintShipCompatibility(root, null), true);
}

function refresh(app, html) {
  const root = shellFrom(app, html);
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  if (!root || !ship || !root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => {
    for (const key of Object.keys(FAMILY_META)) {
      decorateAvailableCards(root, key, ship);
      addEconomyTabs(app, root, key, ship);
    }
    decorateShipSockets(root, ship);
    wireShipCompatibility(root);
  });
}

Hooks.on("renderApplicationV2", refresh);
Hooks.on("renderActorSheet", refresh);
