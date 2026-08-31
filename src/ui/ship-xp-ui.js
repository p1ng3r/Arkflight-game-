import { setShipExperience, shipExperienceView } from "../ship/ship-xp.js";

const MODULE_ID = "arkflight-game";

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return actor?.type === "vehicle" && (actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor))); }
function asElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

async function commitXp(actor, value, rerender = null) {
  if (!game.user.isGM || !isShip(actor)) return;
  const before = shipExperienceView(shipFlag(actor));
  const nextShip = setShipExperience(shipFlag(actor), value);
  const after = shipExperienceView(nextShip);
  await actor.update({ [`flags.${MODULE_ID}.ship`]: nextShip });
  if (after.level > before.level) {
    const gained = after.level - before.level;
    ui.notifications?.info(`${actor.name} gained ${gained} ship level${gained === 1 ? "" : "s"} and is now level ${after.level}.`);
  }
  rerender?.();
}

function xpMarkup(view, { compact = false } = {}) {
  const value = Math.round(view.percent * 10) / 10;
  const input = game.user.isGM
    ? `<input type="number" min="0" step="1" value="${view.xp}" data-ship-xp-input aria-label="Ship experience">`
    : `<strong>${view.xp}</strong>`;
  const next = view.nextLevel ? `Next Level: ${view.nextLevel}` : "Maximum Level";
  return `
    <div class="arkflight-ship-xp ${compact ? "is-compact" : ""}" data-ship-xp>
      <div class="arkflight-ship-xp-head">
        <span>SHIP XP</span>
        <span>${next}</span>
      </div>
      <div class="arkflight-ship-xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${view.max}" aria-valuenow="${view.xp}">
        <div class="arkflight-ship-xp-fill" style="width:${value}%"></div>
        <div class="arkflight-ship-xp-value">${input}<span>/ ${view.max} XP</span></div>
      </div>
    </div>`;
}

function wireXpInput(root, actor, rerender) {
  const input = root.querySelector("[data-ship-xp-input]");
  if (!input || input.dataset.arkflightXpWired === "true") return;
  input.dataset.arkflightXpWired = "true";
  input.addEventListener("change", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.disabled = true;
    try { await commitXp(actor, event.currentTarget.value, rerender); }
    finally { input.disabled = false; }
  });
}

function enhanceShipSheet(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!isShip(actor)) return;
  const root = asElement(html);
  if (!root) return;
  root.querySelector("[data-ship-xp]")?.remove();
  const view = shipExperienceView(shipFlag(actor));
  const host = root.querySelector(".arkflight-ship-header-actions") ?? root.querySelector(".window-content") ?? root;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = xpMarkup(view, { compact: true });
  host.prepend(wrapper.firstElementChild);
  wireXpInput(root, actor, () => app.render?.(false));
}

function enhanceProgressionApp(app, html) {
  if (app?.constructor?.name !== "ArkflightShipProgressionApp" && app?.options?.id !== "arkflight-ship-progression") return;
  const actor = app.actor;
  if (!isShip(actor)) return;
  const root = asElement(html) ?? app.element;
  if (!root) return;
  const view = shipExperienceView(shipFlag(actor));
  const title = root.querySelector(".arkflight-progression-title-block");
  if (!title) return;

  const oldTrack = title.querySelector(".arkflight-level-track");
  const oldCaption = title.querySelector(".arkflight-level-track-caption");
  oldTrack?.remove();
  oldCaption?.remove();
  title.querySelector("[data-ship-xp]")?.remove();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = xpMarkup(view);
  title.append(wrapper.firstElementChild);
  wireXpInput(root, actor, () => app.render?.({ force: true }));
}

Hooks.on("renderActorSheet", enhanceShipSheet);
Hooks.on("renderApplicationV2", enhanceProgressionApp);
Hooks.on("renderArkflightShipProgressionApp", enhanceProgressionApp);

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.shipExperienceView = (actor) => shipExperienceView(shipFlag(actor));
  game.arkflight.setShipExperience = async (actor, value) => commitXp(actor, value, () => actor.sheet?.render?.(false));
});
