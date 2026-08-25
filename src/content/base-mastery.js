export const BASE_MASTERY = Object.freeze({
  captain: Object.freeze([
    Object.freeze({
      id: "captain-commanding-moment",
      name: "Commanding Moment",
      description: "Choose one unresolved station. It gains +2 to its next PF2e check.",
      timing: "round",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "check-bonus", value: 2 })
    }),
    Object.freeze({
      id: "captain-hold-the-crew-together",
      name: "Hold the Crew Together",
      description: "For this round, reduce the next Momentum loss from the round result by 1.",
      timing: "round",
      target: "none",
      effect: Object.freeze({ kind: "momentum-loss-guard", value: 1 })
    }),
    Object.freeze({
      id: "captain-change-the-plan",
      name: "Change the Plan",
      description: "Swap the resolution positions of any two unresolved stations.",
      timing: "planning-or-resolution",
      target: "two-unresolved-stations",
      effect: Object.freeze({ kind: "swap-unresolved-stations" })
    })
  ]),
  engineer: Object.freeze([
    Object.freeze({
      id: "engineer-emergency-vent",
      name: "Emergency Vent",
      description: "Bleed off 2 Arkengine Pressure, to a minimum of 0.",
      timing: "round",
      target: "none",
      effect: Object.freeze({ kind: "reduce-pressure", system: "arkengine", value: 2 })
    }),
    Object.freeze({
      id: "engineer-overburn-the-core",
      name: "Overburn the Core",
      description: "Choose an unresolved Engineer or Navigator station. It gains +3 to its next PF2e check; immediately add 1 Arkengine Pressure.",
      timing: "round",
      target: "engineer-or-navigator",
      effect: Object.freeze({ kind: "overburn", value: 3, pressure: 1 })
    }),
    Object.freeze({
      id: "engineer-impossible-restart",
      name: "Impossible Restart",
      description: "Suppress one active Hazard for the rest of the current round.",
      timing: "round",
      target: "active-hazard",
      effect: Object.freeze({ kind: "suppress-hazard-round" })
    })
  ]),
  navigator: Object.freeze([
    Object.freeze({
      id: "navigator-perfect-line",
      name: "Perfect Line",
      description: "Choose one unresolved station. Reduce its final DC by 2.",
      timing: "round",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "dc-adjustment", value: -2 })
    }),
    Object.freeze({
      id: "navigator-read-the-way-ahead",
      name: "Read the Way Ahead",
      description: "Preview the next round's opening situation before the crew reaches it.",
      timing: "round",
      target: "none",
      effect: Object.freeze({ kind: "preview-next-round" })
    }),
    Object.freeze({
      id: "navigator-impossible-course",
      name: "Impossible Course",
      description: "Choose one unresolved station. It ignores one authored Heroic/Risk restriction for the rest of this round.",
      timing: "planning-or-resolution",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "risk-override" })
    })
  ]),
  watchmaster: Object.freeze([
    Object.freeze({
      id: "watchmaster-saw-it-coming",
      name: "Saw It Coming",
      description: "Suppress one active Hazard for the rest of the current round.",
      timing: "round",
      target: "active-hazard",
      effect: Object.freeze({ kind: "suppress-hazard-round" })
    }),
    Object.freeze({
      id: "watchmaster-call-the-opening",
      name: "Call the Opening",
      description: "While a Hazard is active, choose one unresolved station. It gains +2 to its next PF2e check.",
      timing: "round",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "hazard-check-bonus", value: 2 })
    }),
    Object.freeze({
      id: "watchmaster-nothing-gets-past-me",
      name: "Nothing Gets Past Me",
      description: "Read every active threat and give one unresolved station +1 to its next PF2e check.",
      timing: "round",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "reveal-and-aid", value: 1 })
    })
  ]),
  veilwarden: Object.freeze([
    Object.freeze({
      id: "veilwarden-aegis-of-the-veil",
      name: "Aegis of the Veil",
      description: "Prevent the next 2 Lifeveil Pressure gained during this round.",
      timing: "round",
      target: "none",
      effect: Object.freeze({ kind: "pressure-guard", system: "lifeveil", value: 2 })
    }),
    Object.freeze({
      id: "veilwarden-shelter-the-crew",
      name: "Shelter the Crew",
      description: "Choose one unresolved station. It ignores one Hazard penalty and gains +1 to its next PF2e check.",
      timing: "round",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "hazard-shelter", value: 1 })
    }),
    Object.freeze({
      id: "veilwarden-seal-the-breach",
      name: "Seal the Breach",
      description: "Prevent the next Hazard that would be added by this round's consequence.",
      timing: "round",
      target: "none",
      effect: Object.freeze({ kind: "hazard-guard", value: 1 })
    })
  ])
});

export const BASE_MASTERY_LIST = Object.freeze(Object.values(BASE_MASTERY).flat());

export function getMasteryTechnique(stationId, masteryId) {
  return BASE_MASTERY[stationId]?.find((entry) => entry.id === masteryId) ?? null;
}
