import { SHIP_TALENTS, SHIP_TALENT_TIERS } from "../content/ship-talents.js";
import { progressionView } from "../ship/progression.js";

const MODULE_ID = "arkflight-game";

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isProgressionApp(app) {
  return app?.constructor?.name === "ArkflightShipProgressionApp" || app?.options?.id === "arkflight-ship-progression";
}
function rootElement(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function ownedTalentMarkup(ship) {
  const ids = [...new Set(ship?.progression?.talentIds ?? [])];
  const talents = ids.map((id) => SHIP_TALENTS[id]).filter(Boolean);
  const rows = talents.length
    ? talents.map((talent) => {
        const tier = SHIP_TALENT_TIERS[talent.tier]?.label ?? talent.tier;
        return `<button type="button" class="arkflight-owned-talent" data-owned-talent-id="${escapeHtml(talent.id)}" title="Open this talent in the ledger">
          <span class="arkflight-owned-talent-name">${escapeHtml(talent.name)}</span>
          <span class="arkflight-owned-talent-tier">${escapeHtml(tier)}</span>
          <strong>${Number(talent.cost || 0)} TP</strong>
        </button>`;
      }).join("")
    : `<div class="arkflight-owned-empty">No talents have been written into this vessel yet.</div>`;
  return `<section class="arkflight-preview-panel arkflight-owned-talents" data-owned-talents-panel>
    <div class="arkflight-preview-panel-title"><span>TALENTS ABOARD</span><i class="fa-solid fa-bookmark"></i></div>
    <p class="arkflight-owned-talents-note">The permanent marks this ship has earned, learned, or been rebuilt to carry.</p>
    <div class="arkflight-owned-talents-list">${rows}</div>
  </section>`;
}

function addResetToOne(root, actor, app) {
  if (!game.user.isGM) return;
  const ship = shipFlag(actor);
  const level = Number(ship?.progression?.level ?? 1);
  if (level <= 1 || root.querySelector("[data-reset-ship-to-one]")) return;
  const xp = root.querySelector("[data-ship-xp]");
  const host = xp?.querySelector(".arkflight-ship-xp-head") ?? root.querySelector(".arkflight-progression-points");
  if (!host) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-reset-to-one";
  button.dataset.resetShipToOne = "true";
  button.innerHTML = `<i class="fa-solid fa-backward-fast"></i> Reset to Level 1`;
  button.title = "GM: reset this vessel to level 1, 0 XP, and automatically refund talents the level-1 build cannot keep.";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof game.arkflight?.resetShipLevel !== "function") {
      ui.notifications?.warn("Arkflight ship level reset is not ready yet.");
      return;
    }
    await game.arkflight.resetShipLevel(actor, 1);
    app?.render?.({ force: true });
  });
  host.append(button);
}

function enhanceProgression(app, html) {
  if (!isProgressionApp(app)) return;
  const actor = app.actor;
  const root = rootElement(app, html);
  const ship = shipFlag(actor);
  if (!root || !ship) return;

  // The main ledger is a shopping surface: owned, future-tier, and currently
  // unaffordable talents are not repeated here. They live in Talents Aboard or
  // appear when the vessel actually has the level and TP to choose them.
  const view = progressionView(ship);
  for (const card of root.querySelectorAll("[data-talent-card]")) {
    const talent = view.talents.find((entry) => entry.id === card.dataset.talentCard);
    const purchasable = Boolean(talent && !talent.owned && !talent.locked && view.available >= Number(talent.cost || 0));
    card.dataset.purchaseEligible = purchasable ? "true" : "false";
  }

  const preview = root.querySelector(".arkflight-preview-sticky");
  if (preview) {
    preview.querySelector("[data-owned-talents-panel]")?.remove();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = ownedTalentMarkup(ship);
    const stationPanel = preview.querySelector(".arkflight-station-panel");
    if (stationPanel) stationPanel.before(wrapper.firstElementChild);
    else preview.append(wrapper.firstElementChild);
  }

  for (const button of root.querySelectorAll("[data-owned-talent-id]")) {
    button.addEventListener("click", () => {
      const id = button.dataset.ownedTalentId;
      const card = root.querySelector(`[data-talent-card="${CSS.escape(id)}"]`);
      if (card) {
        // Owned talents are hidden from the shopping list, but the existing app
        // still knows how to render their detailed ledger page and refund action.
        card.click();
      }
    });
  }

  addResetToOne(root, actor, app);
}

Hooks.on("renderApplicationV2", enhanceProgression);
Hooks.on("renderArkflightShipProgressionApp", enhanceProgression);
