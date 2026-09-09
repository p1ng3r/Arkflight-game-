const MODULE_ID = "arkflight-game";
const BAD_STATES = new Set(["stressed", "damaged", "critical", "disabled"]);

function hudApp() { return game.arkflight?.combatConsole?.application ?? null; }
function isShip(actor) { return Boolean(actor?.flags?.[MODULE_ID]?.ship); }
function activeShip() {
  const combatant = game.combat?.combatant ?? null;
  return combatant && isShip(combatant.actor) ? combatant : null;
}

function damageChips(actor) {
  const areas = actor?.flags?.[MODULE_ID]?.ship?.areas ?? {};
  return Object.entries(areas)
    .filter(([, row]) => BAD_STATES.has(String(row?.state ?? "stable")))
    .map(([key, row]) => ({ key, state: String(row.state) }));
}

function enhanceGuidance(app) {
  const root = app?.element;
  if (!root?.querySelector?.(".afcs-shell")) return;
  const combatant = app?.actor ? game.arkflight?.combat?.findCombatant?.(app.actor) ?? activeShip() : activeShip();
  if (!combatant) return;
  const state = game.arkflight?.combat?.state?.(combatant);
  const ap = Number(state?.economy?.ap?.value ?? 0);
  const end = root.querySelector("[data-end-turn]");
  if (end) end.innerHTML = `<i class="fa-solid fa-forward-step"></i> End Turn${ap > 0 ? ` · ${ap} AP` : ""}`;

  const readout = root.querySelector(".afcs-helm-readout");
  if (!readout) return;
  for (const old of readout.querySelectorAll("[data-damage-chip]")) old.remove();
  for (const row of damageChips(combatant.actor)) {
    const chip = document.createElement("span");
    chip.dataset.damageChip = row.key;
    chip.className = `is-damage is-${row.state}`;
    chip.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${row.key.replaceAll("-", " ")} <strong>${row.state}</strong>`;
    readout.append(chip);
  }
}

function deferGuidance(app) {
  requestAnimationFrame(() => enhanceGuidance(app));
}

Hooks.on("renderApplicationV2", deferGuidance);
Hooks.on("renderApplication", deferGuidance);

Hooks.on("controlToken", (token, controlled) => {
  if (!controlled || !token?.actor || !isShip(token.actor)) return;
  const active = activeShip();
  const hud = hudApp();
  if (!active || !hud?.rendered || token.actor.id === active.actorId) return;
  const target = game.arkflight?.combat?.findCombatant?.(token.actor);
  if (!target || target.id === active.id) return;
  try { token.setTarget?.(true, { releaseOthers: true }); } catch (_error) { /* targeting convenience */ }
  hud.setReference?.(active.actor);
  hud.selectedTargetId = target.id;
  hud.render?.({ force: true });
  ui.notifications?.info(`${target.name} targeted by ${active.name}.`);
});

Hooks.on("arkflightShipDamageStateChanged", ({ actor, notes }) => {
  const hud = hudApp();
  if (hud?.rendered) requestAnimationFrame(() => hud.render({ force: true }));
  if (actor && notes?.length) console.info(`Arkflight | ${actor.name} damage state: ${notes.join(" · ")}`);
});
