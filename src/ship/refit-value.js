export const AETHER_SCRAP_GP_VALUE = 10;

export const REFIT_VALUE_RATES = Object.freeze({
  fabrication: 0.50,
  installation: 0.20,
  breakdown: 0.25,
  resale: 0.50,
  dockDiscount: 0.25,
  shipyardDiscount: 0.50
});

function positiveGp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function componentFullValueGp(component) {
  return positiveGp(
    component?.data?.refit?.fullValueGp
    ?? component?.data?.fullValueGp
    ?? component?.data?.valueGp
    ?? component?.data?.priceGp
    ?? 0
  );
}

export function gpToAetherScrap(gpValue) {
  return Math.ceil(positiveGp(gpValue) / AETHER_SCRAP_GP_VALUE);
}

export function discountedGp(gpValue, discountRate = 0) {
  const discount = Math.min(1, Math.max(0, Number(discountRate) || 0));
  return positiveGp(gpValue) * (1 - discount);
}

export function componentEconomyQuote(component) {
  const fullValueGp = componentFullValueGp(component);
  if (!fullValueGp) return Object.freeze({ ok: false, reason: "missing-component-value", component });

  const fabricationGp = fullValueGp * REFIT_VALUE_RATES.fabrication;
  const installationGp = fullValueGp * REFIT_VALUE_RATES.installation;
  const breakdownGp = fullValueGp * REFIT_VALUE_RATES.breakdown;
  const resaleGp = fullValueGp * REFIT_VALUE_RATES.resale;

  return Object.freeze({
    ok: true,
    component,
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
