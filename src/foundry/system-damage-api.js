import { applyActorSystemDamage } from "./system-damage-runtime.js";
import { SYSTEM_KEYS, activeSystemFaults, systemIntegrity, systemSaveProfile } from "../ship/system-damage.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.systemDamage = Object.freeze({
    damage: applyActorSystemDamage,
    status(actor) {
      const ship = actor?.flags?.["arkflight-game"]?.ship;
      if (!ship) throw new Error("Choose an Arkflight ship.");
      const derived = deriveShip(ship, SHIP_CATALOGS);
      return SYSTEM_KEYS.map(system => ({ ...systemIntegrity(ship, system), save: systemSaveProfile(ship, system, { catalogs: SHIP_CATALOGS, derived }), faults: activeSystemFaults(ship, system) }));
    }
  });
});
