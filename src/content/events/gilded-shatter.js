import { eventDefinition, roundDefinition, stationAction, skillChoice, riskBid } from "../../event/event-schema.js";
import { endingDefinition, rewardPackage } from "../../event/reward-engine.js";
import { GILDED_SHATTER_ROUND_DATA } from "./gilded-shatter-data.js";

const GILDED_SHATTER_OPENING_IMAGE = "assets/art/events/gilded-shatter/scenes/01-boarding/opening-gilded-shatter.webp";
const GILDED_SHATTER_FINAL_IMAGE = "assets/art/events/gilded-shatter/scenes/01-boarding/Final-gilded-shatter.webp";

export const GILDED_SHATTER_BLUEPRINT_TABLE = Object.freeze([
  Object.freeze({ id: "aether-bound-ribbing", name: "Aether-Bound Ribbing", rarity: "rare" }),
  Object.freeze({ id: "stormproof-void-sails", name: "Stormproof Void Sails", rarity: "rare" }),
  Object.freeze({ id: "battlewatch-scrying-crown", name: "Battlewatch Scrying Crown", rarity: "rare" }),
  Object.freeze({ id: "salvage-winch-clusters", name: "Salvage Winch Clusters", rarity: "rare" }),
  Object.freeze({ id: "battlewake-control-fins", name: "Battlewake Control Fins", rarity: "rare" })
]);

export const GILDED_SHATTER_DEEP_SALVAGE_OPTIONS = Object.freeze([
  Object.freeze({ id: "salvage-winch-clusters-component", name: "Intact Salvage Winch Clusters", kind: "ship-component", catalogId: "salvage-winch-clusters", description: "Recover the intact rare salvage-winching assembly as a physical mod component ready for refit." }),
  Object.freeze({ id: "veil-resonance-relay-component", name: "Veil Resonance Relay Assembly", kind: "ship-component", catalogId: "veil-resonance-relay", description: "Recover a rare Lifeveil relay assembly as a physical mod component ready for refit." }),
  Object.freeze({ id: "battlewake-control-fins-blueprint", name: "Battlewake Control Fins Blueprint", kind: "blueprint", catalogId: "battlewake-control-fins", description: "Take a second rare blueprint instead of a physical component." })
]);

export const GILDED_SHATTER_HAZARDS = Object.freeze({
  "gravity-shear": Object.freeze({ id: "gravity-shear", name: "Gravity Shear", description: "The Dark Star pulls the two ships along different vectors, turning every connection between them into a loaded weapon.", effects: Object.freeze([{ kind: "dc-modifier", station: "navigator", value: 1 }, { kind: "strain-if-ignored", value: 1 }]) }),
  "gilded-mass": Object.freeze({ id: "gilded-mass", name: "Gilded Mass", description: "Freshly transmuted gold changes the wreck's weight and balance faster than the crew can safely account for it.", effects: Object.freeze([{ kind: "dc-modifier", station: "battlewatch", value: 1 }, { kind: "strain-if-ignored", value: 1 }]) }),
  "core-resonance": Object.freeze({ id: "core-resonance", name: "Core Resonance", description: "The ruptured Arkengine answers the Dark Star with violent aetheric pulses that threaten both vessels.", effects: Object.freeze([{ kind: "dc-modifier", station: "engineer", value: 1 }, { kind: "strain-if-ignored", value: 1 }]) }),
  "collapsing-decks": Object.freeze({ id: "collapsing-decks", name: "Collapsing Decks", description: "The altered wreck is becoming too heavy for its own frame and whole compartments are folding toward the gravity maw.", effects: Object.freeze([{ kind: "dc-modifier", station: "battlewatch", value: 1 }, { kind: "strain-if-ignored", value: 1 }]) }),
  "salvage-overload": Object.freeze({ id: "salvage-overload", name: "Salvage Overload", description: "The crew stayed too long or carried too much; the final escape begins with extra mass, strained lines, and less room to maneuver.", effects: Object.freeze([{ kind: "dc-modifier", station: "navigator", value: 1 }, { kind: "dc-modifier", station: "engineer", value: 1 }, { kind: "strain-if-ignored", value: 1 }]) })
});

function roundOutcome(narrative, effects = []) {
  return Object.freeze({ narrative, effects: Object.freeze(effects) });
}

const ROUND_OUTCOMES = Object.freeze([
  Object.freeze({
    extraordinary: roundOutcome("The Rum Runner finds the quiet pocket cleanly and enters the wreck's drift with power in reserve. Reduce 1 Strain.", [{ kind: "gain-strain", value: -1 }]),
    "strong-success": roundOutcome("The approach closes cleanly and the ship reaches the edge of the debris field without new Strain."),
    "mixed-success": roundOutcome("The crew gets close, but the first unstable drift loads the ship and adds 1 Strain.", [{ kind: "gain-strain", value: 1 }]),
    failure: roundOutcome("The approach survives a bad vector change. The ship gains 1 Strain and the Lifeveil loses 5 percentage points to flying transformed debris.", [{ kind: "gain-strain", value: 1 }, { kind: "damage-lifeveil", value: 5 }]),
    disaster: roundOutcome("The Rum Runner is dragged through the debris field before the helm can recover. The ship gains 2 Strain and the Lifeveil loses 10 percentage points, but the crew still reaches boarding distance.", [{ kind: "gain-strain", value: 2 }, { kind: "damage-lifeveil", value: 10 }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The crew turns the Gravity Shear into a matching vector and the two ships move together for several precious breaths. Reduce 1 Strain.", [{ kind: "gain-strain", value: -1 }]),
    "strong-success": roundOutcome("The Rum Runner matches the wreck's motion and holds a usable boarding side without new Strain."),
    "mixed-success": roundOutcome("The ships align, but the correction loads the vessel and adds 1 Strain.", [{ kind: "gain-strain", value: 1 }]),
    failure: roundOutcome("The crew forces the ships back onto one vector after the gap begins to open. The Rum Runner gains 2 Strain, but the boarding window remains alive.", [{ kind: "gain-strain", value: 2 }]),
    disaster: roundOutcome("The Dark Star yanks the ships onto competing lines and the Rum Runner must wrench itself back into position. The ship gains 2 Strain and the Lifeveil loses 10 percentage points, but the approach is not abandoned.", [{ kind: "gain-strain", value: 2 }, { kind: "damage-lifeveil", value: 10 }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The grapnels bite, the crossing steadies, and every PC reaches the weather-deck breach before the next pulse arrives. Reduce 1 Strain and leave the Rum Runner in an unusually stable holding position.", [{ kind: "gain-strain", value: -1 }]),
    "strong-success": roundOutcome("The boarding corridor holds and the PCs cross onto the wreck with a secure marked return line."),
    "mixed-success": roundOutcome("The PCs make the crossing, but the loaded lines hammer the Rum Runner and add 1 Strain before the party gets clear.", [{ kind: "gain-strain", value: 1 }]),
    failure: roundOutcome("The crossing becomes a scramble across bucking boards and snapping guide ropes. The PCs still reach the wreck, while the Rum Runner gains 2 Strain and must hold a less stable return position.", [{ kind: "gain-strain", value: 2 }]),
    disaster: roundOutcome("The corridor nearly tears apart during the crossing, forcing the party through the nearest viable breach as the Rum Runner fights to keep station. The PCs are aboard, but the ship gains 3 Strain and the Lifeveil loses 15 percentage points.", [{ kind: "gain-strain", value: 3 }, { kind: "damage-lifeveil", value: 15 }])
  })
]);

const BASE_DC = 22;

function buildAction(station, roundNumber, raw) {
  const skills = raw.skills.map(([label, skill], index) => {
    const riskBids = index === 0 ? raw.risk.map((entry) => {
      const { t, b, ...parameters } = entry;
      return riskBid({
        tier: t,
        benefitId: b,
        parameters,
        narrativeHook: `${raw.name} is pushed into a Heroic line: +${t} DC for a stronger authored payoff.`
      });
    }) : [];
    return skillChoice({ id: `gilded-r${roundNumber}-${station}-${raw.id}-${skill}`, label, skill, dc: BASE_DC, riskBids });
  });
  return stationAction({
    id: `gilded-r${roundNumber}-${station}-${raw.id}`,
    station,
    name: raw.name,
    description: raw.desc,
    skills,
    consequences: {
      criticalSuccess: "The station creates a clean opening that should materially improve the boarding sequence.",
      success: "The station accomplishes its immediate job and keeps the boarding attempt moving.",
      failure: "The station loses ground, but boarding continues and the cost should be visible in the round result.",
      criticalFailure: "The station creates a serious complication; boarding still continues, but the cost must be obvious in the fiction."
    },
    tags: ["gilded-shatter", "boarding-leg", `round-${roundNumber}`]
  });
}

const ROUNDS = GILDED_SHATTER_ROUND_DATA.map((rawRound, index) => {
  const roundNumber = index + 1;
  const stationActions = Object.fromEntries(
    Object.entries(rawRound.actions).map(([station, actions]) => [
      station,
      Object.freeze(actions.map((action) => buildAction(station, roundNumber, action)))
    ])
  );
  const hazardStage = ["Unstable Drift", "Competing Vectors", "Loaded Boarding Lines"][index];
  return roundDefinition({
    id: `gilded-shatter-round-${roundNumber}`,
    title: rawRound.title,
    situation: rawRound.situation,
    openingVignette: rawRound.opening,
    image: GILDED_SHATTER_OPENING_IMAGE,
    stationActions,
    outcomes: ROUND_OUTCOMES[index],
    narrativeHooks: {
      theme: rawRound.title,
      targetSentences: 4,
      maximumSentences: 4,
      hazardId: "gravity-shear",
      hazardStage,
      mysteryTruth: "The gold on the wreck is actively spreading, and every blue-white Dark Star pulse is involved somehow."
    }
  });
});

const SECURED_RETURN_CORRIDOR = Object.freeze({
  id: "gilded-shatter-secured-return-corridor",
  name: "Secured Return Corridor",
  description: "The boarding lines, marked return point, and Rum Runner holding position are stable enough that the first return crossing during wreck exploration is treated as secure unless the fiction materially changes."
});

const WEATHER_DECK_SHORTCUT = Object.freeze({
  id: "gilded-shatter-weather-deck-shortcut",
  name: "Weather-Deck Shortcut",
  description: "The boarding party enters through a stable weather-deck breach with a clear route inward. The GM reveals one useful nearby access point, stair, or structural shortcut when exploration begins."
});

function boardingRewards({ secureReturn = false, shortcut = false } = {}) {
  return rewardPackage({
    boons: [
      ...(secureReturn ? [SECURED_RETURN_CORRIDOR] : []),
      ...(shortcut ? [WEATHER_DECK_SHORTCUT] : [])
    ]
  });
}

export const GILDED_SHATTER = eventDefinition({
  id: "gilded-shatter",
  title: "The Gilded Shatter — Board the Wreck",
  image: GILDED_SHATTER_OPENING_IMAGE,
  openingVignette: "A dead Arkflight galleon turns slowly at the edge of a Dark Star, its broken hull bending toward the gravity maw. Fresh gold is spreading through timber, iron, rope, and bone while blue-white pulses flicker somewhere deep below decks. Before anyone can learn why, the Rum Runner has to cross a drifting debris field and hold alongside a wreck whose mass is changing by the minute. Get close, survive the Gravity Shear, establish the boarding corridor, and put the party physically onto the derelict.",
  goal: "Bring the Rum Runner alongside the gilded wreck, survive the escalating Gravity Shear, establish a stable boarding corridor, and get the PCs physically aboard for normal PF2e exploration.",
  startingState: { momentum: 0, hazards: ["gravity-shear"] },
  rounds: ROUNDS,
  endings: {
    extraordinary: endingDefinition({
      id: "gilded-shatter-boarding-extraordinary",
      image: GILDED_SHATTER_FINAL_IMAGE,
      bands: ["criticalSuccess", "extraordinary"],
      label: "Boarding Established — Perfect Foothold",
      vignette: "The final grapnel bites and the crossing settles into an impossible moment of calm. One by one the party steps onto the wreck through a stable weather-deck breach while the Rum Runner holds almost motionless beside it. As the last PC clears the line, a blue-white pulse moves beneath the deck and thin golden branches creep farther across the planks in plain sight. The return corridor is marked, a useful route inward is already visible, and Arkflight ship play gives way to normal PF2e exploration.",
      rewards: boardingRewards({ secureReturn: true, shortcut: true })
    }),
    success: endingDefinition({
      id: "gilded-shatter-boarding-success",
      image: GILDED_SHATTER_FINAL_IMAGE,
      bands: ["success", "strong-success", "mixed-success"],
      label: "Boarding Established — Secure Foothold",
      vignette: "The lines groan but hold long enough for the party to cross onto the dead galleon. Behind them, the Rum Runner settles into a workable holding position with a clearly marked return point at the weather-deck breach. Then a blue-white pulse climbs through the wreck and fresh gold spreads across a nearby hinge before anyone's eyes. The boarding event is complete, and normal PF2e exploration begins with a secure route back to the ship.",
      rewards: boardingRewards({ secureReturn: true })
    }),
    costly: endingDefinition({
      id: "gilded-shatter-boarding-costly",
      image: GILDED_SHATTER_FINAL_IMAGE,
      bands: ["failure"],
      label: "Boarding Established — Exposed Foothold",
      vignette: "The crossing never becomes comfortable, but the party makes it across before the lines can tear free. They land through an exposed breach where broken railings, loose debris, and the wreck's slow rotation leave the return route harder to use than anyone wanted. The Rum Runner remains alongside under load while another blue-white pulse passes below and new gold crawls across the deck around the party's boots. Boarding has succeeded at a price; normal PF2e exploration begins from a dangerous foothold.",
      rewards: boardingRewards()
    }),
    disaster: endingDefinition({
      id: "gilded-shatter-boarding-disaster",
      image: GILDED_SHATTER_FINAL_IMAGE,
      bands: ["criticalFailure", "disaster"],
      label: "Boarding Established — Bad Crossing",
      vignette: "The final Dark Star pull hits while people are still on the boards, snapping a guide line and wrenching the Rum Runner away from the wreck. The party is forced through the nearest viable split in the derelict before the crew can haul the remaining crossing back under control. Behind them the Rum Runner is still there, but holding station is ugly and the return route is neither short nor safe. A blue-white pulse rolls through the lower decks, fresh gold flowers across the broken timber, and normal PF2e exploration begins with the crew already knowing that getting back will be harder than getting in.",
      rewards: boardingRewards()
    })
  }
});
