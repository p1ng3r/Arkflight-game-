import {ALPHA_CARDS} from "./cards.js";

/** Card identity is independent of timing (Instant), lifecycle (Burn/Prepared), and station. */
export const CARD_CATEGORIES=Object.freeze({
  attack: Object.freeze({id:"attack",label:"Attack",accent:"#b7554b"}),
  defense: Object.freeze({id:"defense",label:"Defense",accent:"#398eac"}),
  repair: Object.freeze({id:"repair",label:"Repair",accent:"#4b9a79"}),
  maneuver: Object.freeze({id:"maneuver",label:"Maneuver",accent:"#d8ad55"}),
  command: Object.freeze({id:"command",label:"Command",accent:"#9174b6"}),
  utility: Object.freeze({id:"utility",label:"Utility",accent:"#a0a39f"})
});
/** Explicitly curated tactical tags; flags such as Burn, Prepared and Instant are added automatically. */
const taxonomy=Object.freeze({
  dispatch:["utility",["draw","crew-coordination"]],
  survey:["utility",["draw","filter","navigation"]],
  recover:["utility",["discard-recovery","crew-coordination"]],
  tune:["command",["strain","draw","battery","setup"]],
  exploit:["command",["accuracy","draw","battery","synergy"]],
  acquire:["command",["accuracy","targeting"]],
  patch:["repair",["hull","supply"]],
  brace:["defense",["damage-reduction","prepared"]],
  prepare:["command",["ap","prepared","crew-coordination"]],
  shield:["defense",["lifeveil","resistance"]],
  helm:["maneuver",["positioning","reaction"]],
  volley:["attack",["battery","coordinated","bonus-damage"]],
  harmonic:["attack",["battery","coordinated","lifeveil","armor-penetration"]],
  "all-hands":["attack",["battery","coordinated","broadside","bonus-damage"]],
  evasive:["defense",["ac","evasion"]],
  read:["utility",["draw","filter"]],
  chainshot:["attack",["battery","ammo","slow","control"]],
  breakaway:["attack",["battery","coordinated","positioning"]],
  ahead:["maneuver",["positioning","bonus-movement"]],
  overcharge:["command",["strain","battery","bonus-damage"]],
  mend:["repair",["lifeveil"]],
  rally:["repair",["morale"]],
  vent:["repair",["strain"]],
  "work-guns":["utility",["battery","reload"]],
  boarding:["utility",["boarding"]],
  ram:["command",["ramming","prepared","impact"]]
});
export const CARD_TAG_LABELS=Object.freeze({
  attack:"Attack",defense:"Defense",repair:"Repair",maneuver:"Maneuver",command:"Command",utility:"Utility",
  instant:"Instant",burn:"Burn",prepared:"Prepared",coordinated:"Coordinated",ammo:"Ammo",
  boarding:"Boarding",ramming:"Ramming",lifeveil:"Lifeveil",strain:"Strain",morale:"Morale",
  hull:"Hull",supply:"Supply",battery:"Battery",positioning:"Positioning",draw:"Draw",
  accuracy:"Accuracy",reload:"Reload","armor-penetration":"Armor Penetration",
  "crew-coordination":"Crew Coordination",targeting:"Targeting","bonus-damage":"Bonus Damage",
  "damage-reduction":"Damage Reduction", "discard-recovery":"Discard Recovery"
});
export function cardCategory(card){
  if(!card?.id||!ALPHA_CARDS[card.id])throw new Error("Unknown Arkflight card.");
  const row=taxonomy[card.id];if(!row)throw new Error(`No card taxonomy for ${card.id}.`);
  return CARD_CATEGORIES[row[0]];
}
export function cardTags(card){
  if(!card?.id||!ALPHA_CARDS[card.id])throw new Error("Unknown Arkflight card.");
  const row=taxonomy[card.id];if(!row)throw new Error(`No card taxonomy for ${card.id}.`);
  return [...new Set([...row[1],...(card.timing==="instant"?["instant"]:[]),...(card.burn?["burn"]:[]),...(card.delayed?["prepared"]:[]),...(card.stations?.length>1?["coordinated"]:[]),...(card.ammo?["ammo"]:[])])];
}
export function decoratedCard(card){
  const category=cardCategory(card);
  return {...card,category:category.id,categoryLabel:category.label,categoryAccent:category.accent,tags:cardTags(card)};
}
