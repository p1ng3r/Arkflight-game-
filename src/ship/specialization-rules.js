export const SHIP_SPECIALIZATIONS = Object.freeze({
  BATTLE_SHIP: "battle-ship",
  RAIDER: "raider",
  TRADER: "trader",
  VOYAGER: "voyager",
  EXPLORER: "explorer",
  EXPEDITION_SHIP: "expedition-ship"
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

/** Apply locked level-5 specialization effects that alter persistent derived ship facts. */
export function applyShipSpecialization(stats, ship, capabilities) {
  if (!specializationActive(ship, SHIP_SPECIALIZATIONS.BATTLE_SHIP)) return stats;

  stats.weaponMounts = upgradedWeaponMountsForBattleShip(stats.weaponMounts);
  stats.armorClass = Number(stats.armorClass ?? 0) + 1;
  capabilities?.add("battle-stations");
  capabilities?.add("warship-conversion");
  return stats;
}
