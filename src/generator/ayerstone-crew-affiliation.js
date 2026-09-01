function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function isGreatHouse(faction) {
  return /^house\s+/i.test(String(faction ?? "").trim());
}

export function generatedCrewAffiliation({ faction, station, seed } = {}) {
  const label = String(faction ?? "Independent").trim() || "Independent";
  if (!isGreatHouse(label)) return Object.freeze({ organization: label, relationship: "member", label });

  const roll = (hashSeed(`${seed}:${station}:house-affiliation`) % 100) / 100;
  const senior = station === "captain" || station === "veilwarden";
  const directMember = senior ? roll < 0.30 : roll < 0.08;
  return Object.freeze({
    organization: label,
    relationship: directMember ? "house-member" : "retainer",
    label: directMember ? `${label} member` : `${label} retainer`,
    note: directMember
      ? `A direct member of ${label} serving aboard the vessel.`
      : `A professional retainer or employee serving ${label} without belonging to its ruling family.`
  });
}

export function applyCrewAffiliation(officer, context = {}) {
  const affiliation = generatedCrewAffiliation({ faction: context.faction, station: officer.station, seed: context.seed });
  const actorData = structuredClone(officer.actorData ?? {});
  actorData.flags ??= {};
  actorData.flags["arkflight-game"] ??= {};
  actorData.flags["arkflight-game"].affiliation = affiliation;
  actorData.system ??= {};
  actorData.system.details ??= {};
  const privateNotes = actorData.system.details.privateNotes ?? "";
  actorData.system.details.privateNotes = `${privateNotes}<p>${affiliation.note ?? affiliation.label}</p>`;
  return Object.freeze({ ...officer, affiliation, actorData: Object.freeze(actorData) });
}
