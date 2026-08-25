export const CREW_EDGE_HAND_MAX = 3;

function edgeCard({ id, name, trigger, effect, tags = [], rarity = "standard" }) {
  if (!id || !name || !trigger || !effect) throw new Error("Crew Edge card requires id, name, trigger, and effect");
  return Object.freeze({ id, name, trigger, effect, tags: Object.freeze([...tags]), rarity });
}

export const CREW_EDGE_CARDS = Object.freeze({
  "hold-together": edgeCard({
    id: "hold-together",
    name: "Hold Together",
    trigger: "When a ship system would gain Pressure.",
    effect: "Reduce that Pressure gain by 1.",
    tags: ["pressure", "defense"]
  }),
  "clear-opening": edgeCard({
    id: "clear-opening",
    name: "Clear Opening",
    trigger: "Before an unresolved station makes its PF2e check.",
    effect: "Reduce that station's final DC by 2.",
    tags: ["dc", "station-aid"]
  }),
  "ride-the-momentum": edgeCard({
    id: "ride-the-momentum",
    name: "Ride the Momentum",
    trigger: "After a station succeeds, before the next station resolves.",
    effect: "The next station gains a +2 Arkflight modifier to its PF2e check.",
    tags: ["momentum", "station-aid"]
  }),
  "second-chance": edgeCard({
    id: "second-chance",
    name: "Second Chance",
    trigger: "After a station fails or critically fails, before that result is finalized.",
    effect: "Reroll the check and use the new result.",
    tags: ["reroll", "recovery"],
    rarity: "rare"
  }),
  "change-of-course": edgeCard({
    id: "change-of-course",
    name: "Change of Course",
    trigger: "During crew planning before the GM locks the plan.",
    effect: "Move one station anywhere in the resolution order.",
    tags: ["planning", "order"]
  }),
  "not-yet": edgeCard({
    id: "not-yet",
    name: "Not Yet",
    trigger: "When a Hazard would activate or apply its consequence.",
    effect: "Suppress that Hazard until the end of the current round.",
    tags: ["hazard", "defense"],
    rarity: "rare"
  }),
  "brace-for-it": edgeCard({
    id: "brace-for-it",
    name: "Brace for It",
    trigger: "When a round consequence would add Pressure to two or more systems.",
    effect: "Choose one affected system; it gains no Pressure from that consequence.",
    tags: ["pressure", "round-consequence"]
  }),
  "one-more-push": edgeCard({
    id: "one-more-push",
    name: "One More Push",
    trigger: "Before an unresolved station rolls while Crew Momentum is 2 or 3.",
    effect: "Spend 1 Momentum to give that station +3 to its PF2e check.",
    tags: ["momentum", "station-aid"],
    rarity: "rare"
  }),
  "steady-hands": edgeCard({
    id: "steady-hands",
    name: "Steady Hands",
    trigger: "Before an unresolved station makes a Heroic / Risk check.",
    effect: "Reduce only the Risk Bid portion of that check's DC by 2, to a minimum Risk increase of 0.",
    tags: ["heroic", "dc"]
  }),
  "seize-the-gap": edgeCard({
    id: "seize-the-gap",
    name: "Seize the Gap",
    trigger: "After a station critically succeeds.",
    effect: "Immediately gain 1 Momentum, up to the normal maximum of 3.",
    tags: ["momentum", "critical-success"]
  }),
  "protect-the-system": edgeCard({
    id: "protect-the-system",
    name: "Protect the System",
    trigger: "When Hull, Arkengine, Lifeveil, or Rigging Pressure would increase.",
    effect: "Choose that system. Prevent up to 2 Pressure from this single source.",
    tags: ["pressure", "defense"],
    rarity: "rare"
  }),
  "crew-instinct": edgeCard({
    id: "crew-instinct",
    name: "Crew Instinct",
    trigger: "After the GM reveals a new round opening vignette but before planning begins.",
    effect: "The crew may freely reorder all five stations before the planning timer starts.",
    tags: ["planning", "order", "information"]
  })
});

export const CREW_EDGE_CARD_LIST = Object.freeze(Object.values(CREW_EDGE_CARDS));

export function getCrewEdgeCard(id) {
  return CREW_EDGE_CARDS[id] ?? null;
}
