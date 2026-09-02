import { SHIP_CATALOGS } from "../content/index.js";
import { componentEconomyQuote } from "../ship/refit-value.js";
import { resolveEngineeringInstallOutcome } from "../ship/refit-engineering.js";
import { installedSocketLayout, pendingSocketReservations } from "../ship/refit-sockets.js";
import { shipAllowsRefitMode, shipOperationalStatus } from "../ship/operational-status.js";

const MODULE_ID = "arkflight-game";
const ROOT = `/modules/${MODULE_ID}/assets/ui/shipwright`;
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
function groupForFamily(family) { return family === "arkengineMod" ? "arkengine" : family === "weapon" ? "weapon" : "ship"; }
function catalogFor(group) { return group === "arkengine" ? SHIP_CATALOGS.arkengineMods : group === "ship" ? SHIP_CATALOGS.shipMods : SHIP_CATALOGS.weapons; }
function escape(value) { return foundry.utils.escapeHTML(String(value ?? "")); }
function currentScrap(actor) { return Math.max(0, Math.trunc(Number(shipFlag(actor)?.resources?.salvageParts?.value ?? 0))); }
function partyTreasury() { return game.actors?.party ?? null; }
function gpToCp(gp) { return Math.max(0, Math.ceil(Number(gp || 0) * 100)); }
function partyCopper() { return Math.max(0, Number(partyTreasury()?.inventory?.coins?.copperValue ?? 0)); }
function partyGoldDisplay() { return partyCopper() / 100; }

function inventoryRows(actor, group) {
  const ship = shipFlag(actor);
  const catalog = catalogFor(group) ?? {};
  const counts = group === "ship" ? ship?.inventory?.shipMods ?? {} : group === "arkengine" ? ship?.inventory?.arkengineMods ?? {} : ship?.inventory?.weapons ?? {};
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
  const family = familyFor(group);
  const layout = installedSocketLayout(ship, SHIP_CATALOGS, family);
  const occupied = new Set(layout.occupied);
  const reserved = new Set(pendingSocketReservations(ship, family));
  const placements = layout.placements ?? [];
  const activeJobs = ship?.refit?.workOrders ?? [];
  return Array.from({ length: layout.capacity }, (_, index) => {
    const [left, top] = POSITIONS[group][index % POSITIONS[group].length];
    const placement = placements.find((row) => row.socketIndices?.includes(index));
    const pending = activeJobs.find((job) => job.type === "install" && job.componentFamily === family && ["PLANNED","WORKING","planned","working"].includes(job.status) && job.socketIndices?.includes(index));
    return {
      index, left, top,
      occupied: occupied.has(index),
      reserved: reserved.has(index),
      working: pending?.status === "WORKING" || pending?.status === "working",
      componentId: placement?.componentId ?? pending?.componentId ?? "",
      componentName: (catalogFor(group)?.[placement?.componentId ?? pending?.componentId]?.name) ?? "",
      art: SOCKET_ART[group]
    };
  });
}

function workOrders(actor) {
  return (shipFlag(actor)?.refit?.workOrders ?? []).filter((job) => ["PLANNED","WORKING","planned","working"].includes(job.status)).map((job) => ({
    id: job.id,
    name: catalogFor(groupForFamily(job.componentFamily))?.[job.componentId]?.name ?? job.componentName ?? job.componentId ?? "Refit work",
    status: String(job.status).toUpperCase(),
    hours: Number(job.remainingHours ?? 0),
    working: String(job.status).toUpperCase() === "WORKING",
    payment: job.result?.paymentMethod === "gold" ? `${Number(job.result?.goldCost ?? job.goldCost ?? 0).toLocaleString()} gp` : `${Number(job.partsCost ?? 0)} Scrap`
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
  const item = catalogFor(group)?.[componentId];
  const layout = installedSocketLayout(shipFlag(actor), SHIP_CATALOGS, family);
  const reserved = new Set(pendingSocketReservations(shipFlag(actor), family));
  const cost = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1)));
  const occupied = new Set([...layout.occupied, ...reserved]);
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

async function spendPartyGold(gp) {
  const party = partyTreasury();
  const cp = gpToCp(gp);
  if (!party?.inventory?.removeCoins) return { ok: false, reason: "no-party-treasury" };
  if (partyCopper() < cp) return { ok: false, reason: "insufficient-party-gold", requiredCp: cp, availableCp: partyCopper() };
  const removed = await party.inventory.removeCoins({ cp }, { byValue: true });
  return removed ? { ok: true, party, cp } : { ok: false, reason: "insufficient-party-gold", requiredCp: cp, availableCp: partyCopper() };
}
async function refundPartyGold(payment) {
  if (payment?.ok && payment.party?.inventory?.addCoins && payment.cp > 0) await payment.party.inventory.addCoins({ cp: payment.cp });
}

async function installWithPayment(actor, group, componentId, socketIndex, paymentMethod, gpCost = 0) {
  const family = familyFor(group);
  const item = catalogFor(group)?.[componentId];
  const spec = item?.data?.refit?.install;
  const assignment = anchoredAssignment(actor, group, componentId, socketIndex);
  if (!item || !spec || !assignment) throw new Error("That fitting cannot be assigned to the selected socket.");
  const mode = service(actor);
  if (!shipAllowsRefitMode(shipFlag(actor), mode)) throw new Error(`${shipOperationalStatus(shipFlag(actor)).label} does not allow ${serviceLabel(mode)} installation work.`);
  if (paymentMethod === "gold" && mode === "crew") throw new Error("Gold payment requires Docked or Shipyard service.");

  let goldPayment = null;
  if (paymentMethod === "gold") {
    goldPayment = await spendPartyGold(gpCost);
    if (!goldPayment.ok) throw new Error(goldPayment.reason === "no-party-treasury" ? "No active PF2e Party treasury is available." : `The Party treasury cannot cover ${Number(gpCost).toLocaleString()} gp.`);
  }

  try {
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
      const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, { method: "crew", serviceMode: "crew", paymentMethod: "scrap" });
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

    const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { actorUuid: actor.uuid, assignments: [assignment] }, {
      method: mode === "shipyard" ? "shipyard" : "crew",
      serviceMode: mode,
      paymentMethod,
      goldCost: paymentMethod === "gold" ? Number(gpCost) : 0
    });
    if (!queued?.ok) throw new Error(queued?.reason ?? "Installation could not be queued.");
    await startQueued(actor, queued, `Install ${item.name}`);
  } catch (error) {
    if (goldPayment?.ok) await refundPartyGold(goldPayment);
    throw error;
  }
}

function choosePaymentDialog({ actor, item, mode, socketIndex, spec, scrapCost, gpCost, engineer }) {
  return new Promise((resolve) => {
    const engineerName = engineer?.name ?? "No Engineer assigned";
    const crafting = Number(engineer?.skills?.crafting?.mod ?? engineer?.skills?.crafting?.modifier ?? 0);
    const canAffordScrap = currentScrap(actor) >= scrapCost;
    const party = partyTreasury();
    const goldAllowed = mode !== "crew" && Boolean(party?.inventory?.removeCoins);
    const canAffordGold = goldAllowed && partyCopper() >= gpToCp(gpCost);
    const content = `<div class="arkflight-install-scroll" style="--install-scroll:url('${ASSETS.scroll}')">
      <header><div><span>SHIPWRIGHT WORK ORDER</span><h2>${escape(item.name)}</h2><p>${escape(serviceLabel(mode))} · Socket ${socketIndex + 1}</p></div><img src="${ASSETS.engineerSeal}" alt="Engineer seal"></header>
      <div class="arkflight-install-scroll-grid"><section><h3>Installation</h3><dl><div><dt>Install DC</dt><dd>${Number(spec.dc ?? 0)}</dd></div><div><dt>Estimated Time</dt><dd>${Number(spec.timeHours ?? 0)}h</dd></div><div><dt>Service</dt><dd>${escape(serviceLabel(mode))}</dd></div></dl></section><section><h3>Payment</h3><div class="arkflight-payment-options"><label class="${canAffordScrap ? "" : "is-disabled"}"><img src="${ASSETS.scrap}" alt="Aether Scrap"><input type="radio" name="arkflight-payment" value="scrap" ${canAffordScrap ? "checked" : "disabled"}><strong>${scrapCost} Aether Scrap</strong><small>${currentScrap(actor)} aboard</small></label><label class="${canAffordGold ? "" : "is-disabled"}"><img src="${ASSETS.gold}" alt="Gold"><input type="radio" name="arkflight-payment" value="gold" ${canAffordGold && !canAffordScrap ? "checked" : ""} ${goldAllowed ? "" : "disabled"}><strong>${Number(gpCost).toLocaleString()} gp</strong><small>${goldAllowed ? `Party treasury ${partyGoldDisplay().toLocaleString()} gp` : "Dock or Shipyard only"}</small></label></div></section></div>
      <footer><img src="${ASSETS.engineerSeal}" alt=""><span>${mode === "crew" ? `${escape(engineerName)} · Crafting ${crafting >= 0 ? "+" : ""}${crafting}` : `${escape(serviceLabel(mode))} professional installation`}</span></footer></div>`;
    new DialogV2({ window: { title: `Install ${item.name}` }, content, buttons: [{ action: "cancel", label: "Cancel" }, { action: "confirm", label: mode === "crew" ? "Roll Installation" : "Confirm Professional Install", default: true, callback: (_event, button, dialog) => resolve(dialog.element.querySelector('input[name="arkflight-payment"]:checked')?.value ?? null) }], close: () => resolve(null) }).render({ force: true });
  });
}

async function installDialog(actor, group, componentId, socketIndex) {
  const item = catalogFor(group)?.[componentId];
  const spec = item?.data?.refit?.install;
  if (!item || !spec) return ui.notifications?.warn?.("That fitting has no installation specification.");
  const mode = service(actor);
  const quote = componentEconomyQuote(item);
  const scrapCost = quote?.ok ? (quote.installation[mode]?.aetherScrap ?? quote.installation.crew.aetherScrap) : Number(spec.partsCost ?? 0);
  const gpCost = quote?.ok ? (quote.installation[mode]?.gp ?? quote.installation.crew.gp) : 0;
  const engineer = mode === "crew" ? await resolveEngineer(actor) : null;
  const payment = await choosePaymentDialog({ actor, item, mode, socketIndex, spec, scrapCost, gpCost, engineer });
  if (!payment) return;
  try { await installWithPayment(actor, group, componentId, socketIndex, payment, gpCost); } catch (error) { ui.notifications?.error?.(error.message); }
}

export class ArkflightShipwrightWorkspace extends HandlebarsApplication {
  constructor(actor, options = {}) { super(options); this.actor = actor; this.group = null; this.selectedSocket = null; }
  static DEFAULT_OPTIONS = { id: "arkflight-shipwright-{id}", classes: ["arkflight-shipwright-workspace"], position: { width: 1350, height: 800 }, window: { title: "Arkflight Shipwright Workspace", resizable: true } };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/ship/shipwright-workspace.hbs` } };

  async _prepareContext() {
    const group = ["ship","arkengine","weapon"].includes(this.group) ? this.group : null;
    const mode = service(this.actor);
    const operational = shipOperationalStatus(shipFlag(this.actor));
    const selected = Number.isInteger(this.selectedSocket) ? this.selectedSocket : null;
    const sockets = group ? socketRows(this.actor, group).map((row) => ({ ...row, selected: row.index === selected })) : [];
    return {
      actorName: this.actor.name,
      actorUuid: this.actor.uuid,
      workbench: !group,
      group,
      isShip: group === "ship", isArkengine: group === "arkengine", isWeapon: group === "weapon",
      boardArt: group ? ASSETS.categories[group].board : "",
      assets: ASSETS,
      sockets,
      selectedSocket: selected == null ? "" : selected + 1,
      hasSelectedSocket: selected != null,
      inventory: group ? inventoryRows(this.actor, group) : [],
      workOrders: workOrders(this.actor),
      hasWorkOrders: workOrders(this.actor).length > 0,
      serviceMode: mode,
      serviceLabel: serviceLabel(mode),
      statusLabel: operational.label,
      serviceAllowed: shipAllowsRefitMode(shipFlag(this.actor), mode),
      scrap: currentScrap(this.actor),
      hasPartyTreasury: Boolean(partyTreasury()),
      partyGold: partyGoldDisplay().toLocaleString()
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    for (const button of root.querySelectorAll("[data-workbench-category]")) button.addEventListener("click", () => { this.group = button.dataset.workbenchCategory; this.selectedSocket = null; this.render({ force: true }); });
    root.querySelector("[data-workbench-home]")?.addEventListener("click", () => { this.group = null; this.selectedSocket = null; this.render({ force: true }); });
    for (const socket of root.querySelectorAll("[data-workspace-socket]")) {
      socket.addEventListener("click", () => {
        const index = Number(socket.dataset.socketIndex);
        if (socket.dataset.occupied === "true" || socket.dataset.reserved === "true") return ui.notifications?.warn?.("That socket is already occupied or reserved by active work.");
        this.selectedSocket = this.selectedSocket === index ? null : index;
        this.render({ force: true });
      });
      socket.addEventListener("dragover", (event) => { if (socket.dataset.occupied === "true" || socket.dataset.reserved === "true") return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; socket.classList.add("is-drop-ready"); });
      socket.addEventListener("dragleave", () => socket.classList.remove("is-drop-ready"));
      socket.addEventListener("drop", async (event) => {
        event.preventDefault(); socket.classList.remove("is-drop-ready");
        if (socket.dataset.occupied === "true" || socket.dataset.reserved === "true") return;
        let payload; try { payload = JSON.parse(event.dataTransfer.getData("application/x-arkflight-fitting")); } catch { return; }
        if (payload?.family !== familyFor(this.group)) return ui.notifications?.warn?.("That fitting is not compatible with this board.");
        await installDialog(this.actor, this.group, payload.componentId, Number(socket.dataset.socketIndex));
        this.selectedSocket = null; this.render({ force: true });
      });
    }
    for (const fitting of root.querySelectorAll("[data-fitting-drag]")) fitting.addEventListener("dragstart", (event) => event.dataTransfer.setData("application/x-arkflight-fitting", JSON.stringify({ family: fitting.dataset.family, componentId: fitting.dataset.componentId })));
    for (const button of root.querySelectorAll("[data-install-selected]")) button.addEventListener("click", async (event) => {
      const article = event.currentTarget.closest("[data-fitting-drag]");
      if (!Number.isInteger(this.selectedSocket) || !article) return;
      await installDialog(this.actor, this.group, article.dataset.componentId, this.selectedSocket);
      this.selectedSocket = null; this.render({ force: true });
    });
  }
}

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.openShipwrightWorkspace = (actor) => {
    if (!isShip(actor)) return ui.notifications?.warn?.("Select an Arkflight ship Vehicle Actor.");
    return new ArkflightShipwrightWorkspace(actor).render({ force: true });
  };
});