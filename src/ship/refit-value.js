export const AETHER_SCRAP_GP_VALUE = 10;

export const REFIT_VALUE_RATES = Object.freeze({
  fabrication: 0.50,
  installation: 0.20,
  breakdown: 0.25,
  resale: 0.50,
  dockDiscount: 0.25,
  shipyardDiscount: 0.50
});

// Arkflight economic level is intentionally offset from PF2e character/item
// level: Ship/Mod level 1 is priced like a PF2e level 6 permanent item.
export const ARKFLIGHT_TO_PF2E_LEVEL_OFFSET = 5;

// Midpoint values from GM Core permanent magic item price ranges for levels
// 6-20. Levels 21-25 continue the same late-game growth curve so Arkflight
// ship levels 16-20 can keep scaling beyond PF2e's normal item-level ceiling.
export const PF2E_PERMANENT_ITEM_VALUE_GP = Object.freeze({
  6: 225,
  7: 330,
  8: 460,
  9: 640,
  10: 910,
  11: 1280,
  12: 1820,
  13: 2700,
  14: 4050,
  15: 5900,
  16: 8950,
  17: 13500,
  18: 21300,
  19: 35200,
  20: 61000,
  21: 93000,
  22: 140000,
  23: 210000,
  24: 320000,
  25: 480000
});

export const DEFAULT_MOD_LEVEL_BY_RARITY = Object.freeze({
  standard: 1,
  rare: 3,
  epic: 7,
  legendary: 12,
  mythic: 17
});

function positiveGp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function boundedArkflightLevel(value) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.max(1, Math.min(20, number));
}

export function componentArkflightLevel(component) {
  const explicit = boundedArkflightLevel(
    component?.data?.refit?.arkflightLevel
    ?? component?.data?.arkflightLevel
    ?? component?.data?.minShipLevel
    ?? component?.data?.level
  );
  if (explicit) return explicit;
  const rarity = String(component?.data?.rarity ?? "standard").toLowerCase();
  return DEFAULT_MOD_LEVEL_BY_RARITY[rarity] ?? 1;
}

export function arkflightLevelToPf2eLevel(arkflightLevel) {
  return boundedArkflightLevel(arkflightLevel) + ARKFLIGHT_TO_PF2E_LEVEL_OFFSET;
}

export function arkflightLevelValueGp(arkflightLevel) {
  const pf2eLevel = arkflightLevelToPf2eLevel(arkflightLevel);
  return PF2E_PERMANENT_ITEM_VALUE_GP[pf2eLevel] ?? 0;
}

export function componentFullValueGp(component) {
  const authored = positiveGp(
    component?.data?.refit?.fullValueGp
    ?? component?.data?.fullValueGp
    ?? component?.data?.valueGp
    ?? component?.data?.priceGp
    ?? 0
  );
  if (authored > 0) return authored;
  return arkflightLevelValueGp(componentArkflightLevel(component));
}

export function gpToAetherScrap(gpValue) {
  return Math.ceil(positiveGp(gpValue) / AETHER_SCRAP_GP_VALUE);
}

export function discountedGp(gpValue, discountRate = 0) {
  const discount = Math.min(1, Math.max(0, Number(discountRate) || 0));
  return positiveGp(gpValue) * (1 - discount);
}

export function componentEconomyQuote(component) {
  const arkflightLevel = componentArkflightLevel(component);
  const pf2eLevel = arkflightLevelToPf2eLevel(arkflightLevel);
  const fullValueGp = componentFullValueGp(component);
  if (!fullValueGp) return Object.freeze({ ok: false, reason: "missing-component-value", component });

  const fabricationGp = fullValueGp * REFIT_VALUE_RATES.fabrication;
  const installationGp = fullValueGp * REFIT_VALUE_RATES.installation;
  const breakdownGp = fullValueGp * REFIT_VALUE_RATES.breakdown;
  const resaleGp = fullValueGp * REFIT_VALUE_RATES.resale;

  return Object.freeze({
    ok: true,
    component,
    arkflightLevel,
    pf2eLevel,
    fullValueGp,
    aetherScrapGpValue: AETHER_SCRAP_GP_VALUE,
    fabrication: Object.freeze({
      gpValue: fabricationGp,
      aetherScrap: gpToAetherScrap(fabricationGp)
    }),
    installation: Object.freeze({
      crew: Object.freeze({
        gpValue: installationGp,
        aetherScrap: gpToAetherScrap(installationGp)
      }),
      dock: Object.freeze({
        gpValue: discountedGp(installationGp, REFIT_VALUE_RATES.dockDiscount),
        aetherScrap: gpToAetherScrap(discountedGp(installationGp, REFIT_VALUE_RATES.dockDiscount))
      }),
      shipyard: Object.freeze({
        gpValue: discountedGp(installationGp, REFIT_VALUE_RATES.shipyardDiscount),
        aetherScrap: gpToAetherScrap(discountedGp(installationGp, REFIT_VALUE_RATES.shipyardDiscount))
      })
    }),
    breakdown: Object.freeze({
      gpValue: breakdownGp,
      aetherScrap: gpToAetherScrap(breakdownGp)
    }),
    resale: Object.freeze({ gpValue: resaleGp })
  });
}
