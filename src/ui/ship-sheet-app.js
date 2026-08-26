import { createShip } from "../ship/ship-schema.js";

const MODULE_ID = "arkflight-game";
export const ARKFLIGHT_SHIP_SHEET_ID = `${MODULE_ID}.ArkflightShipSheet`;

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

export function isArkflightShip(actor) {
  return actor?.type === "vehicle" && actor?.flags?.[MODULE_ID]?.isArkflightShip === true;
}

export class ArkflightShipSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arkflight", "arkflight-ship-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      template: `modules/${MODULE_ID}/templates/ship/ship-sheet.hbs`
    });
  }

  get title() {
    return `${this.actor.name} — Arkflight Vessel`;
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    return {
      ...data,
      arkflight: {
        marked: isArkflightShip(this.actor),
        actorUuid: this.actor.uuid,
        ship: shipFlag(this.actor)
      }
    };
  }
}

export function registerArkflightShipSheet() {
  if (game.system.id !== "pf2e") {
    console.warn("Arkflight | Ship sheet registration skipped: PF2e system is not active.");
    return;
  }

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, ArkflightShipSheet, {
    types: ["vehicle"],
    label: "Arkflight Vessel Sheet",
    makeDefault: false
  });
}

export async function markVehicleAsArkflightShip(actor) {
  if (!actor || actor.type !== "vehicle") {
    throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  }

  const existingShip = shipFlag(actor);
  const ship = existingShip ?? createShip({
    identity: {
      name: actor.name || "Unnamed Vessel"
    }
  });

  await actor.update({
    [`flags.${MODULE_ID}.isArkflightShip`]: true,
    [`flags.${MODULE_ID}.ship`]: ship,
    "flags.core.sheetClass": ARKFLIGHT_SHIP_SHEET_ID
  });

  return actor;
}
