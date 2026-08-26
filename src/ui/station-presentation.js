const STATION_PRESENTATION = Object.freeze({
  captain: Object.freeze({ displayName: "Captain", abbreviation: "CAP", iconClass: "fa-solid fa-ship" }),
  engineer: Object.freeze({ displayName: "Engineer", abbreviation: "ENG", iconClass: "fa-solid fa-gears" }),
  navigator: Object.freeze({ displayName: "Navigator", abbreviation: "NAV", iconClass: "fa-solid fa-compass" }),
  battlewatch: Object.freeze({ displayName: "Battlewatch", abbreviation: "BATTLE", iconClass: "fa-solid fa-crosshairs" }),
  veilwarden: Object.freeze({ displayName: "Veilwarden", abbreviation: "VEIL", iconClass: "fa-solid fa-shield-halved" })
});

export function stationPresentation(stationId) {
  const canonicalId = stationId === "watchmaster" ? "battlewatch" : stationId;
  const definition = STATION_PRESENTATION[canonicalId];
  if (!definition) return null;
  return {
    stationId: canonicalId,
    ...definition
  };
}

export const STATION_PRESENTATION_REGISTRY = STATION_PRESENTATION;
