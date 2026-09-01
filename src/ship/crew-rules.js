import { STATION_KEYS } from "./ship-schema.js";

function nonNegativeInteger(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

export function crewOperatingCount({ officers = 0, crewHands = 0, specialists = 0 } = {}) {
  return nonNegativeInteger(officers) + nonNegativeInteger(crewHands) + nonNegativeInteger(specialists);
}

export function totalPersonsAboard({ officers = 0, crewHands = 0, specialists = 0, passengers = 0 } = {}) {
  return crewOperatingCount({ officers, crewHands, specialists }) + nonNegativeInteger(passengers);
}

export function crewStaffingPenalty({ operatingCrew = 0, minimum = 0, totalAboard = operatingCrew, maximum = 0 } = {}) {
  const operating = nonNegativeInteger(operatingCrew);
  const min = nonNegativeInteger(minimum);
  const aboard = nonNegativeInteger(totalAboard);
  const max = nonNegativeInteger(maximum);

  const underMinimumBy = Math.max(0, min - operating);
  const overMaximumBy = max > 0 ? Math.max(0, aboard - max) : 0;
  const missingOrExcess = underMinimumBy + overMaximumBy;
  const penalty = missingOrExcess > 0 ? -missingOrExcess : 0;

  return Object.freeze({
    operatingCrew: operating,
    totalAboard: aboard,
    minimum: min,
    maximum: max,
    underMinimumBy,
    overMaximumBy,
    circumstancePenalty: penalty,
    operatingNormally: underMinimumBy === 0,
    overcrowded: overMaximumBy > 0
  });
}

export function stationAssignmentState(stations = {}) {
  const result = {};
  for (const station of STATION_KEYS) {
    const assignee = stations?.[station] ?? null;
    result[station] = Object.freeze({
      station,
      assignee,
      staffed: Boolean(assignee),
      normalActionsAvailable: Boolean(assignee)
    });
  }
  return Object.freeze(result);
}

export function canUseStationAction(stations, station, { substituteAuthorized = false } = {}) {
  if (!STATION_KEYS.includes(station)) return false;
  if (stations?.[station]) return true;
  return Boolean(substituteAuthorized);
}
