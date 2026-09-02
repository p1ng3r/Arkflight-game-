import { REPAIR_PACKAGES } from "../ship/repair-rules.js";
import { shipAllowsRefitMode, shipOperationalStatus } from "../ship/operational-status.js";

const MODULE_ID = "arkflight-game";
const WORKBENCH = `/modules/${MODULE_ID}/assets/ui/shipwright/workbench`;
const SCRAP_GP_VALUE = 10;
const AREA_LABELS = Object.freeze({ hull: "Hull Area", arkengine: "Arkengine", rigging: "Rigging", lifeveil: "Lifeveil Area", morale: "Morale" });
const { DialogV2 } = foundry.applications.api;

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function service(actor) { const value = actor?.getFlag?.(MODULE_ID, "refitServiceMode"); return ["crew","dock","shipyard"].includes(value) ? value : "crew"; }
function serviceLabel(mode) { return mode === "shipyard" ? "Shipyard" : mode === "dock" ? "Docked" : "Crew Refit"; }
function escape(value) { return foundry.utils.escapeHTML(String(value ?? "")); }
function title(value) { return String(value ?? "").replace(/[-_]/g," ").replace(/\b\w/g,(m)=>m.toUpperCase()); }
function currentScrap(actor) { return Math.max(0, Math.trunc(Number(shipFlag(actor)?.resources?.salvageParts?.value ?? 0))); }
function partyTreasury() { return game.actors?.party ?? null; }
function gpToCp(gp) { return Math.max(0, Math.ceil(Number(gp || 0) * 100)); }
function partyCopper() { return Math.max(0, Number(partyTreasury()?.inventory?.coins?.copperValue ?? 0)); }
function partyGoldDisplay() { return partyCopper() / 100; }

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
      extraRollOptions: ["action:arkflight-refit", `arkflight:repair:${slug}`],
      callback: (_roll, outcome, message) => resolve({ outcome, message })
    })).catch(reject);
  });
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

async function startQueued(actor, queued, label) {
  const job = queued?.job;
  if (!queued?.ok || !job) throw new Error(queued?.reason ?? `${label} could not be queued.`);
  const started = await game.arkflight?.refit?.startWork?.(actor, job.id);
  if (!started?.ok) {
    if (started?.reason === "crew-work-already-active") {
      ui.notifications?.info?.(`${label} queued — another Crew Refit job is already active.`);
      return;
    }
    throw new Error(started?.reason ?? `${label} could not start.`);
  }
  ui.notifications?.info?.(`${label} started — ${started.job.remainingHours}h remaining.`);
}

function packageButtons(actor, targetType, targetKey) {
  const mode = service(actor);
  const api = game.arkflight?.refit;
  return Object.values(REPAIR_PACKAGES).map((pack) => {
    const quote = api?.quoteRepair?.(actor, targetType, targetKey, pack.id, mode);
    if (!quote?.ok) return "";
    const noEffect = targetType === "resource" ? quote.current >= quote.max : quote.currentState === quote.afterState;
    const effect = targetType === "resource"
      ? `+${quote.restoreAmount} (${quote.after}/${quote.max})`
      : `${title(quote.currentState)} → ${title(quote.afterState)}`;
    return `<button type="button" class="arkflight-repair-package" data-repair-target-type="${targetType}" data-repair-target-key="${targetKey}" data-repair-package="${pack.id}" ${noEffect ? "disabled" : ""}><strong>${escape(pack.label)}</strong><span>${escape(effect)}</span><small>${quote.partsCost} Scrap · DC ${quote.craftingDC} · ${quote.durationHours}h</small></button>`;
  }).join("");
}

function repairPaymentDialog({ actor, quote, mode, engineer }) {
  return new Promise((resolve) => {
    const engineerName = engineer?.name ?? "No Engineer assigned";
    const crafting = Number(engineer?.skills?.crafting?.mod ?? engineer?.skills?.crafting?.modifier ?? 0);
    const scrapCost = Number(quote.partsCost ?? 0);
    const gpCost = scrapCost * SCRAP_GP_VALUE;
    const canAffordScrap = currentScrap(actor) >= scrapCost;
    const party = partyTreasury();
    const goldAllowed = mode !== "crew" && Boolean(party?.inventory?.removeCoins);
    const canAffordGold = goldAllowed && partyCopper() >= gpToCp(gpCost);
    const effect = quote.targetType === "resource"
      ? `${quote.current} → ${quote.after} / ${quote.max}`
      : `${title(quote.currentState)} → ${title(quote.afterState)}`;
    const content = `<div class="arkflight-install-scroll" style="--install-scroll:url('${WORKBENCH}/install_scroll_horizontal.webp')">
      <header><div><span>SHIPWRIGHT REPAIR ORDER</span><h2>${escape(quote.packageLabel)} — ${escape(quote.targetLabel)}</h2><p>${escape(serviceLabel(mode))} · ${escape(effect)}</p></div><img src="${WORKBENCH}/engineer_crafting_seal.webp" alt="Engineer seal"></header>
      <div class="arkflight-install-scroll-grid">
        <section><h3>Repair</h3><dl><div><dt>Target</dt><dd>${escape(quote.targetLabel)}</dd></div><div><dt>Repair Package</dt><dd>${escape(quote.packageLabel)}</dd></div><div><dt>Repair DC</dt><dd>${Number(quote.craftingDC ?? 0)}</dd></div><div><dt>Estimated Time</dt><dd>${Number(quote.durationHours ?? 0)}h</dd></div><div><dt>Service</dt><dd>${escape(serviceLabel(mode))}</dd></div></dl></section>
        <section><h3>Payment</h3><div class="arkflight-payment-options">
          <label class="${canAffordScrap ? "" : "is-disabled"}"><img src="${WORKBENCH}/payment_aether_scrap.webp" alt="Aether Scrap"><input type="radio" name="arkflight-repair-payment" value="scrap" ${canAffordScrap ? "checked" : "disabled"}><strong>${scrapCost} Aether Scrap</strong><small>${currentScrap(actor)} aboard</small></label>
          <label class="${canAffordGold ? "" : "is-disabled"}"><img src="${WORKBENCH}/payment_gold_purse.webp" alt="Gold"><input type="radio" name="arkflight-repair-payment" value="gold" ${canAffordGold && !canAffordScrap ? "checked" : ""} ${goldAllowed ? "" : "disabled"}><strong>${gpCost.toLocaleString()} gp</strong><small>${goldAllowed ? `Party treasury ${partyGoldDisplay().toLocaleString()} gp` : "Dock or Shipyard only"}</small></label>
        </div></section>
      </div>
      <footer><img src="${WORKBENCH}/engineer_crafting_seal.webp" alt=""><span>${mode === "crew" ? `${escape(engineerName)} · Crafting ${crafting >= 0 ? "+" : ""}${crafting}` : `${escape(serviceLabel(mode))} professional repair · no Crew Crafting roll`}</span></footer>
    </div>`;
    const dialog = new DialogV2({
      window: { title: `${quote.packageLabel}: ${quote.targetLabel}` },
      content,
      buttons: [
        { action: "cancel", label: "Cancel", callback: () => resolve(null) },
        { action: "confirm", label: mode === "crew" ? "Roll Repair" : "Confirm Professional Repair", default: true, callback: () => resolve(dialog.element?.querySelector?.('input[name="arkflight-repair-payment"]:checked')?.value ?? null) }
      ],
      close: () => resolve(null)
    });
    dialog.render({ force: true });
  });
}

async function beginRepair(actor, targetType, targetKey, packageId) {
  const mode = service(actor);
  if (mode !== "crew" && !shipAllowsRefitMode(shipFlag(actor), mode)) throw new Error(`${shipOperationalStatus(shipFlag(actor)).label} does not currently permit ${mode === "shipyard" ? "Shipyard" : "Docked"} repair work.`);
  const quote = game.arkflight.refit.quoteRepair(actor, targetType, targetKey, packageId, mode);
  if (!quote?.ok) throw new Error(quote?.reason ?? "Repair quote failed.");
  const engineer = mode === "crew" ? await resolveEngineer(actor) : null;
  if (mode === "crew" && !engineer) throw new Error(`Assign an Engineer to ${actor.name} before Crew repairs.`);

  const paymentMethod = await repairPaymentDialog({ actor, quote, mode, engineer });
  if (!paymentMethod) return;

  let goldPayment = null;
  const gpCost = Number(quote.partsCost ?? 0) * SCRAP_GP_VALUE;
  if (paymentMethod === "gold") {
    if (mode === "crew") throw new Error("Gold payment requires Docked or Shipyard service.");
    goldPayment = await spendPartyGold(gpCost);
    if (!goldPayment.ok) throw new Error(goldPayment.reason === "no-party-treasury" ? "No active PF2e Party treasury is available." : `The Party treasury cannot cover ${gpCost.toLocaleString()} gp.`);
  }

  try {
    if (mode === "crew") {
      if (currentScrap(actor) < quote.partsCost) throw new Error(`This repair requires ${quote.partsCost} Aether Scrap.`);
      const check = await rollCrafting(engineer, quote.craftingDC, `${targetType}:${targetKey}:${packageId}`);
      if (!["success","criticalSuccess"].includes(check.outcome)) {
        const spent = await game.arkflight.refit.spendAetherScrap(actor, quote.partsCost);
        if (!spent?.ok) throw new Error(spent?.reason ?? "Could not spend repair materials.");
        ui.notifications?.warn?.(`${quote.packageLabel} on ${quote.targetLabel} failed. ${quote.partsCost} Aether Scrap was consumed.`);
        return;
      }
    }

    const queueOptions = {
      serviceMode: mode,
      paymentMethod,
      partsCostOverride: paymentMethod === "gold" ? 0 : quote.partsCost,
      goldCost: paymentMethod === "gold" ? gpCost : 0
    };
    const queued = await game.arkflight.refit.queueRepairPackage(actor, targetType, targetKey, packageId, queueOptions);
    if (!queued?.ok) throw new Error(queued?.reason ?? "Repair could not be queued.");
    await startQueued(actor, queued, `${quote.packageLabel}: ${quote.targetLabel}`);
  } catch (error) {
    if (goldPayment?.ok) await refundPartyGold(goldPayment);
    throw error;
  }
}

function renderRepairCard(actor, card) {
  const ship = shipFlag(actor);
  if (!ship || !game.arkflight?.refit?.quoteRepair) return;
  card.classList.add("arkflight-repair-controls-card");
  card.innerHTML = `
    <h3><i class="fa-solid fa-hammer"></i> Ship Repairs</h3>
    <p>Repair numeric ship damage or restore damaged ship areas. Crew repairs are field repairs and may be performed while underway; Dock and Shipyard repairs are professional.</p>
    <div class="arkflight-repair-section">
      <h4>Resource Repairs</h4>
      <article class="arkflight-repair-target" data-repair-target-type="resource" data-repair-target-key="hull"><header><strong>Hull Integrity</strong><span>${Number(ship.resources?.hull?.value ?? 0)} / ${Number(ship.resources?.hull?.max ?? 0)}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"resource","hull")}</div></article>
      <article class="arkflight-repair-target" data-repair-target-type="resource" data-repair-target-key="lifeveil"><header><strong>Lifeveil</strong><span>${Number(ship.resources?.lifeveil?.value ?? 0)} / ${Number(ship.resources?.lifeveil?.max ?? 0)}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"resource","lifeveil")}</div></article>
    </div>
    <div class="arkflight-repair-section">
      <h4>System &amp; Area Repairs</h4>
      ${Object.entries(AREA_LABELS).map(([key,label])=>`<article class="arkflight-repair-target" data-repair-target-type="area" data-repair-target-key="${key}"><header><strong>${escape(label)}</strong><span>${escape(title(ship.areas?.[key]?.state ?? "stable"))}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"area",key)}</div></article>`).join("")}
    </div>
    <div class="arkflight-repair-service-note">Crew field repair: full Scrap cost · Dock: 25% less · Shipyard: 50% less</div>`;

  for (const button of card.querySelectorAll("[data-repair-package]")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await beginRepair(actor, button.dataset.repairTargetType, button.dataset.repairTargetKey, button.dataset.repairPackage);
        renderRepairCard(actor, card);
        actor.sheet?.render?.(false);
      } catch (error) {
        console.error("Arkflight | Ship repair failed", error);
        ui.notifications?.error?.(error?.message ?? "Ship repair failed.");
        button.disabled = false;
      }
    });
  }
}

function findRepairCard(root) {
  return [...root.querySelectorAll(".arkflight-rf-card")].find((card) => card.textContent?.includes("Ship Repairs")) ?? null;
}

function attach(app, html) {
  const actor = app?.actor;
  if (!actor || !shipFlag(actor)) return;
  const candidate = html?.[0] ?? html ?? app?.element;
  const root = candidate?.matches?.(".arkflight-workspace-shell") ? candidate : candidate?.querySelector?.(".arkflight-workspace-shell");
  if (!root || root.dataset.repairControlsObserved === "true") return;
  root.dataset.repairControlsObserved = "true";

  const upgrade = () => {
    const card = findRepairCard(root);
    if (card && !card.classList.contains("arkflight-repair-controls-card")) renderRepairCard(actor, card);
  };
  upgrade();
  const observer = new MutationObserver(upgrade);
  observer.observe(root, { childList: true, subtree: true });
}

Hooks.on("renderApplicationV2", (app, html) => attach(app, html));
