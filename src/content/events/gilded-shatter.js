import { eventDefinition, roundDefinition, stationAction, skillChoice, riskBid } from "../../event/event-schema.js";
import { endingDefinition, rewardPackage } from "../../event/reward-engine.js";
import { GILDED_SHATTER_ROUND_DATA } from "./gilded-shatter-data.js";

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
  "gravity-shear": Object.freeze({ id: "gravity-shear", name: "Gravity Shear", description: "The Dark Star pulls the two ships along different vectors, turning every connection between them into a loaded weapon.", effects: Object.freeze([{ kind: "dc-modifier", station: "navigator", value: 1 }, { kind: "strain-if-ignored", area: "rigging", value: 1 }]) }),
  "gilded-mass": Object.freeze({ id: "gilded-mass", name: "Gilded Mass", description: "Freshly transmuted gold changes the wreck's weight and balance faster than the crew can safely account for it.", effects: Object.freeze([{ kind: "dc-modifier", station: "battlewatch", value: 1 }, { kind: "strain-if-ignored", area: "hull", value: 1 }]) }),
  "core-resonance": Object.freeze({ id: "core-resonance", name: "Core Resonance", description: "The ruptured Arkengine answers the Dark Star with violent aetheric pulses that threaten both vessels.", effects: Object.freeze([{ kind: "dc-modifier", station: "engineer", value: 1 }, { kind: "strain-if-ignored", area: "arkengine", value: 1 }]) }),
  "collapsing-decks": Object.freeze({ id: "collapsing-decks", name: "Collapsing Decks", description: "The altered wreck is becoming too heavy for its own frame and whole compartments are folding toward the gravity maw.", effects: Object.freeze([{ kind: "dc-modifier", station: "battlewatch", value: 1 }, { kind: "strain-if-ignored", area: "hull", value: 1 }]) }),
  "salvage-overload": Object.freeze({ id: "salvage-overload", name: "Salvage Overload", description: "The crew stayed too long or carried too much; the final escape begins with extra mass, strained lines, and less room to maneuver.", effects: Object.freeze([{ kind: "dc-modifier", station: "navigator", value: 1 }, { kind: "dc-modifier", station: "engineer", value: 1 }, { kind: "strain-if-ignored", area: "rigging", value: 1 }]) })
});

function roundOutcome(narrative, effects = [], rewards = undefined) {
  return Object.freeze({ narrative, effects: Object.freeze(effects), ...(rewards ? { rewards } : {}) });
}

const ROUND_OUTCOMES = Object.freeze([
  Object.freeze({
    extraordinary: roundOutcome("The ship settles into the wreck's quiet pocket with room to spare, and the crew reads the Dark Star's first pull before it can bite. No new Strain is gained.", [], rewardPackage({ edgeCards: ["seize-the-gap"] })),
    "strong-success": roundOutcome("The approach holds cleanly, leaving the ship stable enough to begin boarding without new Strain."),
    "mixed-success": roundOutcome("The crew reaches the wreck, but the first gravity shear loads the rigging and adds 1 Strain to it.", [{ kind: "gain-strain", area: "rigging", value: 1 }]),
    failure: roundOutcome("The approach becomes a wrestling match with the Dark Star; Rigging gains 1 Strain and Gravity Shear becomes active.", [{ kind: "gain-strain", area: "rigging", value: 1 }, { kind: "hazard", hazardId: "gravity-shear" }]),
    disaster: roundOutcome("The ships lurch across one another's vectors and the boarding approach nearly tears free. Rigging gains 2 Strain, Hull gains 1 Strain, and Gravity Shear becomes active.", [{ kind: "gain-strain", area: "rigging", value: 2 }, { kind: "gain-strain", area: "hull", value: 1 }, { kind: "hazard", hazardId: "gravity-shear" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The two vessels move as one through the next gravity pulse, giving the boarders an almost impossible moment of calm. Reduce 1 Strain from the ship.", [{ kind: "gain-strain", value: -1 }], rewardPackage({ edgeCards: ["clear-opening"] })),
    "strong-success": roundOutcome("The boarding corridor stabilizes and the salvage team establishes a safe staging deck without new Strain."),
    "mixed-success": roundOutcome("The lines hold, but the wreck's changing mass wrenches the home ship and adds 1 Hull Strain.", [{ kind: "gain-strain", area: "hull", value: 1 }]),
    failure: roundOutcome("The boarding deck shifts under the crew. Hull gains 1 Strain and Gilded Mass becomes an active hazard.", [{ kind: "gain-strain", area: "hull", value: 1 }, { kind: "hazard", hazardId: "gilded-mass" }]),
    disaster: roundOutcome("The derelict rolls hard against the boarding lines and a transformed deck section tears loose. Hull and Rigging each gain 1 Strain, and Gilded Mass remains active.", [{ kind: "gain-strain", area: "hull", value: 1 }, { kind: "gain-strain", area: "rigging", value: 1 }, { kind: "hazard", hazardId: "gilded-mass" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The crew traces the spreading gold all the way to its hidden source and understands the timing of the transformation before opening the lower decks. Gain a Tactic and reduce 1 Lifeveil Strain.", [{ kind: "gain-strain", area: "lifeveil", value: -1 }], rewardPackage({ edgeCards: ["protect-the-system"] })),
    "strong-success": roundOutcome("The crew proves the gold is fresh transmutation and follows its pattern toward the engine spaces without new Strain."),
    "mixed-success": roundOutcome("The mystery gives way, but a transmutation pulse washes over the salvage team and adds 1 Lifeveil Strain.", [{ kind: "gain-strain", area: "lifeveil", value: 1 }]),
    failure: roundOutcome("The crew finds the path below only after the next pulse catches them. Lifeveil gains 1 Strain and Core Resonance begins to bleed through the wreck.", [{ kind: "gain-strain", area: "lifeveil", value: 1 }, { kind: "hazard", hazardId: "core-resonance" }]),
    disaster: roundOutcome("The lower deck opens during a violent transmutation pulse and the wreck answers like a struck bell. Lifeveil and Arkengine each gain 1 Strain, and Core Resonance becomes active.", [{ kind: "gain-strain", area: "lifeveil", value: 1 }, { kind: "gain-strain", area: "arkengine", value: 1 }, { kind: "hazard", hazardId: "core-resonance" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The crew masters the engine room long enough to isolate the ruptured core from the worst of the Dark Star's resonance. Reduce 1 Arkengine Strain and carry a clean salvage window forward.", [{ kind: "gain-strain", area: "arkengine", value: -1 }], rewardPackage({ edgeCards: ["second-chance"] })),
    "strong-success": roundOutcome("The ruptured Arkengine is understood and temporarily contained, opening the deep salvage spaces without new Strain."),
    "mixed-success": roundOutcome("The core is contained just long enough, but the effort drives 1 Strain into the Arkengine.", [{ kind: "gain-strain", area: "arkengine", value: 1 }]),
    failure: roundOutcome("The engine chamber begins to fold around the crew. Arkengine gains 1 Strain and Collapsing Decks become active.", [{ kind: "gain-strain", area: "arkengine", value: 1 }, { kind: "hazard", hazardId: "collapsing-decks" }]),
    disaster: roundOutcome("The cracked core surges against the Dark Star and the engine room starts coming apart. Arkengine gains 2 Strain, Hull gains 1 Strain, and Collapsing Decks become active.", [{ kind: "gain-strain", area: "arkengine", value: 2 }, { kind: "gain-strain", area: "hull", value: 1 }, { kind: "hazard", hazardId: "collapsing-decks" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The rare blueprint, the rune strongbox, and the chosen deep-salvage target all reach the boarding deck with time still on the clock. The crew banks the win without new Strain.", [], rewardPackage({ edgeCards: ["ride-the-momentum"] })),
    "strong-success": roundOutcome("The guaranteed blueprint and chosen deep salvage are secured cleanly, along with the rune strongbox."),
    "mixed-success": roundOutcome("The salvage is secured, but moving it through the failing wreck adds 1 Rigging Strain.", [{ kind: "gain-strain", area: "rigging", value: 1 }]),
    failure: roundOutcome("The crew gets the prizes out, but the wreck begins collapsing around the return route. Rigging gains 1 Strain and Collapsing Decks remain active.", [{ kind: "gain-strain", area: "rigging", value: 1 }, { kind: "hazard", hazardId: "collapsing-decks" }]),
    disaster: roundOutcome("The deep salvage comes free at the worst possible moment, dragging crew and gear through a collapsing compartment. Hull and Rigging each gain 1 Strain, and Collapsing Decks remain active.", [{ kind: "gain-strain", area: "hull", value: 1 }, { kind: "gain-strain", area: "rigging", value: 1 }, { kind: "hazard", hazardId: "collapsing-decks" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The crew steals extra value from the dying wreck and still reaches the boarding lines in disciplined order. Any Heroic greed commitment still carries its authored cost into the escape.", [], rewardPackage({ aetherScrap: 2 })),
    "strong-success": roundOutcome("The final salvage decision is carried out without losing control of the retreat, though any chosen Heroic greed commitment still follows the crew into Round 7."),
    "mixed-success": roundOutcome("The last haul costs precious seconds and adds 1 Rigging Strain before the ships separate.", [{ kind: "gain-strain", area: "rigging", value: 1 }]),
    failure: roundOutcome("The crew stays too long. Rigging gains 1 Strain and Salvage Overload becomes active for the escape.", [{ kind: "gain-strain", area: "rigging", value: 1 }, { kind: "hazard", hazardId: "salvage-overload" }]),
    disaster: roundOutcome("Greed turns the retreat into a scramble. Rigging gains 2 Strain, Hull gains 1 Strain, and Salvage Overload becomes active before the final breakaway.", [{ kind: "gain-strain", area: "rigging", value: 2 }, { kind: "gain-strain", area: "hull", value: 1 }, { kind: "hazard", hazardId: "salvage-overload" }])
  }),
  Object.freeze({
    extraordinary: roundOutcome("The ship catches the Dark Star's own pull and turns it into speed, breaking free with the salvage secured and the crew in command. Reduce 1 Strain from the ship.", [{ kind: "gain-strain", value: -1 }]),
    "strong-success": roundOutcome("The vessel clears the collapsing wreck and escapes the gravity maw with its recovered prizes intact."),
    "mixed-success": roundOutcome("The ship escapes with everything important aboard, but the final gravity shear adds 1 Hull Strain.", [{ kind: "gain-strain", area: "hull", value: 1 }]),
    failure: roundOutcome("The ship tears free late and carries the cost with it. Hull and Arkengine each gain 1 Strain before the Dark Star finally falls behind.", [{ kind: "gain-strain", area: "hull", value: 1 }, { kind: "gain-strain", area: "arkengine", value: 1 }]),
    disaster: roundOutcome("The wreck collapses across the escape line and the ship survives only by forcing itself through the debris under brutal load. Hull gains 2 Strain and Arkengine and Lifeveil each gain 1 Strain.", [{ kind: "gain-strain", area: "hull", value: 2 }, { kind: "gain-strain", area: "arkengine", value: 1 }, { kind: "gain-strain", area: "lifeveil", value: 1 }])
  })
]);

const BASE_DC = 22;

function buildAction(station, roundNumber, raw) {
  const skills = raw.skills.map(([label, skill], index) => {
    const riskBids = index === 0 ? raw.risk.map((entry) => {
      const { t, b, ...parameters } = entry;
      return riskBid({ tier: t, benefitId: b, parameters, narrativeHook: `${raw.name} is pushed into a Heroic line: +${t} DC for a stronger authored payoff.` });
    }) : [];
    return skillChoice({ id: `gilded-r${roundNumber}-${station}-${raw.id}-${skill}`, label, skill, dc: BASE_DC, riskBids });
  });
  return stationAction({ id: `gilded-r${roundNumber}-${station}-${raw.id}`, station, name: raw.name, description: raw.desc, skills, consequences: { criticalSuccess: "The station exceeds its immediate objective and should receive an exceptional beat in the round-end vignette.", success: "The station achieves its immediate objective.", failure: "The station loses ground and the miss should shape the round-end vignette.", criticalFailure: "The station creates a serious complication that must be visible in the round-end vignette." }, tags: ["gilded-shatter", `round-${roundNumber}`] });
}

const ROUNDS = GILDED_SHATTER_ROUND_DATA.map((rawRound, index) => {
  const roundNumber = index + 1;
  const stationActions = Object.fromEntries(Object.entries(rawRound.actions).map(([station, actions]) => [station, Object.freeze(actions.map((action) => buildAction(station, roundNumber, action)))]));
  return roundDefinition({ id: `gilded-shatter-round-${roundNumber}`, title: rawRound.title, situation: rawRound.situation, openingVignette: rawRound.opening, image: "", stationActions, outcomes: ROUND_OUTCOMES[index], narrativeHooks: { theme: rawRound.title, targetSentences: 4, maximumSentences: 4, mysteryTruth: "Dark Star gravity is forcing a ruptured Aetherite Arkengine through unstable transmutation, turning nearby matter into gold." } });
});

const PF2E_RUNES = Object.freeze([
  Object.freeze({ name: "Shifting Rune", uuid: "Compendium.pf2e.equipment-srd.Item.roeYtwlIe65BPMJ1", quantity: 1 }),
  Object.freeze({ name: "Ghost Touch Rune", uuid: "Compendium.pf2e.equipment-srd.Item.JQdwHECogcTzdd8R", quantity: 1 }),
  Object.freeze({ name: "Returning Rune", uuid: "Compendium.pf2e.equipment-srd.Item.qlunQzfnzPQpMG6U", quantity: 1 })
]);

function majorSalvageRewards({ gold, scrap = 0, extraordinary = false } = {}) {
  return rewardPackage({ gold, aetherScrap: scrap, pf2eItems: PF2E_RUNES, shipComponents: [{ id: "gilded-shatter-rare-blueprint-roll", kind: "blueprint-table", name: "Rare Arkflight Blueprint", rarity: "rare", description: `Roll/select one result from the Gilded Shatter rare blueprint table (${GILDED_SHATTER_BLUEPRINT_TABLE.map((entry) => entry.name).join(", ")}).` }], boons: [{ id: "gilded-shatter-deep-salvage-choice", name: "Deep Salvage Choice — Choose One", description: GILDED_SHATTER_DEEP_SALVAGE_OPTIONS.map((entry, index) => `${index + 1}) ${entry.name}: ${entry.description}`).join(" ") }], ...(extraordinary ? { salvage: [{ name: "Exceptional Gilded Aetherite Cache", description: "A compact cache of stable transmuted salvage recovered without sacrificing the guaranteed blueprint, chosen deep salvage, or PF2e rune rewards.", valueGp: 75, rarity: "uncommon", level: 6 }] } : {}) });
}

export const GILDED_SHATTER = eventDefinition({
  id: "gilded-shatter",
  title: "The Gilded Shatter",
  image: "assets/ui/branding/arkflight_logo.webp",
  openingVignette: "A dead Arkflight galleon turns slowly at the edge of a Dark Star, its broken hull already bending toward the gravity maw. Fresh gold glitters through the exposed decks, not piled there by any lost crew but spreading in branching veins across timber, iron, and bone while you watch. Each pulse from the black star makes the wreck flash blue-white somewhere deep inside, and another piece of ordinary matter becomes impossibly rich metal. There is enough wealth aboard to change fortunes, but the wreck is losing altitude into the dark with every breath. Bring the ship alongside, learn what is making the gold, take what can be saved, and be gone before the Dark Star claims both vessels.",
  goal: "Board the gilded wreck, uncover the source of the transmutation, secure the rare blueprint and deep salvage, and escape the Dark Star with the crew and ship intact.",
  startingState: { momentum: 0, hazards: [] },
  rounds: ROUNDS,
  endings: {
    extraordinary: endingDefinition({ id: "gilded-shatter-extraordinary", bands: ["extraordinary"], label: "Gold from the Dark", vignette: "The Arkengine catches the Dark Star's pull at the perfect angle and the ship surges outward instead of down. Behind you, the derelict folds around its ruptured core and becomes a bright golden wound against the black, each transformed deck vanishing into the gravity maw a heartbeat later. The boarding lines are gone, the Lifeveil steadies, and the crew begins counting who and what made it home. The rare blueprint is intact. The chosen deep salvage rests beside it, along with three recovered rune-stones and enough coin to make the danger feel real even after the fear fades. In the hold, a few fragments of transmuted metal still carry a faint blue-white pulse, proof that the gold was never treasure waiting to be found but matter rewritten by a dying Arkengine under impossible pressure. Somewhere behind the ship, the Dark Star swallows the last light of the wreck. The crew has stolen knowledge, wealth, and shipcraft from a place that should have kept all three.", rewards: majorSalvageRewards({ gold: 100, scrap: 4, extraordinary: true }) }),
    success: endingDefinition({ id: "gilded-shatter-success", bands: ["strong-success", "mixed-success"], label: "Salvage Secured", vignette: "The ship breaks free as the wreck begins its final descent, leaving a trail of snapped lines and glittering debris between you and the Dark Star. The crew brings the last salvage below while the Arkengine settles into a hard but steady rhythm. The rare blueprint survived the crossing, and the deep-salvage choice is secured beside the three recovered rune-stones. Gold lies heavy in the hold, far less than the wreck promised but enough to remind everyone why staying one more minute had been tempting. Behind you, the ruptured core flashes once more and a whole section of the derelict turns brilliant before disappearing into blackness. What happened there is no longer entirely a mystery: Aetherite, a failing Arkengine, and the crushing rhythm of a Dark Star briefly learned how to make gold. The crew leaves richer, but more importantly, they leave alive.", rewards: majorSalvageRewards({ gold: 75, scrap: 2 }) }),
    costly: endingDefinition({ id: "gilded-shatter-costly", bands: ["failure"], label: "A Heavy Price", vignette: "The ship tears away from the wreck late enough that the Dark Star seems to keep hold of it for several terrible seconds. Timbers groan, the Arkengine screams through the strain, and loose gilded debris hammers the Lifeveil before the gravity finally releases its grip. The crew counts injuries and damage before anyone counts treasure. The rare blueprint, chosen deep salvage, and three rune-stones still made it home, though some of the gold was abandoned or lost in the escape. The wreck itself is already gone, reduced to brief golden flashes beneath the black horizon. The salvage is real, but so is the repair bill written across the ship.", rewards: majorSalvageRewards({ gold: 40, scrap: 1 }) }),
    disaster: endingDefinition({ id: "gilded-shatter-disaster", bands: ["disaster"], label: "The Maw Takes Its Due", vignette: "The collapsing wreck catches the ship in its final fall and the escape becomes a brutal contest of thrust against gravity. Crew cut away lines, loose cargo, and anything else that threatens to drag the vessel backward while the Arkengine burns far beyond a comfortable note. When the ship finally claws into open void, the Dark Star is behind you and silence falls hard across every station. The guaranteed blueprint case is battered but present, the chosen salvage is aboard, and the three rune-stones survived because someone held onto them when easier treasure went spinning away. Most of the loose gold is gone. Damage settles through the hull in small ugly sounds while the crew realizes how close the entire vessel came to joining the derelict. Far astern, the last fragment of the wreck flashes gold and vanishes. Nobody aboard needs to be told that greed nearly made them part of the mystery.", rewards: majorSalvageRewards({ gold: 20, scrap: 0 }) })
  }
});
