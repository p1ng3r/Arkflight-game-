import { SHIP_CATALOGS } from "../content/index.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function currentShip() {
  return game.arkflight?.ships?.getCurrent?.() ?? null;
}

function arkflightCombatants() {
  const api = game.arkflight?.combat;
  if (!game.combat || typeof api?.isArkflightCombatant !== "function") return [];
  return [...(game.combat.combatants ?? [])].filter((entry) => api.isArkflightCombatant(entry));
}

function displayedCombatant() {
  const current = game.combat?.combatant ?? null;
  if (game.arkflight?.combat?.isArkflightCombatant?.(current)) return current;
  return arkflightCombatants()[0] ?? null;
}

function combatBlockers(ship) {
  if (!ship) return ["No Current Ship is designated."];
  const api = game.arkflight?.combat;
  if (typeof api?.launchBlockers === "function") return api.launchBlockers(ship.actor ?? ship.id);
  const blockers = [];
  if (ship.status === "Commissioning Required") blockers.push("Current Ship requires commissioning.");
  if (!ship.validation?.ok) blockers.push(...(ship.validation?.errors ?? ["Current Ship validation failed."]));
  if (!ship.crew?.ready) blockers.push(`${ship.crew?.assigned ?? 0}/${ship.crew?.total ?? 0} permanent stations assigned.`);
  if (game.arkflight?.controller?.state?.eventId) blockers.push("A Voyage Event is already active.");
  return [...new Set(blockers)];
}

function metric(label, value) {
  const row = document.createElement("div");
  row.className = "arkflight-gm-metric-row";
  const span = document.createElement("span");
  span.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value ?? "—";
  row.append(span, strong);
  return row;
}

function reloadSummary(state, round) {
  const rows = Object.values(state?.weapons ?? {});
  if (!rows.length) return "No weapons installed";
  return rows.map((weapon) => {
    const remaining = Math.max(0, Number(weapon.readyRound ?? 0) - Number(round ?? 0));
    return remaining > 0 ? `${weapon.name}: ${remaining}` : `${weapon.name}: Ready`;
  }).join(" · ");
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function weaponFireControl(app, combatant, state, round) {
  const section = document.createElement("section");
  section.className = "arkflight-gm-weapon-console";
  section.innerHTML = `<div class="arkflight-gm-weapon-console-head"><div><div class="arkflight-gm-kicker">BATTLEWATCH</div><h3>Weapon Fire Control</h3></div><small>Token distance, range band, facing arc, AP, reload, attack, damage, and Hardness are resolved here.</small></div>`;
  const targets = game.arkflight?.combat?.targets?.(combatant) ?? [];
  const weapons = Object.values(state?.weapons ?? {});
  if (!weapons.length) {
    section.insertAdjacentHTML("beforeend", '<p class="arkflight-gm-weapon-empty">No weapons are installed on this ship.</p>');
    return section;
  }
  if (!targets.length) {
    section.insertAdjacentHTML("beforeend", '<p class="arkflight-gm-weapon-empty">Add another Arkflight ship to this Foundry combat to select a target.</p>');
  }
  for (const weaponState of weapons) {
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id] ?? null;
    const combat = weapon?.data?.combat ?? {};
    const range = combat.rangeHexes ?? {};
    const damage = weapon?.data?.damageProfile ?? {};
    const remaining = Math.max(0, Number(weaponState.readyRound ?? 0) - round);
    const enoughAP = Number(state?.economy?.ap?.value ?? 0) >= Number(weaponState.fireAP ?? 1);
    const row = document.createElement("article");
    row.className = "arkflight-gm-weapon-row";
    row.innerHTML = `
      <div class="arkflight-gm-weapon-identity"><strong>${foundry.utils.escapeHTML(weaponState.name)}</strong><span>${titleCase(weaponState.mount ?? "fore")} mount ${Number(weaponState.mountIndex ?? 0) + 1} · ${titleCase(combat.arcTemplate ?? "wide")} arc</span></div>
      <div class="arkflight-gm-weapon-stats"><span>${damage.dice ?? "—"} ${titleCase(damage.type)}</span><span>Threat ${titleCase(weapon?.data?.systemThreat ?? "hull")}</span><span>${weaponState.fireAP} AP</span><span>Reload ${weaponState.reloadRounds}</span><span>Range ${range.min ?? "—"} / ${range.optimalMin ?? "—"}–${range.optimalMax ?? "—"} / ${range.max ?? "—"}</span></div>
      <label>Target<select data-weapon-target>${targets.map((target) => `<option value="${target.id}">${foundry.utils.escapeHTML(target.name)}</option>`).join("")}</select></label>
      <div class="arkflight-gm-weapon-solution" data-weapon-solution>${targets.length ? "Calculating target solution…" : "No target"}</div>
      <div class="arkflight-gm-command-actions"><button type="button" class="arkflight-gm-primary" data-fire-weapon ${targets.length && remaining === 0 && enoughAP ? "" : "disabled"}><i class="fa-solid fa-crosshairs"></i> ${remaining ? `Reloading · ${remaining} round${remaining === 1 ? "" : "s"}` : enoughAP ? "Fire Weapon" : `Need ${weaponState.fireAP} AP`}</button>${remaining ? `<button type="button" data-work-guns ${Number(state?.economy?.ap?.value ?? 0) >= 1 ? "" : "disabled"}><i class="fa-solid fa-rotate"></i> Work the Guns · 1 AP</button>` : ""}</div>`;
    const select = row.querySelector("[data-weapon-target]");
    const solutionNode = row.querySelector("[data-weapon-solution]");
    const fireButton = row.querySelector("[data-fire-weapon]");
    const updateSolution = () => {
      if (!select?.value) return;
      try {
        const solution = game.arkflight.combat.targetingSolution(weaponState.key, select.value, combatant);
        solutionNode.textContent = `${solution.distanceHexes.toFixed(1)} hex · ${solution.range.label} · ${solution.arc.legal ? "Inside arc" : `Outside arc by ${Math.max(0, solution.arc.difference - solution.arc.halfWidth).toFixed(0)}°`}`;
        solutionNode.classList.toggle("is-legal", solution.legal);
        solutionNode.classList.toggle("is-illegal", !solution.legal);
        if (remaining === 0) fireButton.disabled = !solution.legal || !enoughAP;
      } catch (error) {
        solutionNode.textContent = error.message;
        solutionNode.classList.add("is-illegal");
        fireButton.disabled = true;
      }
    };
    select?.addEventListener("change", updateSolution);
    fireButton?.addEventListener("click", async () => {
      try {
        await game.arkflight.combat.fireAtTarget(weaponState.key, select.value, combatant);
        app.render({ force: true });
      } catch (error) {
        console.error("Arkflight weapon fire failed", error);
        ui.notifications?.error(error?.message ?? "Weapon fire failed.");
      }
    });
    row.querySelector("[data-work-guns]")?.addEventListener("click", async () => {
      try { await game.arkflight.combat.workTheGuns(weaponState.key, combatant); app.render({ force: true }); }
      catch (error) { ui.notifications?.error(error?.message ?? "Work the Guns failed."); }
    });
    section.append(row);
    updateSolution();
  }
  return section;
}

async function addCurrentShip(app) {
  const ship = currentShip();
  const blockers = combatBlockers(ship);
  if (blockers.length) {
    ui.notifications?.warn(blockers.join(" "));
    return;
  }
  try {
    await game.arkflight.combat.start(ship.actor ?? ship.id);
    app.activeSection = "operations";
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight ship combat launch failed", error);
    ui.notifications?.error(error?.message ?? "Unable to add Arkflight ship to combat.");
  }
}

async function endCombat(app) {
  try {
    await game.arkflight?.combat?.stop?.();
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight ship combat stop failed", error);
    ui.notifications?.error(error?.message ?? "Unable to end Arkflight combat.");
  }
}

function targetCandidates() {
  const activeActorIds = new Set(arkflightCombatants().map((entry) => entry.actorId));
  return [...(game.actors?.contents ?? [])].filter((actor) => actor?.flags?.["arkflight-game"]?.ship && !activeActorIds.has(actor.id));
}

async function addTargetShip(app, actorId) {
  const actor = game.actors?.get?.(actorId);
  if (!actor) return;
  try {
    await game.arkflight.combat.start(actor, { allowNPC: true, rollInitiative: false });
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight target ship combat entry failed", error);
    ui.notifications?.error(error?.message ?? "Unable to add target ship.");
  }
}

function buildInactiveCombatPanel(app) {
  const ship = currentShip();
  const blockers = combatBlockers(ship);
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-combat-launch";
  panel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">SHIP COMBAT</div><h2>Add Ship to Combat</h2></div>
      <i class="fa-solid fa-burst"></i>
    </div>`;
  panel.append(metric("Combat Vessel", ship?.name ?? "No Current Ship"));
  panel.append(metric("Status", ship?.status ?? "Unavailable"));

  if (blockers.length) {
    const gate = document.createElement("div");
    gate.className = "arkflight-gm-launch-blockers";
    const heading = document.createElement("strong");
    heading.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Combat entry blocked';
    gate.append(heading);
    for (const blocker of blockers) {
      const row = document.createElement("span");
      row.textContent = blocker;
      gate.append(row);
    }
    panel.append(gate);
  }

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-command-actions";
  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "arkflight-gm-primary";
  launch.disabled = blockers.length > 0;
  launch.title = blockers.join(" • ");
  launch.innerHTML = '<i class="fa-solid fa-burst"></i> Add Ship to Combat';
  launch.addEventListener("click", () => addCurrentShip(app));
  actions.append(launch);
  panel.append(actions);
  return panel;
}

function buildActiveCombatPanel(app, combatant) {
  const state = game.arkflight?.combat?.state?.(combatant) ?? null;
  const round = Number(game.combat?.round ?? 0);
  const movement = state?.mobility?.movement ?? {};
  const maneuver = state?.mobility?.maneuver ?? {};
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-combat-active";
  panel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">FOUNDRY COMBAT TRACKER</div><h2>Round ${round || "—"} · ${foundry.utils.escapeHTML(combatant?.name ?? "Arkflight Ship")}</h2></div>
      <i class="fa-solid fa-burst"></i>
    </div>`;

  panel.append(
    metric("Arkflight Ships", String(arkflightCombatants().length)),
    metric("AP", `${state?.economy?.ap?.value ?? 0} / ${state?.economy?.ap?.max ?? 0}`),
    metric("RP", `${state?.economy?.rp?.value ?? 0} / ${state?.economy?.rp?.max ?? 0}`),
    metric("Movement", `${movement.used ?? 0} / ${movement.allowance ?? 0} hex · Speed ${state?.mobility?.speed ?? "—"}`),
    metric("Maneuver", `${maneuver.used ?? 0} / ${maneuver.allowance ?? 0} facing · ${state?.mobility?.maneuverability ?? "—"}/AP`),
    metric("Heading", state ? `${state.mobility.heading}°` : "—"),
    metric("Strain", `${state?.strain?.value ?? 0} / ${state?.strain?.max ?? 0}`),
    metric("Weapons", reloadSummary(state, round))
  );

  panel.append(weaponFireControl(app, combatant, state, round));

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-command-actions";
  const candidates = targetCandidates();
  if (candidates.length) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Target ship to add");
    select.innerHTML = candidates.map((actor) => `<option value="${actor.id}">${foundry.utils.escapeHTML(actor.name)}</option>`).join("");
    const addTarget = document.createElement("button");
    addTarget.type = "button";
    addTarget.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Add Target Ship';
    addTarget.addEventListener("click", () => addTargetShip(app, select.value));
    actions.append(select, addTarget);
  }
  const stop = document.createElement("button");
  stop.type = "button";
  stop.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> End Foundry Combat';
  stop.addEventListener("click", () => endCombat(app));
  actions.append(stop);
  panel.append(actions);
  return panel;
}

function wireShipsCombatButton(app) {
  if (app.activeSection !== "ships") return;
  const root = app.element;
  if (!root) return;
  const button = [...root.querySelectorAll(".arkflight-gm-launch-actions button")]
    .find((node) => node.textContent?.trim().includes("Launch Combat"));
  if (!button || button.dataset.arkflightCombatWired === "true") return;
  button.dataset.arkflightCombatWired = "true";
  button.addEventListener("click", () => addCurrentShip(app));
}

function wireShipsVoyageButton(app) {
  if (app.activeSection !== "ships") return;
  const root = app.element;
  if (!root) return;
  const button = [...root.querySelectorAll(".arkflight-gm-launch-actions button")]
    .find((node) => node.textContent?.trim().includes("Launch Voyage"));
  if (!button || button.dataset.arkflightVoyageWired === "true") return;
  button.dataset.arkflightVoyageWired = "true";
  button.addEventListener("click", () => {
    app.activeSection = "operations";
    app.render({ force: true });
  });
}

function enhanceOperations(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  wireShipsCombatButton(app);
  wireShipsVoyageButton(app);
  if (app.activeSection !== "operations") return;
  const root = app.element;
  if (!root) return;

  const content = root.querySelector(".arkflight-gm-content");
  if (!content || content.querySelector(".arkflight-gm-combat-launch, .arkflight-gm-combat-active")) return;

  const combatant = displayedCombatant();
  if (combatant) {
    const old = [...content.querySelectorAll(".arkflight-gm-panel")]
      .find((node) => node.querySelector("h2")?.textContent?.trim() === "Active Ship Combat");
    const panel = buildActiveCombatPanel(app, combatant);
    if (old) old.replaceWith(panel);
    else content.append(panel);
    return;
  }

  content.append(buildInactiveCombatPanel(app));
}

Hooks.on("renderArkflightGMOperations", (app) => enhanceOperations(app));
Hooks.on("renderApplicationV2", (app) => enhanceOperations(app));
Hooks.on("updateCombat", () => {
  const app = Object.values(ui.windows ?? {}).find((entry) => entry?.id === GM_OPERATIONS_ID || entry?.options?.id === GM_OPERATIONS_ID);
  app?.render?.({ force: true });
});
Hooks.on("updateCombatant", () => {
  const app = Object.values(ui.windows ?? {}).find((entry) => entry?.id === GM_OPERATIONS_ID || entry?.options?.id === GM_OPERATIONS_ID);
  app?.render?.({ force: true });
});
