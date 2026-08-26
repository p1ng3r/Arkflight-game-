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

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function effectLabel(effect) {
  const label = STAT_LABELS[effect?.target] ?? titleCase(effect?.target);
  if (effect?.mode === "set") return `${label} = ${effect.value}`;
  const value = Number(effect?.value ?? 0);
  const sign = value >= 0 ? "+" : "";
  return `${label} ${sign}${value}`;
}

function mechanicalBenefits(item) {
  const benefits = [];
  for (const effect of item?.effects ?? []) benefits.push(effectLabel(effect));
  for (const capability of item?.capabilities ?? []) benefits.push(`Capability: ${titleCase(capability)}`);
  for (const signature of item?.unlocks?.signatures ?? []) benefits.push(`Mastery: ${titleCase(signature)}`);
  for (const action of item?.unlocks?.actions ?? []) benefits.push(`Action: ${titleCase(action)}`);
  return benefits;
}

function catalogForKind(kind) {
  if (kind === "arkengineMod") return SHIP_CATALOGS.arkengineMods;
  if (kind === "room") return SHIP_CATALOGS.rooms;
  if (kind === "shipMod") return SHIP_CATALOGS.shipMods;
  return null;
}

function annotateFittingCard(card) {
  const kind = card.dataset.fittingKind;
  const id = card.dataset.id;
  const item = catalogForKind(kind)?.[id];
  if (!item || card.querySelector(".arkflight-benefit-block")) return;

  const benefits = mechanicalBenefits(item);
  const block = document.createElement("div");
  block.className = `arkflight-benefit-block ${benefits.length ? "has-benefit" : "is-hook-only"}`;

  if (benefits.length) {
    const label = document.createElement("span");
    label.className = "arkflight-benefit-label";
    label.textContent = "MECHANICAL BENEFIT";
    block.append(label);
    for (const benefit of benefits) {
      const line = document.createElement("strong");
      line.textContent = benefit;
      block.append(line);
    }
  } else {
    const label = document.createElement("span");
    label.className = "arkflight-benefit-label";
    label.textContent = "SYSTEM HOOK";
    const line = document.createElement("strong");
    line.textContent = "No direct stat modifier yet";
    block.append(label, line);
  }

  card.append(block);
}

function sortInstalledFirst(grid) {
  const cards = [...grid.querySelectorAll(":scope > .arkflight-fitting-card")];
  cards.sort((a, b) => {
    const ai = a.classList.contains("is-installed") ? 0 : 1;
    const bi = b.classList.contains("is-installed") ? 0 : 1;
    if (ai !== bi) return ai - bi;
    const an = a.querySelector("strong")?.textContent ?? "";
    const bn = b.querySelector("strong")?.textContent ?? "";
    return an.localeCompare(bn);
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

function addShipwrightNavigation(root) {
  const main = root.querySelector(".arkflight-commissioning-main");
  if (!main || main.querySelector(".arkflight-shipwright-subnav")) return;

  const stages = [...main.querySelectorAll(".arkflight-commission-stage")];
  if (!stages.length) return;

  const nav = document.createElement("nav");
  nav.className = "arkflight-shipwright-subnav";
  const entries = [
    ["core", "Core Build"],
    ["engine-mods", "Engine Mods"],
    ["rooms", "Rooms"],
    ["ship-mods", "Ship Mods"]
  ];

  const activate = (key) => {
    root.dataset.shipwrightSection = key;
    for (const stage of stages) {
      const section = stageKey(stage);
      stage.hidden = section !== key;
    }
    for (const button of nav.querySelectorAll("button")) button.classList.toggle("is-active", button.dataset.shipwrightSection === key);
    main.scrollTo?.({ top: 0, behavior: "instant" });
  };

  for (const [key, label] of entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.shipwrightSection = key;
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      activate(key);
    });
    nav.append(button);
  }

  main.querySelector(".arkflight-panel-heading")?.insertAdjacentElement("afterend", nav);
  activate(root.dataset.shipwrightSection || "engine-mods");
}

function improveShipwright(root) {
  if (!root?.matches?.(".arkflight-ship-shell") || !root.querySelector(".arkflight-commissioning-shell")) return;

  for (const card of root.querySelectorAll(".arkflight-fitting-card")) annotateFittingCard(card);
  for (const grid of root.querySelectorAll(".arkflight-fitting-grid")) sortInstalledFirst(grid);
  addShipwrightNavigation(root);
}

export function installShipwrightUX() {
  Hooks.on("renderArkflightShipSheet", (_app, html) => {
    const root = html?.[0]?.querySelector?.(".arkflight-ship-shell") ?? html?.querySelector?.(".arkflight-ship-shell") ?? null;
    improveShipwright(root);
  });

  Hooks.on("renderActorSheet", (_app, html) => {
    const root = html?.[0]?.querySelector?.(".arkflight-ship-shell") ?? html?.querySelector?.(".arkflight-ship-shell") ?? null;
    improveShipwright(root);
  });
}
