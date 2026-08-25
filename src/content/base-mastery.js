export const BASE_MASTERY = Object.freeze({
  captain: Object.freeze([
    Object.freeze({
      id: "captain-carry-the-deed",
      name: "Carry the Deed",
      description: "After a station succeeds on a Heroic/Risk Bid, choose another unresolved station. That station receives the same earned Heroic benefit without taking the original Risk increase.",
      timing: "after-heroic-success",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "copy-earned-heroic" })
    }),
    Object.freeze({
      id: "captain-set-the-pace",
      name: "Set the Pace",
      description: "When Round 1 planning begins, the crew starts the Event with +1 Momentum. This Mastery resolves automatically.",
      timing: "event-start",
      target: "none",
      effect: Object.freeze({ kind: "starting-momentum", value: 1 })
    }),
    Object.freeze({
      id: "captain-not-like-this",
      name: "Not Like This",
      description: "After a station rolls a Failure or Critical Failure, improve the result by one degree, to a maximum of Success.",
      timing: "after-failed-check",
      target: "latest-result",
      effect: Object.freeze({ kind: "improve-failed-result", value: 1, maximum: "success" })
    })
  ]),
  engineer: Object.freeze([
    Object.freeze({
      id: "engineer-redline-the-arkengine",
      name: "Redline the Arkengine",
      description: "Before an Engineer or Navigator check, improve its final degree of success by one step, up to Critical Success. After the check, the Arkengine gains 1 Pressure.",
      timing: "before-engineer-or-navigator-check",
      target: "engineer-or-navigator",
      effect: Object.freeze({ kind: "redline", degreeLift: 1, pressure: 1 })
    }),
    Object.freeze({
      id: "engineer-keep-her-breathing",
      name: "Keep Her Breathing",
      description: "When an Arkengine or ship system would become disabled, keep it operational through the end of the next station resolution before the disabling consequence takes hold.",
      timing: "system-disable",
      target: "ship-system",
      effect: Object.freeze({ kind: "delay-system-disable", stations: 1 })
    }),
    Object.freeze({
      id: "engineer-crosswire-the-systems",
      name: "Crosswire the Systems",
      description: "When a ship system would gain Pressure, redirect up to 2 of that Pressure to another ship system instead.",
      timing: "before-pressure",
      target: "pressure-redirect",
      effect: Object.freeze({ kind: "redirect-pressure", maximum: 2 })
    })
  ]),
  navigator: Object.freeze([
    Object.freeze({
      id: "navigator-impossible-passage",
      name: "Impossible Passage",
      description: "Choose one unresolved station. For this round it may ignore one active Hazard restriction or authored restriction that would block an Action or Heroic/Risk option.",
      timing: "planning-or-before-check",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "risk-override" })
    }),
    Object.freeze({
      id: "navigator-find-another-way",
      name: "Find Another Way",
      description: "After the plan is locked but before the chosen station rolls, reopen that station's Action, Skill, and Heroic/Risk choices for one final change.",
      timing: "after-plan-lock",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "reopen-station-plan" })
    }),
    Object.freeze({
      id: "navigator-read-the-current",
      name: "Read the Current",
      description: "After the round order is locked, move one unresolved station anywhere in the remaining resolution order.",
      timing: "after-plan-lock",
      target: "move-unresolved-station",
      effect: Object.freeze({ kind: "move-unresolved-station" })
    })
  ]),
  watchmaster: Object.freeze([
    Object.freeze({
      id: "watchmaster-call-the-true-opening",
      name: "Call the True Opening",
      description: "Before a Heroic/Risk check, reduce its Risk increase by one tier for this check: +2 becomes +0, +5 becomes +2, and +8 becomes +5. The original Heroic payoff is unchanged.",
      timing: "before-heroic-check",
      target: "active-station",
      effect: Object.freeze({ kind: "reduce-risk-tier" })
    }),
    Object.freeze({
      id: "watchmaster-nothing-surprises-me",
      name: "Nothing Surprises Me",
      description: "When a new Hazard or surprise complication is revealed after planning, the affected station may completely reselect its Action, Skill, and Heroic/Risk choice before rolling.",
      timing: "hazard-reveal",
      target: "affected-station",
      effect: Object.freeze({ kind: "reopen-station-plan" })
    }),
    Object.freeze({
      id: "watchmaster-exploit-the-break",
      name: "Exploit the Break",
      description: "After any station critically succeeds, choose one unresolved station and move it to the front of the remaining resolution order.",
      timing: "after-critical-success",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "move-next" })
    })
  ]),
  veilwarden: Object.freeze([
    Object.freeze({
      id: "veilwarden-stand-between",
      name: "Stand Between",
      description: "When Hull, Arkengine, or Rigging would gain Pressure from one source, redirect all of that Pressure to Lifeveil instead.",
      timing: "before-pressure",
      target: "pressure-source-system",
      effect: Object.freeze({ kind: "redirect-all-pressure", destination: "lifeveil" })
    }),
    Object.freeze({
      id: "veilwarden-seal-the-impossible",
      name: "Seal the Impossible",
      description: "When a Hazard would escalate, create a breach, or add another Hazard, cancel that escalation completely.",
      timing: "before-hazard-escalation",
      target: "none",
      effect: Object.freeze({ kind: "hazard-guard", value: 1 })
    }),
    Object.freeze({
      id: "veilwarden-sanctuary",
      name: "Sanctuary",
      description: "Before one unresolved station rolls, that station is treated as though no active Hazards affect its check or authored restrictions for that check.",
      timing: "before-check",
      target: "unresolved-station",
      effect: Object.freeze({ kind: "sanctuary" })
    })
  ])
});

export const BASE_MASTERY_LIST = Object.freeze(Object.values(BASE_MASTERY).flat());

export function getMasteryTechnique(stationId, masteryId) {
  return BASE_MASTERY[stationId]?.find((entry) => entry.id === masteryId) ?? null;
}
