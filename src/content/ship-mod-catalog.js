import { SHIP_MODS as BASE_SHIP_MODS } from "./ship-mods.js";
import { EPIC_SHIP_MODS } from "./ship-mods-epic.js";
import { LEGENDARY_SHIP_MODS } from "./ship-mods-legendary.js";
import { MYTHIC_SHIP_MODS } from "./ship-mods-mythic.js";

const LEGACY_COMPAT_SHIP_MOD_IDS = Object.freeze([
  "fleet-signal-array",
  "reinforced-ram-prow",
  "auxiliary-command-roost",
  "deep-void-insulation-web",
  "occult-signal-refractors",
  "expanded-command-network"
]);

const LEGACY_COMPAT_SET = new Set(LEGACY_COMPAT_SHIP_MOD_IDS);

function catalogEntry(mod) {
  if (!LEGACY_COMPAT_SET.has(mod.id)) return mod;
  return Object.freeze({
    ...mod,
    data: Object.freeze({
      ...(mod.data ?? {}),
      catalogStatus: "legacy-compat"
    })
  });
}

const merged = {
  ...BASE_SHIP_MODS,
  ...EPIC_SHIP_MODS,
  ...LEGENDARY_SHIP_MODS,
  ...MYTHIC_SHIP_MODS
};

export const SHIP_MODS = Object.freeze(Object.fromEntries(
  Object.entries(merged).map(([id, mod]) => [id, catalogEntry(mod)])
));

export const ACTIVE_SHIP_MODS = Object.freeze(Object.fromEntries(
  Object.entries(SHIP_MODS).filter(([, mod]) => mod.data?.catalogStatus !== "legacy-compat")
));

export { LEGACY_COMPAT_SHIP_MOD_IDS };
