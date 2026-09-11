import { SHIP_SPECIALIZATIONS, specializationActive } from "../ship/specialization-rules.js";

function nonnegative(value) { return Math.max(0, Number(value) || 0); }
function positive(value, fallback = 1) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; }

/**
 * Strategic Arkflight travel uses authored days-per-galactic-hex from the
 * installed Arkengine. Tier remains an engine class/technology rating; it does
 * not force every engine of the same tier to have identical travel speed.
 */
export function strategicTravelRate({ ship = null, derived = null, engine = null } = {}) {
  const daysPerHex = positive(
    derived?.stats?.voyageSpeedTravelHexDays
      ?? engine?.effects?.find?.((effect) => effect?.target === "voyageSpeedTravelHexDays")?.value,
    1
  );
  const tier = Math.max(1, Math.trunc(Number(engine?.data?.tier) || 1));
  return Object.freeze({ tier, daysPerHex, hexesPerDay: 1 / daysPerHex });
}

export function strategicHexCost(multiplier = 1) {
  return positive(multiplier, 1);
}

/**
 * Build a strategic route plan. A route is measured in galactic hexes. Each
 * hex can carry an authored terrain/current multiplier. Trader's Established
 * Routes applies only when the route is both known and commercially established.
 */
export function strategicRoutePlan({
  ship = null,
  derived = null,
  engine = null,
  distanceHexes = 0,
  hexMultipliers = [],
  knownRoute = false,
  establishedCommercialRoute = false
} = {}) {
  const distance = Math.max(0, Math.trunc(Number(distanceHexes) || 0));
  const rate = strategicTravelRate({ ship, derived, engine });
  const costs = Array.from({ length: distance }, (_, index) => strategicHexCost(hexMultipliers[index] ?? 1));
  const weightedHexes = costs.reduce((sum, value) => sum + value, 0);
  const trader = specializationActive(ship, SHIP_SPECIALIZATIONS.TRADER) && knownRoute && establishedCommercialRoute;
  const timeMultiplier = trader ? 0.8 : 1;
  const rawDays = weightedHexes * rate.daysPerHex;
  const totalDays = rawDays * timeMultiplier;
  return Object.freeze({
    distanceHexes: distance,
    weightedHexes,
    engineTier: rate.tier,
    daysPerHex: rate.daysPerHex,
    hexesPerDay: rate.hexesPerDay,
    knownRoute: Boolean(knownRoute),
    establishedCommercialRoute: Boolean(establishedCommercialRoute),
    timeMultiplier,
    rawDays,
    totalDays,
    segments: Object.freeze(costs.map((multiplier, index) => Object.freeze({
      index,
      multiplier,
      days: multiplier * rate.daysPerHex * timeMultiplier
    })))
  });
}
