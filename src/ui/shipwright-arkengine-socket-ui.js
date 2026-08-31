import { ARKENGINE_MODS } from "../content/arkengine-mods.js";

const MODULE_ID = "arkflight-game";
const ENGINE_ART = `modules/${MODULE_ID}/assets/ui/shipwright/arkengine/arkengine_schematic_core_installed.webp`;
const SOCKET_ART = `modules/${MODULE_ID}/assets/ui/shipwright/arkengine/arkengine_mod_socket_neutral.webp`;

const SOCKET_META = Object.freeze({
  flexible: { label: "Flexible", icon: "fa-screwdriver-wrench" },
  power: { label: "Power", icon: "fa-bolt" },
  stability: { label: "Stability", icon: "fa-hexagon-nodes" },
  lifeveil: { label: "Lifeveil", icon: "fa-shield-halved" },
  utility: { label: "Utility", icon: "fa-gear" }
});

// Percent coordinates are authored against the portrait Arkengine schematic.
// The first four positions intentionally expose one flexible socket plus the
// three major engine identities so a common four-slot Arkengine can accept
// every current Arkengine mod family without becoming a dead-end build.
const ENGINE_SOCKET_MAP = Object.freeze([
  { x: 50, y: 20, type: "flexible" },
  { x: 25, y: 42, type: "stability" },
  { x: 75, y: 42, type: "lifeveil" },
  { x: 50, y: 79, type: "power" },
  { x: 25, y: 65, type: "utility" },
  { x: 75, y: 65, type: "power" },
  { x: 35, y: 29, type: "stability" },
  { x: 65, y: 29, type: "lifeveil" },
  { x: 35, y: 76, type: "utility" },
  { x: 65, y: 76, type: "power" }
]);

function shellFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function categoryForMod(id) {
  const mod = ARKENGINE_MODS[id];
  const slotClass = String(mod?.data?.refit?.slotClass ?? "utility").toLowerCase();
  return SOCKET_META[slotClass] ? slotClass : "utility";
}

function selectedCategory(root) {
  if (root.dataset.baySelectedKind !== "arkengineMod") return null;
  return root.dataset.baySelectedId ? categoryForMod(root.dataset.baySelectedId) : null;
}

function isCompatible(socketType, modCategory) {
  return !modCategory || socketType === "flexible" || socketType === modCategory;
}

function clearCompatibility(root) {
  delete root.dataset.arkengineSocketCategory;
  for (const socket of root.querySelectorAll(".arkflight-bay-schematic.is-engine .arkflight-bay-socket")) {
    socket.classList.remove("is-category-compatible", "is-category-incompatible");
  }
}

function paintCompatibility(root, category) {
  clearCompatibility(root);
  if (!category) return;
  root.dataset.arkengineSocketCategory = category;
  for (const socket of root.querySelectorAll(".arkflight-bay-schematic.is-engine .arkflight-bay-socket")) {
    const compatible = isCompatible(socket.dataset.socketType, category);
    socket.classList.toggle("is-category-compatible", compatible && !socket.classList.contains("is-occupied"));
    socket.classList.toggle("is-category-incompatible", !compatible && !socket.classList.contains("is-occupied"));
  }
}

function modFromDrag(event) {
  try {
    const payload = JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null");
    if (payload?.kind !== "arkengineMod") return null;
    return payload;
  } catch {
    return null;
  }
}

function decorateSockets(root, schematic) {
  const sockets = [...schematic.querySelectorAll(".arkflight-bay-socket")];
  sockets.forEach((socket, index) => {
    const authored = ENGINE_SOCKET_MAP[index] ?? ENGINE_SOCKET_MAP[index % ENGINE_SOCKET_MAP.length];
    const meta = SOCKET_META[authored.type] ?? SOCKET_META.flexible;
    socket.style.left = `${authored.x}%`;
    socket.style.top = `${authored.y}%`;
    socket.dataset.socketType = authored.type;
    socket.dataset.socketRole = meta.label;
    socket.classList.add(`is-socket-${authored.type}`);

    if (!socket.querySelector(".arkflight-engine-socket-art")) {
      const art = document.createElement("img");
      art.className = "arkflight-engine-socket-art";
      art.src = SOCKET_ART;
      art.alt = "";
      art.draggable = false;
      socket.prepend(art);
    }

    let marker = socket.querySelector(".arkflight-engine-socket-marker");
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "arkflight-engine-socket-marker";
      socket.append(marker);
    }
    marker.innerHTML = `<i class="fa-solid ${meta.icon}"></i><small>${meta.label}</small>`;
    socket.setAttribute("aria-label", `${meta.label} Arkengine mod socket ${index + 1}`);
  });
}

function installEngineArt(schematic) {
  const art = schematic.querySelector(".arkflight-bay-schematic-art");
  if (!art) return;
  art.classList.add("arkflight-engine-blueprint-art");
  art.innerHTML = "";

  const image = document.createElement("img");
  image.className = "arkflight-engine-schematic-image";
  image.src = ENGINE_ART;
  image.alt = "Top-down technical drawing of the installed Arkengine and Aetherite core";
  image.draggable = false;
  art.append(image);

  const core = document.createElement("div");
  core.className = "arkflight-engine-core-status";
  core.innerHTML = `<span>AETHERITE CORE</span><strong><i class="fa-solid fa-gem"></i> SEATED</strong>`;
  art.append(core);
}

function decorateEngineBay(root) {
  const schematic = root.querySelector(".arkflight-bay-schematic.is-engine");
  if (!schematic || schematic.dataset.arkflightEngineSocketArt === "true") return;
  schematic.dataset.arkflightEngineSocketArt = "true";
  installEngineArt(schematic);
  decorateSockets(root, schematic);
  paintCompatibility(root, selectedCategory(root));
}

function wireInteraction(root) {
  if (root.dataset.arkflightEngineSocketWired === "true") return;
  root.dataset.arkflightEngineSocketWired = "true";

  // The existing Shipwright Bay owns persistence/staging. This layer only
  // supplies typed socket affordances and blocks obviously incompatible drops.
  root.addEventListener("click", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-engine .arkflight-bay-socket");
    if (socket && !socket.classList.contains("is-occupied")) {
      const category = selectedCategory(root);
      if (category && !isCompatible(socket.dataset.socketType, category)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const label = SOCKET_META[socket.dataset.socketType]?.label ?? "This";
        ui?.notifications?.warn?.(`${label} socket is not compatible with that Arkengine fitting.`);
        return;
      }
    }

    queueMicrotask(() => paintCompatibility(root, selectedCategory(root)));
  }, true);

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-fitting-kind='arkengineMod'], .arkflight-fitting-card[data-arkflight-fitting='true'][data-fitting-kind='arkengineMod']");
    if (!card || card.classList.contains("is-installed")) return;
    paintCompatibility(root, categoryForMod(card.dataset.id));
  }, true);

  root.addEventListener("dragover", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-engine .arkflight-bay-socket");
    if (!socket || socket.classList.contains("is-occupied")) return;
    const payload = modFromDrag(event);
    if (!payload) return;
    const category = categoryForMod(payload.id);
    paintCompatibility(root, category);
    if (!isCompatible(socket.dataset.socketType, category)) {
      event.stopImmediatePropagation();
    }
  }, true);

  root.addEventListener("drop", (event) => {
    const socket = event.target.closest?.(".arkflight-bay-schematic.is-engine .arkflight-bay-socket");
    if (!socket || socket.classList.contains("is-occupied")) return;
    const payload = modFromDrag(event);
    if (!payload) return;
    const category = categoryForMod(payload.id);
    if (!isCompatible(socket.dataset.socketType, category)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const label = SOCKET_META[socket.dataset.socketType]?.label ?? "This";
      ui?.notifications?.warn?.(`${label} socket rejects that fitting.`);
      return;
    }
    clearCompatibility(root);
  }, true);

  root.addEventListener("dragend", () => clearCompatibility(root), true);
}

function refresh(app, html) {
  const root = shellFrom(app, html);
  if (!root) return;
  if (!root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => {
    decorateEngineBay(root);
    wireInteraction(root);
  });
}

Hooks.on("renderApplicationV2", refresh);
Hooks.on("renderActorSheet", refresh);
