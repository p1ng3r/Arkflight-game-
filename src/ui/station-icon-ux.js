import { stationPresentation } from "./station-presentation.js";

const MODULE_ID = "arkflight-game";
const STATION_ICON_BASE = `modules/${MODULE_ID}/assets/ui/stations`;
const STATION_KEYS = Object.freeze(["captain", "engineer", "navigator", "battlewatch", "watchmaster", "veilwarden"]);

function canonicalStationKey(value) {
  const key = String(value ?? "").trim().toLowerCase();
  return key === "watchmaster" ? "battlewatch" : key;
}

function stationKeyFromCard(card) {
  const explicit = canonicalStationKey(card?.dataset?.station ?? card?.dataset?.crewStation ?? null);
  if (STATION_KEYS.includes(explicit)) return explicit;
  const text = card?.textContent?.toLowerCase() ?? "";
  if (text.includes("battlewatch") || text.includes("watchmaster")) return "battlewatch";
  return ["captain", "engineer", "navigator", "veilwarden"].find((key) => text.includes(key)) ?? null;
}

function eventStationAsset(key) {
  const assetKey = canonicalStationKey(key) === "battlewatch" ? "watchmaster" : canonicalStationKey(key);
  return `${STATION_ICON_BASE}/station_icon_${assetKey}.webp`;
}

function decorateCard(card) {
  if (!card) return;
  const key = stationKeyFromCard(card);
  if (!key) return;
  const holder = card.querySelector(".arkflight-station-emblem,.arkflight-crew-station-icon");
  if (!holder) return;

  const canonical = canonicalStationKey(key);
  holder.dataset.station = canonical;
  holder.innerHTML = "";

  const image = document.createElement("img");
  image.className = "arkflight-station-icon-image";
  image.src = eventStationAsset(canonical);
  image.alt = `${stationPresentation(canonical)?.displayName ?? canonical} station`;
  image.addEventListener("error", () => {
    const fallback = stationPresentation(canonical)?.iconClass ?? "fa-solid fa-circle";
    holder.innerHTML = `<i class="${fallback}"></i>`;
  }, { once: true });

  holder.append(image);
  card.dataset.station = canonical;
  card.dataset.stationIconDecorated = "true";
}

function decorate(root) {
  for (const card of root.querySelectorAll(".arkflight-station-card,.arkflight-crew-station-card")) decorateCard(card);
}

function attach(app, html) {
  const actor = app?.actor;
  if (!actor?.flags?.[MODULE_ID]?.isArkflightShip) return;
  const candidate = html?.[0] ?? html;
  const root = candidate?.matches?.(".arkflight-ship-shell") ? candidate : candidate?.querySelector?.(".arkflight-ship-shell");
  if (!root || root.dataset.stationIconObserver === "true") return;

  decorate(root);
  const observer = new MutationObserver(() => decorate(root));
  observer.observe(root, { childList: true, subtree: true });
  root.dataset.stationIconObserver = "true";
}

Hooks.on("renderActorSheet", (app, html) => attach(app, html));
