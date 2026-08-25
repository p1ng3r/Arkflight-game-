export { HULLS } from "./hulls.js";
export { HULL_PATTERNS } from "./hull-patterns.js";
export { ARKENGINES } from "./arkengines.js";
export { ARKENGINE_PATTERNS } from "./arkengine-patterns.js";
export { ARKENGINE_MODS } from "./arkengine-mods.js";
export { SHIP_MODS } from "./ship-mods.js";
export { ROOMS } from "./rooms.js";
export { WEAPONS } from "./weapons.js";
export { CREW_SPECIALISTS } from "./crew-specialists.js";
export { FALLBACK_ACTIONS } from "./fallback-actions.js";
export { RISK_BENEFITS, RISK_BENEFIT_BY_ID, getRiskBenefit, riskBenefitsByTag } from "./risk-benefits.js";
export { CREW_EDGE_CARDS, CREW_EDGE_CARD_LIST, CREW_EDGE_HAND_MAX, getCrewEdgeCard } from "./crew-edge-cards.js";
export { ARKFLIGHT_EVENTS, GLASSBACK_CINDERWAKE, GLASSBACK_HAZARDS } from "./events/index.js";

import { HULLS } from "./hulls.js";
import { HULL_PATTERNS } from "./hull-patterns.js";
import { ARKENGINES } from "./arkengines.js";
import { ARKENGINE_PATTERNS } from "./arkengine-patterns.js";
import { ARKENGINE_MODS } from "./arkengine-mods.js";
import { SHIP_MODS } from "./ship-mods.js";
import { ROOMS } from "./rooms.js";
import { WEAPONS } from "./weapons.js";
import { CREW_SPECIALISTS } from "./crew-specialists.js";

export const SHIP_CATALOGS = Object.freeze({
  hulls: HULLS,
  hullPatterns: HULL_PATTERNS,
  arkengines: ARKENGINES,
  arkenginePatterns: ARKENGINE_PATTERNS,
  arkengineMods: ARKENGINE_MODS,
  shipMods: SHIP_MODS,
  rooms: ROOMS,
  weapons: WEAPONS,
  crewSpecialists: CREW_SPECIALISTS
});
