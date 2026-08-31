import { SHIP_TALENTS } from "../content/ship-talents.js";
import { resetShipLevel, shipExperienceView } from "../ship/ship-xp.js";

const MODULE_ID = "arkflight-game";
const { DialogV2 } = foundry.applications.api;

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return actor?.type === "vehicle" && (actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor))); }
function isProgressionApp(app) { return app?.constructor?.name === "ArkflightShipProgressionApp" || app?.options?.id === "arkflight-ship-progression"; }
function rootElement(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" }[char]));
}

async function chooseLowerLevel(actor) {
  const current = shipExperienceView(shipFlag(actor));
  if (current.level <= 1) return null;
  const options = Array.from({ length: current.level - 1 }, (_, index) => index + 1)
    .reverse()
    .map((level) => `<option value="${level}"${level === current.level - 1 ? " selected" : ""}>Level ${level}</option>`)
    .join("");
  const fd = await DialogV2.input({
    window: { title: `Reset ${actor.name}` },
    content: `<div class="arkflight-level-reset-dialog"><p>Choose the lower ship level to restore.</p><select name="level" autofocus>${options}</select><p><small>Ship XP resets to 0. Talents that no longer fit the lower tier or Talent Point budget are automatically refunded.</small></p></div>`,
    ok: { label: "Preview Reset", icon: "fa-solid fa-rotate-left" },
    rejectClose: false,
    modal: true
  });
  if (!fd) return null;
  return Number(fd.get("level"));
}

async function applyLowerLevel(actor, requested, rerender = null) {
  if (!game.user.isGM || !isShip(actor)) return false;
  const before = shipExperienceView(shipFlag(actor));
  const level = Math.max(1, Math.min(before.level - 1, Math.trunc(Number(requested) || before.level - 1)));
  if (level >= before.level) return false;

  const result = resetShipLevel(shipFlag(actor), level);
  const refundedNames = result.refundedTalentIds.map((id) => SHIP_TALENTS[id]?.name ?? id);
  const refunded = refundedNames.length
    ? `<div class="arkflight-reset-refunds"><strong>Talents Refunded</strong><ul>${refundedNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul></div>`
    : `<p><strong>No talents need to be refunded.</strong></p>`;

  const confirmed = await DialogV2.confirm({
    window: { title: `Reset ${actor.name} to Level ${level}?` },
    content: `<div class="arkflight-level-reset-dialog"><p><strong>${escapeHtml(actor.name)}</strong> will be reset from level ${before.level} to <strong>level ${level}</strong>.</p><p>Ship XP will become <strong>0 / 1000 XP</strong>.</p>${refunded}</div>`,
    yes: { label: `Reset to Level ${level}`, icon: "fa-solid fa-backward-fast" },
    no: { label: "Keep Current Level" },
    rejectClose: false,
    modal: true
  });
  if (!confirmed) return false;

  await actor.update({ [`flags.${MODULE_ID}.ship`]: result.ship });
  const refundNotice = refundedNames.length ? ` ${refundedNames.length} talent${refundedNames.length === 1 ? " was" : "s were"} refunded.` : "";
  ui.notifications?.info(`${actor.name} reset to ship level ${level} with 0 / 1000 XP.${refundNotice}`);
  rerender?.();
  return true;
}

function wireResetControls(app, html) {
  if (!game.user.isGM) return;
  const actor = app?.actor ?? app?.document;
  if (!isShip(actor)) return;
  const root = rootElement(app, html);
  if (!root) return;
  const rerender = () => isProgressionApp(app) ? app.render?.({ force: true }) : app.render?.(false);

  for (const button of root.querySelectorAll("[data-ship-level-reset]")) {
    if (button.dataset.arkflightResetFixWired === "true") continue;
    button.dataset.arkflightResetFixWired = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const target = await chooseLowerLevel(actor);
      if (target == null) return;
      await applyLowerLevel(actor, target, rerender);
    }, true);
  }

  for (const button of root.querySelectorAll("[data-reset-ship-to-one]")) {
    if (button.dataset.arkflightResetOneFixWired === "true") continue;
    button.dataset.arkflightResetOneFixWired = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      await applyLowerLevel(actor, 1, rerender);
    }, true);
  }

  const levelInput = root.querySelector("[data-ship-level]");
  if (levelInput && levelInput.dataset.arkflightLevelFixWired !== "true") {
    levelInput.dataset.arkflightLevelFixWired = "true";
    levelInput.addEventListener("change", async (event) => {
      if (!game.user.isGM) return;
      const before = shipExperienceView(shipFlag(actor));
      const requested = Math.max(1, Math.min(20, Math.trunc(Number(event.currentTarget.value) || before.level)));
      if (requested === before.level) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (requested > before.level) {
        ui.notifications?.warn("Ship levels advance through Ship XP. Use the XP control to raise the vessel's level.");
        event.currentTarget.value = String(before.level);
        return;
      }
      const changed = await applyLowerLevel(actor, requested, rerender);
      if (!changed) event.currentTarget.value = String(before.level);
    }, true);
  }
}

Hooks.on("renderActorSheet", wireResetControls);
Hooks.on("renderApplicationV2", wireResetControls);
Hooks.on("renderArkflightShipProgressionApp", wireResetControls);

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.resetShipLevelSafe = async (actor, level) => applyLowerLevel(actor, level, () => actor.sheet?.render?.(false));
});
