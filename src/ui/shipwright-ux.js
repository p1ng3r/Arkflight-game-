import { SHIP_CATALOGS } from "../content/index.js";

const STAT_LABELS = Object.freeze({
  armorClass: "Armor",
  hullIntegrity: "Hull",
  lifeveilCapacity: "Lifeveil",
  strainCapacity: "Strain Capacity",
  cargoCapacity: "Cargo Capacity",
  detection: "Detection",
  combatSpeed: "Combat Speed",
  maneuverability: "Maneuver",
  roomCapacity: "Room Capacity",
  shipModCapacity: "Ship Mod Capacity",
  arkengineModCapacity: "Arkengine Mod Capacity",
  arkengineFuelSlots: "Fuel Slots",
  hardBurnStrainCost: "Hard Burn Strain Cost",
  voyageSpeedTravelHexDays: "Travel Hex Days"
});

const SHIPWRIGHT_TABS = Object.freeze([
  { key: "core", label: "Core Build", icon: "fa-ship" },
  { key: "engine-mods", label: "Engine Mods", icon: "fa-gears" },
  { key: "rooms", label: "Rooms", icon: "fa-door-open" },
  { key: "ship-mods", label: "Ship Mods", icon: "fa-screwdriver-wrench" }
]);

const FITTING_META = Object.freeze({
  "engine-mods": { kind: "arkengineMod", label: "ARKENGINE FITTING RACK", empty: "OPEN ENGINE SOCKET", icon: "fa-gears" },
  rooms: { kind: "room", label: "VESSEL SPACE PLAN", empty: "OPEN ROOM BAY", icon: "fa-door-open" },
  "ship-mods": { kind: "shipMod", label: "SHIP MOD HARDPOINTS", empty: "OPEN MOD SOCKET", icon: "fa-screwdriver-wrench" }
});

function titleCase(value) {
  return String(value ?? "").replace(/[-_.]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function effectLabel(effect) {
  const label = STAT_LABELS[effect?.target] ?? titleCase(effect?.target);
  if (effect?.mode === "set") return `${label} = ${effect.value}`;
  const value = Number(effect?.value ?? 0);
  return `${label} ${value >= 0 ? "+" : ""}${value}`;
}

function mechanicalBenefits(item) {
  const benefits = [];
  for (const effect of item?.effects ?? []) benefits.push(effectLabel(effect));
  for (const capability of item?.capabilities ?? []) benefits.push(`Capability: ${titleCase(capability)}`);
  for (const signature of item?.unlocks?.signatures ?? []) benefits.push(`Signature: ${titleCase(signature)}`);
  for (const action of item?.unlocks?.actions ?? []) benefits.push(`Action: ${titleCase(action)}`);
  return benefits;
}

function catalogForKind(kind) {
  if (kind === "arkengineMod") return SHIP_CATALOGS.arkengineMods;
  if (kind === "room") return SHIP_CATALOGS.rooms;
  if (kind === "shipMod") return SHIP_CATALOGS.shipMods;
  return null;
}

function fittingCost(card) {
  const item = catalogForKind(card?.dataset?.fittingKind)?.[card?.dataset?.id];
  return Math.max(1, Math.trunc(Number(item?.capacityCost ?? 1) || 1));
}

function annotateFittingCard(card) {
  const item = catalogForKind(card.dataset.fittingKind)?.[card.dataset.id];
  if (!item) return;
  card.draggable = !card.disabled;
  card.dataset.arkflightFitting = "true";
  card.title = card.disabled
    ? "This fitting cannot be installed with the current staged build."
    : `${card.classList.contains("is-installed") ? "Installed — drag to the workbench to remove" : "Drag into an open socket to install"}. Click still works.`;

  if (!card.querySelector(".arkflight-drag-grip")) {
    const grip = document.createElement("span");
    grip.className = "arkflight-drag-grip";
    grip.setAttribute("aria-hidden", "true");
    grip.innerHTML = `<i class="fa-solid fa-grip-vertical"></i>`;
    card.prepend(grip);
  }

  if (card.querySelector(".arkflight-benefit-block")) return;
  const benefits = mechanicalBenefits(item);
  const block = document.createElement("div");
  block.className = `arkflight-benefit-block ${benefits.length ? "has-benefit" : "is-hook-only"}`;
  const label = document.createElement("span");
  label.className = "arkflight-benefit-label";
  label.textContent = benefits.length ? "MECHANICAL BENEFIT" : "SYSTEM HOOK";
  block.append(label);
  if (benefits.length) {
    for (const benefit of benefits) {
      const line = document.createElement("strong");
      line.textContent = benefit;
      block.append(line);
    }
  } else {
    const line = document.createElement("strong");
    line.textContent = "No direct stat modifier yet";
    block.append(line);
  }
  card.append(block);
}

function sortInstalledFirst(grid) {
  const cards = [...grid.querySelectorAll(":scope > .arkflight-fitting-card")];
  cards.sort((a, b) => {
    const installedOrder = Number(!a.classList.contains("is-installed")) - Number(!b.classList.contains("is-installed"));
    if (installedOrder) return installedOrder;
    return (a.querySelector("strong")?.textContent ?? "").localeCompare(b.querySelector("strong")?.textContent ?? "");
  });
  for (const card of cards) grid.append(card);
}

function stageKey(stage) {
  const heading = stage.querySelector(".arkflight-stage-heading h3")?.textContent?.trim();
  if (["Hull Chassis", "Hull Pattern", "Arkengine", "Arkengine Pattern"].includes(heading)) return "core";
  if (heading === "Arkengine Mods") return "engine-mods";
  if (heading === "Rooms") return "rooms";
  if (heading === "Ship Mods") return "ship-mods";
  return null;
}

function buildTabNav(main) {
  let nav = main.querySelector(".arkflight-shipwright-subnav");
  if (nav) return nav;

  nav = document.createElement("nav");
  nav.className = "arkflight-shipwright-subnav";
  nav.setAttribute("role", "tablist");
  nav.setAttribute("aria-label", "Shipwright sections");

  for (const tab of SHIPWRIGHT_TABS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.shipwrightSection = tab.key;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.innerHTML = `<i class="fa-solid ${tab.icon}"></i><span>${tab.label}</span>`;
    nav.append(button);
  }

  main.querySelector(".arkflight-panel-heading")?.insertAdjacentElement("afterend", nav);
  return nav;
}

function parseCapacity(stage) {
  const text = stage.querySelector(".arkflight-capacity-meter strong")?.textContent ?? "";
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { used: Number(match[1]), max: Number(match[2]) };
}

function dragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer?.getData("application/x-arkflight-fitting") || "null");
  } catch {
    return null;
  }
}

function playWorkshopCue({ installing = true } = {}) {
  // If a bundled recording is added later, set CONFIG.ARKFLIGHT.installSound
  // to its module-relative path. The procedural cue keeps the interaction
  // tactile without depending on a remote audio host.
  const src = globalThis.CONFIG?.ARKFLIGHT?.installSound;
  if (src) {
    try {
      const audio = new Audio(src);
      audio.volume = 0.42;
      audio.playbackRate = installing ? 0.96 : 0.84;
      void audio.play().catch(() => {});
      return;
    } catch { /* fall through to synthesized workshop clunk */ }
  }

  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = playWorkshopCue._context ??= new AudioContextClass();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    master.connect(context.destination);

    const low = context.createOscillator();
    low.type = "triangle";
    low.frequency.setValueAtTime(installing ? 86 : 72, now);
    low.frequency.exponentialRampToValueAtTime(48, now + 0.25);
    low.connect(master);
    low.start(now);
    low.stop(now + 0.36);

    const clang = context.createOscillator();
    clang.type = "square";
    clang.frequency.setValueAtTime(installing ? 410 : 280, now + 0.018);
    clang.frequency.exponentialRampToValueAtTime(120, now + 0.13);
    const clangGain = context.createGain();
    clangGain.gain.setValueAtTime(0.0001, now);
    clangGain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
    clangGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    clang.connect(clangGain);
    clangGain.connect(context.destination);
    clang.start(now + 0.015);
    clang.stop(now + 0.16);
  } catch { /* audio feedback is enhancement-only */ }
}

function installViaCard(card) {
  if (!card || card.disabled) return false;
  delete card.dataset.arkflightDraggedUntil;
  card.click();
  return true;
}

function makeSlotDock(stage, key) {
  const meta = FITTING_META[key];
  const grid = stage.querySelector(".arkflight-fitting-grid");
  const capacity = parseCapacity(stage);
  if (!meta || !grid || !capacity || capacity.max <= 0) return;

  stage.querySelector(".arkflight-fitting-dock")?.remove();
  const dock = document.createElement("section");
  dock.className = "arkflight-fitting-dock";
  dock.dataset.fittingDock = key;
  dock.innerHTML = `<div class="arkflight-fitting-dock-head"><div><span>SHIPWRIGHT'S BENCH</span><strong>${meta.label}</strong></div><small>Drag a fitting into an open socket. Click-to-install remains available.</small></div>`;

  const sockets = document.createElement("div");
  sockets.className = "arkflight-fitting-sockets";
  sockets.setAttribute("aria-label", meta.label);
  const installed = [...grid.querySelectorAll(".arkflight-fitting-card.is-installed")];
  const occupied = [];
  for (const card of installed) {
    for (let i = 0; i < fittingCost(card); i += 1) occupied.push({ card, continuation: i > 0 });
  }

  for (let index = 0; index < capacity.max; index += 1) {
    const entry = occupied[index] ?? null;
    const socket = document.createElement("button");
    socket.type = "button";
    socket.className = `arkflight-fitting-socket ${entry ? "is-occupied" : "is-empty"}`;
    socket.dataset.socketIndex = String(index);
    if (entry) {
      const name = entry.card.querySelector(":scope > strong")?.textContent?.trim() || "Installed fitting";
      socket.innerHTML = `<i class="fa-solid ${meta.icon}"></i><span>${entry.continuation ? "LINKED SOCKET" : name}</span><small>${entry.continuation ? "reserved by multi-slot fitting" : "installed"}</small>`;
      socket.title = `${name} — click to locate this fitting; drag the fitting itself to the workbench to remove it.`;
      socket.addEventListener("click", () => {
        entry.card.scrollIntoView({ behavior: "smooth", block: "center" });
        entry.card.classList.add("is-located");
        globalThis.setTimeout(() => entry.card.classList.remove("is-located"), 850);
      });
    } else {
      socket.innerHTML = `<i class="fa-solid fa-plus"></i><span>${meta.empty}</span><small>drop fitting here</small>`;
      socket.setAttribute("aria-label", `${meta.empty} ${index + 1}`);
      socket.addEventListener("dragover", (event) => {
        const payload = dragPayload(event);
        if (payload?.kind !== meta.kind || payload.installed) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        socket.classList.add("is-drag-over");
      });
      socket.addEventListener("dragleave", () => socket.classList.remove("is-drag-over"));
      socket.addEventListener("drop", (event) => {
        event.preventDefault();
        socket.classList.remove("is-drag-over");
        const payload = dragPayload(event);
        if (!payload || payload.kind !== meta.kind || payload.installed) return;
        const card = grid.querySelector(`.arkflight-fitting-card[data-id="${CSS.escape(payload.id)}"]`);
        installViaCard(card);
      });
    }
    sockets.append(socket);
  }
  dock.append(sockets);

  const remove = document.createElement("div");
  remove.className = "arkflight-fitting-remove";
  remove.tabIndex = 0;
  remove.innerHTML = `<i class="fa-solid fa-hammer"></i><div><strong>RETURN TO WORKBENCH</strong><span>Drag an installed fitting here to remove it from the staged build.</span></div>`;
  remove.addEventListener("dragover", (event) => {
    const payload = dragPayload(event);
    if (payload?.kind !== meta.kind || !payload.installed) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    remove.classList.add("is-drag-over");
  });
  remove.addEventListener("dragleave", () => remove.classList.remove("is-drag-over"));
  remove.addEventListener("drop", (event) => {
    event.preventDefault();
    remove.classList.remove("is-drag-over");
    const payload = dragPayload(event);
    if (!payload || payload.kind !== meta.kind || !payload.installed) return;
    const card = grid.querySelector(`.arkflight-fitting-card[data-id="${CSS.escape(payload.id)}"]`);
    installViaCard(card);
  });
  dock.append(remove);

  grid.before(dock);
}

function wireDragAndDrop(root, stages) {
  if (root.dataset.arkflightDragWired === "true") return;
  root.dataset.arkflightDragWired = "true";

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-arkflight-fitting='true']");
    if (!card || card.disabled || !event.dataTransfer) return;
    const payload = {
      kind: card.dataset.fittingKind,
      id: card.dataset.id,
      installed: card.classList.contains("is-installed"),
      cost: fittingCost(card)
    };
    card.dataset.arkflightDraggedUntil = String(Date.now() + 350);
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = payload.installed ? "move" : "copy";
    event.dataTransfer.setData("application/x-arkflight-fitting", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", `${payload.kind}:${payload.id}`);
  });

  root.addEventListener("dragend", (event) => {
    event.target.closest?.(".arkflight-fitting-card")?.classList.remove("is-dragging");
    for (const target of root.querySelectorAll(".is-drag-over")) target.classList.remove("is-drag-over");
  });

  // A drag can generate a trailing click in some embedded Chromium builds.
  // Suppress only that accidental click; ordinary click-to-install remains intact.
  root.addEventListener("click", (event) => {
    const card = event.target.closest?.(".arkflight-fitting-card[data-arkflight-fitting='true']");
    if (!card) return;
    const until = Number(card.dataset.arkflightDraggedUntil || 0);
    if (until > Date.now()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      delete card.dataset.arkflightDraggedUntil;
      return;
    }
    playWorkshopCue({ installing: !card.classList.contains("is-installed") });
  }, true);

  for (const stage of stages) {
    const key = stageKey(stage);
    if (FITTING_META[key]) makeSlotDock(stage, key);
  }
}

export function improveShipwright(root, { defaultSection = "core", onSectionChange = null } = {}) {
  if (!root?.matches?.(".arkflight-ship-shell") || !root.querySelector(".arkflight-commissioning-shell")) return;

  for (const card of root.querySelectorAll(".arkflight-fitting-card")) annotateFittingCard(card);
  for (const grid of root.querySelectorAll(".arkflight-fitting-grid")) sortInstalledFirst(grid);

  const main = root.querySelector(".arkflight-commissioning-main");
  if (!main) return;
  const stages = [...main.querySelectorAll(".arkflight-commission-stage")];
  if (!stages.length) return;

  const nav = buildTabNav(main);
  const validKeys = SHIPWRIGHT_TABS.map((tab) => tab.key);

  for (const stage of stages) {
    const key = stageKey(stage);
    if (!key) continue;
    stage.dataset.shipwrightPanel = key;
    stage.setAttribute("role", "tabpanel");
  }

  wireDragAndDrop(root, stages);

  const activate = (key, { focus = false } = {}) => {
    const validKey = validKeys.includes(key) ? key : "core";
    root.dataset.shipwrightSection = validKey;

    for (const stage of stages) {
      const visible = stageKey(stage) === validKey;
      stage.hidden = !visible;
      stage.setAttribute("aria-hidden", visible ? "false" : "true");
    }

    for (const button of nav.querySelectorAll("[data-shipwright-section]")) {
      const active = button.dataset.shipwrightSection === validKey;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    }

    onSectionChange?.(validKey);
    main.scrollTop = 0;
  };

  for (const button of nav.querySelectorAll("[data-shipwright-section]")) {
    button.onclick = (event) => {
      event.preventDefault();
      activate(button.dataset.shipwrightSection);
    };

    button.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const current = validKeys.indexOf(button.dataset.shipwrightSection);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = validKeys[(current + delta + validKeys.length) % validKeys.length];
      activate(next, { focus: true });
    };
  }

  activate(defaultSection);
}

export function installShipwrightUX() {
  // Compatibility fallback only. The authoritative call occurs directly from
  // ArkflightShipSheet.activateListeners(), where the rendered DOM is guaranteed.
}
