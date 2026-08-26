import { stationPresentation } from "./station-presentation.js";

const MODULE_ID = "arkflight-game";
const STATION_KEYS = Object.freeze([
  "captain",
  "engineer",
  "navigator",
  "watchmaster",
  "veilwarden"
]);

function stationKeyFromCard(card) {
  const text = card?.textContent?.toLowerCase() ?? "";
  return STATION_KEYS.find((key) => text.includes(key)) ?? null;
}

function decorateCard(card) {
  if (!card) return;
  const key = stationKeyFromCard(card);
  if (!key) return;
  const holder = card.querySelector(".arkflight-station-emblem,.arkflight-crew-station-icon");
  if (!holder) return;
  const presentation = stationPresentation(key);
  if (!presentation?.iconClass) return;

  holder.dataset.station = key;
  holder.innerHTML = `<i class="${presentation.iconClass}" aria-hidden="true"></i>`;
  holder.title = `${presentation.displayName} station`;
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
