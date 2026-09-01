const GM_OPERATIONS_ID = "arkflight-gm-operations";

function addShipNameField(app, root) {
  const fields = root.querySelector(".arkflight-gm-generator-fields");
  if (!fields || fields.querySelector('[name="shipName"]')) return;
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = "Ship Name";
  const input = document.createElement("input");
  input.name = "shipName";
  input.type = "text";
  input.placeholder = "Generated from faction; edit before Commit";
  input.value = app._arkflightEnemyGeneratorConfig?.shipName ?? app._arkflightEnemyGeneratorPreview?.ship?.identity?.name ?? "";
  label.append(span, input);
  const factionField = fields.querySelector('[name="faction"]')?.closest("label");
  if (factionField?.nextSibling) fields.insertBefore(label, factionField.nextSibling);
  else fields.append(label);
}

function addDoctrineWarning(app, root) {
  const warning = app._arkflightEnemyGeneratorPreview?.doctrine?.warning;
  if (!warning) return;
  const summary = root.querySelector(".arkflight-gm-generator-preview .arkflight-gm-panel");
  if (!summary || summary.querySelector("[data-doctrine-warning]")) return;
  const note = document.createElement("div");
  note.dataset.doctrineWarning = "true";
  note.className = "arkflight-gm-launch-warning";
  note.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span></span>';
  note.querySelector("span").textContent = warning;
  summary.append(note);
}

function addCrewTemplates(app, root) {
  const templates = app._arkflightEnemyGeneratorPreview?.crew?.templates ?? [];
  if (!templates.length) return;
  const crewPanel = [...root.querySelectorAll(".arkflight-gm-generator-preview .arkflight-gm-panel")].find((panel) => panel.querySelector("h2")?.textContent?.includes("Station Crew"));
  if (!crewPanel || crewPanel.querySelector("[data-crew-templates]")) return;
  const section = document.createElement("div");
  section.dataset.crewTemplates = "true";
  section.className = "arkflight-gm-generator-template-crew";
  const kicker = document.createElement("div");
  kicker.className = "arkflight-gm-kicker";
  kicker.textContent = "REUSABLE CREW ACTORS";
  section.append(kicker);
  for (const template of templates) {
    const row = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${template.label} · Level ${template.level}`;
    const role = document.createElement("small");
    role.textContent = template.role;
    row.append(name, role);
    section.append(row);
  }
  const note = document.createElement("p");
  note.className = "arkflight-gm-muted";
  note.textContent = "These are reusable PF2e NPC Actors for tokens/boarding scenes; the remaining ordinary crew complement stays numeric.";
  section.append(note);
  crewPanel.append(section);
}

function enhance(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "generate") return;
  const root = app.element;
  if (!root) return;
  addShipNameField(app, root);
  addDoctrineWarning(app, root);
  addCrewTemplates(app, root);
}

Hooks.on("renderApplicationV2", (app) => enhance(app));
