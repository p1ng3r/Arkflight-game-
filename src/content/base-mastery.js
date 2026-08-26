const M = (entry) => Object.freeze(entry);

export const BASE_MASTERY = Object.freeze({
  captain: Object.freeze([
    M({ id: "captain-carry-the-deed", name: "Carry the Deed", triggerLabel: "After a station earns a Heroic payoff", description: "After a station succeeds on a Heroic/Risk Bid, choose another unresolved station. That station receives the same earned Heroic benefit without taking the original Risk increase.", timing: "after-heroic-success", target: "unresolved-station", effect: Object.freeze({ kind: "copy-earned-heroic" }) }),
    M({ id: "captain-set-the-pace", name: "Set the Pace", triggerLabel: "Automatically when Round 1 begins", description: "When Round 1 planning begins, the crew starts the Event with +1 Momentum. This Mastery resolves automatically.", timing: "event-start", target: "none", effect: Object.freeze({ kind: "starting-momentum", value: 1 }) }),
    M({ id: "captain-not-like-this", name: "Not Like This", triggerLabel: "After a Failure or Critical Failure", description: "After a station rolls a Failure or Critical Failure, improve the result by one degree, to a maximum of Success.", timing: "after-failed-check", target: "latest-result", effect: Object.freeze({ kind: "improve-failed-result", value: 1, maximum: "success" }) })
  ]),
  engineer: Object.freeze([
    M({ id: "engineer-redline-the-arkengine", name: "Redline the Arkengine", triggerLabel: "Before Engineer or Navigator rolls", description: "Before an Engineer or Navigator check, improve its final degree of success by one step, up to Critical Success. After the check, the ship gains 1 Strain with Arkengine as the threatened Area.", timing: "before-engineer-or-navigator-check", target: "engineer-or-navigator", effect: Object.freeze({ kind: "redline", degreeLift: 1, strain: 1, area: "arkengine" }) }),
    M({ id: "engineer-keep-her-breathing", name: "Keep Her Breathing", triggerLabel: "When a ship Area would become Disabled", description: "When an Arkflight Area would become Disabled, keep it operational through the end of the next station resolution before the disabling consequence takes hold.", timing: "area-disable", target: "ship-area", effect: Object.freeze({ kind: "delay-area-disable", stations: 1 }) }),
    M({ id: "engineer-crosswire-the-systems", name: "Crosswire the Systems", triggerLabel: "When Strain threatens a ship Area", description: "When one source would add Strain and threaten an Area, redirect that threatened Area to another eligible Area. The amount of global Strain does not change.", timing: "before-strain", target: "area-redirect", effect: Object.freeze({ kind: "redirect-threatened-area" }) })
  ]),
  navigator: Object.freeze([
    M({ id: "navigator-impossible-passage", name: "Impossible Passage", triggerLabel: "Before a station acts against an active Hazard", description: "Choose one unresolved station. For this round it may ignore one active Hazard restriction or authored restriction that would block an Action or Heroic/Risk option.", timing: "planning-or-before-check", target: "unresolved-station", effect: Object.freeze({ kind: "risk-override" }) }),
    M({ id: "navigator-find-another-way", name: "Find Another Way", triggerLabel: "Before an unresolved station rolls", description: "Before an unresolved station makes its PF2e check, choose that station. It gains +3 to the check.", timing: "before-check", target: "unresolved-station", effect: Object.freeze({ kind: "check-bonus", value: 3 }) }),
    M({ id: "navigator-read-the-current", name: "Read the Current", triggerLabel: "After the resolution order is locked", description: "After the round order is locked, move one unresolved station anywhere in the remaining resolution order.", timing: "after-plan-lock", target: "move-unresolved-station", effect: Object.freeze({ kind: "move-unresolved-station" }) })
  ]),
  battlewatch: Object.freeze([
    M({ id: "battlewatch-call-the-true-opening", name: "Call the True Opening", triggerLabel: "Before a station attempts a Heroic Bid", description: "Before a Heroic/Risk check, reduce its Risk increase by one tier for this check: +2 becomes +0, +5 becomes +2, and +8 becomes +5. The original Heroic payoff is unchanged.", timing: "before-heroic-check", target: "active-station", effect: Object.freeze({ kind: "reduce-risk-tier" }) }),
    M({ id: "battlewatch-nothing-surprises-me", name: "Nothing Surprises Me", triggerLabel: "When a new threat appears after planning", description: "When a new Hazard or surprise complication is revealed after planning, the affected station may completely reselect its Action, Skill, and Heroic/Risk choice before rolling.", timing: "hazard-reveal", target: "affected-station", effect: Object.freeze({ kind: "reopen-station-plan" }) }),
    M({ id: "battlewatch-exploit-the-break", name: "Exploit the Break", triggerLabel: "After any station critically succeeds", description: "After any station critically succeeds, choose one unresolved station and move it to the front of the remaining resolution order.", timing: "after-critical-success", target: "unresolved-station", effect: Object.freeze({ kind: "move-next" }) })
  ]),
  veilwarden: Object.freeze([
    M({ id: "veilwarden-stand-between", name: "Stand Between", triggerLabel: "When Strain threatens Hull, Arkengine, or Rigging", description: "When one source would add Strain and threaten Hull, Arkengine, or Rigging, redirect the threatened Area to Lifeveil instead. The amount of global Strain does not change.", timing: "before-strain", target: "threatened-area", effect: Object.freeze({ kind: "redirect-threatened-area", destination: "lifeveil" }) }),
    M({ id: "veilwarden-seal-the-impossible", name: "Seal the Impossible", triggerLabel: "When a Hazard would escalate or be created", description: "When a Hazard would escalate, create a breach, or add another Hazard, cancel that escalation completely.", timing: "before-hazard-escalation", target: "none", effect: Object.freeze({ kind: "hazard-guard", value: 1 }) }),
    M({ id: "veilwarden-sanctuary", name: "Sanctuary", triggerLabel: "Before a station rolls while Hazards are active", description: "Before one unresolved station rolls, that station is treated as though no active Hazards affect its check or authored restrictions for that check.", timing: "before-check", target: "unresolved-station", effect: Object.freeze({ kind: "sanctuary" }) })
  ])
});

const LEGACY_STATION = Object.freeze({ watchmaster: "battlewatch" });
const LEGACY_MASTERY_IDS = Object.freeze({
  "watchmaster-call-the-true-opening": "battlewatch-call-the-true-opening",
  "watchmaster-nothing-surprises-me": "battlewatch-nothing-surprises-me",
  "watchmaster-exploit-the-break": "battlewatch-exploit-the-break"
});

export function canonicalMasteryStation(stationId) { return LEGACY_STATION[stationId] ?? stationId; }
export function canonicalMasteryId(masteryId) { return LEGACY_MASTERY_IDS[masteryId] ?? masteryId; }

export const BASE_MASTERY_LIST = Object.freeze(Object.values(BASE_MASTERY).flat());
export const MASTERY_CATALOG = Object.freeze(Object.fromEntries(BASE_MASTERY_LIST.map((entry) => [entry.id, entry])));

export function getMasteryTechnique(stationId, masteryId) {
  const station = canonicalMasteryStation(stationId);
  const id = canonicalMasteryId(masteryId);
  return BASE_MASTERY[station]?.find((entry) => entry.id === id) ?? null;
}
