
import { CREW_SPECIALISTS, SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import {
  addFlexibleExpeditionEquipment,
  expeditionHasCapability,
  expeditionHasEquipment,
  expeditionHasSpecialist,
  expeditionRequirementStatus,
  normalizeExpedition
} from "../expedition/expedition-rules.js";

const MODULE_ID = "arkflight-game";
const SETTING = "activeExpedition";

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may manage Arkflight Expeditions.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function currentExpedition() {
  return normalizeExpedition(game.settings.get(MODULE_ID, SETTING));
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

function specialistRows(actor) {
  const ship = shipPayload(actor);
  return (ship?.crew?.specialists ?? [])
    .map((id) => CREW_SPECIALISTS[id])
    .filter(Boolean)
    .map((entry) => Object.freeze({ id: entry.id, name: entry.name, description: entry.description, traits: entry.traits ?? [] }));
}

async function start(reference = null, options = {}) {
  requireGM();
  const current = currentExpedition();
  if (current.active) throw new Error("An Arkflight Expedition is already active.");
  const actor = resolveShipActor(reference);
  const ship = shipPayload(actor);
  if (!actor || !ship) throw new Error("Choose an Arkflight ship for the Expedition.");
  const available = new Set(ship.crew?.specialists ?? []);
  const specialistIds = [...new Set((options.specialistIds ?? []).map(String).filter(Boolean))];
  const invalid = specialistIds.filter((id) => !available.has(id));
  if (invalid.length) throw new Error("Expedition specialists must be assigned to the selected ship.");
  const suppliesCommitted = Math.max(0, Math.trunc(Number(options.suppliesCommitted) || 0));
  const suppliesAvailable = Math.max(0, Math.trunc(Number(ship.resources?.supplies?.value) || 0));
  if (suppliesCommitted > suppliesAvailable) throw new Error("The ship does not have that many Supplies available to commit.");
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const expedition = normalizeExpedition({
    id: globalThis.crypto?.randomUUID?.() ?? ("expedition-" + Date.now()),
    active: true,
    shipUuid: actor.uuid,
    shipName: actor.name,
    name: String(options.name ?? "").trim() || "Arkflight Expedition",
    faction: String(options.faction ?? "").trim(),
    specialistIds,
    equipment: (options.equipment ?? []).map((entry) => typeof entry === "string" ? { name: entry, virtual: false } : entry),
    suppliesCommitted,
    capabilities: derived.capabilities ?? [],
    flexibleEquipmentUsed: false,
    startedWorldTime: Number(game.time?.worldTime ?? 0)
  });
  await game.settings.set(MODULE_ID, SETTING, expedition);
  Hooks.callAll("arkflightExpeditionStarted", { actor, expedition });
  return expedition;
}

async function complete() {
  requireGM();
  const current = currentExpedition();
  if (!current.active) throw new Error("No active Arkflight Expedition.");
  const next = normalizeExpedition({ ...current, active: false, completedWorldTime: Number(game.time?.worldTime ?? 0) });
  await game.settings.set(MODULE_ID, SETTING, next);
  Hooks.callAll("arkflightExpeditionCompleted", { expedition: next });
  return next;
}

async function cancel() {
  requireGM();
  const current = currentExpedition();
  if (!current.id) return current;
  const next = normalizeExpedition({ ...current, active: false, completedWorldTime: Number(game.time?.worldTime ?? 0) });
  await game.settings.set(MODULE_ID, SETTING, next);
  Hooks.callAll("arkflightExpeditionCancelled", { expedition: next });
  return next;
}

async function useFlexibleEquipment(name) {
  requireGM();
  const current = currentExpedition();
  const result = addFlexibleExpeditionEquipment(current, name);
  if (!result.ok) return result;
  await game.settings.set(MODULE_ID, SETTING, result.expedition);
  Hooks.callAll("arkflightExpeditionFlexibleEquipmentUsed", { expedition: result.expedition, equipment: name });
  return result;
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "Active Arkflight Expedition",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.arkflight ??= {};
  game.arkflight.expedition = Object.freeze({
    get: currentExpedition,
    start,
    complete,
    cancel,
    useFlexibleEquipment,
    specialists: specialistRows,
    hasSpecialist: (id) => expeditionHasSpecialist(currentExpedition(), id),
    hasEquipment: (name) => expeditionHasEquipment(currentExpedition(), name),
    hasCapability: (id) => expeditionHasCapability(currentExpedition(), id),
    requirementStatus: (requirement) => expeditionRequirementStatus(currentExpedition(), requirement)
  });
});
