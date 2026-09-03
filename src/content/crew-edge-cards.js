export const CREW_EDGE_HAND_MAX = 3;
export const CREW_TACTIC_THEATERS = Object.freeze(["planning", "resolution", "event-result"]);

function edgeCard({ id, name, theater, trigger, effect, tags = [], rarity = "standard" }) {
  if (!id || !name || !trigger || !effect) throw new Error("Crew Tactic requires id, name, trigger, and effect");
  if (!CREW_TACTIC_THEATERS.includes(theater)) throw new Error(`Crew Tactic ${id} requires a valid theater`);
  return Object.freeze({ id, name, theater, trigger, effect, tags: Object.freeze([...tags]), rarity });
}

export const CREW_EDGE_CARDS = Object.freeze({
  "all-hands-together": edgeCard({
    id: "all-hands-together",
    name: "All Hands Together",
    theater: "planning",
    trigger: "During crew planning before the GM locks the plan.",
    effect: "Every station gains +1 to its PF2e check for this round.",
    tags: ["planning", "round", "check-bonus"]
  }),
  "clear-the-way": edgeCard({
    id: "clear-the-way",
    name: "Clear the Way",
    theater: "planning",
    trigger: "During crew planning before the GM locks the plan.",
    effect: "Reduce every station's final DC by 1 for this round.",
    tags: ["planning", "round", "dc"]
  }),
  "change-of-course": edgeCard({
    id: "change-of-course",
    name: "Change of Course",
    theater: "planning",
    trigger: "During crew planning before the GM locks the plan.",
    effect: "Move one station anywhere in the resolution order.",
    tags: ["planning", "order"]
  }),
  "crew-instinct": edgeCard({
    id: "crew-instinct",
    name: "Crew Instinct",
    theater: "planning",
    trigger: "After the GM reveals a new round opening vignette but before planning begins.",
    effect: "The crew may freely reorder all five stations before the planning timer starts.",
    tags: ["planning", "order", "information"]
  }),
  "clear-opening": edgeCard({
    id: "clear-opening",
    name: "Clear Opening",
    theater: "resolution",
    trigger: "Before an unresolved station makes its PF2e check.",
    effect: "Reduce that station's final DC by 2.",
    tags: ["resolution", "dc", "station-aid"]
  }),
  "ride-the-momentum": edgeCard({
    id: "ride-the-momentum",
    name: "Ride the Momentum",
    theater: "resolution",
    trigger: "After a station succeeds, before the next station resolves.",
    effect: "The next station gains a +2 Arkflight modifier to its PF2e check.",
    tags: ["resolution", "momentum", "station-aid"]
  }),
  "second-chance": edgeCard({
    id: "second-chance",
    name: "Second Chance",
    theater: "resolution",
    trigger: "After a station fails or critically fails, before that result is finalized.",
    effect: "Reroll the check and use the new result.",
    tags: ["resolution", "reroll", "recovery"],
    rarity: "rare"
  }),
  "take-the-better-line": edgeCard({
    id: "take-the-better-line",
    name: "Take the Better Line",
    theater: "resolution",
    trigger: "Before an unresolved station makes its PF2e check.",
    effect: "Roll the station check twice and keep the better result.",
    tags: ["resolution", "fortune", "station-aid"],
    rarity: "rare"
  }),
  "measured-gamble": edgeCard({
    id: "measured-gamble",
    name: "Measured Gamble",
    theater: "resolution",
    trigger: "Before an unresolved station rolls with a Heroic / Risk Bid selected.",
    effect: "Step the Heroic Bid DC down one tier while preserving the originally selected Heroic reward tier.",
    tags: ["resolution", "heroic", "dc"],
    rarity: "rare"
  }),
  "hold-together": edgeCard({
    id: "hold-together",
    name: "Hold Together",
    theater: "resolution",
    trigger: "Before the current round applies Strain to the ship.",
    effect: "Prevent 1 Strain from the next round consequence.",
    tags: ["resolution", "strain", "defense"]
  }),
  "not-yet": edgeCard({
    id: "not-yet",
    name: "Not Yet",
    theater: "resolution",
    trigger: "When a Hazard would activate or apply its consequence.",
    effect: "Suppress that Hazard until the end of the current round.",
    tags: ["resolution", "hazard", "defense"],
    rarity: "rare"
  }),
  "brace-for-it": edgeCard({
    id: "brace-for-it",
    name: "Brace for It",
    theater: "resolution",
    trigger: "Before a round consequence would add Strain to two or more ship Areas.",
    effect: "Choose one affected Area; it gains no Strain from that consequence.",
    tags: ["resolution", "strain", "round-consequence"]
  }),
  "one-more-push": edgeCard({
    id: "one-more-push",
    name: "One More Push",
    theater: "resolution",
    trigger: "Before an unresolved station rolls while Crew Momentum is at least 1.",
    effect: "Spend 1 Momentum to give that station +3 to its PF2e check.",
    tags: ["resolution", "momentum", "station-aid"],
    rarity: "rare"
  }),
  "steady-hands": edgeCard({
    id: "steady-hands",
    name: "Steady Hands",
    theater: "resolution",
    trigger: "Before an unresolved station makes a Heroic / Risk check.",
    effect: "Reduce only the Risk Bid portion of that check's DC by 2.",
    tags: ["resolution", "heroic", "dc"]
  }),
  "seize-the-gap": edgeCard({
    id: "seize-the-gap",
    name: "Seize the Gap",
    theater: "resolution",
    trigger: "After a station critically succeeds.",
    effect: "Immediately gain 1 Momentum, up to the normal maximum of 3.",
    tags: ["resolution", "momentum", "critical-success"]
  }),
  "protect-the-system": edgeCard({
    id: "protect-the-system",
    name: "Protect the System",
    theater: "resolution",
    trigger: "When Hull, Arkengine, Lifeveil, or Rigging would gain Strain.",
    effect: "Choose that Area. Prevent up to 2 Strain from this single source.",
    tags: ["resolution", "strain", "defense"],
    rarity: "rare"
  }),
  "refuse-the-ending": edgeCard({
    id: "refuse-the-ending",
    name: "Refuse the Ending",
    theater: "event-result",
    trigger: "After the final round is scored, before the Event Result is finalized.",
    effect: "If the Event Result is Critical Failure or Failure, improve it by one step.",
    tags: ["event-result", "recovery", "outcome"],
    rarity: "rare"
  })
});

export const CREW_EDGE_CARD_LIST = Object.freeze(Object.values(CREW_EDGE_CARDS));

export function getCrewEdgeCard(id) {
  return CREW_EDGE_CARDS[id] ?? null;
}
