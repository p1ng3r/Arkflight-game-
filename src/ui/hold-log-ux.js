import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
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

function restoreSheet(root) {
  root.querySelector(".arkflight-hold-log-shell")?.remove();
  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell").forEach((el) => el.hidden = false);
}

function renderHoldLog(root, actor) {
  const ship = shipFlag(actor);
  if (!ship) return;
  const draft = ensureDraft(actor);
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const cargoCapacity = Number(derived.stats?.cargoCapacity ?? 0);
  const cargoUsed = Math.max(0, Number(draft.cargo?.used ?? 0) || 0);
  const cargoOver = cargoCapacity >= 0 && cargoUsed > cargoCapacity;

  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell,.arkflight-armory-shell,.arkflight-crew-shell").forEach((el) => el.hidden = true);
  root.querySelector(".arkflight-hold-log-shell")?.remove();

  const identityFields = IDENTITY_FIELDS.map(([key, label]) => `
    <label class="arkflight-log-field"><span>${label}</span><input type="text" data-log-identity="${key}" value="${escapeHtml(draft.identity?.[key] ?? "")}"></label>`).join("");

  const shell = document.createElement("main");
  shell.className = "arkflight-hold-log-shell";
  shell.innerHTML = `
    <section class="arkflight-hold-column">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">HOLD</span><h2>Cargo & Vessel Stores</h2></div><small>Persistent ship inventory bookkeeping.</small></div>
      <div class="arkflight-cargo-meter ${cargoOver ? "is-over" : ""}">
        <div><span>Cargo Used</span><strong>${cargoUsed} / ${cargoCapacity}</strong></div>
        <div class="arkflight-cargo-bar"><i style="width:${cargoCapacity > 0 ? Math.min(100, (cargoUsed / cargoCapacity) * 100) : 0}%"></i></div>
        ${cargoOver ? '<small>OVER CAPACITY — the ship remains valid but carries a cargo warning.</small>' : ""}
      </div>
      <label class="arkflight-log-field arkflight-cargo-used"><span>Used Cargo</span><input type="number" min="0" step="1" data-log-cargo-used value="${cargoUsed}"></label>
      <label class="arkflight-log-field arkflight-log-textarea"><span>Cargo Manifest / Stores</span><textarea data-log-cargo-notes rows="11">${escapeHtml(draft.cargo?.notes ?? "")}</textarea></label>

      <div class="arkflight-log-subsection">
        <div class="arkflight-log-subhead"><span>RESOURCE LEDGER</span><small>Current persistent vessel state</small></div>
        <div class="arkflight-log-resource-grid">${resourceRows(ship)}</div>
      </div>
    </section>

    <section class="arkflight-log-column">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">VESSEL RECORD</span><h2>Registry & Log</h2></div><small>Identity and persistent damage record.</small></div>
      <div class="arkflight-log-identity-grid">${identityFields}</div>
      <label class="arkflight-log-field arkflight-log-textarea"><span>Vessel Notes</span><textarea data-log-identity="notes" rows="5">${escapeHtml(draft.identity?.notes ?? "")}</textarea></label>

      <div class="arkflight-log-subsection arkflight-condition-ledger">
        <div class="arkflight-log-subhead"><span>DAMAGE & CONDITION LOG</span><small>Persistent conditions only</small></div>
        <div class="arkflight-log-condition-list">${conditionRows(ship)}</div>
        <p class="arkflight-log-help">Encounter Pressure and Momentum are intentionally not stored here. Persistent damage and conditions are written back to the vessel by ship systems, Voyage, or Combat resolution.</p>
      </div>

      <div class="arkflight-log-actions">
        <button type="button" data-log-reset>RESET DRAFT</button>
        <button type="button" class="arkflight-log-apply" data-log-apply ${draft.dirty ? "" : "disabled"}>APPLY LOG CHANGES</button>
      </div>
    </section>`;

  root.querySelector(".arkflight-ship-footer")?.before(shell);

  for (const input of shell.querySelectorAll("[data-log-identity]")) {
    input.addEventListener("input", (event) => {
      draft.identity[event.currentTarget.dataset.logIdentity] = event.currentTarget.value;
      draft.dirty = true;
      shell.querySelector("[data-log-apply]")?.removeAttribute("disabled");
    });
  }

  shell.querySelector("[data-log-cargo-used]")?.addEventListener("change", (event) => {
    draft.cargo.used = Math.max(0, Number(event.currentTarget.value) || 0);
    draft.dirty = true;
    renderHoldLog(root, actor);
  });

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
    if (!game.user.isGM || !draft.dirty) return;
    await actor.update({
      [`flags.${MODULE_ID}.ship.identity`]: clone(draft.identity),
      [`flags.${MODULE_ID}.ship.cargo`]: clone(draft.cargo)
    });
    draft.dirty = false;
    ui.notifications?.info(`${actor.name} vessel record updated.`);
    renderHoldLog(root, actor);
  });
}

function attachHoldLog(app, html) {
  const actor = app?.actor;
  if (!actor?.flags?.[MODULE_ID]?.isArkflightShip) return;
  const candidate = html?.[0] ?? html;
  const root = candidate?.matches?.(".arkflight-ship-shell") ? candidate : candidate?.querySelector?.(".arkflight-ship-shell");
  if (!root || root.dataset.holdLogUxAttached === "true") return;
  root.dataset.holdLogUxAttached = "true";
  const footer = root.querySelector(".arkflight-ship-footer");
  if (!footer) return;

  const holdLabel = [...footer.children].find((el) => el.textContent?.replace(/\s+/g, " ").trim() === "HOLD & LOG");
  if (!holdLabel) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-hold-log-tab-button";
  button.textContent = "HOLD & LOG";
  holdLabel.replaceWith(button);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    footer.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-active"));
    button.classList.add("is-active");
    renderHoldLog(root, actor);
  });

  for (const other of [...footer.querySelectorAll("button")].filter((entry) => entry !== button)) {
    other.addEventListener("click", () => restoreSheet(root), { capture: true });
  }
}

Hooks.on("renderActorSheet", (app, html) => attachHoldLog(app, html));
