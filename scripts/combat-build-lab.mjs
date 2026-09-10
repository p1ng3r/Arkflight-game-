#!/usr/bin/env node

import { SHIP_CATALOGS } from "../src/content/index.js";
import { createShip } from "../src/ship/ship-schema.js";
import { deriveShip, syncResourceMaxima } from "../src/ship/derive-ship.js";
import { validateShip } from "../src/ship/validate-ship.js";
import { createCombatantState } from "../src/combat/combatant-state.js";
import { shipWeaponAttackBonus, weaponDamageProfile } from "../src/combat/weapon-combat.js";
import { shipModInstallEligibility } from "../src/ship/ship-mod-rarity.js";
import { arkengineModInstallEligibility } from "../src/ship/arkengine-mod-rarity.js";
import { availableTalentPoints, talentEligibility } from "../src/ship/progression.js";

const COMBAT_KEYS = Object.freeze([
  "armorClass",
  "hullIntegrity",
  "lifeveilCapacity",
  "strainCapacity",
  "hardness",
  "combatSpeed",
  "maneuverability",
  "weaponAttackBonus",
  "actionBonus",
  "reactionBonus"
]);

const WEIGHTS = Object.freeze({
  armorClass: 5,
  hullIntegrity: 0.08,
  lifeveilCapacity: 0.06,
  strainCapacity: 1.5,
  hardness: 7,
  combatSpeed: 5,
  maneuverability: 7,
  weaponAttackBonus: 6,
  actionBonus: 12,
  reactionBonus: 15
});

function install(id, arc, mountIndex, upgrades = {}) {
  return Object.freeze({
    instanceId: `${id}:${arc}:${mountIndex}`,
    id,
    mount: arc,
    arc,
    mountIndex,
    upgrades: Object.freeze({
      potency: Math.max(0, Math.min(3, Math.trunc(Number(upgrades.potency) || 0))),
      impact: Math.max(0, Math.min(3, Math.trunc(Number(upgrades.impact) || 0))),
      properties: Object.freeze([...(upgrades.properties ?? [])])
    })
  });
}

const RUM_WEAPONS = Object.freeze([
  install("deck-culverin", "fore", 0),
  install("light-broadside-cannon", "port", 0),
  install("light-broadside-cannon", "port", 1),
  install("light-broadside-cannon", "starboard", 0),
  install("light-broadside-cannon", "starboard", 1),
  install("light-deck-culverin", "aft", 0)
]);

const IRON_WEAPONS = Object.freeze([
  install("heavy-scorpion", "fore", 0),
  install("broadside-cannon-battery", "port", 0),
  install("broadside-cannon-battery", "port", 1),
  install("broadside-cannon-battery", "starboard", 0),
  install("broadside-cannon-battery", "starboard", 1),
  install("light-deck-culverin", "aft", 0)
]);

function buildSpec({
  id,
  name,
  hullId,
  hullPattern = "standard",
  arkengineId,
  arkenginePattern = "standard",
  level = 5,
  talents = [],
  shipMods = [],
  arkengineMods = [],
  weapons = [],
  crewPerception = null,
  role = "general"
}) {
  return Object.freeze({
    id,
    name,
    hullId,
    hullPattern,
    arkengineId,
    arkenginePattern,
    level,
    talents: Object.freeze([...talents]),
    shipMods: Object.freeze([...shipMods]),
    arkengineMods: Object.freeze([...arkengineMods]),
    weapons: Object.freeze(weapons.map((entry) => Object.freeze(structuredClone(entry)))),
    crewPerception: crewPerception == null ? level + 7 : Number(crewPerception),
    role
  });
}

export const BENCHMARK_BUILD_SPECS = Object.freeze({
  "rum-stock-l5": buildSpec({
    id: "rum-stock-l5",
    name: "Rum Runner — Stock L5",
    hullId: "brigantine",
    arkengineId: "tidewake-arkengine",
    level: 5,
    weapons: RUM_WEAPONS,
    role: "generalist"
  }),
  "rum-balanced-l5": buildSpec({
    id: "rum-balanced-l5",
    name: "Rum Runner — Balanced Refit L5",
    hullId: "brigantine",
    arkengineId: "tidewake-arkengine",
    level: 5,
    talents: ["toughness", "hardened-construction", "battle-hardened", "weapon-calibration"],
    shipMods: ["reinforced-bulkhead-network", "reinforced-maneuvering-fins", "trim-sail-regulators", "distributed-strain-dampeners"],
    arkengineMods: ["pressure-lattice-tuning", "overcharge-grounding-rods", "lifeveil-harmonic-prism"],
    weapons: RUM_WEAPONS,
    role: "balanced-refit"
  }),
  "rum-racer-l10": buildSpec({
    id: "rum-racer-l10",
    name: "Rum Runner — Raider/Racer L10",
    hullId: "brigantine",
    hullPattern: "racing",
    arkengineId: "tidewake-arkengine",
    arkenginePattern: "stormwake",
    level: 10,
    talents: ["toughness", "greater-frame", "battle-hardened", "weapon-calibration", "improved-drive", "responsive-rigging"],
    shipMods: ["precision-helm-relays", "stormproof-void-sails"],
    arkengineMods: ["pressure-lattice-tuning", "overcharge-grounding-rods"],
    weapons: RUM_WEAPONS,
    role: "mobile-raider"
  }),
  "rum-battle-l10": buildSpec({
    id: "rum-battle-l10",
    name: "Rum Runner — Battle Refit L10",
    hullId: "brigantine",
    hullPattern: "battle",
    arkengineId: "tidewake-arkengine",
    level: 10,
    talents: ["toughness", "greater-frame", "hardened-construction", "battle-hardened", "weapon-calibration", "improved-drive", "responsive-rigging"],
    shipMods: ["aether-bound-ribbing", "ablative-iron-sheathing"],
    arkengineMods: ["pressure-lattice-tuning", "overcharge-grounding-rods", "lifeveil-harmonic-prism"],
    weapons: RUM_WEAPONS,
    role: "battle-refit"
  }),
  "iron-stock-l5": buildSpec({
    id: "iron-stock-l5",
    name: "IronSpear — Stock L5",
    hullId: "frigate",
    arkengineId: "iron-choir-engine",
    level: 5,
    weapons: IRON_WEAPONS,
    role: "warship"
  }),
  "iron-battle-l5": buildSpec({
    id: "iron-battle-l5",
    name: "IronSpear — Battle Refit L5",
    hullId: "frigate",
    hullPattern: "battle",
    arkengineId: "iron-choir-engine",
    arkenginePattern: "military",
    level: 5,
    talents: ["toughness", "hardened-construction", "battle-hardened", "weapon-calibration"],
    shipMods: ["reinforced-bulkhead-network", "reinforced-structural-ribbing", "reinforced-maneuvering-fins", "distributed-strain-dampeners"],
    arkengineMods: ["pressure-lattice-tuning", "aetherite-core-bracing"],
    weapons: IRON_WEAPONS,
    role: "line-warship"
  }),
  "iron-stock-l10": buildSpec({
    id: "iron-stock-l10",
    name: "IronSpear — Stock L10",
    hullId: "frigate",
    arkengineId: "iron-choir-engine",
    level: 10,
    weapons: IRON_WEAPONS,
    role: "warship"
  }),
  "iron-line-l10": buildSpec({
    id: "iron-line-l10",
    name: "IronSpear — Line Warship L10",
    hullId: "frigate",
    hullPattern: "battle",
    arkengineId: "iron-choir-engine",
    arkenginePattern: "military",
    level: 10,
    talents: ["toughness", "greater-frame", "hardened-construction", "battle-hardened", "weapon-calibration", "improved-drive", "responsive-rigging"],
    shipMods: ["aether-bound-ribbing", "ablative-iron-sheathing"],
    arkengineMods: ["pressure-lattice-tuning", "aetherite-core-bracing", "overcharge-grounding-rods"],
    weapons: IRON_WEAPONS,
    role: "line-warship"
  })
});

function parseDice(expression) {
  const match = /^\s*(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\s*$/i.exec(String(expression ?? ""));
  if (!match) return Object.freeze({ count: 0, faces: 1, modifier: 0, expression: String(expression ?? "") });
  const sign = match[3] === "-" ? -1 : 1;
  return Object.freeze({
    count: Math.max(0, Math.trunc(Number(match[1]) || 0)),
    faces: Math.max(1, Math.trunc(Number(match[2]) || 1)),
    modifier: match[4] ? sign * Math.trunc(Number(match[4]) || 0) : 0,
    expression: String(expression)
  });
}

function createShipFromSpec(spec) {
  if (!spec) throw new Error("Unknown Arkflight benchmark build.");
  let ship = createShip({
    identity: { name: spec.name },
    hull: { chassisId: spec.hullId, patternId: spec.hullPattern },
    arkengine: { chassisId: spec.arkengineId, patternId: spec.arkenginePattern, modIds: [...spec.arkengineMods] },
    shipMods: [...spec.shipMods],
    weapons: spec.weapons.map((entry) => structuredClone(entry)),
    progression: { level: spec.level, talentIds: [...spec.talents] }
  });
  let derived = deriveShip(ship, SHIP_CATALOGS);
  ship = syncResourceMaxima(ship, derived);
  derived = deriveShip(ship, SHIP_CATALOGS);
  return { ship, derived };
}

function combatStatVector(derived) {
  return Object.freeze(Object.fromEntries(COMBAT_KEYS.map((key) => [key, Number(derived?.stats?.[key] ?? 0)])));
}

function vectorDelta(before, after) {
  return Object.freeze(Object.fromEntries(COMBAT_KEYS.map((key) => [key, Number(after?.[key] ?? 0) - Number(before?.[key] ?? 0)])));
}

function deltaScore(delta) {
  return COMBAT_KEYS.reduce((sum, key) => sum + Math.abs(Number(delta?.[key] ?? 0)) * Number(WEIGHTS[key] ?? 1), 0);
}

function percentile(value, values) {
  const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return 0.5;
  const below = clean.filter((entry) => entry < value).length;
  const equal = clean.filter((entry) => entry === value).length;
  return (below + equal * 0.5) / clean.length;
}

function referenceFleet(level) {
  return Object.values(SHIP_CATALOGS.hulls)
    .filter((hull) => !hull.data?.districtScale)
    .map((hull) => {
      const engineId = hull.data?.preferredArkengine;
      if (!engineId || !SHIP_CATALOGS.arkengines?.[engineId]) return null;
      let ship = createShip({
        hull: { chassisId: hull.id, patternId: "standard" },
        arkengine: { chassisId: engineId, patternId: "standard", modIds: [] },
        progression: { level, talentIds: [] }
      });
      let derived = deriveShip(ship, SHIP_CATALOGS);
      ship = syncResourceMaxima(ship, derived);
      derived = deriveShip(ship, SHIP_CATALOGS);
      return combatStatVector(derived);
    })
    .filter(Boolean);
}

function percentileProfile(vector, level) {
  const fleet = referenceFleet(level);
  return Object.freeze(Object.fromEntries(COMBAT_KEYS.map((key) => [
    key,
    percentile(Number(vector[key] ?? 0), fleet.map((entry) => entry[key]))
  ])));
}

function summarizeIdentity(ship, derived) {
  const hull = SHIP_CATALOGS.hulls?.[ship.hull.chassisId];
  const hullPattern = SHIP_CATALOGS.hullPatterns?.[ship.hull.patternId];
  const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine.chassisId];
  const enginePattern = SHIP_CATALOGS.arkenginePatterns?.[ship.arkengine.patternId];
  return Object.freeze({
    hullTraits: Object.freeze([...(hull?.traits ?? [])]),
    hullPatternTraits: Object.freeze([...(hullPattern?.traits ?? [])]),
    arkengineTraits: Object.freeze([...(engine?.traits ?? [])]),
    arkenginePatternTraits: Object.freeze([...(enginePattern?.traits ?? [])]),
    allDerivedTags: Object.freeze([...(derived?.tags ?? [])]),
    note: "Hull identity traits are currently expressed primarily through chassis stats/tags unless a component, talent, capability, synergy, or rule modifier gives them an explicit mechanical hook."
  });
}

function weaponProfile(spec, derived, combatState) {
  return Object.freeze(Object.values(combatState.weapons ?? {}).map((weaponState) => {
    const weapon = SHIP_CATALOGS.weapons?.[weaponState.id];
    if (!weapon) return Object.freeze({ id: weaponState.key, definitionId: weaponState.id, missing: true, mount: weaponState.mount, mountIndex: weaponState.mountIndex });
    const installState = { upgrades: weaponState.upgrades };
    const damage = weaponDamageProfile(weapon, installState);
    const combat = weapon.data?.combat ?? {};
    return Object.freeze({
      id: weaponState.key,
      definitionId: weaponState.id,
      name: weaponState.name ?? weapon.name,
      family: weapon.data?.family ?? weapon.data?.category ?? weaponState.id,
      category: weapon.data?.category ?? "weapon",
      mount: weaponState.mount,
      mountIndex: weaponState.mountIndex,
      size: weapon.data?.size ?? "small",
      fireAP: weaponState.fireAP,
      reload: weaponState.reloadRounds,
      arcTemplate: combat.arcTemplate ?? "wide",
      range: Object.freeze({ ...(combat.rangeHexes ?? {}) }),
      damage: parseDice(damage.dice),
      type: damage.type ?? "damage",
      threat: weapon.data?.systemThreat ?? "hull",
      potency: Math.max(0, Math.trunc(Number(weaponState.upgrades?.potency) || 0)),
      impact: Math.max(0, Math.trunc(Number(weaponState.upgrades?.impact) || 0)),
      attackBonus: shipWeaponAttackBonus({
        battlewatchPerception: spec.crewPerception,
        shipWeaponAttackBonus: derived.stats?.weaponAttackBonus ?? 0,
        install: installState
      })
    });
  }));
}

export function deriveBuild(buildOrId) {
  const spec = typeof buildOrId === "string" ? BENCHMARK_BUILD_SPECS[buildOrId] : buildOrId;
  if (!spec) throw new Error(`Unknown build: ${buildOrId}`);
  const { ship, derived } = createShipFromSpec(spec);
  const validation = validateShip(ship, SHIP_CATALOGS);
  const combatState = createCombatantState(ship, { derived, catalogs: SHIP_CATALOGS, rotation: 0 });
  const vector = combatStatVector(derived);
  return Object.freeze({
    id: spec.id,
    name: ship.identity?.name ?? spec.name,
    role: spec.role,
    spec,
    ship,
    derived,
    combatState,
    validation,
    vector,
    percentile: percentileProfile(vector, ship.progression?.level ?? spec.level),
    identity: summarizeIdentity(ship, derived),
    profile: Object.freeze({
      id: spec.id,
      name: ship.identity?.name ?? spec.name,
      level: Number(ship.progression?.level ?? spec.level),
      chassis: ship.hull.chassisId,
      hullPattern: ship.hull.patternId,
      arkengine: ship.arkengine.chassisId,
      arkenginePattern: ship.arkengine.patternId,
      ac: vector.armorClass,
      hullMax: Number(ship.resources?.hull?.max ?? vector.hullIntegrity),
      lifeveilMax: Number(ship.resources?.lifeveil?.max ?? vector.lifeveilCapacity),
      moraleMax: Number(ship.resources?.morale?.max ?? derived.stats?.moraleCapacity ?? 5),
      strainMax: Number(combatState.strain?.max ?? vector.strainCapacity),
      hardness: vector.hardness,
      apMax: Number(combatState.economy?.ap?.max ?? 0),
      rpMax: Number(combatState.economy?.rp?.max ?? 0),
      combatSpeed: Number(combatState.mobility?.speed ?? vector.combatSpeed),
      maneuverability: Number(combatState.mobility?.maneuverability ?? vector.maneuverability),
      shipWeaponAttackBonus: vector.weaponAttackBonus,
      crewPerception: spec.crewPerception,
      traits: Object.freeze([...(derived.tags ?? [])]),
      weapons: weaponProfile(spec, derived, combatState)
    })
  });
}

function replaceShipMods(spec, ids) {
  return buildSpec({ ...spec, shipMods: ids });
}

function replaceArkengineMods(spec, ids) {
  return buildSpec({ ...spec, arkengineMods: ids });
}

function replaceTalents(spec, ids) {
  return buildSpec({ ...spec, talents: ids });
}

function impactRecord(kind, id, name, rarity, delta, extra = {}) {
  return Object.freeze({
    kind,
    id,
    name,
    rarity: rarity ?? "n/a",
    delta,
    score: deltaScore(delta),
    changesCombatStats: COMBAT_KEYS.some((key) => Number(delta[key] ?? 0) !== 0),
    ...extra
  });
}

function candidateShipMods(base) {
  const out = [];
  const installed = [...base.spec.shipMods];
  for (const mod of Object.values(SHIP_CATALOGS.shipMods ?? {})) {
    if (!mod?.id || installed.includes(mod.id) || mod.data?.catalogStatus === "legacy-compat") continue;
    const eligibility = shipModInstallEligibility(mod, { shipLevel: base.spec.level, installedModIds: installed });
    if (!eligibility.ok) continue;
    const variantSpec = replaceShipMods(base.spec, [...installed, mod.id]);
    let variant;
    try { variant = deriveBuild(variantSpec); } catch (_error) { continue; }
    if (!variant.validation.ok) continue;
    const delta = vectorDelta(base.vector, variant.vector);
    out.push(impactRecord("ship-mod", mod.id, mod.name, mod.data?.rarity, delta, {
      tags: Object.freeze([...(mod.tags ?? [])]),
      capabilities: Object.freeze([...(mod.capabilities ?? [])]),
      ruleModifiers: Object.freeze([...(mod.data?.ruleModifiers ?? [])])
    }));
  }
  return Object.freeze(out.sort((a, b) => b.score - a.score));
}

function candidateArkengineMods(base) {
  const out = [];
  const installed = [...base.spec.arkengineMods];
  for (const mod of Object.values(SHIP_CATALOGS.arkengineMods ?? {})) {
    if (!mod?.id || installed.includes(mod.id)) continue;
    const eligibility = arkengineModInstallEligibility(mod, { shipLevel: base.spec.level, installedArkengineModIds: installed });
    if (!eligibility.ok) continue;
    const variantSpec = replaceArkengineMods(base.spec, [...installed, mod.id]);
    let variant;
    try { variant = deriveBuild(variantSpec); } catch (_error) { continue; }
    if (!variant.validation.ok) continue;
    const delta = vectorDelta(base.vector, variant.vector);
    out.push(impactRecord("arkengine-mod", mod.id, mod.name, mod.data?.rarity, delta, {
      tags: Object.freeze([...(mod.tags ?? [])]),
      capabilities: Object.freeze([...(mod.capabilities ?? [])]),
      ruleModifiers: Object.freeze([...(mod.data?.ruleModifiers ?? [])])
    }));
  }
  return Object.freeze(out.sort((a, b) => b.score - a.score));
}

function candidateTalents(base) {
  const out = [];
  const installed = [...base.spec.talents];
  const available = availableTalentPoints(base.ship);
  for (const talent of Object.values(SHIP_CATALOGS.shipTalents ?? {})) {
    if (!talent?.id || installed.includes(talent.id) || Number(talent.cost ?? 0) > available) continue;
    const eligibility = talentEligibility(base.ship, talent);
    if (!eligibility.ok) continue;
    const variantSpec = replaceTalents(base.spec, [...installed, talent.id]);
    let variant;
    try { variant = deriveBuild(variantSpec); } catch (_error) { continue; }
    if (!variant.validation.ok) continue;
    const delta = vectorDelta(base.vector, variant.vector);
    out.push(impactRecord("talent", talent.id, talent.name, talent.tier, delta, {
      cost: Number(talent.cost ?? 0),
      description: talent.description
    }));
  }
  return Object.freeze(out.sort((a, b) => b.score - a.score));
}

function strengthsAndWeaknesses(base) {
  const p = base.percentile;
  const labels = Object.freeze({
    armorClass: "Armor Class",
    hullIntegrity: "Hull",
    lifeveilCapacity: "Lifeveil",
    strainCapacity: "Strain capacity",
    hardness: "Hardness",
    combatSpeed: "Combat Speed",
    maneuverability: "Maneuverability",
    weaponAttackBonus: "Ship weapon targeting",
    actionBonus: "AP economy",
    reactionBonus: "RP economy"
  });
  const strengths = [];
  const weaknesses = [];
  for (const key of COMBAT_KEYS) {
    const row = Object.freeze({ key, label: labels[key], value: base.vector[key], percentile: p[key] });
    if (p[key] >= 0.75) strengths.push(row);
    else if (p[key] <= 0.25) weaknesses.push(row);
  }
  return Object.freeze({ strengths: Object.freeze(strengths), weaknesses: Object.freeze(weaknesses) });
}

function recommendations(base, candidates, weaknesses) {
  const weakKeys = new Set(weaknesses.map((entry) => entry.key));
  const scored = candidates.map((candidate) => {
    const relevant = COMBAT_KEYS.reduce((sum, key) => {
      if (!weakKeys.has(key)) return sum;
      const value = Number(candidate.delta?.[key] ?? 0);
      return sum + Math.max(0, value) * Number(WEIGHTS[key] ?? 1);
    }, 0);
    return Object.freeze({ ...candidate, weaknessFit: relevant });
  });
  return Object.freeze(scored.filter((entry) => entry.weaknessFit > 0).sort((a, b) => b.weaknessFit - a.weaknessFit).slice(0, 12));
}

export function auditBuild(buildOrId) {
  const base = deriveBuild(buildOrId);
  const identity = strengthsAndWeaknesses(base);
  const shipMods = candidateShipMods(base);
  const arkengineMods = candidateArkengineMods(base);
  const talents = candidateTalents(base);
  const all = Object.freeze([...shipMods, ...arkengineMods, ...talents]);
  const zeroStatComponents = Object.freeze(all.filter((entry) => !entry.changesCombatStats));
  return Object.freeze({
    build: base,
    strengths: identity.strengths,
    weaknesses: identity.weaknesses,
    recommendations: recommendations(base, all, identity.weaknesses),
    candidates: Object.freeze({ shipMods, arkengineMods, talents }),
    zeroStatComponents,
    notes: Object.freeze([
      "Percentiles compare the build against the stock non-district hull fleet at the same ship level.",
      "A zero direct-stat component is not automatically weak: capabilities, event hooks, resistances, synergies, and unlocks can be valuable without changing the combat stat vector.",
      "This audit deliberately separates chassis identity from refit identity so a weak base stat can be strengthened by pattern, mod, talent, or weapon choices instead of flattening every hull into the same profile."
    ])
  });
}

export function compareBuilds(leftId, rightId) {
  const left = deriveBuild(leftId);
  const right = deriveBuild(rightId);
  return Object.freeze({
    left,
    right,
    deltaLeftMinusRight: vectorDelta(right.vector, left.vector)
  });
}

function conciseDelta(delta) {
  return COMBAT_KEYS.filter((key) => Number(delta?.[key] ?? 0) !== 0)
    .map((key) => `${key} ${Number(delta[key]) > 0 ? "+" : ""}${delta[key]}`)
    .join(", ") || "no direct combat-stat change";
}

function printAudit(report) {
  const { build } = report;
  console.log(`Arkflight Build Lab — ${build.name}`);
  console.log(`Validation: ${build.validation.ok ? "LEGAL" : `INVALID — ${build.validation.errors.join("; ")}`}`);
  console.log(`Traits: ${build.identity.hullTraits.join(", ") || "none"}`);
  console.log(`Stats: AC ${build.profile.ac} · Hull ${build.profile.hullMax} · Lifeveil ${build.profile.lifeveilMax} · Hardness ${build.profile.hardness} · Speed ${build.profile.combatSpeed} · Maneuver ${build.profile.maneuverability} · AP/RP ${build.profile.apMax}/${build.profile.rpMax}`);
  console.log(`\nStrengths: ${report.strengths.map((x) => `${x.label} (${Math.round(x.percentile * 100)}th pct)`).join(" · ") || "none above 75th percentile"}`);
  console.log(`Weaknesses: ${report.weaknesses.map((x) => `${x.label} (${Math.round(x.percentile * 100)}th pct)`).join(" · ") || "none below 25th percentile"}`);
  console.log("\nBest ways to strengthen current weak areas:");
  for (const row of report.recommendations.slice(0, 8)) console.log(`- ${row.kind}: ${row.name} — ${conciseDelta(row.delta)}`);
  console.log("\nHighest direct combat-impact legal additions:");
  for (const row of [...report.candidates.shipMods, ...report.candidates.arkengineMods, ...report.candidates.talents].sort((a,b)=>b.score-a.score).slice(0, 10)) {
    console.log(`- ${row.kind}: ${row.name} — ${conciseDelta(row.delta)}`);
  }
  if (report.zeroStatComponents.length) console.log(`\n${report.zeroStatComponents.length} legal candidate(s) have no direct combat-stat delta; inspect their capabilities/synergies before considering any buff.`);
}

function cliArgs(argv) {
  const out = { build: "rum-balanced-l5", compare: null, format: "text", list: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--build") out.build = argv[++i] ?? out.build;
    else if (argv[i] === "--compare") out.compare = argv[++i] ?? null;
    else if (argv[i] === "--format") out.format = argv[++i] ?? out.format;
    else if (argv[i] === "--list") out.list = true;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = cliArgs(process.argv.slice(2));
  if (opts.list) {
    for (const spec of Object.values(BENCHMARK_BUILD_SPECS)) console.log(`${spec.id} — ${spec.name}`);
    process.exit(0);
  }
  const report = auditBuild(opts.build);
  const payload = opts.compare ? Object.freeze({ audit: report, comparison: compareBuilds(opts.build, opts.compare) }) : report;
  if (opts.format === "json") console.log(JSON.stringify(payload, null, 2));
  else {
    printAudit(report);
    if (opts.compare) {
      const comparison = payload.comparison;
      console.log(`\nCompared with ${comparison.right.name}: ${conciseDelta(comparison.deltaLeftMinusRight)}`);
    }
  }
}
