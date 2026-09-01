import { SHIP_CATALOGS } from "../content/index.js";
import { ENEMY_ARCHETYPES } from "../generator/enemy-ship-generator.js";
import { generateEnemyEncounterPreview } from "../generator/enemy-encounter-preview.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function titleCase(value) {
  return String(value ?? "").replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function componentName(catalog, id) {
  return catalog?.[id]?.name ?? id ?? "—";
}

function gp(value) {
  return `${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`;
}

function defaultConfig() {
  return {
    level: 10,
    partyLevel: 10,
    archetypeId: "raider",
    difficulty: "standard",
    faction: "Independent",
    theme: "",
    lootProfile: "standard",
    rewardWeight: "auto"
  };
}

function field(labelText, control) {
  const label = document.createElement("label");
  label.className = "arkflight-gm-generator-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function input(name, value, type = "text") {
  const control = document.createElement("input");
  control.name = name;
  control.type = type;
  control.value = value ?? "";
  return control;
}

function select(name, rows, value) {
  const control = document.createElement("select");
  control.name = name;
  for (const [id, label] of rows) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    option.selected = id === value;
    control.append(option);
  }
  return control;
}

function readConfig(panel) {
  const config = Object.fromEntries([...panel.querySelectorAll("[name]")].map((control) => [control.name, control.value]));
  config.level = Math.max(1, Math.min(20, Number(config.level) || 1));
  config.partyLevel = Math.max(1, Math.min(20, Number(config.partyLevel) || 1));
  return config;
}

function metric(label, value) {
  const row = document.createElement("div");
  row.className = "arkflight-gm-metric-row";
  const left = document.createElement("span");
  left.textContent = label;
  const right = document.createElement("strong");
  right.textContent = value ?? "—";
  row.append(left, right);
  return row;
}

function listBlock(title, rows) {
  const block = document.createElement("div");
  block.className = "arkflight-gm-generator-list";
  const heading = document.createElement("div");
  heading.className = "arkflight-gm-kicker";
  heading.textContent = title;
  block.append(heading);
  if (!rows.length) {
    const empty = document.createElement("small");
    empty.textContent = "None";
    block.append(empty);
    return block;
  }
  for (const value of rows) {
    const row = document.createElement("span");
    row.textContent = value;
    block.append(row);
  }
  return block;
}

async function resolvePreview(app, config) {
  let preview;
  try {
    preview = generateEnemyEncounterPreview(config);
  } catch (error) {
    console.error("Arkflight enemy generation failed", error);
    ui.notifications?.error(error?.message ?? "Unable to generate Arkflight enemy vessel.");
    return;
  }

  app._arkflightEnemyGeneratorPreview = preview;
  app.render({ force: true });

  const resolver = game.arkflight?.generatedPackageCommit?.resolvePreview;
  if (typeof resolver !== "function") {
    ui.notifications?.error("Arkflight PF2e resolver is unavailable.");
    return;
  }

  try {
    app._arkflightEnemyGeneratorPreview = await resolver(preview);
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight PF2e preview resolution failed", error);
    ui.notifications?.error(error?.message ?? "Unable to resolve PF2e equipment and treasure.");
  }
}

function buildConfigure(app) {
  const config = { ...defaultConfig(), ...(app._arkflightEnemyGeneratorConfig ?? {}) };
  const panel = document.createElement("article");
  panel.className = "arkflight-gm-panel arkflight-gm-generator-config";
  panel.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">CONFIGURE</div><h2>Enemy Vessel</h2></div><i class="fa-solid fa-sliders"></i></div>';

  const grid = document.createElement("div");
  grid.className = "arkflight-gm-generator-fields";
  const shipLevel = input("level", config.level, "number");
  shipLevel.min = "1";
  shipLevel.max = "20";
  const partyLevel = input("partyLevel", config.partyLevel, "number");
  partyLevel.min = "1";
  partyLevel.max = "20";

  grid.append(
    field("Ship Level", shipLevel),
    field("Party Level", partyLevel),
    field("Archetype", select("archetypeId", Object.entries(ENEMY_ARCHETYPES).map(([id, row]) => [id, row.label]), config.archetypeId)),
    field("Quality", select("difficulty", [["poor", "Poor"], ["standard", "Standard"], ["elite", "Elite"]], config.difficulty)),
    field("Loot Profile", select("lootProfile", [["poor", "Poor"], ["standard", "Standard"], ["rich", "Rich"], ["treasure", "Treasure Ship"]], config.lootProfile)),
    field("Reward Weight", select("rewardWeight", [["auto", "Automatic"], ["minor", "Minor"], ["standard", "Standard"], ["major", "Major"], ["hoard", "Hoard"]], config.rewardWeight)),
    field("Faction / House", input("faction", config.faction)),
    field("Theme", input("theme", config.theme))
  );
  panel.append(grid);

  const note = document.createElement("p");
  note.className = "arkflight-gm-muted";
  note.textContent = "Ship Level drives vessel and officer bands. Party Level caps PF2e treasure. Faction doctrine influences generation but never overrides the chosen archetype.";
  panel.append(note);

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-generator-actions";
  const generate = document.createElement("button");
  generate.type = "button";
  generate.className = "arkflight-gm-primary";
  generate.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Preview';
  generate.addEventListener("click", async () => {
    const next = readConfig(panel);
    next.seed = `${next.archetypeId}:${next.level}:${Date.now()}:${Math.random()}`;
    app._arkflightEnemyGeneratorConfig = next;
    generate.disabled = true;
    generate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resolving PF2e';
    await resolvePreview(app, next);
  });
  actions.append(generate);
  panel.append(actions);
  return panel;
}

function officerCard(officer) {
  const card = document.createElement("div");
  card.className = "arkflight-gm-generator-officer-card";
  const name = officer.name ?? officer.role ?? titleCase(officer.station);
  const role = officer.role ?? titleCase(officer.station);
  card.innerHTML = `<div class="arkflight-gm-generator-officer-heading"><strong>${foundry.utils.escapeHTML(name)}</strong><span>Lv ${officer.level}</span></div>`;
  const identity = document.createElement("small");
  identity.textContent = `${role}${officer.ancestry ? ` · ${officer.ancestry}` : ""}${officer.personality ? ` · ${officer.personality}` : ""}`;
  card.append(identity);
  if (officer.statistics) {
    const stats = document.createElement("small");
    stats.textContent = `AC ${officer.statistics.ac} · HP ${officer.statistics.hp} · Per +${officer.statistics.perception} · Strike +${officer.statistics.strike.attack} (${officer.statistics.strike.damage})`;
    card.append(stats);
  }
  if (officer.signatureGear?.state === "resolved") {
    const gear = document.createElement("small");
    gear.textContent = `${officer.signatureGear.resolvedName} · ${gp(officer.signatureGear.estimatedGp)} · recoverable`;
    card.append(gear);
  }
  return card;
}

function salvageLabel(row) {
  const id = row.componentId ?? row.name ?? row.id;
  const catalog = row.type === "arkengine" ? SHIP_CATALOGS.arkengines
    : row.type === "weapon" ? SHIP_CATALOGS.weapons
      : row.type === "ship-mod" ? SHIP_CATALOGS.shipMods
        : row.type === "arkengine-mod" ? SHIP_CATALOGS.arkengineMods
          : null;
  return `${componentName(catalog, id)} · ${titleCase(row.condition)}${row.budgetGp ? ` · ${gp(row.budgetGp)}` : ""}`;
}

async function commitPreview(app, preview) {
  const api = game.arkflight?.generatedPackageCommit;
  if (typeof api?.preflight !== "function" || typeof api?.persist !== "function") {
    ui.notifications?.error("Arkflight generated package Commit API is unavailable.");
    return;
  }

  try {
    const preflight = await api.preflight(preview);
    app._arkflightEnemyGeneratorPreview = preflight.preview;
    let folderConflict = "error";

    if (preflight.requiresFolderDecision) {
      const reuse = globalThis.confirm(`Arkflight/${preflight.plan.shipName} already exists.\n\nOK = Reuse Existing folder\nCancel = Rename generated ship`);
      if (!reuse) {
        const renamed = globalThis.prompt("Enter a new ship name.", `${preflight.plan.shipName} II`);
        if (!renamed?.trim()) return;
        const next = { ...preflight.preview.config, shipName: renamed.trim(), seed: preflight.preview.config.seed };
        app._arkflightEnemyGeneratorConfig = next;
        await resolvePreview(app, next);
        ui.notifications?.info("Ship renamed. Review the resolved preview, then Commit again.");
        return;
      }
      folderConflict = "reuse";
    }

    const result = await api.persist(preflight.preview, { folderConflict });
    ui.notifications?.info(`Created ${result.shipActor.name} and crew in Arkflight/${result.folder.name}.`);
    app._arkflightEnemyGeneratorPreview = null;
    app.render({ force: true });
  } catch (error) {
    console.error("Arkflight generated vessel commit failed", error);
    ui.notifications?.error(error?.message ?? "Unable to commit generated Arkflight vessel.");
  }
}

function buildPreview(app, preview) {
  const section = document.createElement("section");
  section.className = "arkflight-gm-generator-preview";

  const summary = document.createElement("article");
  summary.className = "arkflight-gm-panel";
  summary.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">GENERATED PREVIEW</div><h2></h2></div><i class="fa-solid fa-ship"></i></div>';
  summary.querySelector("h2").textContent = preview.ship.identity.name;
  summary.append(
    metric("Archetype", preview.archetype.label),
    metric("Ship / Party Level", `${preview.config.level} / ${preview.config.partyLevel}`),
    metric("Hull", componentName(SHIP_CATALOGS.hulls, preview.ship.hull.chassisId)),
    metric("Arkengine", componentName(SHIP_CATALOGS.arkengines, preview.ship.arkengine.chassisId)),
    metric("Validation", preview.validation.ok ? "LEGAL" : "INVALID"),
    metric("Ordinary Crew", `${preview.crew.ordinaryCrew} · min ${preview.crew.minimum} / rec ${preview.crew.recommended}`)
  );
  if (preview.doctrine?.warning) {
    const warning = document.createElement("p");
    warning.className = "arkflight-gm-muted";
    warning.textContent = preview.doctrine.warning;
    summary.append(warning);
  }

  const loadout = document.createElement("article");
  loadout.className = "arkflight-gm-panel";
  loadout.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">LOADOUT</div><h2>Ship Components</h2></div><i class="fa-solid fa-gears"></i></div>';
  const lists = document.createElement("div");
  lists.className = "arkflight-gm-generator-list-grid";
  lists.append(
    listBlock("Weapons", (preview.ship.weapons ?? []).map((row) => `${componentName(SHIP_CATALOGS.weapons, row.id)} · ${titleCase(row.arc)}`)),
    listBlock("Rooms", (preview.ship.rooms ?? []).map((id) => componentName(SHIP_CATALOGS.rooms, id))),
    listBlock("Ship Mods", (preview.ship.shipMods ?? []).map((id) => componentName(SHIP_CATALOGS.shipMods, id))),
    listBlock("Arkengine Mods", (preview.ship.arkengine?.modIds ?? []).map((id) => componentName(SHIP_CATALOGS.arkengineMods, id)))
  );
  loadout.append(lists);

  const crew = document.createElement("article");
  crew.className = "arkflight-gm-panel";
  crew.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">PF2E CREW</div><h2>Officers & Crew Templates</h2></div><i class="fa-solid fa-users"></i></div>';
  const officers = document.createElement("div");
  officers.className = "arkflight-gm-generator-officers";
  for (const officer of preview.crew.officers ?? []) officers.append(officerCard(officer));
  crew.append(officers);
  crew.append(listBlock("Ordinary Crew Templates", (preview.crew.templates ?? []).filter((row) => row.selected).map((row) => `${row.label} · Level ${row.level}`)));

  const rewards = document.createElement("article");
  rewards.className = "arkflight-gm-panel";
  rewards.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">PF2E REWARDS</div><h2>Cargo & Salvage</h2></div><i class="fa-solid fa-box-open"></i></div>';
  rewards.append(
    metric("Reward Weight", titleCase(preview.loot.rewardWeight)),
    metric("Economic Ceiling", preview.loot.economicCeiling?.gpBudget != null ? gp(preview.loot.economicCeiling.gpBudget) : "Resolving"),
    metric("Resolved Value", preview.loot.accounting ? `${gp(preview.loot.accounting.totalGp)} / ${gp(preview.loot.accounting.ceilingGp)}` : "Resolving")
  );
  if (preview.loot.state === "resolved") {
    rewards.append(
      listBlock("Recoverable Officer Gear", (preview.loot.personal ?? []).map((row) => `${row.officer}: ${row.name} · ${gp(row.gp)}`)),
      listBlock("Ship Cargo", (preview.loot.shipCargo ?? []).map((row) => `${row.name} · ${gp(row.gp)}`)),
      listBlock("Arkflight Salvage", (preview.loot.salvage ?? []).map(salvageLabel))
    );
  }

  const gate = document.createElement("article");
  gate.className = "arkflight-gm-panel arkflight-gm-generator-commit";
  gate.innerHTML = '<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">COMMIT GATE</div><h2>Review Status</h2></div><i class="fa-solid fa-shield-halved"></i></div>';
  const status = document.createElement("ul");
  if (preview.blockers?.length) {
    for (const blocker of preview.blockers) {
      const item = document.createElement("li");
      item.textContent = blocker;
      status.append(item);
    }
  } else {
    const item = document.createElement("li");
    item.textContent = "PF2e equipment, treasure, ship legality, and crew package resolved. Ready to Commit.";
    status.append(item);
  }
  gate.append(status);

  const actions = document.createElement("div");
  actions.className = "arkflight-gm-generator-actions";
  const reroll = document.createElement("button");
  reroll.type = "button";
  reroll.innerHTML = '<i class="fa-solid fa-dice"></i> Reroll Ship';
  reroll.addEventListener("click", async () => {
    const next = { ...preview.config, seed: `${preview.config.archetypeId}:${preview.config.level}:${Date.now()}:${Math.random()}` };
    app._arkflightEnemyGeneratorConfig = next;
    reroll.disabled = true;
    await resolvePreview(app, next);
  });

  const commit = document.createElement("button");
  commit.type = "button";
  commit.className = "arkflight-gm-primary";
  commit.disabled = !preview.canCommit;
  commit.title = preview.canCommit ? "Create the reviewed vessel and crew package" : "PF2e resolution must complete before Commit";
  commit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Commit Vessel';
  commit.addEventListener("click", async () => {
    commit.disabled = true;
    commit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Committing';
    await commitPreview(app, preview);
  });
  actions.append(reroll, commit);
  gate.append(actions);

  section.append(summary, loadout, crew, rewards, gate);
  return section;
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
      generatePreview: generateEnemyEncounterPreview
    };
  });
  Hooks.on("renderArkflightGMOperations", (app) => enhanceGMOperations(app));
}

installEnemyGeneratorUI();
