import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";

function hudRoot(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  if (id !== HUD_ID) return null;
  return app?.element?.querySelector?.(".afcs-shell") ? app.element : null;
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function activeCombatant(actor) {
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.actorId === actor.id)
    ?? null;
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function derivedMaximum(resource, derived, statKey, current = 0) {
  const direct = numeric(resource?.max, 0);
  if (direct > 0) return direct;
  const fromDerived = numeric(derived?.stats?.[statKey], 0);
  if (fromDerived > 0) return fromDerived;
  return Math.max(0, numeric(current, 0));
}

function vitalPair(actor, state, key) {
  const ship = shipPayload(actor);
  if (!ship) return { value: 0, max: 0 };
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const resources = ship.resources ?? {};

  if (key === "strain") {
    const value = Math.max(0, numeric(state?.strain?.value ?? resources.strain?.value, 0));
    const max = Math.max(0, numeric(state?.strain?.max, 0) || derivedMaximum(resources.strain, derived, "strainCapacity", value));
    return { value, max };
  }

  const map = {
    hull: ["hull", "hullIntegrity"],
    lifeveil: ["lifeveil", "lifeveilCapacity"],
    morale: ["morale", "moraleCapacity"],
    supplies: [resources.supply ? "supply" : "supplies", "supplyCapacity"]
  };
  const [resourceKey, statKey] = map[key] ?? [key, null];
  const resource = resources[resourceKey] ?? {};
  const value = Math.max(0, numeric(resource.value, 0));
  const max = Math.max(0, derivedMaximum(resource, derived, statKey, value));
  return { value, max };
}

function updateVitals(app, root) {
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  const combatant = activeCombatant(actor);
  const state = combatant ? game.arkflight?.combat?.state?.(combatant) : null;

  for (const vital of root.querySelectorAll("[data-afch-vital]")) {
    const key = vital.dataset.afchVital;
    const { value, max } = vitalPair(actor, state, key);
    const percent = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    const fill = vital.querySelector(".afch-meter > i");
    const text = vital.querySelector("strong");
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${value} / ${max}`;
  }
}

function bindCommandStations(app, root) {
  for (const button of root.querySelectorAll("[data-command-station]")) {
    if (button.dataset.afchBound === "true") continue;
    button.dataset.afchBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      app.selectedStation = button.dataset.commandStation;
      app.openPanel = "stations";
      app.render?.({ force: true });
    });
  }
}

function bindClose(app, root) {
  const button = root.querySelector("[data-afch-close]");
  if (!button || button.dataset.afchBound === "true") return;
  button.dataset.afchBound = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    app.close?.();
  });
}

function waitForCombatAdvance(combat, previousTurn, previousRound, timeout = 350) {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (combat.turn !== previousTurn || combat.round !== previousRound) return resolve(true);
      if (performance.now() - started >= timeout) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

function nextTurnCoordinates(combat, previousTurn, previousRound) {
  const turns = [...(combat.turns ?? [])];
  if (turns.length < 2) return null;

  const currentIndex = Number.isInteger(previousTurn) && previousTurn >= 0
    ? Math.min(previousTurn, turns.length - 1)
    : Math.max(0, turns.findIndex((entry) => entry.id === combat.combatant?.id));
  const nextIndex = (currentIndex + 1) % turns.length;
  const nextRound = nextIndex === 0 ? Math.max(1, Number(previousRound) || 1) + 1 : Math.max(1, Number(previousRound) || 1);
  return { turn: nextIndex, round: nextRound };
}

async function advanceCombatTurn(combat) {
  const previousTurn = Number(combat.turn);
  const previousRound = Number(combat.round);
  const previousId = combat.combatant?.id ?? null;
  const fallback = nextTurnCoordinates(combat, previousTurn, previousRound);
  if (!fallback) throw new Error("There is no other combatant in initiative to advance to.");

  await combat.nextTurn();
  let advanced = await waitForCombatAdvance(combat, previousTurn, previousRound);

  if (!advanced) {
    await combat.update({ round: fallback.round, turn: fallback.turn });
    advanced = await waitForCombatAdvance(combat, previousTurn, previousRound);
  }

  const next = combat.combatant ?? combat.turns?.[combat.turn] ?? null;
  if (!advanced || !next || next.id === previousId) {
    throw new Error("Foundry combat turn did not advance after the fallback update.");
  }
  return next;
}

function bindEndTurn(app, root) {
  const button = root.querySelector("[data-end-turn]");
  if (!button || button.dataset.afchTurnBound === "true") return;
  button.dataset.afchTurnBound = "true";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!game.user?.isGM) {
      ui.notifications?.warn("Only the GM may advance Arkflight ship initiative.");
      return;
    }

    const combat = game.combat;
    if (!combat) {
      ui.notifications?.warn("No active Foundry combat exists.");
      return;
    }
    if (!combat.started) {
      ui.notifications?.warn("Start the Foundry combat encounter before ending a ship turn.");
      return;
    }

    button.disabled = true;
    try {
      const next = await advanceCombatTurn(combat);
      if (shipPayload(next.actor)) app.setReference?.(next.actor);
      else app.render?.({ force: true });
    } catch (error) {
      console.error("Arkflight | End Turn failed", error);
      ui.notifications?.error(error?.message ?? "Could not advance to the next combatant.");
      button.disabled = false;
    }
  }, { capture: true });
}

function followActiveShip(app) {
  const current = game.combat?.combatant ?? null;
  if (!current?.actor || !shipPayload(current.actor)) return;
  if (app.actorId === current.actor.id) return;
  app.setReference?.(current.actor);
}

function enhance(app) {
  const root = hudRoot(app);
  if (!root) return;
  updateVitals(app, root);
  bindCommandStations(app, root);
  bindClose(app, root);
  bindEndTurn(app, root);
}

Hooks.on("renderApplicationV2", enhance);
Hooks.on("renderApplication", enhance);
Hooks.on("arkflightCombatTurnChanged", ({ combatant }) => {
  const app = game.arkflight?.combatConsole?.application ?? null;
  if (!app?.rendered || !combatant?.actor || !shipPayload(combatant.actor)) return;
  if (app.actorId !== combatant.actor.id) app.setReference?.(combatant.actor);
});
Hooks.on("updateCombat", (combat, changes) => {
  if (!(Object.hasOwn(changes ?? {}, "turn") || Object.hasOwn(changes ?? {}, "round"))) return;
  const app = game.arkflight?.combatConsole?.application ?? null;
  if (app?.rendered && combat === game.combat) requestAnimationFrame(() => followActiveShip(app));
});
