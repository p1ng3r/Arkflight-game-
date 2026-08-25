const STATION_PRESENTATION = Object.freeze({
  captain: Object.freeze({ displayName: "Captain", abbreviation: "CAP", iconClass: "fa-solid fa-ship" }),
  engineer: Object.freeze({ displayName: "Engineer", abbreviation: "ENG", iconClass: "fa-solid fa-gears" }),
  navigator: Object.freeze({ displayName: "Navigator", abbreviation: "NAV", iconClass: "fa-solid fa-compass" }),
  watchmaster: Object.freeze({ displayName: "Watchmaster", abbreviation: "WATCH", iconClass: "fa-solid fa-eye" }),
  veilwarden: Object.freeze({ displayName: "Veilwarden", abbreviation: "VEIL", iconClass: "fa-solid fa-shield-halved" })
});

export function stationPresentation(stationId) {
  const definition = STATION_PRESENTATION[stationId];
  if (!definition) return null;
  return {
    stationId,
    ...definition
  };
}

export const STATION_PRESENTATION_REGISTRY = STATION_PRESENTATION;
