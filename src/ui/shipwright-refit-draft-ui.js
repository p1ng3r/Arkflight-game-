import { SHIP_CATALOGS } from "../content/index.js";
import {
  createRefitDraft,
  stageRefitComponent,
  removeDraftAssignment,
  resetRefitDraft,
  previewRefitDraft,
  refitDraftInstallParts,
  availableDraftQuantity
} from "../ship/refit-draft.js";

const MODULE_ID = "arkflight-game";
const drafts = new Map();

const STAT_LABELS = Object.freeze({
  armorClass: "Armor",
  hullIntegrity: "Hull",
  lifeveilCapacity: "Lifeveil",
  strainCapacity: "Strain Capacity",
  cargoCapacity: "Cargo Capacity",
  detection: "Detection",
  combatSpeed: "Combat Speed",
  maneuverability: "Maneuver",
  shipModCapacity: "Ship Mod Capacity",
  arkengineModCapacity: "Arkengine Mod Capacity",
  arkengineFuelSlots: "Fuel Slots",
  hardBurnStrainCost: "Hard Burn Strain Cost",
  voyageSpeedTravelHexDays: "Travel Hex Days"
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

function draftFor(actor) {
  const key = actor?.uuid ?? actor?.id ?? "";
  if (!drafts.has(key)) drafts.set(key, createRefitDraft({ actorUuid: key }));
  return drafts.get(key);
}

function setDraft(actor, draft) {
  const key = actor?.uuid ?? actor?.id ?? "";
  drafts.set(key, createRefitDraft(draft));
  return drafts.get(key);
}

function familyForSocket(socket) {
  if (socket?.closest?.(".arkflight-bay-schematic.is-engine")) return "arkengineMod";
  if (socket?.closest?.(".arkflight-bay-schematic.is-ship")) return "shipMod";
  return null;
}

function catalogForFamily(family) {
  if (family === "arkengineMod") return SHIP_CATALOGS.arkengineMods;
  if (family === "shipMod") return SHIP_CATALOGS.shipMods;
  return {};
}

function slotCompatible(socket, item) {
  const socketType = String(socket?.dataset?.socketType ?? "generic");
  const required = String(item?.data?.refit?.slotClass ?? "utility");
  return ["generic", "flexible"].includes(socketType) || socketType === required;
}

function dragPayload(event) {
  try { return JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null"); }
  catch { return null; }
}

function selectedPayload(root) {
  const kind = root?.dataset?.baySelectedKind;
  const id = root?.dataset?.baySelectedId;
  return kind && id ? { kind, id, installed: false } : null;
}

function freeCompatibleSockets(root, family, item, preferredSocket, count) {
  const selector = family === "arkengineMod"
    ? ".arkflight-bay-schematic.is-engine .arkflight-bay-socket"
    : ".arkflight-bay-schematic.is-ship .arkflight-bay-socket";
  const all = [...root.querySelectorAll(selector)].filter((socket) => {
    if (socket.classList.contains("is-occupied") || socket.classList.contains("is-refit-staged")) return false;
    return slotCompatible(socket, item);
  });
  if (!all.includes(preferredSocket)) return [];
  return [preferredSocket, ...all.filter((socket) => socket !== preferredSocket)]
    .slice(0, count)
    .map((socket) => Number(socket.dataset.socketIndex));
}

function stageFromSocket(app, root, socket, payload) {
  if (!payload || payload.installed) return false;
  const family = familyForSocket(socket);
  if (!family || payload.kind !== family) return false;
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  const item = catalogForFamily(family)?.[payload.id];
  if (!actor || !ship || !item || !slotCompatible(socket, item)) return false;

  const draft = draftFor(actor);
  if (availableDraftQuantity(ship, draft, family, payload.id) < 1) {
    ui.notifications?.warn?.("Every owned copy of that fitting is already staged.");
    return true;
  }

  const slotCost = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1)));
  const socketIndices = freeCompatibleSockets(root, family, item, socket, slotCost);
  if (socketIndices.length !== slotCost) {
    ui.notifications?.warn?.(`That fitting needs ${slotCost} compatible open ${slotCost === 1 ? "socket" : "sockets"}.`);
    return true;
  }

  const result = stageRefitComponent(ship, draft, SHIP_CATALOGS, { family, componentId: payload.id, socketIndices });
  if (!result.ok) {
    ui.notifications?.warn?.(`Could not stage fitting: ${result.reason}.`);
    return true;
  }
  setDraft(actor, result.draft);
  renderDraft(app, root);
  return true;
}

function stagedItemName(assignment) {
  return catalogForFamily(assignment.family)?.[assignment.componentId]?.name ?? assignment.componentId;
}

function renderSocketAssignments(root, draft) {
  for (const socket of root.querySelectorAll(".arkflight-bay-socket")) {
    socket.classList.remove("is-refit-staged", "is-refit-staged-linked");
    delete socket.dataset.refitStagedFamily;
    delete socket.dataset.refitStagedId;
    const stagedLabel = socket.querySelector(".arkflight-refit-staged-label");
    stagedLabel?.remove();
  }

  for (const assignment of draft.assignments) {
    const schematic = assignment.family === "arkengineMod" ? ".arkflight-bay-schematic.is-engine" : ".arkflight-bay-schematic.is-ship";
    assignment.socketIndices.forEach((index, offset) => {
      const socket = root.querySelector(`${schematic} .arkflight-bay-socket[data-socket-index="${index}"]`);
      if (!socket) return;
      socket.classList.add("is-refit-staged");
      if (offset > 0) socket.classList.add("is-refit-staged-linked");
      socket.dataset.refitStagedFamily = assignment.family;
      socket.dataset.refitStagedId = assignment.componentId;
      const label = document.createElement("span");
      label.className = "arkflight-refit-staged-label";
      label.innerHTML = offset > 0
        ? `<i class="fa-solid fa-link"></i><small>STAGED LINK</small>`
        : `<i class="fa-solid fa-thumbtack"></i><small>${stagedItemName(assignment)}</small>`;
      socket.append(label);
      socket.title = `${stagedItemName(assignment)} — staged only; click to remove from draft.`;
    });
  }
}

function renderInventoryAvailability(root, ship, draft) {
  for (const card of root.querySelectorAll(".arkflight-bay-available .arkflight-fitting-card")) {
    const family = card.dataset.fittingKind;
    if (!family || !["shipMod", "arkengineMod"].includes(family)) continue;
    const remaining = availableDraftQuantity(ship, draft, family, card.dataset.id);
    card.dataset.refitDraftAvailable = String(remaining);
    card.classList.toggle("is-refit-all-staged", remaining <= 0);
    const qty = card.querySelector(".arkflight-refit-quantity");
    if (qty) qty.textContent = remaining > 0 ? `×${remaining} ready` : "All staged";
  }
}

function renderPreview(root, ship, draft) {
  let panel = root.querySelector(".arkflight-refit-draft-preview");
  const right = root.querySelector(".arkflight-shipwright-bay-active .arkflight-bay-right") ?? root.querySelector(".arkflight-bay-right");
  if (!right) return;
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "arkflight-refit-draft-preview";
    const actions = right.querySelector(".arkflight-bay-actions");
    if (actions) actions.before(panel); else right.append(panel);
  }

  if (!draft.assignments.length) {
    panel.innerHTML = `<div class="arkflight-bay-section-title"><span>REFIT DRAFT</span><strong>No staged changes</strong></div><p>Drag an owned fitting into a compatible socket. Nothing is installed or consumed until a later work order completes.</p>`;
    return;
  }

  let preview;
  try { preview = previewRefitDraft(ship, draft, SHIP_CATALOGS); }
  catch (error) {
    panel.innerHTML = `<div class="arkflight-bay-section-title"><span>REFIT DRAFT</span><strong>${draft.assignments.length} staged</strong></div><p>Mechanical preview unavailable: ${error.message}</p>`;
    return;
  }
  const installParts = refitDraftInstallParts(draft, SHIP_CATALOGS);
  const rows = Object.entries(preview.deltas).map(([key, delta]) => {
    const label = STAT_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2");
    const sign = delta.delta >= 0 ? "+" : "";
    return `<li><span>${label}</span><strong>${delta.before} → ${delta.after}</strong><small>${sign}${delta.delta}</small></li>`;
  }).join("");
  panel.innerHTML = `
    <div class="arkflight-bay-section-title"><span>REFIT DRAFT</span><strong>${draft.assignments.length} ${draft.assignments.length === 1 ? "fitting" : "fittings"} staged</strong></div>
    <div class="arkflight-refit-draft-cost"><span><i class="fa-solid fa-toolbox"></i>Projected Install Parts</span><strong>${installParts}</strong></div>
    <div class="arkflight-refit-draft-list">${draft.assignments.map((assignment) => `<span><i class="fa-solid fa-thumbtack"></i>${stagedItemName(assignment)}</span>`).join("")}</div>
    ${rows ? `<ul class="arkflight-refit-stat-deltas">${rows}</ul>` : `<p>No direct derived-stat change; this fitting may grant a capability, signature, or event hook.</p>`}`;
}

function installDraftActions(app, root, ship, draft) {
  const actions = root.querySelector(".arkflight-shipwright-bay-active .arkflight-bay-actions") ?? root.querySelector(".arkflight-bay-actions");
  if (!actions) return;
  actions.classList.add("arkflight-refit-draft-actions");
  const legacyApply = actions.querySelector('[data-bay-action="apply"]');
  if (legacyApply) {
    legacyApply.disabled = true;
    legacyApply.hidden = true;
  }
  let reset = actions.querySelector('[data-refit-draft-action="reset"]');
  if (!reset) {
    reset = document.createElement("button");
    reset.type = "button";
    reset.dataset.refitDraftAction = "reset";
    reset.innerHTML = `<i class="fa-solid fa-rotate-left"></i> RESET DRAFT`;
    actions.append(reset);
    reset.addEventListener("click", () => {
      setDraft(shipActor(app), resetRefitDraft(draftFor(shipActor(app))));
      renderDraft(app, root);
    });
  }
  let begin = actions.querySelector('[data-refit-draft-action="begin"]');
  if (!begin) {
    begin = document.createElement("button");
    begin.type = "button";
    begin.className = "is-primary";
    begin.dataset.refitDraftAction = "begin";
    begin.innerHTML = `<i class="fa-solid fa-hammer"></i> BEGIN REFIT`;
    actions.append(begin);
    begin.addEventListener("click", () => {
      const actor = shipActor(app);
      const currentDraft = draftFor(actor);
      if (!currentDraft.assignments.length) return;
      const preview = previewRefitDraft(shipPayload(actor), currentDraft, SHIP_CATALOGS);
      Hooks.callAll("arkflightRefitDraftReady", { actor, draft: currentDraft, preview });
      ui.notifications?.info?.("Refit draft is ready for work-order resolution. No fitting has been installed yet.");
    });
  }
  reset.disabled = !draft.assignments.length;
  begin.disabled = !draft.assignments.length;
}

function renderDraft(app, root) {
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  if (!actor || !ship) return;
  const draft = draftFor(actor);
  renderSocketAssignments(root, draft);
  renderInventoryAvailability(root, ship, draft);
  renderPreview(root, ship, draft);
  installDraftActions(app, root, ship, draft);
}

function wireDraftInteraction(app, root) {
  if (root.dataset.refitDraftWired === "true") return;
  root.dataset.refitDraftWired = "true";

  root.addEventListener("click", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-engine .arkflight-bay-socket, .arkflight-bay-schematic.is-ship .arkflight-bay-socket");
    if (!socket) return;
    const actor = shipActor(app);
    const family = familyForSocket(socket);
    if (socket.classList.contains("is-refit-staged")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setDraft(actor, removeDraftAssignment(draftFor(actor), family, Number(socket.dataset.socketIndex)));
      renderDraft(app, root);
      return;
    }
    if (socket.classList.contains("is-occupied")) return;
    const payload = selectedPayload(root);
    if (!payload || payload.kind !== family) return;
    if (stageFromSocket(app, root, socket, payload)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  root.addEventListener("drop", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-engine .arkflight-bay-socket, .arkflight-bay-schematic.is-ship .arkflight-bay-socket");
    if (!socket || socket.classList.contains("is-occupied") || socket.classList.contains("is-refit-staged")) return;
    const payload = dragPayload(event);
    if (!payload || payload.kind !== familyForSocket(socket)) return;
    if (stageFromSocket(app, root, socket, payload)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function refresh(app, html) {
  const root = shellFrom(app, html);
  const actor = shipActor(app);
  if (!root || !actor || !shipPayload(actor) || !root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => {
    wireDraftInteraction(app, root);
    renderDraft(app, root);
  });
}

Hooks.on("renderApplicationV2", refresh);
Hooks.on("renderActorSheet", refresh);
