const MODULE_ROOT = "modules/arkflight-game/assets/icons/weapons";
const FALLBACK_WEAPON_ICON = "icons/svg/sword.svg";

// Canonical Arkflight weapon IDs mapped to the packaged icon filenames.
// Light variants intentionally reuse the closest authored small-weapon art
// where a dedicated canonical export was not present in the supplied sheets.
const WEAPON_ART_FILES = Object.freeze({
  "deck-ballista": "deck_ballista.webp",
  "repeating-bolt-rack": "repeating_bolt_rack.webp",
  "heavy-scorpion": "heavy_scorpion.webp",
  "light-swivel-cannon": "swivel_stern_cannon.webp",
  "swivel-cannon": "swivel_cannon.webp",
  "light-deck-culverin": "reinforced_prow_cannon.webp",
  "deck-culverin": "deck_culverin.webp",
  "light-broadside-cannon": "balanced_broadside_battery.webp",
  "broadside-cannon-battery": "broadside_cannon_battery.webp",
  "heavy-bombard": "heavy_bombard.webp",
  "stormglass-lance": "stormglass_lance.webp",
  "grapnel-harpoon": "grapnel_harpoon.webp",
  "hullspike-harpoon": "hullspike_harpoon.webp",
  "light-deck-scattergun": "deck_scattergun.webp",
  "deck-scattergun": "deck_scattergun.webp",
  "aether-arc-projector": "aether_arc_projector.webp"
});

export const UNUSED_PACKAGED_WEAPON_ART = Object.freeze([
  "standard_deck_ballista.webp",
  "iron_mortar.webp",
  "modular_rocket_rack.webp"
]);

export function weaponArt(id) {
  const file = WEAPON_ART_FILES[String(id ?? "")];
  return file ? `${MODULE_ROOT}/${file}` : null;
}

export function withWeaponArt(weapon) {
  const img = weaponArt(weapon?.id);
  return Object.freeze({
    ...weapon,
    img: img ?? FALLBACK_WEAPON_ICON,
    data: Object.freeze({
      ...(weapon?.data ?? {}),
      art: Object.freeze({
        img: img ?? null,
        matched: Boolean(img),
        filename: img ? WEAPON_ART_FILES[weapon.id] : null,
        fallback: FALLBACK_WEAPON_ICON
      })
    })
  });
}

export function auditWeaponArt(weapons = {}) {
  const entries = Object.values(weapons).map((weapon) => {
    const img = weaponArt(weapon?.id);
    return Object.freeze({
      id: weapon?.id,
      name: weapon?.name,
      img,
      filename: img ? WEAPON_ART_FILES[weapon.id] : null,
      missing: !img
    });
  });
  return Object.freeze({
    missing: Object.freeze(entries.filter((entry) => entry.missing)),
    matched: entries.filter((entry) => !entry.missing).length,
    total: entries.length,
    unusedPackaged: UNUSED_PACKAGED_WEAPON_ART
  });
}
