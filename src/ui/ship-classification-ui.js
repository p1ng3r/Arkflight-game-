const MODULE_ID = "arkflight-game";

function gmOperationsElement(app) {
  return app?.element?.querySelector?.(".arkflight-gm-shell") ? app.element : document.querySelector("#arkflight-gm-operations");
}

function classificationLabel(entry) {
  return entry?.player ? "Player" : "NPC";
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
}

async function chooseReplacementCurrent(excludingActorId) {
  const ships = game.arkflight?.ships?.list?.() ?? [];
  const candidates = ships.filter((entry) => entry.player && entry.id !== excludingActorId);
  if (!candidates.length) {
    ui.notifications?.warn("Another Player Ship must exist before the Current Player Ship can be reclassified as NPC.");
    return null;
  }

  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const choices = candidates.map((entry) => `<option value="${entry.id}">${foundry.utils.escapeHTML(entry.name)}</option>`).join("");
    const content = `
      <div class="arkflight-gm-current-replacement">
        <p>This ship is the Current Player Ship. Choose the Player Ship that should replace it before changing its classification.</p>
        <label><span>New Current Player Ship</span><select data-replacement-current>${choices}</select></label>
      </div>`;
    new DialogV2({
      window: { title: "Choose Current Player Ship" },
      content,
      buttons: [
        { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => resolve(null) },
        {
          action: "continue",
          label: "Continue",
          icon: "fa-solid fa-arrow-right",
          default: true,
          callback: (_event, button) => resolve(button.form?.querySelector?.("[data-replacement-current]")?.value ?? candidates[0].id)
        }
      ],
      close: () => resolve(null)
    }).render({ force: true });
  });
}

async function applyClassification(app, actorId, classification, select) {
  const ships = game.arkflight?.ships;
  const entry = ships?.get?.(actorId);
  if (!entry) return;

  const resolvesPlayer = classification === "player" || (classification === "auto" && Boolean(entry.actor?.hasPlayerOwner));
  let replacementId = null;
  if (entry.current && !resolvesPlayer) {
    replacementId = await chooseReplacementCurrent(actorId);
    if (!replacementId) {
      select.value = entry.classification ?? "auto";
      return;
    }
  }

  select.disabled = true;
  try {
    await ships.setClassification(actorId, classification);
    if (replacementId) await ships.setCurrent(replacementId);
    app?.render?.({ force: true });
  } catch (error) {
    console.error("Arkflight | Unable to change ship classification", error);
    ui.notifications?.error(error?.message ?? "Unable to change Arkflight ship classification.");
    select.value = entry.classification ?? "auto";
  } finally {
    select.disabled = false;
  }
}

function decorateRoster(root, ships) {
  for (const row of root.querySelectorAll("[data-roster-ship-id]")) {
    const entry = ships.get(row.dataset.rosterShipId);
    if (!entry || entry.classification === "auto") continue;
    if (row.querySelector(".arkflight-gm-classification-override-badge")) continue;
    const badge = document.createElement("span");
    badge.className = "arkflight-gm-classification-override-badge";
    badge.textContent = `${classificationLabel(entry)} · OVERRIDE`;
    row.querySelector(".arkflight-gm-ship-row-main")?.append(badge);
  }
}

function decorateSelected(app, root, ships) {
  const actorId = app?.selectedRosterShipId;
  const entry = actorId ? ships.get(actorId) : null;
  if (!entry) return;

  const titleLine = root.querySelector(".arkflight-gm-ship-title-line");
  if (titleLine && entry.classification !== "auto" && !titleLine.querySelector(".arkflight-gm-classification-override-badge")) {
    const badge = document.createElement("span");
    badge.className = "arkflight-gm-classification-override-badge prominent";
    badge.textContent = `${classificationLabel(entry)} · OVERRIDE`;
    titleLine.append(badge);
  }

  const actions = root.querySelector(".arkflight-gm-ship-actions");
  if (!actions || actions.querySelector("[data-ship-classification-manage]")) return;

  const details = document.createElement("details");
  details.className = "arkflight-gm-ship-classification-manage";
  details.dataset.shipClassificationManage = "true";
  details.innerHTML = `
    <summary><i class="fa-solid fa-ellipsis"></i> Manage</summary>
    <div class="arkflight-gm-ship-classification-menu">
      <label>
        <span>Classification</span>
        <select data-ship-classification data-actor-id="${entry.id}">
          ${option("auto", "Auto (Foundry ownership)", entry.classification === "auto")}
          ${option("player", "Player Ship", entry.classification === "player")}
          ${option("npc", "NPC Ship", entry.classification === "npc")}
        </select>
      </label>
      <small>Auto follows Foundry ownership. Overrides are GM-only.</small>
    </div>`;
  actions.append(details);

  details.querySelector("[data-ship-classification]")?.addEventListener("change", (event) => {
    applyClassification(app, entry.id, event.currentTarget.value, event.currentTarget);
  });
}

function decorate(app) {
  if (!game.user?.isGM) return;
  const ships = game.arkflight?.ships;
  if (!ships?.get || !ships?.list) return;
  const root = gmOperationsElement(app);
  if (!root) return;
  decorateRoster(root, ships);
  decorateSelected(app, root, ships);
}

export function installShipClassificationUI() {
  Hooks.on("renderArkflightGMOperations", (app) => decorate(app));
  Hooks.on("renderApplicationV2", (app) => {
    if (app?.constructor?.name === "ArkflightGMOperations") decorate(app);
  });
}

Hooks.once("init", installShipClassificationUI);
