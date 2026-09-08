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

function chip(label, className = "") {
  return `<span class="arkflight-talent-requirement-chip ${className}">${escapeHtml(label)}</span>`;
}

function talentMetaMarkup(talent) {
  const parts = [
    chip(`LEVEL ${talent.requiredLevel}`, "is-level"),
    chip(String(talent.tierLabel ?? talent.tier).toUpperCase(), "is-tier"),
    chip(`${Number(talent.cost || 0)} TP`, "is-cost")
  ];
  if (talent.upgradeOfName) parts.push(chip(`UPGRADES ${talent.upgradeOfName}`, "is-upgrade"));
  if (talent.prerequisiteNames?.length) parts.push(chip(`REQUIRES ${talent.prerequisiteNames.join(" + ")}`, "is-prerequisite"));
  if (talent.prerequisiteAnyOfNames?.length) parts.push(chip(`REQUIRES ONE OF ${talent.prerequisiteAnyOfNames.join(" / ")}`, "is-prerequisite"));
  return `<div class="arkflight-talent-progression-meta">${parts.join("")}</div>`;
}

function lockReasonMarkup(talent) {
  if (talent.owned || talent.canPurchase) return "";
  const reasons = talent.lockReasons ?? [];
  if (!reasons.length) return "";
  return `<div class="arkflight-talent-lock-reasons">${reasons.map((reason) => `<span><i class="fa-solid fa-lock"></i>${escapeHtml(reason.label)}</span>`).join("")}</div>`;
}

function ownedTalentMarkup(view) {
  const talents = view.talents.filter((talent) => talent.owned);
  const rows = talents.length
    ? talents.sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name)).map((talent) => {
        const tier = SHIP_TALENT_TIERS[talent.tier]?.label ?? talent.tier;
        return `<button type="button" class="arkflight-owned-talent" data-owned-talent-id="${escapeHtml(talent.id)}" title="Open this talent in the ledger">
          <span class="arkflight-owned-talent-name">${escapeHtml(talent.name)}</span>
          <span class="arkflight-owned-talent-level">L${talent.requiredLevel}</span>
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

function addProgressionSummary(root, view) {
  root.querySelector("[data-talent-progression-summary]")?.remove();
  const points = root.querySelector(".arkflight-progression-points");
  if (points) {
    const summary = document.createElement("div");
    summary.className = "arkflight-talent-point-breakdown";
    summary.dataset.talentProgressionSummary = "true";
    summary.innerHTML = `<span><small>TOTAL</small><strong>${view.budget}</strong></span><span><small>SPENT</small><strong>${view.spent}</strong></span><span><small>AVAILABLE</small><strong>${view.available}</strong></span>`;
    points.append(summary);
  }

  root.querySelector("[data-next-progression-milestone]")?.remove();
  const title = root.querySelector(".arkflight-progression-title-block");
  if (title && view.nextMilestone) {
    const milestone = document.createElement("div");
    milestone.className = "arkflight-next-progression-milestone";
    milestone.dataset.nextProgressionMilestone = "true";
    milestone.innerHTML = view.nextMilestone.complete
      ? `<i class="fa-solid fa-crown"></i><span><small>MILESTONE</small><strong>${escapeHtml(view.nextMilestone.label)}</strong></span>`
      : `<i class="fa-solid fa-flag-checkered"></i><span><small>NEXT MILESTONE</small><strong>LEVEL ${view.nextMilestone.level} — ${escapeHtml(view.nextMilestone.label)}</strong></span>`;
    title.append(milestone);
  }
}

function enhanceTalentCard(card, talent) {
  if (!talent) return;
  card.dataset.purchaseEligible = talent.canPurchase ? "true" : "false";
  card.dataset.requiredLevel = String(talent.requiredLevel);
  card.dataset.progressionState = talent.owned ? "owned" : talent.canPurchase ? "available" : "locked";
  card.classList.toggle("is-progression-locked", !talent.owned && !talent.canPurchase);

  const copy = card.querySelector(".arkflight-talent-copy");
  if (copy) {
    copy.querySelector(".arkflight-talent-progression-meta")?.remove();
    copy.querySelector(".arkflight-talent-lock-reasons")?.remove();
    const title = copy.querySelector(".arkflight-talent-title");
    const meta = document.createElement("div");
    meta.innerHTML = talentMetaMarkup(talent);
    const metaElement = meta.firstElementChild;
    if (title) title.after(metaElement); else copy.prepend(metaElement);
    const locks = lockReasonMarkup(talent);
    if (locks) {
      const holder = document.createElement("div");
      holder.innerHTML = locks;
      copy.append(holder.firstElementChild);
    }
  }

  const buy = card.querySelector("[data-buy-talent]");
  if (buy && !talent.owned) {
    buy.disabled = !talent.canPurchase;
    const firstReason = talent.lockReasons?.[0];
    if (talent.canPurchase) {
      buy.innerHTML = `<i class="fa-solid fa-hammer"></i> BUY — ${Number(talent.cost || 0)} TP`;
      buy.title = `Purchase ${talent.name} for ${Number(talent.cost || 0)} Talent Point${Number(talent.cost || 0) === 1 ? "" : "s"}.`;
    } else if (firstReason?.code === "tp") {
      buy.innerHTML = `<i class="fa-solid fa-coins"></i> NEED TP`;
      buy.title = firstReason.label;
    } else {
      buy.innerHTML = `<i class="fa-solid fa-lock"></i> LOCKED`;
      buy.title = (talent.lockReasons ?? []).map((reason) => reason.label).join(" · ");
    }
  }
}

function refreshLevelGroupVisibility(root) {
  for (const group of root.querySelectorAll("[data-talent-level-group]")) {
    const cards = [...group.querySelectorAll("[data-talent-card]")];
    group.hidden = cards.length > 0 && cards.every((card) => card.hidden);
  }
}

function groupTalentsByLevel(root, view) {
  for (const section of root.querySelectorAll("[data-tier-section]")) {
    const grid = section.querySelector(".arkflight-talent-grid");
    if (!grid) continue;
    const cards = [...grid.querySelectorAll(":scope > [data-talent-card], :scope > [data-talent-level-group] [data-talent-card]")];
    if (!cards.length) continue;

    const byId = new Map(view.talents.map((talent) => [talent.id, talent]));
    cards.sort((a, b) => {
      const left = byId.get(a.dataset.talentCard);
      const right = byId.get(b.dataset.talentCard);
      return Number(left?.requiredLevel ?? 99) - Number(right?.requiredLevel ?? 99)
        || String(left?.name ?? "").localeCompare(String(right?.name ?? ""));
    });

    grid.replaceChildren();
    let currentLevel = null;
    let group = null;
    let cardHost = null;
    for (const card of cards) {
      const talent = byId.get(card.dataset.talentCard);
      const level = Number(talent?.requiredLevel ?? 1);
      if (level !== currentLevel) {
        currentLevel = level;
        group = document.createElement("section");
        group.className = "arkflight-talent-level-group";
        group.dataset.talentLevelGroup = String(level);
        group.innerHTML = `<div class="arkflight-talent-level-heading"><span>LEVEL ${level}</span><small>${level <= view.level ? "UNLOCKED FOR THIS VESSEL" : `REACH SHIP LEVEL ${level}`}</small></div><div class="arkflight-talent-level-cards"></div>`;
        grid.append(group);
        cardHost = group.querySelector(".arkflight-talent-level-cards");
      }
      cardHost.append(card);
    }
  }
  refreshLevelGroupVisibility(root);
}

function enhanceSelection(root, app, view) {
  const selectedId = app?.selectedTalentId;
  const talent = view.talents.find((entry) => entry.id === selectedId);
  const footer = root.querySelector(".arkflight-selected-talent");
  if (!footer || !talent) return;

  footer.querySelector("[data-selected-talent-progression]")?.remove();
  const copy = footer.querySelector(".arkflight-selected-copy");
  if (copy) {
    const panel = document.createElement("div");
    panel.dataset.selectedTalentProgression = "true";
    panel.className = "arkflight-selected-talent-progression";
    panel.innerHTML = `${talentMetaMarkup(talent)}${lockReasonMarkup(talent)}`;
    const title = copy.querySelector(".arkflight-selected-title");
    if (title) title.after(panel); else copy.append(panel);
  }

  const purchase = footer.querySelector(".arkflight-purchase-talent");
  if (purchase && !talent.owned) {
    purchase.disabled = !talent.canPurchase;
    if (talent.canPurchase) {
      purchase.innerHTML = `<i class="fa-solid fa-hammer"></i> Make It Hers — ${Number(talent.cost || 0)} TP`;
      purchase.title = "All level, prerequisite, and Talent Point requirements are met.";
    } else {
      purchase.innerHTML = `<i class="fa-solid fa-lock"></i> Locked`;
      purchase.title = (talent.lockReasons ?? []).map((reason) => reason.label).join(" · ");
    }
  }
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

function watchFilters(root) {
  const board = root.querySelector(".arkflight-talent-board");
  if (!board || board.dataset.levelVisibilityWatch === "true") return;
  board.dataset.levelVisibilityWatch = "true";
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "hidden")) refreshLevelGroupVisibility(root);
  });
  observer.observe(board, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
}

function enhanceProgression(app, html) {
  if (!isProgressionApp(app)) return;
  const actor = app.actor;
  const root = rootElement(app, html);
  const ship = shipFlag(actor);
  if (!root || !ship) return;

  const view = progressionView(ship);
  addProgressionSummary(root, view);

  for (const card of root.querySelectorAll("[data-talent-card]")) {
    const talent = view.talents.find((entry) => entry.id === card.dataset.talentCard);
    enhanceTalentCard(card, talent);
  }
  groupTalentsByLevel(root, view);
  watchFilters(root);
  enhanceSelection(root, app, view);

  const preview = root.querySelector(".arkflight-preview-sticky");
  if (preview) {
    preview.querySelector("[data-owned-talents-panel]")?.remove();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = ownedTalentMarkup(view);
    const stationPanel = preview.querySelector(".arkflight-station-panel");
    if (stationPanel) stationPanel.before(wrapper.firstElementChild);
    else preview.append(wrapper.firstElementChild);
  }

  for (const button of root.querySelectorAll("[data-owned-talent-id]")) {
    button.addEventListener("click", () => {
      const id = button.dataset.ownedTalentId;
      const card = root.querySelector(`[data-talent-card="${CSS.escape(id)}"]`);
      if (card) card.click();
    });
  }

  addResetToOne(root, actor, app);
}

Hooks.on("renderApplicationV2", enhanceProgression);
Hooks.on("renderArkflightShipProgressionApp", enhanceProgression);
