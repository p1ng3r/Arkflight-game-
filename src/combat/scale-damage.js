export const SHIP_DAMAGE_CHARACTER_HP_RATIO = 10;
export const MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY = 10;

/**
 * Convert Arkflight Ship Damage into PF2e character-scale Hit Point damage.
 * This remains useful for ordinary character-scale targets. Massive creatures
 * instead use Massive Integrity and take Ship Damage directly.
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

export function massiveDurability({ max = 1, value = max, buffer = 0 } = {}) {
  const safeMax = Math.max(1, Math.trunc(Number(max) || 1));
  const safeValue = Math.max(0, Math.min(safeMax, Math.trunc(Number(value) || 0)));
  const safeBuffer = safeValue > 0
    ? Math.max(0, Math.min(MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY - 1, Math.trunc(Number(buffer) || 0)))
    : 0;
  return Object.freeze({ max: safeMax, value: safeValue, buffer: safeBuffer });
}

/** Ship-scale attacks damage Massive Integrity directly, one-for-one. */
export function applyShipDamageToMassive(state, shipDamage) {
  const current = massiveDurability(state);
  const amount = Math.max(0, Math.trunc(Number(shipDamage) || 0));
  const value = Math.max(0, current.value - amount);
  return Object.freeze({
    state: massiveDurability({ max: current.max, value, buffer: value > 0 ? current.buffer : 0 }),
    integrityDamage: Math.min(current.value, amount),
    characterDamage: 0
  });
}

/**
 * Character-scale damage accumulates against a Massive creature. Every full
 * 10 points remove 1 Massive Integrity; remainder is retained as a buffer so
 * smaller PF2e attacks still matter over time.
 */
export function applyCharacterDamageToMassive(state, characterDamage) {
  const current = massiveDurability(state);
  const amount = Math.max(0, Math.trunc(Number(characterDamage) || 0));
  if (!amount || current.value <= 0) return Object.freeze({ state: current, integrityDamage: 0, characterDamage: amount });
  const total = current.buffer + amount;
  const requestedIntegrityDamage = Math.floor(total / MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY);
  const integrityDamage = Math.min(current.value, requestedIntegrityDamage);
  const value = Math.max(0, current.value - integrityDamage);
  const buffer = value > 0 ? total % MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY : 0;
  return Object.freeze({
    state: massiveDurability({ max: current.max, value, buffer }),
    integrityDamage,
    characterDamage: amount
  });
}

/**
 * PF2e NPC HP can be used as a display/mirror for Massive durability. The
 * Massive Integrity track remains authoritative for ship-scale effects.
 */
export function massiveCharacterHpEquivalent(state) {
  const current = massiveDurability(state);
  return Math.max(0, current.value * MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY - current.buffer);
}

export function scaleDamageSummary() {
  return Object.freeze({
    shipDamageToCharacterHp: SHIP_DAMAGE_CHARACTER_HP_RATIO,
    characterHpPerShipDamage: SHIP_DAMAGE_CHARACTER_HP_RATIO,
    massiveCharacterDamagePerIntegrity: MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY,
    rule: "Ships and Massive creatures use Ship Damage directly. Against Massive creatures, every full 10 points of character-scale damage removes 1 Massive Integrity."
  });
}
