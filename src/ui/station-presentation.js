const STATION_PRESENTATION = Object.freeze({
  captain: Object.freeze({
    displayName: "Captain",
    abbreviation: "CAP",
    iconClass: "fa-solid fa-ship",
    description: "Directs the crew, holds morale together, and turns a chaotic Event into a coordinated plan.",
    typicalSkills: Object.freeze(["Diplomacy", "Intimidation", "Performance", "Society"])
  }),
  engineer: Object.freeze({
    displayName: "Engineer",
    abbreviation: "ENG",
    iconClass: "fa-solid fa-gears",
    description: "Keeps the Arkengine and ship systems functioning under strain, damage, and impossible load.",
    typicalSkills: Object.freeze(["Crafting", "Arcana", "Thievery", "Engineering Lore"])
  }),
  navigator: Object.freeze({
    displayName: "Navigator",
    abbreviation: "NAV",
    iconClass: "fa-solid fa-compass",
    description: "Reads the route, controls the ship's line through danger, and finds passages other crews would miss.",
    typicalSkills: Object.freeze(["Survival", "Nature", "Society", "Sailing Lore"])
  }),
  battlewatch: Object.freeze({
    displayName: "Battlewatch",
    abbreviation: "BATTLE",
    iconClass: "fa-solid fa-crosshairs",
    description: "Tracks threats, calls openings, coordinates weapons, and protects the ship from tactical surprises.",
    typicalSkills: Object.freeze(["Perception", "Intimidation", "Athletics", "Warfare Lore"])
  }),
  veilwarden: Object.freeze({
    displayName: "Veilwarden",
    abbreviation: "VEIL",
    iconClass: "fa-solid fa-shield-halved",
    description: "Guards the Lifeveil and crew against supernatural hazards, breaches, and hostile forces beyond the hull.",
    typicalSkills: Object.freeze(["Religion", "Nature", "Occultism", "Arcana"])
  })
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
