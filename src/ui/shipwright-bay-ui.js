const MODULE_ID = "arkflight-game";
const TARGET_WIDTH = 1720;
const TARGET_HEIGHT = 940;
const HORIZONTAL_MARGIN = 96;
const VERTICAL_MARGIN = 110;
const MIN_WIDTH = 1180;
const MIN_HEIGHT = 760;

const BAY_META = Object.freeze({
  "engine-mods": {
    kind: "arkengineMod",
    title: "ARKENGINE FITTINGS",
    stockpile: "Engine Parts on the Bench",
    socketLabel: "ARKENGINE SOCKET",
    view: "engine",
    icon: "fa-gears",
    flavor: "Seat brass, aetherite and rune-work directly into the Arkengine's living machinery."
  },
  rooms: {
    kind: "room",
    title: "VESSEL ROOMS",
    stockpile: "Rooms Ready for Refit",
    socketLabel: "ROOM BAY",
    view: "rooms",
    icon: "fa-door-open",
    flavor: "Lay out the ship's usable spaces and commit precious hull volume to the crew's needs."
  },
  "ship-mods": {
    kind: "shipMod",
    title: "SHIP FITTINGS",
    stockpile: "Ship Mods on the Bench",
    socketLabel: "SHIP SOCKET",
    view: "ship",
    icon: "fa-screwdriver-wrench",
    flavor: "Bolt new capability into hull, rigging, weapons and support systems until the vessel becomes unmistakably hers."
  }
});

function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function desiredRect() {
  const viewportWidth = Math.max(MIN_WIDTH, Number(globalThis.innerWidth ?? TARGET_WIDTH));
  const viewportHeight = Math.max(MIN_HEIGHT, Number(globalThis.innerHeight ?? TARGET_HEIGHT));
  const width = Math.max(MIN_WIDTH, Math.min(TARGET_WIDTH, viewportWidth - HORIZONTAL_MARGIN));
  const height = Math.max(MIN_HEIGHT, Math.min(TARGET_HEIGHT, viewportHeight - VERTICAL_MARGIN));
  return {
    width,
    height,
    left: Math.max(24, Math.round((viewportWidth - width) / 2)),
    top: Math.max(24, Math.round((viewportHeight - height) / 2))
  };
}

function sizeLikeEvent(app, root) {
  if (!root?.querySelector(".arkflight-commissioning-shell")) return;
  const rect = desiredRect();
  const key = `${rect.width}x${rect.height}@${rect.left},${rect.top}`;
  if (root.dataset.arkflightBaySize === key) return;
  try {
    app?.setPosition?.(rect);
    root.dataset.arkflightBaySize = key;
  } catch (error) {
    console.warn("Arkflight | Could not size Shipwright Bay", error);
  }
}

function activeSection(root) {
  return root.dataset.shipwrightSection || root.querySelector(".arkflight-shipwright-subnav .is-active")?.dataset.shipwrightSection || "core";
}

function activeStage(root, key) {
  return [...root.querySelectorAll(".arkflight-commission-stage")].find((stage) => stage.dataset.shipwrightPanel === key) ?? null;
}

function parseCapacity(stage) {
  const text = stage?.querySelector(".arkflight-capacity-meter strong")?.textContent ?? "";
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? { used: Number(match[1]), max: Number(match[2]) } : { used: 0, max: 0 };
}

function dragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null");
  } catch {
    return null;
  }
}

function cardName(card) {
  return card?.querySelector(":scope > strong")?.textContent?.trim() || card?.querySelector("strong")?.textContent?.trim() || "Unnamed fitting";
}

function cardCost(card) {
  const small = card?.querySelector("small")?.textContent ?? "";
  const match = small.match(/(\d+)\s*slot/i) || small.match(/(\d+)\s*room/i);
  return Math.max(1, Number(match?.[1] ?? 1));
}

function cardBenefit(card) {
  const explicit = card?.querySelector(".arkflight-benefit-block strong")?.textContent?.trim();
  if (explicit) return explicit;
  return card?.querySelector("p")?.textContent?.trim() || "Changes the vessel's fitted capability.";
}

function setSelected(root, card) {
  for (const entry of root.querySelectorAll(".arkflight-fitting-card.is-bay-selected")) entry.classList.remove("is-bay-selected");
  if (!card || card.classList.contains("is-installed") || card.disabled) {
    delete root.dataset.baySelectedId;
    delete root.dataset.baySelectedKind;
    updatePreview(root, null);
    return;
  }
  card.classList.add("is-bay-selected");
  root.dataset.baySelectedId = card.dataset.id;
  root.dataset.baySelectedKind = card.dataset.fittingKind;
  updatePreview(root, card);
}

function findSelectedCard(root, stage) {
  const id = root.dataset.baySelectedId;
  const kind = root.dataset.baySelectedKind;
  if (!id || !kind) return null;
  return [...stage.querySelectorAll(".arkflight-fitting-card")].find((card) => card.dataset.id === id && card.dataset.fittingKind === kind && !card.classList.contains("is-installed")) ?? null;
}

function installCard(card) {
  if (!card || card.disabled || card.classList.contains("is-installed")) return;
  card.click();
}

function socketPositions(count, view) {
  const ship = [
    [50, 10], [34, 22], [66, 22], [50, 34], [29, 46], [71, 46], [50, 57], [34, 69], [66, 69], [50, 82], [38, 91], [62, 91]
  ];
  const engine = [
    [50, 19], [72, 29], [81, 50], [72, 71], [50, 81], [28, 71], [19, 50], [28, 29], [50, 50], [50, 34], [66, 50], [50, 66]
  ];
  const rooms = [
    [29, 20], [50, 20], [71, 20], [29, 40], [50, 40], [71, 40], [29, 60], [50, 60], [71, 60], [29, 80], [50, 80], [71, 80]
  ];
  const source = view === "engine" ? engine : view === "rooms" ? rooms : ship;
  return Array.from({ length: count }, (_, index) => source[index % source.length]);
}

function buildSchematic(root, stage, meta, center) {
  const capacity = parseCapacity(stage);
  const cards = [...stage.querySelectorAll(".arkflight-fitting-card")];
  const installed = cards.filter((card) => card.classList.contains("is-installed"));
  const occupied = [];
  for (const card of installed) {
    for (let i = 0; i < cardCost(card); i += 1) occupied.push({ card, linked: i > 0 });
  }

  center.innerHTML = `
    <div class="arkflight-bay-center-head">
      <span>SHIPWRIGHT INSTALLATION FRAME</span>
      <h2>${meta.title}</h2>
      <p>${meta.flavor}</p>
    </div>
    <div class="arkflight-bay-schematic is-${meta.view}" aria-label="${meta.title} installation schematic">
      <div class="arkflight-bay-schematic-art" aria-hidden="true">
        <div class="arkflight-bay-schematic-core"><i class="fa-solid ${meta.icon}"></i></div>
      </div>
      <div class="arkflight-bay-socket-layer"></div>
      <div class="arkflight-bay-drop-instruction"><i class="fa-solid fa-hand"></i><span>Drag a part from the bench onto a glowing socket</span></div>
    </div>
    <div class="arkflight-bay-capacity"><span>FITTING CAPACITY</span><strong>${capacity.used} / ${capacity.max}</strong><div><i style="width:${capacity.max ? Math.min(100, (capacity.used / capacity.max) * 100) : 0}%"></i></div></div>
  `;

  const layer = center.querySelector(".arkflight-bay-socket-layer");
  const positions = socketPositions(capacity.max, meta.view);
  for (let index = 0; index < capacity.max; index += 1) {
    const entry = occupied[index] ?? null;
    const [x, y] = positions[index];
    const socket = document.createElement("button");
    socket.type = "button";
    socket.className = `arkflight-bay-socket ${entry ? "is-occupied" : "is-open"}`;
    socket.style.left = `${x}%`;
    socket.style.top = `${y}%`;
    socket.dataset.socketIndex = String(index);
    socket.innerHTML = entry
      ? `<i class="fa-solid fa-lock"></i><span>${entry.linked ? "LINKED" : index + 1}</span>`
      : `<i class="fa-solid fa-plus"></i><span>${index + 1}</span>`;
    socket.title = entry ? `${cardName(entry.card)} — ${entry.linked ? "linked socket" : "installed"}` : `${meta.socketLabel} ${index + 1}`;

    if (entry) {
      socket.addEventListener("click", () => {
        const target = root.querySelector(`.arkflight-bay-installed .arkflight-fitting-card[data-id="${CSS.escape(entry.card.dataset.id)}"]`);
        target?.classList.add("is-located");
        target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setTimeout(() => target?.classList.remove("is-located"), 850);
      });
    } else {
      socket.addEventListener("click", () => installCard(findSelectedCard(root, stage)));
      socket.addEventListener("dragover", (event) => {
        const payload = dragPayload(event);
        if (!payload || payload.installed || payload.kind !== meta.kind) return;
        event.preventDefault();
        socket.classList.add("is-drop-ready");
        center.classList.add("is-fitting-active");
      });
      socket.addEventListener("dragleave", () => socket.classList.remove("is-drop-ready"));
      socket.addEventListener("drop", (event) => {
        event.preventDefault();
        socket.classList.remove("is-drop-ready");
        center.classList.remove("is-fitting-active");
        const payload = dragPayload(event);
        if (!payload || payload.installed || payload.kind !== meta.kind) return;
        const card = cards.find((candidate) => candidate.dataset.id === payload.id && candidate.dataset.fittingKind === payload.kind);
        installCard(card);
      });
    }
    layer.append(socket);
  }
}

function updatePreview(root, card) {
  const panel = root.querySelector(".arkflight-bay-selection-preview");
  if (!panel) return;
  if (!card) {
    panel.innerHTML = `<span>REFIT CONSEQUENCES</span><strong>Select a fitting</strong><p>Choose a part from the bench to inspect what it changes, then seat it into a compatible socket.</p>`;
    return;
  }
  panel.innerHTML = `<span>REFIT CONSEQUENCES</span><strong>${cardName(card)}</strong><p>${cardBenefit(card)}</p><small>${cardCost(card)} fitting ${cardCost(card) === 1 ? "slot" : "slots"} required</small>`;
}

function cloneSummary(root, right) {
  const summary = root.querySelector(".arkflight-commissioning-summary");
  if (!summary) return;
  const identity = document.createElement("div");
  identity.className = "arkflight-bay-vessel-summary";
  const title = summary.querySelector("h2")?.textContent?.trim() || "Staged Vessel";
  const buildLines = [...summary.querySelectorAll(".arkflight-build-line")].map((line) => line.textContent.trim().replace(/\s+/g, " "));
  identity.innerHTML = `<span>THE VESSEL AS SHE STANDS</span><h2>${title}</h2>${buildLines.map((line) => `<p>${line}</p>`).join("")}`;
  right.append(identity);

  const stats = summary.querySelector(".arkflight-preview-grid")?.cloneNode(true);
  if (stats) {
    const block = document.createElement("section");
    block.className = "arkflight-bay-stats";
    block.innerHTML = `<div class="arkflight-bay-section-title"><span>LIVE SHIP READOUT</span><strong>Derived Preview</strong></div>`;
    block.append(stats);
    right.append(block);
  }

  const capacity = summary.querySelector(".arkflight-summary-capacities")?.cloneNode(true);
  if (capacity) {
    const block = document.createElement("section");
    block.className = "arkflight-bay-capacity-summary";
    block.innerHTML = `<div class="arkflight-bay-section-title"><span>HARDPOINT REPORT</span><strong>Fitting Use</strong></div>`;
    block.append(capacity);
    right.append(block);
  }
}

function buildBay(root, key) {
  const meta = BAY_META[key];
  const stage = activeStage(root, key);
  if (!meta || !stage || stage.dataset.arkflightThreePanel === "true") return;
  const grid = stage.querySelector(".arkflight-fitting-grid");
  if (!grid) return;

  stage.dataset.arkflightThreePanel = "true";
  stage.querySelector(".arkflight-fitting-dock")?.remove();
  const originalHeading = stage.querySelector(".arkflight-stage-heading");
  if (originalHeading) originalHeading.hidden = true;

  const layout = document.createElement("div");
  layout.className = "arkflight-bay-three-panel";
  const left = document.createElement("section");
  left.className = "arkflight-bay-panel arkflight-bay-stockpile";
  const center = document.createElement("section");
  center.className = "arkflight-bay-panel arkflight-bay-center";
  const right = document.createElement("aside");
  right.className = "arkflight-bay-panel arkflight-bay-right";
  layout.append(left, center, right);

  const search = document.createElement("div");
  search.className = "arkflight-bay-stockpile-head";
  search.innerHTML = `<div><span>SHIPWRIGHT STOCKPILE</span><h2>${meta.stockpile}</h2></div><label><i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="Search fittings..." aria-label="Search available fittings"></label>`;
  left.append(search);

  const availableList = document.createElement("div");
  availableList.className = "arkflight-bay-available";
  const installedList = document.createElement("div");
  installedList.className = "arkflight-bay-installed";
  for (const card of [...grid.querySelectorAll(":scope > .arkflight-fitting-card")]) {
    if (card.classList.contains("is-installed")) installedList.append(card);
    else availableList.append(card);
  }
  left.append(availableList);
  grid.hidden = true;

  search.querySelector("input")?.addEventListener("input", (event) => {
    const term = event.currentTarget.value.trim().toLowerCase();
    for (const card of availableList.querySelectorAll(".arkflight-fitting-card")) {
      card.hidden = Boolean(term) && !card.textContent.toLowerCase().includes(term);
    }
  });

  // Available cards become selection + drag sources; installation happens on sockets.
  availableList.addEventListener("click", (event) => {
    const card = event.target.closest(".arkflight-fitting-card");
    if (!card || card.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setSelected(root, card);
  }, true);

  buildSchematic(root, stage, meta, center);

  const installedSection = document.createElement("section");
  installedSection.className = "arkflight-bay-installed-section";
  installedSection.innerHTML = `<div class="arkflight-bay-section-title"><span>FITTED COMPONENTS</span><strong>Installed in this system</strong></div>`;
  if (!installedList.children.length) installedList.innerHTML = `<div class="arkflight-bay-empty-installed"><i class="fa-solid fa-wrench"></i><span>No fittings seated yet.</span></div>`;
  installedSection.append(installedList);
  right.append(installedSection);

  const preview = document.createElement("section");
  preview.className = "arkflight-bay-selection-preview";
  right.append(preview);
  updatePreview(root, null);
  cloneSummary(root, right);

  const actions = document.createElement("div");
  actions.className = "arkflight-bay-actions";
  const originalApply = [...root.querySelectorAll("button")].find((button) => /APPLY REFIT|COMMISSION VESSEL/i.test(button.textContent));
  actions.innerHTML = `<button type="button" data-bay-action="clear"><i class="fa-solid fa-rotate-left"></i> CLEAR SELECTION</button><button type="button" class="is-primary" data-bay-action="apply" ${originalApply ? "" : "disabled"}><i class="fa-solid fa-hammer"></i> ${originalApply?.textContent?.trim() || "APPLY REFIT"}</button>`;
  actions.querySelector('[data-bay-action="clear"]')?.addEventListener("click", () => setSelected(root, null));
  actions.querySelector('[data-bay-action="apply"]')?.addEventListener("click", () => originalApply?.click());
  right.append(actions);

  stage.append(layout);
  const summary = root.querySelector(".arkflight-commissioning-summary");
  if (summary) summary.classList.add("arkflight-bay-original-summary");
}

function rebuildForSection(root) {
  const key = activeSection(root);
  root.classList.toggle("arkflight-shipwright-bay-active", Boolean(BAY_META[key]));
  if (BAY_META[key]) buildBay(root, key);
}

function enhance(app, html) {
  const root = rootElement(app, html);
  if (!root?.querySelector(".arkflight-commissioning-shell")) return;
  sizeLikeEvent(app, root);
  requestAnimationFrame(() => {
    rebuildForSection(root);
    for (const button of root.querySelectorAll("[data-shipwright-section]")) {
      if (button.dataset.arkflightBayListener === "true") continue;
      button.dataset.arkflightBayListener = "true";
      button.addEventListener("click", () => requestAnimationFrame(() => rebuildForSection(root)));
    }
  });
}

Hooks.on("renderActorSheet", enhance);

window.addEventListener("resize", () => {
  for (const app of Object.values(ui?.windows ?? {})) {
    const root = rootElement(app, app?.element);
    if (!root?.querySelector(".arkflight-commissioning-shell")) continue;
    delete root.dataset.arkflightBaySize;
    sizeLikeEvent(app, root);
  }
});
