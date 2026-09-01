import { SHIP_CATALOGS } from "../content/index.js";
import { ENEMY_ARCHETYPES } from "../generator/enemy-ship-generator.js";
import { generateEnemyEncounterPreview } from "../generator/enemy-encounter-preview.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function componentName(catalog, id) { return catalog?.[id]?.name ?? id; }
function defaultConfig() { return { level:10, partyLevel:10, archetypeId:"raider", difficulty:"standard", faction:"Independent", theme:"", lootProfile:"standard" }; }
function gp(value) { return `${Number(value ?? 0).toLocaleString(undefined,{maximumFractionDigits:2})} gp`; }

function field(labelText, control) {
  const label = document.createElement("label");
  const span = document.createElement("span"); span.textContent = labelText;
  label.append(span, control); return label;
}

function selectControl(name, options, value) {
  const select = document.createElement("select"); select.name = name;
  for (const [optionValue, label] of options) {
    const option = document.createElement("option"); option.value = optionValue; option.textContent = label; option.selected = optionValue === value; select.append(option);
  }
  return select;
}

function inputControl(name, value, type="text") { const input = document.createElement("input"); input.name=name; input.type=type; input.value=value ?? ""; return input; }
function readConfig(panel) { const next=Object.fromEntries([...panel.querySelectorAll("[name]")].map((control)=>[control.name,control.value])); next.level=Number(next.level); next.partyLevel=Number(next.partyLevel); return next; }

async function resolveAndShow(app, config) {
  let preview;
  try { preview = generateEnemyEncounterPreview(config); }
  catch (error) { ui.notifications?.error(error?.message ?? "Unable to generate Arkflight enemy ship preview."); return; }
  app._arkflightEnemyGeneratorPreview = preview;
  app.render({ force:true });
  const resolver = game.arkflight?.generatedPackageCommit?.resolvePreview;
  if (typeof resolver !== "function") { ui.notifications?.error("Arkflight PF2e preview resolver is unavailable."); return; }
  try {
    app._arkflightEnemyGeneratorPreview = await resolver(preview);
    app.render({ force:true });
  } catch (error) {
    console.error("Arkflight PF2e preview resolution failed", error);
    ui.notifications?.error(error?.message ?? "Unable to resolve PF2e equipment and treasure.");
  }
}

function buildConfigure(app) {
  const config = { ...defaultConfig(), ...(app._arkflightEnemyGeneratorConfig ?? {}) };
  const panel = document.createElement("article"); panel.className="arkflight-gm-panel arkflight-gm-generator-config";
  panel.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">CONFIGURE</div><h2>Enemy Vessel</h2></div><i class="fa-solid fa-sliders"></i></div>';
  const grid=document.createElement("div"); grid.className="arkflight-gm-generator-fields";
  const level=inputControl("level",config.level,"number"); level.min="1"; level.max="20"; level.step="1";
  const partyLevel=inputControl("partyLevel",config.partyLevel,"number"); partyLevel.min="1"; partyLevel.max="20"; partyLevel.step="1";
  grid.append(field("Ship Level",level));
  grid.append(field("Party Level",partyLevel));
  grid.append(field("Archetype",selectControl("archetypeId",Object.entries(ENEMY_ARCHETYPES).map(([id,row])=>[id,row.label]),config.archetypeId)));
  grid.append(field("Quality",selectControl("difficulty",[["poor","Poor"],["standard","Standard"],["elite","Elite"]],config.difficulty)));
  grid.append(field("Loot Richness",selectControl("lootProfile",[["poor","Poor"],["standard","Standard"],["rich","Rich"],["treasure","Treasure Ship"]],config.lootProfile)));
  grid.append(field("Faction",inputControl("faction",config.faction)));
  grid.append(field("Theme",inputControl("theme",config.theme)));
  panel.append(grid);
  const note=document.createElement("p"); note.className="arkflight-gm-muted"; note.textContent="Ship Level drives vessel and officer bands. Party Level and Reward Weight cap PF2e treasure."; panel.append(note);
  const actions=document.createElement("div"); actions.className="arkflight-gm-generator-actions";
  const generate=document.createElement("button"); generate.type="button"; generate.className="arkflight-gm-primary"; generate.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Preview';
  generate.addEventListener("click",async()=>{
    const next=readConfig(panel); next.seed=`${next.archetypeId}:${next.level}:${Date.now()}:${Math.random()}`; app._arkflightEnemyGeneratorConfig=next;
    generate.disabled=true; generate.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Resolving PF2e';
    await resolveAndShow(app,next);
  });
  actions.append(generate); panel.append(actions); return panel;
}

function metric(label,value) { const row=document.createElement("div"); row.className="arkflight-gm-metric-row"; const span=document.createElement("span"); span.textContent=label; const strong=document.createElement("strong"); strong.textContent=value ?? "—"; row.append(span,strong); return row; }
function listSection(title,rows) { const section=document.createElement("div"); section.className="arkflight-gm-generator-list"; const kicker=document.createElement("div"); kicker.className="arkflight-gm-kicker"; kicker.textContent=title; section.append(kicker); if(!rows.length){const empty=document.createElement("small");empty.textContent="None";section.append(empty);return section;} for(const row of rows){const item=document.createElement("span");item.textContent=row;section.append(item);} return section; }

function buildOfficerCard(officer) {
  const row=document.createElement("div"); row.className="arkflight-gm-generator-officer-card";
  const heading=document.createElement("div"); heading.className="arkflight-gm-generator-officer-heading";
  const title=document.createElement("strong"); title.textContent=`${officer.role} · Level ${officer.level}`; const quality=document.createElement("span"); quality.textContent=officer.quality; heading.append(title,quality);
  const identity=document.createElement("small"); identity.textContent=officer.identity;
  const stats=document.createElement("div"); stats.className="arkflight-gm-generator-officer-stats";
  for(const [label,value] of [["AC",officer.statistics.ac],["HP",officer.statistics.hp],["Per",`+${officer.statistics.perception}`],["Strike",`+${officer.statistics.strike.attack} · ${officer.statistics.strike.damage}`]]){const cell=document.createElement("span");cell.textContent=`${label} ${value}`;stats.append(cell);}
  const skills=document.createElement("small"); skills.textContent=Object.entries(officer.statistics.skills).map(([skill,bonus])=>`${titleCase(skill)} +${bonus}`).join(" · ");
  const saves=document.createElement("small"); saves.textContent=`Fort +${officer.statistics.saves.fortitude} · Ref +${officer.statistics.saves.reflex} · Will +${officer.statistics.saves.will}`;
  const abilities=document.createElement("small"); abilities.textContent=officer.abilities.map((ability)=>ability.name).join(" · ");
  row.append(heading,identity,stats,skills,saves,abilities);
  if(officer.statistics.spellcasting){const spell=document.createElement("small");spell.textContent=`Occult DC ${officer.statistics.spellcasting.dc} · spell attack +${officer.statistics.spellcasting.attack}`;row.append(spell);}
  if(officer.signatureGear?.state === "resolved") { const gear=document.createElement("small"); gear.textContent=`Real PF2e gear: ${officer.signatureGear.resolvedName} · ${gp(officer.signatureGear.estimatedGp)} · potency +${officer.signatureGear.potency} · striking ${officer.signatureGear.striking} · Recoverable`; row.append(gear); }
  else if(officer.weaponIntent) { const gear=document.createElement("small"); gear.textContent=`PF2e weapon pool: ${officer.weaponIntent.candidateSlugs.join(", ")} · ${officer.weaponIntent.upgradeAllowance}`; row.append(gear); }
  return row;
}

function salvageLabel(row) { const id=row.componentId ?? row.name ?? row.id; const name=row.type === "arkengine" ? componentName(SHIP_CATALOGS.arkengines,id) : row.type === "weapon" ? componentName(SHIP_CATALOGS.weapons,id) : row.type === "ship-mod" ? componentName(SHIP_CATALOGS.shipMods,id) : row.type === "arkengine-mod" ? componentName(SHIP_CATALOGS.arkengineMods,id) : id; return `${name} · ${titleCase(row.condition)}${row.budgetGp ? ` · ${gp(row.budgetGp)}` : ""}`; }

async function commitPreview(app, preview) {
  const api=game.arkflight?.generatedPackageCommit;
  if(typeof api?.preflight !== "function" || typeof api?.persist !== "function") { ui.notifications?.error("Arkflight generated package Commit API is unavailable."); return; }
  try {
    const preflight=await api.preflight(preview);
    app._arkflightEnemyGeneratorPreview=preflight.preview;
    if(preflight.requiresFolderDecision) {
      const reuse=globalThis.confirm(`Arkflight/${preflight.plan.shipName} already exists.\n\nOK = Reuse Existing folder\nCancel = Rename this generated ship`);
      if(!reuse) {
        const renamed=globalThis.prompt("Enter a new ship name. The preview will be re-resolved for review before Commit.",`${preflight.plan.shipName} II`);
        if(!renamed?.trim()) return;
        const next={...preflight.preview.config,shipName:renamed.trim(),seed:preflight.preview.config.seed};
        app._arkflightEnemyGeneratorConfig=next;
        await resolveAndShow(app,next);
        ui.notifications?.info("Ship renamed. Review the resolved preview, then Commit again.");
        return;
      }
      const result=await api.persist(preflight.preview,{folderConflict:"reuse"});
      ui.notifications?.info(`Created ${result.shipActor.name} and crew in Arkflight/${result.folder.name}.`);
    } else {
      const result=await api.persist(preflight.preview,{folderConflict:"error"});
      ui.notifications?.info(`Created ${result.shipActor.name} and crew in Arkflight/${result.folder.name}.`);
    }
    app._arkflightEnemyGeneratorPreview=null;
    app.render({force:true});
  } catch(error) {
    console.error("Arkflight generated vessel commit failed",error);
    ui.notifications?.error(error?.message ?? "Unable to commit generated Arkflight vessel.");
  }
}

function buildPreview(app,preview) {
  const panel=document.createElement("section"); panel.className="arkflight-gm-generator-preview";
  const summary=document.createElement("article"); summary.className="arkflight-gm-panel"; summary.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">GENERATED PREVIEW</div><h2></h2></div><i class="fa-solid fa-ship"></i></div>'; summary.querySelector("h2").textContent=preview.ship.identity.name;
  const hull=SHIP_CATALOGS.hulls[preview.ship.hull.chassisId]; const engine=SHIP_CATALOGS.arkengines[preview.ship.arkengine.chassisId];
  summary.append(metric("Archetype",preview.archetype.label),metric("Ship / Party Level",`${preview.config.level} / ${preview.config.partyLevel}`),metric("Hull",hull?.name ?? preview.ship.hull.chassisId),metric("Arkengine",engine?.name ?? preview.ship.arkengine.chassisId),metric("Validation",preview.validation.ok?"LEGAL":"INVALID"),metric("Ordinary Crew",`${preview.crew.ordinaryCrew} · min ${preview.crew.minimum} / rec ${preview.crew.recommended}`));

  const loadout=document.createElement("article"); loadout.className="arkflight-gm-panel arkflight-gm-generator-loadout"; loadout.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">LOADOUT</div><h2>Ship Components</h2></div><i class="fa-solid fa-gears"></i></div>';
  const lists=document.createElement("div"); lists.className="arkflight-gm-generator-list-grid"; lists.append(listSection("Weapons",preview.ship.weapons.map((install)=>`${componentName(SHIP_CATALOGS.weapons,install.id)} · ${titleCase(install.arc)}`)),listSection("Rooms",preview.ship.rooms.map((id)=>componentName(SHIP_CATALOGS.rooms,id))),listSection("Ship Mods",preview.ship.shipMods.map((id)=>componentName(SHIP_CATALOGS.shipMods,id))),listSection("Arkengine Mods",preview.ship.arkengine.modIds.map((id)=>componentName(SHIP_CATALOGS.arkengineMods,id)))); loadout.append(lists);

  const crew=document.createElement("article"); crew.className="arkflight-gm-panel"; crew.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">PF2E OFFICERS</div><h2>Station Crew Benchmarks</h2></div><i class="fa-solid fa-users"></i></div>'; const officerGrid=document.createElement("div"); officerGrid.className="arkflight-gm-generator-officers"; for(const officer of preview.crew.officers) officerGrid.append(buildOfficerCard(officer)); crew.append(officerGrid);

  const cargo=document.createElement("article"); cargo.className="arkflight-gm-panel"; cargo.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">CARGO & SALVAGE</div><h2>Encounter Value</h2></div><i class="fa-solid fa-box-open"></i></div>';
  cargo.append(metric("Cargo Load",`${preview.cargo.used} / ${preview.cargo.capacity}`),metric("Loot Profile",titleCase(preview.loot.profile)),metric("Economic Ceiling",preview.loot.economicCeiling?.gpBudget!=null?`${gp(preview.loot.economicCeiling.gpBudget)} · Party Level ${preview.loot.economicCeiling.level}`:`Party Level ${preview.loot.economicCeiling.level}`),metric("Reward Weight",titleCase(preview.loot.rewardWeight)),metric("Distribution",`${Math.round(preview.loot.distribution.personal*100)}% personal · ${Math.round(preview.loot.distribution.shipCargo*100)}% cargo · ${Math.round(preview.loot.distribution.arkflightSalvage*100)}% salvage`));
  if(preview.loot.state === "resolved") {
    cargo.append(listSection("Personal / Recoverable Gear",preview.loot.personal.map((row)=>`${row.officer}: ${row.name} · ${gp(row.gp)} · reward decision pending`)));
    cargo.append(listSection("Ship Cargo",preview.loot.shipCargo.map((row)=>`${row.name} · ${gp(row.gp)}`)));
    cargo.append(listSection("Arkflight Salvage",preview.loot.salvage.map(salvageLabel)));
    cargo.append(metric("Resolved Reward Value",`${gp(preview.loot.accounting?.totalGp)} / ${gp(preview.loot.accounting?.ceilingGp)}`));
  }
  const lootNote=document.createElement("p"); lootNote.className="arkflight-gm-muted"; lootNote.textContent=preview.loot.note; cargo.append(lootNote);

  const gate=document.createElement("article"); gate.className="arkflight-gm-panel arkflight-gm-generator-commit"; gate.innerHTML='<div class="arkflight-gm-card-heading"><div><div class="arkflight-gm-kicker">COMMIT GATE</div><h2>Review Status</h2></div><i class="fa-solid fa-shield-halved"></i></div>';
  const status=document.createElement("ul"); if(preview.blockers?.length){for(const blocker of preview.blockers){const li=document.createElement("li");li.textContent=blocker;status.append(li);}} else {const li=document.createElement("li");li.textContent="PF2e equipment, treasure, ship legality, and crew package resolved. Ready to Commit.";status.append(li);} gate.append(status);
  const actions=document.createElement("div"); actions.className="arkflight-gm-generator-actions";
  const reroll=document.createElement("button"); reroll.type="button"; reroll.innerHTML='<i class="fa-solid fa-dice"></i> Reroll Ship'; reroll.addEventListener("click",async()=>{const next={...preview.config,seed:`${preview.config.archetypeId}:${preview.config.level}:${Date.now()}:${Math.random()}`};app._arkflightEnemyGeneratorConfig=next;reroll.disabled=true;await resolveAndShow(app,next);});
  const commit=document.createElement("button"); commit.type="button"; commit.className="arkflight-gm-primary"; commit.disabled=!preview.canCommit; commit.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Commit Vessel'; commit.title=preview.canCommit?"Create the reviewed ship, officers, selected crew templates, station assignments, and reward manifest":"PF2e resolution must finish before Commit"; commit.addEventListener("click",async()=>{commit.disabled=true;commit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Committing';await commitPreview(app,preview);});
  actions.append(reroll,commit); gate.append(actions);
  panel.append(summary,loadout,crew,cargo,gate); return panel;
}

function enhanceGMOperations(app) {
  if(app?.id!==GM_OPERATIONS_ID && app?.options?.id!==GM_OPERATIONS_ID) return; if(app.activeSection!=="generate") return; const root=app.element; if(!root) return;
  const placeholder=[...root.querySelectorAll(".arkflight-gm-empty-state")].find((node)=>node.querySelector("h2")?.textContent?.trim()==="Generate"); if(!placeholder) return;
  const workspace=document.createElement("div"); workspace.className="arkflight-gm-generator-workspace"; workspace.append(buildConfigure(app)); if(app._arkflightEnemyGeneratorPreview) workspace.append(buildPreview(app,app._arkflightEnemyGeneratorPreview)); placeholder.replaceWith(workspace);
}

export function installEnemyGeneratorUI() {
  Hooks.once("init",()=>{game.arkflight??={};game.arkflight.enemyGenerator={archetypes:ENEMY_ARCHETYPES,generatePreview:generateEnemyEncounterPreview};});
  Hooks.on("renderApplicationV2",(app)=>enhanceGMOperations(app));
}

installEnemyGeneratorUI();
