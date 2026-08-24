export function availableSignatureAbilities({ stationId, baseAbilities = [], roomAbilities = [], modAbilities = [] }) {
  const combined = [...baseAbilities, ...roomAbilities, ...modAbilities]
    .filter((ability) => ability?.stationId === stationId)
    .filter((ability, index, all) => all.findIndex((candidate) => candidate.id === ability.id) === index);
  return combined;
}

export function selectSignatureAbility(availableAbilities, abilityId) {
  const ability = availableAbilities.find((candidate) => candidate.id === abilityId);
  if (!ability) throw new Error(`Signature Ability is not available: ${abilityId}`);
  return Object.freeze({
    abilityId: ability.id,
    stationId: ability.stationId,
    expended: false
  });
}

export function expendSignatureAbility(selection) {
  if (!selection || selection.expended) return selection;
  return Object.freeze({ ...selection, expended: true });
}
