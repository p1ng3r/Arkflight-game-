import { eventDefinition, roundDefinition, stationAction, skillChoice, riskBid } from "../../event/event-schema.js";
import { endingDefinition, rewardPackage } from "../../event/reward-engine.js";
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

const ROUND_OPENINGS = Object.freeze([
  "The first wall of the wreck comes apart ahead of you, a forest of black spars turning end over end through red fire. The Glassback's vast flank passes beyond them like a moving cliff, and every broken beam is dragged into its wake. The ship has only moments to choose a lane before the debris closes. Every station feels the same command in a different way: make the opening now, or be buried in it.",
  "The last of the wreck falls behind, but the space ahead is worse: a boiling river of cinders drawn into the Glassback's wake. Heat crawls over the hull, gravity twists sideways, and the Lifeveil flashes where ember currents strike it. The Arkengine answers with a rising metallic scream as the ship enters the red flow. There is no safe route through the Cinderwake now—only the line the crew can make together.",
  "Beyond the burning current, a narrow blue seam opens in the dark like a wound in the night. The Glassback begins its final roll beneath the wreckage, and its immense body is turning directly across that escape line. Broken spars, blue light, and the creature's shadow all converge on the same few seconds. The crew must commit everything to one final passage before the seam disappears behind the beast."
]);

const ROUND_IMAGES = Object.freeze([
  "",
  "assets/art/events/glassback-round-2-through-the-cinderwake.webp",
  ""
]);

const ROUND_OUTCOMES = Object.freeze([
  Object.freeze({
    extraordinary: Object.freeze({
      narrative: "The crew clears a commanding lane through the wreck. The hull sheds the worst of the impact as the ship carries a clean opening into the next round.",
      effects: Object.freeze([{ kind: "pressure", system: "hull", value: -1 }]),
      rewards: rewardPackage({ edgeCards: ["seize-the-gap"] })
    }),
    "strong-success": Object.freeze({ narrative: "The ship clears the first spar field without taking new system Pressure.", effects: Object.freeze([]) }),
    "mixed-success": Object.freeze({
      narrative: "The ship clears the lane, but burning wreckage hammers the hull and adds 1 Hull Pressure.",
      effects: Object.freeze([{ kind: "pressure", system: "hull", value: 1 }]),
      rewards: rewardPackage({ edgeCards: ["hold-together"] })
    }),
    failure: Object.freeze({ narrative: "The lane collapses around the ship. The hull takes 2 Pressure and Collapsing Spars remain in the crew's path.", effects: Object.freeze([{ kind: "pressure", system: "hull", value: 2 }, { kind: "hazard", hazardId: "collapsing-spars" }]) }),
    disaster: Object.freeze({ narrative: "The wreck catches the ship broadside. Hull Pressure rises by 2, Rigging Pressure rises by 1, and Collapsing Spars choke the route ahead.", effects: Object.freeze([{ kind: "pressure", system: "hull", value: 2 }, { kind: "pressure", system: "rigging", value: 1 }, { kind: "hazard", hazardId: "collapsing-spars" }]) })
  }),
  Object.freeze({
    extraordinary: Object.freeze({
      narrative: "The crew crosses the furnace current in perfect alignment, bleeding strain from the system under the greatest load and leaving the ember flow behind them.",
      effects: Object.freeze([{ kind: "reduce-highest-pressure", systems: ["arkengine", "lifeveil"], value: 1 }]),
      rewards: rewardPackage({ edgeCards: ["clear-opening"] })
    }),
    "strong-success": Object.freeze({ narrative: "The ship crosses the cinderwake without gaining new system Pressure.", effects: Object.freeze([]) }),
    "mixed-success": Object.freeze({
      narrative: "The ship gains ground, but the Arkengine takes 1 Pressure from the furnace crossing.",
      effects: Object.freeze([{ kind: "pressure", system: "arkengine", value: 1 }]),
      rewards: rewardPackage({ edgeCards: ["ride-the-momentum"] })
    }),
    failure: Object.freeze({ narrative: "The red current catches the ship. Arkengine and Lifeveil each take 1 Pressure and the Ember Current clings to the vessel.", effects: Object.freeze([{ kind: "pressure", system: "arkengine", value: 1 }, { kind: "pressure", system: "lifeveil", value: 1 }, { kind: "hazard", hazardId: "ember-current" }]) }),
    disaster: Object.freeze({ narrative: "The furnace wake rolls across the vessel. Arkengine Pressure rises by 2, Lifeveil Pressure rises by 1, and the Ember Current becomes an active threat.", effects: Object.freeze([{ kind: "pressure", system: "arkengine", value: 2 }, { kind: "pressure", system: "lifeveil", value: 1 }, { kind: "hazard", hazardId: "ember-current" }]) })
  }),
  Object.freeze({
    extraordinary: Object.freeze({
      narrative: "The ship takes the blue seam at the perfect instant and bursts free of the Glassback's shadow, shedding 1 Pressure from the system under the greatest strain.",
      effects: Object.freeze([{ kind: "reduce-highest-pressure", systems: ["hull", "arkengine", "lifeveil", "rigging"], value: 1 }]),
      rewards: rewardPackage({ edgeCards: ["second-chance"] })
    }),
    "strong-success": Object.freeze({ narrative: "The ship clears the wreck and escapes the Glassback's turn cleanly.", effects: Object.freeze([]) }),
    "mixed-success": Object.freeze({
      narrative: "The ship escapes, but the last violent crossing adds 1 Hull Pressure before the blue seam closes behind it.",
      effects: Object.freeze([{ kind: "pressure", system: "hull", value: 1 }]),
      rewards: rewardPackage({ edgeCards: ["clear-opening"] })
    }),
    failure: Object.freeze({ narrative: "The ship is forced through the seam late. Hull and Lifeveil each take 1 Pressure and the Glassback's final turn remains a dangerous complication through the escape.", effects: Object.freeze([{ kind: "pressure", system: "hull", value: 1 }, { kind: "pressure", system: "lifeveil", value: 1 }, { kind: "hazard", hazardId: "glassback-turn" }]) }),
    disaster: Object.freeze({ narrative: "The Glassback closes the seam around the ship. Hull and Lifeveil each take 2 Pressure as the vessel is caught in the monster's final turn.", effects: Object.freeze([{ kind: "pressure", system: "hull", value: 2 }, { kind: "pressure", system: "lifeveil", value: 2 }, { kind: "hazard", hazardId: "glassback-turn" }]) })
  })
]);

function buildAction(station, roundNumber, raw) {
  const skills = raw.skills.map(([label, skill], index) => {
    const riskBids = index === 0 ? raw.risk.map((entry) => {
      const { t, b, ...parameters } = entry;
      return riskBid({ tier: t, benefitId: b, parameters, narrativeHook: `${raw.name} is pushed beyond the safe line for a stronger crew payoff.` });
    }) : [];
    return skillChoice({ id: `glassback-r${roundNumber}-${station}-${raw.id}-${skill}`, label, skill, dc: 18, riskBids });
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
  const stationActions = Object.fromEntries(Object.entries(rawRound.actions).map(([station, actions]) => [station, Object.freeze(actions.map((action) => buildAction(station, roundNumber, action))) ]));
  return roundDefinition({
    id: `glassback-round-${roundNumber}`,
    title: rawRound.title,
    situation: rawRound.situation,
    openingVignette: ROUND_OPENINGS[index],
    image: ROUND_IMAGES[index],
    stationActions,
    outcomes: ROUND_OUTCOMES[index],
    narrativeHooks: { theme: rawRound.title, targetSentences: 4 }
  });
});

export const GLASSBACK_CINDERWAKE = eventDefinition({
  id: "glassback-cinderwake",
  title: "The Glassback at Cinderwake Wreck",
  image: "assets/art/events/glassback-cinderwake.webp",
  openingVignette: "The black between worlds flashes red as a Glassback leviathan rolls through the skeleton of a shattered Arkflight wreck. Its passage tears loose ember-bright spars and furnace plates, dragging a burning wake directly across your course. The Lifeveil shivers as the first wave of heat and debris closes around the ship, while the Arkengine strains to answer the helm. Get through the wreck, survive the Glassback's cinderwake, and reach the blue seam beyond its final turn.",
  goal: "Survive the wreck, cross the cinderwake, and escape through the Glassback's final blue seam.",
  startingState: { momentum: 0, pressure: { hull: 0, arkengine: 0, lifeveil: 0, rigging: 0 }, hazards: [] },
  rounds: ROUNDS,
  endings: {
    extraordinaryEscape: endingDefinition({
      id: "glassback-extraordinary",
      bands: ["extraordinary"],
      label: "Blue Seam Triumph",
      vignette: "The blue seam opens at exactly the right heartbeat, and the ship drives through it before the Glassback can finish its turn. Fire and black wreckage vanish behind a curtain of cold sapphire light as the Arkengine catches cleanly and the Lifeveil settles around the hull. For several breaths there is only the fading thunder of the leviathan somewhere beyond the seam. The crew has not merely escaped Cinderwake Wreck—they have stolen the passage from the beast itself.",
      rewards: rewardPackage({
        gold: 25,
        salvage: [{ name: "Glassback Wake Shard", valueGp: 40, description: "A fused shard of black glassy scale and aether-burned wreck metal recovered during the escape." }],
        routeKnowledge: [{ name: "Cinderwake Blue-Seam Timing", description: "The crew now knows how to read the brief blue seams that form behind a Glassback's turn." }],
        edgeCards: ["protect-the-system"]
      })
    }),
    escape: endingDefinition({
      id: "glassback-escape",
      bands: ["strong-success", "mixed-success"],
      label: "Clear of Cinderwake",
      vignette: "The ship punches through the narrowing blue seam with the Cinderwake still clawing at its stern. Behind you, the Glassback rolls through the wreckage and disappears into a storm of embers and shattered spars. The vessel bears the marks of the crossing, but the Arkengine keeps its rhythm and the Lifeveil holds. Cinderwake Wreck falls away into the dark, and for the first time since the leviathan appeared, the crew has room to breathe.",
      rewards: rewardPackage({
        gold: 15,
        salvage: [{ name: "Scorched Wreck Salvage", valueGp: 20, description: "Recoverable brass, fittings, and aether-hardened fragments pulled clear during the escape." }],
        routeKnowledge: [{ name: "Cinderwake Passage Notes", description: "A rough but useful record of currents, hazards, and timing around the wreck." }]
      })
    }),
    costlyEscape: endingDefinition({
      id: "glassback-costly",
      bands: ["failure"],
      label: "Scorched Escape",
      vignette: "The blue seam begins to collapse before the ship is fully through, forcing the crew to tear the vessel across the threshold under brutal strain. The Glassback's shadow fills the burning wreck behind you as the last edge of the seam snaps shut. Warning bells and groaning timbers answer the silence on the far side, proof that the escape extracted its price. You are alive and clear of the beast, but the ship carries Cinderwake with it in scorched metal, strained veilwork, and damaged hull.",
      rewards: rewardPackage({
        salvage: [{ name: "Damaged Cinderwake Salvage", valueGp: 8, description: "A small amount of battered material that survived the crossing." }]
      })
    }),
    disaster: endingDefinition({
      id: "glassback-disaster",
      bands: ["disaster"],
      label: "Caught in the Glassback's Turn",
      vignette: "The Glassback reaches the blue seam at the same instant as the ship, and the world becomes fire, scale, and fractured light. The vessel is thrown through the collapsing passage with systems screaming and wreckage hammering against the Lifeveil. When the darkness finally steadies, the leviathan is gone from sight—but the silence aboard is filled with the sound of damage settling through the hull. The crew escaped Cinderwake Wreck by the narrowest possible margin, and the ship will remember the crossing long after the embers fade.",
      rewards: rewardPackage()
    })
  }
});
