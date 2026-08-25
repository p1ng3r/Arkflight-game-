export const BASE_SIGNATURES = Object.freeze({
  captain: Object.freeze([
    Object.freeze({
      id: "captain-commanding-moment",
      name: "Commanding Moment",
      description: "Once this encounter, after any station resolves, choose one unresolved station. It gains +2 to its check.",
      timing: "after-station",
      effect: Object.freeze({ kind: "bonus-unresolved-station", value: 2 })
    })
  ]),
  engineer: Object.freeze([
    Object.freeze({
      id: "engineer-emergency-vent",
      name: "Emergency Vent",
      description: "Once this encounter, vent the Arkengine and reduce Arkengine Pressure by 2.",
      timing: "any",
      effect: Object.freeze({ kind: "reduce-pressure", system: "arkengine", value: 2 })
    })
  ]),
  navigator: Object.freeze([
    Object.freeze({
      id: "navigator-perfect-line",
      name: "Perfect Line",
      description: "Once this encounter, before an unresolved station rolls, reduce that station's final DC by 2.",
      timing: "before-station",
      effect: Object.freeze({ kind: "reduce-station-dc", value: 2 })
    })
  ]),
  watchmaster: Object.freeze([
    Object.freeze({
      id: "watchmaster-saw-it-coming",
      name: "Saw It Coming",
      description: "Once this encounter, suppress one active Hazard for the rest of the round.",
      timing: "any",
      effect: Object.freeze({ kind: "suppress-hazard-round" })
    })
  ]),
  veilwarden: Object.freeze([
    Object.freeze({
      id: "veilwarden-aegis-of-the-veil",
      name: "Aegis of the Veil",
      description: "Once this encounter, prevent the next 2 Lifeveil Pressure that would be gained this round.",
      timing: "any",
      effect: Object.freeze({ kind: "pressure-guard", system: "lifeveil", value: 2 })
    })
  ])
});
