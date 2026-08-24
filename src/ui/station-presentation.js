const STATION_PRESENTATION = Object.freeze({
  captain: Object.freeze({ displayName: "Captain", abbreviation: "CAP", icon: "captain_icon.webp" }),
  engineer: Object.freeze({ displayName: "Engineer", abbreviation: "ENG", icon: "engineer_icon.webp" }),
  navigator: Object.freeze({ displayName: "Navigator", abbreviation: "NAV", icon: "navigator_icon.webp" }),
  watchmaster: Object.freeze({ displayName: "Watchmaster", abbreviation: "WATCH", icon: "watchmaster_icon.webp" }),
  veilwarden: Object.freeze({ displayName: "Veilwarden", abbreviation: "VEIL", icon: "veilwarden_icon.webp" })
});

export function stationPresentation(stationId) {
  const definition = STATION_PRESENTATION[stationId];
  if (!definition) return null;
  return {
    stationId,
    ...definition,
    iconPath: `modules/arkflight-game/assets/ui/stations/${definition.icon}`
  };
}

export const STATION_PRESENTATION_REGISTRY = STATION_PRESENTATION;
