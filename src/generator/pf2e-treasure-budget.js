export const PF2E_TREASURE_BY_ENCOUNTER = Object.freeze({
  1:{total:175,minor:13,standard:18,major:26,hoard:35},
  2:{total:300,minor:23,standard:30,major:45,hoard:60},
  3:{total:500,minor:38,standard:50,major:75,hoard:100},
  4:{total:850,minor:65,standard:85,major:130,hoard:170},
  5:{total:1350,minor:100,standard:135,major:200,hoard:270},
  6:{total:2000,minor:150,standard:200,major:300,hoard:400},
  7:{total:2900,minor:220,standard:290,major:440,hoard:580},
  8:{total:4000,minor:300,standard:400,major:600,hoard:800},
  9:{total:5700,minor:430,standard:570,major:860,hoard:1140},
  10:{total:8000,minor:600,standard:800,major:1200,hoard:1600},
  11:{total:11500,minor:865,standard:1150,major:1725,hoard:2300},
  12:{total:16500,minor:1250,standard:1650,major:2475,hoard:3300},
  13:{total:25000,minor:1875,standard:2500,major:3750,hoard:5000},
  14:{total:36500,minor:2750,standard:3650,major:5500,hoard:7300},
  15:{total:54500,minor:4100,standard:5450,major:8175,hoard:10900},
  16:{total:82500,minor:6200,standard:8250,major:12375,hoard:16500},
  17:{total:128000,minor:9600,standard:12800,major:19200,hoard:25600},
  18:{total:208000,minor:15600,standard:20800,major:31200,hoard:41600},
  19:{total:355000,minor:26600,standard:35500,major:53250,hoard:71000},
  20:{total:490000,minor:36800,standard:49000,major:73500,hoard:98000}
});

export function encounterTreasureBudget(level, rewardWeight="standard") {
  const safeLevel = Math.max(1, Math.min(20, Math.round(Number(level) || 1)));
  const row = PF2E_TREASURE_BY_ENCOUNTER[safeLevel];
  const key = ["minor","standard","major","hoard"].includes(rewardWeight) ? rewardWeight : "standard";
  return Object.freeze({ level:safeLevel, rewardWeight:key, gp:row[key], totalPerLevel:row.total, source:"PF2e GM Core Table 5-3: Treasure by Encounter" });
}
