export const SHIP_DAMAGE_CHARACTER_HP_RATIO = 10;

/**
 * Convert Arkflight Ship Damage into PF2e character-scale Hit Point damage.
 * Ship weapons already roll in ship scale, so ship-vs-ship damage never uses
 * this conversion.
 */
export function shipDamageToCharacterHp(shipDamage) {
  const value = Math.max(0, Number(shipDamage) || 0);
  return Math.max(0, Math.trunc(value * SHIP_DAMAGE_CHARACTER_HP_RATIO));
}

/**
 * Convert structurally appropriate PF2e character-scale damage into Arkflight
 * Hull damage. Ordinary hand weapons should call this with structural=false.
 */
export function characterDamageToShipHull(characterDamage, { structural = false } = {}) {
  if (!structural) return 0;
  const value = Math.max(0, Number(characterDamage) || 0);
  return Math.max(0, Math.floor(value / SHIP_DAMAGE_CHARACTER_HP_RATIO));
}

export function scaleDamageSummary() {
  return Object.freeze({
    shipDamageToCharacterHp: SHIP_DAMAGE_CHARACTER_HP_RATIO,
    characterHpPerShipDamage: SHIP_DAMAGE_CHARACTER_HP_RATIO,
    rule: "1 Ship Damage equals 10 character-scale HP when crossing damage scales."
  });
}
