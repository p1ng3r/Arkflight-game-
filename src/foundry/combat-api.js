import {
  COMBAT_ACTIONS,
  createCombatState,
  executeCombatAction,
  persistentStrainPatch,
  resetCombatRound
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
const STATE_SETTING = "activeCombatState";
const SHIP_SETTING = "activeCombatShipUuid";

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may change Arkflight ship combat state.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

async function resolveShip(reference) {
  if (reference?.documentName === "Actor") return reference;
  if (typeof reference === "string") {
    const direct = game.actors?.get(reference) ?? game.actors?.find((actor) => actor.uuid === reference || actor.name === reference);
    if (direct) return direct;
    try {
      const resolved = await fromUuid(reference);
      if (resolved?.documentName === "Actor") return resolved;
    } catch (_error) {
      // Fall through to the common error below.
    }
  }
  throw new Error("Choose an Arkflight ship Actor for combat.");
}

function activeState() {
  return game.settings.get(MODULE_ID, STATE_SETTING) || null;
}

async function activeShip() {
  const uuid = game.settings.get(MODULE_ID, SHIP_SETTING) || "";
  if (!uuid) return null;
  return resolveShip(uuid).catch(() => null);
}

function launchBlockers(actor) {
  const blockers = [];
  const ship = shipPayload(actor);
  if (!ship) return [`${actor?.name ?? "Selected Actor"} is not an Arkflight ship.`];

  const commissioned = Boolean(ship.hull?.chassisId && ship.arkengine?.chassisId);
  if (!commissioned) blockers.push("Ship commissioning is incomplete.");

  const validation = validateShip(ship, SHIP_CATALOGS);
  if (!validation.ok) blockers.push(...validation.errors);

  const serviceEntry = game.arkflight?.ships?.get?.(actor.id) ?? null;
  if (serviceEntry && !serviceEntry.player) blockers.push("Only a player-classified Arkflight ship may be launched from GM Operations.");
  if (serviceEntry && !serviceEntry.crew?.ready) blockers.push(`${serviceEntry.crew?.assigned ?? 0}/${serviceEntry.crew?.total ?? 0} permanent stations assigned.`);

  if (game.arkflight?.controller?.state?.eventId) blockers.push("A Voyage Event is already active.");
  if (activeState()) blockers.push("Arkflight ship combat is already active.");

  return [...new Set(blockers)];
}

async function persistState(state) {
  await game.settings.set(MODULE_ID, STATE_SETTING, state);
  return state;
}

async function persistCombatStrain(actor, state) {
  const ship = shipPayload(actor);
  if (!ship) throw new Error(`${actor.name} does not contain Arkflight ship data.`);
  const patched = persistentStrainPatch(ship, state);
  await actor.update({ [`flags.${MODULE_ID}.ship.resources.strain.value`]: patched.resources.strain.value });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, STATE_SETTING, {
    name: "Active Arkflight Combat State",
    scope: "world",
    config: false,
    type: Object,
    default: null
  });
  game.settings.register(MODULE_ID, SHIP_SETTING, {
    name: "Active Arkflight Combat Vessel",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.combat = {
    actions: COMBAT_ACTIONS,
    get state() { return activeState(); },
    async ship() { return activeShip(); },
    launchBlockers(reference) {
      const actor = reference?.documentName === "Actor" ? reference : game.actors?.get(reference) ?? null;
      return actor ? launchBlockers(actor) : ["Choose an Arkflight ship Actor for combat."];
    },

    async start(reference, options = {}) {
      requireGM();
      const actor = await resolveShip(reference);
      const blockers = launchBlockers(actor);
      if (blockers.length) throw new Error(`Cannot launch Arkflight ship combat: ${blockers.join(" ")}`);
      const ship = shipPayload(actor);
      const state = createCombatState(ship, options);
      await game.settings.set(MODULE_ID, SHIP_SETTING, actor.uuid);
      await persistState(state);
      ui.notifications?.info(`Arkflight combat started for ${actor.name}.`);
      return state;
    },

    async execute(actionId) {
      requireGM();
      const state = activeState();
      if (!state) throw new Error("No Arkflight ship combat is active.");
      const actor = await activeShip();
      if (!actor) throw new Error("The active Arkflight combat vessel could not be resolved.");
      const next = executeCombatAction(state, actionId);
      await persistCombatStrain(actor, next);
      await persistState(next);
      return next;
    },

    async nextRound(options = {}) {
      requireGM();
      const state = activeState();
      if (!state) throw new Error("No Arkflight ship combat is active.");
      return persistState(resetCombatRound(state, options));
    },

    async stop() {
      requireGM();
      await game.settings.set(MODULE_ID, STATE_SETTING, null);
      await game.settings.set(MODULE_ID, SHIP_SETTING, "");
      ui.notifications?.info("Arkflight combat ended.");
    }
  };
});
