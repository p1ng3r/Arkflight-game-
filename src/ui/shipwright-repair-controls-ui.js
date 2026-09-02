import { REPAIR_PACKAGES } from "../ship/repair-rules.js";
import { shipAllowsRefitMode, shipOperationalStatus } from "../ship/operational-status.js";

const MODULE_ID = "arkflight-game";
const AREA_LABELS = Object.freeze({ hull: "Hull Area", arkengine: "Arkengine", rigging: "Rigging", lifeveil: "Lifeveil Area", morale: "Morale" });

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function service(actor) { const value = actor?.getFlag?.(MODULE_ID, "refitServiceMode"); return ["crew","dock","shipyard"].includes(value) ? value : "crew"; }
function escape(value) { return foundry.utils.escapeHTML(String(value ?? "")); }
function title(value) { return String(value ?? "").replace(/[-_]/g," ").replace(/\b\w/g,(m)=>m.toUpperCase()); }

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

function renderRepairCard(actor, card) {
  const ship = shipFlag(actor);
  if (!ship || !game.arkflight?.refit?.quoteRepair) return;
  card.classList.add("arkflight-repair-controls-card");
  card.innerHTML = `
    <h3><i class="fa-solid fa-hammer"></i> Ship Repairs</h3>
    <p>Repair numeric ship damage or restore damaged ship areas. Crew repairs use the assigned Engineer's Crafting check. Dock and Shipyard repairs are professional.</p>
    <div class="arkflight-repair-section">
      <h4>Resource Repairs</h4>
      <article class="arkflight-repair-target"><header><strong>Hull Integrity</strong><span>${Number(ship.resources?.hull?.value ?? 0)} / ${Number(ship.resources?.hull?.max ?? 0)}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"resource","hull")}</div></article>
      <article class="arkflight-repair-target"><header><strong>Lifeveil</strong><span>${Number(ship.resources?.lifeveil?.value ?? 0)} / ${Number(ship.resources?.lifeveil?.max ?? 0)}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"resource","lifeveil")}</div></article>
    </div>
    <div class="arkflight-repair-section">
      <h4>System &amp; Area Repairs</h4>
      ${Object.entries(AREA_LABELS).map(([key,label])=>`<article class="arkflight-repair-target"><header><strong>${escape(label)}</strong><span>${escape(title(ship.areas?.[key]?.state ?? "stable"))}</span></header><div class="arkflight-repair-packages">${packageButtons(actor,"area",key)}</div></article>`).join("")}
    </div>
    <div class="arkflight-repair-service-note">Crew: full Scrap cost · Dock: 25% less · Shipyard: 50% less</div>`;

  for (const button of card.querySelectorAll("[data-repair-package]")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const targetType = button.dataset.repairTargetType;
        const targetKey = button.dataset.repairTargetKey;
        const packageId = button.dataset.repairPackage;
        const mode = service(actor);
        if (!shipAllowsRefitMode(shipFlag(actor), mode)) throw new Error(`${shipOperationalStatus(shipFlag(actor)).label} does not currently permit ${mode === "shipyard" ? "Shipyard" : mode === "dock" ? "Docked" : "Crew Refit"} repair work.`);
        const quote = game.arkflight.refit.quoteRepair(actor, targetType, targetKey, packageId, mode);
        if (!quote?.ok) throw new Error(quote?.reason ?? "Repair quote failed.");
        if (Number(shipFlag(actor)?.resources?.salvageParts?.value ?? 0) < quote.partsCost) throw new Error(`This repair requires ${quote.partsCost} Aether Scrap.`);

        if (mode === "crew") {
          const engineer = await resolveEngineer(actor);
          if (!engineer) throw new Error(`Assign an Engineer to ${actor.name} before Crew repairs.`);
          const check = await rollCrafting(engineer, quote.craftingDC, `${targetType}:${targetKey}:${packageId}`);
          if (!["success","criticalSuccess"].includes(check.outcome)) {
            const spent = await game.arkflight.refit.spendAetherScrap(actor, quote.partsCost);
            if (!spent?.ok) throw new Error(spent?.reason ?? "Could not spend repair materials.");
            ui.notifications?.warn?.(`${quote.packageLabel} on ${quote.targetLabel} failed. ${quote.partsCost} Aether Scrap was consumed.`);
            renderRepairCard(actor, card);
            return;
          }
        }

        const queued = await game.arkflight.refit.queueRepairPackage(actor, targetType, targetKey, packageId, { serviceMode: mode });
        await startQueued(actor, queued, `${quote.packageLabel}: ${quote.targetLabel}`);
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
