import { SHIP_CATALOGS } from "../content/index.js";
import { componentEconomyQuote } from "../ship/refit-value.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";

const MODULE_ID = "arkflight-game";
const WORKBENCH = `/modules/${MODULE_ID}/assets/ui/shipwright/workbench`;
const SERVICE_FLAG = "refitServiceMode";
const FAMILIES = Object.freeze([
  { family: "shipMod", label: "Ship Mods", catalog: () => SHIP_CATALOGS.shipMods ?? {} },
  { family: "arkengineMod", label: "Arkengine Mods", catalog: () => SHIP_CATALOGS.arkengineMods ?? {} },
  { family: "weapon", label: "Weapons", catalog: () => SHIP_CATALOGS.weapons ?? {} }
]);

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function escape(value) { return foundry.utils.escapeHTML(String(value ?? "")); }
function service(actor) { const value = actor?.getFlag?.(MODULE_ID, SERVICE_FLAG); return ["crew", "dock", "shipyard"].includes(value) ? value : "crew"; }
function serviceLabel(mode) { return mode === "shipyard" ? "Shipyard" : mode === "dock" ? "Docked" : "Crew Refit"; }
function canManage(actor) { return Boolean(game.user?.isGM || actor?.isOwner); }
function currentScrap(actor) { return Math.max(0, Math.trunc(Number(shipFlag(actor)?.resources?.salvageParts?.value ?? 0))); }
function catalogForFamily(family) { return FAMILIES.find((entry) => entry.family === family)?.catalog?.() ?? {}; }
function componentName(family, id) { return catalogForFamily(family)?.[id]?.name ?? id; }

async function resolveEngineer(actor) {
  const ref = shipFlag(actor)?.crew?.stations?.engineer;
  if (!ref) return null;
  const direct = game.actors?.get?.(ref) ?? game.actors?.contents?.find?.((entry) => entry.uuid === ref || entry.name === ref) ?? null;
  if (direct) return direct;
  try { const doc = await fromUuid(ref); return doc?.documentName === "Actor" ? doc : null; } catch { return null; }
}

async function rollCrafting(engineer, dc, slug) {
  const skill = engineer?.skills?.crafting;
  if (!skill?.proficient || !skill?.check?.roll) throw new Error(`${engineer?.name ?? "Assigned Engineer"} is not proficient in Crafting.`);
  return new Promise((resolve, reject) => {
    Promise.resolve(skill.check.roll({
      dc: { value: Math.max(0, Math.trunc(Number(dc) || 0)), visible: true },
      extraRollOptions: ["action:arkflight-refit", `arkflight:refit:${slug}`],
      callback: (_roll, outcome, message) => resolve({ outcome, message })
    })).catch(reject);
  });
}

async function startQueued(actor, queued, noun) {
  const job = queued?.job ?? queued?.jobs?.[0];
  if (!queued?.ok || !job) throw new Error(`${noun} could not be queued: ${queued?.reason ?? "unknown error"}.`);
  const started = await game.arkflight?.refit?.startWork?.(actor, job.id);
  if (!started?.ok) {
    if (started?.reason === "crew-work-already-active") {
      ui.notifications?.info?.(`${noun} queued — another Crew Refit job is already active. It remains PLANNED until the crew is available.`);
      return { ...queued, queuedOnly: true, job };
    }
    throw new Error(`${noun} was queued but could not start: ${started?.reason ?? "unknown error"}.`);
  }
  ui.notifications?.info?.(`${noun} started — ${started.job.remainingHours}h remaining.`);
  return started;
}

function blueprintRows(actor) {
  const api = game.arkflight?.refit;
  return FAMILIES.flatMap(({ family, label }) => {
    let entries = [];
    try { entries = [...(api?.getBlueprints?.(actor, family) ?? [])]; } catch { entries = []; }
    return entries.map((entry) => {
      const component = entry.component ?? catalogForFamily(family)?.[entry.id];
      const economy = componentEconomyQuote(component);
      const refit = component?.data?.refit;
      return {
        family,
        familyLabel: label,
        id: entry.id ?? component?.id,
        name: component?.name ?? entry.name ?? entry.id,
        scrap: economy?.ok ? economy.fabrication.aetherScrap : Number(refit?.build?.partsCost ?? 0),
        dc: Number(refit?.build?.dc ?? 0),
        hours: Number(refit?.build?.timeHours ?? 0)
      };
    });
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function storedRows(actor) {
  const ship = shipFlag(actor);
  return FAMILIES.flatMap(({ family, label }) => {
    const counts = family === "shipMod" ? ship?.inventory?.shipMods ?? {} : family === "arkengineMod" ? ship?.inventory?.arkengineMods ?? {} : ship?.inventory?.weapons ?? {};
    return Object.entries(counts).filter(([, quantity]) => Number(quantity) > 0).map(([id, quantity]) => {
      const component = catalogForFamily(family)?.[id];
      const quote = componentEconomyQuote(component);
      return {
        family,
        familyLabel: label,
        id,
        name: component?.name ?? id,
        quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
        scrap: quote?.ok ? quote.breakdown.aetherScrap : 0
      };
    });
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function installedRows(actor) {
  const ship = shipFlag(actor);
  return FAMILIES.flatMap(({ family, label }) => {
    let layout;
    try { layout = installedSocketLayout(ship, SHIP_CATALOGS, family); } catch { return []; }
    return (layout?.placements ?? []).filter((entry) => !entry.overCapacity).map((entry, index) => ({
      family,
      familyLabel: label,
      id: entry.componentId,
      name: componentName(family, entry.componentId),
      socketIndices: [...(entry.socketIndices ?? [])],
      sourceJobId: entry.sourceJobId ?? "",
      rowKey: `${family}-${entry.componentId}-${index}`
    }));
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function activeRows(actor) {
  return (shipFlag(actor)?.refit?.workOrders ?? [])
    .filter((job) => ["planned", "working", "PLANNED", "WORKING"].includes(job.status))
    .map((job) => ({
      id: job.id,
      name: componentName(job.componentFamily, job.componentId) || job.componentId || "Ship work",
      type: String(job.type ?? "work").toUpperCase(),
      status: String(job.status).toUpperCase(),
      hours: Number(job.remainingHours ?? 0)
    }));
}

function rowMarkup(row, action, buttonLabel, meta) {
  return `<article class="arkflight-rf-row"><div><span>${escape(row.familyLabel ?? "Shipwright")}</span><strong>${escape(row.name)}</strong><small>${escape(meta)}</small></div><button type="button" data-rf-action="${action}" data-family="${escape(row.family)}" data-id="${escape(row.id)}" ${row.rowKey ? `data-row-key="${escape(row.rowKey)}"` : ""}>${escape(buttonLabel)}</button></article>`;
}

function styleOnce() {
  if (document.getElementById("arkflight-repairs-fabrication-style")) return;
  const style = document.createElement("style");
  style.id = "arkflight-repairs-fabrication-style";
  style.textContent = `
    .arkflight-workbench-hotspot.is-repairs-fabrication{left:75.5%;right:auto;width:22%;}
    .arkflight-workbench-hotspot.is-arkengine{left:2%;width:22%}.arkflight-workbench-hotspot.is-ship{left:26.5%;width:22%}.arkflight-workbench-hotspot.is-weapon{left:51%;right:auto;width:22%}
    .arkflight-rf-panel{position:relative;z-index:5;min-height:500px;padding:14px;background:linear-gradient(180deg,rgba(16,16,15,.96),rgba(9,10,10,.98));border:1px solid #5b4a2e;color:#e9dfc7;overflow:auto}
    .arkflight-rf-panel>header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid #5b4a2e}.arkflight-rf-panel h2{margin:0;color:#ead49b}.arkflight-rf-panel header small{color:#84a9b0}.arkflight-rf-back{min-width:150px}
    .arkflight-rf-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.arkflight-rf-summary article{padding:10px;border:1px solid #3c4748;background:#111719}.arkflight-rf-summary span{display:block;color:#8e9c9d;font-size:9px;text-transform:uppercase}.arkflight-rf-summary strong{font-size:16px;color:#dff4f6}
    .arkflight-rf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.arkflight-rf-card{min-width:0;padding:12px;border:1px solid #4f4432;background:linear-gradient(180deg,#191815,#111313)}.arkflight-rf-card h3{margin:0 0 3px;color:#d8bf79}.arkflight-rf-card>p{margin:0 0 10px;color:#8d9694;font-size:10px;line-height:1.35}
    .arkflight-rf-list{display:grid;gap:6px;max-height:250px;overflow:auto}.arkflight-rf-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px;border:1px solid #344044;background:#101517}.arkflight-rf-row div{min-width:0}.arkflight-rf-row span,.arkflight-rf-row small{display:block;color:#899697;font-size:8px}.arkflight-rf-row strong{display:block;color:#eee0ba;font-size:11px}.arkflight-rf-row button{width:auto!important;min-width:92px!important;height:30px!important;margin:0!important}.arkflight-rf-empty{padding:12px;border:1px dashed #3a4140;color:#737c7b;text-align:center;font-style:italic}
    .arkflight-rf-repair-note{padding:12px;border:1px solid #695839;background:#1a1712;color:#cdbb8b;line-height:1.4}.arkflight-rf-repair-note strong{color:#f0d48c}
    @media(max-width:900px){.arkflight-rf-grid{grid-template-columns:1fr}.arkflight-rf-summary{grid-template-columns:1fr}.arkflight-workbench-hotspot.is-repairs-fabrication{position:relative;left:auto;width:auto}}
  `;
  document.head.append(style);
}

async function fabricate(actor, family, id) {
  const item = catalogForFamily(family)?.[id];
  if (!item) throw new Error("Unknown blueprint component.");
  const mode = service(actor);
  const economy = componentEconomyQuote(item);
  const scrapCost = economy?.ok ? economy.fabrication.aetherScrap : Number(item.data?.refit?.build?.partsCost ?? 0);
  const dc = Number(item.data?.refit?.build?.dc ?? 0);
  if (currentScrap(actor) < scrapCost) throw new Error(`Fabrication requires ${scrapCost} Aether Scrap; only ${currentScrap(actor)} is aboard.`);

  if (mode === "crew") {
    const engineer = await resolveEngineer(actor);
    if (!engineer) throw new Error(`Assign an Engineer to ${actor.name} before crew fabrication.`);
    const check = await rollCrafting(engineer, dc, `fabricate:${id}`);
    if (!["success", "criticalSuccess"].includes(check.outcome)) {
      const spent = await game.arkflight?.refit?.spendAetherScrap?.(actor, scrapCost);
      if (!spent?.ok) throw new Error(spent?.reason ?? "Could not spend fabrication materials.");
      ui.notifications?.warn?.(`${item.name} fabrication failed. ${scrapCost} Aether Scrap was consumed.`);
      return;
    }
  }

  const queued = await game.arkflight?.refit?.queueBuild?.(actor, family, id, { method: mode, serviceMode: mode, paymentMethod: "scrap" });
  await startQueued(actor, queued, `Fabricate ${item.name}`);
}

async function breakdown(actor, family, id) {
  const quote = game.arkflight?.refit?.quoteBreakdown?.(actor, family, id, 1);
  if (!quote?.ok) throw new Error(quote?.reason ?? "That fitting cannot be broken down.");
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Break Down ${componentName(family, id)}` },
    content: `<p>Break down one intact <strong>${escape(componentName(family, id))}</strong> and recover <strong>${Number(quote.aetherScrapRecovered ?? 0)} Aether Scrap</strong>?</p>`
  });
  if (!confirmed) return;
  const result = await game.arkflight?.refit?.breakdownComponent?.(actor, family, id, 1);
  if (!result?.ok) throw new Error(result?.reason ?? "Breakdown failed.");
  ui.notifications?.info?.(`${componentName(family, id)} broken down — ${result.aetherScrapRecovered} Aether Scrap recovered.`);
}

async function removeInstalled(actor, family, id, rowKey) {
  const rows = installedRows(actor);
  const row = rows.find((entry) => entry.rowKey === rowKey) ?? rows.find((entry) => entry.family === family && entry.id === id);
  if (!row) throw new Error("That component is no longer installed.");
  const mode = service(actor);
  const queued = await game.arkflight?.refit?.queueRemove?.(actor, family, id, {
    method: mode,
    serviceMode: mode,
    socketIndices: [...row.socketIndices],
    sourceInstallJobId: row.sourceJobId
  });
  await startQueued(actor, queued, `Remove ${row.name}`);
}

function renderPanel(app, root) {
  const actor = app?.actor;
  if (!actor || !shipFlag(actor)) return;
  root.querySelector(".arkflight-rf-panel")?.remove();
  root.querySelector(".arkflight-workbench-stage")?.setAttribute("hidden", "");
  root.querySelector(".arkflight-workbench-help")?.setAttribute("hidden", "");

  const blueprints = blueprintRows(actor);
  const stored = storedRows(actor);
  const installed = installedRows(actor);
  const active = activeRows(actor);
  const mode = service(actor);
  const panel = document.createElement("section");
  panel.className = "arkflight-rf-panel";
  panel.innerHTML = `
    <header><div><span>SHIPWRIGHT STATION</span><h2>Repairs &amp; Fabrication</h2><small>${escape(serviceLabel(mode))} · ${currentScrap(actor)} Aether Scrap aboard</small></div><button type="button" class="arkflight-rf-back" data-rf-back><i class="fa-solid fa-arrow-left"></i> Back to Workbench</button></header>
    <div class="arkflight-rf-summary"><article><span>Known Blueprints</span><strong>${blueprints.length}</strong></article><article><span>Stored Fittings</span><strong>${stored.reduce((sum,row)=>sum+row.quantity,0)}</strong></article><article><span>Active Work</span><strong>${active.length}</strong></article></div>
    <div class="arkflight-rf-grid">
      <section class="arkflight-rf-card"><h3><img src="${WORKBENCH}/blueprint_fabrication_icon.webp" alt="" width="28" height="28"> Fabrication</h3><p>Build physical Ship Mods, Arkengine Mods, and Weapons from known blueprints. Crew fabrication uses the assigned Engineer's Crafting check; Dock and Shipyard work is professional.</p><div class="arkflight-rf-list">${blueprints.length ? blueprints.map((row)=>rowMarkup(row,"fabricate","Fabricate",`${row.scrap} Scrap · DC ${row.dc} · ${row.hours}h`)).join("") : '<div class="arkflight-rf-empty">No known fitting blueprints.</div>'}</div></section>
      <section class="arkflight-rf-card"><h3><img src="${WORKBENCH}/payment_aether_scrap.webp" alt="" width="28" height="28"> Breakdown &amp; Salvage</h3><p>Break down intact fittings stored in the Hold. Breakdown returns 25% of full fitting value as Aether Scrap.</p><div class="arkflight-rf-list">${stored.length ? stored.map((row)=>rowMarkup(row,"breakdown","Break Down",`x${row.quantity} aboard · ${row.scrap} Scrap recovered each`)).join("") : '<div class="arkflight-rf-empty">No intact fittings available for breakdown.</div>'}</div></section>
      <section class="arkflight-rf-card"><h3><img src="${WORKBENCH}/remove_uninstall_icon.webp" alt="" width="28" height="28"> Remove Installed Fittings</h3><p>Queue timed removal of installed hardware. Completed removal returns the intact component to the Hold.</p><div class="arkflight-rf-list">${installed.length ? installed.map((row)=>rowMarkup(row,"remove","Remove",`${row.socketIndices.length} socket${row.socketIndices.length===1?"":"s"}`)).join("") : '<div class="arkflight-rf-empty">No removable installed fittings.</div>'}</div></section>
      <section class="arkflight-rf-card"><h3><i class="fa-solid fa-hammer"></i> Ship Repairs</h3><div class="arkflight-rf-repair-note"><strong>Repair workbench connected.</strong><br>Repair work orders already exist in the refit backend, but the exact Hull/Lifeveil/Area repair effects are not authored yet. This station deliberately does not invent restoration amounts or costs. Once those repair rules are locked, the controls belong here without another UI redesign.</div></section>
      <section class="arkflight-rf-card" style="grid-column:1/-1"><h3><img src="${WORKBENCH}/work_order_hourglass_icon.webp" alt="" width="28" height="28"> Active Shipwright Work</h3><div class="arkflight-rf-list">${active.length ? active.map((row)=>`<article class="arkflight-rf-row"><div><span>${escape(row.type)}</span><strong>${escape(row.name)}</strong><small>${escape(row.status)} · ${row.hours}h remaining</small></div></article>`).join("") : '<div class="arkflight-rf-empty">No active shipwright work orders.</div>'}</div></section>
    </div>`;
  const stage = root.querySelector(".arkflight-workbench-stage");
  stage?.after(panel);

  panel.querySelector("[data-rf-back]")?.addEventListener("click", () => {
    panel.remove();
    root.querySelector(".arkflight-workbench-stage")?.removeAttribute("hidden");
    root.querySelector(".arkflight-workbench-help")?.removeAttribute("hidden");
  });

  for (const button of panel.querySelectorAll("[data-rf-action]")) {
    button.addEventListener("click", async () => {
      if (!canManage(actor)) return ui.notifications?.warn?.("You are not authorized to manage this vessel's Shipwright work.");
      button.disabled = true;
      try {
        const { rfAction: action, family, id, rowKey } = button.dataset;
        if (action === "fabricate") await fabricate(actor, family, id);
        else if (action === "breakdown") await breakdown(actor, family, id);
        else if (action === "remove") await removeInstalled(actor, family, id, rowKey);
        renderPanel(app, root);
        actor.sheet?.render?.(false);
      } catch (error) {
        console.error("Arkflight | Repairs & Fabrication action failed", error);
        ui.notifications?.error?.(error?.message ?? "Shipwright action failed.");
        button.disabled = false;
      }
    });
  }
}

function wireWorkspace(app, html) {
  const actor = app?.actor;
  if (!actor || !shipFlag(actor)) return;
  const candidate = html?.[0] ?? html ?? app?.element;
  const root = candidate?.matches?.(".arkflight-workspace-shell") ? candidate : candidate?.querySelector?.(".arkflight-workspace-shell");
  if (!root) return;
  styleOnce();
  const stage = root.querySelector(".arkflight-workbench-stage");
  if (!stage || stage.querySelector("[data-repairs-fabrication]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-workbench-hotspot is-repairs-fabrication";
  button.dataset.repairsFabrication = "";
  button.setAttribute("aria-label", "Open Repairs & Fabrication");
  button.title = "Open Repairs & Fabrication";
  button.innerHTML = `
    <img class="arkflight-workbench-backer" src="${WORKBENCH}/workbench_shipwright_board.webp" alt="">
    <img class="arkflight-workbench-feature" src="${WORKBENCH}/workbench_shipwright_feature.webp" alt="Repairs and Fabrication">
    <img class="arkflight-workbench-hover" src="${WORKBENCH}/selected_hover_frame.webp" alt="">
    <span class="arkflight-workbench-label" style="--label-plaque:url('${WORKBENCH}/label_plaque_backer.webp')">Repairs &amp; Fabrication</span>`;
  button.addEventListener("click", () => renderPanel(app, root));
  stage.append(button);
}

Hooks.on("renderApplicationV2", (app, html) => wireWorkspace(app, html));
Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.actor ?? app?.document;
  if (!actor || !shipFlag(actor)) return;
  const open = game.arkflight?.openShipwrightWorkspace;
  if (!open) return;
});