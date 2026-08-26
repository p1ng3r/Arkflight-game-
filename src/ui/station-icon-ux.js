const MODULE_ID = "arkflight-game";
const STATION_ICON_BASE = "/modules/arcflight/assets/ui/stations";
const STATION_KEYS = Object.freeze({
  captain: "captain",
  engineer: "engineer",
  navigator: "navigator",
  watchmaster: "watchmaster",
  veilwarden: "veilwarden"
});

function stationKeyFromCard(card) {
  const text = card?.textContent?.toLowerCase() ?? "";
  for (const key of Object.keys(STATION_KEYS)) {
    if (text.includes(key)) return key;
  }
  return null;
}

function decorateCard(card) {
  if (!card || card.dataset.stationIconDecorated === "true") return;
  const key = stationKeyFromCard(card);
  if (!key) return;
  const holder = card.querySelector(".arkflight-station-emblem,.arkflight-crew-station-icon");
  if (!holder) return;

  holder.dataset.station = key;
  holder.innerHTML = "";
  const image = document.createElement("img");
  image.className = "arkflight-station-icon-image";
  image.src = `${STATION_ICON_BASE}/${key}_icon.webp`;
  image.alt = `${key} station`;
  image.addEventListener("error", () => {
    holder.innerHTML = '<i class="fa-solid fa-compass-drafting"></i>';
  }, { once: true });
  holder.append(image);
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
