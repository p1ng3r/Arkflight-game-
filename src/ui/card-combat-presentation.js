// Presentation only: artwork never changes an ability's rules or availability.
const ROOT = "modules/arkflight-game/assets/";
export const STATION_PRESENTATION = Object.freeze([
  { id: "captain", name: "Captain", icon: "captain" },
  { id: "engineer", name: "Engineer", icon: "engineer" },
  { id: "navigator", name: "Navigator", icon: "navigator" },
  { id: "battlewatch", name: "Battlewatch", icon: "watchmaster" },
  { id: "veilwarden", name: "Veilwarden", icon: "veilwarden" }
].map(row => Object.freeze({ ...row, art: `${ROOT}ui/stations/station_icon_${row.icon}.webp` })));
const standard = name => `icons/ship-mods/standard/${name}.webp`;
const rare = name => `icons/ship-mods/rare/${name}.webp`;
const epic = name => `icons/ship-mods/epic/${name}.webp`;
const ART = Object.freeze({
  "rally-crew": standard("crew_muster_bell_network"),
  "issue-order": rare("battleline_signal_array"),
  "coordinate-assault": epic("fleet_command_concordance"),
  "vent-strain": standard("aether_vent_conduit"),
  "feed-the-guns": "icons/weapons/balanced_broadside_battery.webp",
  "redistribute-power": epic("aetheric_load_balancer"),
  "charted-course": standard("enchanted_compass"),
  "attack-vector": rare("precision_helm_relays"),
  "breakaway-vector": epic("battlewake_vector_vanes"),
  "acquire-target": standard("crystal_lens_optic"),
  "ready-broadside": "icons/weapons/broadside_cannon_battery.webp",
  "work-the-guns": standard("emergency_repair_lockers"),
  "mend-lifeveil": standard("expanded_lifeveil_array"),
  "healing-lifeveil": rare("veil_resonance_relay"),
  "reinforce-lifeveil": standard("veil_warded_bulkheads"),
  "drive-the-crew": epic("captains_war_command_net"),
  "brace-impact": standard("reinforced_hull_plating"),
  "evasive-maneuver": standard("gyroscopic_stabilizer"),
  "emergency-ward": standard("auxiliary_veil_capacitors"),
  "deflect-impact": rare("veil_harmonic_capacitors"),
  "hold-together": epic("emergency_reconstruction_bays"),
  "last-bastion": epic("veil_citadel_projector")
});
export function cardArt(card) {
  return ART[card.id] ? ROOT + ART[card.id] : STATION_PRESENTATION.find(s => s.id === (card.stations[0] ?? card.originStation))?.art;
}
export function resourceMeters(resources) {
  return ["hull", "lifeveil", "strain", "morale", "supplies"].map(id => {
    const resource = resources[id] ?? { value: 0, max: 0 };
    const percent = resource.max > 0 ? Math.max(0, Math.min(100, resource.value / resource.max * 100)) : 0;
    return { id, name: { hull: "Hull", lifeveil: "Lifeveil", strain: "Engine Strain", morale: "Morale", supplies: "Supplies" }[id], ...resource, percent, warning: id === "strain" ? percent >= 75 : percent <= 50 };
  });
}
