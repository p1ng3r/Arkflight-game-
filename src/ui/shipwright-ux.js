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

function annotateFittingCard(card) {
  const item = catalogForKind(card.dataset.fittingKind)?.[card.dataset.id];
  if (!item || card.querySelector(".arkflight-benefit-block")) return;
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

export function improveShipwright(root, { defaultSection = "engine-mods", onSectionChange = null } = {}) {
  if (!root?.matches?.(".arkflight-ship-shell") || !root.querySelector(".arkflight-commissioning-shell")) return;
  for (const card of root.querySelectorAll(".arkflight-fitting-card")) annotateFittingCard(card);
  for (const grid of root.querySelectorAll(".arkflight-fitting-grid")) sortInstalledFirst(grid);

  const main = root.querySelector(".arkflight-commissioning-main");
  if (!main) return;
  const stages = [...main.querySelectorAll(".arkflight-commission-stage")];
  if (!stages.length) return;

  let nav = main.querySelector(".arkflight-shipwright-subnav");
  if (!nav) {
    nav = document.createElement("nav");
    nav.className = "arkflight-shipwright-subnav";
    for (const [key, labelText] of [["core","Core Build"],["engine-mods","Engine Mods"],["rooms","Rooms"],["ship-mods","Ship Mods"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.shipwrightSection = key;
      button.textContent = labelText;
      nav.append(button);
    }
    main.querySelector(".arkflight-panel-heading")?.insertAdjacentElement("afterend", nav);
  }

  const activate = (key) => {
    const validKey = ["core", "engine-mods", "rooms", "ship-mods"].includes(key) ? key : "engine-mods";
    root.dataset.shipwrightSection = validKey;
    for (const stage of stages) stage.hidden = stageKey(stage) !== validKey;
    for (const button of nav.querySelectorAll("button")) button.classList.toggle("is-active", button.dataset.shipwrightSection === validKey);
    onSectionChange?.(validKey);
  };

  for (const button of nav.querySelectorAll("button")) {
    button.onclick = (event) => {
      event.preventDefault();
      activate(button.dataset.shipwrightSection);
    };
  }
  activate(defaultSection);
}

export function installShipwrightUX() {
  // Compatibility fallback only. The authoritative call occurs directly from
  // ArkflightShipSheet.activateListeners(), where the rendered DOM is guaranteed.
}
