const DEFAULT_POOLS = Object.freeze({
  captain: Object.freeze(["rapier", "saber", "longsword"]),
  engineer: Object.freeze(["warhammer", "light-hammer", "maul"]),
  navigator: Object.freeze(["rapier", "shortsword", "spear"]),
  watchmaster: Object.freeze(["crossbow", "longbow", "shortbow"]),
  veilwarden: Object.freeze(["staff", "mace", "morningstar"])
});

const FACTION_POOLS = Object.freeze({
  "grelkin cartel": Object.freeze({ captain:["battle-axe","falchion","longsword"], engineer:["warhammer","maul","pick"], navigator:["shortsword","spear","hatchet"], watchmaster:["crossbow","shortbow","longbow"], veilwarden:["staff","mace","flail"] }),
  "brotherhood of the cosmic flame": Object.freeze({ captain:["longsword","spear","rapier"], engineer:["warhammer","light-hammer","mace"], navigator:["rapier","spear","shortsword"], watchmaster:["crossbow","longbow","spear"], veilwarden:["staff","mace","spear"] }),
  freespacers: Object.freeze({ captain:["rapier","saber","shortsword"], engineer:["warhammer","light-hammer","club"], navigator:["rapier","shortsword","spear"], watchmaster:["longbow","crossbow","shortbow"], veilwarden:["staff","mace","spear"] }),
  freebooters: Object.freeze({ captain:["saber","rapier","longsword"], engineer:["warhammer","light-hammer","maul"], navigator:["rapier","shortsword","spear"], watchmaster:["crossbow","longbow","shortbow"], veilwarden:["staff","mace","morningstar"] }),
  "underwake syndicates": Object.freeze({ captain:["rapier","shortsword","dagger"], engineer:["light-hammer","warhammer","club"], navigator:["rapier","dagger","shortsword"], watchmaster:["crossbow","shortbow","dagger"], veilwarden:["staff","mace","dagger"] }),
  "council of the void": Object.freeze({ captain:["spear","staff","rapier"], engineer:["warhammer","staff","mace"], navigator:["spear","staff","rapier"], watchmaster:["crossbow","longbow","spear"], veilwarden:["staff","mace","spear"] })
});

const HOUSE_TENDENCIES = Object.freeze({
  "house starweaver": Object.freeze(["rapier","crossbow","staff"]),
  "house aurelian": Object.freeze(["longsword","rapier","mace"]),
  "house ironmantle": Object.freeze(["warhammer","maul","pick"]),
  "house veyr": Object.freeze(["rapier","crossbow","dagger"]),
  "house blackwake": Object.freeze(["saber","crossbow","longsword"]),
  "house stormglass": Object.freeze(["warhammer","crossbow","staff"]),
  "house marruk": Object.freeze(["longsword","crossbow","warhammer"]),
  "house valecross": Object.freeze(["staff","spear","longbow"]),
  "house emberhall": Object.freeze(["warhammer","maul","mace"]),
  "house tidereach": Object.freeze(["spear","rapier","crossbow"])
});

function unique(values) { return [...new Set(values.filter(Boolean))]; }

export function officerWeaponPool({ faction="Independent", station="captain" }={}) {
  const key = String(faction).trim().toLowerCase();
  const base = DEFAULT_POOLS[station] ?? DEFAULT_POOLS.captain;
  const factionPool = FACTION_POOLS[key]?.[station] ?? [];
  const house = HOUSE_TENDENCIES[key] ?? [];
  return Object.freeze(unique([...factionPool, ...house, ...base]));
}

export function buildOfficerWeaponIntent({ faction="Independent", station="captain", level=1, quality="standard", rewardWeight="standard" }={}) {
  const pool = officerWeaponPool({ faction, station });
  const upgradeAllowance = quality === "elite" && ["major","hoard"].includes(rewardWeight)
    ? "level-appropriate"
    : quality === "poor" || rewardWeight === "minor"
      ? "mundane-or-downgraded"
      : "budget-capped";
  return Object.freeze({
    station,
    faction,
    candidateSlugs: pool,
    actorLevel: Number(level) || 1,
    upgradeAllowance,
    resolverState: "pf2e-compendium-resolution-pending",
    combatMathMode: "npc-benchmark-independent",
    recoverable: true,
    autoAward: false
  });
}
