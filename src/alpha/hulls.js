/** Opt-in 1.1 alpha profiles. Legacy ship data is never rewritten by this catalog. */
export const ALPHA_DIRECTIONS = Object.freeze([[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]].map(Object.freeze));
const profile = (id, name, role, hull, ac, speed, handling, bulk, fitting, footprint = 1, hand = 7) => ({
  id, name, role, baseHull: hull, acAdjustment: ac, speed, handling, cargoBulk: bulk, fitting, footprint,
  hand, deck: 15, opening: 5, ap: 4,
  mounts: footprint === 3 ? { fore: 1, port: 3, starboard: 3, aft: 1 } : speed >= 6 ? { fore: 1, port: 1, starboard: 1, aft: 1 } : { fore: 1, port: 2, starboard: 2, aft: 1 }
});
export const ALPHA_HULLS = Object.freeze(Object.fromEntries([
  profile("void-skiff", "Void Skiff", "Scout: tight turns, little cargo or endurance", 40, 2, 6, "nimble", 12, 2),
  profile("sloop", "Sloop", "Courier: agile routes and light freight", 56, 1, 6, "agile", 60, 3),
  profile("cutter", "Cutter", "Patrol: fast interception and close handling", 68, 1, 6, "nimble", 40, 3),
  profile("brigantine", "Brigantine", "Adventurer: versatile banks, S-curves and broadsides", 88, 0, 5, "versatile", 70, 4),
  profile("frigate", "Frigate", "Escort: fighting turns and stronger batteries", 108, 0, 5, "fighting", 55, 4),
  profile("galleon", "Galleon", "Merchant: large hold, longer approaches before turning", 140, -1, 3, "heavy", 150, 6),
  profile("hammerhead", "Hammerhead", "Assault: strong prow and deliberate ramming", 124, 0, 4, "assault", 65, 5),
  profile("arkcruiser", "Arkcruiser", "Expedition: two-hex hull, long-range capacity", 148, -1, 3, "heavy", 180, 6, 2),
  profile("dread-caravel", "Dread Caravel", "Capital hunter: three-hex footprint, one broad turn", 164, -1, 3, "capital", 110, 6, 3, 8),
  profile("cathedral-ship", "Cathedral Ship", "Sanctuary: three-hex ward vessel and cargo support", 156, -1, 2, "capital", 140, 7, 3, 8)
].map(p => [p.id, Object.freeze({ ...p, mounts: Object.freeze(p.mounts) })])));

export const ALPHA_UPGRADES = Object.freeze({
  "reinforced-prow": { name: "Reinforced Prow", slot: 1, minLevel: 1, hull: 8, ram: 2, pillars: ["combat", "events"] },
  "responsive-helm": { name: "Responsive Helm", slot: 1, minLevel: 1, unlockPivot: true, pillars: ["combat", "events"] },
  "expanded-hold": { name: "Expanded Hold", slot: 1, minLevel: 1, cargoBulk: 30, pillars: ["trade", "travel", "events"] },
  "efficient-drive": { name: "Efficient Drive", slot: 1, minLevel: 1, strain: 2, travelSupplyReduction: 1, pillars: ["combat", "travel", "events"] },
  "ward-emitters": { name: "Ward Emitters", slot: 1, minLevel: 1, resistanceBonus: 1, pillars: ["combat", "events"] },
  "command-relay": { name: "Command Relay", slot: 1, minLevel: 4, hand: 1, pillars: ["combat", "events"] }
});
export const ALPHA_TALENTS = Object.freeze({
  "broadside-doctrine": { name: "Broadside Doctrine", minLevel: 4, damage: 2, eventTags: ["armed-deterrence"], pillars: ["combat", "events"] },
  "seasoned-crew": { name: "Seasoned Crew", minLevel: 1, support: 1, eventTags: ["crew-coordination"], pillars: ["combat", "events"] },
  "void-runner": { name: "Void Runner", minLevel: 4, bonusMove: 1, travelSpeedBonus: 1, eventTags: ["fast-passage"], pillars: ["combat", "travel", "events"] },
  "merchant-network": { name: "Merchant Network", minLevel: 1, cargoBulk: 20, tradeBonus: 1, eventTags: ["merchant-contacts"], pillars: ["trade", "travel", "events"] },
  "ward-sanctuary": { name: "Ward Sanctuary", minLevel: 4, resistanceBonus: 1, eventTags: ["shelter"], pillars: ["combat", "events"] },
  "boarding-specialist": { name: "Boarding Specialist", minLevel: 1, boarding: 2, eventTags: ["boarding-lines"], pillars: ["combat", "events"] }
});
export function deriveAlphaProfile({ hullId, level = 5, upgrades = [], talents = [] }) {
  const hull = Object.hasOwn(ALPHA_HULLS,hullId)?ALPHA_HULLS[hullId]:null;
  if (!hull || !Number.isInteger(level) || level < 1 || level > 20) throw new Error("Choose an alpha hull and ship level 1–20.");
  if (!Array.isArray(upgrades) || !Array.isArray(talents) || new Set(upgrades).size !== upgrades.length || new Set(talents).size !== talents.length) throw new Error("Choose distinct upgrades and talents.");
  const installed = upgrades.map(id => { const item = Object.hasOwn(ALPHA_UPGRADES,id)?ALPHA_UPGRADES[id]:null; if (!item || item.minLevel > level) throw new Error("Upgrade is unavailable at this level."); return item; });
  if (installed.reduce((n, i) => n + i.slot, 0) > hull.fitting) throw new Error("This hull has insufficient fitting capacity.");
  const learned = talents.map(id => { const item = Object.hasOwn(ALPHA_TALENTS,id)?ALPHA_TALENTS[id]:null; if (!item || item.minLevel > level) throw new Error("Talent is unavailable at this level."); return item; });
  if (talents.length > 1 + Math.floor((level - 1) / 4)) throw new Error("Too many alpha talent choices for this level.");
  const items = [...installed, ...learned], sum = key => items.reduce((n, i) => n + (i[key] ?? 0), 0);
  return {
    ...structuredClone(hull), level, upgrades: [...upgrades], talents: [...talents],
    maxHull: hull.baseHull + (level - 1) * 8 + sum("hull"), ac: 17 + level + hull.acAdjustment,
    structure: level + 6 + (hull.footprint > 1 ? 1 : 0), engineer: level + 6 + (hull.handling === "nimble" ? 1 : 0), veil: level + 6 + (hullId === "cathedral-ship" ? 2 : 0),
    attack: level + 8, support: level + 8 + sum("support"), dc: level + 15,
    cargoBulk: hull.cargoBulk + sum("cargoBulk"), strain: 10 + sum("strain"), hand: Math.min(10, hull.hand + sum("hand")),
    deck: 15 + Math.floor((level - 1) / 4), opening: hull.opening,
    damageBonus: sum("damage") + (hullId === "dread-caravel" ? 2 : 0), resistanceBonus: sum("resistanceBonus") + (hullId === "cathedral-ship" ? 1 : 0),
    ramBonus: sum("ram") + (hullId === "hammerhead" ? 2 : 0), boardingBonus: sum("boarding"),
    unlockPivot: items.some(i => i.unlockPivot), maxBonusMove: hull.speed, bonusMove: sum("bonusMove"),
    capabilities: { travelSupplyReduction: sum("travelSupplyReduction"), travelSpeedBonus: sum("travelSpeedBonus"), tradeBonus: sum("tradeBonus"), eventTags: [...new Set(items.flatMap(i => i.eventTags ?? []))] }
  };
}
