const MODULE_ID = "arkflight-game";
const STATIONS = Object.freeze(["captain", "engineer", "navigator", "battlewatch", "veilwarden"]);

function shellFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? actor?.system?.arkflight?.ship ?? actor?.system?.flags?.arkflight?.ship ?? null;
}

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function crewOptions(ship, stationId) {
  const stations = ship?.crew?.stations ?? {};
  const assignedElsewhere = new Map(STATIONS
    .filter((id) => id !== stationId && stations[id])
    .map((id) => [stations[id], id]));
  return (game.actors?.contents ?? [])
    .filter((actor) => actor.type !== "vehicle")
    .map((actor) => ({
      id: actor.id,
      name: actor.name,
      conflict: assignedElsewhere.get(actor.id) ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function chooseOfficer(actor, stationId) {
  const ship = shipPayload(actor);
  if (!ship) return null;
  const currentId = ship.crew?.stations?.[stationId] ?? "";
  const selectId = `arkflight-player-crew-${stationId}-${Date.now()}`;
  const options = [
    `<option value="">Unassigned</option>`,
    ...crewOptions(ship, stationId).map((row) => `<option value="${foundry.utils.escapeHTML(row.id)}" ${row.id === currentId ? "selected" : ""} ${row.conflict ? "disabled" : ""}>${foundry.utils.escapeHTML(row.name)}${row.conflict ? ` — assigned to ${foundry.utils.escapeHTML(titleCase(row.conflict))}` : ""}</option>`)
  ].join("");

  return foundry.applications.api.DialogV2.wait({
    window: { title: `Assign ${titleCase(stationId)}` },
    content: `<div class="arkflight-crew-assignment-dialog"><p><strong>${foundry.utils.escapeHTML(actor.name)}</strong> · ${foundry.utils.escapeHTML(titleCase(stationId))}</p><p class="hint">Choose the permanent officer for this station. An officer may hold only one permanent station on this ship.</p><select id="${selectId}">${options}</select></div>`,
    buttons: [
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" },
      { action: "assign", label: "Assign Officer", icon: "fa-solid fa-user-check", default: true, callback: () => document.getElementById(selectId)?.value ?? "" }
    ]
  });
}

function wireCrewCards(app, html) {
  const root = shellFrom(app, html);
  if (!root) return;
  const actor = app?.actor ?? app?.document;
  if (!actor || !shipPayload(actor)) return;
  if (!game.user?.isGM && !actor.isOwner) return;

  const cards = [...root.querySelectorAll(".arkflight-station-list .arkflight-station-card")];
  cards.slice(0, STATIONS.length).forEach((card, index) => {
    const stationId = STATIONS[index];
    if (card.dataset.arkflightCrewWired === "true") return;
    card.dataset.arkflightCrewWired = "true";
    card.dataset.crewStation = stationId;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.title = `Assign ${titleCase(stationId)} officer`;
    card.classList.add("arkflight-crew-assignable");

    const assign = async () => {
      const result = await chooseOfficer(actor, stationId);
      if (result === "cancel" || result === null || result === undefined) return;
      try {
        await game.arkflight?.ships?.setStationAssignment?.(actor.id, stationId, result || null);
        app.render({ force: true });
      } catch (error) {
        ui.notifications?.warn(error?.message ?? "Unable to assign Arkflight crew.");
      }
    };

    card.addEventListener("click", assign);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      assign();
    });
  });
}

Hooks.on("renderActorSheet", wireCrewCards);
Hooks.on("renderApplicationV2", wireCrewCards);
