const GM_OPERATIONS_ID = "arkflight-gm-operations";
const MODULE_ID = "arkflight-game";

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function currentShip() { return game.arkflight?.ships?.getCurrent?.() ?? null; }
function shipActors() { return (game.actors?.contents ?? []).filter((actor) => actor?.type === "vehicle" && shipPayload(actor)); }
function activeJobs(actor) { return (shipPayload(actor)?.refit?.workOrders ?? []).filter((job) => !["complete", "complication"].includes(job.status)); }
function workingCrewJobs(actor) { return activeJobs(actor).filter((job) => job.method === "crew" && job.status === "working"); }
function label(job) { return job.componentId || String(job.type || "Ship work").replaceAll("-", " "); }
function methodLabel(job) { return job.method === "shipyard" ? "Shipyard" : "Crew"; }

async function advanceHours(app, hours) {
  if (!game.user?.isGM) return;
  const amount = Math.max(0, Number(hours) || 0);
  if (!amount) return;
  if (typeof game.time?.advance !== "function") { ui.notifications?.error("Foundry world-time advancement is unavailable."); return; }
  try {
    await game.time.advance(Math.round(amount * 3600));
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight time advance failed", error);
    ui.notifications?.error(error?.message ?? "Unable to advance Arkflight world time.");
  }
}

async function startJob(app, actorId, jobId) {
  const actor = game.actors?.get(actorId);
  if (!actor) return;
  try {
    const result = await game.arkflight?.refit?.startWork?.(actor, jobId);
    if (!result?.ok) {
      if (result?.reason === "crew-work-already-active") throw new Error("This ship already has active crew refit work. Complete or stop that crew job before starting another.");
      throw new Error(result?.reason ?? "Unable to start work order.");
    }
    ui.notifications?.info(`${actor.name}: work started on ${label(result.job)}.`);
    app.render({ force: true });
  } catch (error) {
    ui.notifications?.warn(error?.message ?? "Unable to start Arkflight work order.");
  }
}

function chooseCrewJobDialog(actor, jobs) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const selectId = `arkflight-crew-job-pick-${actor.id}-${Date.now()}`;
    const options = jobs.map((job) => `<option value="${foundry.utils.escapeHTML(job.id)}">${foundry.utils.escapeHTML(label(job))} — ${foundry.utils.escapeHTML(String(job.type ?? "work").replaceAll("-", " "))} — ${Number(job.remainingHours ?? 0)}h</option>`).join("");
    const content = `<div class="arkflight-gm-crew-dialog"><p><strong>${foundry.utils.escapeHTML(actor.name)}</strong> has multiple legacy crew jobs marked WORKING.</p><p>Choose the one crew job that should remain active. Every other WORKING crew job will return to PLANNED with its remaining hours preserved.</p><select id="${selectId}">${options}</select></div>`;
    new DialogV2({
      window: { title: "Choose Active Crew Refit" },
      content,
      buttons: [
        { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => resolve(null) },
        { action: "keep", label: "Keep Selected Active", icon: "fa-solid fa-check", default: true, callback: () => resolve(document.getElementById(selectId)?.value ?? null) }
      ],
      close: () => resolve(null)
    }).render({ force: true });
  });
}

async function resolveCrewQueue(app, actor) {
  const jobs = workingCrewJobs(actor);
  if (jobs.length <= 1) return;
  const keepJobId = await chooseCrewJobDialog(actor, jobs);
  if (!keepJobId) return;
  try {
    const result = await game.arkflight?.refit?.resolveCrewConcurrency?.(actor, keepJobId);
    if (!result?.ok) throw new Error(result?.reason ?? "Unable to resolve crew refit queue.");
    ui.notifications?.info(`${actor.name}: one crew refit remains active; ${result.replanned?.length ?? 0} returned to planned.`);
    app.render({ force: true });
  } catch (error) {
    ui.notifications?.warn(error?.message ?? "Unable to resolve Arkflight crew refit queue.");
  }
}

function workOrderRow(app, actor, job) {
  const row = document.createElement("div");
  row.className = "arkflight-gm-metric-row";
  const left = document.createElement("span");
  left.textContent = `${label(job)} · ${String(job.type ?? "work").replaceAll("-", " ")} · ${methodLabel(job)}`;
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "8px";
  const status = document.createElement("strong");
  status.textContent = `${job.status} · ${Number(job.remainingHours ?? 0)}h`;
  right.append(status);
  if (job.status === "planned") {
    const start = document.createElement("button");
    start.type = "button";
    start.textContent = "Start Work";
    start.addEventListener("click", () => startJob(app, actor.id, job.id));
    right.append(start);
  }
  row.append(left, right);
  return row;
}

function shipJobsPanel(app, actor, kicker) {
  const jobs = activeJobs(actor);
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel";
  panel.innerHTML = `<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">${kicker}</div><h2>${foundry.utils.escapeHTML(actor.name)}</h2></div><i class="fa-solid fa-hammer"></i></div>`;
  const crewWorking = workingCrewJobs(actor);
  if (crewWorking.length > 1) {
    const warning = document.createElement("div");
    warning.className = "arkflight-gm-empty-state";
    const text = document.createElement("p");
    text.textContent = `${crewWorking.length} crew refit jobs are marked WORKING. Crew refit now allows only one active job per ship.`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Choose Active Crew Job";
    button.addEventListener("click", () => resolveCrewQueue(app, actor));
    warning.append(text, button);
    panel.append(warning);
  }
  if (!jobs.length) {
    const empty = document.createElement("p"); empty.className = "arkflight-gm-muted"; empty.textContent = "No active or planned work orders."; panel.append(empty);
  } else for (const job of jobs) panel.append(workOrderRow(app, actor, job));
  return panel;
}

function buildTimeWork(app) {
  const wrapper = document.createElement("div");
  wrapper.className = "arkflight-gm-time-work";
  wrapper.style.display = "grid";
  wrapper.style.gap = "14px";

  const time = document.createElement("article");
  time.className = "arkflight-gm-panel";
  time.innerHTML = `<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">WORLD TIME</div><h2>Advance Time</h2></div><i class="fa-solid fa-clock"></i></div><div class="arkflight-gm-metric-row"><span>Foundry World Time</span><strong>${Number(game.time?.worldTime ?? 0)}s</strong></div>`;
  const actions = document.createElement("div"); actions.className = "arkflight-gm-command-actions";
  for (const [labelText, hours] of [["+1 Hour",1],["+4 Hours",4],["+8 Hours",8],["+1 Day",24]]) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = labelText; button.addEventListener("click", () => advanceHours(app, hours)); actions.append(button);
  }
  const custom = document.createElement("input"); custom.type = "number"; custom.min = "1"; custom.step = "1"; custom.placeholder = "Hours"; custom.style.width = "90px";
  const customButton = document.createElement("button"); customButton.type = "button"; customButton.textContent = "Advance"; customButton.addEventListener("click", () => advanceHours(app, custom.value));
  actions.append(custom, customButton); time.append(actions);
  const note = document.createElement("p"); note.className = "arkflight-gm-muted"; note.textContent = "GM time advances all active shipyard jobs concurrently. Crew refit is one job at a time per ship; if a crew job finishes with time remaining, Arkflight asks before starting the next planned crew job."; time.append(note);
  wrapper.append(time);

  const current = currentShip();
  if (current?.actor) wrapper.append(shipJobsPanel(app, current.actor, "CURRENT SHIP WORK"));
  const others = shipActors().filter((actor) => actor.id !== current?.id && activeJobs(actor).length);
  if (others.length) {
    const heading = document.createElement("div"); heading.className = "arkflight-gm-kicker"; heading.textContent = "ALL SHIPS — OTHER ACTIVE WORK"; wrapper.append(heading);
    for (const actor of others) wrapper.append(shipJobsPanel(app, actor, "FLEET WORK"));
  }
  return wrapper;
}

function enhance(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "time-work") return;
  const root = app.element;
  if (!root) return;
  const placeholder = [...root.querySelectorAll(".arkflight-gm-empty-state")].find((node) => node.querySelector("h2")?.textContent?.trim() === "Time & Work");
  if (placeholder) placeholder.replaceWith(buildTimeWork(app));
}

Hooks.on("renderArkflightGMOperations", (app) => enhance(app));
Hooks.on("renderApplicationV2", (app) => enhance(app));
Hooks.on("arkflightRefitTimeAdvanced", () => game.arkflight?.gmOperations?.rendered && game.arkflight.gmOperations.render({ force: true }));
