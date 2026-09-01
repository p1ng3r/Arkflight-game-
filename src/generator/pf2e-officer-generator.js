const STATION_ROLES = Object.freeze({
  captain: {
    label: "Captain",
    identity: "Command officer and crew leader",
    primarySkills: ["diplomacy", "intimidation"],
    secondarySkills: ["society", "warfare-lore"],
    bestSave: "will",
    weakSave: "reflex",
    perception: "high",
    ac: "moderate",
    attack: "moderate",
    hp: "moderate",
    abilities: [
      { id: "rally-command", name: "Rally Command", actionCost: 1, kind: "support", summary: "Bolster an ally or crew member through decisive command." },
      { id: "commanding-rebuke", name: "Commanding Rebuke", actionCost: 1, kind: "control", summary: "Pressure a foe with a sharp command or threat." }
    ]
  },
  engineer: {
    label: "Engineer",
    identity: "Arkengine technician and emergency repair specialist",
    primarySkills: ["crafting"],
    secondarySkills: ["arcana", "engineering-lore"],
    bestSave: "fortitude",
    weakSave: "will",
    perception: "moderate",
    ac: "moderate",
    attack: "moderate",
    hp: "high",
    abilities: [
      { id: "field-repair", name: "Field Repair", actionCost: 2, kind: "support", summary: "Make a rapid repair or stabilize damaged machinery." },
      { id: "aetheric-discharge", name: "Aetheric Discharge", actionCost: 2, kind: "offense", summary: "Vent dangerous stored energy through a short-range discharge." }
    ]
  },
  navigator: {
    label: "Navigator",
    identity: "Void pilot, route-reader, and mobility specialist",
    primarySkills: ["arcana", "occultism"],
    secondarySkills: ["survival", "navigation-lore"],
    bestSave: "reflex",
    weakSave: "fortitude",
    perception: "high",
    ac: "high",
    attack: "moderate",
    hp: "low",
    abilities: [
      { id: "perfect-line", name: "Perfect Line", actionCost: 1, kind: "mobility", summary: "Exploit a precise route or opening to reposition cleanly." },
      { id: "course-correction", name: "Course Correction", actionCost: 1, kind: "support", summary: "Read the field and redirect an ally toward a better position." }
    ]
  },
  watchmaster: {
    label: "Watchmaster",
    identity: "Gunnery officer, sentry commander, and tactical observer",
    primarySkills: ["perception", "warfare-lore"],
    secondarySkills: ["athletics", "intimidation"],
    bestSave: "reflex",
    weakSave: "will",
    perception: "high",
    ac: "high",
    attack: "high",
    hp: "moderate",
    abilities: [
      { id: "battle-stations", name: "Battle Stations", actionCost: 1, kind: "support", summary: "Direct nearby allies into firing positions or defensive posts." },
      { id: "mark-target", name: "Mark Target", actionCost: 1, kind: "offense", summary: "Identify a vulnerable target and improve follow-up pressure." }
    ]
  },
  veilwarden: {
    label: "Veilwarden",
    identity: "Lifeveil keeper, ritual defender, and occult ward specialist",
    primarySkills: ["religion", "occultism"],
    secondarySkills: ["arcana", "medicine"],
    bestSave: "will",
    weakSave: "reflex",
    perception: "moderate",
    ac: "moderate",
    attack: "low",
    hp: "low",
    spellcasting: true,
    abilities: [
      { id: "hold-the-veil", name: "Hold the Veil", actionCost: 2, kind: "defense", summary: "Raise a brief ward or stabilize magical protection around an ally." },
      { id: "aetheric-surge", name: "Aetheric Surge", actionCost: 2, kind: "occult", summary: "Release a controlled surge of veil energy against a nearby threat." }
    ]
  }
});

const PERCEPTION = {
  1:{high:10,moderate:7,low:4},2:{high:11,moderate:8,low:5},3:{high:12,moderate:9,low:6},4:{high:14,moderate:11,low:8},5:{high:15,moderate:12,low:9},6:{high:17,moderate:14,low:11},7:{high:18,moderate:15,low:12},8:{high:19,moderate:16,low:13},9:{high:21,moderate:18,low:15},10:{high:22,moderate:19,low:16},11:{high:24,moderate:21,low:18},12:{high:25,moderate:22,low:19},13:{high:26,moderate:23,low:20},14:{high:28,moderate:25,low:22},15:{high:29,moderate:26,low:23},16:{high:30,moderate:28,low:25},17:{high:32,moderate:29,low:26},18:{high:33,moderate:30,low:27},19:{high:35,moderate:32,low:29},20:{high:36,moderate:33,low:30}
};
const SKILLS = {
  1:{extreme:10,high:7,moderate:6,low:4},2:{extreme:11,high:8,moderate:7,low:5},3:{extreme:13,high:10,moderate:9,low:7},4:{extreme:15,high:12,moderate:10,low:8},5:{extreme:16,high:13,moderate:12,low:10},6:{extreme:18,high:15,moderate:13,low:11},7:{extreme:20,high:17,moderate:15,low:13},8:{extreme:21,high:18,moderate:16,low:14},9:{extreme:23,high:20,moderate:18,low:16},10:{extreme:25,high:22,moderate:19,low:17},11:{extreme:26,high:23,moderate:21,low:19},12:{extreme:28,high:25,moderate:22,low:20},13:{extreme:30,high:27,moderate:24,low:22},14:{extreme:31,high:28,moderate:25,low:23},15:{extreme:33,high:30,moderate:27,low:25},16:{extreme:35,high:32,moderate:28,low:26},17:{extreme:36,high:33,moderate:30,low:28},18:{extreme:38,high:35,moderate:31,low:29},19:{extreme:40,high:37,moderate:33,low:31},20:{extreme:41,high:38,moderate:34,low:32}
};
const AC = {
  1:{extreme:19,high:16,moderate:15,low:13},2:{extreme:21,high:18,moderate:17,low:15},3:{extreme:22,high:19,moderate:18,low:16},4:{extreme:24,high:21,moderate:20,low:18},5:{extreme:25,high:22,moderate:21,low:19},6:{extreme:27,high:24,moderate:23,low:21},7:{extreme:28,high:25,moderate:24,low:22},8:{extreme:30,high:27,moderate:26,low:24},9:{extreme:31,high:28,moderate:27,low:25},10:{extreme:33,high:30,moderate:29,low:27},11:{extreme:34,high:31,moderate:30,low:28},12:{extreme:36,high:33,moderate:32,low:30},13:{extreme:37,high:34,moderate:33,low:31},14:{extreme:39,high:36,moderate:35,low:33},15:{extreme:40,high:37,moderate:36,low:34},16:{extreme:42,high:39,moderate:38,low:36},17:{extreme:43,high:40,moderate:39,low:37},18:{extreme:45,high:42,moderate:41,low:39},19:{extreme:46,high:43,moderate:42,low:40},20:{extreme:48,high:45,moderate:44,low:42}
};
const SAVES = {
  1:{high:10,moderate:7,low:4},2:{high:11,moderate:8,low:5},3:{high:12,moderate:9,low:6},4:{high:14,moderate:11,low:8},5:{high:15,moderate:12,low:9},6:{high:17,moderate:14,low:11},7:{high:18,moderate:15,low:12},8:{high:19,moderate:16,low:13},9:{high:21,moderate:18,low:15},10:{high:22,moderate:19,low:16},11:{high:24,moderate:21,low:18},12:{high:25,moderate:22,low:19},13:{high:26,moderate:23,low:20},14:{high:28,moderate:25,low:22},15:{high:29,moderate:26,low:23},16:{high:30,moderate:28,low:25},17:{high:32,moderate:29,low:26},18:{high:33,moderate:30,low:27},19:{high:35,moderate:32,low:29},20:{high:36,moderate:33,low:30}
};
const ATTACK = {
  1:{high:9,moderate:7,low:5},2:{high:11,moderate:9,low:7},3:{high:12,moderate:10,low:8},4:{high:14,moderate:12,low:9},5:{high:15,moderate:13,low:11},6:{high:17,moderate:15,low:12},7:{high:18,moderate:16,low:13},8:{high:20,moderate:18,low:15},9:{high:21,moderate:19,low:16},10:{high:23,moderate:21,low:17},11:{high:24,moderate:22,low:19},12:{high:26,moderate:24,low:20},13:{high:27,moderate:25,low:21},14:{high:29,moderate:27,low:23},15:{high:30,moderate:28,low:24},16:{high:32,moderate:30,low:25},17:{high:33,moderate:31,low:27},18:{high:35,moderate:33,low:28},19:{high:36,moderate:34,low:29},20:{high:38,moderate:36,low:31}
};
const HP = {
  1:{high:25,moderate:20,low:15},2:{high:38,moderate:30,low:23},3:{high:56,moderate:45,low:34},4:{high:75,moderate:60,low:45},5:{high:94,moderate:75,low:56},6:{high:119,moderate:95,low:71},7:{high:144,moderate:115,low:86},8:{high:169,moderate:135,low:101},9:{high:194,moderate:155,low:116},10:{high:219,moderate:175,low:131},11:{high:244,moderate:195,low:146},12:{high:269,moderate:215,low:161},13:{high:294,moderate:235,low:176},14:{high:319,moderate:255,low:191},15:{high:344,moderate:275,low:206},16:{high:369,moderate:295,low:221},17:{high:394,moderate:315,low:236},18:{high:419,moderate:335,low:251},19:{high:444,moderate:355,low:266},20:{high:469,moderate:375,low:281}
};
const DAMAGE = {
  1:{high:"1d6+3",moderate:"1d6+2",low:"1d4+2"},2:{high:"1d10+4",moderate:"1d8+4",low:"1d6+3"},3:{high:"1d10+6",moderate:"1d8+6",low:"1d6+5"},4:{high:"2d8+5",moderate:"2d6+5",low:"2d4+4"},5:{high:"2d8+7",moderate:"2d6+6",low:"2d4+6"},6:{high:"2d8+9",moderate:"2d6+8",low:"2d4+7"},7:{high:"2d10+9",moderate:"2d8+8",low:"2d6+6"},8:{high:"2d10+11",moderate:"2d8+9",low:"2d6+8"},9:{high:"2d10+13",moderate:"2d8+11",low:"2d6+9"},10:{high:"2d12+13",moderate:"2d10+11",low:"2d6+10"},11:{high:"2d12+15",moderate:"2d10+12",low:"2d8+10"},12:{high:"3d10+14",moderate:"3d8+12",low:"3d6+10"},13:{high:"3d10+16",moderate:"3d8+14",low:"3d6+11"},14:{high:"3d10+18",moderate:"3d8+15",low:"3d6+13"},15:{high:"3d12+17",moderate:"3d10+14",low:"3d6+14"},16:{high:"3d12+18",moderate:"3d10+15",low:"3d6+15"},17:{high:"3d12+19",moderate:"3d10+16",low:"3d6+16"},18:{high:"3d12+20",moderate:"3d10+17",low:"3d6+17"},19:{high:"4d10+20",moderate:"4d8+17",low:"4d6+14"},20:{high:"4d10+22",moderate:"4d8+19",low:"4d6+15"}
};
const SPELL = {
  1:{highDC:17,highAttack:9,moderateDC:14,moderateAttack:6},2:{highDC:18,highAttack:10,moderateDC:15,moderateAttack:7},3:{highDC:20,highAttack:12,moderateDC:17,moderateAttack:9},4:{highDC:21,highAttack:13,moderateDC:18,moderateAttack:10},5:{highDC:22,highAttack:14,moderateDC:19,moderateAttack:11},6:{highDC:24,highAttack:16,moderateDC:21,moderateAttack:13},7:{highDC:25,highAttack:17,moderateDC:22,moderateAttack:14},8:{highDC:26,highAttack:18,moderateDC:23,moderateAttack:15},9:{highDC:28,highAttack:20,moderateDC:25,moderateAttack:17},10:{highDC:29,highAttack:21,moderateDC:26,moderateAttack:18},11:{highDC:30,highAttack:22,moderateDC:27,moderateAttack:19},12:{highDC:32,highAttack:24,moderateDC:29,moderateAttack:21},13:{highDC:33,highAttack:25,moderateDC:30,moderateAttack:22},14:{highDC:34,highAttack:26,moderateDC:31,moderateAttack:23},15:{highDC:36,highAttack:28,moderateDC:33,moderateAttack:25},16:{highDC:37,highAttack:29,moderateDC:34,moderateAttack:26},17:{highDC:38,highAttack:30,moderateDC:35,moderateAttack:27},18:{highDC:40,highAttack:32,moderateDC:37,moderateAttack:29},19:{highDC:41,highAttack:33,moderateDC:38,moderateAttack:30},20:{highDC:42,highAttack:34,moderateDC:39,moderateAttack:31}
};

function clampLevel(level) { return Math.max(1, Math.min(20, Math.round(Number(level) || 1))); }
function qualityProfile(quality) {
  if (quality === "poor") return { specialty: "moderate", secondary: "moderate", defenseShift: "moderate", abilityCount: 1, label: "Poor" };
  if (quality === "elite") return { specialty: "extreme", secondary: "high", defenseShift: "high", abilityCount: 2, label: "Elite" };
  return { specialty: "high", secondary: "moderate", defenseShift: null, abilityCount: 2, label: "Standard" };
}
function value(table, level, band) { return table[clampLevel(level)]?.[band] ?? null; }
function saveBands(role, quality) {
  const base = { fortitude: "moderate", reflex: "moderate", will: "moderate" };
  base[role.bestSave] = quality === "elite" ? "high" : "high";
  base[role.weakSave] = quality === "poor" ? "low" : "low";
  return base;
}

export function generatePF2eOfficerBenchmark({ station, level, quality = "standard" } = {}) {
  const role = STATION_ROLES[station];
  if (!role) throw new Error(`Unknown Arkflight officer station: ${station}`);
  const creatureLevel = clampLevel(level);
  const qualityRule = qualityProfile(quality);
  const acBand = qualityRule.defenseShift ?? role.ac;
  const attackBand = quality === "elite" && role.attack === "moderate" ? "high" : role.attack;
  const hpBand = quality === "poor" && role.hp === "high" ? "moderate" : role.hp;
  const saves = saveBands(role, quality);
  const skillBand = qualityRule.specialty;
  const secondaryBand = qualityRule.secondary;
  const skills = {};
  for (const skill of role.primarySkills) skills[skill] = value(SKILLS, creatureLevel, skillBand);
  for (const skill of role.secondarySkills) skills[skill] = value(SKILLS, creatureLevel, secondaryBand);
  const spell = role.spellcasting ? SPELL[creatureLevel] : null;

  return Object.freeze({
    station,
    role: role.label,
    identity: role.identity,
    level: creatureLevel,
    quality: qualityRule.label,
    benchmarkBands: Object.freeze({ specialtySkill: skillBand, secondarySkill: secondaryBand, ac: acBand, attack: attackBand, hp: hpBand }),
    statistics: Object.freeze({
      perception: value(PERCEPTION, creatureLevel, role.perception),
      skills: Object.freeze(skills),
      ac: value(AC, creatureLevel, acBand),
      saves: Object.freeze(Object.fromEntries(Object.entries(saves).map(([key, band]) => [key, value(SAVES, creatureLevel, band)]))),
      hp: value(HP, creatureLevel, hpBand),
      strike: Object.freeze({ attack: value(ATTACK, creatureLevel, attackBand), damage: value(DAMAGE, creatureLevel, attackBand) }),
      spellcasting: spell ? Object.freeze({ dc: quality === "elite" ? spell.highDC : spell.moderateDC, attack: quality === "elite" ? spell.highAttack : spell.moderateAttack, tradition: "occult" }) : null
    }),
    abilities: Object.freeze(role.abilities.slice(0, qualityRule.abilityCount)),
    generationState: "benchmark-complete",
    actorData: null
  });
}

export function stationRole(station) { return STATION_ROLES[station] ?? null; }
export const PF2E_STATION_ROLES = STATION_ROLES;
