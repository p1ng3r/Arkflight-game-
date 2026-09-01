import { generateEnemyEncounterPreview } from "../generator/enemy-encounter-preview.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function addShipNameField(app, root) {
  const fields = root.querySelector(".arkflight-gm-generator-fields");
  if (!fields || fields.querySelector('[name="shipName"]')) return;
  const label = document.createElement("label");
  const span = document.createElement("span"); span.textContent = "Ship Name";
  const input = document.createElement("input"); input.name = "shipName"; input.type = "text"; input.placeholder = "Generated from faction; edit before Commit";
  input.value = app._arkflightEnemyGeneratorConfig?.shipName ?? app._arkflightEnemyGeneratorPreview?.ship?.identity?.name ?? "";
  label.append(span, input);
  const factionField = fields.querySelector('[name="faction"]')?.closest("label");
  if (factionField?.nextSibling) fields.insertBefore(label, factionField.nextSibling); else fields.append(label);
}

function addDoctrineWarning(app, root) {
  const warning = app._arkflightEnemyGeneratorPreview?.doctrine?.warning;
  if (!warning) return;
  const summary = root.querySelector(".arkflight-gm-generator-preview .arkflight-gm-panel");
  if (!summary || summary.querySelector("[data-doctrine-warning]")) return;
  const note = document.createElement("div"); note.dataset.doctrineWarning = "true"; note.className = "arkflight-gm-launch-warning";
  note.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span></span>'; note.querySelector("span").textContent = warning; summary.append(note);
}

async function regenerateWithCrewSelection(app, selectedTypes) {
  const preview = app._arkflightEnemyGeneratorPreview;
  if (!preview) return;
  const next = { ...preview.config, crewTemplateTypes:selectedTypes, shipName:preview.ship.identity.name, seed:preview.config.seed };
  app._arkflightEnemyGeneratorConfig = next;
  const base = generateEnemyEncounterPreview(next);
  app._arkflightEnemyGeneratorPreview = base;
  app.render({ force:true });
  const resolver = game.arkflight?.generatedPackageCommit?.resolvePreview;
  if (typeof resolver !== "function") return;
  try { app._arkflightEnemyGeneratorPreview = await resolver(base); app.render({ force:true }); }
  catch (error) { console.error("Arkflight crew template PF2e re-resolution failed", error); ui.notifications?.error(error?.message ?? "Unable to re-resolve generated crew package."); }
}

function addCrewTemplates(app, root) {
  const templates = app._arkflightEnemyGeneratorPreview?.crew?.templates ?? [];
  if (!templates.length) return;
  const crewPanel = [...root.querySelectorAll(".arkflight-gm-generator-preview .arkflight-gm-panel")].find((panel) => panel.querySelector("h2")?.textContent?.includes("Station Crew"));
  if (!crewPanel || crewPanel.querySelector("[data-crew-templates]")) return;
  const section = document.createElement("div"); section.dataset.crewTemplates = "true"; section.className = "arkflight-gm-generator-template-crew";
  const kicker = document.createElement("div"); kicker.className = "arkflight-gm-kicker"; kicker.textContent = "REUSABLE CREW ACTORS"; section.append(kicker);
  for (const template of templates) {
    const row = document.createElement("label"); row.className = "arkflight-gm-generator-template-toggle";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = Boolean(template.selected); checkbox.dataset.crewTemplateType = template.type;
    const text = document.createElement("span"); const name = document.createElement("strong"); name.textContent = `${template.label} · Level ${template.level}`; const role = document.createElement("small"); role.textContent = template.role; text.append(name, role); row.append(checkbox, text); section.append(row);
  }
  section.addEventListener("change", (event) => {
    if (!event.target?.matches?.("[data-crew-template-type]")) return;
    const selectedTypes = [...section.querySelectorAll("[data-crew-template-type]:checked")].map((input) => input.dataset.crewTemplateType);
    void regenerateWithCrewSelection(app, selectedTypes);
  });
  const note = document.createElement("p"); note.className = "arkflight-gm-muted"; note.textContent = "Arkflight selects useful crew types automatically from vessel role, weapons, and doctrine. Toggle any template before Commit; the remaining ordinary crew complement stays numeric."; section.append(note); crewPanel.append(section);
}

async function addPackageConflictState(app) {
  const shipName = app._arkflightEnemyGeneratorPreview?.ship?.identity?.name;
  const finder = game.arkflight?.generatedShipFolders?.findShipPackageFolder;
  if (!shipName || typeof finder !== "function") return;
  const existing = await finder(shipName);
  if (!existing || !app.element?.isConnected) return;
  const summary = app.element.querySelector(".arkflight-gm-generator-preview .arkflight-gm-panel");
  if (!summary || summary.querySelector("[data-package-conflict]")) return;
  const note = document.createElement("div"); note.dataset.packageConflict = existing.id; note.className = "arkflight-gm-launch-warning";
  note.innerHTML = '<i class="fa-solid fa-folder-tree"></i><span></span>'; note.querySelector("span").textContent = `Arkflight/${shipName} already exists. Commit will require Rename or Reuse Existing; it will not merge automatically.`; summary.append(note);
}

function enhance(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "generate") return;
  const root = app.element; if (!root) return;
  addShipNameField(app, root); addDoctrineWarning(app, root); addCrewTemplates(app, root); void addPackageConflictState(app, root);
}

Hooks.on("renderApplicationV2", (app) => enhance(app));
