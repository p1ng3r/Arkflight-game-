import { ARKENGINE_MODS as STANDARD_ARKENGINE_MODS } from "./arkengine-mods.js";
import { RARE_ARKENGINE_MODS } from "./arkengine-mods-rare.js";

export const ARKENGINE_MODS = Object.freeze({
  ...STANDARD_ARKENGINE_MODS,
  ...RARE_ARKENGINE_MODS
});
