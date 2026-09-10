#!/usr/bin/env node

// Headless Arkflight ship-combat balance benchmark.
// Canonical chassis/weapon values mirror src/content/hulls.js, src/content/weapons.js,
// and src/combat/combat-schema.js. Named vessels are benchmark fixtures because
// Foundry world actors are not stored in the repository.

export const POLICIES = Object.freeze(["balanced", "aggressive", "defensive"]);

const STATION_BONUS = (level) => level >= 20 ? 3 : level >= 10 ? 2 : 1;

export const BENCHMARK_SHIPS = Object.freeze({
  rumRunner: Object.freeze({
    id: "rum-runner-benchmark",
    name: "Rum Runner",
    fixture: true,
    level: 5,
    chassis: "brigantine",
    ac: 17,
    hullMax: 160,
    lifeveilMax: 55,
    moraleMax: 5,
    strainMax: 10,
    hardness: 4,
    apMax: 4,
    rpMax: 1,
    combatSpeed: 5,
    maneuverability: 2,
    attackBonus: 12,
    engagedFacing: "port",
    weapons: Object.freeze([
      { id: "rr-port-1", name: "Light Broadside Cannon", mount: "port", fireAP: 1, reload: 1, dice: [3, 8], systemThreat: "hull" },
      { id: "rr-port-2", name: "Light Broadside Cannon", mount: "port", fireAP: 1, reload: 1, dice: [3, 8], systemThreat: "hull" },
      { id: "rr-fore", name: "Deck Culverin", mount: "fore", fireAP: 2, reload: 1, dice: [3, 10], systemThreat: "hull", offFacing: true },
      { id: "rr-aft", name: "Light Deck Culverin", mount: "aft", fireAP: 1, reload: 1, dice: [2, 10], systemThreat: "hull", offFacing: true }
    ])
  }),
  ironSpear: Object.freeze({
    id: "iron-spear-benchmark",
    name: "IronSpear",
    fixture: true,
    level: 5,
    chassis: "frigate",
    ac: 18,
    hullMax: 190,
    lifeveilMax: 50,
    moraleMax: 5,
    strainMax: 11,
    hardness: 5,
    apMax: 4,
    rpMax: 1,
    combatSpeed: 6,
    maneuverability: 2,
    attackBonus: 12,
    engagedFacing: "starboard",
    weapons: Object.freeze([
      { id: "is-starboard-1", name: "Broadside Cannon Battery", mount: "starboard", fireAP: 2, reload: 2, dice: [4, 10], systemThreat: "hull" },
      { id: "is-starboard-2", name: "Broadside Cannon Battery", mount: "starboard", fireAP: 2, reload: 2, dice: [4, 10], systemThreat: "hull" },
      { id: "is-fore", name: "Heavy Scorpion", mount: "fore", fireAP: 2, reload: 1, dice: [3, 10], systemThreat: "rigging", offFacing: true },
      { id: "is-aft", name: "Light Deck Culverin", mount: "aft", fireAP: 1, reload: 1, dice: [2, 10], systemThreat: "hull", offFacing: true }
    ])
  })
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function d20(rng) { return 1 + Math.floor(rng() * 20); }
function rollDice(rng, [count, faces]) {
  let total = 0;
  for (let i = 0; i < count; i += 1) total += 1 + Math.floor(rng() * faces);
  return total;
}
function degreeOfSuccess(roll, total, dc) {
  let degree = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (roll === 20) degree = Math.min(3, degree + 1);
  if (roll === 1) degree = Math.max(0, degree - 1);
  return degree;
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
function median(values) {
  if (!values.length) return 0;
  const v = [...values].sort((a,b) => a-b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m-1] + v[m]) / 2;
}
function avg(values) { return values.length ? values.reduce((a,b)=>a+b,0) / values.length : 0; }

function initialState(ship, policy) {
  return {
    ship, policy,
    hull: ship.hullMax,
    lifeveil: ship.lifeveilMax,
    morale: ship.moraleMax,
    strain: 0,
    ap: ship.apMax,
    rp: ship.rpMax,
    weaponReload: Object.fromEntries(ship.weapons.map(w => [w.id, 0])),
    wardCharges: 0,
    wardValue: 0,
    hardnessReductionCharges: 0,
    hardnessReduction: 0,
    attackBonusCharges: 0,
    attackBonus: 0,
    broadsideDamageCharges: 0,
    broadsideDamage: 0,
    weaponDamageCharges: 0,
    weaponDamage: 0,
    stats: {
      apByStation: { captain:0, battlewatch:0, navigator:0, engineer:0, veilwarden:0 },
      rpSpent: 0,
      reactions: { brace:0, evasive:0, spoil:0, emergencyWard:0 },
      strainSamples: [], peakStrain: 0,
      vents:0, mends:0, repairs:0,
      shots:0, hits:0, crits:0, misses:0,
      damageDealt:0, damageTaken:0,
      weapon: {}
    }
  };
}

function spendAP(state, station, n) {
  if (state.ap < n) return false;
  state.ap -= n;
  state.stats.apByStation[station] += n;
  return true;
}
function gainStrain(state, n) {
  state.strain = Math.min(state.ship.strainMax, state.strain + n);
  state.stats.peakStrain = Math.max(state.stats.peakStrain, state.strain);
}
function beginTurn(state) {
  state.ap = state.ship.apMax;
  state.rp = state.ship.rpMax;
  for (const w of state.ship.weapons) state.weaponReload[w.id] = Math.max(0, state.weaponReload[w.id] - 1);
  state.wardCharges = 0; state.wardValue = 0;
  state.hardnessReductionCharges = 0; state.hardnessReduction = 0;
  state.attackBonusCharges = 0; state.attackBonus = 0;
  state.broadsideDamageCharges = 0; state.broadsideDamage = 0;
  state.weaponDamageCharges = 0; state.weaponDamage = 0;
}
function driveCrew(state) {
  if (!spendAP(state, "captain", 1)) return false;
  state.ap += 2;
  gainStrain(state, 2);
  return true;
}
function coordinateAssault(state) {
  if (!spendAP(state, "captain", 1)) return false;
  state.hardnessReduction = STATION_BONUS(state.ship.level);
  state.hardnessReductionCharges = state.ship.level >= 5 ? 2 : 1;
  return true;
}
function acquireTarget(state) {
  if (!spendAP(state, "battlewatch", 1)) return false;
  state.attackBonus = STATION_BONUS(state.ship.level);
  state.attackBonusCharges = 1;
  return true;
}
function readyBroadside(state) {
  if (!spendAP(state, "battlewatch", 1)) return false;
  state.broadsideDamage = 2 * STATION_BONUS(state.ship.level);
  state.broadsideDamageCharges = 1;
  return true;
}
function redistributeWeapons(state) {
  if (!spendAP(state, "engineer", 1)) return false;
  state.weaponDamage = STATION_BONUS(state.ship.level);
  state.weaponDamageCharges = state.ship.level >= 5 ? 2 : 1;
  return true;
}
function reinforceLifeveil(state) {
  if (!spendAP(state, "veilwarden", 1)) return false;
  state.wardValue = 2 * STATION_BONUS(state.ship.level);
  state.wardCharges = state.ship.level >= 5 ? 2 : 1;
  return true;
}
function ventStrain(state) {
  if (!spendAP(state, "engineer", 1)) return false;
  state.strain = Math.max(0, state.strain - (1 + STATION_BONUS(state.ship.level)));
  state.stats.vents += 1;
  return true;
}
function mendLifeveil(state) {
  if (state.lifeveil >= state.ship.lifeveilMax || !spendAP(state, "veilwarden", 1)) return false;
  state.lifeveil = Math.min(state.ship.lifeveilMax, state.lifeveil + 5 * STATION_BONUS(state.ship.level));
  state.stats.mends += 1;
  return true;
}
function workGuns(state, weapon) {
  if (state.weaponReload[weapon.id] <= 0 || !spendAP(state, "battlewatch", 1)) return false;
  state.weaponReload[weapon.id] = Math.max(0, state.weaponReload[weapon.id] - STATION_BONUS(state.ship.level));
  return true;
}

function chooseReaction(defender) {
  if (defender.rp <= 0) return { ac:0, postHardness:0 };
  const b = STATION_BONUS(defender.ship.level);
  if (defender.policy === "defensive") {
    defender.rp -= 1; defender.stats.rpSpent += 1; defender.stats.reactions.brace += 1;
    return { ac:0, postHardness:3*b };
  }
  if (defender.policy === "balanced") {
    defender.rp -= 1; defender.stats.rpSpent += 1; defender.stats.reactions.evasive += 1; gainStrain(defender, 1);
    return { ac:b, postHardness:0 };
  }
  defender.rp -= 1; defender.stats.rpSpent += 1; defender.stats.reactions.spoil += 1;
  return { ac:b, postHardness:0 };
}

function fireWeapon(attacker, defender, weapon, rng) {
  if (attacker.ap < weapon.fireAP || attacker.weaponReload[weapon.id] > 0) return false;
  spendAP(attacker, "battlewatch", weapon.fireAP);
  attacker.weaponReload[weapon.id] = weapon.reload;
  const reaction = chooseReaction(defender);
  const roll = d20(rng);
  let atkBonus = attacker.ship.attackBonus;
  if (attacker.attackBonusCharges > 0) { atkBonus += attacker.attackBonus; attacker.attackBonusCharges -= 1; }
  const degree = degreeOfSuccess(roll, roll + atkBonus, defender.ship.ac + reaction.ac);
  const ws = attacker.stats.weapon[weapon.name] ??= { shots:0, hits:0, crits:0, damage:0 };
  attacker.stats.shots += 1; ws.shots += 1;
  if (degree < 2) { attacker.stats.misses += 1; return true; }
  attacker.stats.hits += 1; ws.hits += 1;
  if (degree === 3) { attacker.stats.crits += 1; ws.crits += 1; }
  let damage = rollDice(rng, weapon.dice);
  if (attacker.broadsideDamageCharges > 0 && ["port","starboard"].includes(weapon.mount)) {
    damage += attacker.broadsideDamage; attacker.broadsideDamageCharges -= 1;
  }
  if (attacker.weaponDamageCharges > 0) { damage += attacker.weaponDamage; attacker.weaponDamageCharges -= 1; }
  if (degree === 3) damage *= 2;
  if (defender.wardCharges > 0) { damage = Math.max(0, damage - defender.wardValue); defender.wardCharges -= 1; }
  let hardness = defender.ship.hardness;
  if (attacker.hardnessReductionCharges > 0) { hardness = Math.max(0, hardness - attacker.hardnessReduction); attacker.hardnessReductionCharges -= 1; }
  let hullDamage = Math.max(0, damage - hardness);
  hullDamage = Math.max(0, hullDamage - reaction.postHardness);
  defender.hull = Math.max(0, defender.hull - hullDamage);
  attacker.stats.damageDealt += hullDamage; defender.stats.damageTaken += hullDamage; ws.damage += hullDamage;
  return true;
}

function readyFacingWeapons(state) {
  return state.ship.weapons
    .filter(w => !w.offFacing && state.weaponReload[w.id] <= 0)
    .sort((a,b) => (b.dice[0]*(b.dice[1]+1)/2 / b.fireAP) - (a.dice[0]*(a.dice[1]+1)/2 / a.fireAP));
}
function reloadingFacingWeapons(state) {
  return state.ship.weapons.filter(w => !w.offFacing && state.weaponReload[w.id] > 0)
    .sort((a,b) => state.weaponReload[a.id] - state.weaponReload[b.id]);
}

function takeTurn(state, foe, rng) {
  beginTurn(state);
  const lvPct = state.lifeveil / state.ship.lifeveilMax;

  if (state.policy === "aggressive") {
    if (state.strain <= state.ship.strainMax - 2) driveCrew(state);
    coordinateAssault(state);
    const broadside = readyFacingWeapons(state);
    if (broadside.length && state.ap >= broadside[0].fireAP + 2) { acquireTarget(state); readyBroadside(state); }
    else if (broadside.length && state.ap >= broadside[0].fireAP + 1) acquireTarget(state);
  } else if (state.policy === "defensive") {
    if (lvPct < 0.6) mendLifeveil(state);
    if (state.strain >= Math.ceil(state.ship.strainMax * 0.55)) ventStrain(state);
    reinforceLifeveil(state);
    const ready = readyFacingWeapons(state);
    if (ready.length && state.ap >= ready[0].fireAP + 1) acquireTarget(state);
  } else {
    if (lvPct < 0.5) mendLifeveil(state);
    if (state.strain >= Math.ceil(state.ship.strainMax * 0.7)) ventStrain(state);
    const ready = readyFacingWeapons(state);
    if (ready.length && state.ap >= ready[0].fireAP + 1) acquireTarget(state);
    if (ready.length && ["port","starboard"].includes(ready[0].mount) && state.ap >= ready[0].fireAP + 1) readyBroadside(state);
  }

  let fired = true;
  while (fired && foe.hull > 0) {
    fired = false;
    for (const weapon of readyFacingWeapons(state)) {
      if (state.ap >= weapon.fireAP) { fireWeapon(state, foe, weapon, rng); fired = true; if (foe.hull <= 0) break; }
    }
  }

  if (foe.hull > 0) {
    for (const weapon of reloadingFacingWeapons(state)) {
      if (state.ap >= 1 && state.weaponReload[weapon.id] > 0) workGuns(state, weapon);
      if (state.ap >= weapon.fireAP && state.weaponReload[weapon.id] === 0) fireWeapon(state, foe, weapon, rng);
      if (foe.hull <= 0) break;
    }
  }
  if (foe.hull > 0 && state.ap >= 1 && state.policy === "aggressive") redistributeWeapons(state);
  if (foe.hull > 0 && state.ap >= 1 && state.strain >= Math.ceil(state.ship.strainMax * 0.8)) ventStrain(state);

  state.stats.strainSamples.push(state.strain);
  state.stats.peakStrain = Math.max(state.stats.peakStrain, state.strain);
}

export function simulateBattle({ rumPolicy="balanced", ironPolicy="balanced", seed=1, maxRounds=40 } = {}) {
  const rng = mulberry32(seed);
  const rum = initialState(BENCHMARK_SHIPS.rumRunner, rumPolicy);
  const iron = initialState(BENCHMARK_SHIPS.ironSpear, ironPolicy);
  const rumFirst = rng() < 0.5;
  let round = 0;
  for (round = 1; round <= maxRounds && rum.hull > 0 && iron.hull > 0; round += 1) {
    const order = rumFirst ? [[rum,iron],[iron,rum]] : [[iron,rum],[rum,iron]];
    for (const [actor, foe] of order) {
      if (actor.hull <= 0 || foe.hull <= 0) break;
      takeTurn(actor, foe, rng);
    }
  }
  const completedRounds = Math.min(maxRounds, round - (rum.hull <= 0 || iron.hull <= 0 ? 0 : 1));
  const winner = rum.hull <= 0 && iron.hull <= 0 ? "draw" : rum.hull <= 0 ? "ironSpear" : iron.hull <= 0 ? "rumRunner" : "draw";
  return { winner, rounds: completedRounds, rum, iron };
}

function aggregateSide(results, key) {
  const sides = results.map(r => r[key]);
  const totalRounds = results.reduce((a,r)=>a+r.rounds,0) || 1;
  const sum = (f) => sides.reduce((a,s)=>a+f(s),0);
  const ap = { captain:0,battlewatch:0,navigator:0,engineer:0,veilwarden:0 };
  for (const s of sides) for (const k of Object.keys(ap)) ap[k] += s.stats.apByStation[k];
  for (const k of Object.keys(ap)) ap[k] /= results.length;
  const weapon = {};
  for (const s of sides) for (const [name,w] of Object.entries(s.stats.weapon)) {
    const o = weapon[name] ??= { shots:0,hits:0,crits:0,damage:0 };
    o.shots += w.shots; o.hits += w.hits; o.crits += w.crits; o.damage += w.damage;
  }
  for (const w of Object.values(weapon)) { w.shots/=results.length; w.hits/=results.length; w.crits/=results.length; w.damage/=results.length; }
  return {
    damagePerRound: sum(s=>s.stats.damageDealt) / totalRounds,
    damageTakenPerRound: sum(s=>s.stats.damageTaken) / totalRounds,
    apPerBattleByStation: ap,
    rpPerBattle: sum(s=>s.stats.rpSpent)/results.length,
    reactionsPerBattle: Object.fromEntries(Object.keys(sides[0].stats.reactions).map(k=>[k,sum(s=>s.stats.reactions[k])/results.length])),
    avgStrain: avg(sides.flatMap(s=>s.stats.strainSamples)),
    avgPeakStrain: sum(s=>s.stats.peakStrain)/results.length,
    avgEndStrain: sum(s=>s.strain)/results.length,
    ventsPerBattle: sum(s=>s.stats.vents)/results.length,
    mendsPerBattle: sum(s=>s.stats.mends)/results.length,
    repairsPerBattle: sum(s=>s.stats.repairs)/results.length,
    shotsPerBattle: sum(s=>s.stats.shots)/results.length,
    hitRate: sum(s=>s.stats.hits) / Math.max(1,sum(s=>s.stats.shots)),
    critRate: sum(s=>s.stats.crits) / Math.max(1,sum(s=>s.stats.shots)),
    avgFinalHull: sum(s=>s.hull)/results.length,
    avgFinalLifeveil: sum(s=>s.lifeveil)/results.length,
    avgFinalMorale: sum(s=>s.morale)/results.length,
    weapon
  };
}

export function runMatchup({ rumPolicy, ironPolicy, runs=10000, seed=8675309, maxRounds=40 } = {}) {
  const results = [];
  let rumWins=0, ironWins=0, draws=0;
  for (let i=0;i<runs;i+=1) {
    const result = simulateBattle({ rumPolicy, ironPolicy, seed: (seed + Math.imul(i+1, 2654435761)) >>> 0, maxRounds });
    results.push(result);
    if (result.winner === "rumRunner") rumWins += 1;
    else if (result.winner === "ironSpear") ironWins += 1;
    else draws += 1;
  }
  const ci = wilson95(rumWins, runs);
  return {
    rumPolicy, ironPolicy, runs, rumWins, ironWins, draws,
    rumWinRate: rumWins/runs,
    rumWin95: ci,
    avgRounds: avg(results.map(r=>r.rounds)),
    medianRounds: median(results.map(r=>r.rounds)),
    rum: aggregateSide(results,"rum"),
    iron: aggregateSide(results,"iron")
  };
}

export function runGauntlet({ runs=10000, seed=8675309, maxRounds=40 } = {}) {
  const matchups=[];
  let offset=0;
  for (const rumPolicy of POLICIES) for (const ironPolicy of POLICIES) {
    matchups.push(runMatchup({ rumPolicy, ironPolicy, runs, seed:(seed + offset++*1000003)>>>0, maxRounds }));
  }
  const dominance = {
    rumPolicy: POLICIES.map(p=>({ policy:p, meanWinRate:avg(matchups.filter(m=>m.rumPolicy===p).map(m=>m.rumWinRate)) })).sort((a,b)=>b.meanWinRate-a.meanWinRate),
    ironPolicy: POLICIES.map(p=>({ policy:p, meanIronWinRate:avg(matchups.filter(m=>m.ironPolicy===p).map(m=>m.ironWins/m.runs)) })).sort((a,b)=>b.meanIronWinRate-a.meanIronWinRate),
    extremeMatchups: matchups.filter(m=>m.rumWinRate>=0.70 || m.rumWinRate<=0.30).map(m=>`${m.rumPolicy} vs ${m.ironPolicy}`),
    stallMatchups: matchups.filter(m=>m.draws/m.runs>=0.05 || m.avgRounds>=20).map(m=>`${m.rumPolicy} vs ${m.ironPolicy}`),
    overallRumWinRate: avg(matchups.map(m=>m.rumWinRate))
  };
  return { model:"headless-engaged-broadside-v1", fixtureNotice:"Rum Runner and IronSpear are repository benchmark fixtures, not Foundry world actor exports.", runsPerMatchup:runs, seed, maxRounds, ships:BENCHMARK_SHIPS, matchups, dominance };
}

function pct(n){return `${(n*100).toFixed(1)}%`;}
function printText(report) {
  console.log("Arkflight Combat Gauntlet — headless engaged-broadside benchmark");
  console.log(report.fixtureNotice);
  console.log(`Runs: ${report.runsPerMatchup.toLocaleString()} per matchup (${report.matchups.length * report.runsPerMatchup} total), seed ${report.seed}, cap ${report.maxRounds} rounds.`);
  console.log("\nRum Runner policy | IronSpear policy | Rum win | 95% CI | Draw | Avg rnd | Rum DPR | Iron DPR");
  for (const m of report.matchups) {
    console.log(`${m.rumPolicy.padEnd(10)} | ${m.ironPolicy.padEnd(10)} | ${pct(m.rumWinRate).padStart(7)} | ${pct(m.rumWin95[0])}-${pct(m.rumWin95[1])} | ${pct(m.draws/m.runs).padStart(5)} | ${m.avgRounds.toFixed(2).padStart(7)} | ${m.rum.damagePerRound.toFixed(2).padStart(7)} | ${m.iron.damagePerRound.toFixed(2).padStart(8)}`);
  }
  console.log("\nPolicy means:");
  console.log("Rum Runner:", report.dominance.rumPolicy.map(x=>`${x.policy} ${pct(x.meanWinRate)}`).join(", "));
  console.log("IronSpear:", report.dominance.ironPolicy.map(x=>`${x.policy} ${pct(x.meanIronWinRate)}`).join(", "));
  console.log("Extreme matchups:", report.dominance.extremeMatchups.length ? report.dominance.extremeMatchups.join(", ") : "none");
  console.log("Stall flags:", report.dominance.stallMatchups.length ? report.dominance.stallMatchups.join(", ") : "none");
}

function cliArgs(argv) {
  const out={runs:10000,seed:8675309,maxRounds:40,format:"text"};
  for(let i=0;i<argv.length;i+=1){
    if(argv[i]==="--runs") out.runs=Math.max(1,Number(argv[++i])||out.runs);
    else if(argv[i]==="--seed") out.seed=(Number(argv[++i])||out.seed)>>>0;
    else if(argv[i]==="--max-rounds") out.maxRounds=Math.max(1,Number(argv[++i])||out.maxRounds);
    else if(argv[i]==="--format") out.format=String(argv[++i]||out.format);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts=cliArgs(process.argv.slice(2));
  const report=runGauntlet(opts);
  if(opts.format==="json") console.log(JSON.stringify(report,null,2)); else printText(report);
}
