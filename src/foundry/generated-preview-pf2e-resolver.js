import { encounterTreasureBudget } from "../generator/pf2e-treasure-budget.js";
import { resolveOfficerWeapon, pf2eTreasureCandidates, materializeTreasureCandidate } from "./pf2e-equipment-resolver.js";

function seededRng(seed="arkflight") {
  let state = 2166136261;
  for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function money(value) { return Math.max(0, Math.round(Number(value) * 100) / 100); }
function clone(value) { return structuredClone(value); }

function embedResolvedWeapon(officer, resolved) {
  const actorData = clone(officer.actorData);
  actorData.items ??= [];
  actorData.items.push(clone(resolved.itemData));
  actorData.flags ??= {};
  actorData.flags["arkflight-game"] = {
    ...(actorData.flags["arkflight-game"] ?? {}),
    resolvedSignatureGear: { name:resolved.name, uuid:resolved.uuid, estimatedGp:resolved.estimatedGp, recoverable:true, autoAward:false }
  };
  return Object.freeze({
    ...officer,
    actorData:Object.freeze(actorData),
    signatureGear:Object.freeze({
      ...(officer.signatureGear ?? {}),
      resolvedName:resolved.name,
      resolvedUuid:resolved.uuid,
      estimatedGp:resolved.estimatedGp,
      potency:resolved.potency,
      striking:resolved.striking,
      recoverable:true,
      autoAward:false,
      state:"resolved"
    }),
    weaponIntent:Object.freeze({ ...(officer.weaponIntent ?? {}), resolverState:"resolved" })
  });
}

async function resolveOfficers(preview, personalBudget) {
  const officers = [];
  const personal = [];
  let remaining = personalBudget;
  const perOfficer = personalBudget / Math.max(1, preview.crew.officers.length);
  for (const officer of preview.crew.officers) {
    const resolved = await resolveOfficerWeapon(officer.weaponIntent, { maxGp:Math.max(5, Math.min(perOfficer, remaining)) });
    officers.push(embedResolvedWeapon(officer, resolved));
    remaining = Math.max(0, remaining - resolved.estimatedGp);
    personal.push(Object.freeze({
      kind:"signature-gear",
      officer:officer.name,
      station:officer.station,
      name:resolved.name,
      uuid:resolved.uuid,
      gp:resolved.estimatedGp,
      recoverable:true,
      autoAward:false,
      rewardDecision:"pending"
    }));
  }
  return { officers:Object.freeze(officers), personal:Object.freeze(personal), remaining:money(remaining) };
}

async function resolveCargo(preview, cargoBudget) {
  const rng = seededRng(`${preview.config.seed}:pf2e-cargo`);
  let remaining = cargoBudget;
  const picked = [];
  const candidates = await pf2eTreasureCandidates({ maxLevel:preview.config.partyLevel, maxGp:Math.max(1, remaining) });
  const available = [...candidates];
  const targetCount = preview.loot.profile === "treasure" ? 4 : preview.loot.profile === "rich" ? 3 : preview.loot.profile === "poor" ? 1 : 2;
  while (picked.length < targetCount && available.length && remaining >= 1) {
    const affordable = available.filter((row) => row.gp <= remaining && row.level <= preview.config.partyLevel);
    if (!affordable.length) break;
    affordable.sort((a,b) => b.level - a.level || b.gp - a.gp || a.name.localeCompare(b.name));
    const window = affordable.slice(0, Math.min(12, affordable.length));
    const chosen = window[Math.floor(rng() * window.length)];
    const item = await materializeTreasureCandidate(chosen);
    picked.push(Object.freeze({ kind:"pf2e-item", ...item }));
    remaining = Math.max(0, remaining - item.gp);
    const index = available.findIndex((row) => row._id === chosen._id);
    if (index >= 0) available.splice(index, 1);
  }
  if (remaining >= 0.01) picked.push(Object.freeze({ kind:"currency", name:"Cargo currency and trade goods", gp:money(remaining) }));
  return Object.freeze(picked);
}

function resolveSalvage(preview, salvageBudget) {
  const rows = preview.loot.salvage ?? [];
  const intact = rows.filter((row) => row.countsAgainstPF2eBudget);
  const share = intact.length ? salvageBudget / intact.length : 0;
  return Object.freeze(rows.map((row) => Object.freeze({
    ...row,
    budgetGp:row.countsAgainstPF2eBudget ? money(share) : 0,
    valueState:row.countsAgainstPF2eBudget ? "budgeted-recoverable" : "narrative-only"
  })));
}

export async function resolveGeneratedPreviewPF2e(preview) {
  if (!preview?.validation?.ok) return Object.freeze({ ...preview, canCommit:false, blockers:Object.freeze([...(preview.blockers ?? [])]) });
  const budget = encounterTreasureBudget(preview.config.partyLevel, preview.loot.rewardWeight);
  const personalBudget = money(budget.gp * preview.loot.distribution.personal);
  const cargoBudget = money(budget.gp * preview.loot.distribution.shipCargo);
  const salvageBudget = money(budget.gp * preview.loot.distribution.arkflightSalvage);
  const officerResolution = await resolveOfficers(preview, personalBudget);
  const cargo = await resolveCargo(preview, cargoBudget + officerResolution.remaining);
  const salvage = resolveSalvage(preview, salvageBudget);
  const personalSpent = money(officerResolution.personal.reduce((sum,row) => sum + Number(row.gp ?? 0), 0));
  const cargoValue = money(cargo.reduce((sum,row) => sum + Number(row.gp ?? 0), 0));
  const salvageValue = money(salvage.reduce((sum,row) => sum + Number(row.budgetGp ?? 0), 0));
  const loot = Object.freeze({
    ...preview.loot,
    economicCeiling:Object.freeze({ basis:"party-level", level:budget.level, gpBudget:budget.gp, rewardWeight:budget.rewardWeight, source:budget.source, state:"resolved" }),
    personal:officerResolution.personal,
    shipCargo:cargo,
    salvage,
    accounting:Object.freeze({ ceilingGp:budget.gp, personalGp:personalSpent, cargoGp:cargoValue, salvageGp:salvageValue, totalGp:money(personalSpent+cargoValue+salvageValue) }),
    state:"resolved"
  });
  return Object.freeze({
    ...preview,
    version:10,
    crew:Object.freeze({ ...preview.crew, officers:officerResolution.officers }),
    loot,
    pf2eResolution:Object.freeze({ state:"resolved", equipmentPack:"pf2e.equipment-srd" }),
    canCommit:true,
    blockers:Object.freeze([])
  });
}
