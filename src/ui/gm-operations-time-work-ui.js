const GM_OPERATIONS_ID = "arkflight-gm-operations";
const MODULE_ID = "arkflight-game";

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function currentShip() { return game.arkflight?.ships?.getCurrent?.() ?? null; }
function shipActors() { return (game.actors?.contents ?? []).filter((actor) => actor?.type === "vehicle" && shipPayload(actor)); }
function activeJobs(actor) { return (shipPayload(actor)?.refit?.workOrders ?? []).filter((job) => !["complete", "complication"].includes(job.status)); }
function label(job) { return job.componentId || String(job.type || "Ship work").replaceAll("-", " "); }

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
    if (!result?.ok) throw new Error(result?.reason ?? "Unable to start work order.");
    ui.notifications?.info(`${actor.name}: work started on ${label(result.job)}.`);
    app.render({ force: true });
  } catch (error) {
    ui.notifications?.warn(error?.message ?? "Unable to start Arkflight work order.");
  }
}

function workOrderRow(app, actor, job) {
  const row = document.createElement("div");
  row.className = "arkflight-gm-metric-row";
  const left = document.createElement("span");
  left.textContent = `${label(job)} · ${String(job.type ?? "work").replaceAll("-", " ")}`;
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
  const note = document.createElement("p"); note.className = "arkflight-gm-muted"; note.textContent = "Only the GM advances world time. Every WORKING refit order progresses automatically; PLANNED orders wait until someone starts them."; time.append(note);
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
