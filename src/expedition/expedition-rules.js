
export function normalizeExpedition(value = {}) {
  const equipment = (value.equipment ?? []).map((entry) => {
    if (typeof entry === "string") return { name: entry, virtual: false };
    return { name: String(entry?.name ?? "").trim(), virtual: Boolean(entry?.virtual) };
  }).filter((entry) => entry.name);
  return Object.freeze({
    id: value.id ?? null,
    active: Boolean(value.active),
    shipUuid: value.shipUuid ?? null,
    shipName: value.shipName ?? null,
    name: String(value.name ?? "").trim(),
    faction: String(value.faction ?? "").trim(),
    specialistIds: Object.freeze([...new Set((value.specialistIds ?? []).map(String).filter(Boolean))]),
    equipment: Object.freeze(equipment.map((entry) => Object.freeze(entry))),
    suppliesCommitted: Math.max(0, Math.trunc(Number(value.suppliesCommitted) || 0)),
    capabilities: Object.freeze([...new Set((value.capabilities ?? []).map(String).filter(Boolean))]),
    flexibleEquipmentUsed: Boolean(value.flexibleEquipmentUsed),
    startedWorldTime: Math.max(0, Number(value.startedWorldTime) || 0),
    completedWorldTime: value.completedWorldTime == null ? null : Math.max(0, Number(value.completedWorldTime) || 0)
  });
}

export function expeditionHasSpecialist(expedition, specialistId) {
  return normalizeExpedition(expedition).specialistIds.includes(String(specialistId ?? ""));
}

export function expeditionHasEquipment(expedition, equipmentName) {
  const target = String(equipmentName ?? "").trim().toLowerCase();
  if (!target) return false;
  return normalizeExpedition(expedition).equipment.some((entry) => entry.name.toLowerCase() === target);
}

export function expeditionHasCapability(expedition, capability) {
  return normalizeExpedition(expedition).capabilities.includes(String(capability ?? ""));
}

export function expeditionRequirementStatus(expedition, requirement = {}) {
  const state = normalizeExpedition(expedition);
  const missing = [];
  if (requirement.specialistId && !expeditionHasSpecialist(state, requirement.specialistId)) missing.push("specialist");
  if (requirement.equipment && !expeditionHasEquipment(state, requirement.equipment)) missing.push("equipment");
  if (requirement.capability && !expeditionHasCapability(state, requirement.capability)) missing.push("capability");
  return Object.freeze({ ok: missing.length === 0, missing: Object.freeze(missing), expedition: state });
}

export function addFlexibleExpeditionEquipment(expedition, equipmentName) {
  const state = normalizeExpedition(expedition);
  const name = String(equipmentName ?? "").trim();
  if (!state.active) return Object.freeze({ ok: false, reason: "expedition-inactive", expedition: state });
  if (!state.capabilities.includes("we-brought-one")) return Object.freeze({ ok: false, reason: "capability-required", expedition: state });
  if (state.flexibleEquipmentUsed) return Object.freeze({ ok: false, reason: "already-used", expedition: state });
  if (!name) return Object.freeze({ ok: false, reason: "equipment-required", expedition: state });
  if (expeditionHasEquipment(state, name)) return Object.freeze({ ok: false, reason: "already-prepared", expedition: state });
  return Object.freeze({
    ok: true,
    expedition: normalizeExpedition({
      ...state,
      equipment: [...state.equipment, { name, virtual: true }],
      flexibleEquipmentUsed: true
    })
  });
}
