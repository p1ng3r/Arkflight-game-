const MODULE_ID = "arkflight-game";

const FAMILY_META = Object.freeze({
  shipMod: { inventory: "shipMods", installed: (ship) => ship?.shipMods ?? [] },
  arkengineMod: { inventory: "arkengineMods", installed: (ship) => ship?.arkengine?.modIds ?? [] }
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

function physicalCount(ship, family, id) {
  const meta = FAMILY_META[family];
  return Math.max(0, Math.trunc(Number(ship?.inventory?.[meta?.inventory]?.[id] ?? 0)));
}

function authoritativeInstalled(ship, family, id) {
  const meta = FAMILY_META[family];
  return Boolean(meta?.installed(ship)?.includes(id));
}

function setInstalledPresentation(card, installed) {
  card.classList.toggle("is-installed", installed);
  const state = card.querySelector(".arkflight-fitting-state");
  if (state) state.textContent = installed ? "INSTALLED" : "READY TO FIT";
  if (!installed) card.disabled = false;
}

function cloneAvailableCard(source, count) {
  const clone = source.cloneNode(true);
  clone.classList.remove("is-installed", "is-located", "is-bay-selected");
  clone.disabled = false;
  clone.hidden = false;
  clone.dataset.refitInventoryQuantity = String(count);
  clone.dataset.refitPhysicalClone = "true";
  const state = clone.querySelector(".arkflight-fitting-state");
  if (state) state.textContent = "READY TO FIT";
  return clone;
}

function normalizeFamily(root, ship, family) {
  const stage = root.querySelector(`.arkflight-fitting-card[data-fitting-kind='${family}']`)?.closest(".arkflight-commission-stage");
  if (!stage) return;
  const available = stage.querySelector(".arkflight-bay-available");
  const installedList = stage.querySelector(".arkflight-bay-installed");
  if (!available || !installedList) return;

  // Remove only the synthetic physical cards created by this layer. The original
  // catalog card remains the canonical installed/display card for each component id.
  available.querySelectorAll(".arkflight-fitting-card[data-refit-physical-clone='true']").forEach((card) => card.remove());

  const originals = [...stage.querySelectorAll(".arkflight-fitting-card:not([data-refit-physical-clone='true'])")]
    .filter((card) => card.dataset.fittingKind === family);

  for (const card of originals) {
    const id = card.dataset.id;
    const installed = authoritativeInstalled(ship, family, id);
    const count = physicalCount(ship, family, id);

    // Persistent ship state, not the legacy commissioning draft, owns the right side.
    setInstalledPresentation(card, installed);
    if (installed) {
      if (card.parentElement !== installedList) installedList.append(card);
      card.hidden = false;
      card.dataset.refitInventoryQuantity = "0";
    } else {
      if (card.parentElement !== available) available.append(card);
      card.dataset.refitInventoryQuantity = String(count);
      card.hidden = count <= 0;
    }

    // Installed and owned are independent states. If another physical copy exists,
    // render a separate Available card so duplicate fittings are usable correctly.
    if (installed && count > 0) available.append(cloneAvailableCard(card, count));
  }

  // Remove the legacy empty placeholder when persistent installed fittings exist.
  const empty = installedList.querySelector(".arkflight-bay-empty-installed");
  if (empty && installedList.querySelector(".arkflight-fitting-card.is-installed")) empty.remove();
}

function resync(app, html) {
  const root = shellFrom(app, html);
  const actor = shipActor(app);
  const ship = shipPayload(actor);
  if (!root || !ship || !root.querySelector(".arkflight-commissioning-shell")) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    normalizeFamily(root, shipPayload(actor) ?? ship, "arkengineMod");
    normalizeFamily(root, shipPayload(actor) ?? ship, "shipMod");
  }));
}

Hooks.on("renderApplicationV2", resync);
Hooks.on("renderActorSheet", resync);
