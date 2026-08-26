import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const STATIONS = Object.freeze([
  ["captain", "Captain"],
  ["engineer", "Engineer"],
  ["navigator", "Navigator"],
  ["watchmaster", "Watchmaster"],
  ["veilwarden", "Veilwarden"]
]);
const drafts = new Map();

function clone(value) {
  return foundry.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function ensureDraft(actor) {
  const ship = shipFlag(actor);
  const existing = drafts.get(actor.uuid);
  if (existing) return existing;
  const draft = {
    stations: clone(ship?.crew?.stations ?? {}),
    specialists: [...(ship?.crew?.specialists ?? [])],
    dirty: false
  };
  drafts.set(actor.uuid, draft);
  return draft;
}

function officerActors() {
  return [...(game.actors ?? [])]
    .filter((actor) => ["character", "npc"].includes(actor.type))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function titleCase(value) {
  return String(value ?? "").replace(/[-_.]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function specialistBenefits(item) {
  const benefits = [];
  for (const capability of item?.capabilities ?? []) benefits.push(`Capability: ${titleCase(capability)}`);
  for (const signature of item?.unlocks?.signatures ?? []) benefits.push(`Signature: ${titleCase(signature)}`);
  for (const action of item?.unlocks?.actions ?? []) benefits.push(`Action: ${titleCase(action)}`);
  return benefits;
}

function restoreSheet(root) {
  root.querySelector(".arkflight-crew-shell")?.remove();
  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell,.arkflight-armory-shell").forEach((el) => {
    if (!el.classList.contains("arkflight-armory-shell")) el.hidden = false;
  });
}

function renderCrew(root, actor) {
  const ship = shipFlag(actor);
  if (!ship) return;
  const draft = ensureDraft(actor);
  const officers = officerActors();
  const draftShip = clone(ship);
  draftShip.crew.stations = clone(draft.stations);
  draftShip.crew.specialists = [...draft.specialists];
  const derived = deriveShip(draftShip, SHIP_CATALOGS);
  const crewStats = derived.stats?.crew ?? {};

  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell,.arkflight-armory-shell").forEach((el) => el.hidden = true);
  root.querySelector(".arkflight-crew-shell")?.remove();

  const assignedCount = STATIONS.filter(([key]) => !!draft.stations[key]).length;
  const shell = document.createElement("main");
  shell.className = "arkflight-crew-shell";
  shell.innerHTML = `
    <section class="arkflight-crew-main">
      <div class="arkflight-panel-heading">
        <div><span class="arkflight-ship-kicker">CREW</span><h2>Command Watch</h2></div>
        <small>PF2e Actors man command stations. Specialists remain vessel assets.</small>
      </div>
      <div class="arkflight-crew-complement">
        <div><span>Minimum</span><strong>${crewStats.minimum ?? 0}</strong></div>
        <div><span>Recommended</span><strong>${crewStats.recommended ?? 0}</strong></div>
        <div><span>Maximum</span><strong>${crewStats.maximum ?? 0}</strong></div>
        <div><span>Command Posts</span><strong>${assignedCount} / 5</strong></div>
        <div><span>Specialists</span><strong>${draft.specialists.length}</strong></div>
      </div>
      <div class="arkflight-crew-stations"></div>
    </section>
    <aside class="arkflight-crew-specialists">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">VESSEL ASSETS</span><h2>Crew Specialists</h2></div></div>
      <p class="arkflight-crew-note">Specialists are persistent ship assets, not extra PF2e Actor sheets.</p>
      <div class="arkflight-specialist-list"></div>
      <div class="arkflight-crew-actions">
        <button type="button" data-crew-reset>RESET DRAFT</button>
        <button type="button" class="arkflight-crew-apply" data-crew-apply ${draft.dirty ? "" : "disabled"}>APPLY CREW ASSIGNMENTS</button>
      </div>
    </aside>`;
  root.querySelector(".arkflight-ship-footer")?.before(shell);

  const stationList = shell.querySelector(".arkflight-crew-stations");
  for (const [key, label] of STATIONS) {
    const card = document.createElement("section");
    card.className = "arkflight-crew-station-card";
    const current = draft.stations[key] ?? "";
    const options = officers.map((officer) => `<option value="${officer.uuid}" ${current === officer.uuid ? "selected" : ""}>${officer.name}</option>`).join("");
    card.innerHTML = `
      <div class="arkflight-crew-station-icon"><i class="fa-solid fa-compass-drafting"></i></div>
      <div class="arkflight-crew-station-copy"><span>COMMAND STATION</span><strong>${label}</strong><small>${current ? "Assigned officer" : "Unassigned"}</small></div>
      <select data-crew-station="${key}"><option value="">— Unassigned —</option>${options}</select>`;
    card.querySelector("select").addEventListener("change", (event) => {
      const value = event.currentTarget.value || null;
      if (value) {
        for (const [otherKey] of STATIONS) {
          if (otherKey !== key && draft.stations[otherKey] === value) draft.stations[otherKey] = null;
        }
      }
      draft.stations[key] = value;
      draft.dirty = true;
      renderCrew(root, actor);
    });
    stationList.append(card);
  }

  const specialistList = shell.querySelector(".arkflight-specialist-list");
  const specialists = Object.values(SHIP_CATALOGS.crewSpecialists ?? {}).sort((a, b) => {
    const ai = draft.specialists.includes(a.id) ? 0 : 1;
    const bi = draft.specialists.includes(b.id) ? 0 : 1;
    return ai - bi || a.name.localeCompare(b.name);
  });
  for (const item of specialists) {
    const installed = draft.specialists.includes(item.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `arkflight-specialist-card ${installed ? "is-installed" : ""}`;
    const benefits = specialistBenefits(item);
    const assign = (item.data?.canAssignTo ?? []).map(titleCase).join(" · ") || "Support";
    card.innerHTML = `
      <span class="arkflight-specialist-state">${installed ? "ASSIGNED" : "ADD SPECIALIST"}</span>
      <strong>${item.name}</strong>
      <small>T${item.data?.tier ?? "—"} · ${titleCase(item.data?.preferredStation ?? "support")} · ${assign}</small>
      <p>${item.description ?? ""}</p>
      <div class="arkflight-specialist-benefits">${benefits.length ? benefits.map((benefit) => `<span>${benefit}</span>`).join("") : "<span>Support / narrative capability</span>"}</div>`;
    card.addEventListener("click", () => {
      const index = draft.specialists.indexOf(item.id);
      if (index >= 0) draft.specialists.splice(index, 1); else draft.specialists.push(item.id);
      draft.dirty = true;
      renderCrew(root, actor);
    });
    specialistList.append(card);
  }

  shell.querySelector("[data-crew-reset]")?.addEventListener("click", () => {
    drafts.delete(actor.uuid);
    renderCrew(root, actor);
  });

  shell.querySelector("[data-crew-apply]")?.addEventListener("click", async () => {
    if (!game.user.isGM || !draft.dirty) return;
    await actor.update({
      [`flags.${MODULE_ID}.ship.crew.stations`]: clone(draft.stations),
      [`flags.${MODULE_ID}.ship.crew.specialists`]: [...draft.specialists]
    });
    draft.dirty = false;
    ui.notifications?.info(`${actor.name} crew assignments applied.`);
    renderCrew(root, actor);
  });
}

function attachCrew(app, html) {
  const actor = app?.actor;
  if (!actor?.flags?.[MODULE_ID]?.isArkflightShip) return;
  const root = html?.[0]?.matches?.(".arkflight-ship-shell") ? html[0] : html?.[0]?.querySelector?.(".arkflight-ship-shell") ?? html?.querySelector?.(".arkflight-ship-shell");
  if (!root || root.dataset.crewUxAttached === "true") return;
  root.dataset.crewUxAttached = "true";
  const footer = root.querySelector(".arkflight-ship-footer");
  if (!footer) return;
  const crewLabel = [...footer.children].find((el) => el.textContent?.trim() === "CREW");
  if (!crewLabel) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-crew-tab-button";
  button.textContent = "CREW";
  crewLabel.replaceWith(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    footer.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-active"));
    button.classList.add("is-active");
    renderCrew(root, actor);
  });

  for (const existing of footer.querySelectorAll("button[data-tab],.arkflight-armory-tab-button")) {
    existing.addEventListener("click", () => restoreSheet(root), { capture: true });
  }
}

Hooks.on("renderActorSheet", (app, html) => attachCrew(app, html));
