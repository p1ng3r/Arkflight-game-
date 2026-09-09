import { firingArcsVisible, redrawFiringArcs, toggleFiringArcs } from "./weapon-combat-station-ui.js";

const MODULE_ID = "arkflight-game";
let moveGraphic = null;
let moveCombatantId = null;
let keysBound = false;

function app() { return game.arkflight?.combatConsole?.application ?? null; }
function activeCombatant() {
  const hud = app();
  return hud?.actor ? game.arkflight?.combat?.findCombatant?.(hud.actor) ?? game.combat?.combatant ?? null : game.combat?.combatant ?? null;
}
function isShip(actor) { return Boolean(actor?.flags?.[MODULE_ID]?.ship); }
function rootOf(application) { return application?.element?.querySelector ? application.element : null; }
function helmState(combatant) { return combatant ? game.arkflight?.combat?.helmState?.(combatant) ?? null : null; }
function stateOf(combatant) { return combatant ? game.arkflight?.combat?.state?.(combatant) ?? null : null; }

function clearMoveOverlay() {
  if (!moveGraphic) return;
  try { moveGraphic.parent?.removeChild?.(moveGraphic); } catch (_error) { /* cleanup */ }
  try { moveGraphic.destroy?.({ children: true }); } catch (_error) { /* cleanup */ }
  moveGraphic = null;
  moveCombatantId = null;
}

function tokenCenter(combatant) {
  const center = combatant?.token?.object?.center;
  if (center) return { x: Number(center.x), y: Number(center.y) };
  const grid = Number(canvas?.grid?.size ?? 100) || 100;
  return { x: Number(combatant?.token?.x ?? 0) + grid / 2, y: Number(combatant?.token?.y ?? 0) + grid / 2 };
}

function drawMoveOverlay(combatant) {
  clearMoveOverlay();
  const helm = helmState(combatant);
  const Graphics = globalThis.PIXI?.Graphics;
  const layer = canvas?.interface ?? canvas?.controls ?? canvas?.stage;
  if (!helm || !Graphics || !layer?.addChild || helm.movementRemaining <= 0) return false;
  const center = tokenCenter(combatant);
  const grid = Number(canvas?.grid?.size ?? 100) || 100;
  const radius = helm.movementRemaining * grid;
  const g = new Graphics();
  g.eventMode = "none";
  g.zIndex = 4;
  if (typeof g.circle === "function" && typeof g.fill === "function") {
    g.circle(center.x, center.y, radius);
    g.fill({ color: 0x5bc8e8, alpha: .07 });
    g.stroke({ color: 0x72d8f4, width: 3, alpha: .82 });
    for (let i = 1; i < helm.movementRemaining; i++) {
      g.circle(center.x, center.y, i * grid);
      g.stroke({ color: 0x72d8f4, width: 1, alpha: .22 });
    }
  } else {
    g.lineStyle?.(3, 0x72d8f4, .82);
    g.beginFill?.(0x5bc8e8, .07);
    g.drawCircle?.(center.x, center.y, radius);
    g.endFill?.();
  }
  layer.addChild(g);
  moveGraphic = g;
  moveCombatantId = combatant.id;
  return true;
}

function toggleMoveOverlay(combatant) {
  if (moveGraphic && moveCombatantId === combatant?.id) { clearMoveOverlay(); return false; }
  return drawMoveOverlay(combatant);
}

function readyReactionNames(state) {
  return (state?.stationRuntime?.effects ?? []).filter((e) => e?.timing === "reaction").map((e) => e.name ?? e.actionId);
}

function renameNavigatorRows(root) {
  const aliases = {
    "navigator-move": ["Push Ahead", "Spend 1 AP to gain another full Combat Speed of movement."],
    "navigator-maneuver": ["Extra Maneuver", "Spend 1 AP to gain another Maneuverability worth of facing steps."]
  };
  for (const [id, [name, summary]] of Object.entries(aliases)) {
    const button = root.querySelector(`[data-station-action="${id}"]`);
    const row = button?.closest?.("[data-action-card]");
    const strong = row?.querySelector?.(".afcs-action-text strong");
    const span = row?.querySelector?.(".afcs-action-text span");
    if (strong) strong.textContent = name;
    if (span) span.textContent = summary;
  }
}

function addHelmReadout(root, combatant) {
  const center = root.querySelector(".afcs-center");
  if (!center) return;
  let readout = center.querySelector(".afcs-helm-readout");
  if (!readout) {
    readout = document.createElement("div");
    readout.className = "afcs-helm-readout";
    center.append(readout);
  }
  const helm = helmState(combatant);
  const state = stateOf(combatant);
  if (!helm) { readout.textContent = "Helm offline"; return; }
  const reactions = readyReactionNames(state);
  readout.innerHTML = `<span class="is-free"><i class="fa-solid fa-route"></i> Free Move <strong>${helm.movementRemaining}</strong></span><span><i class="fa-solid fa-rotate"></i> Turns <strong>${helm.maneuverRemaining}</strong></span>${reactions.length ? `<span class="is-ready"><i class="fa-solid fa-bolt"></i> Ready: ${reactions.join(", ")}</span>` : ""}`;
}

async function useCombatCall(fn, failure) {
  try { await fn(); app()?.render?.({ force: true }); }
  catch (error) { ui.notifications?.warn(error?.message ?? failure); }
}

function ensureHelmPopover(root, combatant) {
  const shell = root.querySelector(".afcs-shell");
  const controls = root.querySelector(".afcs-controls");
  if (!shell || !controls) return;
  let helmButton = controls.querySelector("[data-afcs-helm]");
  if (!helmButton) {
    helmButton = document.createElement("button");
    helmButton.type = "button";
    helmButton.dataset.afcsHelm = "true";
    helmButton.innerHTML = '<i class="fa-solid fa-ship"></i> Helm';
    controls.prepend(helmButton);
  }
  let pop = shell.querySelector(".afcs-helm-popover");
  if (!pop) {
    pop = document.createElement("section");
    pop.className = "afcs-helm-popover";
    shell.append(pop);
  }
  const helm = helmState(combatant);
  const ap = Number(stateOf(combatant)?.economy?.ap?.value ?? 0);
  const mayTurn = Boolean(helm && (helm.movementUsed > 0 || helm.maneuverPurchases > 0));
  pop.innerHTML = `<header><div><span>HELM</span><strong>Normal movement is free each turn</strong></div><button type="button" data-helm-close><i class="fa-solid fa-xmark"></i></button></header>
    <div class="afcs-helm-status"><span>Move <strong>${helm?.movementRemaining ?? 0}</strong> / ${helm?.speed ?? 0}</span><span>Turns <strong>${helm?.maneuverRemaining ?? 0}</strong> / ${helm?.maneuverability ?? 0}</span><span>AP <strong>${ap}</strong></span></div>
    <div class="afcs-helm-actions">
      <button type="button" data-helm-range><i class="fa-solid fa-draw-polygon"></i> ${moveGraphic && moveCombatantId === combatant?.id ? "Hide" : "Show"} Move Range</button>
      <button type="button" data-helm-left ${mayTurn ? "" : "disabled"}><i class="fa-solid fa-rotate-left"></i> Turn Left</button>
      <button type="button" data-helm-right ${mayTurn ? "" : "disabled"}><i class="fa-solid fa-rotate-right"></i> Turn Right</button>
      <button type="button" data-helm-push ${ap > 0 ? "" : "disabled"}>Push Ahead · 1 AP</button>
      <button type="button" data-helm-maneuver ${ap > 0 ? "" : "disabled"}>Extra Maneuver · 1 AP</button>
    </div>
    ${!mayTurn ? '<small>Move at least 1 hex before using the free turn allowance. AP maneuvers may pivot exceptionally.</small>' : ""}`;
  helmButton.onclick = () => pop.classList.toggle("is-open");
  pop.querySelector("[data-helm-close]").onclick = () => pop.classList.remove("is-open");
  pop.querySelector("[data-helm-range]").onclick = () => { toggleMoveOverlay(combatant); ensureHelmPopover(root, combatant); };
  pop.querySelector("[data-helm-left]").onclick = () => useCombatCall(() => game.arkflight.combat.turn(-1, combatant), "Turn failed.");
  pop.querySelector("[data-helm-right]").onclick = () => useCombatCall(() => game.arkflight.combat.turn(1, combatant), "Turn failed.");
  pop.querySelector("[data-helm-push]").onclick = () => useCombatCall(() => game.arkflight.combat.buyMovement(combatant), "Push Ahead failed.");
  pop.querySelector("[data-helm-maneuver]").onclick = () => useCombatCall(() => game.arkflight.combat.buyManeuver(combatant), "Extra Maneuver failed.");
}

function wireArcButton(root, combatant) {
  for (const button of root.querySelectorAll("[data-toggle-all-arcs]")) {
    button.onclick = (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!combatant) return;
      const next = toggleFiringArcs(combatant);
      button.classList.toggle("is-active", next);
      button.innerHTML = `<i class="fa-solid fa-wave-square"></i> ${next ? "Hide Arcs" : "Show Arcs"}`;
    };
  }
}

function enhance(application) {
  const root = rootOf(application);
  if (!root?.querySelector?.(".afcs-shell")) return;
  const combatant = application?.actor ? game.arkflight?.combat?.findCombatant?.(application.actor) ?? game.combat?.combatant : game.combat?.combatant;
  if (!combatant || !isShip(combatant.actor)) return;
  renameNavigatorRows(root);
  addHelmReadout(root, combatant);
  ensureHelmPopover(root, combatant);
  wireArcButton(root, combatant);
  if (firingArcsVisible(combatant)) redrawFiringArcs(combatant);
}

function targetedTokenFromArgs(args) {
  return args.find((value) => value?.document?.documentName === "Token" || value?.documentName === "Token") ?? null;
}

Hooks.on("renderApplicationV2", enhance);
Hooks.on("renderApplication", enhance);
Hooks.on("updateCombatant", () => { if (app()?.rendered) app().render({ force: true }); });
Hooks.on("updateToken", () => {
  const c = activeCombatant();
  if (c && moveGraphic && moveCombatantId === c.id) drawMoveOverlay(c);
  if (c && firingArcsVisible(c)) redrawFiringArcs(c);
});
Hooks.on("arkflightHelmAllowanceReady", () => { if (app()?.rendered) app().render({ force: true }); });
Hooks.on("arkflightShipDamageStateChanged", () => { if (app()?.rendered) app().render({ force: true }); });
Hooks.on("targetToken", (...args) => {
  const token = targetedTokenFromArgs(args);
  const targeted = args.find((value) => typeof value === "boolean");
  const hud = app();
  if (!hud?.rendered || !token || targeted === false) return;
  const doc = token.document ?? token;
  const target = game.arkflight?.combat?.findCombatant?.(doc.actor ?? token.actor);
  const attacker = activeCombatant();
  if (!target || target.id === attacker?.id) return;
  hud.selectedTargetId = target.id;
  hud.render({ force: true });
});
Hooks.on("tearDownCanvas", clearMoveOverlay);
Hooks.on("deleteCombat", clearMoveOverlay);

Hooks.once("ready", () => {
  if (keysBound) return;
  keysBound = true;
  window.addEventListener("keydown", (event) => {
    const tag = String(event.target?.tagName ?? "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag) || event.ctrlKey || event.metaKey || event.altKey) return;
    const hud = app();
    const combatant = activeCombatant();
    if (!hud?.rendered || !combatant) return;
    const key = event.key.toLowerCase();
    if (key === "m") { event.preventDefault(); toggleMoveOverlay(combatant); }
    else if (key === "a") { event.preventDefault(); toggleFiringArcs(combatant); hud.render({ force: true }); }
    else if (key === "w") { event.preventDefault(); hud.openPanel = hud.openPanel === "weapons" ? null : "weapons"; hud.render({ force: true }); }
    else if (key === "s") { event.preventDefault(); hud.openPanel = hud.openPanel === "stations" ? null : "stations"; hud.render({ force: true }); }
    else if (key === "l") { event.preventDefault(); hud.openPanel = hud.openPanel === "log" ? null : "log"; hud.render({ force: true }); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); useCombatCall(() => game.arkflight.combat.turn(-1, combatant), "Turn failed."); }
    else if (event.key === "ArrowRight") { event.preventDefault(); useCombatCall(() => game.arkflight.combat.turn(1, combatant), "Turn failed."); }
  });
});
