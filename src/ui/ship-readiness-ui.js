const GM_OPERATIONS_ID = "arkflight-gm-operations";

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function actorName(actorId) {
  if (!actorId) return "Unassigned";
  return game.actors?.get(actorId)?.name ?? `Unknown Actor (${actorId})`;
}

function stationRows(entry) {
  const stations = entry?.ship?.crew?.stations ?? {};
  const preferredOrder = ["captain", "engineer", "navigator", "watchmaster", "veilwarden"];
  const keys = [...preferredOrder.filter((key) => key in stations), ...Object.keys(stations).filter((key) => !preferredOrder.includes(key))];
  return keys.map((key) => ({
    id: key,
    label: titleCase(key),
    actorId: stations[key] ?? null,
    name: actorName(stations[key]),
    assigned: Boolean(stations[key])
  }));
}

function derivedRows(entry) {
  const stats = entry?.derived?.stats ?? {};
  const crew = stats.crew ?? {};
  return [
    ["Armor Class", stats.armorClass],
    ["Combat Speed", stats.combatSpeed],
    ["Maneuverability", stats.maneuverability],
    ["Detection", stats.detection],
    ["Crew Minimum", crew.minimum],
    ["Crew Recommended", crew.recommended]
  ].map(([label, value]) => ({ label, value: value ?? "—" }));
}

function conditionRows(entry) {
  const conditions = entry?.conditions ?? [];
  return conditions.map((condition, index) => ({
    id: condition.id ?? `condition-${index + 1}`,
    label: condition.label ?? condition.name ?? titleCase(condition.id ?? `Condition ${index + 1}`),
    system: titleCase(condition.system ?? "ship"),
    state: titleCase(condition.state ?? "condition"),
    severity: Number(condition.severity ?? 0),
    source: condition.source ?? "Unknown source",
    detail: condition.detail ?? condition.description ?? condition.notes ?? "No additional details recorded."
  }));
}

function damagedSystemRows(entry) {
  return (entry?.damagedSystems ?? []).map((row) => ({
    id: `system-${row.system}`,
    label: `${titleCase(row.system)} System`,
    system: titleCase(row.system),
    state: titleCase(row.state),
    severity: row.state === "destroyed" ? 3 : row.state === "disabled" ? 2 : 1,
    source: "Persistent ship system state",
    detail: `${titleCase(row.system)} is currently ${titleCase(row.state).toLowerCase()}.`
  }));
}

function crewCandidates(entry, station) {
  const stations = entry?.ship?.crew?.stations ?? {};
  const usedElsewhere = new Set(Object.entries(stations)
    .filter(([stationId, actorId]) => stationId !== station.id && actorId)
    .map(([, actorId]) => actorId));
  return (game.actors?.contents ?? [])
    .filter((actor) => actor.type !== "vehicle")
    .map((actor) => ({
      id: actor.id,
      name: actor.name ?? actor.id,
      type: titleCase(actor.type),
      unavailable: usedElsewhere.has(actor.id)
    }))
    .sort((a, b) => Number(a.unavailable) - Number(b.unavailable) || a.name.localeCompare(b.name));
}

function choosePermanentCrew(entry, station) {
  return new Promise((resolve) => {
    const DialogV2 = foundry.applications.api.DialogV2;
    const candidates = crewCandidates(entry, station);
    const content = document.createElement("div");
    content.className = "arkflight-gm-crew-picker";
    const intro = document.createElement("p");
    intro.textContent = `Set the permanent ${station.label} for ${entry.name}. One officer may hold only one permanent station on this ship. Voyage Planning may still assign a different officer temporarily for an event.`;
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = "Permanent Officer";
    const select = document.createElement("select");
    select.dataset.permanentCrewPicker = "true";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Unassigned";
    select.append(none);
    for (const candidate of candidates) {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = `${candidate.name} · ${candidate.type}${candidate.unavailable ? " · Assigned Elsewhere" : ""}`;
      option.selected = candidate.id === station.actorId;
      option.disabled = candidate.unavailable && candidate.id !== station.actorId;
      select.append(option);
    }
    label.append(span, select);
    content.append(intro, label);

    new DialogV2({
      window: { title: `Permanent Crew — ${station.label}` },
      content: content.outerHTML,
      buttons: [
        { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark", callback: () => resolve(null) },
        {
          action: "save",
          label: "Save Assignment",
          icon: "fa-solid fa-user-check",
          default: true,
          callback: (_event, button, dialog) => resolve(dialog.element?.querySelector("[data-permanent-crew-picker]")?.value ?? "")
        }
      ],
      close: () => resolve(null)
    }).render({ force: true });
  });
}

function addStatusReasons(root, entry) {
  const reasons = entry.statusReasons ?? [];
  const explanation = reasons.length ? reasons.join("\n") : "No readiness problems detected.";
  for (const row of root.querySelectorAll(`[data-roster-ship-id="${CSS.escape(entry.id)}"]`)) {
    row.title = `${entry.status}\n${explanation}`;
  }
  const header = root.querySelector(".arkflight-gm-ship-summary-head");
  if (!header || header.querySelector("[data-readiness-reasons]")) return;
  const chip = document.createElement("details");
  chip.className = "arkflight-gm-readiness-reasons";
  chip.dataset.readinessReasons = "true";
  const summary = document.createElement("summary");
  summary.innerHTML = '<i class="fa-solid fa-circle-info"></i> Why this status?';
  const body = document.createElement("div");
  if (reasons.length) {
    const list = document.createElement("ul");
    for (const reason of reasons) {
      const item = document.createElement("li");
      item.textContent = reason;
      list.append(item);
    }
    body.append(list);
  } else {
    body.textContent = "All current readiness checks pass.";
  }
  chip.append(summary, body);
  header.querySelector(".arkflight-gm-ship-title-line")?.after(chip);
}

function buildReadinessPanel(entry, app) {
  const stations = stationRows(entry);
  const stats = derivedRows(entry);
  const issues = [...conditionRows(entry), ...damagedSystemRows(entry)];
  const wrapper = document.createElement("section");
  wrapper.className = "arkflight-gm-panel arkflight-gm-ship-readiness-detail";
  wrapper.dataset.shipReadinessDetail = entry.id;

  const heading = document.createElement("div");
  heading.className = "arkflight-gm-card-heading";
  heading.innerHTML = `<div><div class="arkflight-gm-kicker">OPERATIONAL READINESS</div><h2>Crew, Performance & Damage</h2></div><i class="fa-solid fa-clipboard-check"></i>`;
  wrapper.append(heading);

  const statsGrid = document.createElement("div");
  statsGrid.className = "arkflight-gm-derived-readiness-strip";
  for (const row of stats) {
    const cell = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    cell.append(label, value);
    statsGrid.append(cell);
  }
  wrapper.append(statsGrid);

  const split = document.createElement("div");
  split.className = "arkflight-gm-readiness-columns";
  const crewSection = document.createElement("div");
  crewSection.className = "arkflight-gm-readiness-column";
  crewSection.innerHTML = `<div class="arkflight-gm-kicker">PERMANENT STATION CREW</div>`;
  const note = document.createElement("p");
  note.className = "arkflight-gm-muted arkflight-gm-crew-note";
  note.textContent = "Persistent station officers determine station readiness only. Total ship crew complement is tracked separately from these five officer posts. Voyage Planning may temporarily man stations with different officers for that event.";
  crewSection.append(note);
  const crewList = document.createElement("div");
  crewList.className = "arkflight-gm-station-assignment-list";
  for (const station of stations) {
    const row = document.createElement("div");
    row.className = `arkflight-gm-station-assignment ${station.assigned ? "assigned" : "missing"}`;
    const identity = document.createElement("div");
    const stationLabel = document.createElement("span");
    stationLabel.textContent = station.label;
    const officer = document.createElement("strong");
    officer.textContent = station.name;
    identity.append(stationLabel, officer);
    const actions = document.createElement("div");
    actions.className = "arkflight-gm-station-actions";
    if (station.actorId) {
      const sheetButton = document.createElement("button");
      sheetButton.type = "button";
      sheetButton.className = "arkflight-gm-icon-button";
      sheetButton.title = `Open ${station.name} sheet`;
      sheetButton.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
      sheetButton.addEventListener("click", () => game.actors?.get(station.actorId)?.sheet?.render({ force: true }));
      actions.append(sheetButton);
    }
    const assignButton = document.createElement("button");
    assignButton.type = "button";
    assignButton.className = "arkflight-gm-icon-button";
    assignButton.title = station.assigned ? `Change permanent ${station.label}` : `Assign permanent ${station.label}`;
    assignButton.innerHTML = station.assigned ? '<i class="fa-solid fa-user-pen"></i>' : '<i class="fa-solid fa-user-plus"></i>';
    assignButton.addEventListener("click", async () => {
      const selectedId = await choosePermanentCrew(entry, station);
      if (selectedId === null) return;
      try {
        await game.arkflight?.ships?.setStationAssignment?.(entry.id, station.id, selectedId || null);
        app.render({ force: true });
      } catch (error) {
        ui.notifications?.error(error?.message ?? "Unable to update permanent station crew.");
      }
    });
    actions.append(assignButton);
    row.append(identity, actions);
    crewList.append(row);
  }
  if (!stations.length) crewList.innerHTML = `<div class="arkflight-gm-muted">No station assignments are defined on this ship.</div>`;
  crewSection.append(crewList);

  const issueSection = document.createElement("div");
  issueSection.className = "arkflight-gm-readiness-column";
  issueSection.innerHTML = `<div class="arkflight-gm-kicker">PERSISTENT DAMAGE & CONDITIONS</div>`;
  const issueList = document.createElement("div");
  issueList.className = "arkflight-gm-condition-detail-list";
  for (const issue of issues) {
    const details = document.createElement("details");
    details.className = `arkflight-gm-condition-detail severity-${Math.min(3, Math.max(0, issue.severity))}`;
    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.textContent = issue.label;
    const meta = document.createElement("small");
    meta.textContent = `${issue.system} · ${issue.state}${issue.severity ? ` · Severity ${issue.severity}` : ""}`;
    summary.append(label, meta);
    const body = document.createElement("div");
    body.className = "arkflight-gm-condition-detail-body";
    const source = document.createElement("div");
    const sourceLabel = document.createElement("span");
    sourceLabel.textContent = "Source";
    const sourceValue = document.createElement("strong");
    sourceValue.textContent = issue.source;
    source.append(sourceLabel, sourceValue);
    const text = document.createElement("p");
    text.textContent = issue.detail;
    body.append(source, text);
    details.append(summary, body);
    issueList.append(details);
  }
  if (!issues.length) issueList.innerHTML = `<div class="arkflight-gm-clear-state"><i class="fa-solid fa-circle-check"></i><span>No persistent conditions or damaged systems.</span></div>`;
  issueSection.append(issueList);
  split.append(crewSection, issueSection);
  wrapper.append(split);
  return wrapper;
}

function enhanceGMOperations(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  const root = app.element;
  if (!root || !app.selectedRosterShipId) return;
  const entry = game.arkflight?.ships?.get?.(app.selectedRosterShipId);
  if (!entry) return;

  root.querySelectorAll("[data-ship-readiness-detail]").forEach((node) => node.remove());
  addStatusReasons(root, entry);
  const detail = root.querySelector(".arkflight-gm-ship-detail");
  const installed = root.querySelector(".arkflight-gm-installed-components");
  if (!detail) return;
  const panel = buildReadinessPanel(entry, app);
  if (installed) detail.insertBefore(panel, installed);
  else detail.append(panel);
}

export function installShipReadinessUI() {
  Hooks.on("renderApplicationV2", (app) => enhanceGMOperations(app));
}
