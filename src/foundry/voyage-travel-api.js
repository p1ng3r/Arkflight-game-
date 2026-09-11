
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { strategicRoutePlan } from "../voyage/travel-rules.js";

const MODULE_ID = "arkflight-game";
const SETTING = "activeStrategicRoute";

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may manage strategic Arkflight travel.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function normalizeRoute(value = {}) {
  const segments = Array.isArray(value.segments)
    ? value.segments.map((entry, index) => ({
      index,
      multiplier: Math.max(0.1, Number(entry?.multiplier) || 1),
      days: Math.max(0, Number(entry?.days) || 0)
    }))
    : [];
  const currentLeg = Math.max(0, Math.min(segments.length, Math.trunc(Number(value.currentLeg) || 0)));
  return Object.freeze({
    id: value.id ?? null,
    active: Boolean(value.active && currentLeg < segments.length),
    shipUuid: value.shipUuid ?? null,
    shipName: value.shipName ?? null,
    destination: String(value.destination ?? "").trim(),
    startedWorldTime: Math.max(0, Number(value.startedWorldTime) || 0),
    completedWorldTime: value.completedWorldTime == null ? null : Math.max(0, Number(value.completedWorldTime) || 0),
    distanceHexes: Math.max(0, Math.trunc(Number(value.distanceHexes) || segments.length)),
    weightedHexes: Math.max(0, Number(value.weightedHexes) || 0),
    engineTier: Math.max(1, Math.trunc(Number(value.engineTier) || 1)),
    engineName: value.engineName ?? null,
    daysPerHex: Math.max(0, Number(value.daysPerHex) || 0),
    timeMultiplier: Math.max(0, Number(value.timeMultiplier) || 1),
    knownRoute: Boolean(value.knownRoute),
    establishedCommercialRoute: Boolean(value.establishedCommercialRoute),
    currentLeg,
    totalDays: Math.max(0, Number(value.totalDays) || 0),
    segments: Object.freeze(segments.map((entry) => Object.freeze(entry)))
  });
}

function currentRoute() {
  return normalizeRoute(game.settings.get(MODULE_ID, SETTING));
}

function resolveShipActor(reference = null) {
  if (reference?.documentName === "Actor") return reference;
  const id = reference?.id ?? reference;
  if (typeof id === "string" && id) {
    return game.actors?.get?.(id)
      ?? game.actors?.contents?.find?.((actor) => actor.uuid === id || actor.name === id)
      ?? null;
  }
  return game.arkflight?.ships?.getCurrent?.()?.actor ?? game.arkflight?.activeShip ?? null;
}

function routePlan(actor, options = {}) {
  if (!actor || !shipPayload(actor)) throw new Error("Choose a commissioned Arkflight ship.");
  const ship = shipPayload(actor);
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const engine = SHIP_CATALOGS.arkengines?.[ship.arkengine?.chassisId] ?? null;
  if (!engine) throw new Error("The selected ship has no valid Arkengine.");
  const distanceHexes = Math.max(1, Math.trunc(Number(options.distanceHexes) || 1));
  const defaultMultiplier = Math.max(0.1, Number(options.hexMultiplier) || 1);
  const authored = Array.isArray(options.hexMultipliers)
    ? options.hexMultipliers
    : Array.from({ length: distanceHexes }, () => defaultMultiplier);
  const hexMultipliers = Array.from({ length: distanceHexes }, (_, index) => Math.max(0.1, Number(authored[index]) || defaultMultiplier));
  const plan = strategicRoutePlan({
    ship,
    derived,
    engine,
    distanceHexes,
    hexMultipliers,
    knownRoute: Boolean(options.knownRoute),
    establishedCommercialRoute: Boolean(options.establishedCommercialRoute)
  });
  return Object.freeze({
    ...plan,
    shipUuid: actor.uuid,
    shipName: actor.name,
    engineName: engine.name,
    destination: String(options.destination ?? "").trim() || "Uncharted Destination"
  });
}

async function startRoute(reference = null, options = {}) {
  requireGM();
  const existing = currentRoute();
  if (existing.active) throw new Error("A strategic Arkflight route is already active.");
  const actor = resolveShipActor(reference);
  const plan = routePlan(actor, options);
  const route = normalizeRoute({
    id: globalThis.crypto?.randomUUID?.() ?? ("route-" + Date.now()),
    active: true,
    shipUuid: plan.shipUuid,
    shipName: plan.shipName,
    destination: plan.destination,
    startedWorldTime: Number(game.time?.worldTime ?? 0),
    completedWorldTime: null,
    distanceHexes: plan.distanceHexes,
    weightedHexes: plan.weightedHexes,
    engineTier: plan.engineTier,
    engineName: plan.engineName,
    daysPerHex: plan.daysPerHex,
    timeMultiplier: plan.timeMultiplier,
    knownRoute: plan.knownRoute,
    establishedCommercialRoute: plan.establishedCommercialRoute,
    currentLeg: 0,
    totalDays: plan.totalDays,
    segments: plan.segments
  });
  await game.settings.set(MODULE_ID, SETTING, route);
  Hooks.callAll("arkflightStrategicRouteStarted", { actor, route });
  return route;
}

async function advanceLeg() {
  requireGM();
  const route = currentRoute();
  if (!route.active) throw new Error("No active Arkflight strategic route.");
  if (game.arkflight?.controller?.state?.eventId) {
    throw new Error("Finish or abandon the active Voyage Event before advancing the strategic route.");
  }
  if (typeof game.time?.advance !== "function") throw new Error("Foundry world-time advancement is unavailable.");
  const segment = route.segments[route.currentLeg];
  if (!segment) throw new Error("The strategic route has no remaining leg.");
  const seconds = Math.max(1, Math.round(segment.days * 86400));
  await game.time.advance(seconds);
  const nextLeg = route.currentLeg + 1;
  const complete = nextLeg >= route.segments.length;
  const next = normalizeRoute({
    ...route,
    active: !complete,
    currentLeg: nextLeg,
    completedWorldTime: complete ? Number(game.time?.worldTime ?? route.startedWorldTime + seconds) : null
  });
  await game.settings.set(MODULE_ID, SETTING, next);
  Hooks.callAll("arkflightVoyageLegAdvanced", { route: next, segment, seconds, completed: complete });
  if (complete) Hooks.callAll("arkflightStrategicRouteCompleted", { route: next });
  return Object.freeze({ route: next, segment, seconds, completed: complete });
}

async function cancelRoute() {
  requireGM();
  const route = currentRoute();
  if (!route.id) return route;
  const next = normalizeRoute({ ...route, active: false, completedWorldTime: Number(game.time?.worldTime ?? 0) });
  await game.settings.set(MODULE_ID, SETTING, next);
  Hooks.callAll("arkflightStrategicRouteCancelled", { route: next });
  return next;
}

function remainingRouteDays(route = currentRoute()) {
  return route.segments.slice(route.currentLeg).reduce((sum, segment) => sum + Number(segment.days || 0), 0);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "Active Arkflight Strategic Route",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.arkflight ??= {};
  game.arkflight.voyageTravel = Object.freeze({
    get: currentRoute,
    plan: routePlan,
    start: startRoute,
    advanceLeg,
    cancel: cancelRoute,
    remainingDays: remainingRouteDays
  });
});
