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

function buildReadinessPanel(entry) {
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
    cell.innerHTML = `<span>${row.label}</span><strong>${row.value}</strong>`;
    statsGrid.append(cell);
  }
  wrapper.append(statsGrid);

  const split = document.createElement("div");
  split.className = "arkflight-gm-readiness-columns";

  const crewSection = document.createElement("div");
  crewSection.className = "arkflight-gm-readiness-column";
  crewSection.innerHTML = `<div class="arkflight-gm-kicker">STATION ASSIGNMENTS</div>`;
  const crewList = document.createElement("div");
  crewList.className = "arkflight-gm-station-assignment-list";
  for (const station of stations) {
    const row = document.createElement("div");
    row.className = `arkflight-gm-station-assignment ${station.assigned ? "assigned" : "missing"}`;
    row.innerHTML = `<span>${station.label}</span><strong>${station.name}</strong>`;
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
    summary.innerHTML = `<span>${issue.label}</span><small>${issue.system} · ${issue.state}${issue.severity ? ` · Severity ${issue.severity}` : ""}</small>`;
    const body = document.createElement("div");
    body.className = "arkflight-gm-condition-detail-body";
    const source = document.createElement("div");
    source.innerHTML = `<span>Source</span><strong></strong>`;
    source.querySelector("strong").textContent = issue.source;
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
  const detail = root.querySelector(".arkflight-gm-ship-detail");
  const installed = root.querySelector(".arkflight-gm-installed-components");
  if (!detail) return;
  const panel = buildReadinessPanel(entry);
  if (installed) detail.insertBefore(panel, installed);
  else detail.append(panel);
}

export function installShipReadinessUI() {
  Hooks.on("renderApplicationV2", (app) => enhanceGMOperations(app));
}
