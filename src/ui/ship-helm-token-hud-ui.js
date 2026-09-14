const MODULE_ID = "arkflight-game";
const NATIVE_CONTROLS_OPEN = new Set();

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

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function combatantForToken(token) {
  if (!token?.actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(token.actor)
    ?? [...(game.combat.combatants ?? [])].find((entry) => entry.tokenId === token.id || entry.actorId === token.actor.id)
    ?? null;
}

function activeHelmCombatant(token) {
  const combatant = combatantForToken(token);
  return combatant && game.combat?.combatant?.id === combatant.id ? combatant : null;
}

function polarPoint(angle, radius) {
  const radians = Number(angle) * Math.PI / 180;
  return Object.freeze({
    x: Math.sin(radians) * radius,
    y: -Math.cos(radians) * radius
  });
}

function placeAtBearing(element, bearing, radius) {
  const point = polarPoint(bearing, radius);
  element.style.left = `calc(50% + ${point.x.toFixed(1)}px)`;
  element.style.top = `calc(50% + ${point.y.toFixed(1)}px)`;
}

function button({ className, label, title, icon, disabled = false, bearing = null, radius = 76, onClick }) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = `arkflight-helm-control ${className}`;
  control.setAttribute("aria-label", label);
  control.dataset.tooltip = title;
  control.title = title;
  control.disabled = disabled;
  control.innerHTML = `<span class="arkflight-helm-icon">${icon}</span>`;
  if (bearing != null) {
    placeAtBearing(control, bearing, radius);
    const arrow = control.querySelector(".arkflight-helm-icon");
    if (arrow && className.includes("is-move")) arrow.style.transform = `rotate(${Number(bearing)}deg)`;
  }
  control.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (control.disabled) return;
    control.disabled = true;
    try { await onClick(); }
    catch (error) {
      console.error("Arkflight | Helm control failed", error);
      ui.notifications?.error(error?.message ?? "Arkflight Helm control failed.");
    } finally {
      control.disabled = false;
    }
  });
  return control;
}

async function rerenderHud(hud) {
  try { await hud?.render?.({ force: true }); }
  catch (_error) { /* HUD refresh is convenience only */ }
}

function movementTitle(status, option) {
  if (status.moored) return "Moored — use Break Grapple first";
  if (!status.canOperate) return "You do not control this ship";
  if (!status.geometry?.ok) return status.geometry?.reason ?? "Helm movement unavailable";
  if (status.movementRemaining > 0) return `Forward 1 hex · ${status.movementRemaining} normal movement remaining`;
  return `Forward 1 hex · spend 1 AP for another ${status.speed}-hex Move block`;
}

function reverseTitle(status) {
  if (status.moored) return "Moored — use Break Grapple first";
  if (!status.canOperate) return "You do not control this ship";
  if (!status.geometry?.ok) return status.geometry?.reason ?? "Helm movement unavailable";
  return "Reverse Thrust · 1 AP · move 1 hex astern";
}

function setNativeControlsOpen(root, tokenId, open) {
  const expanded = Boolean(open);
  root.classList.toggle("arkflight-native-controls-open", expanded);
  if (expanded) NATIVE_CONTROLS_OPEN.add(tokenId);
  else NATIVE_CONTROLS_OPEN.delete(tokenId);

  const toggle = root.querySelector("[data-arkflight-native-controls]");
  if (!toggle) return;
  const title = expanded ? "Hide Foundry token controls" : "Show Foundry token controls";
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-label", title);
  toggle.dataset.tooltip = title;
  toggle.title = title;
}

function statusBadge(status, root, tokenId) {
  const badge = document.createElement("div");
  badge.className = "arkflight-helm-status";
  badge.innerHTML = `<strong>${status.heading}°</strong><span>AP ${status.ap} · Move ${status.movementRemaining}</span>`;

  const utility = document.createElement("button");
  utility.type = "button";
  utility.className = "arkflight-helm-utilities";
  utility.dataset.arkflightNativeControls = "true";
  utility.innerHTML = '<span aria-hidden="true">•••</span>';
  const expanded = NATIVE_CONTROLS_OPEN.has(tokenId);
  const title = expanded ? "Hide Foundry token controls" : "Show Foundry token controls";
  utility.setAttribute("aria-expanded", String(expanded));
  utility.setAttribute("aria-label", title);
  utility.dataset.tooltip = title;
  utility.title = title;
  utility.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setNativeControlsOpen(root, tokenId, !root.classList.contains("arkflight-native-controls-open"));
  });
  badge.append(utility);
  return badge;
}
function attachHelmRing(hud, html = null) {
  const token = tokenDocumentFromHud(hud);
  const actor = token?.actor ?? null;
  if (!token || !shipPayload(actor)) return;
  const combatant = activeHelmCombatant(token);
  if (!combatant) return;

  const api = game.arkflight?.combat;
  const status = api?.helmControls?.(combatant) ?? null;
  if (!status) return;

  const root = rootElement(hud, html);
  if (!root || root.querySelector("[data-arkflight-helm-ring]")) return;
  root.classList.add("arkflight-ship-token-hud");
  root.classList.toggle("arkflight-native-controls-open", NATIVE_CONTROLS_OPEN.has(token.id));

  const ring = document.createElement("div");
  ring.className = "arkflight-helm-ring";
  ring.dataset.arkflightHelmRing = "true";

  const box = root.getBoundingClientRect?.() ?? { width: 100, height: 100 };
  const radius = Math.max(62, Math.min(138, Math.max(Number(box.width) || 100, Number(box.height) || 100) / 2 + 30));
  const canUse = status.canOperate && !status.moored && status.geometry?.ok;

  ring.append(statusBadge(status, root, token.id));

  ring.append(button({
    className: "is-turn is-turn-left",
    label: "Turn 30°",
    title: "Preview 30° to port. Turning is charged only when facing is committed.",
    icon: "↶",
    disabled: !status.canOperate || status.moored,
    bearing: status.heading - 90,
    radius,
    onClick: async () => {
      await api.turn(-1, combatant);
      await rerenderHud(hud);
    }
  }));

  ring.append(button({
    className: "is-turn is-turn-right",
    label: "Turn 30°",
    title: "Preview 30° to starboard. Turning is charged only when facing is committed.",
    icon: "↷",
    disabled: !status.canOperate || status.moored,
    bearing: status.heading + 90,
    radius,
    onClick: async () => {
      await api.turn(1, combatant);
      await rerenderHud(hud);
    }
  }));

  for (const option of status.geometry?.forward ?? []) {
    const sideLabel = option.side === "left" ? "Forward L" : option.side === "right" ? "Forward R" : "Forward";
    ring.append(button({
      className: `is-move is-forward is-${option.side}`,
      label: sideLabel,
      title: movementTitle(status, option),
      icon: "▲",
      disabled: !canUse || !status.canForward,
      bearing: option.bearing,
      radius,
      onClick: async () => {
        await api.helmMove(option.id, combatant);
        await rerenderHud(hud);
      }
    }));
  }

  for (const option of status.geometry?.reverse ?? []) {
    const sideLabel = option.side === "left" ? "Reverse L" : option.side === "right" ? "Reverse R" : "Reverse";
    ring.append(button({
      className: `is-move is-reverse is-${option.side}`,
      label: sideLabel,
      title: reverseTitle(status),
      icon: "▼",
      disabled: !canUse || !status.canReverse,
      bearing: option.bearing,
      radius,
      onClick: async () => {
        await api.helmMove(option.id, combatant);
        await rerenderHud(hud);
      }
    }));
  }

  root.append(ring);
}

function boundHudForToken(tokenId) {
  const hud = canvas?.tokens?.hud ?? null;
  const bound = hud?.object?.document ?? hud?.object ?? null;
  return bound?.id === tokenId ? hud : null;
}

function refreshBoundHelm(tokenId = null) {
  const hud = canvas?.tokens?.hud ?? null;
  const bound = hud?.object?.document ?? hud?.object ?? null;
  if (!hud?.rendered || (tokenId && bound?.id !== tokenId)) return;
  requestAnimationFrame(() => rerenderHud(hud));
}

Hooks.on("renderTokenHUD", (hud, html) => attachHelmRing(hud, html));

Hooks.on("controlToken", (token, controlled) => {
  if (!controlled || !token?.document || !shipPayload(token.actor)) return;
  const combatant = activeHelmCombatant(token.document);
  if (!combatant || !game.arkflight?.combat?.canOperate?.(combatant)) return;
  requestAnimationFrame(() => canvas?.tokens?.hud?.bind?.(token));
});

Hooks.on("updateToken", (token, changes) => {
  if (!(Object.hasOwn(changes ?? {}, "x") || Object.hasOwn(changes ?? {}, "y") || Object.hasOwn(changes ?? {}, "rotation"))) return;
  refreshBoundHelm(token.id);
});

Hooks.on("updateCombatant", (combatant) => {
  if (game.combat?.combatant?.id !== combatant.id) return;
  refreshBoundHelm(combatant.tokenId);
});

Hooks.on("arkflightHelmMoved", ({ combatant }) => refreshBoundHelm(combatant?.tokenId));
Hooks.on("arkflightFacingReconciled", ({ combatant }) => refreshBoundHelm(combatant?.tokenId));
Hooks.on("arkflightCombatTurnChanged", ({ combatant }) => {
  const token = combatant?.token?.object ?? null;
  if (!token || !game.arkflight?.combat?.canOperate?.(combatant)) return;
  requestAnimationFrame(() => canvas?.tokens?.hud?.bind?.(token));
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.helmHud = Object.freeze({
    refresh: refreshBoundHelm,
    open(reference = null) {
      const combatant = reference
        ? game.arkflight?.combat?.findCombatant?.(reference)
        : game.combat?.combatant ?? null;
      const token = combatant?.token?.object ?? null;
      if (!token) throw new Error("No active Arkflight ship token is available.");
      return canvas?.tokens?.hud?.bind?.(token);
    },
    boundTokenId() {
      const hud = canvas?.tokens?.hud ?? null;
      return (hud?.object?.document ?? hud?.object ?? null)?.id ?? null;
    }
  });
});
