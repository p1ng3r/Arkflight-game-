import { firingArcsVisible, toggleFiringArcs } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";

function tokenDocumentFromHud(hud) {
  const candidate = hud?.object?.document ?? hud?.object ?? hud?.document ?? null;
  if (candidate?.documentName === "Token") return candidate;
  if (candidate?.document?.documentName === "Token") return candidate.document;
  return null;
}

function rootElement(hud, html = null) {
  if (html?.querySelector) return html;
  if (html?.[0]?.querySelector) return html[0];
  const element = hud?.element;
  if (element?.querySelector) return element;
  if (element?.[0]?.querySelector) return element[0];
  return null;
}

function isArkflightShip(actor) {
  return Boolean(actor?.flags?.[MODULE_ID]?.ship);
}

function installedWeaponCount(actor) {
  return Math.max(0, actor?.flags?.[MODULE_ID]?.ship?.weapons?.length ?? 0);
}

function combatantForToken(token) {
  const actor = token?.actor ?? null;
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.tokenId === token.id || entry.actorId === actor.id)
    ?? null;
}

function updateButtonState(button, combatant) {
  const visible = firingArcsVisible(combatant);
  const label = visible ? "Hide all weapon firing arcs" : "Show all weapon firing arcs";
  button.classList.toggle("active", visible);
  button.setAttribute("aria-pressed", String(visible));
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  button.title = label;
}

function attachWeaponArcButton(hud, html = null) {
  const token = tokenDocumentFromHud(hud);
  const actor = token?.actor ?? null;
  if (!token || !isArkflightShip(actor)) return;

  const root = rootElement(hud, html);
  if (!root || root.querySelector("[data-arkflight-token-weapon-arcs]")) return;

  const column = root.querySelector(".right") ?? root.querySelector(".col.right") ?? root.querySelector("[data-column='right']");
  if (!column) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("control-icon", "arkflight-token-weapon-arcs");
  button.dataset.arkflightTokenWeaponArcs = "true";
  button.innerHTML = '<i class="fa-solid fa-crosshairs fa-fw"></i>';
  updateButtonState(button, combatantForToken(token));

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!installedWeaponCount(actor)) {
      ui.notifications?.warn(`${actor.name} has no installed ship weapons.`);
      return;
    }

    const combatant = combatantForToken(token);
    if (!combatant || !game.arkflight?.combat?.state?.(combatant)) {
      ui.notifications?.warn(`${actor.name} must be in Foundry combat before weapon firing arcs can be displayed.`);
      return;
    }

    toggleFiringArcs(combatant);
    updateButtonState(button, combatant);
  });

  column.append(button);
}

Hooks.on("renderTokenHUD", (hud, html) => attachWeaponArcButton(hud, html));
