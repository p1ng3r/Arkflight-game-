import { ARKENGINE_MODS as STANDARD_ARKENGINE_MODS } from "./arkengine-mods.js";
import { RARE_ARKENGINE_MODS } from "./arkengine-mods-rare.js";
import { EPIC_ARKENGINE_MODS } from "./arkengine-mods-epic.js";
import { LEGENDARY_ARKENGINE_MODS } from "./arkengine-mods-legendary.js";
import { MYTHIC_ARKENGINE_MODS } from "./arkengine-mods-mythic.js";

export const ARKENGINE_MODS = Object.freeze({
  ...STANDARD_ARKENGINE_MODS,
  ...RARE_ARKENGINE_MODS,
  ...EPIC_ARKENGINE_MODS,
  ...LEGENDARY_ARKENGINE_MODS,
  ...MYTHIC_ARKENGINE_MODS
});
