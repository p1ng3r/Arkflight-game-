import { SHIP_CATALOGS } from "../content/index.js";
import { componentEconomyQuote } from "../ship/refit-value.js";
import { resolveEngineeringInstallOutcome } from "../ship/refit-engineering.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";

const MODULE_ID = "arkflight-game";
const SERVICE_FLAG = "refitServiceMode";
const SERVICES = Object.freeze({
  crew: { label: "Crew Refit", note: "Full Aether Scrap cost · Crafting check · one active crew job" },
  dock: { label: "Docked", note: "25% off installation and repairs · automatic professional work · one active dock job" },
  shipyard: { label: "Shipyard", note: "50% off installation and repairs · automatic work · multiple jobs may run at once" }
});

function rootFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}
function actorFrom(app) { const actor = app?.actor ?? app?.document ?? null; return actor?.documentName === "Actor" ? actor : null; }
function ship(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function canManage(actor) { return Boolean(game.user?.isGM || actor?.isOwner); }
function service(actor) { const value = actor?.getFlag?.(MODULE_ID, SERVICE_FLAG); return SERVICES[value] ? value : "crew"; }
function catalog(family) { return family === "arkengineMod" ? SHIP_CATALOGS.arkengineMods : SHIP_CATALOGS.shipMods; }
function itemFor(family, id) { return catalog(family)?.[id] ?? null; }
function nameFor(family, id) { return itemFor(family, id)?.name ?? id; }
function scrap(actor) { return Math.max(0, Math.trunc(Number(ship(actor)?.resources?.salvageParts?.value ?? 0))); }
function quote(family, id) { return componentEconomyQuote(itemFor(family, id)); }

function assignmentFor(actor, family, id) {
  const current = ship(actor);
  const item = itemFor(family, id);
  if (!current || !item) return null;
  const layout = installedSocketLayout(current, SHIP_CATALOGS, family);
  if (layout.overBy > 0) return null;
  const cost = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1)));
  const occupied = new Set(layout.occupied);
  const sockets = [];
  for (let index = 0; index < layout.capacity && sockets.length < cost; index += 1) if (!occupied.has(index)) sockets.push(index);
  return sockets.length === cost ? { family, componentId: id, socketIndices: sockets } : null;
}

async function resolveActorReference(reference) {
  if (!reference) return null;
  if (reference?.documentName === "Actor") return reference;
  if (typeof reference === "object") return resolveActorReference(reference.actorUuid ?? reference.uuid ?? reference.actorId ?? reference.id ?? reference.name ?? null);
  const direct = game.actors?.get?.(reference) ?? game.actors?.contents?.find?.((entry) => entry.uuid === reference || entry.name === reference) ?? null;
  if (direct) return direct;
  try { const resolved = await fromUuid(reference); return resolved?.documentName === "Actor" ? resolved : null; } catch { return null; }
}
async function engineerFor(actor) { return resolveActorReference(ship(actor)?.crew?.stations?.engineer ?? null); }
async function rollCrafting(engineer, dc, slug) {
  const skill = engineer?.skills?.crafting;
  if (!skill?.proficient || !skill?.check?.roll) throw new Error(`${engineer?.name ?? "The assigned Engineer"} is not proficient in Crafting.`);
  return new Promise((resolve, reject) => {
    Promise.resolve(skill.check.roll({
      dc: { value: Math.max(0, Math.trunc(Number(dc) || 0)), visible: true },
      extraRollOptions: ["action:arkflight-refit", `arkflight:refit:${slug}`],
      callback: (_roll, outcome, message) => resolve({ outcome, message })
    })).catch(reject);
  });
}
async function startJob(actor, queued, noun) {
  const job = queued?.job ?? queued?.jobs?.[0];
  if (!queued?.ok || !job) throw new Error(`${noun} could not be queued: ${queued?.reason ?? "unknown error"}.`);
  const started = await game.arkflight?.refit?.startWork?.(actor, job.id);
  if (!started?.ok) throw new Error(`${noun} was queued but could not start: ${started?.reason ?? "unknown error"}.`);
  ui.notifications?.info?.(`${noun} started — ${started.job.remainingHours}h remaining.`);
  actor.sheet?.render?.(false);
  return started;
}

async function crewBuild(actor, family, id) {
  const item = itemFor(family, id); const economy = quote(family, id); const spec = item?.data?.refit?.build;
  if (!item || !economy?.ok || !spec) throw new Error("That blueprint has no valid fabrication specification.");
  const engineer = await engineerFor(actor);
  if (!engineer) throw new Error(`Assign an Engineer to ${actor.name} before crew fabrication.`);
  const result = await rollCrafting(engineer, spec.dc, `build:${id}`);
  if (!["success", "criticalSuccess"].includes(result.outcome)) {
    const spent = await game.arkflight?.refit?.spendAetherScrap?.(actor, economy.fabrication.aetherScrap);
    if (!spent?.ok) throw new Error(`Fabrication failed and the Aether Scrap cost could not be settled: ${spent?.reason ?? "unknown error"}.`);
    ui.notifications?.warn?.(`${engineer.name} fails to fabricate ${item.name}. ${economy.fabrication.aetherScrap} Aether Scrap is consumed.`);
    actor.sheet?.render?.(false); return;
  }
  await startJob(actor, await game.arkflight?.refit?.queueBuild?.(actor, family, id, { method: "crew", serviceMode: "crew" }), `Fabricate ${item.name}`);
}
async function automaticBuild(actor, family, id, mode) {
  await startJob(actor, await game.arkflight?.refit?.queueBuild?.(actor, family, id, { method: mode === "shipyard" ? "shipyard" : "crew", serviceMode: mode }), `Fabricate ${nameFor(family, id)}`);
}
async function crewInstall(actor, family, id) {
  const assignment = assignmentFor(actor, family, id); const item = itemFor(family, id); const spec = item?.data?.refit?.install;
  if (!assignment) throw new Error("No legal free sockets are available. Resolve over-capacity or remove a fitting first.");
  if (!item || !spec) throw new Error("That fitting has no valid installation specification.");
  const engineer = await engineerFor(actor);
  if (!engineer) throw new Error(`Assign an Engineer to ${actor.name} before crew installation.`);
  const check = await rollCrafting(engineer, spec.dc, `install:${id}`);
  const outcome = resolveEngineeringInstallOutcome(check.outcome, spec.timeHours);
  if (!outcome.install) {
    const settled = await game.arkflight?.refit?.recordInstallFailure?.(actor, assignment, { workerActorUuid: engineer.uuid, outcome: check.outcome, elapsedHours: outcome.timeHours });
    if (!settled?.ok) throw new Error(`Failed installation could not be recorded: ${settled?.reason ?? "unknown error"}.`);
    ui.notifications?.warn?.(`${item.name} was not installed. ${settled.partsSpent} Aether Scrap was consumed.${outcome.complication ? " A complication was recorded." : ""}`);
    actor.sheet?.render?.(false); return;
  }
  const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, { method: "crew", serviceMode: "crew" });
  const job = queued?.jobs?.[0];
  if (job && check.outcome === "criticalSuccess") {
    const current = ship(actor); const reduced = Math.max(1, Math.ceil(job.durationHours / 2));
    const patched = { ...job, durationHours: reduced, remainingHours: reduced, result: { ...(job.result ?? {}), outcome: check.outcome, workerActorUuid: engineer.uuid } };
    const workOrders = current.refit.workOrders.map((entry) => entry.id === job.id ? patched : entry);
    await actor.update({ [`flags.${MODULE_ID}.ship.refit.workOrders`]: workOrders });
    queued.jobs = [patched]; queued.ship = ship(actor);
  }
  await startJob(actor, queued, `Install ${item.name}`);
}
async function automaticInstall(actor, family, id, mode) {
  const assignment = assignmentFor(actor, family, id);
  if (!assignment) throw new Error("No legal free sockets are available. Resolve over-capacity or remove a fitting first.");
  const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, { method: mode === "shipyard" ? "shipyard" : "crew", serviceMode: mode });
  await startJob(actor, queued, `Install ${nameFor(family, id)}`);
}
async function breakdown(actor, family, id) {
  const q = await game.arkflight?.refit?.quoteBreakdown?.(actor, family, id, 1);
  if (!q?.ok) throw new Error(q?.reason ?? "That fitting cannot be broken down.");
  const confirmed = await foundry.applications.api.DialogV2.confirm({ window: { title: `Break Down ${nameFor(family, id)}?` }, content: `<p>Destroy one intact fitting and recover <strong>${q.aetherScrap} Aether Scrap</strong>.</p>` });
  if (!confirmed) return;
  const result = await game.arkflight?.refit?.breakdownComponent?.(actor, family, id, 1);
  if (!result?.ok) throw new Error(result?.reason ?? "Breakdown failed.");
  ui.notifications?.info?.(`${nameFor(family, id)} broken down for ${result.aetherScrapGained ?? q.aetherScrap} Aether Scrap.`);
  actor.sheet?.render?.(false);
}

function servicePanel(actor) {
  const mode = service(actor); const available = scrap(actor);
  const el = document.createElement("section");
  el.className = "arkflight-refit-service-panel";
  el.innerHTML = `<div class="arkflight-refit-service-head"><div><span>REFIT CONDITIONS</span><strong>${SERVICES[mode].label}</strong><small>${SERVICES[mode].note}</small></div><div class="arkflight-aether-scrap"><span>Aether Scrap</span><strong>${available}</strong><small>10 gp each</small></div></div><div class="arkflight-refit-service-buttons">${Object.entries(SERVICES).map(([key, value]) => `<button type="button" data-refit-service="${key}" class="${key === mode ? "is-active" : ""}">${value.label}</button>`).join("")}</div></section>`;
  return el;
}
function decorateCards(root, actor) {
  const mode = service(actor);
  for (const card of root.querySelectorAll(".arkflight-refit-panel .arkflight-installed-card")) {
    const action = card.querySelector("[data-refit-install], [data-refit-build]");
    if (!action) continue;
    const family = action.dataset.family; const id = action.dataset.id; const economy = quote(family, id);
    if (!economy?.ok) continue;
    card.querySelector(".arkflight-refit-economy-line")?.remove();
    const line = document.createElement("div"); line.className = "arkflight-refit-economy-line";
    if (action.hasAttribute("data-refit-build")) line.innerHTML = `<span>Value <b>${economy.fullValueGp.toLocaleString()} gp</b></span><span>Fabricate <b>${economy.fabrication.aetherScrap} Scrap</b></span><span>Resale <b>${economy.resale.gpValue.toLocaleString()} gp</b></span>`;
    else line.innerHTML = `<span>Value <b>${economy.fullValueGp.toLocaleString()} gp</b></span><span>Install <b>${economy.installation[mode].aetherScrap} Scrap</b></span><span>Breakdown <b>${economy.breakdown.aetherScrap} Scrap</b></span><span>Resale <b>${economy.resale.gpValue.toLocaleString()} gp</b></span>`;
    const actions = card.querySelector(".arkflight-refit-actions"); if (actions) actions.before(line); else card.append(line);
    const buttons = [...card.querySelectorAll("[data-refit-install], [data-refit-build]")];
    buttons.forEach((button, index) => { button.hidden = index > 0; if (index === 0) { button.dataset.refitSelectedService = mode; button.textContent = action.hasAttribute("data-refit-build") ? `Fabricate — ${SERVICES[mode].label}` : `Install — ${SERVICES[mode].label}`; } });
    if (action.hasAttribute("data-refit-install") && canManage(actor)) {
      let breakButton = card.querySelector("[data-refit-breakdown]");
      if (!breakButton) { breakButton = document.createElement("button"); breakButton.type = "button"; breakButton.dataset.refitBreakdown = ""; breakButton.dataset.family = family; breakButton.dataset.id = id; breakButton.textContent = `Break Down → ${economy.breakdown.aetherScrap} Scrap`; actions?.append(breakButton); }
    }
  }
}
function refresh(app, html) {
  const root = rootFrom(app, html); const actor = actorFrom(app);
  if (!root || !actor || !ship(actor)) return;
  const refit = root.querySelector(".arkflight-refit-summary-grid")?.closest("main");
  if (!refit) return;
  refit.querySelector(".arkflight-refit-service-panel")?.remove();
  refit.querySelector(".arkflight-panel-heading")?.after(servicePanel(actor));
  decorateCards(root, actor);
  if (root.dataset.refitGameplayWired === "true") return;
  root.dataset.refitGameplayWired = "true";
  root.addEventListener("click", async (event) => {
    const serviceButton = event.target.closest?.("[data-refit-service]");
    const buildButton = event.target.closest?.("[data-refit-build]");
    const installButton = event.target.closest?.("[data-refit-install]");
    const breakdownButton = event.target.closest?.("[data-refit-breakdown]");
    if (!serviceButton && !buildButton && !installButton && !breakdownButton) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!canManage(actor)) return;
    try {
      if (serviceButton) { await actor.setFlag(MODULE_ID, SERVICE_FLAG, serviceButton.dataset.refitService); actor.sheet?.render?.(false); return; }
      if (breakdownButton) { await breakdown(actor, breakdownButton.dataset.family, breakdownButton.dataset.id); return; }
      const mode = service(actor);
      if (buildButton) { if (mode === "crew") await crewBuild(actor, buildButton.dataset.family, buildButton.dataset.id); else await automaticBuild(actor, buildButton.dataset.family, buildButton.dataset.id, mode); return; }
      if (installButton) { if (mode === "crew") await crewInstall(actor, installButton.dataset.family, installButton.dataset.id); else await automaticInstall(actor, installButton.dataset.family, installButton.dataset.id, mode); }
    } catch (error) { console.error("Arkflight | Refit gameplay action failed", error); ui.notifications?.error?.(error?.message ?? "Refit action failed."); }
  }, true);
}

Hooks.on("renderActorSheet", refresh);
Hooks.on("renderApplicationV2", refresh);
