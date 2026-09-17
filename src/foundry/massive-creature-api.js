import {
  MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY,
  massiveDurability,
  applyShipDamageToMassive,
  applyCharacterDamageToMassive,
  massiveCharacterHpEquivalent
} from "../combat/scale-damage.js";

Hooks.once("init", () => {
  game.arkflight ??= {};
  game.arkflight.massive = Object.freeze({
    characterDamagePerIntegrity: MASSIVE_CHARACTER_DAMAGE_PER_INTEGRITY,
    create: massiveDurability,
    applyShipDamage: applyShipDamageToMassive,
    applyCharacterDamage: applyCharacterDamageToMassive,
    characterHpEquivalent: massiveCharacterHpEquivalent
  });
});
