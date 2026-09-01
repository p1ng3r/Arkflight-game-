import { SHIP_CATALOGS } from "../content/index.js";
import { ENEMY_ARCHETYPES, generateEnemyShipPreview } from "../generator/enemy-ship-generator.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function componentName(catalog, id) { return catalog?.[id]?.name ?? id; }

function defaultConfig() {
  return { level: 10, archetypeId: "raider", difficulty: "standard", faction: "Independent", theme: "", lootProfile: "standard" };
}

function field(labelText, control) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function selectControl(name, options, value) {
  const select = document.createElement("select");
  select.name = name;
  for (const [optionValue, label] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    select.append(option);
  }
  return select;
}

function inputControl(name, value, type = "text") {
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.value = value ?? "";
  return input;
}

function buildConfigure(app) {
  const config = { ...defaultConfig(), ...(app._arkflightEnemyGeneratorConfig ?? {}) };
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-generator-config";
  panel.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">CONFIGURE</div><h2>Enemy Vessel</h2></div><i class="fa-solid fa-sliders"></i></div>';
  const grid = document.createElement("div");
  grid.className = "arkflight-gm-generator-fields";

  const level = inputControl("level", config.level, "number"); level.min = "1"; level.max = "20"; level.step = "1";
  grid.append(field("Ship Level", level));
  grid.append(field("Archetype", selectControl("archetypeId", Object.entries(ENEMY_ARCHETYPES).map(([id, row]) => [id, row.label]), config.archetypeId)));
  grid.append(field("Quality", selectControl("difficulty", [["poor","Poor"],["standard","Standard"],["elite","Elite"]], config.difficulty)));
  grid.append(field("Loot Richness", selectControl("lootProfile", [["poor","Poor"],["standard","Standard"],["rich","Rich"],["treasure","Treasure Ship"]], config.lootProfile)));
  grid.append(field("Faction", inputControl("faction", config.faction)));
  grid.append(field("Theme", inputControl("theme", config.theme)));
  panel.append(grid);

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-generator-actions";
  const generate = document.createElement("button");
  generate.type = "button";
  generate.className = "arkflight-gm-primary";
  generate.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Preview';
  generate.addEventListener("click", () => {
    const next = Object.fromEntries([...panel.querySelectorAll("[name]")].map((control) => [control.name, control.value]));
    next.level = Number(next.level);
    next.seed = `${next.archetypeId}:${next.level}:${Date.now()}:${Math.random()}`;
    app._arkflightEnemyGeneratorConfig = next;
    try { app._arkflightEnemyGeneratorPreview = generateEnemyShipPreview(next); }
    catch (error) { ui.notifications?.error(error?.message ?? "Unable to generate Arkflight enemy ship preview."); return; }
    app.render({ force: true });
  });
  actions.append(generate);
  panel.append(actions);
  return panel;
}

function metric(label, value) {
  const row = document.createElement("div");
  row.className = "arkflight-gm-metric-row";
  const span = document.createElement("span"); span.textContent = label;
  const strong = document.createElement("strong"); strong.textContent = value ?? "—";
  row.append(span, strong); return row;
}

function listSection(title, rows) {
  const section = document.createElement("div");
  section.className = "arkflight-gm-generator-list";
  const kicker = document.createElement("div"); kicker.className = "arkflight-gm-kicker"; kicker.textContent = title;
  section.append(kicker);
  if (!rows.length) { const empty = document.createElement("small"); empty.textContent = "None"; section.append(empty); return section; }
  for (const row of rows) { const item = document.createElement("span"); item.textContent = row; section.append(item); }
  return section;
}

function buildPreview(app, preview) {
  const panel = document.createElement("section");
  panel.className = "arkflight-gm-generator-preview";

  const summary = document.createElement("article");
  summary.className = "arkflight-gm-panel";
  summary.innerHTML = `<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">GENERATED PREVIEW</div><h2></h2></div><i class="fa-solid fa-ship"></i></div>`;
  summary.querySelector("h2").textContent = preview.ship.identity.name;
  const hull = SHIP_CATALOGS.hulls[preview.ship.hull.chassisId];
  const engine = SHIP_CATALOGS.arkengines[preview.ship.arkengine.chassisId];
  summary.append(metric("Archetype", preview.archetype.label));
  summary.append(metric("Level", preview.config.level));
  summary.append(metric("Hull", hull?.name ?? preview.ship.hull.chassisId));
  summary.append(metric("Arkengine", engine?.name ?? preview.ship.arkengine.chassisId));
  summary.append(metric("Validation", preview.validation.ok ? "LEGAL" : "INVALID"));
  summary.append(metric("Ordinary Crew", `${preview.crew.ordinaryCrew} · min ${preview.crew.minimum} / rec ${preview.crew.recommended}`));

  const loadout = document.createElement("article");
  loadout.className = "arkflight-gm-panel arkflight-gm-generator-loadout";
  loadout.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">LOADOUT</div><h2>Ship Components</h2></div><i class="fa-solid fa-gears"></i></div>';
  const lists = document.createElement("div"); lists.className = "arkflight-gm-generator-list-grid";
  lists.append(listSection("Weapons", preview.ship.weapons.map((install) => `${componentName(SHIP_CATALOGS.weapons, install.id)} · ${titleCase(install.arc)}`)));
  lists.append(listSection("Rooms", preview.ship.rooms.map((id) => componentName(SHIP_CATALOGS.rooms, id))));
  lists.append(listSection("Ship Mods", preview.ship.shipMods.map((id) => componentName(SHIP_CATALOGS.shipMods, id))));
  lists.append(listSection("Arkengine Mods", preview.ship.arkengine.modIds.map((id) => componentName(SHIP_CATALOGS.arkengineMods, id))));
  loadout.append(lists);

  const crew = document.createElement("article");
  crew.className = "arkflight-gm-panel";
  crew.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">PF2E OFFICERS</div><h2>Station Crew Draft</h2></div><i class="fa-solid fa-users"></i></div>';
  const officerGrid = document.createElement("div"); officerGrid.className = "arkflight-gm-generator-officers";
  for (const officer of preview.crew.officers) {
    const row = document.createElement("div");
    const station = document.createElement("span"); station.textContent = titleCase(officer.station);
    const level = document.createElement("strong"); level.textContent = `Level ${officer.level}`;
    const state = document.createElement("small"); state.textContent = "PF2e stat generation pending";
    row.append(station, level, state); officerGrid.append(row);
  }
  crew.append(officerGrid);

  const cargo = document.createElement("article");
  cargo.className = "arkflight-gm-panel";
  cargo.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">CARGO & SALVAGE</div><h2>Encounter Value</h2></div><i class="fa-solid fa-box-open"></i></div>';
  cargo.append(metric("Cargo Load", `${preview.cargo.used} / ${preview.cargo.capacity}`));
  cargo.append(metric("Loot Profile", titleCase(preview.loot.profile)));
  const lootNote = document.createElement("p"); lootNote.className = "arkflight-gm-muted"; lootNote.textContent = preview.loot.note; cargo.append(lootNote);

  const blockers = document.createElement("article");
  blockers.className = "arkflight-gm-panel arkflight-gm-generator-commit";
  const heading = document.createElement("div"); heading.className = "arkflight-gm-card-heading";
  heading.innerHTML = '<div><div class="arkflight-gm-kicker">COMMIT GATE</div><h2>Review Status</h2></div><i class="fa-solid fa-shield-halved"></i>';
  blockers.append(heading);
  const list = document.createElement("ul");
  for (const blocker of preview.blockers) { const li = document.createElement("li"); li.textContent = blocker; list.append(li); }
  blockers.append(list);
  const actions = document.createElement("div"); actions.className = "arkflight-gm-generator-actions";
  const reroll = document.createElement("button"); reroll.type = "button"; reroll.innerHTML = '<i class="fa-solid fa-dice"></i> Reroll Ship';
  reroll.addEventListener("click", () => { const next = { ...preview.config, seed: `${preview.config.archetypeId}:${preview.config.level}:${Date.now()}:${Math.random()}` }; app._arkflightEnemyGeneratorConfig = next; app._arkflightEnemyGeneratorPreview = generateEnemyShipPreview(next); app.render({ force: true }); });
  const commit = document.createElement("button"); commit.type = "button"; commit.className = "arkflight-gm-primary"; commit.disabled = !preview.canCommit; commit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Commit Vessel';
  commit.title = preview.canCommit ? "Persist this reviewed vessel" : "Commit remains locked until PF2e officers and treasure budgeting are complete.";
  actions.append(reroll, commit); blockers.append(actions);

  panel.append(summary, loadout, crew, cargo, blockers);
  return panel;
}

function enhanceGMOperations(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "generate") return;
  const root = app.element;
  if (!root) return;
  const placeholder = [...root.querySelectorAll(".arkflight-gm-empty-state")].find((node) => node.querySelector("h2")?.textContent?.trim() === "Generate");
  if (!placeholder) return;
  const workspace = document.createElement("div");
  workspace.className = "arkflight-gm-generator-workspace";
  workspace.append(buildConfigure(app));
  if (app._arkflightEnemyGeneratorPreview) workspace.append(buildPreview(app, app._arkflightEnemyGeneratorPreview));
  placeholder.replaceWith(workspace);
}

export function installEnemyGeneratorUI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.enemyGenerator = {
      archetypes: ENEMY_ARCHETYPES,
      generatePreview: generateEnemyShipPreview
    };
  });
  Hooks.on("renderApplicationV2", (app) => enhanceGMOperations(app));
}

installEnemyGeneratorUI();
