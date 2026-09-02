import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { componentEconomyQuote } from "../ship/refit-value.js";
import { resolveEngineeringInstallOutcome } from "../ship/refit-engineering.js";
import { installedSocketLayout } from "../ship/refit-sockets.js";

const MODULE_ID = "arkflight-game";
const ROOT = `modules/${MODULE_ID}/assets/ui/shipwright`;
const WORKBENCH = `${ROOT}/workbench`;
const SERVICE_FLAG = "refitServiceMode";
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

const ASSETS = Object.freeze({
  table: `${WORKBENCH}/workbench_table.webp`,
  plaque: `${WORKBENCH}/label_plaque_backer.webp`,
  hover: `${WORKBENCH}/selected_hover_frame.webp`,
  inventoryTray: `${WORKBENCH}/owned_inventory_tray_backer.webp`,
  workTray: `${WORKBENCH}/work_order_tray_backer.webp`,
  scroll: `${WORKBENCH}/install_scroll_horizontal.webp`,
  scrap: `${WORKBENCH}/payment_aether_scrap.webp`,
  gold: `${WORKBENCH}/payment_gold_purse.webp`,
  engineerSeal: `${WORKBENCH}/engineer_crafting_seal.webp`,
  hourglass: `${WORKBENCH}/work_order_hourglass_icon.webp`,
  remove: `${WORKBENCH}/remove_uninstall_icon.webp`,
  blueprint: `${WORKBENCH}/blueprint_fabrication_icon.webp`,
  compatible: `${WORKBENCH}/compatible_socket_overlay.webp`,
  incompatible: `${WORKBENCH}/incompatible_socket_overlay.webp`,
  working: `${WORKBENCH}/working_in_progress_socket_overlay.webp`,
  reserved: `${WORKBENCH}/locked_reserved_socket_overlay.webp`,
  completed: `${WORKBENCH}/completed_installed_socket_overlay.webp`,
  categories: Object.freeze({
    arkengine: { feature: `${WORKBENCH}/workbench_arkengine_feature.webp`, backer: `${WORKBENCH}/workbench_arkengine_board.webp`, board: `${ROOT}/visual-boards/arkengine_mod_board_generic.webp` },
    ship: { feature: `${WORKBENCH}/workbench_ship_feature.webp`, backer: `${WORKBENCH}/workbench_ship_board.webp`, board: `${ROOT}/visual-boards/ship_mod_board_generic_side.webp` },
    weapon: { feature: `${WORKBENCH}/workbench_weapon_feature.webp`, backer: `${WORKBENCH}/workbench_weapon_board.webp`, board: `${ROOT}/visual-boards/weapon_board_generic_top.webp` }
  })
});

const SOCKET_ART = Object.freeze({
  ship: `${ROOT}/sockets/socket_ship_flexible.webp`,
  arkengine: `${ROOT}/sockets/socket_engine_flexible.webp`,
  weapon: `${ROOT}/sockets/socket_weapon_flexible.webp`
});

const POSITIONS = Object.freeze({
  ship: [[24,55],[43,30],[53,60],[76,54],[34,48],[64,43],[46,72],[70,66],[30,36],[58,35],[82,48],[18,62]],
  arkengine: [[50,16],[27,47],[73,47],[50,80],[35,31],[65,31],[35,68],[65,68],[50,49],[22,63],[78,63],[50,90]],
  weapon: [[50,12],[20,36],[80,36],[20,58],[80,58],[50,88],[50,43],[50,62],[32,48],[68,48],[32,70],[68,70]]
});

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return actor?.type === "vehicle" && Boolean(shipFlag(actor)); }
function service(actor) { const value = actor?.getFlag?.(MODULE_ID, SERVICE_FLAG); return ["crew","dock","shipyard"].includes(value) ? value : "crew"; }
function serviceLabel(mode) { return mode === "shipyard" ? "Shipyard" : mode === "dock" ? "Docked" : "Crew Refit"; }
function familyFor(group) { return group === "arkengine" ? "arkengineMod" : group === "ship" ? "shipMod" : "weapon"; }
function catalogFor(group) { return group === "arkengine" ? SHIP_CATALOGS.arkengineMods : group === "ship" ? SHIP_CATALOGS.shipMods : SHIP_CATALOGS.weapons; }
function escape(value) { return foundry.utils.escapeHTML(String(value ?? "")); }
function currentScrap(actor) { return Math.max(0, Math.trunc(Number(shipFlag(actor)?.resources?.salvageParts?.value ?? 0))); }

function inventoryRows(actor, group) {
  const ship = shipFlag(actor);
  const catalog = catalogFor(group) ?? {};
  if (group === "weapon") return [];
  const counts = group === "ship" ? ship?.inventory?.shipMods ?? {} : ship?.inventory?.arkengineMods ?? {};
  return Object.entries(counts).filter(([, qty]) => Number(qty) > 0).map(([id, qty]) => ({
    id,
    name: catalog[id]?.name ?? id,
    quantity: Number(qty),
    family: familyFor(group),
    draggable: true
  }));
}

function socketRows(actor, group) {
  const ship = shipFlag(actor);
  const derived = deriveShip(ship, SHIP_CATALOGS);
  let capacity = 0;
  let occupied = new Set();
  let placements = [];
  if (group === "ship" || group === "arkengine") {
    const layout = installedSocketLayout(ship, SHIP_CATALOGS, familyFor(group));
    capacity = layout.capacity;
    occupied = new Set(layout.occupied);
    placements = layout.placements ?? [];
  } else {
    const hull = SHIP_CATALOGS.hulls?.[ship?.hull?.chassisId] ?? null;
    const mounts = hull?.data?.weaponMounts ?? hull?.data?.weaponSockets ?? hull?.weaponMounts ?? hull?.weaponSockets ?? derived?.stats?.weaponMounts ?? [];
    if (Array.isArray(mounts)) capacity = mounts.length;
    else if (mounts && typeof mounts === "object") capacity = Object.values(mounts).reduce((sum, row) => sum + Math.max(0, Math.trunc(Number(row?.count ?? row?.max ?? row) || 0)), 0);
    else capacity = Math.max(0, Math.trunc(Number(mounts) || 0));
    capacity = Math.max(capacity, ship?.weapons?.length ?? 0);
    occupied = new Set(Array.from({ length: ship?.weapons?.length ?? 0 }, (_, index) => index));
  }
  return Array.from({ length: capacity }, (_, index) => {
    const [left, top] = POSITIONS[group][index % POSITIONS[group].length];
    const placement = placements.find((row) => row.socketIndices?.includes(index));
    return { index, left, top, occupied: occupied.has(index), componentId: placement?.componentId ?? "", art: SOCKET_ART[group] };
  });
}

function workOrders(actor) {
  return (shipFlag(actor)?.refit?.workOrders ?? []).filter((job) => ["PLANNED","WORKING"].includes(job.status)).map((job) => ({
    id: job.id,
    name: job.componentName ?? job.componentId ?? "Refit work",
    status: job.status,
    hours: Number(job.remainingHours ?? 0),
    working: job.status === "WORKING"
  }));
}

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
    Promise.resolve(skill.check.roll({ dc: { value: Math.max(0, Math.trunc(Number(dc) || 0)), visible: true }, extraRollOptions: ["action:arkflight-refit", `arkflight:refit:${slug}`], callback: (_roll, outcome, message) => resolve({ outcome, message }) })).catch(reject);
  });
}

function anchoredAssignment(actor, group, componentId, socketIndex) {
  const family = familyFor(group);
  if (family === "weapon") return null;
  const item = catalogFor(group)?.[componentId];
  const layout = installedSocketLayout(shipFlag(actor), SHIP_CATALOGS, family);
  const cost = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1)));
  const occupied = new Set(layout.occupied);
  if (occupied.has(socketIndex)) return null;
  const picks = [socketIndex];
  for (let index = 0; index < layout.capacity && picks.length < cost; index += 1) if (index !== socketIndex && !occupied.has(index)) picks.push(index);
  return picks.length === cost ? { family, componentId, socketIndices: picks } : null;
}

async function startQueued(actor, queued, noun) {
  const job = queued?.job ?? queued?.jobs?.[0];
  if (!queued?.ok || !job) throw new Error(`${noun} could not be queued: ${queued?.reason ?? "unknown error"}.`);
  const started = await game.arkflight?.refit?.startWork?.(actor, job.id);
  if (!started?.ok) throw new Error(`${noun} was queued but could not start: ${started?.reason ?? "unknown error"}.`);
  ui.notifications?.info?.(`${noun} started — ${started.job.remainingHours}h remaining.`);
  return started;
}

async function installWithAether(actor, group, componentId, socketIndex) {
  const family = familyFor(group);
  const item = catalogFor(group)?.[componentId];
  const spec = item?.data?.refit?.install;
  const assignment = anchoredAssignment(actor, group, componentId, socketIndex);
  if (!item || !spec || !assignment) throw new Error("That fitting cannot be assigned to the selected socket.");
  const mode = service(actor);
  if (mode === "crew") {
    const engineer = await resolveEngineer(actor);
    if (!engineer) throw new Error(`Assign an Engineer to ${actor.name} before crew installation.`);
    const check = await rollCrafting(engineer, spec.dc, `install:${componentId}`);
    const outcome = resolveEngineeringInstallOutcome(check.outcome, spec.timeHours);
    if (!outcome.install) {
      const failed = await game.arkflight?.refit?.recordInstallFailure?.(actor, assignment, { workerActorUuid: engineer.uuid, outcome: check.outcome, elapsedHours: outcome.timeHours });
      if (!failed?.ok) throw new Error(failed?.reason ?? "Failed installation could not be recorded.");
      ui.notifications?.warn?.(`${item.name} was not installed. ${failed.partsSpent} Aether Scrap was consumed.`);
      return;
    }
    const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, { method: "crew", serviceMode: "crew" });
    const job = queued?.jobs?.[0];
    if (job && check.outcome === "criticalSuccess") {
      const current = shipFlag(actor);
      const reduced = Math.max(1, Math.ceil(job.durationHours / 2));
      const patched = { ...job, durationHours: reduced, remainingHours: reduced, result: { ...(job.result ?? {}), outcome: check.outcome, workerActorUuid: engineer.uuid } };
      await actor.update({ [`flags.${MODULE_ID}.ship.refit.workOrders`]: current.refit.workOrders.map((entry) => entry.id === job.id ? patched : entry) });
      queued.jobs = [patched];
    }
    await startQueued(actor, queued, `Install ${item.name}`);
    return;
  }
  const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, { method: mode === "shipyard" ? "shipyard" : "crew", serviceMode: mode });
  await startQueued(actor, queued, `Install ${item.name}`);
}

async function installDialog(actor, group, componentId, socketIndex) {
  if (group === "weapon") {
    ui.notifications?.warn?.("Weapon inventory/refit persistence is not migrated into the timed refit backend yet. The hardpoint board is visual-only in this first build.");
    return;
  }
  const item = catalogFor(group)?.[componentId];
  const economy = componentEconomyQuote(item);
  const spec = item?.data?.refit?.install;
  if (!item || !economy?.ok || !spec) throw new Error("That fitting has no valid installation specification.");
  const mode = service(actor);
  const scrapCost = economy.installation?.[mode]?.aetherScrap ?? economy.installation?.crew?.aetherScrap ?? 0;
  const gpCost = economy.installation?.[mode]?.gpValue ?? economy.installation?.crew?.gpValue ?? 0;
  const engineer = await resolveEngineer(actor);
  const engineerName = engineer?.name ?? "No Engineer assigned";
  const crafting = Number(engineer?.skills?.crafting?.mod ?? engineer?.skills?.crafting?.modifier ?? 0);
  const canAffordScrap = currentScrap(actor) >= scrapCost;
  const goldAllowed = mode !== "crew";
  const content = `<div class="arkflight-install-scroll" style="--install-scroll:url('${ASSETS.scroll}')">
    <header><div><span>SHIPWRIGHT WORK ORDER</span><h2>${escape(item.name)}</h2><p>${escape(serviceLabel(mode))} · Socket ${socketIndex + 1}</p></div><img src="${ASSETS.engineerSeal}" alt="Engineer seal"></header>
    <div class="arkflight-install-scroll-grid"><section><h3>Installation</h3><dl><div><dt>Install DC</dt><dd>${Number(spec.dc ?? 0)}</dd></div><div><dt>Base Time</dt><dd>${Number(spec.timeHours ?? 0)} hours</dd></div><div><dt>Engineer</dt><dd>${escape(engineerName)}${engineer ? ` (${crafting >= 0 ? "+" : ""}${crafting} Crafting)` : ""}</dd></div></dl></section>
    <section><h3>Payment</h3><div class="arkflight-payment-options"><label class="${canAffordScrap ? "" : "is-disabled"}"><input type="radio" name="arkflight-payment" value="scrap" ${canAffordScrap ? "checked" : "disabled"}><img src="${ASSETS.scrap}" alt="Aether Scrap"><strong>${scrapCost} Aether Scrap</strong><small>You have ${currentScrap(actor)}</small></label><label class="${goldAllowed ? "is-pending" : "is-disabled"}"><input type="radio" name="arkflight-payment" value="gold" disabled><img src="${ASSETS.gold}" alt="Gold"><strong>${Number(gpCost).toLocaleString()} gp</strong><small>${goldAllowed ? "Party treasury hookup pending" : "Available only Docked or at a Shipyard"}</small></label></div></section></div>
    <footer><img src="${ASSETS.hourglass}" alt=""><span>${mode === "crew" ? "Engineer rolls Crafting. Success creates a timed work order." : "Professional installation creates a timed work order automatically."}</span></footer></div>`;
  const confirmed = await DialogV2.confirm({ window: { title: `Install ${item.name}` }, content, yes: { label: mode === "crew" ? "Roll Installation" : "Begin Installation", icon: "fa-solid fa-hammer" }, no: { label: "Cancel", icon: "fa-solid fa-xmark" } });
  if (!confirmed) return;
  if (!canAffordScrap) throw new Error(`Not enough Aether Scrap. ${scrapCost} required.`);
  await installWithAether(actor, group, componentId, socketIndex);
}

export class ArkflightShipwrightWorkspace extends HandlebarsApplication {
  static DEFAULT_OPTIONS = { id: "arkflight-shipwright-workspace", classes: ["arkflight", "arkflight-shipwright-workspace"], position: { width: 1100, height: 750 }, window: { title: "Arkflight Shipwright Workspace", icon: "fa-solid fa-hammer", resizable: true } };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/ship/shipwright-workspace.hbs` } };

  constructor(actor, options = {}) { super(options); this.actor = actor; this.activeView = "workbench"; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ship = shipFlag(this.actor);
    const mode = service(this.actor);
    const group = ["ship","arkengine","weapon"].includes(this.activeView) ? this.activeView : null;
    return { ...context, actorName: this.actor.name, activeView: this.activeView, workbench: !group, group, isShip: group === "ship", isArkengine: group === "arkengine", isWeapon: group === "weapon", serviceLabel: serviceLabel(mode), scrap: currentScrap(this.actor), assets: ASSETS, inventory: group ? inventoryRows(this.actor, group) : [], sockets: group ? socketRows(this.actor, group) : [], boardArt: group ? ASSETS.categories[group].board : "", workOrders: workOrders(this.actor), hasWorkOrders: workOrders(this.actor).length > 0 };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.element) return;
    for (const button of this.element.querySelectorAll("[data-workbench-category]")) button.addEventListener("click", () => { this.activeView = button.dataset.workbenchCategory; this.render({ force: true }); });
    this.element.querySelector("[data-workbench-home]")?.addEventListener("click", () => { this.activeView = "workbench"; this.render({ force: true }); });
    for (const card of this.element.querySelectorAll("[data-fitting-drag]")) card.addEventListener("dragstart", (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-arkflight-fitting", JSON.stringify({ group: this.activeView, family: card.dataset.family, componentId: card.dataset.componentId })); });
    for (const socket of this.element.querySelectorAll("[data-workspace-socket]")) {
      socket.addEventListener("dragover", (event) => { if (socket.dataset.occupied === "true") return; event.preventDefault(); socket.classList.add("is-drop-ready"); });
      socket.addEventListener("dragleave", () => socket.classList.remove("is-drop-ready"));
      socket.addEventListener("drop", async (event) => {
        event.preventDefault(); socket.classList.remove("is-drop-ready");
        if (socket.dataset.occupied === "true") return ui.notifications?.warn?.("That socket is already occupied.");
        try {
          const payload = JSON.parse(event.dataTransfer.getData("application/x-arkflight-fitting") || "{}");
          if (payload.group !== this.activeView || !payload.componentId) return ui.notifications?.warn?.("That fitting is not compatible with this board.");
          await installDialog(this.actor, this.activeView, payload.componentId, Number(socket.dataset.socketIndex));
          this.render({ force: true }); this.actor.sheet?.render?.(false);
        } catch (error) { console.error("Arkflight | Shipwright drop failed", error); ui.notifications?.error?.(error?.message ?? "Could not install fitting."); }
      });
      socket.addEventListener("click", () => {
        const index = Number(socket.dataset.socketIndex);
        for (const row of this.element.querySelectorAll("[data-fitting-drag]")) row.classList.add("is-compatible");
        const tray = this.element.querySelector("[data-inventory-tray]");
        tray?.setAttribute("data-selected-socket", String(index));
      });
    }
  }
}

const OPEN = new Map();
export function openShipwrightWorkspace(actor, view = "workbench") {
  if (!isShip(actor)) { ui.notifications?.warn?.("Choose an Arkflight vessel first."); return null; }
  let app = OPEN.get(actor.uuid);
  if (!app) { app = new ArkflightShipwrightWorkspace(actor); OPEN.set(actor.uuid, app); }
  app.activeView = ["workbench","ship","arkengine","weapon"].includes(view) ? view : "workbench";
  app.render({ force: true });
  return app;
}

function interceptShipSheet(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!isShip(actor)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.dataset.shipwrightWorkspaceWired === "true") return;
  root.dataset.shipwrightWorkspaceWired = "true";
  for (const button of root.querySelectorAll('[data-tab="fittings"], [data-tab="refit"]')) button.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); openShipwrightWorkspace(actor, "workbench"); }, true);
}

Hooks.on("renderActorSheet", interceptShipSheet);
Hooks.once("ready", () => { game.arkflight ??= {}; game.arkflight.openShipwrightWorkspace = openShipwrightWorkspace; });
