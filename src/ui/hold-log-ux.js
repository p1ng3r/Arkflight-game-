import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const SCRAP_PER_HOLD = 10;
const drafts = new Map();
const IDENTITY_FIELDS = Object.freeze([
  ["registry", "Registry"],
  ["callsign", "Callsign"],
  ["owner", "Owner"],
  ["origin", "Origin"],
  ["builder", "Builder"],
  ["motto", "Motto"]
]);

function clone(value) {
  return foundry.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rounded(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function ensureDraft(actor) {
  const ship = shipFlag(actor);
  const existing = drafts.get(actor.uuid);
  if (existing) return existing;
  const draft = {
    identity: clone(ship?.identity ?? {}),
    cargo: clone(ship?.cargo ?? { used: 0, notes: "" }),
    dirty: false
  };
  drafts.set(actor.uuid, draft);
  return draft;
}

function resourceRows(ship) {
  const labels = {
    hull: "Hull Integrity",
    lifeveil: "Lifeveil",
    strain: "Strain",
    supplies: "Supplies",
    morale: "Morale"
  };
  return Object.entries(labels).map(([key, label]) => {
    const value = Number(ship?.resources?.[key]?.value ?? 0);
    const max = Number(ship?.resources?.[key]?.max ?? 0);
    return `<div class="arkflight-log-resource"><span>${label}</span><strong>${value} / ${max}</strong></div>`;
  }).join("");
}

function conditionRows(ship) {
  const conditions = [...(ship?.conditions ?? [])];
  if (!conditions.length) return '<div class="arkflight-log-empty">No persistent vessel conditions recorded.</div>';
  return conditions.map((condition) => {
    const id = condition?.name ?? condition?.label ?? condition?.id ?? "Condition";
    const system = condition?.system ? titleCase(condition.system) : "Vessel";
    const severity = condition?.severity ?? condition?.level ?? "—";
    const note = condition?.description ?? condition?.notes ?? "";
    return `<div class="arkflight-log-condition">
      <div><strong>${escapeHtml(titleCase(id))}</strong><span>${escapeHtml(system)} · Severity ${escapeHtml(severity)}</span></div>
      ${note ? `<p>${escapeHtml(note)}</p>` : ""}
    </div>`;
  }).join("");
}

function physicalItemBulk(item) {
  const raw = item?.system?.bulk?.value;
  if (raw == null || raw === "" || raw === "-" || raw === "N") return 0;
  if (String(raw).toUpperCase() === "L") return 0.1;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function physicalItemRows(actor) {
  return [...(actor?.items ?? [])]
    .filter((item) => item?.isOfType?.("physical") || item?.system?.bulk)
    .map((item) => {
      const quantity = Math.max(1, Math.trunc(Number(item?.system?.quantity ?? 1) || 1));
      const unitBulk = physicalItemBulk(item);
      const hold = rounded(unitBulk * quantity);
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        type: item.type,
        quantity,
        unitBulk,
        hold
      };
    })
    .filter((entry) => entry.hold > 0 || entry.quantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function componentRows(ship, family) {
  const config = family === "shipMod"
    ? { counts: ship?.inventory?.shipMods ?? {}, catalog: SHIP_CATALOGS.shipMods ?? {}, label: "Ship Mod" }
    : family === "arkengineMod"
      ? { counts: ship?.inventory?.arkengineMods ?? {}, catalog: SHIP_CATALOGS.arkengineMods ?? {}, label: "Arkengine Mod" }
      : { counts: ship?.inventory?.weapons ?? {}, catalog: SHIP_CATALOGS.weapons ?? {}, label: "Weapon" };

  return Object.entries(config.counts)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([id, quantity]) => {
      const item = config.catalog[id];
      const count = Math.max(1, Math.trunc(Number(quantity) || 1));
      const unitHold = Math.max(1, Math.trunc(Number(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1) || 1));
      return {
        id,
        family,
        kind: config.label,
        name: item?.name ?? id,
        quantity: count,
        unitHold,
        hold: unitHold * count
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function holdManifest(actor, ship) {
  const shipMods = componentRows(ship, "shipMod");
  const arkengineMods = componentRows(ship, "arkengineMod");
  const weapons = componentRows(ship, "weapon");
  const pf2eItems = physicalItemRows(actor);
  const scrap = Math.max(0, Math.trunc(Number(ship?.resources?.salvageParts?.value ?? 0) || 0));
  const scrapHold = rounded(scrap / SCRAP_PER_HOLD);
  const componentHold = [...shipMods, ...arkengineMods, ...weapons].reduce((sum, row) => sum + row.hold, 0);
  const itemHold = pf2eItems.reduce((sum, row) => sum + row.hold, 0);
  return Object.freeze({
    shipMods,
    arkengineMods,
    weapons,
    pf2eItems,
    scrap,
    scrapHold,
    componentHold: rounded(componentHold),
    itemHold: rounded(itemHold),
    total: rounded(componentHold + itemHold + scrapHold)
  });
}

function componentManifestRows(rows) {
  if (!rows.length) return '<div class="arkflight-log-empty">None stored.</div>';
  return rows.map((row) => `<div class="arkflight-hold-item">
    <div><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(row.kind)} · ${row.unitHold} Hold each</span></div>
    <div><b>×${row.quantity}</b><em>${rounded(row.hold)} Hold</em></div>
  </div>`).join("");
}

function pf2eManifestRows(rows) {
  if (!rows.length) return '<div class="arkflight-log-empty">No PF2e physical items or treasure stored aboard.</div>';
  return rows.map((row) => `<div class="arkflight-hold-item arkflight-hold-pf2e-item" data-hold-pf2e-item="${escapeHtml(row.id)}">
    <img src="${escapeHtml(row.img)}" alt="">
    <div><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(titleCase(row.type))} · ${row.unitBulk === 0.1 ? "L" : row.unitBulk} Bulk each</span></div>
    <div><b>×${row.quantity}</b><em>${rounded(row.hold)} Hold</em></div>
  </div>`).join("");
}

function hideNormalSections(root) {
  for (const child of [...root.children]) {
    if (child.matches?.("header,.arkflight-sheet-tabs,.arkflight-readiness-banner,.arkflight-hold-log-shell")) continue;
    child.dataset.holdHidden = child.hidden ? "already" : "hold";
    child.hidden = true;
  }
}

function restoreSheet(root) {
  root.querySelector(".arkflight-hold-log-shell")?.remove();
  for (const child of root.querySelectorAll('[data-hold-hidden="hold"]')) {
    child.hidden = false;
    delete child.dataset.holdHidden;
  }
  for (const child of root.querySelectorAll('[data-hold-hidden="already"]')) delete child.dataset.holdHidden;
  root.querySelectorAll(".arkflight-sheet-tabs button").forEach((entry) => entry.classList.remove("is-hold-active"));
}

function renderHoldLog(root, actor) {
  const ship = shipFlag(actor);
  if (!ship) return;
  const draft = ensureDraft(actor);
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const cargoCapacity = Number(derived.stats?.cargoCapacity ?? 0);
  const manifest = holdManifest(actor, ship);
  const cargoUsed = manifest.total;
  const cargoOver = cargoCapacity >= 0 && cargoUsed > cargoCapacity;

  restoreSheet(root);
  hideNormalSections(root);
  root.querySelector(".arkflight-hold-log-shell")?.remove();

  const identityFields = IDENTITY_FIELDS.map(([key, label]) => `
    <label class="arkflight-log-field"><span>${label}</span><input type="text" data-log-identity="${key}" value="${escapeHtml(draft.identity?.[key] ?? "")}"></label>`).join("");

  const shell = document.createElement("main");
  shell.className = "arkflight-hold-log-shell";
  shell.innerHTML = `
    <section class="arkflight-hold-column">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">HOLD</span><h2>Cargo & Vessel Stores</h2></div><small>Physical storage aboard ${escapeHtml(actor.name)}.</small></div>
      <div class="arkflight-cargo-meter ${cargoOver ? "is-over" : ""}">
        <div><span>Hold Used</span><strong>${cargoUsed} / ${cargoCapacity}</strong></div>
        <div class="arkflight-cargo-bar"><i style="width:${cargoCapacity > 0 ? Math.min(100, (cargoUsed / cargoCapacity) * 100) : 0}%"></i></div>
        <div class="arkflight-hold-breakdown"><span>Fittings ${manifest.componentHold}</span><span>PF2e Cargo ${manifest.itemHold}</span><span>Aether Scrap ${manifest.scrapHold}</span></div>
        ${cargoOver ? `<small>OVER CAPACITY — ${rounded(cargoUsed - cargoCapacity)} Hold must be cleared.</small>` : ""}
      </div>

      <div class="arkflight-log-subsection">
        <div class="arkflight-log-subhead"><span>AETHER SCRAP</span><small>${SCRAP_PER_HOLD} Scrap = 1 Hold</small></div>
        <div class="arkflight-hold-item"><div><strong>Aether Scrap</strong><span>Shipwright material</span></div><div><b>×${manifest.scrap}</b><em>${manifest.scrapHold} Hold</em></div></div>
      </div>

      <div class="arkflight-log-subsection">
        <div class="arkflight-log-subhead"><span>STORED SHIP FITTINGS</span><small>Uninstalled fittings consume Hold equal to slot cost</small></div>
        <div class="arkflight-hold-subgroup"><h3>Ship Mods</h3>${componentManifestRows(manifest.shipMods)}</div>
        <div class="arkflight-hold-subgroup"><h3>Arkengine Mods</h3>${componentManifestRows(manifest.arkengineMods)}</div>
        <div class="arkflight-hold-subgroup"><h3>Weapons</h3>${componentManifestRows(manifest.weapons)}</div>
      </div>

      <div class="arkflight-log-subsection">
        <div class="arkflight-log-subhead"><span>PF2e CARGO & TREASURE</span><small>1 Bulk = 1 Hold · Light = 0.1 Hold</small></div>
        <div class="arkflight-hold-pf2e-list">${pf2eManifestRows(manifest.pf2eItems)}</div>
        <p class="arkflight-log-help">PF2e physical items placed on this Vehicle Actor count as Hold cargo. Negligible Bulk items consume 0 Hold.</p>
      </div>

      <label class="arkflight-log-field arkflight-log-textarea arkflight-hold-notes"><span>Cargo Manifest / Stores Notes</span><textarea data-log-cargo-notes rows="5">${escapeHtml(draft.cargo?.notes ?? "")}</textarea></label>
    </section>

    <section class="arkflight-log-column">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">VESSEL RECORD</span><h2>Registry & Log</h2></div><small>Identity and persistent damage record.</small></div>
      <div class="arkflight-log-identity-grid">${identityFields}</div>
      <label class="arkflight-log-field arkflight-log-textarea"><span>Vessel Notes</span><textarea data-log-identity="notes" rows="5">${escapeHtml(draft.identity?.notes ?? "")}</textarea></label>

      <div class="arkflight-log-subsection">
        <div class="arkflight-log-subhead"><span>RESOURCE LEDGER</span><small>Current persistent vessel state</small></div>
        <div class="arkflight-log-resource-grid">${resourceRows(ship)}</div>
      </div>

      <div class="arkflight-log-subsection arkflight-condition-ledger">
        <div class="arkflight-log-subhead"><span>DAMAGE & CONDITION LOG</span><small>Persistent conditions only</small></div>
        <div class="arkflight-log-condition-list">${conditionRows(ship)}</div>
      </div>

      <div class="arkflight-log-actions">
        <button type="button" data-log-reset>RESET DRAFT</button>
        <button type="button" class="arkflight-log-apply" data-log-apply ${draft.dirty ? "" : "disabled"}>APPLY LOG CHANGES</button>
      </div>
    </section>`;

  root.append(shell);

  for (const input of shell.querySelectorAll("[data-log-identity]")) {
    input.addEventListener("input", (event) => {
      draft.identity[event.currentTarget.dataset.logIdentity] = event.currentTarget.value;
      draft.dirty = true;
      shell.querySelector("[data-log-apply]")?.removeAttribute("disabled");
    });
  }

  shell.querySelector("[data-log-cargo-notes]")?.addEventListener("input", (event) => {
    draft.cargo.notes = event.currentTarget.value;
    draft.dirty = true;
    shell.querySelector("[data-log-apply]")?.removeAttribute("disabled");
  });

  shell.querySelector("[data-log-reset]")?.addEventListener("click", () => {
    drafts.delete(actor.uuid);
    renderHoldLog(root, actor);
  });

  shell.querySelector("[data-log-apply]")?.addEventListener("click", async () => {
    if (!(game.user.isGM || actor.isOwner) || !draft.dirty) return;
    const nextCargo = { ...clone(draft.cargo), used: manifest.total };
    await actor.update({
      [`flags.${MODULE_ID}.ship.identity`]: clone(draft.identity),
      [`flags.${MODULE_ID}.ship.cargo`]: nextCargo
    });
    draft.cargo = clone(nextCargo);
    draft.dirty = false;
    ui.notifications?.info(`${actor.name} vessel record updated.`);
    renderHoldLog(root, actor);
  });
}

function attachHoldLog(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!actor?.flags?.[MODULE_ID]?.ship) return;
  const candidate = html?.[0] ?? html ?? app?.element;
  const root = candidate?.matches?.(".arkflight-ship-shell") ? candidate : candidate?.querySelector?.(".arkflight-ship-shell");
  if (!root || root.dataset.holdLogUxAttached === "true") return;
  const nav = root.querySelector(".arkflight-sheet-tabs");
  if (!nav) return;
  root.dataset.holdLogUxAttached = "true";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-hold-log-tab-button";
  button.dataset.holdTab = "";
  button.innerHTML = '<i class="fa-solid fa-box-open"></i> Hold';
  nav.insertBefore(button, nav.querySelector('[data-tab="fittings"]') ?? null);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    nav.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-active", "is-hold-active"));
    button.classList.add("is-active", "is-hold-active");
    renderHoldLog(root, actor);
  });

  for (const other of [...nav.querySelectorAll("[data-tab]")]) {
    other.addEventListener("click", () => restoreSheet(root), { capture: true });
  }
}

Hooks.on("renderActorSheet", (app, html) => attachHoldLog(app, html));
Hooks.on("renderApplicationV2", (app, html) => attachHoldLog(app, html));

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.hold = Object.freeze({
    scrapPerHold: SCRAP_PER_HOLD,
    usage(actor) {
      const ship = shipFlag(actor);
      return ship ? holdManifest(actor, ship) : null;
    }
  });
});
