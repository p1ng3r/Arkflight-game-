import { SHIP_TALENTS } from "../content/ship-talents.js";
import { resetShipLevel, setShipExperience, shipExperienceView } from "../ship/ship-xp.js";

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

async function commitLevelReset(actor, targetLevel, rerender = null) {
  if (!game.user.isGM || !isShip(actor)) return;
  const before = shipExperienceView(shipFlag(actor));
  const requested = Math.max(1, Math.min(20, Math.trunc(Number(targetLevel) || before.level)));
  if (requested >= before.level) {
    ui.notifications?.warn("Reset Level only lowers a ship. Use Ship XP to advance it.");
    return;
  }

  const result = resetShipLevel(shipFlag(actor), requested);
  const refundedNames = result.refundedTalentIds.map((id) => SHIP_TALENTS[id]?.name ?? id);
  const refundText = refundedNames.length
    ? `\n\n${refundedNames.length} talent${refundedNames.length === 1 ? "" : "s"} will be refunded so the lower-level build remains legal:\n• ${refundedNames.join("\n• ")}`
    : "";
  const confirmed = window.confirm(`Reset ${actor.name} from ship level ${before.level} to level ${requested}?\n\nShip XP will reset to 0.${refundText}`);
  if (!confirmed) return;

  await actor.update({ [`flags.${MODULE_ID}.ship`]: result.ship });
  const refundNotice = refundedNames.length ? ` ${refundedNames.length} talent${refundedNames.length === 1 ? " was" : "s were"} refunded.` : "";
  ui.notifications?.info(`${actor.name} reset to ship level ${requested} with 0 / 1000 XP.${refundNotice}`);
  rerender?.();
}

function xpMarkup(view, { compact = false } = {}) {
  const value = Math.round(view.percent * 10) / 10;
  const input = game.user.isGM
    ? `<input type="number" min="0" step="1" value="${view.xp}" data-ship-xp-input aria-label="Ship experience">`
    : `<strong>${view.xp}</strong>`;
  const next = view.nextLevel ? `Next Level: ${view.nextLevel}` : "Maximum Level";
  const reset = game.user.isGM && view.level > 1
    ? `<button type="button" class="arkflight-ship-level-reset" data-ship-level-reset title="Reset this vessel to a lower ship level"><i class="fa-solid fa-rotate-left"></i> Reset Level</button>`
    : "";
  return `
    <div class="arkflight-ship-xp ${compact ? "is-compact" : ""}" data-ship-xp>
      <div class="arkflight-ship-xp-head">
        <span>SHIP XP</span>
        <span class="arkflight-ship-xp-next">${next}</span>
        ${reset}
      </div>
      <div class="arkflight-ship-xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${view.max}" aria-valuenow="${view.xp}">
        <div class="arkflight-ship-xp-fill" style="width:${value}%"></div>
        <div class="arkflight-ship-xp-value">${input}<span>/ ${view.max} XP</span></div>
      </div>
    </div>`;
}

function wireXpControls(root, actor, rerender) {
  const input = root.querySelector("[data-ship-xp-input]");
  if (input && input.dataset.arkflightXpWired !== "true") {
    input.dataset.arkflightXpWired = "true";
    input.addEventListener("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      input.disabled = true;
      try { await commitXp(actor, event.currentTarget.value, rerender); }
      finally { input.disabled = false; }
    });
  }

  const reset = root.querySelector("[data-ship-level-reset]");
  if (reset && reset.dataset.arkflightResetWired !== "true") {
    reset.dataset.arkflightResetWired = "true";
    reset.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = shipExperienceView(shipFlag(actor));
      const answer = window.prompt(`Reset ${actor.name} to which lower ship level?`, String(Math.max(1, current.level - 1)));
      if (answer === null) return;
      reset.disabled = true;
      try { await commitLevelReset(actor, answer, rerender); }
      finally { reset.disabled = false; }
    });
  }
}

function enhanceShipSheet(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!isShip(actor)) return;
  const root = asElement(html);
  if (!root) return;
  root.querySelector("[data-ship-xp]")?.remove();
  const host = root.querySelector("[data-ship-xp-host]");
  if (!host) return;
  const view = shipExperienceView(shipFlag(actor));
  const wrapper = document.createElement("div");
  wrapper.innerHTML = xpMarkup(view, { compact: true });
  host.replaceChildren(wrapper.firstElementChild);
  wireXpControls(root, actor, () => app.render?.(false));
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
  wireXpControls(root, actor, () => app.render?.({ force: true }));
}

Hooks.on("renderActorSheet", enhanceShipSheet);
Hooks.on("renderApplicationV2", enhanceProgressionApp);
Hooks.on("renderArkflightShipProgressionApp", enhanceProgressionApp);

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.shipExperienceView = (actor) => shipExperienceView(shipFlag(actor));
  game.arkflight.setShipExperience = async (actor, value) => commitXp(actor, value, () => actor.sheet?.render?.(false));
  game.arkflight.resetShipLevel = async (actor, level) => commitLevelReset(actor, level, () => actor.sheet?.render?.(false));
});
