export const SHIP_SPECIALIZATIONS = Object.freeze({
  BATTLE_SHIP: "battle-ship",
  RAIDER: "raider",
  TRADER: "trader",
  VOYAGER: "voyager",
  EXPLORER: "explorer",
  EXPEDITION_SHIP: "expedition-ship"
});

export const SHIP_SPECIALIZATION_DEFINITIONS = Object.freeze({
  [SHIP_SPECIALIZATIONS.BATTLE_SHIP]: Object.freeze({ id: SHIP_SPECIALIZATIONS.BATTLE_SHIP, name: "Battle Ship", summary: "Heavy-battery conversion, battle survival, and Battle Stations." }),
  [SHIP_SPECIALIZATIONS.RAIDER]: Object.freeze({ id: SHIP_SPECIALIZATIONS.RAIDER, name: "Raider", summary: "Pursuit, disabling fire, boarding pressure, and prize-taking." }),
  [SHIP_SPECIALIZATIONS.TRADER]: Object.freeze({ id: SHIP_SPECIALIZATIONS.TRADER, name: "Trader", summary: "Expanded holds, efficient stores, and faster established routes." }),
  [SHIP_SPECIALIZATIONS.VOYAGER]: Object.freeze({ id: SHIP_SPECIALIZATIONS.VOYAGER, name: "Voyager", summary: "Deep stores, long-haul maintenance, and endurance against Voyage Strain." }),
  [SHIP_SPECIALIZATIONS.EXPLORER]: Object.freeze({ id: SHIP_SPECIALIZATIONS.EXPLORER, name: "Explorer", summary: "Dedicated survey fittings, discovery advantages, and beyond-chart rerolls." }),
  [SHIP_SPECIALIZATIONS.EXPEDITION_SHIP]: Object.freeze({ id: SHIP_SPECIALIZATIONS.EXPEDITION_SHIP, name: "Expedition Ship", summary: "Field logistics, expedition fittings, specialists, and prepared equipment." })
});

const SIZE_UPGRADE = Object.freeze({ small: "medium", medium: "large", large: "large" });

export function specializationActive(ship, specializationId) {
  return Math.max(1, Math.trunc(Number(ship?.progression?.level) || 1)) >= 5
    && ship?.progression?.specializationId === specializationId;
}

export function upgradedWeaponMountsForBattleShip(weaponMounts = {}) {
  return Object.fromEntries(Object.entries(weaponMounts ?? {}).map(([facing, mount]) => [
    facing,
    {
      ...mount,
      maxSize: SIZE_UPGRADE[mount?.maxSize ?? "small"] ?? mount?.maxSize ?? "small"
    }
  ]));
}

function addSpecializedSlot(stats, key) {
  stats.modSlotBonuses ??= {};
  stats.modSlotBonuses[key] = Number(stats.modSlotBonuses[key] ?? 0) + 1;
  stats.shipModCapacity = Number(stats.shipModCapacity ?? 0) + 1;
}

/** Apply locked level-5 specialization effects that alter persistent derived ship facts. */
export function applyShipSpecialization(stats, ship, capabilities) {
  const id = ship?.progression?.specializationId ?? null;
  if (!id || Math.max(1, Math.trunc(Number(ship?.progression?.level) || 1)) < 5) return stats;

  if (id === SHIP_SPECIALIZATIONS.BATTLE_SHIP) {
    stats.weaponMounts = upgradedWeaponMountsForBattleShip(stats.weaponMounts);
    stats.armorClass = Number(stats.armorClass ?? 0) + 1;
    capabilities?.add("battle-stations");
    capabilities?.add("warship-conversion");
  } else if (id === SHIP_SPECIALIZATIONS.RAIDER) {
    capabilities?.add("pursuit-weapon-integration");
    capabilities?.add("predators-pace");
    capabilities?.add("take-the-prize");
  } else if (id === SHIP_SPECIALIZATIONS.TRADER) {
    stats.cargoCapacity = Math.floor(Number(stats.cargoCapacity ?? 0) * 1.5);
    capabilities?.add("efficient-stores");
    capabilities?.add("established-routes");
  } else if (id === SHIP_SPECIALIZATIONS.VOYAGER) {
    stats.supplyCapacity = Math.floor(Number(stats.supplyCapacity ?? 0) * 1.5);
    capabilities?.add("long-haul-maintenance");
    capabilities?.add("keep-going");
  } else if (id === SHIP_SPECIALIZATIONS.EXPLORER) {
    addSpecializedSlot(stats, "exploration");
    capabilities?.add("survey-doctrine");
    capabilities?.add("beyond-the-chart");
  } else if (id === SHIP_SPECIALIZATIONS.EXPEDITION_SHIP) {
    addSpecializedSlot(stats, "expedition");
    stats.supplyCapacity = Math.floor(Number(stats.supplyCapacity ?? 0) * 1.25);
    capabilities?.add("field-logistics");
    capabilities?.add("we-brought-one");
  }
  return stats;
}
