export const SHIP_ECONOMY = Object.freeze({
  crewPerDailySupply: 10,
  suppliesPerCargo: 10,
  salvagePartsPerCargo: 10,
  zeroSupplyMoraleLossPerDay: 1,
  zeroSupplyStrainEveryDays: 2
});

function wholeNonnegative(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function nonnegative(value) {
  return Math.max(0, Number(value) || 0);
}

export function dailySupplyConsumption(crewAboard) {
  const crew = wholeNonnegative(crewAboard);
  if (crew === 0) return 0;
  return Math.max(1, Math.ceil(crew / SHIP_ECONOMY.crewPerDailySupply));
}

export function supplyCargoUsage(quantity) {
  return nonnegative(quantity) / SHIP_ECONOMY.suppliesPerCargo;
}

export function salvageCargoUsage(quantity) {
  return nonnegative(quantity) / SHIP_ECONOMY.salvagePartsPerCargo;
}

function componentInventoryCargo(inventory = {}, catalog = {}) {
  let used = 0;
  for (const [id, rawQuantity] of Object.entries(inventory ?? {})) {
    const quantity = wholeNonnegative(rawQuantity);
    if (!quantity) continue;
    const component = catalog?.[id];
    const slotCost = nonnegative(component?.data?.refit?.slotCost ?? component?.slotCost ?? component?.capacityCost ?? 0);
    used += quantity * slotCost;
  }
  return used;
}

function weaponInventoryCargo(inventory = {}, catalog = {}) {
  let used = 0;
  for (const [id, rawQuantity] of Object.entries(inventory ?? {})) {
    const quantity = wholeNonnegative(rawQuantity);
    if (!quantity) continue;
    const weapon = catalog?.[id];
    const cargo = nonnegative(weapon?.data?.cargo ?? weapon?.cargo ?? weapon?.cargoCost ?? 0);
    used += quantity * cargo;
  }
  return used;
}

export function calculateCargoUsage({
  supplies = 0,
  salvageParts = 0,
  ordinaryCargo = 0,
  shipModInventory = {},
  arkengineModInventory = {},
  weaponInventory = {},
  catalogs = {}
} = {}) {
  const breakdown = Object.freeze({
    supplies: supplyCargoUsage(supplies),
    salvageParts: salvageCargoUsage(salvageParts),
    shipMods: componentInventoryCargo(shipModInventory, catalogs.shipMods),
    arkengineMods: componentInventoryCargo(arkengineModInventory, catalogs.arkengineMods),
    weapons: weaponInventoryCargo(weaponInventory, catalogs.weapons),
    ordinaryCargo: nonnegative(ordinaryCargo)
  });
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return Object.freeze({ used: total, breakdown });
}

export function zeroSupplyDayConsequences(daysWithoutSupplies) {
  const days = wholeNonnegative(daysWithoutSupplies);
  return Object.freeze({
    days,
    moraleLoss: days * SHIP_ECONOMY.zeroSupplyMoraleLossPerDay,
    strainGain: Math.floor(days / SHIP_ECONOMY.zeroSupplyStrainEveryDays)
  });
}
