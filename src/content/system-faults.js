// d12 tables. Effects are passive: acquiring a fault never deals more damage.
const rows = {
  hull: [
    ["loose-bracing", "Loose Bracing", { hardness: -1 }],
    ["sheared-plating", "Sheared Plating", { armorClass: -1 }],
    ["buckled-deck", "Buckled Deck", { battlewatch: -1, maneuverability: -1 }],
    ["jolted-gun-mounts", "Jolted Gun Mounts", { weaponAttackBonus: -1 }],
    ["cracked-keel", "Cracked Keel", { combatSpeed: -1, hullSave: -1 }],
    ["jammed-ammunition-hoist", "Jammed Ammunition Hoist", { reloadPenalty: 1 }],
    ["splintered-lookout", "Splintered Lookout", { detection: -1, battlewatch: -1 }],
    ["exposed-magazine", "Exposed Magazine", { armorClass: -1, weaponAttackBonus: -1 }],
    ["twisted-battery-rails", "Twisted Battery Rails", { weaponAttackBonus: -1, reloadPenalty: 1 }],
    ["strained-bulkheads", "Strained Bulkheads", { hardness: -1, hullSave: -1 }],
    ["shifting-ballast", "Shifting Ballast", { maneuverability: -1, battlewatch: -1 }],
    ["structural-resonance", "Structural Resonance", { hullSave: -2 }]
  ],
  drive: [
    ["torn-sails", "Torn Sails", { combatSpeed: -1 }],
    ["jammed-rudder", "Jammed Rudder", { maneuverability: -1 }],
    ["snagged-rigging", "Snagged Rigging", { navigator: -1 }],
    ["compass-drift", "Compass Drift", { detection: -1, navigator: -1 }],
    ["steering-vibration", "Steering Vibration", { driveSave: -1, maneuverability: -1 }],
    ["dragging-spars", "Dragging Spars", { combatSpeed: -1, armorClass: -1 }],
    ["slipping-helm-linkage", "Slipping Helm Linkage", { navigator: -1, driveSave: -1 }],
    ["unbalanced-sail-plan", "Unbalanced Sail Plan", { combatSpeed: -1, maneuverability: -1 }],
    ["blind-approach", "Blind Approach", { detection: -2 }],
    ["yawing-platform", "Yawing Platform", { weaponAttackBonus: -1, navigator: -1 }],
    ["exposed-running-gear", "Exposed Running Gear", { armorClass: -1, driveSave: -1 }],
    ["tension-collapse", "Tension Collapse", { driveSave: -2 }]
  ],
  arkengine: [
    ["leaking-pressure", "Leaking Pressure", { strainCapacity: -1 }],
    ["fouled-regulator", "Fouled Regulator", { engineer: -1 }],
    ["cracked-conduit", "Cracked Conduit", { arkengineSave: -1 }],
    ["power-fluctuation", "Power Fluctuation", { weaponAttackBonus: -1, engineer: -1 }],
    ["weak-thrust-feed", "Weak Thrust Feed", { combatSpeed: -1 }],
    ["misaligned-coils", "Misaligned Coils", { arkengineSave: -1, strainCapacity: -1 }],
    ["scorched-workshop", "Scorched Workshop", { repairCheckBonus: -1, engineer: -1 }],
    ["unstable-distribution", "Unstable Distribution", { maneuverability: -1, engineer: -1 }],
    ["dimming-sensors", "Dimming Sensors", { detection: -1, arkengineSave: -1 }],
    ["containment-vibration", "Containment Vibration", { lifeveilSave: -1, arkengineSave: -1 }],
    ["jammed-service-panels", "Jammed Service Panels", { repairCheckBonus: -2 }],
    ["resonance-desynchronization", "Resonance Desynchronization", { arkengineSave: -2 }]
  ],
  lifeveil: [
    ["flickering-envelope", "Flickering Envelope", { armorClass: -1 }],
    ["broken-ward-focus", "Broken Ward Focus", { veilwarden: -1 }],
    ["containment-leak", "Containment Leak", { lifeveilSave: -1 }],
    ["clouded-veil", "Clouded Veil", { detection: -1 }],
    ["thin-protective-lattice", "Thin Protective Lattice", { hardness: -1 }],
    ["fractured-ritual-circle", "Fractured Ritual Circle", { veilwarden: -1, lifeveilSave: -1 }],
    ["aetheric-interference", "Aetheric Interference", { engineer: -1, veilwarden: -1 }],
    ["distorted-viewports", "Distorted Viewports", { detection: -1, weaponAttackBonus: -1 }],
    ["uneven-ward-pressure", "Uneven Ward Pressure", { armorClass: -1, lifeveilSave: -1 }],
    ["damaged-life-support-controls", "Damaged Life-support Controls", { repairCheckBonus: -1, veilwarden: -1 }],
    ["prismatic-feedback", "Prismatic Feedback", { lifeveilSave: -1, arkengineSave: -1 }],
    ["failing-containment-seals", "Failing Containment Seals", { lifeveilSave: -2 }]
  ],
  morale: [
    ["shaken-command", "Shaken Command", { captain: -1 }],
    ["fraying-discipline", "Fraying Discipline", { moraleSave: -1 }],
    ["hesitant-gun-crews", "Hesitant Gun Crews", { weaponAttackBonus: -1 }],
    ["conflicting-orders", "Conflicting Orders", { captain: -1, navigator: -1 }],
    ["distracted-lookouts", "Distracted Lookouts", { detection: -1 }],
    ["rushed-maintenance", "Rushed Maintenance", { repairCheckBonus: -1, engineer: -1 }],
    ["unsteady-ritual-crew", "Unsteady Ritual Crew", { veilwarden: -1 }],
    ["ammunition-confusion", "Ammunition Confusion", { reloadPenalty: 1 }],
    ["loss-of-confidence", "Loss of Confidence", { captain: -1, moraleSave: -1 }],
    ["missed-signals", "Missed Signals", { battlewatch: -1, navigator: -1 }],
    ["isolated-officers", "Isolated Officers", { allStationBonus: -1 }],
    ["crew-panic", "Crew Panic", { moraleSave: -2 }]
  ]
};
export const SYSTEM_FAULT_TABLES = Object.freeze(Object.fromEntries(Object.entries(rows).map(([system, entries]) => [system,
  Object.freeze(entries.map(([slug, name, effects], index) => Object.freeze({ id: `${system}:${slug}`, system, roll: index + 1, name, effects: Object.freeze(effects) })))
])));
export const SYSTEM_FAULTS = Object.freeze(Object.fromEntries(Object.values(SYSTEM_FAULT_TABLES).flat().map(f => [f.id, f])));
const labels = { hardness: "Hardness", armorClass: "AC", weaponAttackBonus: "weapon attacks", combatSpeed: "Speed", maneuverability: "Maneuver", detection: "Detection", strainCapacity: "Strain limit", reloadPenalty: "reload rounds", repairCheckBonus: "repair checks", allStationBonus: "station checks" };
export function faultDescription(fault) {
  return Object.entries(fault.effects).map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${labels[key] ?? (key.endsWith("Save") ? `${key.slice(0, -4)} saves` : `${key} checks`)}`).join("; ");
}
