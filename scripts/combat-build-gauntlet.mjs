#!/usr/bin/env node

import { BENCHMARK_BUILD_SPECS, auditBuild, deriveBuild } from "./combat-build-lab.mjs";

export const POLICIES = Object.freeze(["balanced", "aggressive", "defensive"]);
export const SCENARIOS = Object.freeze(["broadside", "open-duel", "pursuit-objective"]);

export const BUILD_PAIRINGS = Object.freeze([
  Object.freeze({ id: "stock-l5", rumBuild: "rum-stock-l5", ironBuild: "iron-stock-l5", purpose: "baseline chassis/loadout comparison" }),
  Object.freeze({ id: "balanced-rum-l5", rumBuild: "rum-balanced-l5", ironBuild: "iron-stock-l5", purpose: "does a legal balanced Rum Runner refit close the gap?" }),
  Object.freeze({ id: "refit-vs-refit-l5", rumBuild: "rum-balanced-l5", ironBuild: "iron-battle-l5", purpose: "both ships use level-appropriate combat refits" }),
  Object.freeze({ id: "racer-vs-stock-l10", rumBuild: "rum-racer-l10", ironBuild: "iron-stock-l10", purpose: "mobility identity against a stock equal-level frigate" }),
  Object.freeze({ id: "racer-vs-line-l10", rumBuild: "rum-racer-l10", ironBuild: "iron-line-l10", purpose: "mobility build against a dedicated line-warship build" }),
  Object.freeze({ id: "battle-vs-line-l10", rumBuild: "rum-battle-l10", ironBuild: "iron-line-l10", purpose: "battle-refit brigantine against battle-refit frigate" })
]);

function stationBonus(level) {
  const value = Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));
  return value >= 20 ? 3 : value >= 10 ? 2 : 1;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function avg(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function wilson95(wins, n) {
  if (!n) return [0, 0];
  const z = 1.959963984540054;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = z * Math.sqrt((p * (1 - p) / n) + z2 / (4 * n * n)) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function d20(rng) { return 1 + Math.floor(rng() * 20); }
function rollDamage(rng, die) {
  let total = Number(die?.modifier ?? 0);
  for (let i = 0; i < Math.max(0, Number(die?.count ?? 0)); i += 1) total += 1 + Math.floor(rng() * Math.max(1, Number(die?.faces ?? 1)));
  return Math.max(0, total);
}
function degreeOfSuccess(die, total, dc) {
  let degree = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (die === 20) degree = Math.min(3, degree + 1);
  if (die === 1) degree = Math.max(0, degree - 1);
  return degree;
}

function profile(buildId) {
  const build = deriveBuild(buildId);
  if (!build.validation.ok) throw new Error(`${buildId} is not a legal benchmark build: ${build.validation.errors.join("; ")}`);
  return build.profile;
}

export const BENCHMARK_SHIPS = Object.freeze({
  rumRunner: profile("rum-stock-l5"),
  ironSpear: profile("iron-stock-l5")
});

function initialState(ship, policy) {
  return {
    ship,
    policy,
    hull: ship.hullMax,
    hullMax: ship.hullMax,
    lifeveil: ship.lifeveilMax,
    strain: 0,
    areas: { hull: 0, arkengine: 0, rigging: 0, lifeveil: 0, morale: 0 },
    reload: Object.fromEntries(ship.weapons.map((weapon) => [weapon.id, 0])),
    stats: {
      damage: 0,
      shots: 0,
      hits: 0,
      crits: 0,
      salvos: 0,
      systemHits: 0,
      ap: { captain: 0, battlewatch: 0, navigator: 0, engineer: 0, veilwarden: 0 },
      rp: 0,
      peakStrain: 0,
      mountTurns: { fore: 0, port: 0, starboard: 0, aft: 0 }
    }
  };
}

function effectiveSpeed(state) {
  return Math.max(1,
    state.ship.combatSpeed
    - (state.areas.arkengine >= 1 ? 1 : 0)
    - (state.areas.arkengine >= 3 ? 1 : 0)
    - (state.areas.arkengine >= 4 ? 1 : 0)
    - (state.areas.rigging >= 2 ? 1 : 0)
  );
}
function effectiveManeuver(state) {
  return Math.max(1,
    state.ship.maneuverability
    - (state.areas.rigging >= 1 ? 1 : 0)
    - (state.areas.rigging >= 3 ? 1 : 0)
  );
}
function spendAP(state, station, amount) {
  const cost = Math.max(0, Math.trunc(Number(amount) || 0));
  if (state.ap < cost) return false;
  state.ap -= cost;
  state.stats.ap[station] += cost;
  return true;
}
function gainStrain(state, amount) {
  state.strain = clamp(state.strain + amount, 0, state.ship.strainMax);
  state.stats.peakStrain = Math.max(state.stats.peakStrain, state.strain);
}
function beginTurn(state) {
  state.ap = state.ship.apMax;
  state.rp = state.ship.rpMax;
  state.attackBuff = 0;
  state.hardnessReduction = 0;
  state.damageBuff = 0;
  for (const weapon of state.ship.weapons) state.reload[weapon.id] = Math.max(0, state.reload[weapon.id] - 1);
}

function chooseReaction(state) {
  if (state.rp <= 0) return { ac: 0, brace: 0 };
  const bonus = stationBonus(state.ship.level);
  state.rp -= 1;
  state.stats.rp += 1;
  if (state.policy === "defensive") return { ac: 0, brace: 3 * bonus };
  if (state.policy === "balanced") {
    gainStrain(state, 1);
    return { ac: bonus, brace: 0 };
  }
  return { ac: bonus, brace: 0 };
}

function systemThreshold(state) {
  return Math.max(12, Math.ceil(state.ship.hullMax * 0.15));
}

function applySystemDamage(state, threat, degree, hullDamage) {
  if (hullDamage <= 0) return;
  const area = ["hull", "arkengine", "rigging", "lifeveil"].includes(threat) ? threat : "hull";
  const triggered = area === "hull"
    ? hullDamage >= systemThreshold(state)
    : degree === 3 || hullDamage >= systemThreshold(state);
  if (!triggered) return;
  state.areas[area] = Math.min(4, Number(state.areas[area] ?? 0) + 1);
  state.stats.systemHits += 1;
  if (area === "lifeveil") {
    const fraction = [1, 0.90, 0.65, 0.25, 0][state.areas.lifeveil];
    state.lifeveil = Math.min(state.lifeveil, Math.floor(state.ship.lifeveilMax * fraction));
  }
  if (area === "hull") {
    const fraction = [1, 0.90, 0.65, 0.25, 0][state.areas.hull];
    state.hullMax = Math.floor(state.ship.hullMax * fraction);
    state.hull = Math.min(state.hull, state.hullMax);
  }
}

function salvoKey(weapon) {
  return `${weapon.mount}|${weapon.family}|${weapon.type}|${weapon.threat}|${weapon.arcTemplate}`;
}
function compatibleGroups(weapons) {
  const groups = new Map();
  for (const weapon of weapons) {
    const key = salvoKey(weapon);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(weapon);
  }
  return [...groups.values()];
}

function chooseMount(state, foe, scenario, rng, side) {
  if (scenario === "broadside") return side === "rumRunner" ? "port" : "starboard";
  if (scenario === "pursuit-objective") return side === "rumRunner" ? "aft" : "fore";
  const mobilityEdge = 0.08 * (effectiveManeuver(state) - effectiveManeuver(foe)) + 0.03 * (effectiveSpeed(state) - effectiveSpeed(foe));
  const broadsideChance = clamp(0.56 + mobilityEdge, 0.22, 0.86);
  return rng() < broadsideChance ? (side === "rumRunner" ? "port" : "starboard") : "fore";
}

function setupPolicy(state, mount) {
  const bonus = stationBonus(state.ship.level);
  const ready = state.ship.weapons.filter((weapon) => weapon.mount === mount && state.reload[weapon.id] === 0);
  const groups = compatibleGroups(ready);
  const salvo = groups.filter((group) => group.length >= 2).sort((a, b) => b.length - a.length)[0] ?? [];
  const reserve = salvo.length >= 2
    ? salvo.reduce((sum, weapon) => sum + weapon.fireAP, 0)
    : ready.length ? Math.min(...ready.map((weapon) => weapon.fireAP)) : 99;

  if (state.policy === "aggressive") {
    if (state.strain <= state.ship.strainMax - 2 && state.ap - 1 >= reserve && spendAP(state, "captain", 1)) {
      state.ap += 2;
      gainStrain(state, state.ship.level >= 20 ? 0 : state.ship.level >= 15 ? 1 : 2);
    }
    if (state.ap - 1 >= reserve && spendAP(state, "captain", 1)) state.hardnessReduction = bonus;
  } else if (state.policy === "defensive") {
    if (state.strain >= Math.ceil(state.ship.strainMax * 0.55) && state.ap - 1 >= reserve && spendAP(state, "engineer", 1)) {
      state.strain = Math.max(0, state.strain - (1 + bonus));
    }
  }

  if (state.policy !== "aggressive" && state.ap - 1 >= reserve && spendAP(state, "battlewatch", 1)) state.attackBuff = bonus;
  if (["port", "starboard"].includes(mount) && state.policy === "balanced" && state.ap - 1 >= reserve && spendAP(state, "battlewatch", 1)) state.damageBuff = 2 * bonus;
}

function attackPacket(attacker, defender, weapons, rng, { salvo = false } = {}) {
  const cost = weapons.reduce((sum, weapon) => sum + weapon.fireAP, 0);
  if (!spendAP(attacker, "battlewatch", cost)) return false;
  for (const weapon of weapons) attacker.reload[weapon.id] = weapon.reload;

  const reaction = chooseReaction(defender);
  const die = d20(rng);
  // A coordinated salvo uses the weakest participating fire-control solution,
  // preventing ordering a high-potency gun first to drag weaker guns upward.
  const baseAttack = Math.min(...weapons.map((weapon) => Number(weapon.attackBonus) || 0));
  const degree = degreeOfSuccess(die, die + baseAttack + attacker.attackBuff, defender.ship.ac + reaction.ac);
  attacker.attackBuff = 0;
  attacker.stats.shots += 1;
  if (salvo) attacker.stats.salvos += 1;
  if (degree < 2) return true;

  attacker.stats.hits += 1;
  if (degree === 3) attacker.stats.crits += 1;
  let incoming = weapons.reduce((sum, weapon) => sum + rollDamage(rng, weapon.damage), 0) + attacker.damageBuff;
  attacker.damageBuff = 0;
  if (degree === 3) incoming *= 2;

  const hardness = Math.max(0, defender.ship.hardness - attacker.hardnessReduction);
  attacker.hardnessReduction = 0;
  const hullDamage = Math.max(0, incoming - hardness - reaction.brace);
  defender.hull = Math.max(0, defender.hull - hullDamage);
  attacker.stats.damage += hullDamage;

  // Same-threat salvos are required by compatibility, so a single threatened
  // area is unambiguous for system-damage resolution.
  applySystemDamage(defender, weapons[0]?.threat ?? "hull", degree, hullDamage);
  return true;
}

function takeTurn(state, foe, scenario, rng, side) {
  beginTurn(state);
  const mount = chooseMount(state, foe, scenario, rng, side);
  state.stats.mountTurns[mount] = Number(state.stats.mountTurns[mount] ?? 0) + 1;
  setupPolicy(state, mount);

  let ready = state.ship.weapons.filter((weapon) => weapon.mount === mount && state.reload[weapon.id] === 0);
  for (const group of compatibleGroups(ready)) {
    const cost = group.reduce((sum, weapon) => sum + weapon.fireAP, 0);
    if (group.length >= 2 && cost <= state.ap) {
      attackPacket(state, foe, group, rng, { salvo: true });
      ready = ready.filter((weapon) => !group.includes(weapon));
      if (foe.hull <= 0) return;
    }
  }

  for (const weapon of ready) {
    if (weapon.fireAP <= state.ap) {
      attackPacket(state, foe, [weapon], rng);
      if (foe.hull <= 0) return;
    }
  }

  const loading = state.ship.weapons
    .filter((weapon) => weapon.mount === mount && state.reload[weapon.id] > 0)
    .sort((a, b) => state.reload[a.id] - state.reload[b.id]);
  for (const weapon of loading) {
    if (state.ap < 1) break;
    const reduction = stationBonus(state.ship.level);
    if (spendAP(state, "battlewatch", 1)) state.reload[weapon.id] = Math.max(0, state.reload[weapon.id] - reduction);
    if (weapon.fireAP <= state.ap && state.reload[weapon.id] === 0) {
      attackPacket(state, foe, [weapon], rng);
      if (foe.hull <= 0) return;
    }
  }
}

export function simulateBattle({
  rumBuild = "rum-stock-l5",
  ironBuild = "iron-stock-l5",
  rumPolicy = "balanced",
  ironPolicy = "balanced",
  scenario = "broadside",
  seed = 1,
  maxRounds = 40
} = {}) {
  const rumProfile = profile(rumBuild);
  const ironProfile = profile(ironBuild);
  if (rumProfile.level !== ironProfile.level) throw new Error(`Build-aware gauntlet compares equal ship levels; got ${rumProfile.level} vs ${ironProfile.level}.`);
  const rng = mulberry32(seed);
  const rum = initialState(rumProfile, rumPolicy);
  const iron = initialState(ironProfile, ironPolicy);
  const rumFirst = rng() < 0.5;
  const order = rumFirst
    ? [[rum, iron, "rumRunner"], [iron, rum, "ironSpear"]]
    : [[iron, rum, "ironSpear"], [rum, iron, "rumRunner"]];
  const cap = scenario === "pursuit-objective" ? Math.min(maxRounds, 10) : maxRounds;
  let round = 0;
  for (round = 1; round <= cap && rum.hull > 0 && iron.hull > 0; round += 1) {
    for (const [actor, foe, side] of order) {
      if (actor.hull <= 0 || foe.hull <= 0) break;
      takeTurn(actor, foe, scenario, rng, side);
    }
  }

  let winner = "draw";
  if (iron.hull <= 0) winner = "rumRunner";
  else if (rum.hull <= 0) winner = "ironSpear";
  else if (scenario === "pursuit-objective") winner = "rumRunner";

  return Object.freeze({
    winner,
    rounds: Math.min(cap, round - ((rum.hull <= 0 || iron.hull <= 0) ? 0 : 1)),
    scenario,
    rumBuild,
    ironBuild,
    rum,
    iron
  });
}

function aggregate(results, key) {
  const states = results.map((result) => result[key]);
  const rounds = results.reduce((sum, result) => sum + result.rounds, 0) || 1;
  const sum = (fn) => states.reduce((total, state) => total + fn(state), 0);
  return Object.freeze({
    damagePerRound: sum((state) => state.stats.damage) / rounds,
    shotsPerBattle: sum((state) => state.stats.shots) / results.length,
    salvosPerBattle: sum((state) => state.stats.salvos) / results.length,
    systemHitsPerBattle: sum((state) => state.stats.systemHits) / results.length,
    hitRate: sum((state) => state.stats.hits) / Math.max(1, sum((state) => state.stats.shots)),
    critRate: sum((state) => state.stats.crits) / Math.max(1, sum((state) => state.stats.shots)),
    averagePeakStrain: sum((state) => state.stats.peakStrain) / results.length,
    averageFinalHull: sum((state) => state.hull) / results.length,
    apPerBattle: Object.freeze(Object.fromEntries(["captain", "battlewatch", "navigator", "engineer", "veilwarden"].map((station) => [
      station,
      sum((state) => state.stats.ap[station]) / results.length
    ])))
  });
}

export function runMatchup({
  rumBuild = "rum-stock-l5",
  ironBuild = "iron-stock-l5",
  rumPolicy = "balanced",
  ironPolicy = "balanced",
  scenario = "broadside",
  runs = 5000,
  seed = 8675309,
  maxRounds = 40
} = {}) {
  const results = [];
  let rumWins = 0;
  let ironWins = 0;
  let draws = 0;
  for (let i = 0; i < runs; i += 1) {
    const result = simulateBattle({
      rumBuild,
      ironBuild,
      rumPolicy,
      ironPolicy,
      scenario,
      seed: (seed + Math.imul(i + 1, 2654435761)) >>> 0,
      maxRounds
    });
    results.push(result);
    if (result.winner === "rumRunner") rumWins += 1;
    else if (result.winner === "ironSpear") ironWins += 1;
    else draws += 1;
  }
  return Object.freeze({
    rumBuild,
    ironBuild,
    scenario,
    rumPolicy,
    ironPolicy,
    runs,
    rumWins,
    ironWins,
    draws,
    rumWinRate: rumWins / runs,
    rumWin95: wilson95(rumWins, runs),
    avgRounds: avg(results.map((result) => result.rounds)),
    medianRounds: median(results.map((result) => result.rounds)),
    rum: aggregate(results, "rum"),
    iron: aggregate(results, "iron")
  });
}

export function runGauntlet({
  rumBuild = "rum-stock-l5",
  ironBuild = "iron-stock-l5",
  runs = 5000,
  seed = 8675309,
  maxRounds = 40
} = {}) {
  const matchups = [];
  let offset = 0;
  for (const scenario of SCENARIOS) {
    for (const rumPolicy of POLICIES) {
      for (const ironPolicy of POLICIES) {
        matchups.push(runMatchup({
          rumBuild,
          ironBuild,
          rumPolicy,
          ironPolicy,
          scenario,
          runs,
          seed: (seed + offset++ * 1000003) >>> 0,
          maxRounds
        }));
      }
    }
  }
  return Object.freeze({
    model: "derived-build-salvo-system-geometry-v3",
    rumBuild,
    ironBuild,
    runsPerMatchup: runs,
    seed,
    scenarios: SCENARIOS,
    profiles: Object.freeze({ rum: profile(rumBuild), iron: profile(ironBuild) }),
    audits: Object.freeze({ rum: auditBuild(rumBuild), iron: auditBuild(ironBuild) }),
    matchups: Object.freeze(matchups)
  });
}

export function runBuildMatrix({ runs = 2000, seed = 8675309, maxRounds = 40 } = {}) {
  const reports = [];
  let offset = 0;
  for (const pairing of BUILD_PAIRINGS) {
    reports.push(Object.freeze({
      pairing,
      report: runGauntlet({
        rumBuild: pairing.rumBuild,
        ironBuild: pairing.ironBuild,
        runs,
        seed: (seed + offset++ * 7919) >>> 0,
        maxRounds
      })
    }));
  }
  return Object.freeze({
    model: "derived-build-matrix-v3",
    runsPerMatchup: runs,
    pairings: Object.freeze(reports)
  });
}

function pct(value) { return `${(value * 100).toFixed(1)}%`; }
function balancedRow(report, scenario) {
  return report.matchups.find((row) => row.scenario === scenario && row.rumPolicy === "balanced" && row.ironPolicy === "balanced");
}
function printReport(report) {
  console.log(`Arkflight Build-Aware Gauntlet v3 — ${report.rumBuild} vs ${report.ironBuild}`);
  console.log(`Derived stats: Rum AC ${report.profiles.rum.ac} Hull ${report.profiles.rum.hullMax} Hard ${report.profiles.rum.hardness} Speed ${report.profiles.rum.combatSpeed} Man ${report.profiles.rum.maneuverability} AP/RP ${report.profiles.rum.apMax}/${report.profiles.rum.rpMax}`);
  console.log(`               Iron AC ${report.profiles.iron.ac} Hull ${report.profiles.iron.hullMax} Hard ${report.profiles.iron.hardness} Speed ${report.profiles.iron.combatSpeed} Man ${report.profiles.iron.maneuverability} AP/RP ${report.profiles.iron.apMax}/${report.profiles.iron.rpMax}`);
  for (const scenario of SCENARIOS) {
    console.log(`\n${scenario}`);
    for (const row of report.matchups.filter((entry) => entry.scenario === scenario)) {
      console.log(`${row.rumPolicy.padEnd(10)} vs ${row.ironPolicy.padEnd(10)} Rum ${pct(row.rumWinRate).padStart(6)} · ${row.avgRounds.toFixed(2)} rnd · DPR ${row.rum.damagePerRound.toFixed(1)}/${row.iron.damagePerRound.toFixed(1)} · salvos ${row.rum.salvosPerBattle.toFixed(1)}/${row.iron.salvosPerBattle.toFixed(1)} · sys ${row.rum.systemHitsPerBattle.toFixed(2)}/${row.iron.systemHitsPerBattle.toFixed(2)}`);
    }
  }
  console.log("\nRum Runner build weaknesses:", report.audits.rum.weaknesses.map((row) => row.label).join(", ") || "none at/below fleet 25th percentile");
  console.log("Top strengthening options:", report.audits.rum.recommendations.slice(0, 5).map((row) => row.name).join(" · ") || "none from direct-stat candidates");
}
function printMatrix(matrix) {
  console.log(`Arkflight Derived Build Matrix v3 — ${matrix.pairings.length} build pairings`);
  console.log("Pairing | Broadside | Open Duel | Pursuit/Objective | Rum weak areas");
  for (const { pairing, report } of matrix.pairings) {
    const broad = balancedRow(report, "broadside");
    const open = balancedRow(report, "open-duel");
    const pursuit = balancedRow(report, "pursuit-objective");
    const weak = report.audits.rum.weaknesses.map((row) => row.label).join(", ") || "none";
    console.log(`${pairing.id.padEnd(22)} | ${pct(broad.rumWinRate).padStart(6)} | ${pct(open.rumWinRate).padStart(6)} | ${pct(pursuit.rumWinRate).padStart(6)} | ${weak}`);
  }
}

function cliArgs(argv) {
  const out = { rumBuild: "rum-stock-l5", ironBuild: "iron-stock-l5", runs: 5000, seed: 8675309, maxRounds: 40, format: "text", matrix: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--rum-build") out.rumBuild = argv[++i] ?? out.rumBuild;
    else if (argv[i] === "--iron-build") out.ironBuild = argv[++i] ?? out.ironBuild;
    else if (argv[i] === "--runs") out.runs = Math.max(1, Math.trunc(Number(argv[++i]) || out.runs));
    else if (argv[i] === "--seed") out.seed = (Number(argv[++i]) || out.seed) >>> 0;
    else if (argv[i] === "--max-rounds") out.maxRounds = Math.max(1, Math.trunc(Number(argv[++i]) || out.maxRounds));
    else if (argv[i] === "--format") out.format = argv[++i] ?? out.format;
    else if (argv[i] === "--matrix") out.matrix = true;
    else if (argv[i] === "--list") out.list = true;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = cliArgs(process.argv.slice(2));
  if (opts.list) {
    console.log("Builds:");
    for (const spec of Object.values(BENCHMARK_BUILD_SPECS)) console.log(`- ${spec.id}: ${spec.name}`);
    console.log("\nMatrix pairings:");
    for (const pairing of BUILD_PAIRINGS) console.log(`- ${pairing.id}: ${pairing.rumBuild} vs ${pairing.ironBuild}`);
    process.exit(0);
  }
  const result = opts.matrix
    ? runBuildMatrix({ runs: opts.runs, seed: opts.seed, maxRounds: opts.maxRounds })
    : runGauntlet({ rumBuild: opts.rumBuild, ironBuild: opts.ironBuild, runs: opts.runs, seed: opts.seed, maxRounds: opts.maxRounds });
  if (opts.format === "json") console.log(JSON.stringify(result, null, 2));
  else if (opts.matrix) printMatrix(result);
  else printReport(result);
}
