import { ARKFLIGHT_EVENTS } from "../content/events/index.js";
import { BASE_MASTERY, getMasteryTechnique } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { validateShip } from "../ship/validate-ship.js";
import { deriveShip } from "../ship/derive-ship.js";
import { applyShipEffects } from "../ship/ship-effects.js";
import { PlanningController } from "../event/planning-controller.js";
import { ArkflightEventBoard } from "../ui/event-board-app.js";
import { ArkflightRewardSummary } from "../ui/reward-summary-app.js";
import { ArkflightGMOperations } from "../ui/gm-operations-app.js";
import { createShipService, registerShipServiceSetting } from "./ship-service.js";
import { installMasteryTacticsUI } from "../ui/mastery-tactics-ui.js";
import { installPlayerSetupClaims } from "../ui/setup-player-claims.js";
import { installPlayerResolutionUI } from "../ui/player-resolution-ui.js";
import { installMasteryOpportunityUI } from "../ui/mastery-opportunity-ui.js";
import { installOpeningScreenUI } from "../ui/opening-screen-ui.js";
import { installShipwrightUX } from "../ui/shipwright-ux.js";
import { isArkflightShip, markVehicleAsArkflightShip, registerArkflightShipSheet } from "../ui/ship-sheet-app.js";

const MODULE_ID = "arkflight-game";
const ACTIVE_SHIP_SETTING = "activeVoyageShipUuid";
let controller = null;
let board = null;
let rewardSummary = null;
let gmOperations = null;
let lastRoundRewardKey = null;
let lastEventRewardKey = null;

function ensureBoard() { if (!controller) return null; if (!board) board = new ArkflightEventBoard(controller); return board; }

function ensureGMOperations() {
  if (!game.user.isGM) return null;
  if (!gmOperations) gmOperations = new ArkflightGMOperations();
  return gmOperations;
}

function shipPayload(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }

function actorCandidates() {
  const byUuid = new Map();
  for (const actor of game.actors?.contents ?? []) if (actor?.uuid) byUuid.set(actor.uuid, actor);
  for (const scene of game.scenes?.contents ?? []) {
    for (const token of scene.tokens?.contents ?? []) {
      const actor = token?.actor ?? null;
      if (actor?.uuid) byUuid.set(actor.uuid, actor);
    }
  }
  return [...byUuid.values()];
}

function commissionedShips() {
  return actorCandidates().filter((actor) => {
    if (!isArkflightShip(actor)) return false;
    const ship = shipPayload(actor);
    return Boolean(ship && validateShip(ship, SHIP_CATALOGS).ok);
  });
}
function canonicalStation(id) { return id === "watchmaster" ? "battlewatch" : id; }

async function resolveActorReference(reference) {
  if (!reference) return null;
  if (reference.documentName === "Actor") return reference;
  if (typeof reference !== "string") return null;
  const direct = actorCandidates().find((actor) => actor.id === reference || actor.uuid === reference || actor.name === reference) ?? null;
  if (direct) return direct;
  try { const resolved = await fromUuid(reference); return resolved?.documentName === "Actor" ? resolved : null; } catch (_error) { return null; }
}

async function resolveVoyageShip(reference = null) {
  if (reference) {
    const actor = await resolveActorReference(reference);
    if (!actor || !isArkflightShip(actor)) throw new Error("Choose an Arkflight PF2e Vehicle Actor for this Event.");
    const validation = validateShip(shipPayload(actor), SHIP_CATALOGS);
    if (!validation.ok) throw new Error(`${actor.name} is not ready for Voyage: ${validation.errors.join(" ")}`);
    return actor;
  }
  const ships = commissionedShips();
  if (ships.length === 1) return ships[0];
  if (!ships.length) throw new Error("No commissioned Arkflight vessel is available. Commission a ship before launching an Event.");
  throw new Error(`Multiple commissioned Arkflight vessels are available. Launch with game.arkflight.openEvent("glassback-cinderwake", shipActor).`);
}

async function prefillCrewFromShip(actor) {
  const stations = shipPayload(actor)?.crew?.stations ?? {};
  const usedActorIds = new Set();
  for (const [rawStation, reference] of Object.entries(stations)) {
    const station = canonicalStation(rawStation);
    if (!reference) continue;
    const officer = await resolveActorReference(reference);
    if (!officer || usedActorIds.has(officer.id)) continue;
    usedActorIds.add(officer.id);
    try { await controller.command({ type: "assign-actor", station, actorId: officer.id }); }
    catch (error) { console.warn(`Arkflight | Could not prefill ${station} from ${actor.name}`, error); }
  }
}

function activeVoyageShip() {
  const uuid = game.settings?.get(MODULE_ID, ACTIVE_SHIP_SETTING) || null;
  if (!uuid) return null;
  return actorCandidates().find((actor) => actor.uuid === uuid) ?? null;
}

function masteryIdsForShip(actor = activeVoyageShip()) {
  const ship = shipPayload(actor);
  if (!ship) return {};
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return Object.fromEntries(Object.entries(derived.stationCapabilities ?? {}).map(([station, capabilities]) => [station, [...(capabilities.masteries ?? [])]]));
}

function stationOptionsForShip(actor = activeVoyageShip()) {
  const idsByStation = masteryIdsForShip(actor);
  if (!Object.keys(idsByStation).length) return Object.fromEntries(Object.entries(BASE_MASTERY).map(([stationId, masteries]) => [stationId, { masteries: [...masteries], signatures: [], componentAbilities: [] }]));
  return Object.fromEntries(Object.entries(idsByStation).map(([stationId, ids]) => [stationId, { masteries: ids.map((id) => getMasteryTechnique(stationId, id)).filter(Boolean), signatures: [], componentAbilities: [] }]));
}

async function applyEventShipEffects(effects = []) {
  const actor = activeVoyageShip();
  if (!actor) throw new Error("Arkflight Event cannot apply a persistent consequence because no vessel is bound.");
  const ship = shipPayload(actor);
  if (!ship) throw new Error("The active Arkflight vessel has no persistent ship payload.");
  const result = applyShipEffects(ship, effects);
  await actor.update({ [`flags.${MODULE_ID}.ship`]: result.ship });
  return result;
}

async function bindExistingEventShipIfNeeded() {
  if (!game.user.isGM || !controller?.state?.eventId || activeVoyageShip()) return activeVoyageShip();
  const ships = commissionedShips(); if (ships.length !== 1) return null;
  const shipActor = ships[0];
  await game.settings.set(MODULE_ID, ACTIVE_SHIP_SETTING, shipActor.uuid);
  if (game.arkflight) game.arkflight.stationOptions = stationOptionsForShip(shipActor);
  if (controller.state.phase === "opening" && !controller.state.setupLocked) await prefillCrewFromShip(shipActor);
  ui.notifications?.info(`${shipActor.name} bound to the active Arkflight Event.`);
  return shipActor;
}

function decorateEventCompleteBoard() {
  if (!controller?.state || controller.state.phase !== "event-complete" || !board?.element) return;
  const ending = controller.state.eventEnding; if (!ending) return;
  const panel = board.element.querySelector(".arkflight-round-result-panel"); if (!panel) return;
  panel.innerHTML = "";
  const kicker = document.createElement("div"); kicker.className = "arkflight-kicker"; kicker.textContent = "CLOSING CINEMATIC";
  const title = document.createElement("h2"); title.textContent = ending.label || "Event Complete";
  const vignette = document.createElement("article"); vignette.className = "arkflight-round-vignette arkflight-event-ending-vignette";
  const paragraph = document.createElement("p"); paragraph.textContent = ending.vignette || ""; vignette.append(paragraph); panel.append(kicker, title, vignette);
  if (game.user.isGM) { const actions = document.createElement("div"); actions.className = "arkflight-round-continue"; const button = document.createElement("button"); button.type = "button"; button.className = "arkflight-primary"; button.innerHTML = '<i class="fa-solid fa-trophy"></i> Open Rewards'; button.addEventListener("click", () => showRewardSummary()); actions.append(button); panel.append(actions); }
}
function renderBoard() { const app = ensureBoard(); if (!app) return null; const rendered = app.render({ force: true }); if (controller?.state?.phase === "event-complete") setTimeout(decorateEventCompleteBoard, 75); return rendered; }
function showRewardSummary() { if (!controller) return; if (!rewardSummary) rewardSummary = new ArkflightRewardSummary(controller); rewardSummary.render({ force: true }); }

function openGMOperations(options = {}) {
  if (!game.user.isGM) return null;
  return ensureGMOperations()?.open(options) ?? null;
}

function announceStateRewards(state) {
  if (!state) return;
  if (state.phase === "round-result" && state.consequenceApplied) {
    const key = `${state.eventId}:${state.roundId}:${state.roundResult?.bandId}:${state.roundMomentumBefore}:${state.roundMomentumAfter}`;
    if (key !== lastRoundRewardKey) {
      lastRoundRewardKey = key;
      const before = Number(state.roundMomentumBefore ?? state.encounter?.momentum ?? 0); const award = Number(state.roundMomentumAward ?? state.roundResult?.momentumDelta ?? 0); const after = Number(state.roundMomentumAfter ?? state.encounter?.momentum ?? 0);
      const tacticNames = (state.roundRewards?.awardedEdgeCards ?? []).map((id) => getCrewEdgeCard(id)?.name).filter(Boolean); const tacticText = tacticNames.length ? ` Crew Tactic earned: ${tacticNames.join(", ")}.` : "";
      ui.notifications?.info(`Arkflight Momentum: ${before} ${award >= 0 ? "+" : ""}${award} → ${after}.${tacticText}`);
    }
  }
  if (state.phase === "event-complete" && state.eventEnding) { const key = `${state.eventId}:${state.eventEnding.id ?? state.eventEnding.label}`; if (key !== lastEventRewardKey) { lastEventRewardKey = key; setTimeout(() => { decorateEventCompleteBoard(); showRewardSummary(); }, 175); } }
}

Hooks.once("init", () => {
  PlanningController.registerSetting();
  registerShipServiceSetting();
  game.settings.register(MODULE_ID, ACTIVE_SHIP_SETTING, { name: "Active Arkflight Voyage Vessel", scope: "world", config: false, type: String, default: "" });
  registerArkflightShipSheet(); installShipwrightUX(); installMasteryTacticsUI(); installPlayerSetupClaims(); installPlayerResolutionUI(); installMasteryOpportunityUI(); installOpeningScreenUI();

  game.arkflight = {
    events: ARKFLIGHT_EVENTS,
    stationOptions: stationOptionsForShip(),
    get controller() { return controller; },
    get gmOperations() { return ensureGMOperations(); },
    get activeShip() { return activeVoyageShip(); },
    get commissionedShips() { return commissionedShips(); },
    openBoard() { renderBoard(); return board; },
    openRewards() { showRewardSummary(); return rewardSummary; },
    openGMOperations,
    isShip(actor) { return isArkflightShip(actor); },
    async markVehicleAsShip(actor) { return markVehicleAsArkflightShip(actor); },
    async openEvent(eventId = "glassback-cinderwake", shipReference = null) {
      if (!controller) throw new Error("Arkflight is not ready yet.");
      const shipActor = await resolveVoyageShip(shipReference);
      await game.settings.set(MODULE_ID, ACTIVE_SHIP_SETTING, shipActor.uuid);
      this.stationOptions = stationOptionsForShip(shipActor);
      await controller.openEvent(eventId);
      await prefillCrewFromShip(shipActor);
      renderBoard();
      ui.notifications?.info(`${shipActor.name} bound to ${ARKFLIGHT_EVENTS[eventId]?.title ?? "Arkflight Event"}.`);
      return controller.state;
    },
    setStationOptions(stationId, options = {}) {
      const base = stationOptionsForShip(activeVoyageShip())?.[stationId]?.masteries ?? [];
      this.stationOptions[stationId] = { masteries: [...(options.masteries ?? base)], signatures: [], componentAbilities: [...(options.componentAbilities ?? [])] };
      if (board?.rendered) board.render({ force: true });
    }
  };
  game.arkflight.ships = createShipService();
});

Hooks.once("ready", async () => {
  controller = new PlanningController({
    onStateChange: (state) => {
      renderBoard();
      if (gmOperations?.rendered) gmOperations.render({ force: true });
      announceStateRewards(state);
    },
    getMasteryOptions: () => masteryIdsForShip(activeVoyageShip()),
    applyShipEffects: (effects) => applyEventShipEffects(effects)
  });
  controller.activateSockets();
  if (controller.state?.eventId) { await bindExistingEventShipIfNeeded(); game.arkflight.stationOptions = stationOptionsForShip(activeVoyageShip()); renderBoard(); announceStateRewards(controller.state); }
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!controls.tokens?.tools) return;
  controls.tokens.tools.arkflightEvent = {
    name: "arkflightEvent", title: "Arkflight Event Board", icon: "fa-solid fa-compass", order: Object.keys(controls.tokens.tools).length, button: true, visible: true,
    onChange: async () => {
      if (!controller) return;
      if (!controller.state?.eventId) {
        if (!game.user.isGM) { ui.notifications?.info("Waiting for the GM to launch an Arkflight Event."); return; }
        try { await game.arkflight.openEvent("glassback-cinderwake"); } catch (error) { ui.notifications?.warn(error.message); }
        return;
      }
      if (game.user.isGM && !activeVoyageShip()) await bindExistingEventShipIfNeeded();
      renderBoard();
    }
  };
});
