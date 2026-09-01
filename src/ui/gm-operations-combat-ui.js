const GM_OPERATIONS_ID = "arkflight-gm-operations";

function currentShip() {
  return game.arkflight?.ships?.getCurrent?.() ?? null;
}

function combatState() {
  return game.arkflight?.combat?.state ?? null;
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
  if (combatState()) blockers.push("Arkflight ship combat is already active.");
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

async function launchCombat(app) {
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
    ui.notifications?.error(error?.message ?? "Unable to launch Arkflight ship combat.");
  }
}

async function endCombat(app) {
  try {
    await game.arkflight?.combat?.stop?.();
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight ship combat stop failed", error);
    ui.notifications?.error(error?.message ?? "Unable to end Arkflight ship combat.");
  }
}

async function nextRound(app) {
  try {
    await game.arkflight?.combat?.nextRound?.();
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight ship combat next round failed", error);
    ui.notifications?.error(error?.message ?? "Unable to advance Arkflight ship combat.");
  }
}

function buildInactiveCombatPanel(app) {
  const ship = currentShip();
  const blockers = combatBlockers(ship);
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-combat-launch";
  panel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">SHIP COMBAT</div><h2>Launch Combat</h2></div>
      <i class="fa-solid fa-burst"></i>
    </div>`;
  panel.append(metric("Combat Vessel", ship?.name ?? "No Current Ship"));
  panel.append(metric("Status", ship?.status ?? "Unavailable"));

  if (blockers.length) {
    const gate = document.createElement("div");
    gate.className = "arkflight-gm-launch-blockers";
    const heading = document.createElement("strong");
    heading.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Combat launch blocked';
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
  launch.innerHTML = '<i class="fa-solid fa-burst"></i> Launch Ship Combat';
  launch.addEventListener("click", () => launchCombat(app));
  actions.append(launch);
  panel.append(actions);
  return panel;
}

function buildActiveCombatPanel(app, state) {
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-combat-active";
  panel.innerHTML = `
    <div class="arkflight-gm-card-heading">
      <div><div class="arkflight-gm-kicker">ACTIVE SHIP COMBAT</div><h2>Combat Round ${Number(state?.round ?? 1)}</h2></div>
      <i class="fa-solid fa-burst"></i>
    </div>`;

  panel.append(
    metric("Facing", String(state?.facing ?? "—").replaceAll("-", " ")),
    metric("Range", String(state?.range ?? "—").replaceAll("-", " ")),
    metric("Actions", `${state?.economy?.actions?.value ?? 0} / ${state?.economy?.actions?.max ?? 0}`),
    metric("Reactions", `${state?.economy?.reactions?.value ?? 0} / ${state?.economy?.reactions?.max ?? 0}`),
    metric("Strain", `${state?.strain?.value ?? 0} / ${state?.strain?.max ?? 0}`)
  );

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-command-actions";
  const next = document.createElement("button");
  next.type = "button";
  next.innerHTML = '<i class="fa-solid fa-forward-step"></i> Next Round';
  next.addEventListener("click", () => nextRound(app));
  const stop = document.createElement("button");
  stop.type = "button";
  stop.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> End Combat';
  stop.addEventListener("click", () => endCombat(app));
  actions.append(next, stop);
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
  button.addEventListener("click", () => launchCombat(app));
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

  const state = combatState();
  if (state) {
    const old = [...content.querySelectorAll(".arkflight-gm-panel")]
      .find((node) => node.querySelector("h2")?.textContent?.trim() === "Active Ship Combat");
    const panel = buildActiveCombatPanel(app, state);
    if (old) old.replaceWith(panel);
    else content.append(panel);
    return;
  }

  content.append(buildInactiveCombatPanel(app));
}

Hooks.on("renderArkflightGMOperations", (app) => enhanceOperations(app));
Hooks.on("renderApplicationV2", (app) => enhanceOperations(app));
