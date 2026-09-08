const UPGRADE_MIN = 0;
const UPGRADE_MAX = 3;

function clampUpgrade(value) {
  return Math.max(UPGRADE_MIN, Math.min(UPGRADE_MAX, Math.trunc(Number(value) || 0)));
}

export function normalizeWeaponUpgrades(install = {}) {
  const source = install && typeof install === "object" ? install.upgrades ?? {} : {};
  const properties = [...new Set((Array.isArray(source.properties) ? source.properties : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))];
  return Object.freeze({
    potency: clampUpgrade(source.potency),
    impact: clampUpgrade(source.impact),
    properties: Object.freeze(properties)
  });
}

/**
 * Ship weapon accuracy is deliberately split between crew, ship and weapon:
 * Battlewatch Perception + ship targeting systems + weapon Potency + temporary modifiers.
 * Ship level is not added here because PF2e Perception already includes level through proficiency.
 */
export function shipWeaponAttackBonus({
  battlewatchPerception = 0,
  shipWeaponAttackBonus = 0,
  install = {},
  situationalModifier = 0
} = {}) {
  const upgrades = normalizeWeaponUpgrades(install);
  return Number(battlewatchPerception || 0)
    + Number(shipWeaponAttackBonus || 0)
    + upgrades.potency
    + Number(situationalModifier || 0);
}

function parseDamageDice(expression) {
  const match = /^\s*(\d+)d(\d+)(\s*[+-]\s*\d+)?\s*$/i.exec(String(expression ?? ""));
  if (!match) return null;
  const count = Math.max(0, Math.trunc(Number(match[1]) || 0));
  const faces = Math.max(1, Math.trunc(Number(match[2]) || 0));
  const modifier = String(match[3] ?? "").replace(/\s+/g, "");
  return { count, faces, modifier };
}

/** Impact adds one base weapon die per rank instead of multiplying all dice. */
export function weaponDamageProfile(weapon, install = {}) {
  const base = weapon?.data?.damageProfile ?? weapon?.damageProfile ?? {};
  const upgrades = normalizeWeaponUpgrades(install);
  const parsed = parseDamageDice(base.dice);
  if (!parsed) return Object.freeze({ ...base, impact: upgrades.impact });
  const dice = `${parsed.count + upgrades.impact}d${parsed.faces}${parsed.modifier}`;
  return Object.freeze({ ...base, dice, impact: upgrades.impact });
}

/** Hardness is universal structural damage reduction applied once per damaging hit. */
export function applyHardnessToDamage(damage, hardness) {
  const incoming = Math.max(0, Number(damage) || 0);
  const structuralHardness = Math.max(0, Number(hardness) || 0);
  const absorbed = Math.min(incoming, structuralHardness);
  return Object.freeze({
    incoming,
    hardness: structuralHardness,
    absorbed,
    hullDamage: Math.max(0, incoming - structuralHardness)
  });
}
