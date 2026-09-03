import { ARKENGINE_MODS as STANDARD_ARKENGINE_MODS } from "./arkengine-mods.js";
import { RARE_ARKENGINE_MODS } from "./arkengine-mods-rare.js";
import { EPIC_ARKENGINE_MODS } from "./arkengine-mods-epic.js";
import { LEGENDARY_ARKENGINE_MODS } from "./arkengine-mods-legendary.js";
import { MYTHIC_ARKENGINE_MODS } from "./arkengine-mods-mythic.js";
import { withModArt } from "./mod-art.js";

const merged = {
  ...STANDARD_ARKENGINE_MODS,
  ...RARE_ARKENGINE_MODS,
  ...EPIC_ARKENGINE_MODS,
  ...LEGENDARY_ARKENGINE_MODS,
  ...MYTHIC_ARKENGINE_MODS
};

export const ARKENGINE_MODS = Object.freeze(Object.fromEntries(
  Object.entries(merged).map(([id, mod]) => [id, withModArt(mod, "arkengineMod")])
));
