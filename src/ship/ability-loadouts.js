import { SHIP_ABILITIES, STARTER_STATION_ABILITIES, SHARED_REACTIONS, REACTION_RESERVE, ABILITY_LEARNING_LEVELS } from "../content/station-abilities.js";

export function normalizeAbilityLoadouts(ship = {}) {
  const source = ship.abilities ?? {};
  const level = Math.max(1, Math.min(20, Number(ship.progression?.level) || 1));
  const claimed = [...new Set([...(source.claimedLearningLevels ?? []), ...ABILITY_LEARNING_LEVELS.filter(l => l <= level)])];
  const oldClaims = new Set(source.claimedLearningLevels ?? []);
  const credits = Math.max(0, Number(source.learningCredits) || 0) + claimed.filter(l => !oldClaims.has(l)).length;
  const groups = { ...STARTER_STATION_ABILITIES, reactions: SHARED_REACTIONS };
  const learned = {}, equipped = {};
  for (const [group, defaults] of Object.entries(groups)) {
    learned[group] = [...new Set(source.learned?.[group] ?? defaults)];
    const starter = group === "reactions" ? defaults.filter(id => id !== REACTION_RESERVE) : defaults;
    equipped[group] = [...new Set(source.equipped?.[group] ?? starter)].filter(id => learned[group].includes(id) && SHIP_ABILITIES[id]?.station === group).slice(0, 4);
  }
  return { version: 1, learned, equipped, learningCredits: credits, claimedLearningLevels: claimed };
}

export function abilityEquipped(ship, id) {
  const a = SHIP_ABILITIES[id];
  return Boolean(a && (a.station === "common" || normalizeAbilityLoadouts(ship).equipped[a.station]?.includes(id)));
}

export function equipShipAbilities(ship, group, ids, { inCombat = false } = {}) {
  if (inCombat) throw new Error("Ability loadouts are locked during combat.");
  const abilities = normalizeAbilityLoadouts(ship);
  if (!abilities.learned[group]) throw new Error("Unknown ability group.");
  if (!Array.isArray(ids) || ids.length !== 4 || new Set(ids).size !== 4) throw new Error("Equip four different abilities.");
  if (ids.some(id => !abilities.learned[group].includes(id) || SHIP_ABILITIES[id]?.station !== group)) throw new Error("Choose learned abilities belonging to this station.");
  if (group !== "reactions") {
    const tiers = ids.map(id => SHIP_ABILITIES[id].tier);
    if (tiers.filter(t => t === "regular").length !== 2 || tiers.filter(t => t === "surge").length !== 1 || tiers.filter(t => t === "signature").length !== 1) throw new Error("Equip two Regular abilities, one Surge and one Signature.");
  }
  abilities.equipped[group] = [...ids];
  return { ...ship, abilities };
}

export function learnShipAbility(ship, id, { inCombat = false } = {}) {
  if (inCombat) throw new Error("Learn abilities between combats.");
  const action = SHIP_ABILITIES[id];
  if (!action || action.station === "common") throw new Error("Unknown learnable ability.");
  const abilities = normalizeAbilityLoadouts(ship);
  if (abilities.learned[action.station].includes(id)) throw new Error("This ability is already learned.");
  if (Number(action.rules.minLevel ?? 1) > Number(ship.progression?.level ?? 1)) throw new Error("Ship level is too low.");
  if (abilities.learningCredits < 1) throw new Error("No ability learning rewards available.");
  abilities.learningCredits--;
  abilities.learned[action.station].push(id);
  return { ...ship, abilities };
}
