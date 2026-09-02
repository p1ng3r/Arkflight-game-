import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const ROOT = `modules/${MODULE_ID}/assets/ui/shipwright`;

const BOARD = Object.freeze({
  ship: `${ROOT}/visual-boards/ship_mod_board_generic_side.webp`,
  arkengine: `${ROOT}/visual-boards/arkengine_mod_board_generic.webp`,
  weapon: `${ROOT}/visual-boards/weapon_board_generic_top.webp`
});

const SOCKET = Object.freeze({
  ship: Object.freeze({
    structural: `${ROOT}/sockets/socket_ship_structural.webp`,
    rigging: `${ROOT}/sockets/socket_ship_rigging.webp`,
    support: `${ROOT}/sockets/socket_ship_support.webp`,
    utility: `${ROOT}/sockets/socket_ship_utility.webp`,
    propulsion: `${ROOT}/sockets/socket_ship_propulsion.webp`,
    flexible: `${ROOT}/sockets/socket_ship_flexible.webp`
  }),
  arkengine: Object.freeze({
    core: `${ROOT}/sockets/socket_engine_core.webp`,
    pressure: `${ROOT}/sockets/socket_engine_pressure.webp`,
    flow: `${ROOT}/sockets/socket_engine_flow.webp`,
    aether: `${ROOT}/sockets/socket_engine_aether.webp`,
    stability: `${ROOT}/sockets/socket_engine_stability.webp`,
    experimental: `${ROOT}/sockets/socket_engine_experimental.webp`,
    flexible: `${ROOT}/sockets/socket_engine_flexible.webp`
  }),
  weapon: Object.freeze({
    prow: `${ROOT}/sockets/socket_weapon_prow.webp`,
    broadside: `${ROOT}/sockets/socket_weapon_broadside.webp`,
    stern: `${ROOT}/sockets/socket_weapon_stern.webp`,
    deck: `${ROOT}/sockets/socket_weapon_deck.webp`,
    heavy: `${ROOT}/sockets/socket_weapon_heavy.webp`,
    flexible: `${ROOT}/sockets/socket_weapon_flexible.webp`
  })
});

const COMPATIBLE = `${ROOT}/sockets/socket_state_compatible.webp`;
const INCOMPATIBLE = `${ROOT}/sockets/socket_state_incompatible.webp`;

const POSITIONS = Object.freeze({
  ship: [
    [18, 47], [30, 66], [43, 37], [52, 66], [67, 43], [80, 58],
    [38, 53], [58, 51], [72, 68], [27, 38], [47, 76], [64, 31]
  ],
  arkengine: [
    [50, 15], [26, 28], [74, 28], [18, 50], [82, 50], [27, 72],
    [73, 72], [50, 84], [50, 50], [50, 32], [66, 50], [50, 68]
  ],
  weapon: [
    [50, 9], [20, 37], [80, 37], [18, 55], [82, 55], [50, 90],
    [50, 43], [50, 62], [31, 48], [69, 48], [28, 68], [72, 68]
  ]
});

function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.matches?.(".arkflight-ship-shell") ? element : element.querySelector?.(".arkflight-ship-shell");
}

function shipData(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function normalizeType(group, value) {
  const raw = String(value ?? "").trim().toLowerCase().replaceAll("_", "-");
  if (group === "ship") {
    if (raw.includes("struct")) return "structural";
    if (raw.includes("rig")) return "rigging";
    if (raw.includes("support")) return "support";
    if (raw.includes("util")) return "utility";
    if (raw.includes("prop")) return "propulsion";
    return "flexible";
  }
  if (group === "arkengine") {
    if (raw.includes("core")) return "core";
    if (raw.includes("press")) return "pressure";
    if (raw.includes("flow")) return "flow";
    if (raw.includes("aether")) return "aether";
    if (raw.includes("stabil")) return "stability";
    if (raw.includes("experiment")) return "experimental";
    return "flexible";
  }
  if (group === "weapon") {
    if (raw.includes("prow") || raw.includes("forward")) return "prow";
    if (raw.includes("broad") || raw.includes("port") || raw.includes("starboard")) return "broadside";
    if (raw.includes("stern") || raw.includes("aft")) return "stern";
    if (raw.includes("deck") || raw.includes("swivel")) return "deck";
    if (raw.includes("heavy")) return "heavy";
    return "flexible";
  }
  return "flexible";
}

function expandSchemaSockets(group, source) {
  if (Array.isArray(source)) {
    return source.map((entry, index) => ({
      id: String(entry?.id ?? `${group}-${index}`),
      type: normalizeType(group, entry?.type ?? entry?.socketType ?? entry?.kind ?? entry?.category)
    }));
  }
  if (!source || typeof source !== "object") return [];
  const out = [];
  for (const [key, value] of Object.entries(source)) {
    const count = Math.max(0, Math.trunc(Number(value?.count ?? value?.max ?? value) || 0));
    for (let index = 0; index < count; index += 1) out.push({ id: `${group}-${key}-${index}`, type: normalizeType(group, key) });
  }
  return out;
}

function schemaSockets(group, ship, derived) {
  const hull = SHIP_CATALOGS.hulls?.[ship?.hull?.chassisId] ?? null;
  const engine = SHIP_CATALOGS.arkengines?.[ship?.arkengine?.chassisId] ?? null;

  if (group === "weapon") {
    const explicit = hull?.data?.weaponSockets ?? hull?.data?.weaponMounts ?? hull?.weaponSockets ?? hull?.weaponMounts ?? derived?.stats?.weaponMounts;
    const sockets = expandSchemaSockets(group, explicit);
    if (sockets.length) return sockets;
    return [];
  }

  if (group === "ship") {
    const explicit = hull?.data?.shipModSockets ?? hull?.shipModSockets ?? hull?.data?.sockets?.shipMods;
    const sockets = expandSchemaSockets(group, explicit);
    if (sockets.length) return sockets;
    const capacity = Math.max(0, Math.trunc(Number(derived?.stats?.shipModCapacity) || 0));
    return Array.from({ length: capacity }, (_, index) => ({ id: `ship-flexible-${index}`, type: "flexible" }));
  }

  const explicit = engine?.data?.modSockets ?? engine?.data?.arkengineModSockets ?? engine?.modSockets ?? engine?.sockets;
  const sockets = expandSchemaSockets(group, explicit);
  if (sockets.length) return sockets;
  const capacity = Math.max(0, Math.trunc((Number(engine?.data?.modCapacity) || 0) + (Number(derived?.stats?.arkengineModCapacity) || 0)));
  return Array.from({ length: capacity }, (_, index) => ({ id: `arkengine-flexible-${index}`, type: "flexible" }));
}

function installedIds(group, ship) {
  if (group === "ship") return [...(ship?.shipMods ?? [])];
  if (group === "arkengine") return [...(ship?.arkengine?.modIds ?? [])];
  return [...(ship?.weapons ?? [])].map((entry) => typeof entry === "string" ? entry : entry?.id).filter(Boolean);
}

function catalogFor(group) {
  if (group === "ship") return SHIP_CATALOGS.shipMods;
  if (group === "arkengine") return SHIP_CATALOGS.arkengineMods;
  return SHIP_CATALOGS.weapons;
}

function boardTitle(group) {
  if (group === "ship") return "Ship Mod Fitting Board";
  if (group === "arkengine") return "Arkengine Mod Fitting Board";
  return "Weapon Hardpoint Board";
}

function boardSubtitle(group) {
  if (group === "ship") return "Hull-defined fitting sockets";
  if (group === "arkengine") return "Arkengine-defined modification sockets";
  return "Hull-defined weapon hardpoints";
}

function renderBoard(group, ship, derived) {
  const sockets = schemaSockets(group, ship, derived);
  const installed = installedIds(group, ship);
  const catalog = catalogFor(group) ?? {};
  const positions = POSITIONS[group];
  const slotHtml = sockets.map((socket, index) => {
    const [left, top] = positions[index % positions.length];
    const componentId = installed[index] ?? "";
    const component = componentId ? catalog?.[componentId] : null;
    const name = component?.name ?? (componentId || "Empty socket");
    const art = SOCKET[group]?.[socket.type] ?? SOCKET[group]?.flexible;
    return `<button type="button" class="arkflight-visual-socket ${componentId ? "is-filled" : "is-empty"}" style="left:${left}%;top:${top}%" data-visual-socket data-board="${group}" data-socket-id="${socket.id}" data-socket-type="${socket.type}" title="${socket.type}: ${name}">
      <img class="arkflight-visual-socket-base" src="${art}" alt="">
      <img class="arkflight-visual-socket-state" src="${COMPATIBLE}" alt="">
      ${componentId ? `<span class="arkflight-visual-socket-installed">${index + 1}</span>` : ""}
    </button>`;
  }).join("");

  return `<section class="arkflight-visual-board-panel" data-visual-board-panel="${group}">
    <div class="arkflight-visual-board-heading"><div><span>SHIPWRIGHT VISUAL FITTING</span><h2>${boardTitle(group)}</h2><p>${boardSubtitle(group)}</p></div><strong>${installed.length} installed / ${sockets.length} sockets</strong></div>
    <div class="arkflight-visual-board is-${group}">
      <img class="arkflight-visual-board-art" src="${BOARD[group]}" alt="${boardTitle(group)}">
      <div class="arkflight-visual-socket-layer">${slotHtml}</div>
    </div>
    <div class="arkflight-visual-board-help"><i class="fa-solid fa-hand"></i> Drag a compatible fitting onto a socket. Click a socket to jump to Refit inventory.</div>
  </section>`;
}

function installInteractions(app, root) {
  for (const button of root.querySelectorAll("[data-visual-board-tab]")) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const key = event.currentTarget.dataset.visualBoardTab;
      root.dataset.arkflightVisualBoard = key;
      for (const tab of root.querySelectorAll("[data-visual-board-tab]")) tab.classList.toggle("is-active", tab.dataset.visualBoardTab === key);
      for (const panel of root.querySelectorAll("[data-visual-board-panel]")) panel.hidden = panel.dataset.visualBoardPanel !== key;
    });
  }

  for (const socket of root.querySelectorAll("[data-visual-socket]")) {
    socket.addEventListener("click", (event) => {
      event.preventDefault();
      if ("activeTab" in app) {
        app.activeTab = "refit";
        app.render(false);
      }
    });
    socket.addEventListener("dragover", (event) => {
      event.preventDefault();
      socket.classList.add("is-drop-ready");
    });
    socket.addEventListener("dragleave", () => socket.classList.remove("is-drop-ready"));
    socket.addEventListener("drop", (event) => {
      event.preventDefault();
      socket.classList.remove("is-drop-ready");
      const type = socket.dataset.socketType;
      ui.notifications?.info(`Dropped fitting on ${type} socket. Select Install in Refit to commit the timed work order.`);
      if ("activeTab" in app) {
        app.activeTab = "refit";
        app.render(false);
      }
    });
  }
}

function enhance(app, html) {
  const root = rootElement(app, html);
  if (!root || root.dataset.arkflightVisualBoards === "true") return;
  const actor = app?.actor ?? app?.object;
  const ship = shipData(actor);
  const fittings = root.querySelector(".arkflight-sheet-section");
  const activeFittings = root.querySelector('[data-tab="fittings"].is-active');
  if (!ship || !fittings || !activeFittings) return;

  let derived;
  try { derived = deriveShip(ship, SHIP_CATALOGS); }
  catch (error) { console.warn("Arkflight | Visual fitting boards could not derive ship", error); return; }

  const active = root.dataset.arkflightVisualBoard || "ship";
  const wrapper = document.createElement("section");
  wrapper.className = "arkflight-visual-fitting-shell";
  wrapper.innerHTML = `<nav class="arkflight-visual-board-tabs" aria-label="Visual fitting boards">
    <button type="button" data-visual-board-tab="ship" class="${active === "ship" ? "is-active" : ""}"><i class="fa-solid fa-ship"></i> Ship Mods</button>
    <button type="button" data-visual-board-tab="arkengine" class="${active === "arkengine" ? "is-active" : ""}"><i class="fa-solid fa-gears"></i> Arkengine Mods</button>
    <button type="button" data-visual-board-tab="weapon" class="${active === "weapon" ? "is-active" : ""}"><i class="fa-solid fa-crosshairs"></i> Weapons</button>
  </nav>
  ${renderBoard("ship", ship, derived)}
  ${renderBoard("arkengine", ship, derived)}
  ${renderBoard("weapon", ship, derived)}`;

  const heading = fittings.querySelector(":scope > .arkflight-panel-heading");
  if (heading) heading.insertAdjacentElement("afterend", wrapper);
  else fittings.prepend(wrapper);
  for (const panel of wrapper.querySelectorAll("[data-visual-board-panel]")) panel.hidden = panel.dataset.visualBoardPanel !== active;
  root.dataset.arkflightVisualBoards = "true";
  installInteractions(app, root);
}

Hooks.on("renderActorSheet", enhance);
Hooks.on("renderArkflightShipSheet", enhance);

export const ARKFLIGHT_VISUAL_BOARD_ASSETS = Object.freeze({ BOARD, SOCKET, COMPATIBLE, INCOMPATIBLE });
