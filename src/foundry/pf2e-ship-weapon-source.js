const DEFAULT_IMAGE = "icons/svg/sword.svg";
export const PF2E_SHIP_WEAPON_SCHEMA_VERSION = 2;

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function pf2eRarity(rarity) {
  if (rarity === "rare") return "rare";
  if (["epic", "legendary", "mythic"].includes(rarity)) return "unique";
  return "common";
}

export function parsePf2eWeaponDamage(profile = {}) {
  const formula = String(profile.dice ?? "").trim().toLowerCase();
  const match = /^(\d+)d(4|6|8|10|12)$/.exec(formula);
  if (!match) throw new Error(`Arkflight ship weapon damage formula is not PF2e-compatible: ${formula || "(blank)"}`);

  const dice = Number(match[1]);
  if (!Number.isInteger(dice) || dice < 1) throw new Error(`Arkflight ship weapon damage dice must be positive: ${formula}`);

  return {
    dice,
    die: `d${match[2]}`,
    damageType: String(profile.type ?? "bludgeoning"),
    modifier: 0,
    persistent: null
  };
}

/**
 * Build the PF2e Item document shell for an Arkflight ship weapon.
 *
 * PF2e owns the Item document type and normal item-sheet/compendium behavior.
 * Arkflight remains authoritative for ship attack bonuses, AP, facing, arcs,
 * range bands, reload rounds, mounts, system threat, and weapon upgrades.
 */
export function pf2eShipWeaponDocumentBase(weapon, { descriptionHtml = "", defaultImage = DEFAULT_IMAGE } = {}) {
  const data = weapon?.data ?? {};
  const level = Math.max(1, Math.trunc(Number(data.minShipLevel) || 1));
  const rarity = data.rarity ?? "standard";

  return {
    name: weapon?.name ?? "Arkflight Ship Weapon",
    type: "weapon",
    img: weapon?.img ?? data.art?.img ?? defaultImage,
    system: {
      ammo: null,
      baseItem: null,
      bonus: { value: 0 },
      bulk: { value: 0 },
      category: "martial",
      containerId: null,
      damage: parsePf2eWeaponDamage(data.damageProfile ?? {}),
      description: { value: descriptionHtml },
      expend: null,
      grade: null,
      group: null,
      hardness: 0,
      hp: { max: 0, value: 0 },
      level: { value: level },
      material: { grade: null, type: null },
      price: { value: {} },
      quantity: 1,
      range: null,
      reload: { value: null },
      rules: [],
      runes: { potency: 0, property: [], striking: 0 },
      size: "med",
      slug: slugify(weapon?.id ?? weapon?.name),
      splashDamage: { value: 0 },
      traits: { rarity: pf2eRarity(rarity), value: [], otherTags: [] },
      usage: { canBeAmmo: false, value: "held-in-two-hands" }
    }
  };
}
