import { SHIP_MODS as BASE_SHIP_MODS } from "./ship-mods.js";
import { EPIC_SHIP_MODS } from "./ship-mods-epic.js";

export const SHIP_MODS = Object.freeze({
  ...BASE_SHIP_MODS,
  ...EPIC_SHIP_MODS
});
