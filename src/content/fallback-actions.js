import { stationAction, skillChoice } from "../event/event-schema.js";

export const FALLBACK_ACTIONS = Object.freeze({
  captain: stationAction({
    id: "captain.coordinate-crew",
    station: "captain",
    name: "Coordinate the Crew",
    description: "Read the crisis, call priorities, and keep the bridge moving as one crew.",
    skills: [
      skillChoice({ id: "captain.coordinate.diplomacy", label: "Rally Them", skill: "diplomacy", dc: 18 }),
      skillChoice({ id: "captain.coordinate.intimidation", label: "Drive Them", skill: "intimidation", dc: 18 })
    ],
    tags: ["fallback", "command", "teamwork"]
  }),
  engineer: stationAction({
    id: "engineer.stabilize-systems",
    station: "engineer",
    name: "Stabilize Systems",
    description: "Keep the Arkengine and ship systems inside safe operating limits while the crisis unfolds.",
    skills: [
      skillChoice({ id: "engineer.stabilize.crafting", label: "Mechanical Control", skill: "crafting", dc: 18 }),
      skillChoice({ id: "engineer.stabilize.arcana", label: "Aetheric Control", skill: "arcana", dc: 18 })
    ],
    tags: ["fallback", "arkengine", "pressure"]
  }),
  navigator: stationAction({
    id: "navigator.correct-course",
    station: "navigator",
    name: "Correct Course",
    description: "Find the safest viable line through the immediate danger and keep the ship on it.",
    skills: [
      skillChoice({ id: "navigator.correct.survival", label: "Read the Route", skill: "survival", dc: 18 }),
      skillChoice({ id: "navigator.correct.nature", label: "Read the Tides", skill: "nature", dc: 18 })
    ],
    tags: ["fallback", "navigation", "helm"]
  }),
  watchmaster: stationAction({
    id: "watchmaster.scan-threats",
    station: "watchmaster",
    name: "Scan for Threats",
    description: "Track the most immediate danger and feed the crew the warning they need before it becomes a disaster.",
    skills: [
      skillChoice({ id: "watchmaster.scan.perception", label: "Keep Watch", skill: "perception", dc: 18 }),
      skillChoice({ id: "watchmaster.scan.society", label: "Read Tactics", skill: "society", dc: 18 })
    ],
    tags: ["fallback", "detection", "hazard"]
  }),
  veilwarden: stationAction({
    id: "veilwarden.reinforce-veil",
    station: "veilwarden",
    name: "Reinforce the Veil",
    description: "Steady the Lifeveil and keep hostile aetheric forces from reaching the crew.",
    skills: [
      skillChoice({ id: "veilwarden.reinforce.religion", label: "Sacred Ward", skill: "religion", dc: 18 }),
      skillChoice({ id: "veilwarden.reinforce.occultism", label: "Aetheric Ward", skill: "occultism", dc: 18 })
    ],
    tags: ["fallback", "lifeveil", "defense"]
  })
});
