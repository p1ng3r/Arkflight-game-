import { deriveShip } from "./derive-ship.js";
import { normalizeShip } from "./ship-schema.js";

export const REFIT_DRAFT_FAMILIES = Object.freeze({
  SHIP_MOD: "shipMod",
  ARKENGINE_MOD: "arkengineMod"
});

function catalogForFamily(catalogs, family) {
  if (family === REFIT_DRAFT_FAMILIES.SHIP_MOD) return catalogs?.shipMods ?? {};
  if (family === REFIT_DRAFT_FAMILIES.ARKENGINE_MOD) return catalogs?.arkengineMods ?? {};
  throw new Error(`Unknown Arkflight refit draft family: ${family}`);
}

function inventoryForFamily(ship, family) {
  if (family === REFIT_DRAFT_FAMILIES.SHIP_MOD) return ship?.inventory?.shipMods ?? {};
  if (family === REFIT_DRAFT_FAMILIES.ARKENGINE_MOD) return ship?.inventory?.arkengineMods ?? {};
  throw new Error(`Unknown Arkflight refit draft family: ${family}`);
}

function installedKey(family) {
  if (family === REFIT_DRAFT_FAMILIES.SHIP_MOD) return "shipMods";
  if (family === REFIT_DRAFT_FAMILIES.ARKENGINE_MOD) return "arkengineMods";
  throw new Error(`Unknown Arkflight refit draft family: ${family}`);
}

function positiveInteger(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.trunc(number)) : fallback;
}

export function createRefitDraft({ actorUuid = "", assignments = [] } = {}) {
  return Object.freeze({
    actorUuid: String(actorUuid ?? ""),
    assignments: Object.freeze(assignments.map((entry) => Object.freeze({
      family: String(entry.family),
      componentId: String(entry.componentId),
      socketIndices: Object.freeze([...(entry.socketIndices ?? [])].map((index) => Math.max(0, Math.trunc(Number(index) || 0))))
    })))
  });
}

export function stagedQuantity(draft, family, componentId) {
  const id = String(componentId);
  return (draft?.assignments ?? []).filter((entry) => entry.family === family && entry.componentId === id).length;
}

export function availableDraftQuantity(ship, draft, family, componentId) {
  const owned = Math.max(0, Math.trunc(Number(inventoryForFamily(ship, family)?.[componentId] ?? 0)));
  return Math.max(0, owned - stagedQuantity(draft, family, componentId));
}

export function stageRefitComponent(ship, draft, catalogs, {
  family,
  componentId,
  socketIndices = []
} = {}) {
  const normalized = normalizeShip(ship);
  const catalog = catalogForFamily(catalogs, family);
  const item = catalog?.[componentId];
  if (!item) return Object.freeze({ ok: false, reason: "unknown-component", draft: createRefitDraft(draft) });
  if (availableDraftQuantity(normalized, draft, family, componentId) < 1) {
    return Object.freeze({ ok: false, reason: "component-not-available", draft: createRefitDraft(draft) });
  }

  const slotCost = positiveInteger(item?.data?.refit?.slotCost ?? item?.capacityCost ?? 1);
  const indices = [...new Set((socketIndices ?? []).map((index) => Math.max(0, Math.trunc(Number(index) || 0))))];
  if (indices.length !== slotCost) {
    return Object.freeze({ ok: false, reason: "wrong-slot-count", required: slotCost, provided: indices.length, draft: createRefitDraft(draft) });
  }

  const occupied = new Set((draft?.assignments ?? []).flatMap((entry) => entry.socketIndices ?? []));
  if (indices.some((index) => occupied.has(index))) {
    return Object.freeze({ ok: false, reason: "draft-socket-occupied", draft: createRefitDraft(draft) });
  }

  const next = createRefitDraft({
    actorUuid: draft?.actorUuid ?? "",
    assignments: [...(draft?.assignments ?? []), { family, componentId, socketIndices: indices }]
  });
  return Object.freeze({ ok: true, draft: next, assignment: next.assignments.at(-1) });
}

export function removeDraftAssignment(draft, family, socketIndex) {
  const index = Math.max(0, Math.trunc(Number(socketIndex) || 0));
  return createRefitDraft({
    actorUuid: draft?.actorUuid ?? "",
    assignments: (draft?.assignments ?? []).filter((entry) => !(entry.family === family && (entry.socketIndices ?? []).includes(index)))
  });
}

export function resetRefitDraft(draft) {
  return createRefitDraft({ actorUuid: draft?.actorUuid ?? "", assignments: [] });
}

export function proposedShipFromDraft(ship, draft) {
  const normalized = normalizeShip(ship);
  const next = { ...normalized };
  for (const family of Object.values(REFIT_DRAFT_FAMILIES)) {
    const key = installedKey(family);
    const additions = (draft?.assignments ?? []).filter((entry) => entry.family === family).map((entry) => entry.componentId);
    next[key] = [...(normalized[key] ?? []), ...additions];
  }
  return normalizeShip(next);
}

export function previewRefitDraft(ship, draft, catalogs) {
  const currentShip = normalizeShip(ship);
  const proposedShip = proposedShipFromDraft(currentShip, draft);
  const current = deriveShip(currentShip, catalogs);
  const proposed = deriveShip(proposedShip, catalogs);
  const statKeys = new Set([...Object.keys(current?.stats ?? {}), ...Object.keys(proposed?.stats ?? {})]);
  const deltas = {};
  for (const key of statKeys) {
    const before = Number(current?.stats?.[key]);
    const after = Number(proposed?.stats?.[key]);
    if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) continue;
    deltas[key] = Object.freeze({ before, after, delta: after - before });
  }
  return Object.freeze({ current, proposed, proposedShip, deltas: Object.freeze(deltas) });
}

export function refitDraftInstallParts(draft, catalogs) {
  return (draft?.assignments ?? []).reduce((sum, entry) => {
    const item = catalogForFamily(catalogs, entry.family)?.[entry.componentId];
    return sum + Math.max(0, Math.trunc(Number(item?.data?.refit?.install?.partsCost ?? 0)));
  }, 0);
}
