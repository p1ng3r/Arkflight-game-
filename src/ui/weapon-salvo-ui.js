import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
let queued = false;

function rootElement(app, html = null) {
  if (html?.querySelector) return html;
  if (html?.[0]?.querySelector) return html[0];
  const element = app?.element;
  if (element?.querySelector) return element;
  if (element?.[0]?.querySelector) return element[0];
  return null;
}

function actorFromApp(app) {
  return app?.actor ?? app?.document?.actor ?? (app?.document?.documentName === "Actor" ? app.document : null) ?? null;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compatibilityKey(weaponState) {
  const weapon = SHIP_CATALOGS.weapons?.[weaponState.id];
  const type = String(weapon?.data?.damageProfile?.type ?? "damage").toLowerCase();
  const threat = String(weapon?.data?.systemThreat ?? "hull").toLowerCase();
  return `${weaponState.mount ?? ""}|${type}|${threat}`;
}

function queue(app, html = null) {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    try { inject(app, html); } catch (error) { console.warn("Arkflight | Could not build Salvo controls", error); }
  });
}

function inject(app, html = null) {
  const root = rootElement(app, html);
  const actor = actorFromApp(app);
  const api = game.arkflight?.combat;
  if (!root || !actor?.flags?.[MODULE_ID]?.ship || !api?.fireSalvoAtTarget) return;

  const station = root.querySelector(".arkflight-weapon-station");
  const toolbar = station?.querySelector(".arkflight-weapon-toolbar-actions");
  const targetSelect = station?.querySelector("[data-arkflight-target-lock]");
  if (!station || !toolbar || !targetSelect) return;

  toolbar.querySelector(".arkflight-salvo-controls")?.remove();
  const combatant = api.findCombatant?.(actor);
  const state = combatant ? api.state?.(combatant) : null;
  if (!combatant || !state) return;

  if (!targetSelect.dataset.arkflightSalvoBound) {
    targetSelect.dataset.arkflightSalvoBound = "true";
    targetSelect.addEventListener("change", () => queue(app));
  }

  const targetId = targetSelect.value;
  if (!targetId) return;
  const groups = new Map();
  for (const weaponState of Object.values(state.weapons ?? {})) {
    if (!weaponState.mount || Number(api.reloadRemaining?.(weaponState.key, combatant) ?? 0) > 0) continue;
    const key = compatibilityKey(weaponState);
    const rows = groups.get(key) ?? [];
    rows.push(weaponState);
    groups.set(key, rows);
  }

  const controls = document.createElement("div");
  controls.className = "arkflight-salvo-controls";
  const availableAP = Math.max(0, Number(state.economy?.ap?.value) || 0);
  let created = 0;

  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const legal = rows.filter((weaponState) => {
      try { return Boolean(api.targetingSolution?.(weaponState.key, targetId, combatant)?.legal); }
      catch (_error) { return false; }
    }).sort((a, b) => Number(a.fireAP ?? 1) - Number(b.fireAP ?? 1));
    if (legal.length < 2) continue;

    const selected = [];
    let cost = 0;
    for (const weaponState of legal) {
      const nextCost = cost + Math.max(1, Number(weaponState.fireAP) || 1);
      if (nextCost > availableAP) continue;
      selected.push(weaponState);
      cost = nextCost;
    }
    if (selected.length < 2) continue;

    const mount = selected[0].mount;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "arkflight-salvo-fire";
    button.innerHTML = `<i class="fa-solid fa-burst"></i> Salvo ${titleCase(mount)} ×${selected.length} · ${cost} AP`;
    button.title = "Coordinated Salvo: one attack roll; compatible weapon damage is combined before Ward and Hardness. Every participating weapon reloads normally.";
    button.disabled = !game.user?.isGM;
    button.addEventListener("click", async () => {
      try {
        const result = await api.fireSalvoAtTarget(selected.map((weaponState) => weaponState.key), targetId, combatant);
        const damage = result?.damage?.hullDamage;
        if (damage != null) ui.notifications?.info(`Coordinated Salvo: ${damage} Hull damage.`);
        else ui.notifications?.info("Coordinated Salvo resolved; no Hull damage applied.");
        app.render?.(false);
      } catch (error) {
        console.error("Arkflight coordinated salvo failed", error);
        ui.notifications?.error(error?.message ?? "Coordinated Salvo failed.");
      }
    });
    controls.append(button);
    created += 1;
  }

  if (created) toolbar.prepend(controls);
}

Hooks.on("renderActorSheet", queue);
Hooks.on("renderApplicationV2", queue);
Hooks.on("arkflightCoordinatedSalvoResolved", () => {
  for (const app of Object.values(ui.windows ?? {})) {
    const root = rootElement(app);
    if (root?.querySelector?.(".arkflight-weapon-station")) queue(app);
  }
});
