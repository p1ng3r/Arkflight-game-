import { eventDefinition, roundDefinition, stationAction, skillChoice, riskBid } from "../../event/event-schema.js";
import { GLASSBACK_ROUND_DATA } from "./glassback-cinderwake-data.js";

export const GLASSBACK_HAZARDS = Object.freeze({
  "collapsing-spars": Object.freeze({
    id: "collapsing-spars",
    name: "Collapsing Spars",
    description: "Burning spars tumble through the route, forcing the crew to react before they close the lane.",
    effects: Object.freeze([
      { kind: "add-emergency-action", station: "watchmaster", actionId: "watchmaster.clear-the-fall" },
      { kind: "pressure-if-ignored", system: "hull", value: 1 }
    ])
  }),
  "ember-current": Object.freeze({
    id: "ember-current",
    name: "Ember Current",
    description: "A red current of furnace heat climbs the hull and pulls at the Lifeveil.",
    effects: Object.freeze([
      { kind: "dc-modifier", station: "veilwarden", value: 1 },
      { kind: "pressure-if-ignored", system: "lifeveil", value: 1 }
    ])
  }),
  "glassback-turn": Object.freeze({
    id: "glassback-turn",
    name: "Glassback Turn",
    description: "The leviathan rolls across the escape line and compresses the crew's timing to a few breaths.",
    effects: Object.freeze([
      { kind: "order-restriction", rule: "navigator-before-engineer" },
      { kind: "block-risk-tier", tier: 8, station: "captain" }
    ])
  })
});

const ROUND_OUTCOMES = Object.freeze([
  Object.freeze({
    extraordinary: "The crew clears a commanding lane through the wreck. Reduce 1 Hull Pressure if present and carry the clean opening into the next round.",
    "strong-success": "The ship clears the first spar field without gaining Pressure.",
    "mixed-success": "The ship clears the lane, but the crossing adds 1 Hull Pressure.",
    failure: "The lane collapses around the ship. Add 2 Hull Pressure and activate Collapsing Spars.",
    disaster: "The wreck catches the ship broadside. Add 2 Hull Pressure and 1 Rigging Pressure, then activate Collapsing Spars."
  }),
  Object.freeze({
    extraordinary: "The crew crosses the furnace current in perfect alignment. Reduce 1 Arkengine or Lifeveil Pressure and suppress Ember Current if active.",
    "strong-success": "The ship crosses the cinderwake without gaining Pressure.",
    "mixed-success": "The ship gains ground, but the Arkengine takes 1 Pressure.",
    failure: "The red current catches the ship. Add 1 Arkengine Pressure and 1 Lifeveil Pressure, then activate Ember Current.",
    disaster: "The furnace wake rolls across the vessel. Add 2 Arkengine Pressure and 1 Lifeveil Pressure, then activate Ember Current."
  }),
  Object.freeze({
    extraordinary: "The ship takes the blue seam at the perfect instant and bursts free of the Glassback's shadow. Reduce 1 Pressure from any system and mark the exceptional escape ending.",
    "strong-success": "The ship clears the wreck and escapes the Glassback's turn cleanly.",
    "mixed-success": "The ship escapes, but the final crossing adds 1 Hull or Lifeveil Pressure as authored by the event state.",
    failure: "The ship is forced through the seam late. Add 2 Pressure split between Hull and Lifeveil and activate Glassback Turn for the conclusion.",
    disaster: "The Glassback closes the seam around the ship. Add 2 Hull Pressure and 2 Lifeveil Pressure and mark the disaster ending."
  })
]);

function buildAction(station, roundNumber, raw) {
  const skills = raw.skills.map(([label, skill], index) => {
    const riskBids = index === 0 ? raw.risk.map((entry) => {
      const { t, b, ...parameters } = entry;
      return riskBid({
        tier: t,
        benefitId: b,
        parameters,
        narrativeHook: `${raw.name} is pushed beyond the safe line for a stronger crew payoff.`
      });
    }) : [];

    return skillChoice({
      id: `glassback-r${roundNumber}-${station}-${raw.id}-${skill}`,
      label,
      skill,
      dc: 18,
      riskBids
    });
  });

  return stationAction({
    id: `glassback-r${roundNumber}-${station}-${raw.id}`,
    station,
    name: raw.name,
    description: raw.desc,
    skills,
    consequences: {
      criticalSuccess: "Exceptional station result; use the action and event narrative hooks to make this a standout moment in the round vignette.",
      success: "The station achieves its immediate aim.",
      failure: "The station loses ground; no separate Risk Bid penalty is added.",
      criticalFailure: "The station creates a serious complication that must be reflected in the round vignette."
    },
    tags: ["glassback", `round-${roundNumber}`]
  });
}

const ROUNDS = GLASSBACK_ROUND_DATA.map((rawRound, index) => {
  const roundNumber = index + 1;
  const stationActions = Object.fromEntries(
    Object.entries(rawRound.actions).map(([station, actions]) => [
      station,
      Object.freeze(actions.map((action) => buildAction(station, roundNumber, action)))
    ])
  );

  const outcomes = Object.fromEntries(
    Object.entries(ROUND_OUTCOMES[index]).map(([band, narrative]) => [band, Object.freeze({ narrative })])
  );

  return roundDefinition({
    id: `glassback-round-${roundNumber}`,
    title: rawRound.title,
    situation: rawRound.situation,
    stationActions,
    outcomes,
    narrativeHooks: { theme: rawRound.title, targetSentences: 4 }
  });
});

export const GLASSBACK_CINDERWAKE = eventDefinition({
  id: "glassback-cinderwake",
  title: "The Glassback at Cinderwake Wreck",
  image: "assets/art/events/glassback-cinderwake.webp",
  openingVignette: "The black between worlds flashes red as a Glassback leviathan rolls through the skeleton of a shattered Arkflight wreck. Its passage tears loose ember-bright spars and furnace plates, dragging a burning wake directly across your course. The Lifeveil shivers as the first wave of heat and debris closes around the ship, while the Arkengine strains to answer the helm. Get through the wreck, survive the Glassback's cinderwake, and reach the blue seam beyond its final turn.",
  goal: "Survive the wreck, cross the cinderwake, and escape through the Glassback's final blue seam.",
  startingState: {
    momentum: 0,
    pressure: { hull: 0, arkengine: 0, lifeveil: 0, rigging: 0 },
    hazards: []
  },
  rounds: ROUNDS,
  endings: {
    extraordinaryEscape: { condition: "final-round-extraordinary", label: "Blue Seam Triumph" },
    escape: { condition: "final-round-at-least-mixed", label: "Clear of Cinderwake" },
    costlyEscape: { condition: "final-round-failure", label: "Scorched Escape" },
    disaster: { condition: "final-round-disaster", label: "Caught in the Glassback's Turn" }
  }
});
