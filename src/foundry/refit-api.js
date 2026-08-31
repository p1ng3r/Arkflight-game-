import {
  acquireIntactComponent,
  availableRefitInventory,
  buildComponentFromBlueprint,
  buildComponentQuote,
  knownBlueprintEntries,
  learnBlueprint
} from "../ship/refit-economy.js";
import {
  REFIT_COMPONENT_FAMILIES,
  grantSalvageParts,
  salvageParts
} from "../ship/refit-state.js";

const MODULE_ID = "arkflight-game";

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM can change Arkflight refit inventory during Refit Alpha.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function requireShipActor(actor) {
  if (!actor?.update || !shipPayload(actor)) throw new Error("Choose an Arkflight ship Vehicle Actor.");
  return actor;
}

async function persistShip(actor, ship) {
  await actor.update({ [`flags.${MODULE_ID}.ship`]: ship });
  return ship;
}

Hooks.once("init", () => {
  if (!game.arkflight) return;

  game.arkflight.refit = Object.freeze({
    families: REFIT_COMPONENT_FAMILIES,

    getSalvageParts(actor) {
      return salvageParts(shipPayload(requireShipActor(actor)));
    },

    getInventory(actor) {
      return availableRefitInventory(shipPayload(requireShipActor(actor)));
    },

    getBlueprints(actor, family) {
      return knownBlueprintEntries(shipPayload(requireShipActor(actor)), family);
    },

    quoteBuild(actor, family, componentId, quantity = 1) {
      return buildComponentQuote(shipPayload(requireShipActor(actor)), family, componentId, quantity);
    },

    async grantSalvageParts(actor, amount) {
      requireGM();
      const target = requireShipActor(actor);
      const ship = grantSalvageParts(shipPayload(target), amount);
      await persistShip(target, ship);
      return Object.freeze({ ok: true, amount: Math.max(0, Math.trunc(Number(amount) || 0)), total: salvageParts(ship), ship });
    },

    async learnBlueprint(actor, family, componentId) {
      requireGM();
      const target = requireShipActor(actor);
      const result = learnBlueprint(shipPayload(target), family, componentId);
      if (!result.ok) return result;
      await persistShip(target, result.ship);
      return result;
    },

    async acquireComponent(actor, family, componentId, quantity = 1) {
      requireGM();
      const target = requireShipActor(actor);
      const result = acquireIntactComponent(shipPayload(target), family, componentId, quantity);
      if (!result.ok) return result;
      await persistShip(target, result.ship);
      return result;
    },

    async buildFromBlueprint(actor, family, componentId, quantity = 1) {
      requireGM();
      const target = requireShipActor(actor);
      const result = buildComponentFromBlueprint(shipPayload(target), family, componentId, quantity);
      if (!result.ok) return result;
      await persistShip(target, result.ship);
      return result;
    }
  });
});
