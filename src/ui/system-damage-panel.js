import { SYSTEM_KEYS, SYSTEM_LABELS, SYSTEM_STATIONS, activeSystemFaults, systemIntegrity, systemSaveProfile } from "../ship/system-damage.js";
import { faultDescription } from "../content/system-faults.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { applyActorSystemDamage } from "../foundry/system-damage-runtime.js";

export function renderSystemDamagePanel(app, html, actor) {
  const ship = actor.flags?.["arkflight-game"]?.ship;
  if (!ship?.hull?.chassisId) return;
  html.querySelector("[data-system-damage-panel]")?.remove();
  const derived = deriveShip(ship, SHIP_CATALOGS), esc = foundry.utils.escapeHTML;
  const panel = document.createElement("section");
  panel.dataset.systemDamagePanel = ""; panel.className = "arkflight-system-damage-panel";
  panel.innerHTML = `<h3>Ship Systems</h3><p>Damage at 50% or lower triggers one save per system per round. Faults persist until repaired.</p><div class="arkflight-system-grid">${SYSTEM_KEYS.map(system => {
    const status = systemIntegrity(ship, system), save = systemSaveProfile(ship, system, { catalogs: SHIP_CATALOGS, derived }), faults = activeSystemFaults(ship, system);
    return `<article class="arkflight-system-card" data-band="${status.band}"><strong>${esc(SYSTEM_LABELS[system])} · ${Math.round(status.percent)}%</strong><div>${esc(status.label)} · ${esc(SYSTEM_STATIONS[system])}</div><meter min="0" max="100" value="${status.percent}" aria-label="${esc(SYSTEM_LABELS[system])} integrity"></meter><div title="Ship Bonus ${save.bonus}; Hull ${save.components.hull}; Arkengine ${save.components.arkengine}; upgrades ${save.upgrades}; faults ${save.faults}">Save d20 ${save.modifier < 0 ? "−" : "+"}${Math.abs(save.modifier)} · DC ${save.dc}</div>${faults.length ? `<ul>${faults.map(f => `<li><strong>${esc(f.name)}</strong>: ${esc(faultDescription(f))}</li>`).join("")}</ul>` : "<small>No system faults</small>"}</article>`;
  }).join("")}</div>${game.user?.isGM ? `<div class="arkflight-system-damage-controls"><label>Damage system <select data-damage-system>${SYSTEM_KEYS.map(key => `<option value="${key}">${esc(SYSTEM_LABELS[key])}</option>`).join("")}</select></label><label>Amount <input data-system-damage-amount type="number" min="1" value="5"></label><button type="button" data-apply-system-damage>Apply Damage &amp; Save</button></div>` : ""}<p>Emergency Repair: choose a named fault under Basic Ship Controls. 1 AP, 2 Supplies, once per combat. Clearing a fault does not heal integrity.</p>`;
  const host = html.querySelector("[data-combat-stations-host]");
  if (host) host.before(panel); else (html.querySelector(".arkflight-ship-shell") ?? html).append(panel);
  panel.querySelector("[data-apply-system-damage]")?.addEventListener("click", async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      await applyActorSystemDamage(actor, panel.querySelector("[data-damage-system]").value, Number(panel.querySelector("[data-system-damage-amount]").value));
      app.render({ force: true });
    } catch (error) { ui.notifications?.error?.(error.message); }
    finally { button.disabled = false; }
  });
}
